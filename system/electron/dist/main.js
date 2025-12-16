"use strict";
/**
 * Electron main process entry point.
 * Handles window creation, IPC registration, and auth-based navigation.
 * In production: Also starts the Next.js server.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const net_1 = __importDefault(require("net"));
const ipc_1 = require("./ipc");
const auth_1 = require("./auth");
const database_1 = require("./database");
electron_1.app.setAsDefaultProtocolClient("basebrain");
let mainWindow = null;
let nextProcess = null;
let serverPort = 3000;
// Check if we're running in production (packaged app)
const isProd = electron_1.app.isPackaged;
// Minimum window dimensions to prevent squeezed UI
const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;
/**
 * Get the main window instance
 * Used by IPC handlers
 */
function getMainWindow() {
    return mainWindow;
}
/**
 * Get a random available port
 */
function getAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net_1.default.createServer();
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            const port = typeof address === "object" && address ? address.port : 3000;
            server.close(() => resolve(port));
        });
        server.on("error", reject);
    });
}
/**
 * Wait for a port to be ready
 */
function waitForPort(port, timeout = 60000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            const socket = net_1.default.createConnection(port, "127.0.0.1");
            socket.on("connect", () => {
                socket.destroy();
                resolve();
            });
            socket.on("error", () => {
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for port ${port}`));
                }
                else {
                    setTimeout(check, 200);
                }
            });
        };
        check();
    });
}
/**
 * Start Next.js server (production only)
 */
async function startNextServer() {
    const port = await getAvailablePort();
    console.log(`[Main] Starting Next.js server on port ${port}...`);
    // Get the app directory - in standalone mode, the server is at .next/standalone/server.js
    const appDir = isProd
        ? path_1.default.join(process.resourcesPath, "app")
        : path_1.default.join(__dirname, "..", "..");
    const standaloneServer = path_1.default.join(appDir, ".next", "standalone", "server.js");
    console.log(`[Main] App directory: ${appDir}`);
    console.log(`[Main] Standalone server: ${standaloneServer}`);
    // The standalone server needs the static and public folders copied
    // These should be in extraResources
    nextProcess = (0, child_process_1.spawn)("node", [standaloneServer], {
        stdio: "pipe",
        shell: false,
        cwd: path_1.default.join(appDir, ".next", "standalone"),
        env: {
            ...process.env,
            NODE_ENV: "production",
            PORT: port.toString(),
            HOSTNAME: "localhost"
        },
    });
    // Log Next.js output
    nextProcess.stdout?.on("data", (data) => {
        console.log(`[Next.js] ${data.toString().trim()}`);
    });
    nextProcess.stderr?.on("data", (data) => {
        console.error(`[Next.js Error] ${data.toString().trim()}`);
    });
    nextProcess.on("error", (error) => {
        console.error("[Main] Failed to start Next.js:", error);
    });
    nextProcess.on("close", (code) => {
        console.log(`[Main] Next.js process exited with code ${code}`);
        if (code !== 0 && code !== null) {
            // If Next.js crashes, quit the app
            electron_1.app.quit();
        }
    });
    // Wait for the server to be ready
    console.log("[Main] Waiting for Next.js to be ready...");
    await waitForPort(port);
    console.log("[Main] Next.js server is ready!");
    return port;
}
/**
 * Create the main application window
 */
async function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        show: false, // Don't show until ready
        icon: path_1.default.join(__dirname, "..", "..", "public", "app-logo.png"),
        titleBarStyle: "hidden",
        // Windows-specific: show window controls as overlay
        ...(process.platform === "win32" && {
            titleBarOverlay: {
                color: "#0a0a0a",
                symbolColor: "#ffffff",
                height: 64
            }
        }),
        // macOS-specific: position traffic lights
        ...(process.platform === "darwin" && {
            trafficLightPosition: { x: 16, y: 22 }
        }),
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });
    // Check if user has a saved session
    const isLoggedIn = await (0, auth_1.hasSession)();
    // Get the port
    const port = process.env.NEXT_PORT || serverPort.toString();
    // Load appropriate page based on auth state
    const route = isLoggedIn ? "/" : "/login";
    const url = `http://localhost:${port}${route}`;
    console.log(`[Main] Loading ${isLoggedIn ? "main app" : "login page"}: ${url}`);
    mainWindow.loadURL(url);
    // Show window when ready
    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });
    // Open DevTools in development
    if (!isProd && process.env.NODE_ENV === "development") {
        // mainWindow.webContents.openDevTools();
    }
    // Handle window closed
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
/**
 * Cleanup function to kill Next.js process
 */
function cleanup() {
    if (nextProcess) {
        console.log("[Main] Stopping Next.js server...");
        nextProcess.kill();
        nextProcess = null;
    }
    (0, database_1.closeDatabase)();
}
// Register IPC handlers and create window when app is ready
electron_1.app.whenReady().then(async () => {
    // Initialize the database
    try {
        (0, database_1.initializeDatabase)();
        console.log("[Main] Database initialized");
    }
    catch (error) {
        console.error("[Main] Failed to initialize database:", error);
    }
    // Register IPC handlers before creating window
    (0, ipc_1.registerIpcHandlers)(getMainWindow);
    // In production, start Next.js server internally
    if (isProd && !process.env.NEXT_PORT) {
        try {
            serverPort = await startNextServer();
            process.env.NEXT_PORT = serverPort.toString();
        }
        catch (error) {
            console.error("[Main] Failed to start Next.js server:", error);
            electron_1.app.quit();
            return;
        }
    }
    // Create the main window
    await createWindow();
});
// Quit when all windows are closed (except on macOS)
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        cleanup();
        electron_1.app.quit();
    }
});
// Cleanup on before-quit
electron_1.app.on("before-quit", () => {
    cleanup();
});
// On macOS, re-create window when dock icon is clicked
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

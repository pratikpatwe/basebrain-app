/**
 * Electron main process entry point.
 * Handles window creation, IPC registration, and auth-based navigation.
 * In production: Also starts the Next.js server.
 */

import { app, BrowserWindow } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import net from "net";
import { registerIpcHandlers } from "./ipc";
import { hasSession } from "./auth";
import { initializeDatabase, closeDatabase } from "./database";

app.setAsDefaultProtocolClient("basebrain");

let mainWindow: BrowserWindow | null = null;
let nextProcess: ChildProcess | null = null;
let serverPort: number = 3000;

// Check if we're running in production (packaged app)
const isProd = app.isPackaged;

// Minimum window dimensions to prevent squeezed UI
const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;

/**
 * Get the main window instance
 * Used by IPC handlers
 */
function getMainWindow(): BrowserWindow | null {
    return mainWindow;
}

/**
 * Get a random available port
 */
function getAvailablePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
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
function waitForPort(port: number, timeout = 60000): Promise<void> {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            const socket = net.createConnection(port, "127.0.0.1");
            socket.on("connect", () => {
                socket.destroy();
                resolve();
            });
            socket.on("error", () => {
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for port ${port}`));
                } else {
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
async function startNextServer(): Promise<number> {
    const port = await getAvailablePort();
    console.log(`[Main] Starting Next.js server on port ${port}...`);

    // Get the app directory - in standalone mode, the server is at .next/standalone/server.js
    const appDir = isProd
        ? path.join(process.resourcesPath, "app")
        : path.join(__dirname, "..", "..");

    const standaloneServer = path.join(appDir, ".next", "standalone", "server.js");
    const standaloneCwd = path.join(appDir, ".next", "standalone");

    console.log(`[Main] App directory: ${appDir}`);
    console.log(`[Main] Standalone server: ${standaloneServer}`);
    console.log(`[Main] Electron executable: ${process.execPath}`);

    // In packaged mode, use Electron's built-in Node.js by setting ELECTRON_RUN_AS_NODE=1
    // This tells Electron to act as a Node.js runtime instead of an Electron app
    const nodeCommand = isProd ? process.execPath : "node";
    const electronAsNode = isProd ? { ELECTRON_RUN_AS_NODE: "1" } : {};

    console.log(`[Main] Using node command: ${nodeCommand}`);

    nextProcess = spawn(nodeCommand, [standaloneServer], {
        stdio: "pipe",
        shell: false,
        cwd: standaloneCwd,
        env: {
            ...process.env,
            ...electronAsNode,
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
            app.quit();
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
async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        show: false, // Don't show until ready
        icon: path.join(__dirname, "..", "..", "public", "app-logo.png"),
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
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        }
    });

    // Check if user has a saved session
    const isLoggedIn = await hasSession();

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
function cleanup(): void {
    if (nextProcess) {
        console.log("[Main] Stopping Next.js server...");
        nextProcess.kill();
        nextProcess = null;
    }
    closeDatabase();
}

// Register IPC handlers and create window when app is ready
app.whenReady().then(async () => {
    // Initialize the database
    try {
        initializeDatabase();
        console.log("[Main] Database initialized");
    } catch (error) {
        console.error("[Main] Failed to initialize database:", error);
    }

    // Register IPC handlers before creating window
    registerIpcHandlers(getMainWindow);

    // In production, start Next.js server internally
    if (isProd && !process.env.NEXT_PORT) {
        try {
            serverPort = await startNextServer();
            process.env.NEXT_PORT = serverPort.toString();
        } catch (error) {
            console.error("[Main] Failed to start Next.js server:", error);
            app.quit();
            return;
        }
    }

    // Create the main window
    await createWindow();
});

// Quit when all windows are closed (except on macOS)
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        cleanup();
        app.quit();
    }
});

// Cleanup on before-quit
app.on("before-quit", () => {
    cleanup();
});

// On macOS, re-create window when dock icon is clicked
app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

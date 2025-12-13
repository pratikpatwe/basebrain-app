"use strict";
/**
 * Electron main process entry point.
 * Handles window creation, IPC registration, and auth-based navigation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const ipc_1 = require("./ipc");
const auth_1 = require("./auth");
electron_1.app.setAsDefaultProtocolClient("basebrain");
let mainWindow = null;
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
 * Create the main application window
 */
async function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
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
    // Get the port from environment variable (set by launch script) or default to 3000
    const port = process.env.NEXT_PORT || "3000";
    // Load appropriate page based on auth state
    const route = isLoggedIn ? "/" : "/login";
    const url = `http://localhost:${port}${route}`;
    console.log(`[Main] Loading ${isLoggedIn ? "main app" : "login page"}: ${url}`);
    mainWindow.loadURL(url);
    // Open DevTools in development
    if (process.env.NODE_ENV === "development") {
        // mainWindow.webContents.openDevTools();
    }
    // Handle window closed
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
// Register IPC handlers and create window when app is ready
electron_1.app.whenReady().then(() => {
    // Register IPC handlers before creating window
    (0, ipc_1.registerIpcHandlers)(getMainWindow);
    // Create the main window
    createWindow();
});
// Quit when all windows are closed (except on macOS)
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
// On macOS, re-create window when dock icon is clicked
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

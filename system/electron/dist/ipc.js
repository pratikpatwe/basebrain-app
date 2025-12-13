"use strict";
/**
 * IPC handlers for communication between main and renderer process.
 * Exposes auth functions to the renderer process securely.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerIpcHandlers = registerIpcHandlers;
const electron_1 = require("electron");
const auth_1 = require("./auth");
/**
 * Register all IPC handlers
 * Call this in your main process entry point
 */
function registerIpcHandlers(getMainWindow) {
    // Get saved session
    electron_1.ipcMain.handle("auth:get-session", async () => {
        return await (0, auth_1.loadSession)();
    });
    // Check if session exists
    electron_1.ipcMain.handle("auth:has-session", async () => {
        return await (0, auth_1.hasSession)();
    });
    // Save session (called when tokens are refreshed)
    electron_1.ipcMain.handle("auth:save-session", async (_, session) => {
        await (0, auth_1.saveSession)(session);
        return true;
    });
    // Clear session (logout)
    electron_1.ipcMain.handle("auth:logout", async () => {
        await (0, auth_1.clearSession)();
        return true;
    });
    // Start login flow
    electron_1.ipcMain.handle("auth:login", async () => {
        try {
            const mainWindow = getMainWindow();
            const session = await (0, auth_1.startAuthFlow)(mainWindow);
            return { success: true, session };
        }
        catch (error) {
            return { success: false, error: error.message };
        }
    });
    // Navigate to a route (used after login)
    electron_1.ipcMain.handle("auth:navigate", async (_, route) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            // In development, load from Next.js dev server
            mainWindow.loadURL(`http://localhost:3000${route}`);
            return true;
        }
        return false;
    });
}

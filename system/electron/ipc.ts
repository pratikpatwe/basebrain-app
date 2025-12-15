/**
 * IPC handlers for communication between main and renderer process.
 * Exposes auth functions to the renderer process securely.
 */

import { ipcMain, BrowserWindow, dialog } from "electron";
import {
    loadSession,
    saveSession,
    clearSession,
    hasSession,
    startAuthFlow,
    SessionPayload,
} from "./auth";

/**
 * Register all IPC handlers
 * Call this in your main process entry point
 */
export function registerIpcHandlers(getMainWindow: () => BrowserWindow | null): void {
    // Get saved session
    ipcMain.handle("auth:get-session", async () => {
        return await loadSession();
    });

    // Check if session exists
    ipcMain.handle("auth:has-session", async () => {
        return await hasSession();
    });

    // Save session (called when tokens are refreshed)
    ipcMain.handle("auth:save-session", async (_, session: SessionPayload) => {
        await saveSession(session);
        return true;
    });

    // Clear session (logout)
    ipcMain.handle("auth:logout", async () => {
        await clearSession();
        return true;
    });

    // Start login flow
    ipcMain.handle("auth:login", async () => {
        try {
            const mainWindow = getMainWindow();
            const session = await startAuthFlow(mainWindow);
            return { success: true, session };
        } catch (error) {
            return { success: false, error: (error as Error).message };
        }
    });

    // Navigate to a route (used after login)
    ipcMain.handle("auth:navigate", async (_, route: string) => {
        const mainWindow = getMainWindow();
        if (mainWindow) {
            // In development, load from Next.js dev server
            mainWindow.loadURL(`http://localhost:3000${route}`);
            return true;
        }
        return false;
    });

    // Open folder picker dialog
    ipcMain.handle("folder:select", async () => {
        const mainWindow = getMainWindow();
        const result = await dialog.showOpenDialog(mainWindow!, {
            properties: ["openDirectory"],
            title: "Select Project Folder",
        });

        if (result.canceled || result.filePaths.length === 0) {
            return null;
        }

        return result.filePaths[0];
    });

    // ============================================
    // TOOLS IPC HANDLERS
    // ============================================

    // Execute a tool
    ipcMain.handle("tools:execute", async (_, toolName: string, args: Record<string, unknown>, projectPath: string) => {
        const { executeTool } = await import("./tools");
        return executeTool(toolName, args, projectPath);
    });

    // Get available tool definitions
    ipcMain.handle("tools:definitions", async () => {
        const { toolDefinitions } = await import("./tools");
        return toolDefinitions;
    });
}

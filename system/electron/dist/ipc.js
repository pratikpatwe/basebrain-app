"use strict";
/**
 * IPC handlers for communication between main and renderer process.
 * Exposes auth functions to the renderer process securely.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    // Open folder picker dialog
    electron_1.ipcMain.handle("folder:select", async () => {
        const mainWindow = getMainWindow();
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
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
    electron_1.ipcMain.handle("tools:execute", async (_, toolName, args, projectPath) => {
        const { executeTool } = await Promise.resolve().then(() => __importStar(require("./tools")));
        return executeTool(toolName, args, projectPath);
    });
    // Get available tool definitions
    electron_1.ipcMain.handle("tools:definitions", async () => {
        const { toolDefinitions } = await Promise.resolve().then(() => __importStar(require("./tools")));
        return toolDefinitions;
    });
}

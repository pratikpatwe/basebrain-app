"use strict";
/**
 * Preload script - exposes safe APIs to renderer process.
 * Uses contextBridge to safely expose IPC calls.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose platform information to the renderer
electron_1.contextBridge.exposeInMainWorld("electronPlatform", {
    platform: process.platform,
    isMac: process.platform === "darwin",
    isWindows: process.platform === "win32",
    isLinux: process.platform === "linux"
});
// Expose auth API to renderer
electron_1.contextBridge.exposeInMainWorld("electronAuth", {
    // Get saved session from keytar
    getSession: () => electron_1.ipcRenderer.invoke("auth:get-session"),
    // Check if logged in
    hasSession: () => electron_1.ipcRenderer.invoke("auth:has-session"),
    // Save session (for token refresh)
    saveSession: (session) => electron_1.ipcRenderer.invoke("auth:save-session", session),
    // Logout - clear session from keytar
    logout: () => electron_1.ipcRenderer.invoke("auth:logout"),
    // Start login flow - opens browser
    login: () => electron_1.ipcRenderer.invoke("auth:login"),
    // Navigate to a route
    navigate: (route) => electron_1.ipcRenderer.invoke("auth:navigate", route),
});

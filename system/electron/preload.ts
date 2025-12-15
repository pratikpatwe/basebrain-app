/**
 * Preload script - exposes safe APIs to renderer process.
 * Uses contextBridge to safely expose IPC calls.
 */

import { contextBridge, ipcRenderer } from "electron";

// Expose platform information to the renderer
contextBridge.exposeInMainWorld("electronPlatform", {
    platform: process.platform,
    isMac: process.platform === "darwin",
    isWindows: process.platform === "win32",
    isLinux: process.platform === "linux"
});

// Expose auth API to renderer
contextBridge.exposeInMainWorld("electronAuth", {
    // Get saved session from keytar
    getSession: () => ipcRenderer.invoke("auth:get-session"),

    // Check if logged in
    hasSession: () => ipcRenderer.invoke("auth:has-session"),

    // Save session (for token refresh)
    saveSession: (session: unknown) => ipcRenderer.invoke("auth:save-session", session),

    // Logout - clear session from keytar
    logout: () => ipcRenderer.invoke("auth:logout"),

    // Start login flow - opens browser
    login: () => ipcRenderer.invoke("auth:login"),

    // Navigate to a route
    navigate: (route: string) => ipcRenderer.invoke("auth:navigate", route),
});

// Expose folder API to renderer
contextBridge.exposeInMainWorld("electronFolder", {
    // Open folder picker dialog
    selectFolder: () => ipcRenderer.invoke("folder:select"),
});

// Expose tools API to renderer
contextBridge.exposeInMainWorld("electronTools", {
    // Execute a tool with given arguments
    execute: (toolName: string, args: Record<string, unknown>, projectPath: string) =>
        ipcRenderer.invoke("tools:execute", toolName, args, projectPath),

    // Get available tool definitions
    getDefinitions: () => ipcRenderer.invoke("tools:definitions"),
});

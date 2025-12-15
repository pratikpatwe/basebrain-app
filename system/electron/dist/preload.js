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
// Expose folder API to renderer
electron_1.contextBridge.exposeInMainWorld("electronFolder", {
    // Open folder picker dialog
    selectFolder: () => electron_1.ipcRenderer.invoke("folder:select"),
});
// Expose tools API to renderer
electron_1.contextBridge.exposeInMainWorld("electronTools", {
    // Execute a tool with given arguments
    execute: (toolName, args, projectPath) => electron_1.ipcRenderer.invoke("tools:execute", toolName, args, projectPath),
    // Get available tool definitions
    getDefinitions: () => electron_1.ipcRenderer.invoke("tools:definitions"),
});
// Expose database API to renderer
electron_1.contextBridge.exposeInMainWorld("electronDB", {
    // --- Projects ---
    projects: {
        getOrCreate: (folderPath) => electron_1.ipcRenderer.invoke("db:projects:getOrCreate", folderPath),
        getById: (id) => electron_1.ipcRenderer.invoke("db:projects:getById", id),
        getByPath: (path) => electron_1.ipcRenderer.invoke("db:projects:getByPath", path),
        getAll: () => electron_1.ipcRenderer.invoke("db:projects:getAll"),
        delete: (id) => electron_1.ipcRenderer.invoke("db:projects:delete", id),
    },
    // --- Chats ---
    chats: {
        create: (projectId, title) => electron_1.ipcRenderer.invoke("db:chats:create", projectId, title),
        getById: (id) => electron_1.ipcRenderer.invoke("db:chats:getById", id),
        getByProject: (projectId) => electron_1.ipcRenderer.invoke("db:chats:getByProject", projectId),
        getOthers: (currentProjectId) => electron_1.ipcRenderer.invoke("db:chats:getOthers", currentProjectId),
        getAll: () => electron_1.ipcRenderer.invoke("db:chats:getAll"),
        updateTitle: (id, title) => electron_1.ipcRenderer.invoke("db:chats:updateTitle", id, title),
        delete: (id) => electron_1.ipcRenderer.invoke("db:chats:delete", id),
    },
    // --- Messages ---
    messages: {
        save: (message) => electron_1.ipcRenderer.invoke("db:messages:save", message),
        update: (id, updates) => electron_1.ipcRenderer.invoke("db:messages:update", id, updates),
        getByChat: (chatId) => electron_1.ipcRenderer.invoke("db:messages:getByChat", chatId),
        getLastN: (chatId, n) => electron_1.ipcRenderer.invoke("db:messages:getLastN", chatId, n),
        deleteFromPoint: (chatId, fromMessageId) => electron_1.ipcRenderer.invoke("db:messages:deleteFromPoint", chatId, fromMessageId),
    },
    // --- Snapshots ---
    snapshots: {
        create: (messageId, changes) => electron_1.ipcRenderer.invoke("db:snapshots:create", messageId, changes),
        getByMessage: (messageId) => electron_1.ipcRenderer.invoke("db:snapshots:getByMessage", messageId),
        getAfterMessage: (chatId, fromMessageId) => electron_1.ipcRenderer.invoke("db:snapshots:getAfterMessage", chatId, fromMessageId),
    },
    // --- Rollback ---
    rollback: (chatId, messageId, projectPath) => electron_1.ipcRenderer.invoke("db:rollback", chatId, messageId, projectPath),
    // --- App State ---
    appState: {
        get: () => electron_1.ipcRenderer.invoke("db:appState:get"),
        save: (state) => electron_1.ipcRenderer.invoke("db:appState:save", state),
    },
});

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

// Expose database API to renderer
contextBridge.exposeInMainWorld("electronDB", {
    // --- Projects ---
    projects: {
        getOrCreate: (folderPath: string) =>
            ipcRenderer.invoke("db:projects:getOrCreate", folderPath),
        getById: (id: string) =>
            ipcRenderer.invoke("db:projects:getById", id),
        getByPath: (path: string) =>
            ipcRenderer.invoke("db:projects:getByPath", path),
        getAll: () =>
            ipcRenderer.invoke("db:projects:getAll"),
        delete: (id: string) =>
            ipcRenderer.invoke("db:projects:delete", id),
    },

    // --- Chats ---
    chats: {
        create: (projectId: string, title?: string) =>
            ipcRenderer.invoke("db:chats:create", projectId, title),
        getById: (id: string) =>
            ipcRenderer.invoke("db:chats:getById", id),
        getByProject: (projectId: string) =>
            ipcRenderer.invoke("db:chats:getByProject", projectId),
        getOthers: (currentProjectId: string) =>
            ipcRenderer.invoke("db:chats:getOthers", currentProjectId),
        getAll: () =>
            ipcRenderer.invoke("db:chats:getAll"),
        updateTitle: (id: string, title: string) =>
            ipcRenderer.invoke("db:chats:updateTitle", id, title),
        delete: (id: string) =>
            ipcRenderer.invoke("db:chats:delete", id),
    },

    // --- Messages ---
    messages: {
        save: (message: {
            chat_id: string;
            role: string;
            content?: string;
            thinking?: string;
            tool_calls?: unknown[];
            tool_results?: unknown[];
            tokens_prompt?: number;
            tokens_completion?: number;
        }) => ipcRenderer.invoke("db:messages:save", message),
        update: (id: string, updates: Record<string, unknown>) =>
            ipcRenderer.invoke("db:messages:update", id, updates),
        getByChat: (chatId: string) =>
            ipcRenderer.invoke("db:messages:getByChat", chatId),
        getLastN: (chatId: string, n: number) =>
            ipcRenderer.invoke("db:messages:getLastN", chatId, n),
        deleteFromPoint: (chatId: string, fromMessageId: string) =>
            ipcRenderer.invoke("db:messages:deleteFromPoint", chatId, fromMessageId),
    },

    // --- Snapshots ---
    snapshots: {
        create: (messageId: string, changes: unknown[]) =>
            ipcRenderer.invoke("db:snapshots:create", messageId, changes),
        getByMessage: (messageId: string) =>
            ipcRenderer.invoke("db:snapshots:getByMessage", messageId),
        getAfterMessage: (chatId: string, fromMessageId: string) =>
            ipcRenderer.invoke("db:snapshots:getAfterMessage", chatId, fromMessageId),
    },

    // --- Rollback ---
    rollback: (chatId: string, messageId: string, projectPath: string) =>
        ipcRenderer.invoke("db:rollback", chatId, messageId, projectPath),

    // --- App State ---
    appState: {
        get: () => ipcRenderer.invoke("db:appState:get"),
        save: (state: {
            lastProjectPath?: string | null;
            lastChatId?: string | null;
            sidebarCollapsed?: boolean;
            editorCollapsed?: boolean;
            editorPanelSize?: number;
            chatPanelSize?: number;
        }) => ipcRenderer.invoke("db:appState:save", state),
    },

    // --- Command Execution ---
    commands: {
        approve: (commandId: string) => ipcRenderer.invoke("cmd:approve", commandId),
        reject: (commandId: string) => ipcRenderer.invoke("cmd:reject", commandId),
        sendInput: (commandId: string, input: string) => ipcRenderer.invoke("cmd:sendInput", commandId, input),
        terminate: (commandId: string) => ipcRenderer.invoke("cmd:terminate", commandId),
        getStatus: (commandId: string) => ipcRenderer.invoke("cmd:getStatus", commandId),
    },
});

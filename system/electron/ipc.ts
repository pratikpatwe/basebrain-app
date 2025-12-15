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

    // ============================================
    // DATABASE IPC HANDLERS
    // ============================================

    // --- PROJECTS ---
    ipcMain.handle("db:projects:getOrCreate", async (_, folderPath: string) => {
        const { getOrCreateProject } = await import("./database/repositories/projects");
        return getOrCreateProject(folderPath);
    });

    ipcMain.handle("db:projects:getById", async (_, id: string) => {
        const { getProjectById } = await import("./database/repositories/projects");
        return getProjectById(id);
    });

    ipcMain.handle("db:projects:getByPath", async (_, path: string) => {
        const { getProjectByPath } = await import("./database/repositories/projects");
        return getProjectByPath(path);
    });

    ipcMain.handle("db:projects:getAll", async () => {
        const { getAllProjects } = await import("./database/repositories/projects");
        return getAllProjects();
    });

    ipcMain.handle("db:projects:delete", async (_, id: string) => {
        const { deleteProject } = await import("./database/repositories/projects");
        deleteProject(id);
        return true;
    });

    // --- CHATS ---
    ipcMain.handle("db:chats:create", async (_, projectId: string, title?: string) => {
        const { createChat } = await import("./database/repositories/chats");
        return createChat(projectId, title);
    });

    ipcMain.handle("db:chats:getById", async (_, id: string) => {
        const { getChatById } = await import("./database/repositories/chats");
        return getChatById(id);
    });

    ipcMain.handle("db:chats:getByProject", async (_, projectId: string) => {
        const { getChatsByProject } = await import("./database/repositories/chats");
        return getChatsByProject(projectId);
    });

    ipcMain.handle("db:chats:getOthers", async (_, currentProjectId: string) => {
        const { getOtherChats } = await import("./database/repositories/chats");
        return getOtherChats(currentProjectId);
    });

    ipcMain.handle("db:chats:getAll", async () => {
        const { getAllChatsWithProjects } = await import("./database/repositories/chats");
        return getAllChatsWithProjects();
    });

    ipcMain.handle("db:chats:updateTitle", async (_, id: string, title: string) => {
        const { updateChatTitle } = await import("./database/repositories/chats");
        updateChatTitle(id, title);
        return true;
    });

    ipcMain.handle("db:chats:delete", async (_, id: string) => {
        const { deleteChat } = await import("./database/repositories/chats");
        deleteChat(id);
        return true;
    });

    // --- MESSAGES ---
    ipcMain.handle("db:messages:save", async (_, message: {
        chat_id: string;
        role: string;
        content?: string;
        thinking?: string;
        tool_calls?: unknown[];
        tool_results?: unknown[];
        tokens_prompt?: number;
        tokens_completion?: number;
    }) => {
        const { saveMessage } = await import("./database/repositories/messages");
        return saveMessage(message as Parameters<typeof saveMessage>[0]);
    });

    ipcMain.handle("db:messages:update", async (_, id: string, updates: Record<string, unknown>) => {
        const { updateMessage } = await import("./database/repositories/messages");
        updateMessage(id, updates);
        return true;
    });

    ipcMain.handle("db:messages:getByChat", async (_, chatId: string) => {
        const { getMessagesByChat } = await import("./database/repositories/messages");
        return getMessagesByChat(chatId);
    });

    ipcMain.handle("db:messages:getLastN", async (_, chatId: string, n: number) => {
        const { getLastNMessages } = await import("./database/repositories/messages");
        return getLastNMessages(chatId, n);
    });

    ipcMain.handle("db:messages:deleteFromPoint", async (_, chatId: string, fromMessageId: string) => {
        const { deleteMessagesFromPoint } = await import("./database/repositories/messages");
        deleteMessagesFromPoint(chatId, fromMessageId);
        return true;
    });

    // --- SNAPSHOTS ---
    ipcMain.handle("db:snapshots:create", async (_, messageId: string, changes: unknown[]) => {
        const { createSnapshots } = await import("./database/repositories/snapshots");
        return createSnapshots(messageId, changes as Parameters<typeof createSnapshots>[1]);
    });

    ipcMain.handle("db:snapshots:getByMessage", async (_, messageId: string) => {
        const { getSnapshotsByMessage } = await import("./database/repositories/snapshots");
        return getSnapshotsByMessage(messageId);
    });

    ipcMain.handle("db:snapshots:getAfterMessage", async (_, chatId: string, fromMessageId: string) => {
        const { getSnapshotsAfterMessage } = await import("./database/repositories/snapshots");
        return getSnapshotsAfterMessage(chatId, fromMessageId);
    });

    // --- ROLLBACK ---
    ipcMain.handle("db:rollback", async (_, chatId: string, messageId: string, projectPath: string) => {
        const { rollbackToMessage } = await import("./services/rollback");
        return rollbackToMessage(chatId, messageId, projectPath);
    });

    // --- APP STATE ---
    ipcMain.handle("db:appState:get", async () => {
        const { getAppState } = await import("./database/repositories/app-state");
        return getAppState();
    });

    ipcMain.handle("db:appState:save", async (_, state: Record<string, unknown>) => {
        const { saveAppState } = await import("./database/repositories/app-state");
        saveAppState(state);
        return true;
    });
}

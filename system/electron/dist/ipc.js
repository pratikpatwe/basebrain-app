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
    // ============================================
    // DATABASE IPC HANDLERS
    // ============================================
    // --- PROJECTS ---
    electron_1.ipcMain.handle("db:projects:getOrCreate", async (_, folderPath) => {
        const { getOrCreateProject } = await Promise.resolve().then(() => __importStar(require("./database/repositories/projects")));
        return getOrCreateProject(folderPath);
    });
    electron_1.ipcMain.handle("db:projects:getById", async (_, id) => {
        const { getProjectById } = await Promise.resolve().then(() => __importStar(require("./database/repositories/projects")));
        return getProjectById(id);
    });
    electron_1.ipcMain.handle("db:projects:getByPath", async (_, path) => {
        const { getProjectByPath } = await Promise.resolve().then(() => __importStar(require("./database/repositories/projects")));
        return getProjectByPath(path);
    });
    electron_1.ipcMain.handle("db:projects:getAll", async () => {
        const { getAllProjects } = await Promise.resolve().then(() => __importStar(require("./database/repositories/projects")));
        return getAllProjects();
    });
    electron_1.ipcMain.handle("db:projects:delete", async (_, id) => {
        const { deleteProject } = await Promise.resolve().then(() => __importStar(require("./database/repositories/projects")));
        deleteProject(id);
        return true;
    });
    // --- CHATS ---
    electron_1.ipcMain.handle("db:chats:create", async (_, projectId, title) => {
        const { createChat } = await Promise.resolve().then(() => __importStar(require("./database/repositories/chats")));
        return createChat(projectId, title);
    });
    electron_1.ipcMain.handle("db:chats:getById", async (_, id) => {
        const { getChatById } = await Promise.resolve().then(() => __importStar(require("./database/repositories/chats")));
        return getChatById(id);
    });
    electron_1.ipcMain.handle("db:chats:getByProject", async (_, projectId) => {
        const { getChatsByProject } = await Promise.resolve().then(() => __importStar(require("./database/repositories/chats")));
        return getChatsByProject(projectId);
    });
    electron_1.ipcMain.handle("db:chats:getOthers", async (_, currentProjectId) => {
        const { getOtherChats } = await Promise.resolve().then(() => __importStar(require("./database/repositories/chats")));
        return getOtherChats(currentProjectId);
    });
    electron_1.ipcMain.handle("db:chats:getAll", async () => {
        const { getAllChatsWithProjects } = await Promise.resolve().then(() => __importStar(require("./database/repositories/chats")));
        return getAllChatsWithProjects();
    });
    electron_1.ipcMain.handle("db:chats:updateTitle", async (_, id, title) => {
        const { updateChatTitle } = await Promise.resolve().then(() => __importStar(require("./database/repositories/chats")));
        updateChatTitle(id, title);
        return true;
    });
    electron_1.ipcMain.handle("db:chats:delete", async (_, id) => {
        const { deleteChat } = await Promise.resolve().then(() => __importStar(require("./database/repositories/chats")));
        deleteChat(id);
        return true;
    });
    // --- MESSAGES ---
    electron_1.ipcMain.handle("db:messages:save", async (_, message) => {
        const { saveMessage } = await Promise.resolve().then(() => __importStar(require("./database/repositories/messages")));
        return saveMessage(message);
    });
    electron_1.ipcMain.handle("db:messages:update", async (_, id, updates) => {
        const { updateMessage } = await Promise.resolve().then(() => __importStar(require("./database/repositories/messages")));
        updateMessage(id, updates);
        return true;
    });
    electron_1.ipcMain.handle("db:messages:getByChat", async (_, chatId) => {
        const { getMessagesByChat } = await Promise.resolve().then(() => __importStar(require("./database/repositories/messages")));
        return getMessagesByChat(chatId);
    });
    electron_1.ipcMain.handle("db:messages:getLastN", async (_, chatId, n) => {
        const { getLastNMessages } = await Promise.resolve().then(() => __importStar(require("./database/repositories/messages")));
        return getLastNMessages(chatId, n);
    });
    electron_1.ipcMain.handle("db:messages:deleteFromPoint", async (_, chatId, fromMessageId) => {
        const { deleteMessagesFromPoint } = await Promise.resolve().then(() => __importStar(require("./database/repositories/messages")));
        deleteMessagesFromPoint(chatId, fromMessageId);
        return true;
    });
    // --- SNAPSHOTS ---
    electron_1.ipcMain.handle("db:snapshots:create", async (_, messageId, changes) => {
        const { createSnapshots } = await Promise.resolve().then(() => __importStar(require("./database/repositories/snapshots")));
        return createSnapshots(messageId, changes);
    });
    electron_1.ipcMain.handle("db:snapshots:getByMessage", async (_, messageId) => {
        const { getSnapshotsByMessage } = await Promise.resolve().then(() => __importStar(require("./database/repositories/snapshots")));
        return getSnapshotsByMessage(messageId);
    });
    electron_1.ipcMain.handle("db:snapshots:getAfterMessage", async (_, chatId, fromMessageId) => {
        const { getSnapshotsAfterMessage } = await Promise.resolve().then(() => __importStar(require("./database/repositories/snapshots")));
        return getSnapshotsAfterMessage(chatId, fromMessageId);
    });
    // --- ROLLBACK ---
    electron_1.ipcMain.handle("db:rollback", async (_, chatId, messageId, projectPath) => {
        const { rollbackToMessage } = await Promise.resolve().then(() => __importStar(require("./services/rollback")));
        return rollbackToMessage(chatId, messageId, projectPath);
    });
    // --- APP STATE ---
    electron_1.ipcMain.handle("db:appState:get", async () => {
        const { getAppState } = await Promise.resolve().then(() => __importStar(require("./database/repositories/app-state")));
        return getAppState();
    });
    electron_1.ipcMain.handle("db:appState:save", async (_, state) => {
        const { saveAppState } = await Promise.resolve().then(() => __importStar(require("./database/repositories/app-state")));
        saveAppState(state);
        return true;
    });
    // --- COMMAND EXECUTION ---
    electron_1.ipcMain.handle("cmd:approve", async (_, commandId) => {
        const { approveCommand } = await Promise.resolve().then(() => __importStar(require("./tools/commands")));
        return approveCommand(commandId);
    });
    electron_1.ipcMain.handle("cmd:reject", async (_, commandId) => {
        const { rejectCommand } = await Promise.resolve().then(() => __importStar(require("./tools/commands")));
        return rejectCommand(commandId);
    });
    electron_1.ipcMain.handle("cmd:sendInput", async (_, commandId, input) => {
        const { sendInput } = await Promise.resolve().then(() => __importStar(require("./tools/commands")));
        return sendInput(commandId, input);
    });
    electron_1.ipcMain.handle("cmd:terminate", async (_, commandId) => {
        const { terminateCommand } = await Promise.resolve().then(() => __importStar(require("./tools/commands")));
        return terminateCommand(commandId);
    });
    electron_1.ipcMain.handle("cmd:getStatus", async (_, commandId) => {
        const { getCommandStatus } = await Promise.resolve().then(() => __importStar(require("./tools/commands")));
        return getCommandStatus(commandId);
    });
    // ============================================
    // FILE SYSTEM IPC HANDLERS
    // ============================================
    // Read directory structure
    electron_1.ipcMain.handle("fs:readDirectory", async (_, dirPath, maxDepth) => {
        const { readDirectoryStructure } = await Promise.resolve().then(() => __importStar(require("./services/file-system")));
        return readDirectoryStructure(dirPath, maxDepth);
    });
    // Read file content
    electron_1.ipcMain.handle("fs:readFile", async (_, filePath) => {
        const { readFileContent } = await Promise.resolve().then(() => __importStar(require("./services/file-system")));
        return readFileContent(filePath);
    });
    // Write file content
    electron_1.ipcMain.handle("fs:writeFile", async (_, filePath, content) => {
        const { writeFileContent } = await Promise.resolve().then(() => __importStar(require("./services/file-system")));
        await writeFileContent(filePath, content);
        return true;
    });
    // Check if path exists
    electron_1.ipcMain.handle("fs:pathExists", async (_, filePath) => {
        const { pathExists } = await Promise.resolve().then(() => __importStar(require("./services/file-system")));
        return pathExists(filePath);
    });
    // Get path stats
    electron_1.ipcMain.handle("fs:getStats", async (_, filePath) => {
        const { getPathStats } = await Promise.resolve().then(() => __importStar(require("./services/file-system")));
        return getPathStats(filePath);
    });
}

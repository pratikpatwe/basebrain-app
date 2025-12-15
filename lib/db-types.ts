/**
 * TypeScript type definitions for the Electron database API
 * These types match the structures exposed via preload.ts
 */

// Database entity types
export interface Project {
    id: string;
    path: string;
    name: string;
    created_at: string;
    last_accessed_at: string;
}

export interface Chat {
    id: string;
    project_id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChatWithProject extends Chat {
    project_name: string;
    project_path: string;
}

export interface DBMessage {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    thinking: string | null;
    tool_calls: string | null;      // JSON string
    tool_results: string | null;    // JSON string
    tokens_prompt: number;
    tokens_completion: number;
    created_at: string;
}

export interface FileSnapshot {
    id: string;
    message_id: string;
    file_path: string;
    action: 'created' | 'modified' | 'deleted';
    content_before: string | null;
    content_after: string | null;
    created_at: string;
}

export interface FileChange {
    file_path: string;
    action: 'created' | 'modified' | 'deleted';
    content_before?: string;
    content_after?: string;
}

// Message input type for saving
export interface MessageInput {
    chat_id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content?: string;
    thinking?: string;
    tool_calls?: unknown[];
    tool_results?: unknown[];
    tokens_prompt?: number;
    tokens_completion?: number;
}

// Electron DB API interface
export interface ElectronDB {
    projects: {
        getOrCreate: (folderPath: string) => Promise<Project>;
        getById: (id: string) => Promise<Project | null>;
        getByPath: (path: string) => Promise<Project | null>;
        getAll: () => Promise<Project[]>;
        delete: (id: string) => Promise<boolean>;
    };
    chats: {
        create: (projectId: string, title?: string) => Promise<Chat>;
        getById: (id: string) => Promise<Chat | null>;
        getByProject: (projectId: string) => Promise<Chat[]>;
        getOthers: (currentProjectId: string) => Promise<ChatWithProject[]>;
        getAll: () => Promise<ChatWithProject[]>;
        updateTitle: (id: string, title: string) => Promise<boolean>;
        delete: (id: string) => Promise<boolean>;
    };
    messages: {
        save: (message: MessageInput) => Promise<DBMessage>;
        update: (id: string, updates: Partial<MessageInput>) => Promise<boolean>;
        getByChat: (chatId: string) => Promise<DBMessage[]>;
        getLastN: (chatId: string, n: number) => Promise<DBMessage[]>;
        deleteFromPoint: (chatId: string, fromMessageId: string) => Promise<boolean>;
    };
    snapshots: {
        create: (messageId: string, changes: FileChange[]) => Promise<FileSnapshot[]>;
        getByMessage: (messageId: string) => Promise<FileSnapshot[]>;
        getAfterMessage: (chatId: string, fromMessageId: string) => Promise<FileSnapshot[]>;
    };
    rollback: (chatId: string, messageId: string, projectPath: string) => Promise<{
        success: boolean;
        restoredFiles: string[];
        error?: string;
    }>;
    appState: {
        get: () => Promise<AppState>;
        save: (state: Partial<AppState>) => Promise<boolean>;
    };
    commands: {
        approve: (commandId: string) => Promise<CommandResult>;
        reject: (commandId: string) => Promise<CommandResult>;
        sendInput: (commandId: string, input: string) => Promise<CommandResult>;
        terminate: (commandId: string) => Promise<CommandResult>;
        getStatus: (commandId: string) => Promise<CommandResult>;
    };
}

// Command result type
export interface CommandResult {
    success: boolean;
    data?: {
        commandId: string;
        command?: string;
        status?: string;
        output?: string;
        exitCode?: number | null;
        requiresInput?: boolean;
        inputPrompt?: string;
        duration?: number;
        message?: string;
    };
    error?: string;
}

// App state for UI persistence
export interface AppState {
    lastProjectPath: string | null;
    lastChatId: string | null;
    sidebarCollapsed: boolean;
    editorCollapsed: boolean;
    editorPanelSize: number;
    chatPanelSize: number;
}

// Extend Window interface
declare global {
    interface Window {
        electronDB?: ElectronDB;
    }
}

/**
 * Helper function to check if database API is available
 */
export function isDBAvailable(): boolean {
    return typeof window !== 'undefined' && !!window.electronDB;
}

/**
 * Get the database API (throws if not available)
 */
export function getDB(): ElectronDB {
    if (!isDBAvailable()) {
        throw new Error('Database API not available - not running in Electron');
    }
    return window.electronDB!;
}

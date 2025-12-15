"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { Project, Chat, ChatWithProject, ElectronDB } from "./db-types";

// Project context type
interface ProjectContextType {
    // Project state
    projectPath: string | null;
    projectName: string;
    projectId: string | null;
    isElectron: boolean;

    // Project actions
    selectFolder: () => Promise<void>;
    clearProject: () => Promise<void>;

    // Chat state
    currentChatId: string | null;
    projectChats: Chat[];
    otherChats: ChatWithProject[];

    // Chat actions
    createNewChat: () => Promise<Chat | null>;
    selectChat: (chatId: string) => Promise<void>;
    deleteChat: (chatId: string) => Promise<void>;
    refreshChats: () => Promise<void>;
}

// Default context value
const ProjectContext = createContext<ProjectContextType>({
    projectPath: null,
    projectName: "Select Folder",
    projectId: null,
    isElectron: false,
    selectFolder: async () => { },
    clearProject: async () => { },
    currentChatId: null,
    projectChats: [],
    otherChats: [],
    createNewChat: async () => null,
    selectChat: async () => { },
    deleteChat: async () => { },
    refreshChats: async () => { },
});

// Get folder API (type-safe access to window.electronFolder)
declare global {
    interface Window {
        electronFolder?: {
            selectFolder: () => Promise<string | null>;
        };
        electronTools?: {
            execute: (toolName: string, args: Record<string, unknown>, projectPath: string) => Promise<ToolResult>;
            getDefinitions: () => Promise<ToolDefinition[]>;
        };
        electronDB?: ElectronDB;
    }
}

// Tool result type
export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

// Tool definition type
export interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, { type: string; description: string }>;
        required?: string[];
    };
}

// Provider component
export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [projectPath, setProjectPath] = useState<string | null>(null);
    const [projectId, setProjectId] = useState<string | null>(null);
    const [isElectron, setIsElectron] = useState(false);

    // Chat state
    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const [projectChats, setProjectChats] = useState<Chat[]>([]);
    const [otherChats, setOtherChats] = useState<ChatWithProject[]>([]);

    // Check if running in Electron and load saved app state
    useEffect(() => {
        const hasElectronFolder = typeof window !== "undefined" && !!window.electronFolder;
        setIsElectron(hasElectronFolder);

        // Load saved app state from database
        const loadAppState = async () => {
            if (typeof window !== "undefined" && window.electronDB) {
                try {
                    const appState = await window.electronDB.appState.get();
                    console.log("[ProjectContext] Loaded app state:", appState);

                    if (appState.lastProjectPath) {
                        // Initialize project from saved path
                        await initializeProject(appState.lastProjectPath);
                    }

                    if (appState.lastChatId) {
                        setCurrentChatId(appState.lastChatId);
                    }
                } catch (error) {
                    console.error("[ProjectContext] Error loading app state:", error);
                }
            }
        };

        loadAppState();
    }, []);

    // Initialize project from path (create or get from DB)
    const initializeProject = async (path: string) => {
        setProjectPath(path);

        if (window.electronDB) {
            try {
                const project = await window.electronDB.projects.getOrCreate(path);
                setProjectId(project.id);

                // Load chats for this project
                const chats = await window.electronDB.chats.getByProject(project.id);
                setProjectChats(chats);

                // Load other chats
                const others = await window.electronDB.chats.getOthers(project.id);
                setOtherChats(others);
            } catch (error) {
                console.error("[ProjectContext] Error initializing project:", error);
            }
        }
    };

    // Refresh chats from database
    const refreshChats = useCallback(async () => {
        if (!window.electronDB || !projectId) return;

        try {
            const chats = await window.electronDB.chats.getByProject(projectId);
            setProjectChats(chats);

            const others = await window.electronDB.chats.getOthers(projectId);
            setOtherChats(others);
        } catch (error) {
            console.error("[ProjectContext] Error refreshing chats:", error);
        }
    }, [projectId]);

    // Extract folder name from path
    const projectName = React.useMemo(() => {
        if (!projectPath) return "Select Folder";
        // Get last part of path (folder name)
        const parts = projectPath.replace(/\\/g, "/").split("/");
        return parts[parts.length - 1] || "Project";
    }, [projectPath]);

    // Open folder picker
    const selectFolder = useCallback(async () => {
        if (!window.electronFolder) {
            console.warn("Folder selection not available (not in Electron)");
            return;
        }

        try {
            const path = await window.electronFolder.selectFolder();
            if (path) {
                await initializeProject(path);

                // Clear current chat when switching projects
                setCurrentChatId(null);

                // Save to app state
                if (window.electronDB) {
                    await window.electronDB.appState.save({
                        lastProjectPath: path,
                        lastChatId: null
                    });
                }
            }
        } catch (error) {
            console.error("Error selecting folder:", error);
        }
    }, []);

    // Clear project
    const clearProject = useCallback(async () => {
        setProjectPath(null);
        setProjectId(null);
        setProjectChats([]);
        setCurrentChatId(null);

        // Clear from app state
        if (window.electronDB) {
            await window.electronDB.appState.save({
                lastProjectPath: null,
                lastChatId: null
            });
        }
    }, []);

    // Create a new chat
    const createNewChat = useCallback(async (): Promise<Chat | null> => {
        if (!window.electronDB || !projectId) {
            console.warn("Cannot create chat: DB not available or no project selected");
            return null;
        }

        try {
            const chat = await window.electronDB.chats.create(projectId);

            // Refresh chats list
            await refreshChats();

            // Set as current chat
            setCurrentChatId(chat.id);

            // Save to app state
            if (window.electronDB) {
                await window.electronDB.appState.save({ lastChatId: chat.id });
            }

            return chat;
        } catch (error) {
            console.error("[ProjectContext] Error creating chat:", error);
            return null;
        }
    }, [projectId, refreshChats]);

    // Select a chat
    const selectChat = useCallback(async (chatId: string) => {
        setCurrentChatId(chatId);

        // Save to app state
        if (window.electronDB) {
            await window.electronDB.appState.save({ lastChatId: chatId });
        }
    }, []);

    // Delete a chat
    const deleteChat = useCallback(async (chatId: string) => {
        if (!window.electronDB) return;

        try {
            await window.electronDB.chats.delete(chatId);

            // If deleting current chat, clear it
            if (chatId === currentChatId) {
                setCurrentChatId(null);
                await window.electronDB.appState.save({ lastChatId: null });
            }

            // Refresh chats list
            await refreshChats();
        } catch (error) {
            console.error("[ProjectContext] Error deleting chat:", error);
        }
    }, [currentChatId, refreshChats]);

    return (
        <ProjectContext.Provider
            value={{
                projectPath,
                projectName,
                projectId,
                isElectron,
                selectFolder,
                clearProject,
                currentChatId,
                projectChats,
                otherChats,
                createNewChat,
                selectChat,
                deleteChat,
                refreshChats,
            }}
        >
            {children}
        </ProjectContext.Provider>
    );
}

// Hook to use project context
export function useProject() {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error("useProject must be used within a ProjectProvider");
    }
    return context;
}

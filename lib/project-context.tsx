"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect } from "react";

// Project context type
interface ProjectContextType {
    projectPath: string | null;
    projectName: string;
    isElectron: boolean;
    selectFolder: () => Promise<void>;
    clearProject: () => void;
}

// Default context value
const ProjectContext = createContext<ProjectContextType>({
    projectPath: null,
    projectName: "Select Folder",
    isElectron: false,
    selectFolder: async () => { },
    clearProject: () => { },
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

// Storage key for persisting project path
const PROJECT_PATH_KEY = "basebrain_project_path";

// Provider component
export function ProjectProvider({ children }: { children: React.ReactNode }) {
    const [projectPath, setProjectPath] = useState<string | null>(null);
    const [isElectron, setIsElectron] = useState(false);

    // Check if running in Electron and load saved project
    useEffect(() => {
        const hasElectronFolder = typeof window !== "undefined" && !!window.electronFolder;
        setIsElectron(hasElectronFolder);

        // Load saved project path from localStorage
        if (typeof window !== "undefined") {
            const savedPath = localStorage.getItem(PROJECT_PATH_KEY);
            if (savedPath) {
                setProjectPath(savedPath);
            }
        }
    }, []);

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
                setProjectPath(path);
                localStorage.setItem(PROJECT_PATH_KEY, path);
            }
        } catch (error) {
            console.error("Error selecting folder:", error);
        }
    }, []);

    // Clear project
    const clearProject = useCallback(() => {
        setProjectPath(null);
        localStorage.removeItem(PROJECT_PATH_KEY);
    }, []);

    return (
        <ProjectContext.Provider
            value={{
                projectPath,
                projectName,
                isElectron,
                selectFolder,
                clearProject,
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

/**
 * File watcher service for monitoring project directory changes
 */

import * as fs from "fs";
import * as path from "path";
import { BrowserWindow } from "electron";

const watchers = new Map<string, fs.FSWatcher>();

// Directories and files to ignore
const IGNORE_PATTERNS = [
    "node_modules",
    ".next",
    ".git",
    "dist",
    "build",
    ".cache",
    "coverage",
    ".vscode",
    ".idea",
    "__pycache__",
];

function shouldIgnore(filePath: string): boolean {
    return IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern));
}

/**
 * Start watching a directory for changes
 */
export function watchDirectory(
    dirPath: string,
    mainWindow: BrowserWindow | null
): void {
    // Stop any existing watcher for this path
    stopWatching(dirPath);

    if (!mainWindow) return;

    try {
        const watcher = fs.watch(
            dirPath,
            { recursive: true },
            (eventType, filename) => {
                if (!filename) return;

                const fullPath = path.join(dirPath, filename);

                // Ignore certain patterns
                if (shouldIgnore(fullPath)) return;

                // Notify the renderer process
                mainWindow.webContents.send("file-system-change", {
                    eventType,
                    path: fullPath,
                    projectPath: dirPath,
                });

                console.log(
                    `[FileWatcher] ${eventType}: ${filename}`
                );
            }
        );

        watchers.set(dirPath, watcher);
        console.log(`[FileWatcher] Watching: ${dirPath}`);
    } catch (error) {
        console.error(`[FileWatcher] Error watching ${dirPath}:`, error);
    }
}

/**
 * Stop watching a directory
 */
export function stopWatching(dirPath: string): void {
    const watcher = watchers.get(dirPath);
    if (watcher) {
        watcher.close();
        watchers.delete(dirPath);
        console.log(`[FileWatcher] Stopped watching: ${dirPath}`);
    }
}

/**
 * Stop all watchers
 */
export function stopAllWatchers(): void {
    watchers.forEach((watcher, path) => {
        watcher.close();
        console.log(`[FileWatcher] Stopped watching: ${path}`);
    });
    watchers.clear();
}

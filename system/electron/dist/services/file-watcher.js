"use strict";
/**
 * File watcher service for monitoring project directory changes
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
exports.watchDirectory = watchDirectory;
exports.stopWatching = stopWatching;
exports.stopAllWatchers = stopAllWatchers;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const watchers = new Map();
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
function shouldIgnore(filePath) {
    return IGNORE_PATTERNS.some((pattern) => filePath.includes(pattern));
}
/**
 * Start watching a directory for changes
 */
function watchDirectory(dirPath, mainWindow) {
    // Stop any existing watcher for this path
    stopWatching(dirPath);
    if (!mainWindow)
        return;
    try {
        const watcher = fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
            if (!filename)
                return;
            const fullPath = path.join(dirPath, filename);
            // Ignore certain patterns
            if (shouldIgnore(fullPath))
                return;
            // Notify the renderer process
            mainWindow.webContents.send("file-system-change", {
                eventType,
                path: fullPath,
                projectPath: dirPath,
            });
            console.log(`[FileWatcher] ${eventType}: ${filename}`);
        });
        watchers.set(dirPath, watcher);
        console.log(`[FileWatcher] Watching: ${dirPath}`);
    }
    catch (error) {
        console.error(`[FileWatcher] Error watching ${dirPath}:`, error);
    }
}
/**
 * Stop watching a directory
 */
function stopWatching(dirPath) {
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
function stopAllWatchers() {
    watchers.forEach((watcher, path) => {
        watcher.close();
        console.log(`[FileWatcher] Stopped watching: ${path}`);
    });
    watchers.clear();
}

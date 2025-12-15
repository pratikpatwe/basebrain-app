"use strict";
/**
 * File system service for reading project files and directories
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
exports.readDirectoryStructure = readDirectoryStructure;
exports.readFileContent = readFileContent;
exports.writeFileContent = writeFileContent;
exports.pathExists = pathExists;
exports.getPathStats = getPathStats;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
/**
 * Generate a unique ID for a file/folder
 */
function generateId(filePath) {
    return Buffer.from(filePath).toString("base64");
}
/**
 * Get file extension
 */
function getExtension(filename) {
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}
/**
 * Directories and files to ignore
 */
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
    "*.pyc",
    ".DS_Store",
    "Thumbs.db",
];
/**
 * Check if a file/folder should be ignored
 */
function shouldIgnore(name) {
    return IGNORE_PATTERNS.some((pattern) => {
        if (pattern.includes("*")) {
            const regex = new RegExp(pattern.replace("*", ".*"));
            return regex.test(name);
        }
        return name === pattern;
    });
}
/**
 * Read directory structure recursively
 */
async function readDirectoryStructure(dirPath, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
        return [];
    }
    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const nodes = [];
        for (const entry of entries) {
            // Skip ignored files/folders
            if (shouldIgnore(entry.name)) {
                continue;
            }
            const fullPath = path.join(dirPath, entry.name);
            const relativePath = fullPath;
            if (entry.isDirectory()) {
                // Recursively read subdirectory
                const children = await readDirectoryStructure(fullPath, maxDepth, currentDepth + 1);
                nodes.push({
                    id: generateId(relativePath),
                    name: entry.name,
                    type: "folder",
                    path: relativePath,
                    children,
                    isExpanded: currentDepth === 0, // Expand root level by default
                });
            }
            else if (entry.isFile()) {
                const extension = getExtension(entry.name);
                nodes.push({
                    id: generateId(relativePath),
                    name: entry.name,
                    type: "file",
                    path: relativePath,
                    extension,
                });
            }
        }
        // Sort: folders first, then files, both alphabetically
        return nodes.sort((a, b) => {
            if (a.type === "folder" && b.type === "file")
                return -1;
            if (a.type === "file" && b.type === "folder")
                return 1;
            return a.name.localeCompare(b.name);
        });
    }
    catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return [];
    }
}
/**
 * Read file contents
 */
async function readFileContent(filePath) {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        return content;
    }
    catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw new Error(`Failed to read file: ${filePath}`);
    }
}
/**
 * Write file contents
 */
async function writeFileContent(filePath, content) {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(filePath, content, "utf-8");
    }
    catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        throw new Error(`Failed to write file: ${filePath}`);
    }
}
/**
 * Check if path exists
 */
async function pathExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Get file/folder stats
 */
async function getPathStats(filePath) {
    try {
        const stats = await fs.stat(filePath);
        return {
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime,
        };
    }
    catch (error) {
        throw new Error(`Failed to get stats for: ${filePath}`);
    }
}

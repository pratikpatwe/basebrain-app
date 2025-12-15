/**
 * File system service for reading project files and directories
 */

import * as fs from "fs/promises";
import * as path from "path";

export interface FileSystemNode {
    id: string;
    name: string;
    type: "file" | "folder";
    path: string;
    extension?: string;
    children?: FileSystemNode[];
    isExpanded?: boolean;
}

/**
 * Generate a unique ID for a file/folder
 */
function generateId(filePath: string): string {
    return Buffer.from(filePath).toString("base64");
}

/**
 * Get file extension
 */
function getExtension(filename: string): string {
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
function shouldIgnore(name: string): boolean {
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
export async function readDirectoryStructure(
    dirPath: string,
    maxDepth: number = 3,
    currentDepth: number = 0
): Promise<FileSystemNode[]> {
    if (currentDepth >= maxDepth) {
        return [];
    }

    try {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const nodes: FileSystemNode[] = [];

        for (const entry of entries) {
            // Skip ignored files/folders
            if (shouldIgnore(entry.name)) {
                continue;
            }

            const fullPath = path.join(dirPath, entry.name);
            const relativePath = fullPath;

            if (entry.isDirectory()) {
                // Recursively read subdirectory
                const children = await readDirectoryStructure(
                    fullPath,
                    maxDepth,
                    currentDepth + 1
                );

                nodes.push({
                    id: generateId(relativePath),
                    name: entry.name,
                    type: "folder",
                    path: relativePath,
                    children,
                    isExpanded: currentDepth === 0, // Expand root level by default
                });
            } else if (entry.isFile()) {
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
            if (a.type === "folder" && b.type === "file") return -1;
            if (a.type === "file" && b.type === "folder") return 1;
            return a.name.localeCompare(b.name);
        });
    } catch (error) {
        console.error(`Error reading directory ${dirPath}:`, error);
        return [];
    }
}

/**
 * Read file contents
 */
export async function readFileContent(filePath: string): Promise<string> {
    try {
        const content = await fs.readFile(filePath, "utf-8");
        return content;
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error);
        throw new Error(`Failed to read file: ${filePath}`);
    }
}

/**
 * Write file contents
 */
export async function writeFileContent(
    filePath: string,
    content: string
): Promise<void> {
    try {
        // Ensure directory exists
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        await fs.writeFile(filePath, content, "utf-8");
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error);
        throw new Error(`Failed to write file: ${filePath}`);
    }
}

/**
 * Check if path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get file/folder stats
 */
export async function getPathStats(filePath: string) {
    try {
        const stats = await fs.stat(filePath);
        return {
            isFile: stats.isFile(),
            isDirectory: stats.isDirectory(),
            size: stats.size,
            modified: stats.mtime,
            created: stats.birthtime,
        };
    } catch (error) {
        throw new Error(`Failed to get stats for: ${filePath}`);
    }
}

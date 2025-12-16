/**
 * File System Tools for AI Agent
 * These tools allow the AI to perform file and folder operations
 * within the user's selected project directory.
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Tool result type
export interface ToolResult {
    success: boolean;
    data?: unknown;
    error?: string;
}

/**
 * Validate that a path is within the allowed project directory
 * This is a security measure to prevent the AI from accessing files outside the project
 */
function validatePath(filePath: string, projectPath: string): boolean {
    // Normalize both paths
    const normalizedFilePath = path.normalize(path.resolve(projectPath, filePath));
    const normalizedProjectPath = path.normalize(projectPath);

    // Check if the file path starts with the project path
    // Also ensure it doesn't escape via symlinks or ../ tricks
    if (!normalizedFilePath.startsWith(normalizedProjectPath)) {
        return false;
    }

    // Additional check: the path should be equal to or longer than project path
    // and if longer, should have a path separator after project path
    if (normalizedFilePath.length > normalizedProjectPath.length) {
        const separator = normalizedFilePath[normalizedProjectPath.length];
        if (separator !== path.sep) {
            return false;
        }
    }

    return true;
}

/**
 * Check if the given path is the project root itself
 * Used to prevent deletion of the entire project folder
 */
function isProjectRoot(filePath: string, projectPath: string): boolean {
    const normalizedFilePath = path.normalize(path.resolve(projectPath, filePath));
    const normalizedProjectPath = path.normalize(projectPath);
    return normalizedFilePath === normalizedProjectPath;
}

/**
 * Resolve a relative path to absolute, ensuring it's within project bounds
 */
function resolvePath(filePath: string, projectPath: string): string | null {
    // Prevent empty paths
    if (!filePath || !projectPath) {
        return null;
    }

    // Block obvious escape attempts
    if (filePath.includes('..') && filePath.includes('..')) {
        const testPath = path.normalize(path.resolve(projectPath, filePath));
        if (!testPath.startsWith(path.normalize(projectPath))) {
            return null;
        }
    }

    const absolutePath = path.isAbsolute(filePath)
        ? filePath
        : path.resolve(projectPath, filePath);

    if (!validatePath(absolutePath, projectPath)) {
        return null;
    }

    return absolutePath;
}

// ============================================
// FILE OPERATIONS
// ============================================

/**
 * Read file contents
 */
export async function readFile(
    filePath: string,
    projectPath: string,
    encoding: BufferEncoding = "utf-8"
): Promise<ToolResult> {
    try {
        const absolutePath = resolvePath(filePath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (!fs.existsSync(absolutePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const stats = fs.statSync(absolutePath);
        if (stats.isDirectory()) {
            return { success: false, error: "Path is a directory, not a file" };
        }

        const content = fs.readFileSync(absolutePath, encoding);
        return {
            success: true,
            data: {
                content,
                path: filePath,
                size: stats.size,
                modified: stats.mtime.toISOString()
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to read file: ${(error as Error).message}` };
    }
}

/**
 * Write/Create a file
 * Returns line change statistics (added/removed)
 */
export async function writeFile(
    filePath: string,
    content: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absolutePath = resolvePath(filePath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(absolutePath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        // Ensure content is a string
        if (typeof content !== 'string') {
            // Try to convert to string if it's an object
            if (content && typeof content === 'object') {
                content = JSON.stringify(content, null, 2);
            } else {
                content = String(content ?? '');
            }
        }

        // Calculate line changes
        let linesAdded = 0;
        let linesRemoved = 0;
        let isNewFile = true;
        const newLines = content.split('\n');

        if (fs.existsSync(absolutePath)) {
            isNewFile = false;
            const oldContent = fs.readFileSync(absolutePath, 'utf-8');
            const oldLines = oldContent.split('\n');

            // Simple diff: count lines added and removed
            const oldLineCount = oldLines.length;
            const newLineCount = newLines.length;

            // Use a simple line-by-line comparison
            const oldLineSet = new Set(oldLines);
            const newLineSet = new Set(newLines);

            // Count lines that are in new but not in old (added)
            for (const line of newLines) {
                if (!oldLineSet.has(line)) {
                    linesAdded++;
                }
            }

            // Count lines that are in old but not in new (removed)
            for (const line of oldLines) {
                if (!newLineSet.has(line)) {
                    linesRemoved++;
                }
            }
        } else {
            // New file - all lines are additions
            linesAdded = newLines.length;
        }

        fs.writeFileSync(absolutePath, content, "utf-8");
        return {
            success: true,
            data: {
                path: filePath,
                message: isNewFile ? 'File created successfully' : 'File updated successfully',
                linesAdded,
                linesRemoved,
                isNewFile
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to write file: ${(error as Error).message}` };
    }
}

/**
 * Append to a file
 */
export async function appendFile(
    filePath: string,
    content: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absolutePath = resolvePath(filePath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        fs.appendFileSync(absolutePath, content, "utf-8");
        return { success: true, data: { path: filePath, message: "Content appended successfully" } };
    } catch (error) {
        return { success: false, error: `Failed to append to file: ${(error as Error).message}` };
    }
}

/**
 * Delete a file
 */
export async function deleteFile(
    filePath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absolutePath = resolvePath(filePath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (!fs.existsSync(absolutePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const stats = fs.statSync(absolutePath);
        if (stats.isDirectory()) {
            return { success: false, error: "Path is a directory. Use deleteFolder instead" };
        }

        fs.unlinkSync(absolutePath);
        return { success: true, data: { path: filePath, message: "File deleted successfully" } };
    } catch (error) {
        return { success: false, error: `Failed to delete file: ${(error as Error).message}` };
    }
}

/**
 * Copy a file
 */
export async function copyFile(
    sourcePath: string,
    destPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absoluteSource = resolvePath(sourcePath, projectPath);
        const absoluteDest = resolvePath(destPath, projectPath);

        if (!absoluteSource || !absoluteDest) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (!fs.existsSync(absoluteSource)) {
            return { success: false, error: `Source file not found: ${sourcePath}` };
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(absoluteDest);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.copyFileSync(absoluteSource, absoluteDest);
        return {
            success: true,
            data: {
                source: sourcePath,
                destination: destPath,
                message: "File copied successfully"
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to copy file: ${(error as Error).message}` };
    }
}

/**
 * Move/Rename a file
 */
export async function moveFile(
    sourcePath: string,
    destPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absoluteSource = resolvePath(sourcePath, projectPath);
        const absoluteDest = resolvePath(destPath, projectPath);

        if (!absoluteSource || !absoluteDest) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (!fs.existsSync(absoluteSource)) {
            return { success: false, error: `Source file not found: ${sourcePath}` };
        }

        // Ensure parent directory exists
        const parentDir = path.dirname(absoluteDest);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        fs.renameSync(absoluteSource, absoluteDest);
        return {
            success: true,
            data: {
                source: sourcePath,
                destination: destPath,
                message: "File moved successfully"
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to move file: ${(error as Error).message}` };
    }
}

// ============================================
// FOLDER OPERATIONS
// ============================================

/**
 * Create a folder
 */
export async function createFolder(
    folderPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absolutePath = resolvePath(folderPath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (fs.existsSync(absolutePath)) {
            return { success: false, error: `Folder already exists: ${folderPath}` };
        }

        fs.mkdirSync(absolutePath, { recursive: true });
        return { success: true, data: { path: folderPath, message: "Folder created successfully" } };
    } catch (error) {
        return { success: false, error: `Failed to create folder: ${(error as Error).message}` };
    }
}

/**
 * Delete a folder (and all contents)
 * SECURITY: Cannot delete the project root folder
 */
export async function deleteFolder(
    folderPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        // SECURITY: Prevent deletion of project root
        if (folderPath === "." || folderPath === "./" || folderPath === ".\\" || !folderPath) {
            return { success: false, error: "SECURITY: Cannot delete the project root folder" };
        }

        // Check if this path resolves to project root
        if (isProjectRoot(folderPath, projectPath)) {
            return { success: false, error: "SECURITY: Cannot delete the project root folder" };
        }

        const absolutePath = resolvePath(folderPath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        // Double-check: absolute path should not equal project path
        if (path.normalize(absolutePath) === path.normalize(projectPath)) {
            return { success: false, error: "SECURITY: Cannot delete the project root folder" };
        }

        if (!fs.existsSync(absolutePath)) {
            return { success: false, error: `Folder not found: ${folderPath}` };
        }

        const stats = fs.statSync(absolutePath);
        if (!stats.isDirectory()) {
            return { success: false, error: "Path is a file, not a folder. Use deleteFile instead" };
        }

        fs.rmSync(absolutePath, { recursive: true, force: true });
        return { success: true, data: { path: folderPath, message: "Folder deleted successfully" } };
    } catch (error) {
        return { success: false, error: `Failed to delete folder: ${(error as Error).message}` };
    }
}

/**
 * List folder contents
 */
export async function listFolder(
    folderPath: string,
    projectPath: string,
    recursive: boolean = false
): Promise<ToolResult> {
    try {
        // Validate projectPath
        if (!projectPath) {
            return { success: false, error: "Project path not provided. Please select a project folder first." };
        }

        // Handle "." as project root
        const targetPath = folderPath === "." ? projectPath : folderPath;

        const absolutePath = resolvePath(targetPath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (!fs.existsSync(absolutePath)) {
            return { success: false, error: `Folder not found: ${folderPath} (resolved to: ${absolutePath})` };
        }

        const stats = fs.statSync(absolutePath);
        if (!stats.isDirectory()) {
            return { success: false, error: "Path is a file, not a folder" };
        }

        const listDir = (dirPath: string, basePath: string): unknown[] => {
            const entries = fs.readdirSync(dirPath, { withFileTypes: true });
            const result: unknown[] = [];

            for (const entry of entries) {
                const relativePath = path.relative(projectPath, path.join(dirPath, entry.name));
                const entryStats = fs.statSync(path.join(dirPath, entry.name));

                const item = {
                    name: entry.name,
                    path: relativePath,
                    type: entry.isDirectory() ? "folder" : "file",
                    size: entry.isFile() ? entryStats.size : undefined,
                    modified: entryStats.mtime.toISOString(),
                    children: undefined as unknown[] | undefined
                };

                if (recursive && entry.isDirectory()) {
                    item.children = listDir(path.join(dirPath, entry.name), basePath);
                }

                result.push(item);
            }

            return result;
        };

        const items = listDir(absolutePath, projectPath);
        return {
            success: true,
            data: {
                path: folderPath,
                items,
                count: items.length
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to list folder: ${(error as Error).message}` };
    }
}

/**
 * Copy a folder (and all contents)
 */
export async function copyFolder(
    sourcePath: string,
    destPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absoluteSource = resolvePath(sourcePath, projectPath);
        const absoluteDest = resolvePath(destPath, projectPath);

        if (!absoluteSource || !absoluteDest) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (!fs.existsSync(absoluteSource)) {
            return { success: false, error: `Source folder not found: ${sourcePath}` };
        }

        const copyRecursive = (src: string, dest: string) => {
            if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true });
            }

            const entries = fs.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path.join(src, entry.name);
                const destPath = path.join(dest, entry.name);

                if (entry.isDirectory()) {
                    copyRecursive(srcPath, destPath);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
            }
        };

        copyRecursive(absoluteSource, absoluteDest);
        return {
            success: true,
            data: {
                source: sourcePath,
                destination: destPath,
                message: "Folder copied successfully"
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to copy folder: ${(error as Error).message}` };
    }
}

/**
 * Move/Rename a folder
 * SECURITY: Cannot move the project root folder
 */
export async function moveFolder(
    sourcePath: string,
    destPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        // SECURITY: Prevent moving project root
        if (isProjectRoot(sourcePath, projectPath)) {
            return { success: false, error: "SECURITY: Cannot move the project root folder" };
        }

        const absoluteSource = resolvePath(sourcePath, projectPath);
        const absoluteDest = resolvePath(destPath, projectPath);

        if (!absoluteSource || !absoluteDest) {
            return { success: false, error: "Path is outside project directory" };
        }

        // Double-check source is not project root
        if (path.normalize(absoluteSource) === path.normalize(projectPath)) {
            return { success: false, error: "SECURITY: Cannot move the project root folder" };
        }

        if (!fs.existsSync(absoluteSource)) {
            return { success: false, error: `Source folder not found: ${sourcePath}` };
        }

        fs.renameSync(absoluteSource, absoluteDest);
        return {
            success: true,
            data: {
                source: sourcePath,
                destination: destPath,
                message: "Folder moved successfully"
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to move folder: ${(error as Error).message}` };
    }
}

// ============================================
// UTILITY OPERATIONS
// ============================================

/**
 * Check if a path exists
 */
export async function exists(
    targetPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absolutePath = resolvePath(targetPath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        const pathExists = fs.existsSync(absolutePath);
        let type: string | null = null;

        if (pathExists) {
            const stats = fs.statSync(absolutePath);
            type = stats.isDirectory() ? "folder" : "file";
        }

        return {
            success: true,
            data: {
                path: targetPath,
                exists: pathExists,
                type
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to check path: ${(error as Error).message}` };
    }
}

/**
 * Get file/folder info
 */
export async function getInfo(
    targetPath: string,
    projectPath: string
): Promise<ToolResult> {
    try {
        const absolutePath = resolvePath(targetPath, projectPath);
        if (!absolutePath) {
            return { success: false, error: "Path is outside project directory" };
        }

        if (!fs.existsSync(absolutePath)) {
            return { success: false, error: `Path not found: ${targetPath}` };
        }

        const stats = fs.statSync(absolutePath);
        return {
            success: true,
            data: {
                path: targetPath,
                absolutePath,
                type: stats.isDirectory() ? "folder" : "file",
                size: stats.size,
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString(),
                accessed: stats.atime.toISOString(),
                permissions: stats.mode.toString(8)
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to get info: ${(error as Error).message}` };
    }
}

/**
 * Search for files matching a pattern
 */
export async function searchFiles(
    pattern: string,
    projectPath: string,
    options: { maxDepth?: number; includeHidden?: boolean } = {}
): Promise<ToolResult> {
    try {
        const { maxDepth = 10, includeHidden = false } = options;
        const matches: unknown[] = [];
        const regex = new RegExp(pattern.replace(/\*/g, ".*"), "i");

        const search = (dirPath: string, depth: number) => {
            if (depth > maxDepth) return;

            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });

                for (const entry of entries) {
                    // Skip hidden files/folders if not included
                    if (!includeHidden && entry.name.startsWith(".")) continue;

                    const fullPath = path.join(dirPath, entry.name);
                    const relativePath = path.relative(projectPath, fullPath);

                    if (regex.test(entry.name)) {
                        const stats = fs.statSync(fullPath);
                        matches.push({
                            name: entry.name,
                            path: relativePath,
                            type: entry.isDirectory() ? "folder" : "file",
                            size: entry.isFile() ? stats.size : undefined,
                            modified: stats.mtime.toISOString()
                        });
                    }

                    if (entry.isDirectory()) {
                        search(fullPath, depth + 1);
                    }
                }
            } catch {
                // Skip directories we can't read
            }
        };

        search(projectPath, 0);
        return {
            success: true,
            data: {
                pattern,
                matches,
                count: matches.length
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to search: ${(error as Error).message}` };
    }
}

/**
 * Get system information
 */
export async function getSystemInfo(): Promise<ToolResult> {
    try {
        return {
            success: true,
            data: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                homeDir: os.homedir(),
                tempDir: os.tmpdir(),
                cpus: os.cpus().length,
                totalMemory: os.totalmem(),
                freeMemory: os.freemem(),
                uptime: os.uptime()
            }
        };
    } catch (error) {
        return { success: false, error: `Failed to get system info: ${(error as Error).message}` };
    }
}

// ============================================
// TOOL DEFINITIONS FOR AI
// ============================================

export const toolDefinitions = [
    {
        name: "read_file",
        description: "Read the contents of a file",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file (relative to project root)" }
            },
            required: ["path"]
        }
    },
    {
        name: "write_file",
        description: "Create or overwrite a file with content",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file (relative to project root)" },
                content: { type: "string", description: "Content to write to the file" }
            },
            required: ["path", "content"]
        }
    },
    {
        name: "append_file",
        description: "Append content to an existing file",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file (relative to project root)" },
                content: { type: "string", description: "Content to append" }
            },
            required: ["path", "content"]
        }
    },
    {
        name: "delete_file",
        description: "Delete a file",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the file to delete" }
            },
            required: ["path"]
        }
    },
    {
        name: "copy_file",
        description: "Copy a file to a new location",
        parameters: {
            type: "object",
            properties: {
                source: { type: "string", description: "Source file path" },
                destination: { type: "string", description: "Destination file path" }
            },
            required: ["source", "destination"]
        }
    },
    {
        name: "move_file",
        description: "Move or rename a file",
        parameters: {
            type: "object",
            properties: {
                source: { type: "string", description: "Current file path" },
                destination: { type: "string", description: "New file path" }
            },
            required: ["source", "destination"]
        }
    },
    {
        name: "create_folder",
        description: "Create a new folder",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path for the new folder" }
            },
            required: ["path"]
        }
    },
    {
        name: "delete_folder",
        description: "Delete a folder and all its contents",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the folder to delete" }
            },
            required: ["path"]
        }
    },
    {
        name: "list_folder",
        description: "List contents of a folder",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to the folder (use '.' for project root)" },
                recursive: { type: "boolean", description: "Include subfolders recursively" }
            },
            required: ["path"]
        }
    },
    {
        name: "copy_folder",
        description: "Copy a folder and all its contents",
        parameters: {
            type: "object",
            properties: {
                source: { type: "string", description: "Source folder path" },
                destination: { type: "string", description: "Destination folder path" }
            },
            required: ["source", "destination"]
        }
    },
    {
        name: "move_folder",
        description: "Move or rename a folder",
        parameters: {
            type: "object",
            properties: {
                source: { type: "string", description: "Current folder path" },
                destination: { type: "string", description: "New folder path" }
            },
            required: ["source", "destination"]
        }
    },
    {
        name: "exists",
        description: "Check if a file or folder exists",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to check" }
            },
            required: ["path"]
        }
    },
    {
        name: "get_info",
        description: "Get detailed information about a file or folder",
        parameters: {
            type: "object",
            properties: {
                path: { type: "string", description: "Path to get info for" }
            },
            required: ["path"]
        }
    },
    {
        name: "search_files",
        description: "Search for files matching a pattern",
        parameters: {
            type: "object",
            properties: {
                pattern: { type: "string", description: "Search pattern (supports * wildcard)" },
                maxDepth: { type: "number", description: "Maximum folder depth to search" },
                includeHidden: { type: "boolean", description: "Include hidden files/folders" }
            },
            required: ["pattern"]
        }
    },
    {
        name: "get_system_info",
        description: "Get system information (OS, CPU, memory, etc.)",
        parameters: {
            type: "object",
            properties: {}
        }
    }
];

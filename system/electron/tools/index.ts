/**
 * Tools Index - Exports all AI tools
 */

export * from "./filesystem";
export * from "./commands";

// Export tool executor function
import {
    readFile,
    writeFile,
    appendFile,
    deleteFile,
    copyFile,
    moveFile,
    createFolder,
    deleteFolder,
    listFolder,
    copyFolder,
    moveFolder,
    exists,
    getInfo,
    searchFiles,
    getSystemInfo,
    toolDefinitions,
    ToolResult
} from "./filesystem";

import {
    prepareCommand,
    approveCommand,
    rejectCommand,
    sendInput,
    terminateCommand,
    getCommandStatus,
    commandToolDefinitions
} from "./commands";

// Merge all tool definitions
export const allToolDefinitions = [...toolDefinitions, ...commandToolDefinitions];
export { toolDefinitions, commandToolDefinitions };

/**
 * Execute a tool by name with given arguments
 */
export async function executeTool(
    toolName: string,
    args: Record<string, unknown>,
    projectPath: string
): Promise<ToolResult> {
    switch (toolName) {
        case "read_file":
            return readFile(args.path as string, projectPath);

        case "write_file":
            return writeFile(args.path as string, args.content as string, projectPath);

        case "append_file":
            return appendFile(args.path as string, args.content as string, projectPath);

        case "delete_file":
            return deleteFile(args.path as string, projectPath);

        case "copy_file":
            return copyFile(args.source as string, args.destination as string, projectPath);

        case "move_file":
            return moveFile(args.source as string, args.destination as string, projectPath);

        case "create_folder":
            return createFolder(args.path as string, projectPath);

        case "delete_folder":
            return deleteFolder(args.path as string, projectPath);

        case "list_folder":
            return listFolder(args.path as string, projectPath, args.recursive as boolean);

        case "copy_folder":
            return copyFolder(args.source as string, args.destination as string, projectPath);

        case "move_folder":
            return moveFolder(args.source as string, args.destination as string, projectPath);

        case "exists":
            return exists(args.path as string, projectPath);

        case "get_info":
            return getInfo(args.path as string, projectPath);

        case "search_files":
            return searchFiles(args.pattern as string, projectPath, {
                maxDepth: args.maxDepth as number,
                includeHidden: args.includeHidden as boolean
            });

        case "get_system_info":
            return getSystemInfo();

        // Command tools
        case "run_command":
            return prepareCommand(args.command as string, projectPath);

        case "check_command_status":
            return getCommandStatus(args.commandId as string);

        case "send_command_input":
            return sendInput(args.commandId as string, args.input as string);

        case "terminate_command":
            return terminateCommand(args.commandId as string);

        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

// Export command control functions for IPC
export { approveCommand, rejectCommand, sendInput, terminateCommand, getCommandStatus };


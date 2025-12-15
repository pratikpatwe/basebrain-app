"use strict";
/**
 * Tools Index - Exports all AI tools
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCommandStatus = exports.terminateCommand = exports.sendInput = exports.rejectCommand = exports.approveCommand = exports.commandToolDefinitions = exports.toolDefinitions = exports.allToolDefinitions = void 0;
exports.executeTool = executeTool;
__exportStar(require("./filesystem"), exports);
__exportStar(require("./commands"), exports);
// Export tool executor function
const filesystem_1 = require("./filesystem");
Object.defineProperty(exports, "toolDefinitions", { enumerable: true, get: function () { return filesystem_1.toolDefinitions; } });
const commands_1 = require("./commands");
Object.defineProperty(exports, "approveCommand", { enumerable: true, get: function () { return commands_1.approveCommand; } });
Object.defineProperty(exports, "rejectCommand", { enumerable: true, get: function () { return commands_1.rejectCommand; } });
Object.defineProperty(exports, "sendInput", { enumerable: true, get: function () { return commands_1.sendInput; } });
Object.defineProperty(exports, "terminateCommand", { enumerable: true, get: function () { return commands_1.terminateCommand; } });
Object.defineProperty(exports, "getCommandStatus", { enumerable: true, get: function () { return commands_1.getCommandStatus; } });
Object.defineProperty(exports, "commandToolDefinitions", { enumerable: true, get: function () { return commands_1.commandToolDefinitions; } });
// Merge all tool definitions
exports.allToolDefinitions = [...filesystem_1.toolDefinitions, ...commands_1.commandToolDefinitions];
/**
 * Execute a tool by name with given arguments
 */
async function executeTool(toolName, args, projectPath) {
    switch (toolName) {
        case "read_file":
            return (0, filesystem_1.readFile)(args.path, projectPath);
        case "write_file":
            return (0, filesystem_1.writeFile)(args.path, args.content, projectPath);
        case "append_file":
            return (0, filesystem_1.appendFile)(args.path, args.content, projectPath);
        case "delete_file":
            return (0, filesystem_1.deleteFile)(args.path, projectPath);
        case "copy_file":
            return (0, filesystem_1.copyFile)(args.source, args.destination, projectPath);
        case "move_file":
            return (0, filesystem_1.moveFile)(args.source, args.destination, projectPath);
        case "create_folder":
            return (0, filesystem_1.createFolder)(args.path, projectPath);
        case "delete_folder":
            return (0, filesystem_1.deleteFolder)(args.path, projectPath);
        case "list_folder":
            return (0, filesystem_1.listFolder)(args.path, projectPath, args.recursive);
        case "copy_folder":
            return (0, filesystem_1.copyFolder)(args.source, args.destination, projectPath);
        case "move_folder":
            return (0, filesystem_1.moveFolder)(args.source, args.destination, projectPath);
        case "exists":
            return (0, filesystem_1.exists)(args.path, projectPath);
        case "get_info":
            return (0, filesystem_1.getInfo)(args.path, projectPath);
        case "search_files":
            return (0, filesystem_1.searchFiles)(args.pattern, projectPath, {
                maxDepth: args.maxDepth,
                includeHidden: args.includeHidden
            });
        case "get_system_info":
            return (0, filesystem_1.getSystemInfo)();
        // Command tools
        case "run_command":
            return (0, commands_1.prepareCommand)(args.command, projectPath);
        case "check_command_status":
            return (0, commands_1.getCommandStatus)(args.commandId);
        case "send_command_input":
            return (0, commands_1.sendInput)(args.commandId, args.input);
        case "terminate_command":
            return (0, commands_1.terminateCommand)(args.commandId);
        default:
            return { success: false, error: `Unknown tool: ${toolName}` };
    }
}

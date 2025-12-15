/**
 * Command Execution Tools for AI Agent
 * These tools allow the AI to run shell commands with user approval
 */

import { spawn, ChildProcess } from "child_process";
import * as os from "os";
import type { ToolResult } from "./filesystem";

// Command execution state
export interface CommandExecution {
    id: string;
    command: string;
    cwd: string;
    status: "pending" | "approved" | "rejected" | "running" | "completed" | "failed" | "terminated";
    output: string;
    exitCode: number | null;
    requiresInput: boolean;
    inputPrompt?: string;
    startTime?: number;
    endTime?: number;
    process?: ChildProcess;
}

// Store active command executions
const activeCommands: Map<string, CommandExecution> = new Map();

// Event callbacks for real-time updates
type OutputCallback = (cmdId: string, chunk: string, isError: boolean) => void;
type StatusCallback = (cmdId: string, status: CommandExecution["status"]) => void;
type InputRequiredCallback = (cmdId: string, prompt: string) => void;

let outputCallbacks: OutputCallback[] = [];
let statusCallbacks: StatusCallback[] = [];
let inputRequiredCallbacks: InputRequiredCallback[] = [];

// Register callbacks
export function onCommandOutput(callback: OutputCallback) {
    outputCallbacks.push(callback);
    return () => {
        outputCallbacks = outputCallbacks.filter(cb => cb !== callback);
    };
}

export function onCommandStatus(callback: StatusCallback) {
    statusCallbacks.push(callback);
    return () => {
        statusCallbacks = statusCallbacks.filter(cb => cb !== callback);
    };
}

export function onInputRequired(callback: InputRequiredCallback) {
    inputRequiredCallbacks.push(callback);
    return () => {
        inputRequiredCallbacks = inputRequiredCallbacks.filter(cb => cb !== callback);
    };
}

// Emit events
function emitOutput(cmdId: string, chunk: string, isError: boolean) {
    outputCallbacks.forEach(cb => cb(cmdId, chunk, isError));
}

function emitStatus(cmdId: string, status: CommandExecution["status"]) {
    statusCallbacks.forEach(cb => cb(cmdId, status));
}

function emitInputRequired(cmdId: string, prompt: string) {
    inputRequiredCallbacks.forEach(cb => cb(cmdId, prompt));
}

// Patterns that indicate the command is waiting for input
const INPUT_PATTERNS = [
    /\[y\/n\]/i,
    /\[yes\/no\]/i,
    /\(y\/n\)/i,
    /\(yes\/no\)/i,
    /press enter/i,
    /continue\?/i,
    /proceed\?/i,
    /password:/i,
    /passphrase:/i,
    /Are you sure/i,
    /Do you want to/i,
    /\? \[Y\/n\]/i,
    /\? \[n\/Y\]/i,
];

function detectInputRequired(output: string): string | null {
    const lastLines = output.split("\n").slice(-5).join("\n");
    for (const pattern of INPUT_PATTERNS) {
        if (pattern.test(lastLines)) {
            return lastLines.trim();
        }
    }
    return null;
}

/**
 * Prepare a command for execution (requires user approval)
 */
export function prepareCommand(
    command: string,
    projectPath: string
): ToolResult {
    const cmdId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const execution: CommandExecution = {
        id: cmdId,
        command,
        cwd: projectPath,
        status: "pending",
        output: "",
        exitCode: null,
        requiresInput: false,
    };

    activeCommands.set(cmdId, execution);

    return {
        success: true,
        data: {
            commandId: cmdId,
            command,
            cwd: projectPath,
            status: "pending",
            message: "Command prepared. Waiting for user approval."
        }
    };
}

/**
 * Approve a pending command (called by user)
 */
export async function approveCommand(cmdId: string): Promise<ToolResult> {
    const execution = activeCommands.get(cmdId);

    if (!execution) {
        return { success: false, error: `Command ${cmdId} not found` };
    }

    if (execution.status !== "pending") {
        return { success: false, error: `Command is not pending approval` };
    }

    execution.status = "approved";
    emitStatus(cmdId, "approved");

    // Start execution
    return executeApprovedCommand(cmdId);
}

/**
 * Reject a pending command (called by user)
 */
export function rejectCommand(cmdId: string): ToolResult {
    const execution = activeCommands.get(cmdId);

    if (!execution) {
        return { success: false, error: `Command ${cmdId} not found` };
    }

    if (execution.status !== "pending") {
        return { success: false, error: `Command is not pending approval` };
    }

    execution.status = "rejected";
    emitStatus(cmdId, "rejected");

    return {
        success: true,
        data: {
            commandId: cmdId,
            status: "rejected",
            message: "Command was rejected by user"
        }
    };
}

/**
 * Execute an approved command
 */
async function executeApprovedCommand(cmdId: string): Promise<ToolResult> {
    const execution = activeCommands.get(cmdId);

    if (!execution) {
        return { success: false, error: `Command ${cmdId} not found` };
    }

    execution.status = "running";
    execution.startTime = Date.now();
    emitStatus(cmdId, "running");

    return new Promise((resolve) => {
        const isWindows = os.platform() === "win32";
        const shell = isWindows ? "powershell.exe" : "/bin/bash";
        const shellArgs = isWindows ? ["-Command", execution.command] : ["-c", execution.command];

        const childProcess = spawn(shell, shellArgs, {
            cwd: execution.cwd,
            env: { ...process.env, FORCE_COLOR: "1" },
            stdio: ["pipe", "pipe", "pipe"],
        });

        execution.process = childProcess;

        childProcess.stdout.on("data", (data: Buffer) => {
            const chunk = data.toString();
            execution.output += chunk;
            emitOutput(cmdId, chunk, false);

            // Check if input is required
            const inputPrompt = detectInputRequired(execution.output);
            if (inputPrompt) {
                execution.requiresInput = true;
                execution.inputPrompt = inputPrompt;
                emitInputRequired(cmdId, inputPrompt);
            }
        });

        childProcess.stderr.on("data", (data: Buffer) => {
            const chunk = data.toString();
            execution.output += chunk;
            emitOutput(cmdId, chunk, true);
        });

        childProcess.on("close", (code: number | null) => {
            execution.status = code === 0 ? "completed" : "failed";
            execution.exitCode = code;
            execution.endTime = Date.now();
            execution.requiresInput = false;
            emitStatus(cmdId, execution.status);

            resolve({
                success: code === 0,
                data: {
                    commandId: cmdId,
                    command: execution.command,
                    output: execution.output,
                    exitCode: code,
                    duration: execution.endTime - (execution.startTime || 0),
                    status: execution.status
                },
                error: code !== 0 ? `Command exited with code ${code}` : undefined
            });
        });

        childProcess.on("error", (err: Error) => {
            execution.status = "failed";
            execution.endTime = Date.now();
            execution.output += `\nError: ${err.message}`;
            emitStatus(cmdId, "failed");

            resolve({
                success: false,
                error: err.message,
                data: {
                    commandId: cmdId,
                    output: execution.output,
                    status: "failed"
                }
            });
        });
    });
}

/**
 * Send input to a running command
 */
export function sendInput(cmdId: string, input: string): ToolResult {
    const execution = activeCommands.get(cmdId);

    if (!execution) {
        return { success: false, error: `Command ${cmdId} not found` };
    }

    if (execution.status !== "running" || !execution.process) {
        return { success: false, error: `Command is not running` };
    }

    execution.process.stdin?.write(input + "\n");
    execution.requiresInput = false;
    execution.inputPrompt = undefined;

    return {
        success: true,
        data: {
            commandId: cmdId,
            message: `Input sent: ${input}`
        }
    };
}

/**
 * Terminate a running command
 */
export function terminateCommand(cmdId: string): ToolResult {
    const execution = activeCommands.get(cmdId);

    if (!execution) {
        return { success: false, error: `Command ${cmdId} not found` };
    }

    if (execution.status !== "running" || !execution.process) {
        return { success: false, error: `Command is not running` };
    }

    execution.process.kill("SIGTERM");
    execution.status = "terminated";
    execution.endTime = Date.now();
    emitStatus(cmdId, "terminated");

    return {
        success: true,
        data: {
            commandId: cmdId,
            status: "terminated",
            message: "Command was terminated"
        }
    };
}

/**
 * Get command status
 */
export function getCommandStatus(cmdId: string): ToolResult {
    const execution = activeCommands.get(cmdId);

    if (!execution) {
        return { success: false, error: `Command ${cmdId} not found` };
    }

    return {
        success: true,
        data: {
            commandId: cmdId,
            command: execution.command,
            cwd: execution.cwd,
            status: execution.status,
            output: execution.output,
            exitCode: execution.exitCode,
            requiresInput: execution.requiresInput,
            inputPrompt: execution.inputPrompt,
            duration: execution.endTime && execution.startTime
                ? execution.endTime - execution.startTime
                : execution.startTime
                    ? Date.now() - execution.startTime
                    : undefined
        }
    };
}

/**
 * List all commands
 */
export function listCommands(): ToolResult {
    const commands = Array.from(activeCommands.values()).map(cmd => ({
        commandId: cmd.id,
        command: cmd.command,
        status: cmd.status,
        exitCode: cmd.exitCode,
    }));

    return {
        success: true,
        data: { commands }
    };
}

/**
 * Clean up completed commands
 */
export function cleanupCommands(): ToolResult {
    const removed: string[] = [];

    for (const [cmdId, execution] of activeCommands.entries()) {
        if (["completed", "failed", "terminated", "rejected"].includes(execution.status)) {
            activeCommands.delete(cmdId);
            removed.push(cmdId);
        }
    }

    return {
        success: true,
        data: {
            removed,
            remaining: activeCommands.size
        }
    };
}

/**
 * Tool definitions for the AI
 */
export const commandToolDefinitions = [
    {
        type: "function",
        function: {
            name: "run_command",
            description: "Execute a shell command in the project directory. The command will be shown to the user for approval before execution. Use this for running build commands, installing dependencies, starting servers, or any terminal operations. IMPORTANT: Always wait for command approval and completion before proceeding.",
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "The command to execute (e.g., 'npm install', 'npm run build', 'git status')"
                    },
                    description: {
                        type: "string",
                        description: "Brief description of what this command does and why it's needed"
                    }
                },
                required: ["command", "description"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "check_command_status",
            description: "Check the status and output of a previously started command. Use this to wait for a command to complete or to get its output.",
            parameters: {
                type: "object",
                properties: {
                    commandId: {
                        type: "string",
                        description: "The ID of the command to check"
                    }
                },
                required: ["commandId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "send_command_input",
            description: "Send input to a running command that is waiting for user input (like y/n prompts, passwords, etc.)",
            parameters: {
                type: "object",
                properties: {
                    commandId: {
                        type: "string",
                        description: "The ID of the command"
                    },
                    input: {
                        type: "string",
                        description: "The input to send (e.g., 'y', 'n', or any text)"
                    }
                },
                required: ["commandId", "input"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "terminate_command",
            description: "Stop a running command. Use this if a command is hanging or needs to be cancelled.",
            parameters: {
                type: "object",
                properties: {
                    commandId: {
                        type: "string",
                        description: "The ID of the command to terminate"
                    }
                },
                required: ["commandId"]
            }
        }
    }
];

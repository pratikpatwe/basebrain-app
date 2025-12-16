"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
    FileText,
    FolderOpen,
    FolderPlus,
    Trash2,
    Copy,
    Move,
    Search,
    Info,
    CheckCircle2,
    XCircle,
    Loader2,
    FileCode,
    FolderTree,
    Terminal,
    Check,
    X,
    Square,
    ChevronDown,
    ChevronUp
} from "lucide-react";

// Tool call type
interface ToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

interface CommandState {
    commandId: string;
    status: "pending" | "approved" | "running" | "completed" | "failed" | "terminated" | "rejected";
    output: string;
    exitCode: number | null;
    requiresInput?: boolean;
    inputPrompt?: string;
}

interface FileOpsProps {
    toolCalls?: ToolCall[];
    toolResults?: { tool_call_id: string; name: string; result: string }[];
    commandStates?: Map<string, CommandState>;
    onApproveCommand?: (commandId: string) => void;
    onRejectCommand?: (commandId: string) => void;
    onTerminateCommand?: (commandId: string) => void;
    onSendInput?: (commandId: string, input: string) => void;
}

// Get icon and color for each tool type
function getToolVisuals(toolName: string): {
    icon: React.ElementType;
    label: string;
    bgColor: string;
    iconColor: string;
} {
    switch (toolName) {
        case "read_file":
            return {
                icon: FileText,
                label: "Reading file",
                bgColor: "bg-blue-500/10",
                iconColor: "text-blue-400",
            };
        case "write_file":
            return {
                icon: FileCode,
                label: "Writing file",
                bgColor: "bg-emerald-500/10",
                iconColor: "text-emerald-400",
            };
        case "list_folder":
            return {
                icon: FolderTree,
                label: "Listing folder",
                bgColor: "bg-amber-500/10",
                iconColor: "text-amber-400",
            };
        case "create_folder":
            return {
                icon: FolderPlus,
                label: "Creating folder",
                bgColor: "bg-violet-500/10",
                iconColor: "text-violet-400",
            };
        case "delete_file":
        case "delete_folder":
            return {
                icon: Trash2,
                label: toolName === "delete_file" ? "Deleting file" : "Deleting folder",
                bgColor: "bg-red-500/10",
                iconColor: "text-red-400",
            };
        case "copy_file":
        case "copy_folder":
            return {
                icon: Copy,
                label: toolName === "copy_file" ? "Copying file" : "Copying folder",
                bgColor: "bg-cyan-500/10",
                iconColor: "text-cyan-400",
            };
        case "move_file":
        case "move_folder":
            return {
                icon: Move,
                label: toolName === "move_file" ? "Moving file" : "Moving folder",
                bgColor: "bg-orange-500/10",
                iconColor: "text-orange-400",
            };
        case "search_files":
            return {
                icon: Search,
                label: "Searching files",
                bgColor: "bg-pink-500/10",
                iconColor: "text-pink-400",
            };
        case "get_info":
        case "exists":
            return {
                icon: Info,
                label: toolName === "get_info" ? "Getting info" : "Checking path",
                bgColor: "bg-indigo-500/10",
                iconColor: "text-indigo-400",
            };
        case "run_command":
            return {
                icon: Terminal,
                label: "Running command",
                bgColor: "bg-zinc-500/10",
                iconColor: "text-zinc-400",
            };
        default:
            return {
                icon: FolderOpen,
                label: "Executing",
                bgColor: "bg-zinc-500/10",
                iconColor: "text-zinc-400",
            };
    }
}

// Format the path for display
function formatPath(args: Record<string, unknown>): string {
    if (args.path) return String(args.path);
    if (args.source && args.destination) {
        return `${args.source} → ${args.destination}`;
    }
    if (args.pattern) return `"${args.pattern}"`;
    if (args.command) return String(args.command);
    return "";
}

// Line changes display component
function LineChanges({ data }: { data: unknown }): React.ReactNode {
    if (!data || typeof data !== 'object') return null;

    const { linesAdded, linesRemoved } = data as { linesAdded?: number; linesRemoved?: number };

    const showAdded = typeof linesAdded === 'number' && linesAdded > 0;
    const showRemoved = typeof linesRemoved === 'number' && linesRemoved > 0;

    if (!showAdded && !showRemoved) return null;

    return (
        <div className="flex items-center gap-1.5">
            {showAdded && (
                <span className="text-xs font-mono font-medium text-emerald-400">
                    +{linesAdded}
                </span>
            )}
            {showRemoved && (
                <span className="text-xs font-mono font-medium text-red-400">
                    -{linesRemoved}
                </span>
            )}
        </div>
    );
}

// Inline command display component
function InlineCommand({
    toolCall,
    result,
    commandState,
    onApprove,
    onReject,
    onTerminate,
    onSendInput,
}: {
    toolCall: ToolCall;
    result?: { tool_call_id: string; name: string; result: string };
    commandState?: CommandState;
    onApprove?: () => void;
    onReject?: () => void;
    onTerminate?: () => void;
    onSendInput?: (input: string) => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputValue, setInputValue] = useState("");
    const outputRef = useRef<HTMLPreElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    let args: Record<string, unknown> = {};
    try {
        args = JSON.parse(toolCall.function.arguments);
    } catch {
        args = {};
    }

    const command = String(args.command || "");
    const description = String(args.description || "");

    // Determine status from commandState or result
    let status: CommandState["status"] = "pending";
    let output = "";
    let exitCode: number | null = null;
    let requiresInput = false;
    let inputPrompt = "";

    if (commandState) {
        status = commandState.status;
        output = commandState.output;
        exitCode = commandState.exitCode;
        requiresInput = commandState.requiresInput || false;
        inputPrompt = commandState.inputPrompt || "";
    } else if (result) {
        try {
            const parsed = JSON.parse(result.result);
            if (parsed.success) {
                status = "completed";
                output = parsed.data?.output || "";
                exitCode = parsed.data?.exitCode ?? null;
            } else if (parsed.error?.includes("rejected") || parsed.error?.includes("denied")) {
                status = "rejected";
            } else {
                status = "failed";
            }
        } catch {
            status = "pending";
        }
    }

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    const isPending = status === "pending";
    const isRunning = status === "running" || status === "approved";
    const isFinished = ["completed", "failed", "terminated", "rejected"].includes(status);

    // Get last 5 lines for preview
    const getOutputPreview = () => {
        if (!output) return "";
        const lines = output.trim().split("\n");
        return lines.slice(-5).join("\n");
    };

    return (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-800/40 overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-700/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-lg bg-zinc-700/50 flex items-center justify-center shrink-0">
                        {isPending && <Terminal className="h-4 w-4 text-zinc-400" />}
                        {isRunning && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />}
                        {status === "completed" && <Check className="h-4 w-4 text-emerald-400" />}
                        {(status === "failed" || status === "terminated") && <X className="h-4 w-4 text-red-400" />}
                        {status === "rejected" && <X className="h-4 w-4 text-zinc-500" />}
                    </div>
                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <code className="text-sm text-zinc-200 font-mono truncate">
                            {command}
                        </code>
                        {description && (
                            <span className="text-xs text-zinc-500 truncate">
                                {description}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {isRunning && onTerminate && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onTerminate(); }}
                            className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Stop"
                        >
                            <Square className="h-3 w-3 fill-current" />
                        </button>
                    )}
                    <div className="h-6 w-6 flex items-center justify-center text-zinc-600">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </div>
                </div>
            </div>

            {/* Collapsed preview */}
            {!isExpanded && output && !isPending && (
                <div className="border-t border-zinc-700/50">
                    <pre className="px-3 py-2 text-xs font-mono text-zinc-500 bg-black/20 whitespace-pre-wrap break-all leading-relaxed max-h-20 overflow-hidden">
                        {getOutputPreview()}
                    </pre>
                </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
                <>
                    {/* Pending approval */}
                    {isPending && onApprove && onReject && (
                        <div className="px-3 py-2.5 border-t border-zinc-700/50 flex items-center justify-between bg-zinc-800/50">
                            <span className="text-xs text-zinc-400">
                                Allow this command?
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onReject}
                                    className="h-7 px-3 flex items-center gap-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors cursor-pointer"
                                >
                                    <X className="h-3 w-3" />
                                    Deny
                                </button>
                                <button
                                    onClick={onApprove}
                                    className="h-7 px-3 flex items-center gap-1.5 rounded text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-900 transition-colors cursor-pointer"
                                >
                                    <Check className="h-3 w-3" />
                                    Allow
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Output */}
                    {(output || isRunning) && (
                        <pre
                            ref={outputRef}
                            className="px-3 py-2.5 text-xs font-mono text-zinc-400 bg-black/30 border-t border-zinc-700/50 max-h-48 overflow-auto scrollbar-slim whitespace-pre-wrap break-all leading-relaxed"
                        >
                            {output || (isRunning ? "Running..." : "")}
                        </pre>
                    )}

                    {/* Input required - show input field */}
                    {requiresInput && onSendInput && (
                        <div className="px-3 py-2.5 border-t border-zinc-600/50 bg-zinc-800/50">
                            <div className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
                                Input required
                            </div>
                            <form
                                className="flex items-center gap-2"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (inputValue.trim()) {
                                        onSendInput(inputValue);
                                        setInputValue("");
                                    }
                                }}
                            >
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Type your response..."
                                    className="flex-1 h-8 px-3 rounded bg-zinc-900 border border-zinc-600 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
                                    autoFocus
                                />
                                <button
                                    type="submit"
                                    disabled={!inputValue.trim()}
                                    className="h-8 px-3 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    Send
                                </button>
                            </form>
                            {/* Quick action buttons for common prompts */}
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-zinc-500">Quick:</span>
                                <button
                                    type="button"
                                    onClick={() => onSendInput("y")}
                                    className="h-6 px-2 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 transition-colors cursor-pointer"
                                >
                                    Yes (y)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onSendInput("n")}
                                    className="h-6 px-2 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 transition-colors cursor-pointer"
                                >
                                    No (n)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onSendInput("")}
                                    className="h-6 px-2 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-zinc-300 transition-colors cursor-pointer"
                                >
                                    Enter ↵
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status footer */}
                    {isFinished && (
                        <div className="px-3 py-2 border-t border-zinc-700/50 flex items-center justify-between bg-zinc-800/30">
                            <span className="text-xs text-zinc-500">
                                {status === "completed" && "Completed"}
                                {status === "failed" && `Failed (exit ${exitCode})`}
                                {status === "terminated" && "Stopped"}
                                {status === "rejected" && "Denied"}
                            </span>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export function FileOps({
    toolCalls,
    toolResults,
    commandStates,
    onApproveCommand,
    onRejectCommand,
    onTerminateCommand,
    onSendInput,
}: FileOpsProps) {
    if (!toolCalls || toolCalls.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-3">
            {toolCalls.map((toolCall) => {
                const result = toolResults?.find(r => r.tool_call_id === toolCall.id);

                // Special handling for run_command
                if (toolCall.function.name === "run_command") {
                    let commandId = "";
                    try {
                        if (result) {
                            const parsed = JSON.parse(result.result);
                            commandId = parsed.data?.commandId || "";
                        }
                    } catch {
                        // ignore
                    }

                    const commandState = commandId ? commandStates?.get(commandId) : undefined;

                    return (
                        <InlineCommand
                            key={toolCall.id}
                            toolCall={toolCall}
                            result={result}
                            commandState={commandState}
                            onApprove={commandId ? () => onApproveCommand?.(commandId) : undefined}
                            onReject={commandId ? () => onRejectCommand?.(commandId) : undefined}
                            onTerminate={commandId ? () => onTerminateCommand?.(commandId) : undefined}
                            onSendInput={commandId ? (input: string) => onSendInput?.(commandId, input) : undefined}
                        />
                    );
                }

                // Regular file operations
                let parsedResult: { success?: boolean; data?: unknown; error?: string } = {};
                try {
                    parsedResult = result ? JSON.parse(result.result) : {};
                } catch {
                    parsedResult = { error: "Failed to parse result" };
                }

                let args: Record<string, unknown> = {};
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch {
                    args = {};
                }

                const { icon: Icon, label, bgColor, iconColor } = getToolVisuals(toolCall.function.name);
                const isLoading = !result;
                const isSuccess = parsedResult.success === true;
                const isError = parsedResult.success === false;
                const pathDisplay = formatPath(args);

                return (
                    <div
                        key={toolCall.id}
                        className={`
                            group relative overflow-hidden rounded-xl border transition-all duration-300
                            bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/60
                            ${isLoading ? 'animate-pulse' : ''}
                        `}
                    >
                        <div className="relative px-4 py-3 flex items-center gap-3">
                            {/* Icon - colorful */}
                            <div className="relative">
                                <div className={`
                                    w-9 h-9 rounded-lg flex items-center justify-center
                                    ${bgColor} border border-zinc-700/50
                                `}>
                                    <Icon className={`h-4 w-4 ${iconColor}`} />
                                </div>

                                {/* Status indicator */}
                                <div className="absolute -bottom-1 -right-1">
                                    {isLoading && (
                                        <div className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center">
                                            <Loader2 className="h-3 w-3 text-zinc-400 animate-spin" />
                                        </div>
                                    )}
                                    {isSuccess && (
                                        <div className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center">
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                        </div>
                                    )}
                                    {isError && (
                                        <div className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center">
                                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content - neutral colors */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-zinc-200">
                                        {label}
                                    </span>
                                    {isLoading && (
                                        <span className="text-xs text-zinc-500">...</span>
                                    )}
                                </div>

                                {pathDisplay && (
                                    <div className="mt-0.5 flex items-center gap-1.5">
                                        <code className="text-xs text-zinc-500 font-mono truncate max-w-[280px]">
                                            {pathDisplay}
                                        </code>
                                    </div>
                                )}
                            </div>

                            {/* Line changes for file operations */}
                            {isSuccess && toolCall.function.name === "write_file" && (
                                <LineChanges data={parsedResult.data} />
                            )}

                            {/* Status text */}
                            {isSuccess && (
                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                    Done
                                </div>
                            )}
                        </div>

                        {/* Error message */}
                        {isError && parsedResult.error && (
                            <div className="px-4 py-2 bg-red-500/5 border-t border-red-500/20">
                                <p className="text-xs text-red-400 font-mono">
                                    {parsedResult.error}
                                </p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

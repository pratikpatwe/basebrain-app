"use client";

import * as React from "react";
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
    FolderTree
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

interface FileOpsProps {
    toolCalls?: ToolCall[];
    toolResults?: { tool_call_id: string; name: string; result: string }[];
}

// Get icon and color for each tool type
function getToolVisuals(toolName: string): {
    icon: React.ElementType;
    label: string;
    bgColor: string;
    iconColor: string;
    borderColor: string;
} {
    switch (toolName) {
        case "read_file":
            return {
                icon: FileText,
                label: "Reading file",
                bgColor: "bg-blue-500/10",
                iconColor: "text-blue-400",
                borderColor: "border-blue-500/20"
            };
        case "write_file":
            return {
                icon: FileCode,
                label: "Writing file",
                bgColor: "bg-emerald-500/10",
                iconColor: "text-emerald-400",
                borderColor: "border-emerald-500/20"
            };
        case "list_folder":
            return {
                icon: FolderTree,
                label: "Listing folder",
                bgColor: "bg-amber-500/10",
                iconColor: "text-amber-400",
                borderColor: "border-amber-500/20"
            };
        case "create_folder":
            return {
                icon: FolderPlus,
                label: "Creating folder",
                bgColor: "bg-violet-500/10",
                iconColor: "text-violet-400",
                borderColor: "border-violet-500/20"
            };
        case "delete_file":
        case "delete_folder":
            return {
                icon: Trash2,
                label: toolName === "delete_file" ? "Deleting file" : "Deleting folder",
                bgColor: "bg-red-500/10",
                iconColor: "text-red-400",
                borderColor: "border-red-500/20"
            };
        case "copy_file":
        case "copy_folder":
            return {
                icon: Copy,
                label: toolName === "copy_file" ? "Copying file" : "Copying folder",
                bgColor: "bg-cyan-500/10",
                iconColor: "text-cyan-400",
                borderColor: "border-cyan-500/20"
            };
        case "move_file":
        case "move_folder":
            return {
                icon: Move,
                label: toolName === "move_file" ? "Moving file" : "Moving folder",
                bgColor: "bg-orange-500/10",
                iconColor: "text-orange-400",
                borderColor: "border-orange-500/20"
            };
        case "search_files":
            return {
                icon: Search,
                label: "Searching files",
                bgColor: "bg-pink-500/10",
                iconColor: "text-pink-400",
                borderColor: "border-pink-500/20"
            };
        case "get_info":
        case "exists":
            return {
                icon: Info,
                label: toolName === "get_info" ? "Getting info" : "Checking path",
                bgColor: "bg-indigo-500/10",
                iconColor: "text-indigo-400",
                borderColor: "border-indigo-500/20"
            };
        default:
            return {
                icon: FolderOpen,
                label: "Executing",
                bgColor: "bg-zinc-500/10",
                iconColor: "text-zinc-400",
                borderColor: "border-zinc-500/20"
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
    return "";
}

// Line changes display component
function LineChanges({ data }: { data: unknown }): React.ReactNode {
    if (!data || typeof data !== 'object') return null;

    const { linesAdded, linesRemoved } = data as { linesAdded?: number; linesRemoved?: number };

    // Only show if there are actual changes (> 0)
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

export function FileOps({ toolCalls, toolResults }: FileOpsProps) {
    if (!toolCalls || toolCalls.length === 0) return null;

    return (
        <div className="flex flex-col gap-2 mb-3">
            {toolCalls.map((toolCall) => {
                const result = toolResults?.find(r => r.tool_call_id === toolCall.id);
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

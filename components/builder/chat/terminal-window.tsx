"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
    Terminal,
    Check,
    X,
    Loader2,
    ChevronDown,
    ChevronUp,
    Send,
    Square
} from "lucide-react";

// Types matching the backend
interface CommandExecution {
    commandId: string;
    command: string;
    description?: string;
    cwd: string;
    status: "pending" | "approved" | "rejected" | "running" | "completed" | "failed" | "terminated";
    output: string;
    exitCode: number | null;
    requiresInput: boolean;
    inputPrompt?: string;
    duration?: number;
}

interface TerminalWindowProps {
    commands: CommandExecution[];
    onApprove: (commandId: string) => void;
    onReject: (commandId: string) => void;
    onSendInput: (commandId: string, input: string) => void;
    onTerminate: (commandId: string) => void;
    onDismiss: (commandId: string) => void;
}

// Individual command card
export function CommandCard({
    command,
    onApprove,
    onReject,
    onSendInput,
    onTerminate,
    onDismiss,
}: {
    command: CommandExecution;
    onApprove: () => void;
    onReject: () => void;
    onSendInput: (input: string) => void;
    onTerminate: () => void;
    onDismiss: () => void;
}) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputValue, setInputValue] = useState("");
    const outputRef = useRef<HTMLPreElement>(null);

    // Auto-scroll output
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [command.output]);

    const handleSendInput = () => {
        if (inputValue.trim()) {
            onSendInput(inputValue);
            setInputValue("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendInput();
        }
    };

    const isFinished = ["completed", "failed", "terminated", "rejected"].includes(command.status);
    const isRunning = command.status === "running";
    const isPending = command.status === "pending";

    // Get last 5 lines for preview when collapsed
    const getOutputPreview = () => {
        if (!command.output) return "";
        const lines = command.output.trim().split("\n");
        const lastLines = lines.slice(-5);
        return lastLines.join("\n");
    };

    const outputPreview = getOutputPreview();
    const totalLines = command.output ? command.output.trim().split("\n").length : 0;

    return (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Status indicator */}
                    <div className="shrink-0">
                        {isPending && <Terminal className="h-4 w-4 text-zinc-400" />}
                        {isRunning && <Loader2 className="h-4 w-4 text-zinc-400 animate-spin" />}
                        {command.status === "completed" && <Check className="h-4 w-4 text-green-500" />}
                        {(command.status === "failed" || command.status === "terminated") && <X className="h-4 w-4 text-red-500" />}
                        {command.status === "rejected" && <X className="h-4 w-4 text-zinc-500" />}
                    </div>

                    {/* Command info */}
                    <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                        <code className="text-sm text-zinc-200 font-mono truncate">
                            {command.command}
                        </code>
                        {command.description && (
                            <span className="text-xs text-zinc-500 truncate">
                                {command.description}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                    {isRunning && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onTerminate(); }}
                            className="h-6 w-6 flex items-center justify-center rounded text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title="Stop"
                        >
                            <Square className="h-3 w-3 fill-current" />
                        </button>
                    )}
                    {isFinished && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                            className="h-6 w-6 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50 transition-colors cursor-pointer"
                            title="Dismiss"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <div className="h-6 w-6 flex items-center justify-center text-zinc-600">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </div>
                </div>
            </div>

            {/* Collapsed preview */}
            {!isExpanded && outputPreview && !isPending && (
                <div className="border-t border-zinc-800/50 relative">
                    <pre className="px-3 py-2 text-xs font-mono text-zinc-500 bg-black/20 whitespace-pre-wrap break-all leading-relaxed max-h-24 overflow-hidden">
                        {outputPreview}
                    </pre>
                    {totalLines > 5 && (
                        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-zinc-900 to-transparent pointer-events-none" />
                    )}
                </div>
            )}

            {/* Expanded content */}
            {isExpanded && (
                <>
                    {/* Pending approval */}
                    {isPending && (
                        <div className="px-3 py-2.5 border-t border-zinc-800/50 flex items-center justify-between bg-zinc-800/30">
                            <span className="text-xs text-zinc-400">
                                Allow this command?
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={onReject}
                                    className="h-7 px-3 flex items-center gap-1.5 rounded text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer border border-zinc-700"
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
                    {(command.output || isRunning) && (
                        <pre
                            ref={outputRef}
                            className="px-3 py-2.5 text-xs font-mono text-zinc-400 bg-black/30 border-t border-zinc-800/50 max-h-48 overflow-auto scrollbar-slim whitespace-pre-wrap break-all leading-relaxed"
                        >
                            {command.output || (isRunning ? "Running..." : "")}
                        </pre>
                    )}

                    {/* Input required */}
                    {command.requiresInput && isRunning && (
                        <div className="px-3 py-2.5 border-t border-zinc-800/50 bg-zinc-800/20">
                            {command.inputPrompt && (
                                <p className="text-xs text-zinc-500 mb-2 font-mono">
                                    {command.inputPrompt}
                                </p>
                            )}
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Enter response..."
                                    className="flex-1 h-7 bg-zinc-900 border border-zinc-700 rounded px-2 text-xs text-zinc-200 outline-none focus:border-zinc-500 transition-colors"
                                />
                                <button
                                    onClick={handleSendInput}
                                    disabled={!inputValue.trim()}
                                    className="h-7 w-7 flex items-center justify-center rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    <Send className="h-3 w-3" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Status footer */}
                    {isFinished && (
                        <div className="px-3 py-2 border-t border-zinc-800/50 flex items-center justify-between bg-zinc-800/20">
                            <span className="text-xs text-zinc-500">
                                {command.status === "completed" && "Completed"}
                                {command.status === "failed" && `Failed (exit ${command.exitCode})`}
                                {command.status === "terminated" && "Stopped"}
                                {command.status === "rejected" && "Denied"}
                            </span>
                            {command.duration !== undefined && command.duration > 0 && (
                                <span className="text-xs text-zinc-600 font-mono">
                                    {(command.duration / 1000).toFixed(1)}s
                                </span>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// Main terminal window component
export default function TerminalWindow({
    commands,
    onApprove,
    onReject,
    onSendInput,
    onTerminate,
    onDismiss,
}: TerminalWindowProps) {
    // Filter to show only active/relevant commands
    const visibleCommands = commands.filter(cmd =>
        cmd.status !== "rejected" || Date.now() - (cmd.duration || 0) < 2000
    );

    if (visibleCommands.length === 0) {
        return null;
    }

    return (
        <div className="w-full space-y-2 mb-2">
            {visibleCommands.map((cmd) => (
                <CommandCard
                    key={cmd.commandId}
                    command={cmd}
                    onApprove={() => onApprove(cmd.commandId)}
                    onReject={() => onReject(cmd.commandId)}
                    onSendInput={(input) => onSendInput(cmd.commandId, input)}
                    onTerminate={() => onTerminate(cmd.commandId)}
                    onDismiss={() => onDismiss(cmd.commandId)}
                />
            ))}
        </div>
    );
}

// Export types
export type { CommandExecution, TerminalWindowProps };

"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ChatInput from "./chat-input";
import { FileOps } from "./tools/file-ops";
import { User, ChevronDown, ChevronRight, Copy, Check, FolderOpen, Undo2 } from "lucide-react";
import { useProject } from "@/lib/project-context";

// Tool call type
interface ToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

// Command state for inline display
interface CommandState {
    commandId: string;
    status: "pending" | "running" | "completed" | "failed" | "terminated" | "rejected";
    output: string;
    exitCode: number | null;
    requiresInput?: boolean;
    inputPrompt?: string;
}

// Message type
interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    thinking?: string; // AI's reasoning process
    tool_calls?: ToolCall[];
    tool_results?: { tool_call_id: string; name: string; result: string }[];
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

// Agent loop state
type AgentState = "idle" | "thinking" | "acting" | "waiting_approval" | "waiting_command" | "observing";

// Code block component with syntax highlighting and copy button
function CodeBlock({ language, children }: { language: string; children: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-3 rounded-lg overflow-hidden">
            {/* Language badge and copy button */}
            <div className="flex justify-between items-center px-3 py-1.5 bg-zinc-800 border-b border-zinc-700">
                <span className="text-xs text-zinc-400 font-mono">{language || "code"}</span>
                <button
                    onClick={handleCopy}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded cursor-pointer"
                    title="Copy code"
                >
                    {copied ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                    ) : (
                        <Copy className="h-3.5 w-3.5" />
                    )}
                </button>
            </div>

            {/* Code with syntax highlighting */}
            <div
                className="overflow-x-auto"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#3f3f46 transparent',
                }}
            >
                <SyntaxHighlighter
                    language={language || "text"}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: "1rem",
                        borderRadius: 0,
                        fontSize: "0.8125rem",
                        backgroundColor: "#1e1e1e",
                        minWidth: "100%",
                    }}
                    wrapLongLines={false}
                    className="scrollbar-thin"
                >
                    {children}
                </SyntaxHighlighter>
            </div>
        </div>
    );
}

// Markdown components for styling
const MarkdownComponents = {
    // Code blocks
    code: ({ className, children, ...props }: React.ComponentProps<"code">) => {
        const match = /language-(\w+)/.exec(className || "");
        const isInline = !match && !String(children).includes("\n");
        const codeString = String(children).replace(/\n$/, "");

        if (isInline) {
            return (
                <code
                    className="bg-zinc-800 text-zinc-200 px-1.5 py-0.5 rounded text-sm font-mono"
                    {...props}
                >
                    {children}
                </code>
            );
        }

        return <CodeBlock language={match?.[1] || ""} children={codeString} />;
    },
    // Pre (wrapper for code blocks) - pass through for CodeBlock
    pre: ({ children, ...props }: React.ComponentProps<"pre">) => (
        <>{children}</>
    ),
    // Paragraphs
    p: ({ children, ...props }: React.ComponentProps<"p">) => (
        <p className="mb-3 last:mb-0 leading-relaxed break-words" {...props}>
            {children}
        </p>
    ),
    // Lists
    ul: ({ children, ...props }: React.ComponentProps<"ul">) => (
        <ul className="list-disc list-inside mb-3 space-y-1" {...props}>
            {children}
        </ul>
    ),
    ol: ({ children, ...props }: React.ComponentProps<"ol">) => (
        <ol className="list-decimal list-inside mb-3 space-y-1" {...props}>
            {children}
        </ol>
    ),
    li: ({ children, ...props }: React.ComponentProps<"li">) => (
        <li className="text-sm" {...props}>
            {children}
        </li>
    ),
    // Headers
    h1: ({ children, ...props }: React.ComponentProps<"h1">) => (
        <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0" {...props}>
            {children}
        </h1>
    ),
    h2: ({ children, ...props }: React.ComponentProps<"h2">) => (
        <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0" {...props}>
            {children}
        </h2>
    ),
    h3: ({ children, ...props }: React.ComponentProps<"h3">) => (
        <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0" {...props}>
            {children}
        </h3>
    ),
    // Links
    a: ({ children, ...props }: React.ComponentProps<"a">) => (
        <a
            className="text-blue-400 hover:text-blue-300 underline"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
        >
            {children}
        </a>
    ),
    // Blockquotes
    blockquote: ({ children, ...props }: React.ComponentProps<"blockquote">) => (
        <blockquote
            className="border-l-4 border-zinc-600 pl-4 my-3 text-muted-foreground italic"
            {...props}
        >
            {children}
        </blockquote>
    ),
    // Strong/Bold
    strong: ({ children, ...props }: React.ComponentProps<"strong">) => (
        <strong className="font-semibold text-foreground" {...props}>
            {children}
        </strong>
    ),
};

// Thinking dropdown component
function ThinkingDropdown({ thinking, isStreaming }: { thinking: string; isStreaming: boolean }) {
    const [isOpen, setIsOpen] = useState(isStreaming);

    // Auto-open while streaming
    useEffect(() => {
        if (isStreaming) {
            setIsOpen(true);
        }
    }, [isStreaming]);

    return (
        <div className="mb-2">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-400 transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-zinc-800/50 cursor-pointer"
            >
                {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                ) : (
                    <ChevronRight className="h-3 w-3" />
                )}
                <span>{isStreaming ? "Thinking..." : "View thinking"}</span>
            </button>

            {isOpen && (
                <div className="mt-2 pl-4 border-l-2 border-zinc-700/50">
                    <div className="text-xs text-zinc-500 whitespace-pre-wrap break-words leading-relaxed">
                        {thinking}
                    </div>
                </div>
            )}
        </div>
    );
}

export function ChatArea() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [agentState, setAgentState] = useState<AgentState>("idle");
    const [commandStates, setCommandStates] = useState<Map<string, CommandState>>(new Map());
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Track pending command that needs approval
    const pendingCommandRef = useRef<{
        commandId: string;
        toolCallId: string;
        resolve: (result: string) => void;
    } | null>(null);

    const {
        projectPath,
        projectName,
        selectFolder,
        isElectron,
        currentChatId,
        createNewChat,
        refreshChats,
    } = useProject();

    // Poll for command status updates
    const pollCommandStatus = useCallback(async (commandId: string): Promise<CommandState> => {
        console.log("[Poll] Starting poll for command:", commandId);

        return new Promise((resolve) => {
            if (!window.electronDB) {
                console.log("[Poll] No electronDB available");
                resolve({
                    commandId,
                    status: "failed",
                    output: "Electron not available",
                    exitCode: null
                });
                return;
            }

            let pollCount = 0;
            const pollInterval = setInterval(async () => {
                try {
                    pollCount++;
                    const result = await window.electronDB!.commands.getStatus(commandId);

                    console.log(`[Poll #${pollCount}] Status:`, result.data?.status, "Success:", result.success);

                    if (result.success && result.data) {
                        const status = result.data.status as CommandState["status"];
                        const requiresInput = result.data.requiresInput || false;
                        const inputPrompt = result.data.inputPrompt || "";

                        setCommandStates(prev => {
                            const next = new Map(prev);
                            next.set(commandId, {
                                commandId,
                                status,
                                output: result.data?.output || "",
                                exitCode: result.data?.exitCode ?? null,
                                requiresInput,
                                inputPrompt,
                            });
                            return next;
                        });

                        // Resolve when command is finished
                        if (["completed", "failed", "terminated", "rejected"].includes(status)) {
                            console.log("[Poll] Command finished with status:", status);
                            clearInterval(pollInterval);
                            resolve({
                                commandId,
                                status,
                                output: result.data?.output || "",
                                exitCode: result.data?.exitCode ?? null,
                            });
                        }
                    } else {
                        console.log("[Poll] No result data or not success:", result);
                    }
                } catch (error) {
                    console.error("[Poll] Error polling command status:", error);
                    clearInterval(pollInterval);
                    resolve({
                        commandId,
                        status: "failed",
                        output: String(error),
                        exitCode: null
                    });
                }
            }, 500);
        });
    }, []);

    // Handle command approval - this resumes the agent loop
    const handleApproveCommand = useCallback(async (commandId: string) => {
        if (!window.electronDB) return;

        console.log("[Agent] Command approved:", commandId);

        // Update state to show running
        setCommandStates(prev => {
            const next = new Map(prev);
            const current = next.get(commandId);
            if (current) {
                next.set(commandId, { ...current, status: "running" });
            }
            return next;
        });

        setAgentState("waiting_command");

        // Start execution and wait for completion
        window.electronDB.commands.approve(commandId);

        // Wait for command to complete
        const finalState = await pollCommandStatus(commandId);

        console.log("[Agent] Command completed:", finalState);

        // Resolve the pending promise if exists
        if (pendingCommandRef.current?.commandId === commandId) {
            const result = JSON.stringify({
                success: finalState.status === "completed",
                data: {
                    commandId,
                    status: finalState.status,
                    output: finalState.output,
                    exitCode: finalState.exitCode
                },
                error: finalState.status !== "completed" ? `Command ${finalState.status}` : undefined
            });
            pendingCommandRef.current.resolve(result);
            pendingCommandRef.current = null;
        }
    }, [pollCommandStatus]);

    // Handle command rejection
    const handleRejectCommand = useCallback(async (commandId: string) => {
        if (!window.electronDB) return;

        console.log("[Agent] Command rejected:", commandId);

        await window.electronDB.commands.reject(commandId);

        setCommandStates(prev => {
            const next = new Map(prev);
            const current = next.get(commandId);
            if (current) {
                next.set(commandId, { ...current, status: "rejected" });
            }
            return next;
        });

        // Resolve the pending promise with rejection
        if (pendingCommandRef.current?.commandId === commandId) {
            const result = JSON.stringify({
                success: false,
                data: { commandId, status: "rejected" },
                error: "Command was rejected by user"
            });
            pendingCommandRef.current.resolve(result);
            pendingCommandRef.current = null;
        }
    }, []);

    const handleTerminateCommand = useCallback(async (commandId: string) => {
        if (!window.electronDB) return;

        await window.electronDB.commands.terminate(commandId);

        setCommandStates(prev => {
            const next = new Map(prev);
            const current = next.get(commandId);
            if (current) {
                next.set(commandId, { ...current, status: "terminated" });
            }
            return next;
        });
    }, []);

    // Handle sending input to a running command
    const handleSendInput = useCallback(async (commandId: string, input: string) => {
        if (!window.electronDB) return;

        console.log("[Agent] Sending input to command:", commandId, input);

        await window.electronDB.commands.sendInput(commandId, input);

        // Clear the requiresInput flag after sending
        setCommandStates(prev => {
            const next = new Map(prev);
            const current = next.get(commandId);
            if (current) {
                next.set(commandId, { ...current, requiresInput: false, inputPrompt: "" });
            }
            return next;
        });
    }, []);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    // Load messages when chat changes
    useEffect(() => {
        const loadMessages = async () => {
            if (!currentChatId || !window.electronDB) {
                setMessages([]);
                return;
            }

            try {
                const dbMessages = await window.electronDB.messages.getByChat(currentChatId);

                // Convert DB messages to UI Message format
                const uiMessages: Message[] = dbMessages.map(msg => ({
                    id: msg.id,
                    role: msg.role as "user" | "assistant",
                    content: msg.content || "",
                    timestamp: new Date(msg.created_at),
                    thinking: msg.thinking || undefined,
                    tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls) : undefined,
                    tool_results: msg.tool_results ? JSON.parse(msg.tool_results) : undefined,
                    usage: msg.tokens_prompt || msg.tokens_completion ? {
                        prompt_tokens: msg.tokens_prompt,
                        completion_tokens: msg.tokens_completion,
                        total_tokens: msg.tokens_prompt + msg.tokens_completion,
                    } : undefined,
                }));

                setMessages(uiMessages);
            } catch (error) {
                console.error("[ChatArea] Error loading messages:", error);
                setMessages([]);
            }
        };

        loadMessages();
    }, [currentChatId]);

    // Save a message to the database - returns the database-generated ID
    const saveMessageToDB = async (message: Message, chatId: string): Promise<string | null> => {
        if (!window.electronDB) return null;

        try {
            const savedMessage = await window.electronDB.messages.save({
                chat_id: chatId,
                role: message.role,
                content: message.content || undefined,
                thinking: message.thinking,
                tool_calls: message.tool_calls,
                tool_results: message.tool_results,
                tokens_prompt: message.usage?.prompt_tokens,
                tokens_completion: message.usage?.completion_tokens,
            });
            return savedMessage.id;
        } catch (error) {
            console.error("[ChatArea] Error saving message:", error);
            return null;
        }
    };

    // Get or create a chat for the current message
    const ensureChatExists = async (): Promise<string | null> => {
        if (currentChatId) return currentChatId;

        // Create a new chat
        const newChat = await createNewChat();
        return newChat?.id || null;
    };

    // File-modifying tool names that need snapshot capture
    const FILE_MODIFYING_TOOLS = ['write_file', 'create_file', 'delete_file', 'append_file'];

    // Current message ID for snapshot association (set during tool execution)
    const currentMessageIdRef = useRef<string | null>(null);

    // Pending snapshots to save after tool execution
    const pendingSnapshotsRef = useRef<Array<{
        file_path: string;
        action: 'created' | 'modified' | 'deleted';
        content_before?: string;
    }>>([]);

    // Execute a tool via Electron IPC with snapshot capture
    const executeTool = async (toolName: string, args: Record<string, unknown>): Promise<string> => {
        console.log("[Tool Execution]", { toolName, args, projectPath });

        if (!window.electronTools || !projectPath) {
            console.error("[Tool Execution] Tools not available or no project path", {
                hasElectronTools: !!window.electronTools,
                projectPath
            });
            return JSON.stringify({ success: false, error: "Tools not available or no project selected" });
        }

        try {
            // Capture file state before modification for rollback
            if (FILE_MODIFYING_TOOLS.includes(toolName) && args.path) {
                const filePath = args.path as string;
                let contentBefore: string | null = null;
                let action: 'created' | 'modified' | 'deleted' = 'created';

                // Try to read existing file content
                try {
                    const readResult = await window.electronTools.execute('read_file', { path: filePath }, projectPath);

                    if (readResult.success && readResult.data) {
                        contentBefore = (readResult.data as { content: string }).content;
                        action = toolName === 'delete_file' ? 'deleted' : 'modified';
                    } else {
                        action = 'created';
                    }
                } catch (err) {
                    action = 'created';
                }

                // Store snapshot for later saving
                pendingSnapshotsRef.current.push({
                    file_path: filePath,
                    action,
                    content_before: contentBefore || undefined,
                });
            }

            const result = await window.electronTools.execute(toolName, args, projectPath);
            console.log("[Tool Execution] Result:", result);
            return JSON.stringify(result);
        } catch (error) {
            console.error("[Tool Execution] Error:", error);
            return JSON.stringify({ success: false, error: (error as Error).message });
        }
    };

    // Save pending snapshots to database
    const savePendingSnapshots = async (messageId: string) => {
        if (!window.electronDB || pendingSnapshotsRef.current.length === 0) return;

        try {
            await window.electronDB.snapshots.create(messageId, pendingSnapshotsRef.current);
            console.log(`[Snapshots] Saved ${pendingSnapshotsRef.current.length} snapshots for message ${messageId}`);
        } catch (error) {
            console.error("[Snapshots] Error saving:", error);
        }

        // Clear pending snapshots
        pendingSnapshotsRef.current = [];
    };

    // Handle rollback to a specific message
    const handleRollback = async (messageId: string) => {
        if (!window.electronDB || !currentChatId || !projectPath) {
            console.error("[Rollback] Cannot rollback - missing DB, chat, or project");
            return;
        }

        try {
            console.log(`[Rollback] Rolling back to message ${messageId}`);

            const result = await window.electronDB.rollback(currentChatId, messageId, projectPath);

            if (result.success) {
                console.log(`[Rollback] Success - restored ${result.restoredFiles.length} files`);

                // Reload messages from database
                const dbMessages = await window.electronDB.messages.getByChat(currentChatId);
                const uiMessages: Message[] = dbMessages.map(msg => ({
                    id: msg.id,
                    role: msg.role as "user" | "assistant",
                    content: msg.content || "",
                    timestamp: new Date(msg.created_at),
                    thinking: msg.thinking || undefined,
                    tool_calls: msg.tool_calls ? JSON.parse(msg.tool_calls) : undefined,
                    tool_results: msg.tool_results ? JSON.parse(msg.tool_results) : undefined,
                    usage: msg.tokens_prompt || msg.tokens_completion ? {
                        prompt_tokens: msg.tokens_prompt,
                        completion_tokens: msg.tokens_completion,
                        total_tokens: msg.tokens_prompt + msg.tokens_completion,
                    } : undefined,
                }));
                setMessages(uiMessages);
            } else {
                console.error("[Rollback] Failed:", result.error);
            }
        } catch (error) {
            console.error("[Rollback] Error:", error);
        }
    };

    // API message type for the agent loop
    type ApiMessage = { role: "user" | "assistant"; content: string; tool_calls?: ToolCall[] };

    // Run a single step of the agent loop
    const runAgentStep = async (
        apiMessages: ApiMessage[],
        assistantMessageId: string,
        chatId: string,
        accumulatedToolCalls: ToolCall[],
        accumulatedToolResults: { tool_call_id: string; name: string; result: string }[],
        accumulatedThinking: string,
        totalPromptTokens: number,
        totalCompletionTokens: number,
        fullContent: string,
        waitingForCommand: boolean = false
    ): Promise<{
        shouldContinue: boolean;
        apiMessages: ApiMessage[];
        accumulatedToolCalls: ToolCall[];
        accumulatedToolResults: { tool_call_id: string; name: string; result: string }[];
        accumulatedThinking: string;
        totalPromptTokens: number;
        totalCompletionTokens: number;
        fullContent: string;
    }> => {
        // Create new abort controller for this request
        abortControllerRef.current = new AbortController();

        setAgentState("thinking");

        // Prepare tool results if we have any from previous step
        const currentToolResults = accumulatedToolResults.length > 0
            ? accumulatedToolResults.slice(-1).map(r => ({ tool_call_id: r.tool_call_id, result: r.result }))
            : undefined;

        // Call the API
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: apiMessages,
                projectPath,
                toolResults: currentToolResults,
                waitingForCommand
            }),
            signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to get response");
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
            throw new Error("No response body");
        }

        let toolCalls: ToolCall[] = [];
        let hasToolCalls = false;
        let requiresApproval = false;
        let stepThinking = "";
        let stepContent = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        if (data.type === "thinking_start") {
                            // Thinking started
                        } else if (data.type === "thinking") {
                            stepThinking += data.content;
                            accumulatedThinking += data.content;
                            // Update thinking in the message
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantMessageId
                                        ? { ...msg, thinking: accumulatedThinking }
                                        : msg
                                )
                            );
                        } else if (data.type === "thinking_end") {
                            // Thinking ended
                        } else if (data.type === "content") {
                            stepContent += data.content;
                            fullContent += data.content;
                            // Update the assistant message with new content
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantMessageId
                                        ? {
                                            ...msg,
                                            content: fullContent,
                                            tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : msg.tool_calls,
                                            tool_results: accumulatedToolResults.length > 0 ? accumulatedToolResults : msg.tool_results
                                        }
                                        : msg
                                )
                            );
                        } else if (data.type === "tool_calls") {
                            toolCalls = data.tool_calls;
                            hasToolCalls = true;
                            requiresApproval = data.requiresApproval || false;

                            // Accumulate tool calls
                            accumulatedToolCalls = [...accumulatedToolCalls, ...toolCalls];

                            // Update message with accumulated tool calls
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantMessageId
                                        ? { ...msg, tool_calls: accumulatedToolCalls, tool_results: accumulatedToolResults }
                                        : msg
                                )
                            );
                        } else if (data.type === "done") {
                            hasToolCalls = data.hasToolCalls;

                            // Accumulate tokens
                            if (data.usage) {
                                totalPromptTokens += data.usage.prompt_tokens || 0;
                                totalCompletionTokens += data.usage.completion_tokens || 0;
                            }

                            // Update with accumulated usage data
                            setMessages((prev) =>
                                prev.map((msg) =>
                                    msg.id === assistantMessageId
                                        ? {
                                            ...msg,
                                            usage: {
                                                prompt_tokens: totalPromptTokens,
                                                completion_tokens: totalCompletionTokens,
                                                total_tokens: totalPromptTokens + totalCompletionTokens
                                            },
                                            tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : msg.tool_calls,
                                            tool_results: accumulatedToolResults.length > 0 ? accumulatedToolResults : msg.tool_results
                                        }
                                        : msg
                                )
                            );
                        } else if (data.type === "error") {
                            throw new Error(data.error);
                        }
                    } catch (parseError) {
                        // Skip invalid JSON lines
                    }
                }
            }
        }

        // If there are tool calls, execute them
        if (hasToolCalls && toolCalls.length > 0) {
            setAgentState("acting");

            for (const toolCall of toolCalls) {
                const args = JSON.parse(toolCall.function.arguments);

                // Special handling for run_command - STOP and wait for user approval
                if (toolCall.function.name === "run_command") {
                    console.log("[Agent] run_command detected - stopping for approval");

                    const result = await executeTool(toolCall.function.name, args);
                    const resultData = JSON.parse(result);

                    if (resultData.success && resultData.data?.commandId) {
                        const commandId = resultData.data.commandId;

                        // Add to command states for inline UI display
                        setCommandStates(prev => {
                            const next = new Map(prev);
                            next.set(commandId, {
                                commandId,
                                status: "pending",
                                output: "",
                                exitCode: null,
                            });
                            return next;
                        });

                        // Add initial tool result IMMEDIATELY so UI can get commandId for buttons
                        accumulatedToolResults = [...accumulatedToolResults, {
                            tool_call_id: toolCall.id,
                            name: toolCall.function.name,
                            result: result  // Initial result with commandId
                        }];

                        // Update message with tool results so buttons appear
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantMessageId
                                    ? { ...msg, tool_calls: accumulatedToolCalls, tool_results: accumulatedToolResults }
                                    : msg
                            )
                        );

                        setAgentState("waiting_approval");

                        // Create a promise that will be resolved when user approves/rejects
                        const commandResult = await new Promise<string>((resolve) => {
                            pendingCommandRef.current = {
                                commandId,
                                toolCallId: toolCall.id,
                                resolve
                            };
                        });

                        // Update tool result with final command output
                        accumulatedToolResults = accumulatedToolResults.map(r =>
                            r.tool_call_id === toolCall.id
                                ? { ...r, result: commandResult }
                                : r
                        );

                        // Update message with final tool results
                        setMessages((prev) =>
                            prev.map((msg) =>
                                msg.id === assistantMessageId
                                    ? { ...msg, tool_calls: accumulatedToolCalls, tool_results: accumulatedToolResults }
                                    : msg
                            )
                        );

                        // Add assistant message with tool calls to history
                        apiMessages.push({
                            role: "assistant",
                            content: stepContent,
                            tool_calls: toolCalls
                        });

                        // Continue the loop with the command result
                        return {
                            shouldContinue: true,
                            apiMessages,
                            accumulatedToolCalls,
                            accumulatedToolResults,
                            accumulatedThinking,
                            totalPromptTokens,
                            totalCompletionTokens,
                            fullContent
                        };
                    } else {
                        // Command preparation failed
                        accumulatedToolResults = [...accumulatedToolResults, {
                            tool_call_id: toolCall.id,
                            name: toolCall.function.name,
                            result
                        }];
                    }
                } else {
                    // Execute regular tool immediately
                    const result = await executeTool(toolCall.function.name, args);
                    accumulatedToolResults = [...accumulatedToolResults, {
                        tool_call_id: toolCall.id,
                        name: toolCall.function.name,
                        result
                    }];
                }
            }

            // Update message with accumulated tool data
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === assistantMessageId
                        ? { ...msg, tool_calls: accumulatedToolCalls, tool_results: accumulatedToolResults }
                        : msg
                )
            );

            // Add assistant message with tool calls to history
            apiMessages.push({
                role: "assistant",
                content: stepContent,
                tool_calls: toolCalls
            });

            setAgentState("observing");

            // Continue the loop
            return {
                shouldContinue: true,
                apiMessages,
                accumulatedToolCalls,
                accumulatedToolResults,
                accumulatedThinking,
                totalPromptTokens,
                totalCompletionTokens,
                fullContent
            };
        } else {
            // No more tool calls, we're done
            return {
                shouldContinue: false,
                apiMessages,
                accumulatedToolCalls,
                accumulatedToolResults,
                accumulatedThinking,
                totalPromptTokens,
                totalCompletionTokens,
                fullContent
            };
        }
    };

    // Handle sending a message - starts the agent loop
    const handleSendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        // Ensure we have a chat to save messages to
        const chatId = await ensureChatExists();
        if (!chatId) {
            console.error("[ChatArea] Could not create or get chat");
            return;
        }

        // Add user message
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: content.trim(),
            timestamp: new Date(),
        };

        // Save user message to database and get the database-generated ID
        const savedUserMessageId = await saveMessageToDB(userMessage, chatId);

        // Update user message with database ID (for rollback to work)
        if (savedUserMessageId) {
            userMessage.id = savedUserMessageId;
        }

        // Create assistant message placeholder for streaming
        const assistantMessageId = `assistant-${Date.now()}`;
        const assistantMessage: Message = {
            id: assistantMessageId,
            role: "assistant",
            content: "",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage, assistantMessage]);
        setIsLoading(true);
        setAgentState("thinking");

        try {
            // Prepare messages for API (include history for context)
            let apiMessages: ApiMessage[] = [...messages, userMessage].map((msg) => ({
                role: msg.role as "user" | "assistant",
                content: msg.content,
                ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
            }));

            // Initialize accumulator variables
            let accumulatedToolCalls: ToolCall[] = [];
            let accumulatedToolResults: { tool_call_id: string; name: string; result: string }[] = [];
            let accumulatedThinking = "";
            let totalPromptTokens = 0;
            let totalCompletionTokens = 0;
            let fullContent = "";

            // Run the agent loop with safeguards
            let continueLoop = true;
            let waitingForCommand = false;
            let iterationCount = 0;
            const MAX_ITERATIONS = 15; // Prevent infinite loops
            const recentActions: string[] = []; // Track recent actions for loop detection

            while (continueLoop) {
                // Check iteration limit
                iterationCount++;
                if (iterationCount > MAX_ITERATIONS) {
                    console.warn("[Agent] Max iterations reached, stopping loop");
                    setMessages(prev =>
                        prev.map(msg =>
                            msg.id === assistantMessageId
                                ? { ...msg, content: msg.content + "\n\n⚠️ Reached maximum step limit. Please continue with a new message." }
                                : msg
                        )
                    );
                    break;
                }

                const result = await runAgentStep(
                    apiMessages,
                    assistantMessageId,
                    chatId,
                    accumulatedToolCalls,
                    accumulatedToolResults,
                    accumulatedThinking,
                    totalPromptTokens,
                    totalCompletionTokens,
                    fullContent,
                    waitingForCommand
                );

                // Detect loops - if the same action is repeated 3 times, stop
                if (result.accumulatedToolCalls.length > 0) {
                    const lastAction = result.accumulatedToolCalls[result.accumulatedToolCalls.length - 1];
                    const actionKey = `${lastAction.function.name}:${lastAction.function.arguments}`;
                    recentActions.push(actionKey);

                    // Keep only last 5 actions
                    if (recentActions.length > 5) recentActions.shift();

                    // Check if same action repeated 3 times
                    const sameActionCount = recentActions.filter(a => a === actionKey).length;
                    if (sameActionCount >= 3) {
                        console.warn("[Agent] Loop detected - same action repeated 3 times:", lastAction.function.name);
                        setMessages(prev =>
                            prev.map(msg =>
                                msg.id === assistantMessageId
                                    ? { ...msg, content: msg.content + "\n\n⚠️ Detected repeated action. Stopping to prevent loop." }
                                    : msg
                            )
                        );
                        break;
                    }
                }

                continueLoop = result.shouldContinue;
                apiMessages = result.apiMessages;
                accumulatedToolCalls = result.accumulatedToolCalls;
                accumulatedToolResults = result.accumulatedToolResults;
                accumulatedThinking = result.accumulatedThinking;
                totalPromptTokens = result.totalPromptTokens;
                totalCompletionTokens = result.totalCompletionTokens;
                fullContent = result.fullContent;

                // If we just processed a command, mark that we're continuing after command
                waitingForCommand = accumulatedToolResults.some(r => r.name === "run_command");
            }

            // Save the final assistant message to database
            const finalAssistantMessage: Message = {
                id: assistantMessageId,
                role: "assistant",
                content: fullContent,
                timestamp: new Date(),
                thinking: accumulatedThinking || undefined,
                tool_calls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
                tool_results: accumulatedToolResults.length > 0 ? accumulatedToolResults : undefined,
                usage: {
                    prompt_tokens: totalPromptTokens,
                    completion_tokens: totalCompletionTokens,
                    total_tokens: totalPromptTokens + totalCompletionTokens,
                },
            };

            await saveMessageToDB(finalAssistantMessage, chatId);

            // Save file snapshots - associated with the user message (rollback point)
            if (savedUserMessageId) {
                await savePendingSnapshots(savedUserMessageId);
            }

            // Refresh chats to update title in sidebar
            await refreshChats();

        } catch (error) {
            // Check if this was an abort (user stopped generation)
            if (error instanceof Error && error.name === 'AbortError') {
                console.log("[Chat] Generation stopped by user");
                setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant") {
                        return prev.slice(0, -1).concat({
                            ...lastMsg,
                            content: lastMsg.content + "\n\n*[Generation stopped by user]*",
                        });
                    }
                    return prev;
                });
            } else {
                console.error("Chat error:", error);
                setMessages((prev) => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.role === "assistant" && !lastMsg.content) {
                        return prev.slice(0, -1).concat({
                            ...lastMsg,
                            content: `**Error:** ${error instanceof Error ? error.message : "Failed to get response"}`,
                        });
                    }
                    return prev;
                });
            }
        } finally {
            abortControllerRef.current = null;
            setIsLoading(false);
            setAgentState("idle");
        }
    };

    // Handle stopping generation
    const handleStopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Scrollable Messages Area with gradient fade edges */}
            <div className="flex-1 rounded-xl overflow-hidden min-w-0 relative">
                {/* Top gradient fade */}
                <div
                    className="absolute top-0 left-0 right-0 h-16 z-10 pointer-events-none"
                    style={{
                        background: "linear-gradient(to bottom, oklch(0.145 0 0) 0%, oklch(0.145 0 0 / 0.8) 40%, transparent 100%)"
                    }}
                />

                {/* Bottom gradient fade */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-20 z-10 pointer-events-none"
                    style={{
                        background: "linear-gradient(to top, oklch(0.145 0 0) 0%, oklch(0.145 0 0 / 0.8) 40%, transparent 100%)"
                    }}
                />

                <div
                    className="h-full overflow-y-auto scrollbar-hide"
                    style={{
                        msOverflowStyle: 'none',
                        scrollbarWidth: 'none'
                    }}
                >
                    <div className="pt-16 pb-20 px-4 w-full max-w-xl mx-auto">
                        {messages.length === 0 ? (
                            // Empty chat placeholder
                            <div className="h-full min-h-[400px] flex items-center justify-center">
                                <div className="text-center">
                                    {!projectPath ? (
                                        // No folder selected - prompt to select
                                        <>
                                            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4 rounded-2xl bg-zinc-800/60 border border-zinc-700/50">
                                                <FolderOpen className="w-8 h-8 text-zinc-500" />
                                            </div>
                                            <p className="text-zinc-400 text-sm mb-4">
                                                Select a project folder to start chatting
                                            </p>
                                            {isElectron && (
                                                <button
                                                    onClick={selectFolder}
                                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
                                                >
                                                    Select Folder
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        // Folder selected - show logo
                                        <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
                                            <img
                                                src="/logo.svg"
                                                alt="BaseBrain"
                                                className="w-full h-full object-contain"
                                                style={{ filter: "brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1639%) hue-rotate(209deg) brightness(96%) contrast(93%)" }}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Messages list - linear, not two-sided
                            <div className="flex flex-col gap-6">
                                {messages.map((message) => (
                                    <div key={message.id} className="w-full">
                                        {message.role === "user" ? (
                                            // User message - icon above, subtle dark background
                                            <div className="flex flex-col gap-2 group">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center">
                                                        <User className="h-3.5 w-3.5 text-zinc-300" />
                                                    </div>
                                                    {/* Undo button - visible on hover */}
                                                    <button
                                                        onClick={() => handleRollback(message.id)}
                                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-md hover:bg-zinc-700/50 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                                                        title="Undo changes made after this message"
                                                    >
                                                        <Undo2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                                <div className="bg-zinc-800/60 rounded-xl px-4 py-3 border border-zinc-700/50 min-w-0">
                                                    <p className="text-sm text-zinc-200 whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                                        {message.content}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            // Assistant message - icon above, no background, markdown rendered
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-5 h-5 flex items-center justify-center ${isLoading && messages[messages.length - 1]?.id === message.id ? 'animate-pulse' : ''}`}>
                                                        <img
                                                            src="/logo.svg"
                                                            alt="AI"
                                                            className="w-full h-full object-contain"
                                                            style={{ filter: "brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1639%) hue-rotate(209deg) brightness(96%) contrast(93%)" }}
                                                        />
                                                    </div>
                                                    {/* Agent state indicator */}
                                                    {isLoading && messages[messages.length - 1]?.id === message.id && agentState !== "idle" && (
                                                        <span className="text-xs text-zinc-500 uppercase tracking-wider">
                                                            {agentState === "thinking" && "Thinking..."}
                                                            {agentState === "acting" && "Executing..."}
                                                            {agentState === "waiting_approval" && "Waiting for approval"}
                                                            {agentState === "waiting_command" && "Running command..."}
                                                            {agentState === "observing" && "Observing..."}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Thinking dropdown - show if thinking exists */}
                                                {message.thinking && (
                                                    <ThinkingDropdown thinking={message.thinking} isStreaming={isLoading && messages[messages.length - 1]?.id === message.id && !message.content} />
                                                )}

                                                {/* Tool execution display */}
                                                {message.tool_calls && (
                                                    <FileOps
                                                        toolCalls={message.tool_calls}
                                                        toolResults={message.tool_results}
                                                        commandStates={commandStates}
                                                        onApproveCommand={handleApproveCommand}
                                                        onRejectCommand={handleRejectCommand}
                                                        onTerminateCommand={handleTerminateCommand}
                                                        onSendInput={handleSendInput}
                                                    />
                                                )}

                                                <div className="text-sm text-zinc-300 min-w-0 overflow-hidden" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                                    <ReactMarkdown
                                                        remarkPlugins={[remarkGfm]}
                                                        components={MarkdownComponents}
                                                    >
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </div>
                                                {/* Token usage display */}
                                                {message.usage && (
                                                    <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
                                                        <span>↑ {message.usage.prompt_tokens} tokens</span>
                                                        <span>↓ {message.usage.completion_tokens} tokens</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Scroll anchor */}
                                <div ref={scrollRef} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Input - Fixed at bottom, centered with max-width */}
            <div className="shrink-0 w-full flex flex-col items-center pb-2 px-2 min-w-0">
                <div className="w-full max-w-xl min-w-0">
                    <ChatInput
                        onSend={handleSendMessage}
                        onStop={handleStopGeneration}
                        isLoading={isLoading}
                        isDisabled={!projectPath}
                    />
                </div>
            </div>
        </div>
    );
}

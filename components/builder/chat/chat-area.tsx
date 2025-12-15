"use client";

import * as React from "react";
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import ChatInput from "./chat-input";
import { FileOps } from "./tools/file-ops";
import { User, ChevronDown, ChevronRight, Copy, Check, FolderOpen } from "lucide-react";
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
    const scrollRef = useRef<HTMLDivElement>(null);
    const { projectPath, projectName, selectFolder, isElectron } = useProject();

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading]);

    // Execute a tool via Electron IPC
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
            const result = await window.electronTools.execute(toolName, args, projectPath);
            console.log("[Tool Execution] Result:", result);
            return JSON.stringify(result);
        } catch (error) {
            console.error("[Tool Execution] Error:", error);
            return JSON.stringify({ success: false, error: (error as Error).message });
        }
    };

    // Handle sending a message with tool calling support
    const handleSendMessage = async (content: string) => {
        if (!content.trim() || isLoading) return;

        // Add user message
        const userMessage: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: content.trim(),
            timestamp: new Date(),
        };

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

        try {
            // Prepare messages for API (include history for context)
            let apiMessages = [...messages, userMessage].map((msg) => ({
                role: msg.role,
                content: msg.content,
                ...(msg.tool_calls && { tool_calls: msg.tool_calls }),
            }));

            let continueLoop = true;
            let currentToolResults: { tool_call_id: string; result: string }[] = [];
            let fullContent = "";

            // Accumulated tool data - persists across loop iterations
            let accumulatedToolCalls: ToolCall[] = [];
            let accumulatedToolResults: { tool_call_id: string; name: string; result: string }[] = [];

            // Accumulated token usage across all API calls
            let totalPromptTokens = 0;
            let totalCompletionTokens = 0;

            // Tool calling loop
            while (continueLoop) {
                // Call the API with streaming
                const response = await fetch("/api/chat", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: apiMessages,
                        projectPath,
                        toolResults: currentToolResults.length > 0 ? currentToolResults : undefined
                    }),
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
                let thinkingContent = "";

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
                                    thinkingContent += data.content;
                                    // Update thinking in the message
                                    setMessages((prev) =>
                                        prev.map((msg) =>
                                            msg.id === assistantMessageId
                                                ? { ...msg, thinking: thinkingContent }
                                                : msg
                                        )
                                    );
                                } else if (data.type === "thinking_end") {
                                    // Thinking ended
                                } else if (data.type === "content") {
                                    fullContent += data.content;
                                    // Update the assistant message with new content - preserve tool data
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

                                    // Accumulate tokens from this API call
                                    if (data.usage) {
                                        totalPromptTokens += data.usage.prompt_tokens || 0;
                                        totalCompletionTokens += data.usage.completion_tokens || 0;
                                    }

                                    // Update with accumulated usage data - preserve tool data
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

                // If there are tool calls, execute them and continue
                if (hasToolCalls && toolCalls.length > 0) {
                    const toolResults: { tool_call_id: string; name: string; result: string }[] = [];

                    for (const toolCall of toolCalls) {
                        const args = JSON.parse(toolCall.function.arguments);
                        const result = await executeTool(toolCall.function.name, args);
                        toolResults.push({
                            tool_call_id: toolCall.id,
                            name: toolCall.function.name,
                            result
                        });
                    }

                    // Accumulate tool results
                    accumulatedToolResults = [...accumulatedToolResults, ...toolResults];

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
                        content: fullContent,
                        tool_calls: toolCalls
                    });

                    // Prepare tool results for next iteration
                    currentToolResults = toolResults.map(r => ({
                        tool_call_id: r.tool_call_id,
                        result: r.result
                    }));

                    // Continue the loop
                    continueLoop = true;
                } else {
                    // No more tool calls, we're done
                    continueLoop = false;
                }
            }
        } catch (error) {
            console.error("Chat error:", error);
            // Update the assistant message with error
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
        } finally {
            setIsLoading(false);
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
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-lg bg-zinc-700 flex items-center justify-center">
                                                        <User className="h-3.5 w-3.5 text-zinc-300" />
                                                    </div>
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
            <div className="shrink-0 w-full flex justify-center pb-2 px-2 min-w-0">
                <div className="w-full max-w-xl min-w-0">
                    <ChatInput
                        onSend={handleSendMessage}
                        isLoading={isLoading}
                        isDisabled={!projectPath}
                    />
                </div>
            </div>
        </div>
    );
}

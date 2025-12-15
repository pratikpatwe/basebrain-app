import { NextRequest } from "next/server";
import Groq from "groq-sdk";

// Initialize Groq client
const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

// Message type
interface Message {
    role: "user" | "assistant" | "system" | "tool";
    content: string;
    tool_call_id?: string;
    tool_calls?: ToolCall[];
}

// Tool call type
interface ToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}

// Tool definitions for the AI
const TOOL_DEFINITIONS = [
    {
        type: "function" as const,
        function: {
            name: "read_file",
            description: "Read the contents of a file in the project",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Path to the file (relative to project root)" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
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
        }
    },
    {
        type: "function" as const,
        function: {
            name: "list_folder",
            description: "List contents of a folder in the project",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Path to the folder (use '.' for project root)" },
                    recursive: { type: "boolean", description: "Include subfolders recursively" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "create_folder",
            description: "Create a new folder in the project",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Path for the new folder" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "delete_file",
            description: "Delete a file from the project",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Path to the file to delete" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "delete_folder",
            description: "Delete a folder and all its contents",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Path to the folder to delete" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "search_files",
            description: "Search for files matching a pattern in the project",
            parameters: {
                type: "object",
                properties: {
                    pattern: { type: "string", description: "Search pattern (supports * wildcard)" },
                    maxDepth: { type: "number", description: "Maximum folder depth to search" }
                },
                required: ["pattern"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_info",
            description: "Get detailed information about a file or folder",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Path to get info for" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
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
        }
    },
    {
        type: "function" as const,
        function: {
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
        }
    }
];

// System prompt for ReAct agent with tools and thinking
const REACT_SYSTEM_PROMPT = `You are BaseBrain, an expert AI coding assistant. You are a senior software engineer with deep expertise in multiple programming languages, frameworks, and best practices.

## YOUR CAPABILITIES
You have access to file system tools to:
- Read files to understand existing code
- Write files to create or modify code
- List folders to explore project structure
- Search for files matching patterns
- Create/delete/move files and folders

## RESPONSE FORMAT
For EVERY response, you MUST use this exact format:

<THINKING>
## Understanding
What is the user asking for? What problem are they trying to solve?

## Context Analysis  
What do I know about their project? What files might be relevant?

## Planning
Step-by-step plan to accomplish the task:
1. [First action]
2. [Second action]
...

## Considerations
- Edge cases to handle
- Best practices to follow
- Potential issues to avoid
</THINKING>

<ANSWER>
[Your response to the user - be clear, helpful, and explain what you did]
</ANSWER>

## CODING STANDARDS
When writing or modifying code, you MUST:

1. **Write Production-Quality Code**
   - Use TypeScript types properly
   - Handle errors gracefully
   - Add meaningful comments for complex logic
   - Follow the existing code style in the project

2. **Be Complete**
   - Never use placeholders like "// TODO" or "// implement here"
   - Write fully functional, working code
   - Include all necessary imports
   - Handle edge cases

3. **Follow Best Practices**
   - Use descriptive variable/function names
   - Keep functions small and focused
   - Avoid code duplication
   - Use async/await properly

4. **Match Project Conventions**
   - Look at existing files to understand the style
   - Use consistent formatting
   - Follow the project's naming conventions
   - Match the existing architecture patterns

## WORKFLOW FOR CODE TASKS

1. **OBSERVE**: First, explore the project structure with list_folder
2. **UNDERSTAND**: Read relevant existing files to understand patterns
3. **PLAN**: Think through what changes are needed
4. **IMPLEMENT**: Write high-quality code
5. **VERIFY**: Explain what was changed and why

## FILE OPERATIONS GUIDELINES

- Use "." to refer to project root
- All paths are relative to the project root
- Before modifying a file, READ it first to understand context
- When creating new files, check if similar files exist for reference

## SECURITY (ENFORCED BY SYSTEM)
- CANNOT delete project root folder
- CANNOT access files outside project
- Be cautious with delete operations

## IMPORTANT REMINDERS
- Always read existing code before modifying it
- Match the existing code style exactly
- Write clean, maintainable, production-ready code
- Explain your changes clearly to the user`;

export async function POST(request: NextRequest) {
    try {
        const { messages, projectPath, toolResults } = await request.json() as {
            messages: Message[];
            projectPath?: string;
            toolResults?: { tool_call_id: string; result: string }[];
        };

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: "Messages are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!process.env.GROQ_API_KEY) {
            return new Response(
                JSON.stringify({ error: "GROQ_API_KEY is not configured" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Build messages array with system prompt that includes project path
        let systemPrompt = REACT_SYSTEM_PROMPT;

        if (projectPath) {
            // Extract folder name from path
            const folderName = projectPath.split(/[\\/]/).pop() || projectPath;
            systemPrompt += `

=== CURRENT PROJECT ===
📁 Project Name: "${folderName}"
📍 Project Path: "${projectPath}"

IMPORTANT: You are now working in this project folder. 

FIRST STEPS when starting a new task:
1. Use list_folder with path "." to see the project structure
2. Identify key files (package.json, tsconfig.json, etc.) 
3. Read relevant files to understand the codebase before making changes

REMEMBER:
- All file paths are RELATIVE to the project root
- Use "." to refer to the project root
- Example: "src/index.ts" not "${projectPath}/src/index.ts"`;
        }

        const apiMessages: Message[] = [
            { role: "system", content: systemPrompt },
            ...messages
        ];

        // If there are tool results, add them to the messages
        if (toolResults && toolResults.length > 0) {
            for (const result of toolResults) {
                apiMessages.push({
                    role: "tool",
                    tool_call_id: result.tool_call_id,
                    content: result.result
                });
            }
        }

        // Determine if we should enable tools (only if projectPath is provided)
        const enableTools = !!projectPath;

        // Call Groq API with streaming and tools
        // Using lower temperature for more consistent, focused code generation
        const stream = await groq.chat.completions.create({
            model: "moonshotai/kimi-k2-instruct-0905",
            messages: apiMessages as Groq.Chat.Completions.ChatCompletionMessageParam[],
            temperature: 0.3, // Lower temperature for more precise, consistent code
            max_tokens: 8192, // Increased for longer code responses
            stream: true,
            ...(enableTools && { tools: TOOL_DEFINITIONS }),
        });

        // Create a readable stream for the response
        const encoder = new TextEncoder();

        const readableStream = new ReadableStream({
            async start(controller) {
                let promptTokens = 0;
                let completionTokens = 0;
                let fullContent = "";
                let toolCalls: ToolCall[] = [];

                // Thinking/Answer parsing state
                let isInThinking = false;
                let isInAnswer = false;
                let thinkingContent = "";
                let answerContent = "";
                let buffer = "";

                try {
                    for await (const chunk of stream) {
                        const delta = chunk.choices[0]?.delta;

                        // Track token usage from stream
                        if (chunk.x_groq?.usage) {
                            promptTokens = chunk.x_groq.usage.prompt_tokens || 0;
                            completionTokens = chunk.x_groq.usage.completion_tokens || 0;
                        }

                        // Handle content with THINKING/ANSWER parsing
                        if (delta?.content) {
                            buffer += delta.content;
                            fullContent += delta.content;

                            // Process buffer for tags
                            while (buffer.length > 0) {
                                // Check for tag starts
                                if (!isInThinking && !isInAnswer) {
                                    const thinkingStart = buffer.indexOf("<THINKING>");
                                    const answerStart = buffer.indexOf("<ANSWER>");

                                    if (thinkingStart === 0) {
                                        isInThinking = true;
                                        buffer = buffer.slice(10); // Remove <THINKING>
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ type: "thinking_start" })}\n\n`)
                                        );
                                    } else if (answerStart === 0) {
                                        isInAnswer = true;
                                        buffer = buffer.slice(8); // Remove <ANSWER>
                                    } else if (thinkingStart > 0) {
                                        // Content before thinking tag
                                        buffer = buffer.slice(thinkingStart);
                                    } else if (answerStart > 0) {
                                        // Content before answer tag
                                        buffer = buffer.slice(answerStart);
                                    } else if (buffer.includes("<")) {
                                        // Might be start of a tag, wait for more content
                                        break;
                                    } else {
                                        // Regular content outside tags - send as content
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ type: "content", content: buffer })}\n\n`)
                                        );
                                        buffer = "";
                                    }
                                } else if (isInThinking) {
                                    const endIndex = buffer.indexOf("</THINKING>");
                                    if (endIndex >= 0) {
                                        // Send remaining thinking content
                                        const thinkingPart = buffer.slice(0, endIndex);
                                        if (thinkingPart) {
                                            thinkingContent += thinkingPart;
                                            controller.enqueue(
                                                encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: thinkingPart })}\n\n`)
                                            );
                                        }
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ type: "thinking_end" })}\n\n`)
                                        );
                                        isInThinking = false;
                                        buffer = buffer.slice(endIndex + 11); // Remove </THINKING>
                                    } else if (buffer.includes("<")) {
                                        // Might be start of closing tag, send content before it
                                        const tagStart = buffer.lastIndexOf("<");
                                        const thinkingPart = buffer.slice(0, tagStart);
                                        if (thinkingPart) {
                                            thinkingContent += thinkingPart;
                                            controller.enqueue(
                                                encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: thinkingPart })}\n\n`)
                                            );
                                        }
                                        buffer = buffer.slice(tagStart);
                                        break;
                                    } else {
                                        // Send all as thinking content
                                        thinkingContent += buffer;
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: buffer })}\n\n`)
                                        );
                                        buffer = "";
                                    }
                                } else if (isInAnswer) {
                                    const endIndex = buffer.indexOf("</ANSWER>");
                                    if (endIndex >= 0) {
                                        // Send remaining answer content
                                        const answerPart = buffer.slice(0, endIndex);
                                        if (answerPart) {
                                            answerContent += answerPart;
                                            controller.enqueue(
                                                encoder.encode(`data: ${JSON.stringify({ type: "content", content: answerPart })}\n\n`)
                                            );
                                        }
                                        isInAnswer = false;
                                        buffer = buffer.slice(endIndex + 9); // Remove </ANSWER>
                                    } else if (buffer.includes("<")) {
                                        // Might be start of closing tag
                                        const tagStart = buffer.lastIndexOf("<");
                                        const answerPart = buffer.slice(0, tagStart);
                                        if (answerPart) {
                                            answerContent += answerPart;
                                            controller.enqueue(
                                                encoder.encode(`data: ${JSON.stringify({ type: "content", content: answerPart })}\n\n`)
                                            );
                                        }
                                        buffer = buffer.slice(tagStart);
                                        break;
                                    } else {
                                        // Send all as answer content
                                        answerContent += buffer;
                                        controller.enqueue(
                                            encoder.encode(`data: ${JSON.stringify({ type: "content", content: buffer })}\n\n`)
                                        );
                                        buffer = "";
                                    }
                                } else {
                                    break;
                                }
                            }
                        }

                        // Handle tool calls
                        if (delta?.tool_calls) {
                            for (const toolCallDelta of delta.tool_calls) {
                                const index = toolCallDelta.index;

                                // Initialize or update tool call
                                if (!toolCalls[index]) {
                                    toolCalls[index] = {
                                        id: toolCallDelta.id || `tool_${index}`,
                                        type: "function",
                                        function: {
                                            name: toolCallDelta.function?.name || "",
                                            arguments: toolCallDelta.function?.arguments || ""
                                        }
                                    };
                                } else {
                                    if (toolCallDelta.function?.name) {
                                        toolCalls[index].function.name += toolCallDelta.function.name;
                                    }
                                    if (toolCallDelta.function?.arguments) {
                                        toolCalls[index].function.arguments += toolCallDelta.function.arguments;
                                    }
                                }
                            }
                        }
                    }

                    // If there are tool calls, send them
                    if (toolCalls.length > 0) {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify({
                                type: "tool_calls",
                                tool_calls: toolCalls
                            })}\n\n`)
                        );
                    }

                    // Send final done event
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({
                            type: "done",
                            usage: {
                                prompt_tokens: promptTokens,
                                completion_tokens: completionTokens,
                                total_tokens: promptTokens + completionTokens
                            },
                            hasToolCalls: toolCalls.length > 0
                        })}\n\n`)
                    );

                    controller.close();
                } catch (error) {
                    console.error("[Stream] Error:", error);
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Stream error" })}\n\n`)
                    );
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        console.error("[Chat API] Error:", error);

        return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : "Failed to get response from AI" }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

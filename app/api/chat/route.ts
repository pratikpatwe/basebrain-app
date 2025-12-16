import { NextRequest } from "next/server";

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Model to use - GLM-4.6 with native tool calling support
const MODEL = "z-ai/glm-4.6";

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

// Tool definitions for the AI - Precise definitions to prevent blank responses
const TOOL_DEFINITIONS = [
    {
        type: "function" as const,
        function: {
            name: "read_file",
            description: "Read the contents of a file at the given path. Returns the full file content as a string. Use this to understand existing code before making changes.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative path to the file from the project root. Example: 'src/index.ts' or 'package.json'"
                    }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "write_file",
            description: "Create a new file or completely replace an existing file's content. Parent directories are created automatically. IMPORTANT: Always write the COMPLETE file content - never partial updates or placeholders.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative path for the file from project root. Example: 'src/components/Button.tsx'"
                    },
                    content: {
                        type: "string",
                        description: "The complete file content to write. Must be the entire file, not a snippet."
                    }
                },
                required: ["path", "content"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "list_folder",
            description: "List all files and folders in a directory. Returns a JSON array with name, type (file/folder), and size for each entry.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative path to folder. Use '.' for project root, 'src' for src folder, etc."
                    },
                    recursive: {
                        type: "boolean",
                        description: "If true, includes all nested files/folders recursively. Default: false"
                    }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "create_folder",
            description: "Create a new folder at the specified path. Parent directories are created automatically if needed.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative path for the new folder. Example: 'src/components'"
                    }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "delete_file",
            description: "Permanently delete a file at the specified path. Use with caution - this cannot be undone.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative path to the file to delete"
                    }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "delete_folder",
            description: "Permanently delete a folder and ALL its contents recursively. Use with extreme caution.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative path to the folder to delete"
                    }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "search_files",
            description: "Search for files by name pattern using glob patterns. Examples: '*.ts' for TypeScript files, '**/*.tsx' for all TSX files recursively.",
            parameters: {
                type: "object",
                properties: {
                    pattern: {
                        type: "string",
                        description: "Glob pattern like '*.ts', '**/*.json', or 'src/**/*.tsx'"
                    },
                    maxDepth: {
                        type: "number",
                        description: "Maximum folder depth to search. Omit for unlimited depth."
                    }
                },
                required: ["pattern"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_info",
            description: "Get metadata about a file or folder including: size, created date, modified date, and type.",
            parameters: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Relative path to the file or folder"
                    }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "copy_file",
            description: "Copy a file from source to destination. Creates destination directories if needed.",
            parameters: {
                type: "object",
                properties: {
                    source: {
                        type: "string",
                        description: "Relative path to source file"
                    },
                    destination: {
                        type: "string",
                        description: "Relative path for the copy"
                    }
                },
                required: ["source", "destination"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "move_file",
            description: "Move or rename a file from source to destination path.",
            parameters: {
                type: "object",
                properties: {
                    source: {
                        type: "string",
                        description: "Current relative path of the file"
                    },
                    destination: {
                        type: "string",
                        description: "New relative path for the file"
                    }
                },
                required: ["source", "destination"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "run_command",
            description: `Execute a shell command in the project directory. CRITICAL: This tool REQUIRES user approval before execution. After calling this tool, you MUST STOP and wait. Do NOT generate any more content or call any more tools. The user must approve the command, then it will execute, and you will receive the result in a follow-up message.

Use this for: npm install, npm run dev, npm run build, git commands, etc.

MANDATORY BEHAVIOR:
1. Call this tool with the command
2. IMMEDIATELY STOP - do not continue generating
3. Wait for the observation with the command result
4. Only then continue with next steps`,
            parameters: {
                type: "object",
                properties: {
                    command: {
                        type: "string",
                        description: "Shell command to execute. Example: 'npm install lodash' or 'npm run build'"
                    },
                    description: {
                        type: "string",
                        description: "Brief one-line explanation of what this command does"
                    }
                },
                required: ["command", "description"]
            }
        }
    }
];


// System prompt for ReAct agent with strict loop behavior
const REACT_SYSTEM_PROMPT = `You are BaseBrain, a coding agent that operates in a strict THINK → ACTION → OBSERVE loop.

## AGENT LOOP PROTOCOL

You operate in discrete steps. Each response must follow this exact structure:

### Step Structure:
\`\`\`
<THINK>
Your reasoning about:
- What is the current state?
- What do I need to do next?
- Which single tool should I use?
</THINK>

[TOOL CALL - exactly ONE tool]
\`\`\`

OR when the task is COMPLETE:

\`\`\`
<THINK>
The task is complete because...
</THINK>

<DONE>
Summary of what was accomplished
</DONE>
\`\`\`

## CRITICAL RULES

1. **ONE TOOL PER RESPONSE**: Call exactly ONE tool, then STOP. Do not call multiple tools.

2. **WAIT FOR OBSERVATION**: After your tool call, STOP generating. You will receive the tool result as an observation in the next message.

3. **RUN_COMMAND IS SPECIAL**: 
   - When you call \`run_command\`, IMMEDIATELY STOP after the tool call
   - Do NOT generate any text after calling run_command
   - The user must approve the command
   - You will receive the command output in a follow-up observation
   - Only then continue to the next step

4. **NO EXPLANATIONS WITHOUT ACTIONS**: Don't explain what you "would" do - DO IT with tools.

5. **COMPLETE FILES ONLY**: When using write_file, write the ENTIRE file content as a STRING.

6. **AVOID LOOPS - CRITICAL**:
   - NEVER repeat the same action with the same arguments
   - If a tool call fails, analyze the error and try a DIFFERENT approach
   - If write_file fails, check if there's a syntax error and fix it before retrying
   - Keep track of what you've already done - don't repeat successful actions
   - If you've written to a file successfully, move to the NEXT step
   - Maximum of 15 steps per task - be efficient!

## AVAILABLE TOOLS
- read_file: Read file contents
- write_file: Create/update files (COMPLETE content only)
- list_folder: List directory contents
- create_folder: Create directories
- delete_file, delete_folder: Remove files/folders
- search_files: Find files by pattern
- get_info, copy_file, move_file: File operations
- run_command: Execute shell commands (REQUIRES USER APPROVAL - STOP AFTER CALLING)

## EXAMPLE INTERACTIONS

### Example 1: User asks to list files
<THINK>
The user wants to see the project structure. I need to list the root folder.
I will call list_folder with path ".".
</THINK>
[calls list_folder tool]
[STOPS - waits for observation]

### Example 2: Running a command
<THINK>
I need to install dependencies. I will run npm install.
This requires user approval so I must stop after calling the tool.
</THINK>
[calls run_command tool]
[STOPS IMMEDIATELY - NO MORE TEXT]

### Example 3: Task is complete
<THINK>
I have completed all the requested changes:
1. Created the component file
2. Updated the imports
3. The project builds successfully
</THINK>

<DONE>
Created Button.tsx component with hover effects and added it to the exports.
</DONE>

## WORKFLOW EXAMPLES

### Creating a new project:
1. run_command("npx create-next-app@latest . --yes", "Initialize Next.js") → STOP, wait for completion
2. list_folder(".") → STOP, wait for observation
3. read_file("package.json") → STOP, wait for observation
4. Make modifications with write_file → STOP after each
5. run_command if needed → STOP, wait for completion

### Modifying existing code:
1. list_folder(".") → understand structure
2. read_file on relevant files → understand code
3. write_file to make changes (COMPLETE files)
4. run_command for builds/tests → STOP, wait for completion

REMEMBER: You are an agent that takes ACTION. Each response = 1 action. Stop and wait for the observation before continuing.`;


export async function POST(request: NextRequest) {
    try {
        const { messages, projectPath, toolResults, waitingForCommand } = await request.json() as {
            messages: Message[];
            projectPath?: string;
            toolResults?: { tool_call_id: string; result: string }[];
            waitingForCommand?: boolean;
        };

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: "Messages are required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        if (!OPENROUTER_API_KEY) {
            return new Response(
                JSON.stringify({ error: "OPENROUTER_API_KEY is not configured" }),
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
📁 Project: "${folderName}"
📍 Path: "${projectPath}"

All file paths are RELATIVE to this project root.
Use "." to refer to the project root.`;
        }

        // If we're waiting for a command result, add context
        if (waitingForCommand) {
            systemPrompt += `

=== IMPORTANT ===
You previously called run_command and are now receiving the result.
Analyze the output and continue to the next step of your task.`;
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

        // Call OpenRouter API with streaming and tools
        // Using GLM-4.6 which has excellent tool calling support
        const openRouterResponse = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://basebrain.app",
                "X-Title": "BaseBrain",
            },
            body: JSON.stringify({
                model: MODEL,
                messages: apiMessages,
                temperature: 0.2,
                max_tokens: 8192,
                stream: true,
                ...(enableTools && { tools: TOOL_DEFINITIONS }),
            }),
        });

        if (!openRouterResponse.ok) {
            const errorText = await openRouterResponse.text();
            console.error("[Chat] OpenRouter API error:", errorText);
            return new Response(
                JSON.stringify({ error: `OpenRouter API error: ${openRouterResponse.status}` }),
                { status: openRouterResponse.status, headers: { "Content-Type": "application/json" } }
            );
        }

        const responseBody = openRouterResponse.body;
        if (!responseBody) {
            return new Response(
                JSON.stringify({ error: "No response body from OpenRouter" }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        // Create a readable stream for the response
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const readableStream = new ReadableStream({
            async start(controller) {
                let promptTokens = 0;
                let completionTokens = 0;
                let fullContent = "";
                const toolCalls: ToolCall[] = [];

                // Thinking/Done parsing state
                let isInThinking = false;
                let isInDone = false;
                let thinkingContent = "";
                let buffer = "";
                let sseBuffer = "";
                let controllerClosed = false;

                // Safe enqueue function to prevent writing to closed controller
                const safeEnqueue = (data: Uint8Array) => {
                    if (!controllerClosed) {
                        try {
                            controller.enqueue(data);
                        } catch {
                            controllerClosed = true;
                        }
                    }
                };

                const safeClose = () => {
                    if (!controllerClosed) {
                        controllerClosed = true;
                        try {
                            controller.close();
                        } catch {
                            // Already closed
                        }
                    }
                };

                try {
                    const reader = responseBody.getReader();

                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        sseBuffer += decoder.decode(value, { stream: true });
                        const lines = sseBuffer.split("\n");
                        sseBuffer = lines.pop() || ""; // Keep incomplete line in buffer

                        for (const line of lines) {
                            if (!line.startsWith("data: ")) continue;
                            const data = line.slice(6);
                            if (data === "[DONE]") continue;

                            // Parse JSON separately to isolate parse errors
                            let chunk;
                            try {
                                chunk = JSON.parse(data);
                            } catch {
                                // Skip invalid JSON chunks (incomplete data)
                                continue;
                            }

                            // Process the parsed chunk
                            try {
                                const delta = chunk.choices?.[0]?.delta;

                                // Track token usage
                                if (chunk.usage) {
                                    promptTokens = chunk.usage.prompt_tokens || 0;
                                    completionTokens = chunk.usage.completion_tokens || 0;
                                }

                                // Handle content with THINK/DONE parsing
                                if (delta?.content) {
                                    buffer += delta.content;
                                    fullContent += delta.content;

                                    // Process buffer for tags
                                    while (buffer.length > 0) {
                                        // Check for tag starts
                                        if (!isInThinking && !isInDone) {
                                            const thinkingStart = buffer.indexOf("<THINK>");
                                            const doneStart = buffer.indexOf("<DONE>");

                                            if (thinkingStart === 0) {
                                                isInThinking = true;
                                                buffer = buffer.slice(7); // Remove <THINK>
                                                safeEnqueue(
                                                    encoder.encode(`data: ${JSON.stringify({ type: "thinking_start" })}\n\n`)
                                                );
                                            } else if (doneStart === 0) {
                                                isInDone = true;
                                                buffer = buffer.slice(6); // Remove <DONE>
                                            } else if (thinkingStart > 0) {
                                                // Skip content before thinking tag
                                                buffer = buffer.slice(thinkingStart);
                                            } else if (doneStart > 0) {
                                                // Skip content before done tag
                                                buffer = buffer.slice(doneStart);
                                            } else if (buffer.includes("<")) {
                                                // Might be start of a tag, wait for more content
                                                break;
                                            } else {
                                                // Regular content outside tags - send as content
                                                safeEnqueue(
                                                    encoder.encode(`data: ${JSON.stringify({ type: "content", content: buffer })}\n\n`)
                                                );
                                                buffer = "";
                                            }
                                        } else if (isInThinking) {
                                            const endIndex = buffer.indexOf("</THINK>");
                                            if (endIndex >= 0) {
                                                // Send remaining thinking content
                                                const thinkingPart = buffer.slice(0, endIndex);
                                                if (thinkingPart) {
                                                    thinkingContent += thinkingPart;
                                                    safeEnqueue(
                                                        encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: thinkingPart })}\n\n`)
                                                    );
                                                }
                                                safeEnqueue(
                                                    encoder.encode(`data: ${JSON.stringify({ type: "thinking_end" })}\n\n`)
                                                );
                                                isInThinking = false;
                                                buffer = buffer.slice(endIndex + 8); // Remove </THINK>
                                            } else if (buffer.includes("<")) {
                                                // Might be start of closing tag
                                                const tagStart = buffer.lastIndexOf("<");
                                                const thinkingPart = buffer.slice(0, tagStart);
                                                if (thinkingPart) {
                                                    thinkingContent += thinkingPart;
                                                    safeEnqueue(
                                                        encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: thinkingPart })}\n\n`)
                                                    );
                                                }
                                                buffer = buffer.slice(tagStart);
                                                break;
                                            } else {
                                                // Send all as thinking content
                                                thinkingContent += buffer;
                                                safeEnqueue(
                                                    encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: buffer })}\n\n`)
                                                );
                                                buffer = "";
                                            }
                                        } else if (isInDone) {
                                            const endIndex = buffer.indexOf("</DONE>");
                                            if (endIndex >= 0) {
                                                // Send done content as final answer
                                                const donePart = buffer.slice(0, endIndex).trim();
                                                if (donePart) {
                                                    safeEnqueue(
                                                        encoder.encode(`data: ${JSON.stringify({ type: "content", content: donePart })}\n\n`)
                                                    );
                                                }
                                                isInDone = false;
                                                buffer = buffer.slice(endIndex + 7); // Remove </DONE>
                                            } else if (buffer.includes("<")) {
                                                // Might be start of closing tag
                                                const tagStart = buffer.lastIndexOf("<");
                                                const donePart = buffer.slice(0, tagStart).trim();
                                                if (donePart) {
                                                    safeEnqueue(
                                                        encoder.encode(`data: ${JSON.stringify({ type: "content", content: donePart })}\n\n`)
                                                    );
                                                }
                                                buffer = buffer.slice(tagStart);
                                                break;
                                            } else {
                                                // Send all as done content
                                                safeEnqueue(
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
                            } catch {
                                // Processing error (e.g., controller closed) - ignore
                            }
                        }
                    }

                    // If there are tool calls, send them
                    if (toolCalls.length > 0) {
                        // Check if any tool call is run_command - this signals need to stop
                        const hasRunCommand = toolCalls.some(tc => tc.function.name === "run_command");

                        safeEnqueue(
                            encoder.encode(`data: ${JSON.stringify({
                                type: "tool_calls",
                                tool_calls: toolCalls,
                                requiresApproval: hasRunCommand
                            })}\n\n`)
                        );
                    }

                    // Send final done event
                    safeEnqueue(
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

                    safeClose();
                } catch (error) {
                    console.error("[Stream] Error:", error);
                    safeEnqueue(
                        encoder.encode(`data: ${JSON.stringify({ type: "error", error: "Stream error" })}\n\n`)
                    );
                    safeClose();
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

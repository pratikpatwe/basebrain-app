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
            description: "Read the contents of a file. Returns the full file content as a string. Use this to understand existing code before making changes.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative path to the file, e.g., 'src/index.ts' or 'package.json'" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "write_file",
            description: "Create a new file or completely replace an existing file's content. Parent directories are created automatically. IMPORTANT: Always write the COMPLETE file content, never partial updates.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative path for the file, e.g., 'src/components/Button.tsx'" },
                    content: { type: "string", description: "The complete file content to write" }
                },
                required: ["path", "content"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "list_folder",
            description: "List all files and folders in a directory. Returns a JSON array with name, type (file/folder), and size. Use '.' to list the project root.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative path to folder. Use '.' for project root, 'src' for src folder" },
                    recursive: { type: "boolean", description: "If true, includes all nested files/folders. Default: false" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "create_folder",
            description: "Create a new folder. Parent directories are created automatically if needed.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative path for the new folder, e.g., 'src/components'" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "delete_file",
            description: "Permanently delete a file. Use with caution.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative path to the file to delete" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "delete_folder",
            description: "Permanently delete a folder and ALL its contents. Use with extreme caution.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative path to the folder to delete" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "search_files",
            description: "Search for files by name pattern. Uses glob patterns. Examples: '*.ts' (all TypeScript files), '**/*.tsx' (all TSX files recursively), 'src/**/*.css' (all CSS in src).",
            parameters: {
                type: "object",
                properties: {
                    pattern: { type: "string", description: "Glob pattern like '*.ts', '**/*.json', or 'src/**/*.tsx'" },
                    maxDepth: { type: "number", description: "Maximum folder depth to search. Omit for unlimited." }
                },
                required: ["pattern"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "get_info",
            description: "Get metadata about a file or folder: size, created date, modified date, type.",
            parameters: {
                type: "object",
                properties: {
                    path: { type: "string", description: "Relative path to the file or folder" }
                },
                required: ["path"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "copy_file",
            description: "Copy a file to a new location. Creates destination directories if needed.",
            parameters: {
                type: "object",
                properties: {
                    source: { type: "string", description: "Relative path to source file" },
                    destination: { type: "string", description: "Relative path for the copy" }
                },
                required: ["source", "destination"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "move_file",
            description: "Move or rename a file.",
            parameters: {
                type: "object",
                properties: {
                    source: { type: "string", description: "Current relative path" },
                    destination: { type: "string", description: "New relative path" }
                },
                required: ["source", "destination"]
            }
        }
    },
    {
        type: "function" as const,
        function: {
            name: "run_command",
            description: "Execute a shell command. REQUIRES USER APPROVAL before running. Use for: npm install, npm run dev, npm run build, npx create-next-app, git commands, etc. The command runs in the project directory.",
            parameters: {
                type: "object",
                properties: {
                    command: { type: "string", description: "Shell command to run, e.g., 'npm install lodash' or 'npx create-next-app@latest . --yes'" },
                    description: { type: "string", description: "One-line explanation of what this command does" }
                },
                required: ["command", "description"]
            }
        }
    }
];


// System prompt for autonomous coding agent
const REACT_SYSTEM_PROMPT = `You are BaseBrain, an AUTONOMOUS AI coding agent. You DON'T just explain - you TAKE ACTION.

## CORE IDENTITY
You are a hands-on coding assistant that EXECUTES tasks using tools. When asked to do something:
- DON'T describe what you would do → DO IT with tools
- DON'T show code in chat → WRITE IT to files
- DON'T suggest commands → RUN THEM

## AVAILABLE TOOLS
- read_file: Read file contents
- write_file: Create or update files (ALWAYS write complete file content)
- list_folder: List directory contents
- create_folder: Create directories
- delete_file, delete_folder: Remove files/folders
- search_files: Find files by pattern
- get_info, copy_file, move_file: File operations
- run_command: Execute shell commands (requires user approval)

## MANDATORY TOOL USAGE
You MUST use tools for every coding task:
❌ "I would create a file called..." → ✅ Actually CREATE it with write_file
❌ "You could run npm install..." → ✅ Actually RUN it with run_command  
❌ "Here's the code:" → ✅ WRITE the code to the actual file

## CREATING NEW PROJECTS
When asked to create a new project (Next.js, React, etc.):
1. FIRST: run_command("npx create-next-app@latest . --yes --typescript --tailwind --eslint --app --src-dir --import-alias @/*", "Initialize Next.js project")
2. WAIT for command to complete
3. list_folder(".") to see generated structure
4. read_file("package.json") to understand dependencies
5. Make requested modifications with write_file
6. Run any additional setup commands

## MODIFYING EXISTING PROJECTS  
1. FIRST: list_folder(".") to understand structure
2. read_file on relevant files to understand existing code
3. write_file to make changes (write COMPLETE file, not snippets)
4. run_command if builds/tests are needed

## WRITE COMPLETE FILES
When using write_file, you MUST:
- Write the ENTIRE file content from start to finish
- Include ALL imports at the top
- Never use "..." or "// rest of code" 
- Never truncate or abbreviate
- Write production-ready, complete code

## ERROR RECOVERY
If a tool call fails:
- Read the error message carefully
- Adjust your approach based on the error
- Try again with corrected parameters
- For command failures, analyze output and fix the issue

## RESPONSE FORMAT
<THINKING>
Quick analysis of what needs to be done
</THINKING>

<ANSWER>
Brief summary of what you did
</ANSWER>

## CODING STANDARDS
- Write TypeScript with proper types
- Include error handling
- Follow project conventions (check existing files first)
- Use modern best practices
- Complete, runnable code only

REMEMBER: You are an AGENT that ACTS. Every request should result in real file changes or command execution, not just explanations.`;


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
        // Using llama-3.3-70b for better function calling support
        const stream = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
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

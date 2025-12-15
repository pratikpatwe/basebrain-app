"use client"

import * as React from "react"
import Editor, { type Monaco, type OnMount, type OnChange } from "@monaco-editor/react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface MonacoEditorProps {
    value: string
    language: string
    onChange?: (value: string | undefined) => void
    onMount?: OnMount
    readOnly?: boolean
    className?: string
    path?: string
    theme?: "vs-dark" | "light" | "hc-black"
}

// Custom theme configuration
const defineCustomTheme = (monaco: Monaco) => {
    monaco.editor.defineTheme("basebrain-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
            // Comments
            { token: "comment", foreground: "6A9955", fontStyle: "italic" },

            // Strings
            { token: "string", foreground: "CE9178" },
            { token: "string.escape", foreground: "D7BA7D" },

            // Numbers
            { token: "number", foreground: "B5CEA8" },

            // Keywords
            { token: "keyword", foreground: "569CD6" },
            { token: "keyword.control", foreground: "C586C0" },

            // Types
            { token: "type", foreground: "4EC9B0" },
            { token: "type.identifier", foreground: "4EC9B0" },

            // Functions
            { token: "function", foreground: "DCDCAA" },
            { token: "entity.name.function", foreground: "DCDCAA" },

            // Variables
            { token: "variable", foreground: "9CDCFE" },
            { token: "variable.parameter", foreground: "9CDCFE" },

            // Operators
            { token: "operator", foreground: "D4D4D4" },

            // Brackets
            { token: "delimiter.bracket", foreground: "FFD700" },

            // JSX/TSX
            { token: "tag", foreground: "569CD6" },
            { token: "tag.attribute.name", foreground: "9CDCFE" },

            // Constants
            { token: "constant", foreground: "4FC1FF" },
        ],
        colors: {
            // Editor background
            "editor.background": "#0D0D0D",
            "editor.foreground": "#D4D4D4",

            // Line numbers
            "editorLineNumber.foreground": "#5A5A5A",
            "editorLineNumber.activeForeground": "#C6C6C6",

            // Cursor and selection
            "editor.lineHighlightBackground": "#1A1A1A",
            "editor.selectionBackground": "#264F78",
            "editor.inactiveSelectionBackground": "#3A3D41",
            "editorCursor.foreground": "#AEAFAD",

            // Find/Search highlighting
            "editor.findMatchBackground": "#515C6A",
            "editor.findMatchHighlightBackground": "#EA5C0055",

            // Brackets
            "editorBracketMatch.background": "#0D3A58",
            "editorBracketMatch.border": "#888888",

            // Editor widgets
            "editorWidget.background": "#1E1E1E",
            "editorSuggestWidget.background": "#1E1E1E",
            "editorSuggestWidget.border": "#454545",
            "editorSuggestWidget.selectedBackground": "#094771",

            // Scrollbar
            "scrollbarSlider.background": "#79797966",
            "scrollbarSlider.hoverBackground": "#646464B3",
            "scrollbarSlider.activeBackground": "#BFBFBF66",

            // Minimap
            "minimap.background": "#0D0D0D",
            "minimap.selectionHighlight": "#264F78",

            // Gutter
            "editorGutter.background": "#0D0D0D",
            "editorGutter.addedBackground": "#587C0C",
            "editorGutter.modifiedBackground": "#0C7D9D",
            "editorGutter.deletedBackground": "#94151B",

            // Indent guides
            "editorIndentGuide.background": "#404040",
            "editorIndentGuide.activeBackground": "#707070",

            // Whitespace
            "editorWhitespace.foreground": "#3B3B3B",
        },
    })
}

// Default editor options
const defaultOptions: React.ComponentProps<typeof Editor>["options"] = {
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
    fontLigatures: true,
    lineHeight: 20,
    letterSpacing: 0.3,

    // Layout
    padding: { top: 12, bottom: 12 },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth",
    cursorSmoothCaretAnimation: "on",

    // Minimap
    minimap: {
        enabled: true,
        maxColumn: 80,
        renderCharacters: false,
        scale: 1,
        showSlider: "mouseover",
    },

    // Line numbers and gutter
    lineNumbers: "on",
    lineNumbersMinChars: 4,
    glyphMargin: false,
    folding: true,
    foldingHighlight: true,
    foldingStrategy: "indentation",
    showFoldingControls: "mouseover",

    // Scrollbar
    scrollbar: {
        vertical: "visible",
        horizontal: "visible",
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
        useShadows: false,
    },

    // Editor behavior
    wordWrap: "off",
    tabSize: 2,
    insertSpaces: true,
    autoIndent: "full",
    formatOnPaste: true,
    formatOnType: true,

    // IntelliSense
    quickSuggestions: {
        other: true,
        comments: false,
        strings: true,
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    parameterHints: {
        enabled: true,
        cycle: true,
    },

    // Bracket matching
    bracketPairColorization: {
        enabled: true,
        independentColorPoolPerBracketType: true,
    },
    guides: {
        bracketPairs: true,
        bracketPairsHorizontal: true,
        highlightActiveBracketPair: true,
        indentation: true,
        highlightActiveIndentation: true,
    },

    // Visual
    renderLineHighlight: "line",
    renderWhitespace: "selection",
    roundedSelection: true,

    // Accessibility
    accessibilitySupport: "auto",
}

// Loading component
function EditorLoader() {
    return (
        <div className="flex items-center justify-center h-full bg-[#0D0D0D]">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="size-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Loading editor...</span>
            </div>
        </div>
    )
}

export function MonacoEditor({
    value,
    language,
    onChange,
    onMount,
    readOnly = false,
    className,
    path,
    theme = "vs-dark",
}: MonacoEditorProps) {
    const handleEditorDidMount: OnMount = (editor, monaco) => {
        // Define custom theme
        defineCustomTheme(monaco)
        monaco.editor.setTheme("basebrain-dark")

        // Configure TypeScript/JavaScript - Disable strict validation
        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true, // Disable semantic errors (type errors, etc.)
            noSyntaxValidation: false,  // Keep syntax errors only
            noSuggestionDiagnostics: true,
        })

        monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: true,
            noSyntaxValidation: false,
            noSuggestionDiagnostics: true,
        })

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            jsx: monaco.languages.typescript.JsxEmit.React,
            allowNonTsExtensions: true,
            allowJs: true,
            checkJs: false,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: false,
            noImplicitAny: false,
            strictNullChecks: false,
        })

        monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowJs: true,
            checkJs: false,
        })

        // Add keyboard shortcuts
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            // Save functionality - can be connected to parent component
            console.log("Save triggered")
        })

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
            // Format document
            editor.getAction("editor.action.formatDocument")?.run()
        })

        // Focus the editor
        editor.focus()

        // Call the parent's onMount if provided
        onMount?.(editor, monaco)
    }

    const handleChange: OnChange = (value) => {
        onChange?.(value)
    }

    return (
        <div className={cn("h-full w-full", className)}>
            <Editor
                height="100%"
                width="100%"
                language={language}
                value={value}
                path={path}
                theme="vs-dark"
                loading={<EditorLoader />}
                options={{
                    ...defaultOptions,
                    readOnly,
                }}
                onChange={handleChange}
                onMount={handleEditorDidMount}
            />
        </div>
    )
}

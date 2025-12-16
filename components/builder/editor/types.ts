// File and folder types for the code editor

export interface FileNode {
    id: string
    name: string
    type: "file"
    path: string
    extension?: string
    content?: string
    language?: string
}

export interface FolderNode {
    id: string
    name: string
    type: "folder"
    path: string
    children: (FileNode | FolderNode)[]
    isExpanded?: boolean
}

export type FileSystemNode = FileNode | FolderNode

export interface OpenFile {
    id: string
    name: string
    path: string
    content: string
    language: string
    isDirty?: boolean
    isPreview?: boolean  // If true, this is a preview tab (iframe)
    previewUrl?: string  // URL to show in iframe (e.g., http://localhost:3000)
}

export interface EditorState {
    files: FileSystemNode[]
    openFiles: OpenFile[]
    activeFileId: string | null
}

// Language detection mapping
export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
    // JavaScript & TypeScript
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    mjs: "javascript",
    cjs: "javascript",

    // Web
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    sass: "sass",
    less: "less",

    // Data & Config
    json: "json",
    jsonc: "jsonc",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    ini: "ini",
    env: "plaintext",

    // Backend
    py: "python",
    rb: "ruby",
    php: "php",
    java: "java",
    kt: "kotlin",
    go: "go",
    rs: "rust",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    swift: "swift",

    // Shell & Scripts
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    ps1: "powershell",
    bat: "bat",
    cmd: "bat",

    // Documentation
    md: "markdown",
    mdx: "markdown",
    txt: "plaintext",
    rst: "plaintext",

    // Database
    sql: "sql",
    graphql: "graphql",
    gql: "graphql",
    prisma: "prisma",

    // Docker & DevOps
    dockerfile: "dockerfile",
    dockerignore: "plaintext",

    // Other
    vue: "vue",
    svelte: "svelte",
    lua: "lua",
    r: "r",
    dart: "dart",
}

// File icons mapping
export const FILE_ICONS: Record<string, string> = {
    // Folders
    folder: "📁",
    folderOpen: "📂",

    // JavaScript & TypeScript
    js: "🟨",
    jsx: "⚛️",
    ts: "🔷",
    tsx: "⚛️",

    // Web
    html: "🌐",
    css: "🎨",
    scss: "🎨",

    // Data & Config
    json: "📋",
    yaml: "⚙️",
    yml: "⚙️",
    xml: "📄",
    env: "🔐",

    // Backend
    py: "🐍",
    rb: "💎",
    php: "🐘",
    java: "☕",
    go: "🐹",
    rs: "🦀",

    // Shell
    sh: "💲",
    bash: "💲",

    // Documentation
    md: "📝",
    txt: "📄",

    // Default
    default: "📄",
}

// Code Editor Components
// Main components for building a VS Code-like code editor experience

export { CodeEditor } from "./CodeEditor"
export { FileExplorer } from "./FileExplorer"
export { EditorTabs } from "./EditorTabs"
export { EditorBreadcrumb } from "./EditorBreadcrumb"
export { MonacoEditor } from "./MonacoEditor"

// Types
export type {
    FileNode,
    FolderNode,
    FileSystemNode,
    OpenFile,
    EditorState,
} from "./types"

// Utilities
export {
    getFileExtension,
    getLanguageFromExtension,
    getLanguageFromFilename,
    getFileIcon,
    generateId,
    getPathSegments,
    sortFileSystemNodes,
    findNodeByPath,
    isFileNode,
    isFolderNode,
    createDemoFileTree,
} from "./utils"

// Constants
export {
    EXTENSION_TO_LANGUAGE,
    FILE_ICONS,
} from "./types"

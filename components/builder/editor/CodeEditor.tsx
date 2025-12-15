"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Code2, FileWarning } from "lucide-react"
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable"
import { FileExplorer } from "./FileExplorer"
import { EditorTabs } from "./EditorTabs"
import { EditorBreadcrumb } from "./EditorBreadcrumb"
import { MonacoEditor } from "./MonacoEditor"
import {
    type FileSystemNode,
    type FileNode,
    type FolderNode,
    type OpenFile
} from "./types"
import {
    createDemoFileTree,
    generateId,
    getLanguageFromFilename,
    isFileNode
} from "./utils"

interface CodeEditorProps {
    initialFiles?: FileSystemNode[]
    className?: string
}

// Empty state component when no file is open
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0D0D0D] text-muted-foreground">
        </div>
    )
}

// File not found state
function FileNotFound({ path }: { path: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-full bg-[#0D0D0D] text-muted-foreground">
            <div className="flex flex-col items-center gap-4 max-w-md text-center">
                <div className="p-4 rounded-full bg-destructive/10">
                    <FileWarning className="size-12 text-destructive/50" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-lg font-medium text-foreground">File not found</h3>
                    <p className="text-sm text-muted-foreground">
                        The file <code className="px-1.5 py-0.5 bg-muted/20 rounded text-xs">{path}</code> could not be found.
                    </p>
                </div>
            </div>
        </div>
    )
}

export function CodeEditor({ initialFiles, className }: CodeEditorProps) {
    // File system state
    const [files, setFiles] = React.useState<FileSystemNode[]>(
        initialFiles || createDemoFileTree()
    )

    // Open files and active file state
    const [openFiles, setOpenFiles] = React.useState<OpenFile[]>([])
    const [activeFileId, setActiveFileId] = React.useState<string | null>(null)

    // Get the currently active file
    const activeFile = React.useMemo(() => {
        return openFiles.find((f) => f.id === activeFileId) || null
    }, [openFiles, activeFileId])

    // Toggle folder expand/collapse
    const handleToggleFolder = React.useCallback((folderId: string) => {
        const toggleFolder = (nodes: FileSystemNode[]): FileSystemNode[] => {
            return nodes.map((node) => {
                if (node.id === folderId && node.type === "folder") {
                    return { ...node, isExpanded: !node.isExpanded }
                }
                if (node.type === "folder" && node.children) {
                    return { ...node, children: toggleFolder(node.children) }
                }
                return node
            })
        }
        setFiles((prev) => toggleFolder(prev))
    }, [])

    // Open a file
    const handleFileSelect = React.useCallback((file: FileNode) => {
        // Check if file is already open
        const existingFile = openFiles.find((f) => f.path === file.path)

        if (existingFile) {
            // Just activate the existing tab
            setActiveFileId(existingFile.id)
            return
        }

        // Create new open file entry
        const newOpenFile: OpenFile = {
            id: generateId(),
            name: file.name,
            path: file.path,
            content: file.content || "",
            language: file.language || getLanguageFromFilename(file.name),
            isDirty: false,
        }

        setOpenFiles((prev) => [...prev, newOpenFile])
        setActiveFileId(newOpenFile.id)
    }, [openFiles])

    // Select an open file tab
    const handleSelectTab = React.useCallback((fileId: string) => {
        setActiveFileId(fileId)
    }, [])

    // Close a file tab
    const handleCloseFile = React.useCallback((fileId: string) => {
        setOpenFiles((prev) => {
            const newFiles = prev.filter((f) => f.id !== fileId)

            // If we're closing the active file, activate another one
            if (activeFileId === fileId) {
                const closedIndex = prev.findIndex((f) => f.id === fileId)
                const newActiveIndex = Math.min(closedIndex, newFiles.length - 1)
                const newActiveFile = newFiles[newActiveIndex]
                setActiveFileId(newActiveFile?.id || null)
            }

            return newFiles
        })
    }, [activeFileId])

    // Close other files
    const handleCloseOtherFiles = React.useCallback((fileId: string) => {
        setOpenFiles((prev) => prev.filter((f) => f.id === fileId))
        setActiveFileId(fileId)
    }, [])

    // Close all files
    const handleCloseAllFiles = React.useCallback(() => {
        setOpenFiles([])
        setActiveFileId(null)
    }, [])

    // Close files to the right
    const handleCloseFilesToRight = React.useCallback((fileId: string) => {
        setOpenFiles((prev) => {
            const index = prev.findIndex((f) => f.id === fileId)
            return prev.slice(0, index + 1)
        })
    }, [])

    // Handle content change
    const handleContentChange = React.useCallback((value: string | undefined) => {
        if (value === undefined || !activeFileId) return

        setOpenFiles((prev) =>
            prev.map((file) =>
                file.id === activeFileId
                    ? { ...file, content: value, isDirty: true }
                    : file
            )
        )
    }, [activeFileId])

    // Handle breadcrumb navigation
    const handleBreadcrumbNavigate = React.useCallback((path: string) => {
        // Find the folder and expand it in the tree
        const expandPath = (nodes: FileSystemNode[], targetPath: string): FileSystemNode[] => {
            return nodes.map((node) => {
                if (node.type === "folder") {
                    // Check if this folder is part of the target path
                    if (targetPath.startsWith(node.path)) {
                        return {
                            ...node,
                            isExpanded: true,
                            children: expandPath(node.children, targetPath),
                        }
                    }
                    return { ...node, children: expandPath(node.children, targetPath) }
                }
                return node
            })
        }

        setFiles((prev) => expandPath(prev, path))
    }, [])

    // New file handler
    const handleNewFile = React.useCallback((parentPath: string) => {
        // In a real implementation, this would show a dialog to create a new file
        console.log("Create new file in:", parentPath)
    }, [])

    // New folder handler
    const handleNewFolder = React.useCallback((parentPath: string) => {
        // In a real implementation, this would show a dialog to create a new folder
        console.log("Create new folder in:", parentPath)
    }, [])

    // Delete node handler
    const handleDeleteNode = React.useCallback((path: string) => {
        // In a real implementation, this would delete the file/folder
        console.log("Delete:", path)
    }, [])

    // Refresh handler
    const handleRefresh = React.useCallback(() => {
        // In a real implementation, this would refresh the file tree from disk
        console.log("Refresh file tree")
    }, [])

    return (
        <div className={cn("h-full w-full bg-background", className)}>
            <ResizablePanelGroup direction="horizontal" className="h-full">
                {/* File Explorer Panel */}
                <ResizablePanel
                    defaultSize={20}
                    minSize={15}
                    maxSize={35}
                    className="bg-muted/5"
                >
                    <FileExplorer
                        files={files}
                        onFileSelect={handleFileSelect}
                        onToggleFolder={handleToggleFolder}
                        selectedFilePath={activeFile?.path}
                        onRefresh={handleRefresh}
                        onNewFile={handleNewFile}
                        onNewFolder={handleNewFolder}
                        onDeleteNode={handleDeleteNode}
                    />
                </ResizablePanel>

                {/* Resize Handle */}
                <ResizableHandle className="w-[1px] bg-border/50 hover:bg-primary/50 transition-colors" />

                {/* Editor Panel */}
                <ResizablePanel defaultSize={80} minSize={50}>
                    <div className="flex flex-col h-full">
                        {/* Editor Tabs */}
                        <EditorTabs
                            openFiles={openFiles}
                            activeFileId={activeFileId}
                            onSelectFile={handleSelectTab}
                            onCloseFile={handleCloseFile}
                            onCloseOtherFiles={handleCloseOtherFiles}
                            onCloseAllFiles={handleCloseAllFiles}
                            onCloseFilesToRight={handleCloseFilesToRight}
                        />

                        {/* Breadcrumb */}
                        <EditorBreadcrumb
                            filePath={activeFile?.path || null}
                            onNavigate={handleBreadcrumbNavigate}
                        />

                        {/* Monaco Editor */}
                        <div className="flex-1 min-h-0">
                            {activeFile ? (
                                <MonacoEditor
                                    value={activeFile.content}
                                    language={activeFile.language}
                                    path={activeFile.path}
                                    onChange={handleContentChange}
                                />
                            ) : (
                                <EmptyState />
                            )}
                        </div>
                    </div>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}

"use client"

import * as React from "react"
import { ChevronRight, ChevronDown, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { type FileSystemNode, type FileNode, type FolderNode } from "./types"
import { getFileExtension, sortFileSystemNodes } from "./utils"

// File type icons with colors
const FILE_TYPE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
    ts: { icon: <File className="size-3.5" />, color: "text-blue-400" },
    tsx: { icon: <File className="size-3.5" />, color: "text-blue-400" },
    js: { icon: <File className="size-3.5" />, color: "text-yellow-400" },
    jsx: { icon: <File className="size-3.5" />, color: "text-yellow-400" },
    json: { icon: <File className="size-3.5" />, color: "text-yellow-500" },
    css: { icon: <File className="size-3.5" />, color: "text-blue-500" },
    scss: { icon: <File className="size-3.5" />, color: "text-pink-400" },
    html: { icon: <File className="size-3.5" />, color: "text-orange-500" },
    md: { icon: <File className="size-3.5" />, color: "text-slate-400" },
    py: { icon: <File className="size-3.5" />, color: "text-green-400" },
    go: { icon: <File className="size-3.5" />, color: "text-cyan-400" },
    rs: { icon: <File className="size-3.5" />, color: "text-orange-400" },
    default: { icon: <File className="size-3.5" />, color: "text-muted-foreground" },
}

function getFileTypeIcon(extension: string): { icon: React.ReactNode; color: string } {
    return FILE_TYPE_ICONS[extension.toLowerCase()] || FILE_TYPE_ICONS.default
}

interface FileExplorerProps {
    files: FileSystemNode[]
    onFileSelect: (file: FileNode) => void
    onToggleFolder: (folderId: string) => void
    selectedFilePath?: string | null
    onRefresh?: () => void
    onNewFile?: (parentPath: string) => void
    onNewFolder?: (parentPath: string) => void
    onDeleteNode?: (path: string) => void
    onRenameNode?: (path: string, newName: string) => void
    className?: string
}

// Single file/folder item component
interface FileTreeItemProps {
    node: FileSystemNode
    depth: number
    onFileSelect: (file: FileNode) => void
    onToggleFolder: (folderId: string) => void
    selectedFilePath?: string | null
    onNewFile?: (parentPath: string) => void
    onNewFolder?: (parentPath: string) => void
    onDeleteNode?: (path: string) => void
    onRenameNode?: (path: string, newName: string) => void
}

function FileTreeItem({
    node,
    depth,
    onFileSelect,
    onToggleFolder,
    selectedFilePath,
    onNewFile,
    onNewFolder,
    onDeleteNode,
}: FileTreeItemProps) {
    const isFolder = node.type === "folder"
    const isExpanded = isFolder && (node as FolderNode).isExpanded
    const isSelected = selectedFilePath === node.path
    const extension = !isFolder ? getFileExtension(node.name) : ""
    const fileTypeInfo = !isFolder ? getFileTypeIcon(extension) : null

    const handleClick = () => {
        if (isFolder) {
            onToggleFolder(node.id)
        } else {
            onFileSelect(node as FileNode)
        }
    }

    const itemContent = (
        <div
            className={cn(
                "group flex items-center gap-1 py-1 px-2 cursor-pointer rounded-sm transition-colors",
                "mx-1",

                isSelected && "bg-accent text-accent-foreground"
            )}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={handleClick}
        >
            {/* Expand/collapse icon for folders */}
            {isFolder ? (
                <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {isExpanded ? (
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="size-3.5 text-muted-foreground" />
                    )}
                </span>
            ) : (
                <span className="w-4" />
            )}

            {/* Icon */}
            <span className={cn("flex-shrink-0 w-4 h-4 flex items-center justify-center", fileTypeInfo?.color)}>
                {isFolder ? (
                    isExpanded ? (
                        <FolderOpen className="size-4 text-amber-400" />
                    ) : (
                        <Folder className="size-4 text-amber-400" />
                    )
                ) : (
                    fileTypeInfo?.icon
                )}
            </span>

            {/* Name */}
            <span className="truncate text-sm select-none">{node.name}</span>
        </div>
    )

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {isFolder ? (
                    <Collapsible open={isExpanded}>
                        <CollapsibleTrigger asChild>
                            {itemContent}
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            {sortFileSystemNodes((node as FolderNode).children).map((child) => (
                                <FileTreeItem
                                    key={child.id}
                                    node={child}
                                    depth={depth + 1}
                                    onFileSelect={onFileSelect}
                                    onToggleFolder={onToggleFolder}
                                    selectedFilePath={selectedFilePath}
                                    onNewFile={onNewFile}
                                    onNewFolder={onNewFolder}
                                    onDeleteNode={onDeleteNode}
                                />
                            ))}
                        </CollapsibleContent>
                    </Collapsible>
                ) : (
                    itemContent
                )}
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                {isFolder && (
                    <>
                        <ContextMenuItem onClick={() => onNewFile?.(node.path)}>
                            <File className="size-4 mr-2" />
                            New File
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => onNewFolder?.(node.path)}>
                            <Folder className="size-4 mr-2" />
                            New Folder
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                    </>
                )}
                <ContextMenuItem>Rename</ContextMenuItem>
                <ContextMenuItem
                    variant="destructive"
                    onClick={() => onDeleteNode?.(node.path)}
                >
                    Delete
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

export function FileExplorer({
    files,
    onFileSelect,
    onToggleFolder,
    selectedFilePath,
    onRefresh,
    onNewFile,
    onNewFolder,
    onDeleteNode,
    onRenameNode,
    className,
}: FileExplorerProps) {
    return (
        <div className={cn("flex flex-col h-full bg-background", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground p-0.5">
                    Explorer
                </span>
                <div className="flex items-center gap-0.5">
                </div>
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1">
                <div className="py-1">
                    {sortFileSystemNodes(files).map((node) => (
                        <FileTreeItem
                            key={node.id}
                            node={node}
                            depth={0}
                            onFileSelect={onFileSelect}
                            onToggleFolder={onToggleFolder}
                            selectedFilePath={selectedFilePath}
                            onNewFile={onNewFile}
                            onNewFolder={onNewFolder}
                            onDeleteNode={onDeleteNode}
                            onRenameNode={onRenameNode}
                        />
                    ))}
                </div>
            </ScrollArea>
        </div>
    )
}

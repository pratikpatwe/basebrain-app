"use client"

import * as React from "react"
import { X, Circle, File } from "lucide-react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area" // Removed in favor of primitives
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
import { type OpenFile } from "./types"
import { getFileExtension } from "./utils"

// ... keep existing constants/helper functions ...

// Note: I will copy the unchanged imports and constants to ensure context lines match if I was doing a partial replace, but since I am rewriting the imports and component usage, I should be careful.


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

interface EditorTabsProps {
    openFiles: OpenFile[]
    activeFileId: string | null
    onSelectFile: (fileId: string) => void
    onCloseFile: (fileId: string) => void
    onCloseOtherFiles?: (fileId: string) => void
    onCloseAllFiles?: () => void
    onCloseFilesToRight?: (fileId: string) => void
    className?: string
}

interface TabItemProps {
    file: OpenFile
    isActive: boolean
    onSelect: () => void
    onClose: () => void
    onCloseOthers?: () => void
    onCloseAll?: () => void
    onCloseToRight?: () => void
}

function TabItem({
    file,
    isActive,
    onSelect,
    onClose,
    onCloseOthers,
    onCloseAll,
    onCloseToRight,
}: TabItemProps) {
    const extension = getFileExtension(file.name)
    const fileTypeInfo = getFileTypeIcon(extension)

    const handleClose = (e: React.MouseEvent) => {
        e.stopPropagation()
        onClose()
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <div
                    className={cn(
                        "group relative flex items-center gap-2 px-3 py-1.5 cursor-pointer border-r border-border/30",
                        "transition-colors min-w-[120px] max-w-[200px] h-full",
                        isActive
                            ? "bg-muted/10 text-foreground"
                            : "bg-transparent text-muted-foreground hover:bg-muted/10 hover:text-foreground"
                    )}
                    onClick={onSelect}
                >
                    {/* Active indicator line */}
                    {isActive && (
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary" />
                    )}

                    {/* File type icon */}
                    <span className={cn("flex-shrink-0 w-4 h-4 flex items-center justify-center", fileTypeInfo.color)}>
                        {fileTypeInfo.icon}
                    </span>

                    {/* File name */}
                    <span className="truncate text-sm select-none flex-1 font-medium text-[13px] leading-none mb-[1px]">{file.name}</span>

                    {/* Dirty indicator or close button */}
                    <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center ml-1 cursor-pointer">
                        {file.isDirty ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="size-5 hover:bg-muted rounded-sm flex items-center justify-center cursor-pointer" onClick={handleClose}>
                                        <Circle className="size-2 fill-current text-white group-hover:hidden" />
                                        <X className="size-3.5 hidden group-hover:block" />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Unsaved changes</TooltipContent>
                            </Tooltip>
                        ) : (
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn(
                                    "size-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                                    "hover:bg-muted-foreground/20 rounded-sm"
                                )}
                                onClick={handleClose}
                            >
                                <X className="size-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
                <ContextMenuItem onClick={onClose}>
                    Close
                </ContextMenuItem>
                <ContextMenuItem onClick={onCloseOthers}>
                    Close Others
                </ContextMenuItem>
                <ContextMenuItem onClick={onCloseToRight}>
                    Close to the Right
                </ContextMenuItem>
                <ContextMenuSeparator />
                <ContextMenuItem onClick={onCloseAll}>
                    Close All
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}

export function EditorTabs({
    openFiles,
    activeFileId,
    onSelectFile,
    onCloseFile,
    onCloseOtherFiles,
    onCloseAllFiles,
    onCloseFilesToRight,
    className,
}: EditorTabsProps) {
    if (openFiles.length === 0) {
        return null
    }

    return (
        <div className={cn("flex items-center bg-muted/5 border-b border-border/50", className)}>
            <ScrollAreaPrimitive.Root className="w-full relative overflow-hidden">
                <ScrollAreaPrimitive.Viewport className="w-full rounded-[inherit] overflow-x-scroll overflow-y-hidden">
                    <div className="flex h-[36px] w-max min-w-full">
                        {openFiles.map((file) => (
                            <TabItem
                                key={file.id}
                                file={file}
                                isActive={file.id === activeFileId}
                                onSelect={() => onSelectFile(file.id)}
                                onClose={() => onCloseFile(file.id)}
                                onCloseOthers={() => onCloseOtherFiles?.(file.id)}
                                onCloseAll={onCloseAllFiles}
                                onCloseToRight={() => onCloseFilesToRight?.(file.id)}
                            />
                        ))}
                    </div>
                </ScrollAreaPrimitive.Viewport>
                <ScrollAreaPrimitive.Scrollbar
                    orientation="horizontal"
                    className="flex h-2.5 flex-col border-t border-t-transparent p-px transition-colors select-none touch-none hover:bg-black/10 dark:hover:bg-white/10"
                >
                    <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-border" />
                </ScrollAreaPrimitive.Scrollbar>
                <ScrollAreaPrimitive.Corner />
            </ScrollAreaPrimitive.Root>
        </div>
    )
}

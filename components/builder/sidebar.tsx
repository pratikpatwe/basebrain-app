"use client";

import * as React from "react";
import {
    SquarePen,
    Search,
    PanelLeft,
    FolderOpen,
    Pencil,
    Trash2,
    ChevronDown,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useProject } from "@/lib/project-context";

// Constants for sidebar dimensions (in pixels)
export const SIDEBAR_EXPANDED_WIDTH = 240;
export const SIDEBAR_COLLAPSED_WIDTH = 56;

// Sidebar Item Component with Tooltip
function SidebarItem({
    icon: Icon,
    label,
    isCollapsed,
    isMainAction = false,
    onClick,
    disabled = false,
}: {
    icon: React.ElementType;
    label: string;
    isCollapsed: boolean;
    isMainAction?: boolean;
    onClick?: () => void;
    disabled?: boolean;
}) {
    const iconSize = isCollapsed && isMainAction ? "size-6" : "size-4";

    const button = (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`flex items-center gap-3 rounded-md py-2 transition-colors w-full ${disabled
                ? "opacity-40 cursor-not-allowed"
                : "hover:bg-muted/50 cursor-pointer"
                } ${isCollapsed ? "justify-center px-0" : "text-left px-3"}`}
        >
            <Icon className={`${iconSize} shrink-0 text-muted-foreground`} />
            {!isCollapsed && (
                <span className="text-sm text-foreground truncate flex-1 text-ellipsis overflow-hidden whitespace-nowrap">
                    {label}
                </span>
            )}
        </button>
    );

    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">
                    {disabled ? `${label} (Select folder first)` : label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return button;
}

// Chat Item Component (for the chat history with proper truncation - no icons)
function ChatItem({
    id,
    title,
    editTitle,
    onClick,
    isActive = false,
    onRename,
    onDelete,
}: {
    id: string;
    title: string;
    editTitle?: string; // The actual title to edit (without suffixes like project name)
    onClick?: () => void;
    isActive?: boolean;
    onRename?: (id: string, newTitle: string) => void;
    onDelete?: (id: string) => void;
}) {
    const actualEditTitle = editTitle ?? title;
    const [isEditing, setIsEditing] = React.useState(false);
    const [editValue, setEditValue] = React.useState(actualEditTitle);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Focus input when editing starts
    React.useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleRename = () => {
        setEditValue(actualEditTitle);
        setIsEditing(true);
    };

    const handleSubmitRename = () => {
        const trimmed = editValue.trim();
        if (trimmed && trimmed !== actualEditTitle && onRename) {
            onRename(id, trimmed);
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            handleSubmitRename();
        } else if (e.key === "Escape") {
            setIsEditing(false);
            setEditValue(actualEditTitle);
        }
    };

    const handleBlur = () => {
        handleSubmitRename();
    };

    if (isEditing) {
        return (
            <div className="w-full px-3 py-1.5">
                <input
                    ref={inputRef}
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={handleBlur}
                    className="w-full bg-muted/50 border border-border rounded-md px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
                />
            </div>
        );
    }

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                <button
                    onClick={onClick}
                    className={`group flex w-full items-center rounded-md px-3 py-2 text-left transition-colors outline-none cursor-pointer ${isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-foreground"
                        }`}
                    title={title}
                >
                    <span className="w-full truncate text-sm">
                        {title}
                    </span>
                </button>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-40">
                <ContextMenuItem onClick={handleRename} className="gap-2 cursor-pointer">
                    <Pencil className="h-4 w-4" />
                    <span>Rename</span>
                </ContextMenuItem>
                <ContextMenuItem
                    onClick={() => onDelete?.(id)}
                    className="gap-2 cursor-pointer text-red-500 focus:text-red-500"
                >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                </ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    );
}

// Sidebar Content Component
function SidebarContent({
    isCollapsed,
    onExpandClick,
    onCollapseClick,
}: {
    isCollapsed: boolean;
    onExpandClick: () => void;
    onCollapseClick: () => void;
}) {
    const [isHovering, setIsHovering] = React.useState(false);
    const {
        projectName,
        projectPath,
        selectFolder,
        isElectron,
        projectChats,
        otherChats,
        currentChatId,
        createNewChat,
        selectChat,
        selectChatAndProject,
        renameChat,
        deleteChat,
    } = useProject();
    const firstLetter = projectPath ? projectName.charAt(0).toUpperCase() : null;

    // Collapsible section states
    const [isProjectChatsOpen, setIsProjectChatsOpen] = React.useState(true);
    const [isOtherChatsOpen, setIsOtherChatsOpen] = React.useState(true);

    // Reset hover state when sidebar collapse state changes
    React.useEffect(() => {
        setIsHovering(false);
    }, [isCollapsed]);

    // Handle header click - expand if collapsed, or open folder picker if no project
    const handleHeaderClick = () => {
        if (isCollapsed) {
            onExpandClick();
        } else if (!projectPath && isElectron) {
            selectFolder();
        }
    };

    return (
        <TooltipProvider delayDuration={0}>
            <div className="h-full flex flex-col">
                {/* Sidebar Header */}
                <div className="p-2 shrink-0">
                    <div
                        className={`flex items-center gap-3 rounded-lg py-2 transition-colors w-full ${isCollapsed
                            ? "justify-center px-0"
                            : "px-3"
                            }`}
                    >
                        {isCollapsed ? (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={handleHeaderClick}
                                        onMouseEnter={() => setIsHovering(true)}
                                        onMouseLeave={() => setIsHovering(false)}
                                        className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0 hover:bg-primary/80 cursor-pointer transition-colors"
                                    >
                                        {isHovering ? (
                                            <PanelLeft className="size-4 text-primary-foreground" />
                                        ) : firstLetter ? (
                                            <span className="text-sm font-semibold text-primary-foreground">
                                                {firstLetter}
                                            </span>
                                        ) : (
                                            <FolderOpen className="size-4 text-primary-foreground" />
                                        )}
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {projectPath ? "Expand sidebar" : "Select project folder"}
                                </TooltipContent>
                            </Tooltip>
                        ) : (
                            <>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={isElectron ? selectFolder : undefined}
                                            className={`size-8 rounded-lg bg-primary flex items-center justify-center shrink-0 ${isElectron ? 'hover:bg-primary/80 cursor-pointer' : ''} transition-colors`}
                                        >
                                            {firstLetter ? (
                                                <span className="text-sm font-semibold text-primary-foreground">
                                                    {firstLetter}
                                                </span>
                                            ) : (
                                                <FolderOpen className="size-4 text-primary-foreground" />
                                            )}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        {projectPath ? "Change folder" : "Select folder"}
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={isElectron ? selectFolder : undefined}
                                            className={`text-sm font-semibold text-foreground truncate flex-1 text-left ${isElectron ? 'hover:text-foreground/80 cursor-pointer' : ''}`}
                                        >
                                            {projectName}
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom">
                                        {projectPath ? `Change folder (${projectPath})` : "Select folder"}
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <button
                                            onClick={onCollapseClick}
                                            className="size-8 rounded-lg flex items-center justify-center shrink-0 hover:bg-muted/50 cursor-pointer transition-colors"
                                        >
                                            <PanelLeft className="size-4 text-muted-foreground" />
                                        </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right">
                                        Collapse sidebar
                                    </TooltipContent>
                                </Tooltip>
                            </>
                        )}
                    </div>
                </div>

                {/* Scrollable Content */}
                {/* We need to override Radix ScrollArea's inner div display:table to block to allow truncation */}
                <ScrollArea className="flex-1 w-full min-w-0 [&>[data-slot=scroll-area-viewport]>div]:!block">
                    <div className="flex flex-col gap-0.5 px-3 py-2 min-w-0 w-full">
                        {/* Quick Actions - Always visible, bigger icons when collapsed */}
                        <SidebarItem
                            icon={SquarePen}
                            label="New Chat"
                            isCollapsed={isCollapsed}
                            isMainAction={true}
                            disabled={!projectPath}
                            onClick={createNewChat}
                        />
                        <SidebarItem
                            icon={Search}
                            label="Search Chats"
                            isCollapsed={isCollapsed}
                            isMainAction={true}
                        />

                        {/* Chat sections - Only visible when expanded */}
                        {!isCollapsed && (
                            <>
                                {/* Project Chats Section - Collapsible */}
                                {projectPath && (
                                    <div className="mt-4 w-full min-w-0">
                                        <button
                                            onClick={() => setIsProjectChatsOpen(!isProjectChatsOpen)}
                                            className="flex items-center justify-between w-full px-3 py-1 rounded-md transition-colors cursor-pointer"
                                        >
                                            <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                                                Project Chats
                                            </span>
                                            <ChevronDown
                                                className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 ${isProjectChatsOpen ? '' : '-rotate-90'}`}
                                            />
                                        </button>
                                        {isProjectChatsOpen && (
                                            <div className="flex flex-col gap-0.5 mt-1 w-full min-w-0">
                                                {projectChats.length === 0 ? (
                                                    <span className="px-3 py-2 text-xs text-muted-foreground/50 italic">
                                                        No chats yet
                                                    </span>
                                                ) : (
                                                    projectChats.map((chat) => (
                                                        <ChatItem
                                                            key={chat.id}
                                                            id={chat.id}
                                                            title={chat.title || "New Chat"}
                                                            isActive={chat.id === currentChatId}
                                                            onClick={() => selectChat(chat.id)}
                                                            onRename={renameChat}
                                                            onDelete={deleteChat}
                                                        />
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Other Chats Section - Collapsible */}
                                {otherChats.length > 0 && (
                                    <div className="mt-4 w-full min-w-0">
                                        <button
                                            onClick={() => setIsOtherChatsOpen(!isOtherChatsOpen)}
                                            className="flex items-center justify-between w-full px-3 py-1 rounded-md transition-colors cursor-pointer"
                                        >
                                            <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                                                Other Chats
                                            </span>
                                            <ChevronDown
                                                className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200 ${isOtherChatsOpen ? '' : '-rotate-90'}`}
                                            />
                                        </button>
                                        {isOtherChatsOpen && (
                                            <div className="flex flex-col gap-0.5 mt-1 w-full min-w-0">
                                                {otherChats.map((chat) => (
                                                    <ChatItem
                                                        key={chat.id}
                                                        id={chat.id}
                                                        title={`${chat.title || "New Chat"} - ${chat.project_name}`}
                                                        editTitle={chat.title || "New Chat"}
                                                        onClick={() => selectChatAndProject(chat.id, chat.project_path)}
                                                        onRename={renameChat}
                                                        onDelete={deleteChat}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </TooltipProvider>
    );
}

// Main Sidebar Component Props
interface BuilderSidebarProps {
    isCollapsed: boolean;
    onExpandClick: () => void;
    onCollapseClick: () => void;
}

// Main Sidebar Panel Component
export function BuilderSidebar({
    isCollapsed,
    onExpandClick,
    onCollapseClick,
}: BuilderSidebarProps) {
    return (
        <div className="p-2 shrink-0">
            <div
                className="h-full rounded-xl bg-card/50 border border-border/30 transition-all duration-200 overflow-hidden"
                style={{
                    width: isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
                }}
            >
                <SidebarContent
                    isCollapsed={isCollapsed}
                    onExpandClick={onExpandClick}
                    onCollapseClick={onCollapseClick}
                />
            </div>
        </div>
    );
}

// Hook for sidebar state management
export function useSidebarState() {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(true); // Default to collapsed
    const [isLoaded, setIsLoaded] = React.useState(false);

    // Load saved state from database
    React.useEffect(() => {
        const loadState = async () => {
            if (typeof window !== "undefined" && window.electronDB) {
                try {
                    const appState = await window.electronDB.appState.get();
                    setIsSidebarCollapsed(appState.sidebarCollapsed);
                } catch (error) {
                    console.error("[Sidebar] Error loading state:", error);
                }
            }
            setIsLoaded(true);
        };
        loadState();
    }, []);

    // Save state to database when it changes (after initial load)
    React.useEffect(() => {
        if (!isLoaded) return;

        const saveState = async () => {
            if (typeof window !== "undefined" && window.electronDB) {
                try {
                    await window.electronDB.appState.save({ sidebarCollapsed: isSidebarCollapsed });
                } catch (error) {
                    console.error("[Sidebar] Error saving state:", error);
                }
            }
        };
        saveState();
    }, [isSidebarCollapsed, isLoaded]);

    // Toggle sidebar between expanded and collapsed
    const toggleSidebar = React.useCallback(() => {
        setIsSidebarCollapsed((prev) => !prev);
    }, []);

    // Expand sidebar (called from header click when collapsed)
    const expandSidebar = React.useCallback(() => {
        setIsSidebarCollapsed(false);
    }, []);

    // Collapse sidebar (called from header button when expanded)
    const collapseSidebar = React.useCallback(() => {
        setIsSidebarCollapsed(true);
    }, []);

    return {
        isSidebarCollapsed,
        toggleSidebar,
        expandSidebar,
        collapseSidebar,
    };
}

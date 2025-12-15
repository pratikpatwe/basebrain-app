"use client";

import * as React from "react";
import {
    SquarePen,
    Search,
    PanelLeft,
    FolderOpen,
} from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
    title,
    onClick,
    isActive = false,
}: {
    title: string;
    onClick?: () => void;
    isActive?: boolean;
}) {
    return (
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
    } = useProject();
    const firstLetter = projectPath ? projectName.charAt(0).toUpperCase() : null;

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
                                {/* Project Chats Section - Only show when project is selected */}
                                {projectPath && (
                                    <div className="mt-4 w-full min-w-0">
                                        <span className="px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider block truncate">
                                            Project Chats
                                        </span>
                                        <div className="flex flex-col gap-0.5 mt-1 w-full min-w-0">
                                            {projectChats.length === 0 ? (
                                                <span className="px-3 py-2 text-xs text-muted-foreground/50 italic">
                                                    No chats yet
                                                </span>
                                            ) : (
                                                projectChats.map((chat) => (
                                                    <ChatItem
                                                        key={chat.id}
                                                        title={chat.title || "New Chat"}
                                                        isActive={chat.id === currentChatId}
                                                        onClick={() => selectChat(chat.id)}
                                                    />
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Other Chats Section - Chats from other projects */}
                                {otherChats.length > 0 && (
                                    <div className="mt-4 w-full min-w-0">
                                        <span className="px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider block truncate">
                                            Other Chats
                                        </span>
                                        <div className="flex flex-col gap-0.5 mt-1 w-full min-w-0">
                                            {otherChats.map((chat) => (
                                                <ChatItem
                                                    key={chat.id}
                                                    title={`${chat.title || "New Chat"} · ${chat.project_name}`}
                                                    onClick={() => selectChat(chat.id)}
                                                />
                                            ))}
                                        </div>
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

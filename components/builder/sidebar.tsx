"use client";

import * as React from "react";
import {
    SquarePen,
    Search,
    PanelLeft,
    MessageSquare,
    FolderKanban,
} from "lucide-react";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";

// Constants for sidebar dimensions
export const SIDEBAR_EXPANDED_SIZE = 18;
export const SIDEBAR_COLLAPSED_SIZE = 5;

// Mock folder name (in future this will come from file system)
const FOLDER_NAME = "BaseBrain";

// Mock chat history data
const projectChats = [
    { id: 1, title: "API Integration" },
    { id: 2, title: "Auth Setup" },
    { id: 3, title: "Database Schema Design for Production" },
];

const generalChats = [
    { id: 4, title: "React Best Practices and Design Patterns" },
    { id: 5, title: "TypeScript Tips for Better Code Quality" },
    { id: 6, title: "Performance Optimization Strategies" },
];

// Sidebar Item Component with Tooltip
function SidebarItem({
    icon: Icon,
    label,
    isCollapsed,
    isMainAction = false,
    onClick,
}: {
    icon: React.ElementType;
    label: string;
    isCollapsed: boolean;
    isMainAction?: boolean;
    onClick?: () => void;
}) {
    const iconSize = isCollapsed && isMainAction ? "size-6" : "size-4";

    const button = (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors w-full ${isCollapsed ? "justify-center" : "text-left"
                }`}
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
                <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
        );
    }

    return button;
}

// Chat Item Component (for the chat history with proper truncation)
function ChatItem({
    icon: Icon,
    title,
    onClick,
}: {
    icon: React.ElementType;
    title: string;
    onClick?: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors w-full text-left"
        >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
                <span
                    className="text-sm text-foreground block truncate"
                    title={title}
                >
                    {title}
                </span>
            </div>
        </button>
    );
}

// Sidebar Content Component
function SidebarContent({
    isCollapsed,
    onExpandClick,
}: {
    isCollapsed: boolean;
    onExpandClick: () => void;
}) {
    const [isHovering, setIsHovering] = React.useState(false);
    const firstLetter = FOLDER_NAME.charAt(0).toUpperCase();

    // Header is only clickable when collapsed (to expand)
    const handleHeaderClick = () => {
        if (isCollapsed) {
            onExpandClick();
        }
    };

    return (
        <TooltipProvider delayDuration={0}>
            <div className="h-full flex flex-col overflow-hidden">
                {/* Sidebar Header */}
                <div className="p-2 shrink-0">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleHeaderClick}
                                onMouseEnter={() => setIsHovering(true)}
                                onMouseLeave={() => setIsHovering(false)}
                                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors w-full ${isCollapsed
                                    ? "justify-center hover:bg-muted/50 cursor-pointer"
                                    : "text-left cursor-default"
                                    }`}
                            >
                                <div className="size-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                                    {isCollapsed && isHovering ? (
                                        <PanelLeft className="size-4 text-primary-foreground" />
                                    ) : (
                                        <span className="text-sm font-semibold text-primary-foreground">
                                            {firstLetter}
                                        </span>
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <span className="text-sm font-semibold text-foreground truncate flex-1">
                                        {FOLDER_NAME}
                                    </span>
                                )}
                            </button>
                        </TooltipTrigger>
                        {isCollapsed && (
                            <TooltipContent side="right">
                                Click to expand sidebar
                            </TooltipContent>
                        )}
                    </Tooltip>
                </div>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1 scrollbar-thin">
                    <div className="flex flex-col gap-0.5 p-2 pt-0">
                        {/* Quick Actions - Always visible, bigger icons when collapsed */}
                        <SidebarItem
                            icon={SquarePen}
                            label="New Chat"
                            isCollapsed={isCollapsed}
                            isMainAction={true}
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
                                {/* Project Chats Section */}
                                <div className="mt-4">
                                    <span className="px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                                        Project Chats
                                    </span>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        {projectChats.map((chat) => (
                                            <ChatItem
                                                key={chat.id}
                                                icon={FolderKanban}
                                                title={chat.title}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* General Chats Section */}
                                <div className="mt-4">
                                    <span className="px-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                                        Chats
                                    </span>
                                    <div className="flex flex-col gap-0.5 mt-1">
                                        {generalChats.map((chat) => (
                                            <ChatItem
                                                key={chat.id}
                                                icon={MessageSquare}
                                                title={chat.title}
                                            />
                                        ))}
                                    </div>
                                </div>
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
    sidebarRef: React.RefObject<ImperativePanelHandle | null>;
    isCollapsed: boolean;
    onResize: (size: number) => void;
    onDragEnd: () => void;
    onExpandClick: () => void;
}

// Main Sidebar Panel Component
export function BuilderSidebar({
    sidebarRef,
    isCollapsed,
    onResize,
    onDragEnd,
    onExpandClick,
}: BuilderSidebarProps) {
    return (
        <>
            <ResizablePanel
                ref={sidebarRef}
                defaultSize={SIDEBAR_EXPANDED_SIZE}
                minSize={SIDEBAR_COLLAPSED_SIZE}
                maxSize={30}
                onResize={onResize}
                className="p-2"
            >
                <div
                    className="h-full rounded-xl bg-card/50 border border-border/30"
                    style={{
                        minWidth: isCollapsed ? '56px' : '180px',
                        overflow: 'hidden'
                    }}
                >
                    <SidebarContent
                        isCollapsed={isCollapsed}
                        onExpandClick={onExpandClick}
                    />
                </div>
            </ResizablePanel>

            <ResizableHandle
                className="bg-transparent w-1 hover:bg-border/50 transition-colors"
                onDragging={(isDragging) => {
                    if (!isDragging) {
                        onDragEnd();
                    }
                }}
            />
        </>
    );
}

// Hook for sidebar state management
export function useSidebarState() {
    const sidebarPanelRef = React.useRef<ImperativePanelHandle>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

    // Toggle sidebar between expanded and collapsed
    const toggleSidebar = React.useCallback(() => {
        if (sidebarPanelRef.current) {
            if (isSidebarCollapsed) {
                sidebarPanelRef.current.resize(SIDEBAR_EXPANDED_SIZE);
            } else {
                sidebarPanelRef.current.resize(SIDEBAR_COLLAPSED_SIZE);
            }
        }
    }, [isSidebarCollapsed]);

    // Expand sidebar (called from header click when collapsed)
    const expandSidebar = React.useCallback(() => {
        if (sidebarPanelRef.current && isSidebarCollapsed) {
            sidebarPanelRef.current.resize(SIDEBAR_EXPANDED_SIZE);
        }
    }, [isSidebarCollapsed]);

    // Handle sidebar resize - determine if collapsed or expanded
    const handleSidebarResize = React.useCallback((size: number) => {
        const threshold = (SIDEBAR_EXPANDED_SIZE + SIDEBAR_COLLAPSED_SIZE) / 2;
        const shouldBeCollapsed = size < threshold;

        if (shouldBeCollapsed !== isSidebarCollapsed) {
            setIsSidebarCollapsed(shouldBeCollapsed);
        }
    }, [isSidebarCollapsed]);

    // Snap sidebar when drag ends
    const handleSidebarDragEnd = React.useCallback(() => {
        if (sidebarPanelRef.current) {
            const targetSize = isSidebarCollapsed ? SIDEBAR_COLLAPSED_SIZE : SIDEBAR_EXPANDED_SIZE;
            sidebarPanelRef.current.resize(targetSize);
        }
    }, [isSidebarCollapsed]);

    return {
        sidebarPanelRef,
        isSidebarCollapsed,
        toggleSidebar,
        expandSidebar,
        handleSidebarResize,
        handleSidebarDragEnd,
    };
}

"use client";

import * as React from "react";
import Image from "next/image";
import {
    SearchIcon,
    User,
} from "lucide-react";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { Command } from "@/components/ui/command";
import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { BuilderSidebar, useSidebarState } from "@/components/builder/sidebar";
import { BuilderMenu } from "@/components/builder/menu";

// Constants for layout dimensions
const HEADER_HEIGHT = 64;
const EDITOR_DEFAULT_SIZE = 50;
const EDITOR_MIN_SIZE = 20;

// Type for electron platform API
declare global {
    interface Window {
        electronPlatform?: {
            platform: string;
            isMac: boolean;
            isWindows: boolean;
            isLinux: boolean;
        };
    }
}

export default function Home() {
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const editorPanelRef = React.useRef<ImperativePanelHandle>(null);
    const [isMac, setIsMac] = React.useState(false);
    const [isEditorCollapsed, setIsEditorCollapsed] = React.useState(false);

    // Use the sidebar state hook
    const {
        isSidebarCollapsed,
        toggleSidebar,
        expandSidebar,
        collapseSidebar,
    } = useSidebarState();

    // Detect platform on mount
    React.useEffect(() => {
        if (typeof window !== "undefined" && window.electronPlatform) {
            setIsMac(window.electronPlatform.isMac);
        }
    }, []);

    // Handle Ctrl+K / Cmd+K keyboard shortcut
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
            // Ctrl+B to toggle sidebar
            if ((e.ctrlKey || e.metaKey) && e.key === "b") {
                e.preventDefault();
                toggleSidebar();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    // Handle opening the editor to 50% width
    const openEditor = () => {
        if (editorPanelRef.current) {
            editorPanelRef.current.resize(EDITOR_DEFAULT_SIZE);
        }
    };

    // Handle editor panel collapse/expand events
    const handleEditorCollapse = () => {
        setIsEditorCollapsed(true);
    };

    const handleEditorExpand = () => {
        setIsEditorCollapsed(false);
    };

    // User profile button component
    const UserProfileButton = (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-full app-no-drag"
        >
            <Avatar className="size-8">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-medium">
                    <User className="size-4" />
                </AvatarFallback>
            </Avatar>
        </Button>
    );

    return (
        <div className="h-screen w-screen overflow-hidden bg-background flex flex-col pb-1">
            {/* Top Header - Acts as draggable title bar */}
            <header
                className="flex items-center justify-between px-4 bg-background shrink-0 app-drag"
                style={{ height: HEADER_HEIGHT }}
            >
                {/* Left side: User profile on Windows/Linux, empty space on Mac (for traffic lights) */}
                <div className="flex items-center min-w-[120px]">
                    {!isMac && (
                        <div className="app-no-drag">{UserProfileButton}</div>
                    )}
                </div>

                {/* Center: Logo + Search Bar */}
                <div className="flex items-center gap-4 flex-1 max-w-2xl justify-center app-no-drag">
                    {/* Logo (positioned like Spotify's home icon) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-10 bg-muted/50 hover:bg-muted shrink-0"
                    >
                        <Image
                            src="/logo.svg"
                            alt="BaseBrain Logo"
                            width={20}
                            height={21}
                            className="shrink-0"
                        />
                    </Button>

                    {/* Search Bar */}
                    <Command className="rounded-full border border-border/50 bg-muted/50 shadow-sm flex-1 max-w-md">
                        <div className="flex items-center px-4 h-10">
                            <SearchIcon className="size-4 shrink-0 text-muted-foreground/70" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="basebrain"
                                className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/70 px-3 py-2 "
                            />
                            <div className="flex items-center gap-0.5">
                                <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                                <Kbd>K</Kbd>
                            </div>
                        </div>
                    </Command>
                </div>

                {/* Right side: User profile on Mac, empty space on Windows/Linux (for window controls) */}
                <div className="flex items-center justify-end min-w-[120px]">
                    {isMac && (
                        <div className="app-no-drag">{UserProfileButton}</div>
                    )}
                </div>
            </header>

            {/* Main Layout */}
            <main
                className="flex-1 overflow-hidden"
                style={{ height: `calc(100vh - ${HEADER_HEIGHT}px)` }}
            >
                <ResizablePanelGroup direction="horizontal" className="h-full">
                    {/* Sidebar */}
                    <BuilderSidebar
                        isCollapsed={isSidebarCollapsed}
                        onExpandClick={expandSidebar}
                        onCollapseClick={collapseSidebar}
                    />

                    {/* Middle Panel — Chat Area + Dock */}
                    <ResizablePanel
                        defaultSize={32}
                        minSize={28}
                        className="py-2 ml-1"
                    >
                        <div className="h-full flex flex-col gap-2">
                            {/* Chat Area */}
                            <div className="flex-1 rounded-xl bg-card/50 border border-border/30 overflow-hidden">
                                <ScrollArea className="h-full">
                                    <div className="p-4">
                                        {/* Empty chat placeholder */}
                                        <div className="h-full min-h-[400px] flex items-center justify-center">
                                            <span className="text-muted-foreground/40 text-sm">
                                                Chat Area
                                            </span>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Bottom Dock Menu */}
                            <BuilderMenu onOpenEditor={openEditor} />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle className="bg-transparent w-1 transition-colors" />

                    {/* Right Panel — Code Editor Area (Collapsible) */}
                    <ResizablePanel
                        ref={editorPanelRef}
                        defaultSize={50}
                        minSize={EDITOR_MIN_SIZE}
                        collapsible={true}
                        collapsedSize={0}
                        onCollapse={handleEditorCollapse}
                        onExpand={handleEditorExpand}
                        className="p-2"
                    >
                        <div
                            className={`h-full rounded-xl bg-card/80 border border-border/30 overflow-hidden ${isEditorCollapsed ? "hidden" : ""
                                }`}
                        >
                            <div className="h-full flex flex-col">
                                {/* Editor header bar */}
                                <div className="h-10 border-b border-border/30 flex items-center px-4 shrink-0">
                                    <div className="flex items-center gap-2">
                                        <div className="size-3 rounded-full bg-muted-foreground/20" />
                                        <div className="size-3 rounded-full bg-muted-foreground/20" />
                                        <div className="size-3 rounded-full bg-muted-foreground/20" />
                                    </div>
                                    <span className="ml-4 text-xs text-muted-foreground/50 font-mono">
                                        untitled
                                    </span>
                                </div>

                                {/* Editor content area */}
                                <ScrollArea className="flex-1">
                                    <div className="p-4 font-mono text-sm">
                                        <div className="flex">
                                            <div className="pr-4 text-muted-foreground/30 select-none text-right w-8">
                                                {Array.from({ length: 20 }, (_, i) => (
                                                    <div key={i} className="leading-6">
                                                        {i + 1}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex-1 text-muted-foreground/20">
                                                {Array.from({ length: 20 }, (_, i) => (
                                                    <div key={i} className="leading-6">
                                                        {i === 0 && "// BaseBrain Editor"}
                                                        {i === 1 && "// Start coding here..."}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </main>
        </div>
    );
}

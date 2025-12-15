"use client";

import * as React from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";

import {
    ResizablePanelGroup,
    ResizablePanel,
    ResizableHandle,
} from "@/components/ui/resizable";
import { BuilderSidebar, useSidebarState } from "@/components/builder/sidebar";
import { ChatArea } from "@/components/builder/chat/chat-area";
import { BuilderMenu } from "@/components/builder/menu";
import { BuilderHeader, HEADER_HEIGHT } from "@/components/builder/header";

// Constants for layout dimensions
const EDITOR_DEFAULT_SIZE = 50;
const EDITOR_MIN_SIZE = 20;
const CHAT_DEFAULT_SIZE = 30;
const CHAT_MIN_SIZE = 30;

export default function Home() {
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const editorPanelRef = React.useRef<ImperativePanelHandle>(null);
    const chatPanelRef = React.useRef<ImperativePanelHandle>(null);
    const [isEditorCollapsed, setIsEditorCollapsed] = React.useState(false);

    // Panel sizes (loaded from DB)
    const [editorPanelSize, setEditorPanelSize] = React.useState(EDITOR_DEFAULT_SIZE);
    const [chatPanelSize, setChatPanelSize] = React.useState(CHAT_DEFAULT_SIZE);
    const [isLayoutLoaded, setIsLayoutLoaded] = React.useState(false);

    // Use the sidebar state hook
    const {
        isSidebarCollapsed,
        toggleSidebar,
        expandSidebar,
        collapseSidebar,
    } = useSidebarState();

    // Load saved panel sizes and collapsed state from database
    React.useEffect(() => {
        const loadLayout = async () => {
            if (typeof window !== "undefined" && window.electronDB) {
                try {
                    const appState = await window.electronDB.appState.get();
                    console.log("[Layout] Loaded layout state:", appState);

                    if (appState.editorPanelSize > 0) {
                        setEditorPanelSize(appState.editorPanelSize);
                    }
                    if (appState.chatPanelSize > 0) {
                        setChatPanelSize(appState.chatPanelSize);
                    }
                    // Load editor collapsed state
                    setIsEditorCollapsed(appState.editorCollapsed);
                } catch (error) {
                    console.error("[Layout] Error loading layout state:", error);
                }
            }
            setIsLayoutLoaded(true);
        };
        loadLayout();
    }, []);

    // Apply editor collapsed state after layout loads
    React.useEffect(() => {
        if (isLayoutLoaded && isEditorCollapsed && editorPanelRef.current) {
            // Collapse the panel imperatively
            editorPanelRef.current.collapse();
        }
    }, [isLayoutLoaded, isEditorCollapsed]);

    // Save panel sizes to database (debounced)
    const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const savePanelSizes = React.useCallback((editor: number, chat: number) => {
        // Debounce saves to avoid hammering the database during resize
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
            if (typeof window !== "undefined" && window.electronDB) {
                try {
                    await window.electronDB.appState.save({
                        editorPanelSize: editor,
                        chatPanelSize: chat,
                    });
                    console.log("[Layout] Saved panel sizes:", { editor, chat });
                } catch (error) {
                    console.error("[Layout] Error saving panel sizes:", error);
                }
            }
        }, 500);
    }, []);

    // Handle panel resize
    const handleEditorResize = React.useCallback((size: number) => {
        setEditorPanelSize(size);
        savePanelSizes(size, chatPanelSize);
    }, [chatPanelSize, savePanelSizes]);

    const handleChatResize = React.useCallback((size: number) => {
        setChatPanelSize(size);
        savePanelSizes(editorPanelSize, size);
    }, [editorPanelSize, savePanelSizes]);

    // Handle Ctrl+K / Cmd+K keyboard shortcut
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
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
    const handleEditorCollapse = React.useCallback(async () => {
        setIsEditorCollapsed(true);
        // Save collapsed state to database
        if (typeof window !== "undefined" && window.electronDB) {
            try {
                await window.electronDB.appState.save({ editorCollapsed: true });
            } catch (error) {
                console.error("[Layout] Error saving collapsed state:", error);
            }
        }
    }, []);

    const handleEditorExpand = React.useCallback(async () => {
        setIsEditorCollapsed(false);
        // Save collapsed state to database
        if (typeof window !== "undefined" && window.electronDB) {
            try {
                await window.electronDB.appState.save({ editorCollapsed: false });
            } catch (error) {
                console.error("[Layout] Error saving collapsed state:", error);
            }
        }
    }, []);

    // Don't render until layout is loaded to avoid flash
    if (!isLayoutLoaded) {
        return (
            <div className="h-screen w-screen overflow-hidden bg-background flex flex-col pb-1">
                <BuilderHeader searchInputRef={searchInputRef} />
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-background flex flex-col pb-1">
            {/* Header */}
            <BuilderHeader searchInputRef={searchInputRef} />

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
                        ref={chatPanelRef}
                        defaultSize={chatPanelSize}
                        minSize={CHAT_MIN_SIZE}
                        onResize={handleChatResize}
                        className="py-2 ml-1"
                    >
                        <div className="h-full flex flex-col gap-2 overflow-visible">
                            {/* Chat Area */}
                            <ChatArea />

                            {/* Bottom Dock Menu */}
                            <BuilderMenu onOpenEditor={openEditor} />
                        </div>
                    </ResizablePanel>

                    <ResizableHandle className="bg-transparent w-1 transition-colors" />

                    {/* Right Panel — Code Editor Area (Collapsible) */}
                    <ResizablePanel
                        ref={editorPanelRef}
                        defaultSize={editorPanelSize}
                        minSize={EDITOR_MIN_SIZE}
                        collapsible={true}
                        collapsedSize={0}
                        onCollapse={handleEditorCollapse}
                        onExpand={handleEditorExpand}
                        onResize={handleEditorResize}
                        className="p-2"
                    >
                        <div
                            className={`h-full rounded-xl bg-card/80 border border-border/30 overflow-hidden ${isEditorCollapsed ? "hidden" : ""
                                }`}
                        >
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </main>
        </div>
    );
}


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

export default function Home() {
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const editorPanelRef = React.useRef<ImperativePanelHandle>(null);
    const [isEditorCollapsed, setIsEditorCollapsed] = React.useState(false);

    // Use the sidebar state hook
    const {
        isSidebarCollapsed,
        toggleSidebar,
        expandSidebar,
        collapseSidebar,
    } = useSidebarState();

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
    const handleEditorCollapse = () => {
        setIsEditorCollapsed(true);
    };

    const handleEditorExpand = () => {
        setIsEditorCollapsed(false);
    };

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
                        defaultSize={30}
                        minSize={30}
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
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </main>
        </div>
    );
}

"use client";

import {
    Fullscreen,
    Workflow,
    GitBranch,
    BarChart3,
    Settings,
    Code2,
} from "lucide-react";

import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";

// Menu item type
interface MenuItem {
    title: string;
    icon: React.ElementType;
    onClick?: () => void;
}

// Props for the BuilderMenu component
interface BuilderMenuProps {
    onOpenEditor?: () => void;
}

// Builder Menu Component - The dock at the bottom of the chat area
export function BuilderMenu({ onOpenEditor }: BuilderMenuProps) {
    // Menu items configuration
    const menuItems: MenuItem[] = [
        {
            title: "Code Editor",
            icon: Code2,
            onClick: onOpenEditor,
        },
        {
            title: "Preview",
            icon: Fullscreen,
            onClick: onOpenEditor,
        },
        {
            title: "Backend Map",
            icon: Workflow,
            onClick: () => { },
        },
        {
            title: "Push Changes",
            icon: GitBranch,
            onClick: () => { },
        },
        {
            title: "Project Stats",
            icon: BarChart3,
            onClick: () => { },
        },
        {
            title: "Project Settings",
            icon: Settings,
            onClick: () => { },
        },
    ];

    return (
        <div className="shrink-0 flex items-center justify-center">
            <div className="h-16 w-fit rounded-xl bg-card/50 border border-border/30 flex items-center justify-center px-2 overflow-visible">
                <Dock
                    magnification={48}
                    distance={80}
                    panelHeight={48}
                    className="bg-transparent overflow-visible"
                >
                    {menuItems.map((item, idx) => (
                        <DockItem
                            key={idx}
                            className="bg-muted/60 hover:bg-muted"
                            onClick={item.onClick}
                        >
                            <DockLabel>{item.title}</DockLabel>
                            <DockIcon>
                                <item.icon className="size-4 text-muted-foreground" />
                            </DockIcon>
                        </DockItem>
                    ))}
                </Dock>
            </div>
        </div>
    );
}

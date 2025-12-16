"use client";

import { useState, useEffect } from "react";
import {
    Eye,
    Workflow,
    GitBranch,
    BarChart3,
    Settings,
    Code2,
    Globe,
    RefreshCw,
} from "lucide-react";

import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Running port info
interface RunningPort {
    port: number;
    name: string;
    url: string;
}

// Props for the BuilderMenu component
interface BuilderMenuProps {
    onOpenEditor?: () => void;
    onOpenPreview?: (url: string, name: string) => void;
}

// Common dev server ports to check
const COMMON_PORTS = [
    { port: 3000, name: "Next.js / React" },
    { port: 3001, name: "Dev Server" },
    { port: 4200, name: "Angular" },
    { port: 5173, name: "Vite" },
    { port: 5174, name: "Vite (alt)" },
    { port: 8000, name: "Python / Django" },
    { port: 8080, name: "HTTP Server" },
    { port: 8888, name: "Jupyter" },
];

// Builder Menu Component - The dock at the bottom of the chat area
export function BuilderMenu({ onOpenEditor, onOpenPreview }: BuilderMenuProps) {
    const [runningPorts, setRunningPorts] = useState<RunningPort[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Scan for running ports
    const scanPorts = async () => {
        setIsScanning(true);
        const foundPorts: RunningPort[] = [];

        // Check each common port
        for (const { port, name } of COMMON_PORTS) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 500);

                const response = await fetch(`http://localhost:${port}`, {
                    method: "HEAD",
                    mode: "no-cors",
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                // If we get here without error, the port is likely running
                foundPorts.push({
                    port,
                    name,
                    url: `http://localhost:${port}`,
                });
            } catch {
                // Port not running or not accessible - ignore
            }
        }

        setRunningPorts(foundPorts);
        setIsScanning(false);
    };

    // Scan ports when dropdown opens
    useEffect(() => {
        if (dropdownOpen) {
            scanPorts();
        }
    }, [dropdownOpen]);

    // Handle preview selection
    const handlePreviewSelect = (port: RunningPort) => {
        if (onOpenPreview) {
            onOpenPreview(port.url, `Preview :${port.port}`);
        }
        setDropdownOpen(false);
    };

    return (
        <div className="shrink-0 flex items-end justify-center pb-2 px-2">
            <div className="rounded-2xl bg-card/50 border border-border/30 overflow-visible">
                <Dock
                    magnification={68}
                    distance={120}
                    panelHeight={56}
                    className="bg-transparent"
                >
                    {/* Code Editor Button */}
                    <DockItem
                        className="bg-muted/60 hover:bg-muted"
                        onClick={onOpenEditor}
                    >
                        <DockLabel>Code Editor</DockLabel>
                        <DockIcon>
                            <Code2 className="size-4 text-muted-foreground" />
                        </DockIcon>
                    </DockItem>

                    {/* Preview Button with Dropdown */}
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <div>
                                <DockItem className="bg-muted/60 hover:bg-muted">
                                    <DockLabel>Preview</DockLabel>
                                    <DockIcon>
                                        <Eye className="size-4 text-muted-foreground" />
                                    </DockIcon>
                                </DockItem>
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            side="top"
                            align="center"
                            className="w-56 mb-2"
                        >
                            <DropdownMenuLabel className="flex items-center justify-between">
                                <span>Running Servers</span>
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        scanPorts();
                                    }}
                                    className="p-1 rounded hover:bg-muted"
                                    disabled={isScanning}
                                >
                                    <RefreshCw className={`size-3 ${isScanning ? 'animate-spin' : ''}`} />
                                </button>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isScanning ? (
                                <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                    Scanning ports...
                                </div>
                            ) : runningPorts.length > 0 ? (
                                runningPorts.map((port) => (
                                    <DropdownMenuItem
                                        key={port.port}
                                        onClick={() => handlePreviewSelect(port)}
                                        className="cursor-pointer"
                                    >
                                        <Globe className="size-4 mr-2 text-green-500" />
                                        <div className="flex flex-col">
                                            <span className="text-sm">localhost:{port.port}</span>
                                            <span className="text-xs text-muted-foreground">{port.name}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))
                            ) : (
                                <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                                    No servers running
                                    <p className="text-xs mt-1">Start a dev server to preview</p>
                                </div>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Other menu items */}
                    <DockItem
                        className="bg-muted/60 hover:bg-muted"
                        onClick={() => { }}
                    >
                        <DockLabel>Backend Builder</DockLabel>
                        <DockIcon>
                            <Workflow className="size-4 text-muted-foreground" />
                        </DockIcon>
                    </DockItem>

                    <DockItem
                        className="bg-muted/60 hover:bg-muted"
                        onClick={() => { }}
                    >
                        <DockLabel>Push Changes</DockLabel>
                        <DockIcon>
                            <GitBranch className="size-4 text-muted-foreground" />
                        </DockIcon>
                    </DockItem>

                    <DockItem
                        className="bg-muted/60 hover:bg-muted"
                        onClick={() => { }}
                    >
                        <DockLabel>Project Stats</DockLabel>
                        <DockIcon>
                            <BarChart3 className="size-4 text-muted-foreground" />
                        </DockIcon>
                    </DockItem>

                    <DockItem
                        className="bg-muted/60 hover:bg-muted"
                        onClick={() => { }}
                    >
                        <DockLabel>Project Settings</DockLabel>
                        <DockIcon>
                            <Settings className="size-4 text-muted-foreground" />
                        </DockIcon>
                    </DockItem>
                </Dock>
            </div>
        </div>
    );
}

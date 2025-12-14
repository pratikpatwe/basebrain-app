"use client";

import * as React from "react";
import Image from "next/image";
import {
    SearchIcon,
    UserCircle,
    BarChart3,
    LogOut,
} from "lucide-react";

import { Command } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth-provider";

// Header height constant
export const HEADER_HEIGHT = 58;

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

interface BuilderHeaderProps {
    searchInputRef?: React.RefObject<HTMLInputElement | null>;
}

export function BuilderHeader({ searchInputRef }: BuilderHeaderProps) {
    const [isMac, setIsMac] = React.useState(false);
    const [dropdownOpen, setDropdownOpen] = React.useState(false);

    // Get user and logout from auth context
    const { user, logout } = useAuth();

    // Detect platform on mount
    React.useEffect(() => {
        if (typeof window !== "undefined" && window.electronPlatform) {
            setIsMac(window.electronPlatform.isMac);
        }
    }, []);

    // Get user initials for fallback
    const getUserInitial = () => {
        if (user?.name) {
            return user.name.charAt(0).toUpperCase();
        }
        if (user?.email) {
            return user.email.charAt(0).toUpperCase();
        }
        return "U";
    };

    // User avatar button - exact same styling as logo button
    const UserAvatarButton = (
        <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-muted/50 hover:bg-muted shrink-0 cursor-pointer overflow-hidden"
        >
            {user?.avatar_url ? (
                <Image
                    src={user.avatar_url}
                    alt={user.name || user.email || "User"}
                    width={36}
                    height={36}
                    className="size-9 object-cover rounded-[8px]"
                />
            ) : (
                <span className="text-sm font-semibold text-foreground">
                    {getUserInitial()}
                </span>
            )}
        </Button>
    );

    // User profile dropdown
    const UserProfileDropdown = (
        <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                <DropdownMenuTrigger asChild>
                    {UserAvatarButton}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align={isMac ? "end" : "start"}
                    sideOffset={8}
                    className="w-56"
                >
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <p className="text-sm font-medium leading-none">
                                {user?.name || "User"}
                            </p>
                            <p className="text-xs leading-none text-muted-foreground">
                                {user?.email}
                            </p>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer">
                        <UserCircle className="mr-2 size-4" />
                        Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                        <BarChart3 className="mr-2 size-4" />
                        Usage
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                        onClick={() => {
                            setDropdownOpen(false);
                            logout();
                        }}
                    >
                        <LogOut className="mr-2 size-4" />
                        Log out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );

    return (
        <header
            className={`flex items-center justify-between px-4 bg-background shrink-0 ${dropdownOpen ? "app-no-drag" : "app-drag"}`}
            style={{ height: HEADER_HEIGHT, paddingTop: "10px" }}
            onClick={() => dropdownOpen && setDropdownOpen(false)}
        >
            {/* Left side: User profile on Windows/Linux, empty space on Mac (for traffic lights) */}
            <div className="flex items-center justify-start min-w-[100px] h-full">
                {!isMac && (
                    <div className="app-no-drag flex items-center">
                        {UserProfileDropdown}
                    </div>
                )}
            </div>

            {/* Center: Logo + Search Bar */}
            <div className="flex items-center gap-3 app-no-drag">
                {/* Logo */}
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
                <Command className="rounded-full border border-border/50 bg-muted/50 shadow-sm w-[400px]">
                    <div className="flex items-center px-4 h-10">
                        <SearchIcon className="size-4 shrink-0 text-muted-foreground/70" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            placeholder="basebrain"
                            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/70 px-3 py-2"
                        />
                        <div className="flex items-center gap-0.5">
                            <Kbd>{isMac ? "⌘" : "Ctrl"}</Kbd>
                            <Kbd>K</Kbd>
                        </div>
                    </div>
                </Command>
            </div>

            {/* Right side: User profile on Mac, empty space on Windows/Linux (for window controls) */}
            <div className="flex items-center justify-end min-w-[100px] h-full">
                {isMac && (
                    <div className="app-no-drag flex items-center">
                        {UserProfileDropdown}
                    </div>
                )}
            </div>
        </header>
    );
}

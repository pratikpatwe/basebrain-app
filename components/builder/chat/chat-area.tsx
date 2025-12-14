"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatInput from "./chat-input";

export function ChatArea() {
    return (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {/* Scrollable Messages Area */}
            <div className="flex-1 rounded-xl overflow-hidden min-w-0">
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

            {/* Chat Input - Fixed at bottom, centered with max-width */}
            <div className="shrink-0 w-full flex justify-center pb-2 px-2">
                <div className="w-full max-w-xl">
                    <ChatInput />
                </div>
            </div>
        </div>
    );
}

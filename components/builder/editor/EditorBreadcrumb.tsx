"use client"

import * as React from "react"
import { File, Folder, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getPathSegments, getFileExtension } from "./utils"

interface EditorBreadcrumbProps {
    filePath: string | null
    onNavigate?: (path: string) => void
    className?: string
}

// File type icons for breadcrumb
const getSegmentIcon = (segment: string, isLast: boolean) => {
    if (!isLast) {
        return <Folder className="size-3.5 text-amber-400" />
    }

    const extension = getFileExtension(segment)
    const iconColors: Record<string, string> = {
        ts: "text-blue-400",
        tsx: "text-blue-400",
        js: "text-yellow-400",
        jsx: "text-yellow-400",
        json: "text-yellow-500",
        css: "text-blue-500",
        html: "text-orange-500",
        md: "text-slate-400",
    }

    return <File className={cn("size-3.5", iconColors[extension] || "text-muted-foreground")} />
}

export function EditorBreadcrumb({
    filePath,
    onNavigate,
    className,
}: EditorBreadcrumbProps) {
    if (!filePath) {
        return (
            <div>
            </div>
        )
    }

    const segments = getPathSegments(filePath)
    const MAX_VISIBLE = 4 // Maximum visible segments before collapsing

    // Build path for each segment
    const buildPath = (index: number) => {
        return "/" + segments.slice(0, index + 1).join("/")
    }

    // If we have many segments, collapse the middle ones
    const shouldCollapse = segments.length > MAX_VISIBLE

    const renderSegments = () => {
        if (!shouldCollapse) {
            return segments.map((segment, index) => {
                const isLast = index === segments.length - 1
                const path = buildPath(index)

                return (
                    <React.Fragment key={path}>
                        <BreadcrumbItem>
                            {isLast ? (
                                <BreadcrumbPage className="flex items-center gap-1.5 text-xs font-medium">
                                    {getSegmentIcon(segment, true)}
                                    {segment}
                                </BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink
                                    href="#"
                                    onClick={(e) => {
                                        e.preventDefault()
                                        onNavigate?.(path)
                                    }}
                                    className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors"
                                >
                                    {getSegmentIcon(segment, false)}
                                    {segment}
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!isLast && (
                            <BreadcrumbSeparator>
                                <ChevronRight className="size-3" />
                            </BreadcrumbSeparator>
                        )}
                    </React.Fragment>
                )
            })
        }

        // Collapsed view: show first, ellipsis dropdown, last two
        const firstSegment = segments[0]
        const middleSegments = segments.slice(1, -2)
        const lastTwoSegments = segments.slice(-2)

        return (
            <>
                {/* First segment */}
                <BreadcrumbItem>
                    <BreadcrumbLink
                        href="#"
                        onClick={(e) => {
                            e.preventDefault()
                            onNavigate?.(buildPath(0))
                        }}
                        className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors"
                    >
                        {getSegmentIcon(firstSegment, false)}
                        {firstSegment}
                    </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                    <ChevronRight className="size-3" />
                </BreadcrumbSeparator>

                {/* Collapsed middle segments */}
                <BreadcrumbItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                            <span>...</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="min-w-[150px]">
                            {middleSegments.map((segment, index) => {
                                const actualIndex = index + 1
                                const path = buildPath(actualIndex)
                                return (
                                    <DropdownMenuItem
                                        key={path}
                                        onClick={() => onNavigate?.(path)}
                                        className="flex items-center gap-2"
                                    >
                                        <Folder className="size-3.5 text-amber-400" />
                                        {segment}
                                    </DropdownMenuItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </BreadcrumbItem>
                <BreadcrumbSeparator>
                    <ChevronRight className="size-3" />
                </BreadcrumbSeparator>

                {/* Last two segments */}
                {lastTwoSegments.map((segment, index) => {
                    const actualIndex = segments.length - 2 + index
                    const isLast = actualIndex === segments.length - 1
                    const path = buildPath(actualIndex)

                    return (
                        <React.Fragment key={path}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage className="flex items-center gap-1.5 text-xs font-medium">
                                        {getSegmentIcon(segment, true)}
                                        {segment}
                                    </BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault()
                                            onNavigate?.(path)
                                        }}
                                        className="flex items-center gap-1.5 text-xs hover:text-foreground transition-colors"
                                    >
                                        {getSegmentIcon(segment, false)}
                                        {segment}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && (
                                <BreadcrumbSeparator>
                                    <ChevronRight className="size-3" />
                                </BreadcrumbSeparator>
                            )}
                        </React.Fragment>
                    )
                })}
            </>
        )
    }

    return (
        <div className={cn("flex items-center px-3 py-1.5 bg-muted/10 border-b border-border/30", className)}>
            <Breadcrumb>
                <BreadcrumbList className="gap-1 sm:gap-1.5">
                    {renderSegments()}
                </BreadcrumbList>
            </Breadcrumb>
        </div>
    )
}

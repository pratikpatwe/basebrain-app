'use client';

import React, {
    createContext,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    motion,
    MotionValue,
    useMotionValue,
    useSpring,
    useTransform,
    type SpringOptions,
    AnimatePresence,
} from 'framer-motion';
import { cn } from '@/lib/utils';


const DEFAULT_MAGNIFICATION = 60;
const DEFAULT_DISTANCE = 140;
const DEFAULT_PANEL_HEIGHT = 48;

type DockProps = {
    children: React.ReactNode;
    className?: string;
    distance?: number;
    panelHeight?: number;
    magnification?: number;
    spring?: SpringOptions;
};

type DockItemProps = {
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
};

type DockLabelProps = {
    className?: string;
    children: React.ReactNode;
};

type DockIconProps = {
    className?: string;
    children: React.ReactNode;
};

type DockContextType = {
    mouseX: MotionValue<number>;
    spring: SpringOptions;
    magnification: number;
    distance: number;
};

const DockContext = createContext<DockContextType | undefined>(undefined);

function useDock() {
    const context = useContext(DockContext);
    if (!context) {
        throw new Error('useDock must be used within a DockProvider');
    }
    return context;
}

function Dock({
    children,
    className,
    spring = { mass: 0.1, stiffness: 150, damping: 12 },
    magnification = DEFAULT_MAGNIFICATION,
    distance = DEFAULT_DISTANCE,
    panelHeight = DEFAULT_PANEL_HEIGHT,
}: DockProps) {
    const mouseX = useMotionValue(Infinity);

    const contextValue = useMemo(
        () => ({ mouseX, spring, distance, magnification }),
        [mouseX, spring, distance, magnification]
    );

    return (
        <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className={cn(
                'flex items-end justify-center gap-3 rounded-2xl px-3',
                className
            )}
            style={{ height: panelHeight }}
            role="toolbar"
            aria-label="Application dock"
        >
            <DockContext.Provider value={contextValue}>
                {children}
            </DockContext.Provider>
        </motion.div>
    );
}

function DockItem({ children, className, onClick }: DockItemProps) {
    const ref = useRef<HTMLDivElement>(null);
    const { distance, magnification, mouseX, spring } = useDock();
    const [isHovered, setIsHovered] = useState(false);

    const mouseDistance = useTransform(mouseX, (val: number) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return Infinity;
        return val - rect.x - rect.width / 2;
    });

    const sizeTransform = useTransform(
        mouseDistance,
        [-distance, 0, distance],
        [36, magnification, 36]
    );

    const size = useSpring(sizeTransform, spring);

    return (
        <motion.div
            ref={ref}
            style={{ width: size, height: size }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-xl transition-colors',
                className
            )}
            role="button"
            tabIndex={0}
        >
            <DockLabelWrapper isHovered={isHovered}>
                {children}
            </DockLabelWrapper>
        </motion.div>
    );
}

function DockLabelWrapper({
    children,
    isHovered,
}: {
    children: React.ReactNode;
    isHovered: boolean;
}) {
    // Separate label from icon
    const childArray = Array.isArray(children) ? children : [children];
    const labelChild = childArray.find(
        (child): child is React.ReactElement<DockLabelProps> =>
            React.isValidElement(child) && child.type === DockLabel
    );
    const otherChildren = childArray.filter(
        (child) => !React.isValidElement(child) || child.type !== DockLabel
    );

    return (
        <>
            {labelChild && (
                <DockLabelInner isHovered={isHovered}>
                    {labelChild.props.children}
                </DockLabelInner>
            )}
            {otherChildren}
        </>
    );
}


function DockLabelInner({
    children,
    isHovered,
}: {
    children: React.ReactNode;
    isHovered: boolean;
}) {
    return (
        <AnimatePresence>
            {isHovered && (
                <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: -4 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md border border-border/50 z-50"
                >
                    {children}
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function DockLabel({ children, className }: DockLabelProps) {
    // This is just a marker component, actual rendering happens in DockLabelInner
    return <span className={cn('sr-only', className)}>{children}</span>;
}

function DockIcon({ children, className }: DockIconProps) {
    return (
        <div className={cn('flex h-full w-full items-center justify-center p-2', className)}>
            {children}
        </div>
    );
}

export { Dock, DockIcon, DockItem, DockLabel };

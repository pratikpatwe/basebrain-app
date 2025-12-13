"use client";

/**
 * Auth Provider for client-side authentication state management.
 * Handles:
 * - Session loading from Electron keytar
 * - Route protection (redirect to /login if not authenticated)
 * - Token refresh handling
 * - User data context
 */

import React, {
    createContext,
    useContext,
    useEffect,
    useState,
    useCallback,
    ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
    initializeSession,
    setupTokenRefreshListener,
    SessionPayload,
} from "./supabase";

/**
 * User data structure
 */
interface User {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
}

/**
 * Auth context value
 */
interface AuthContextValue {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    logout: () => Promise<void>;
}

// Create context with default values
const AuthContext = createContext<AuthContextValue>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    logout: async () => { },
});

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

/**
 * Props for AuthProvider
 */
interface AuthProviderProps {
    children: ReactNode;
}

/**
 * Auth Provider component
 * Wraps the app and provides authentication state
 */
export function AuthProvider({ children }: AuthProviderProps): React.JSX.Element {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    // Check if we're in Electron environment
    const isElectron = typeof window !== "undefined" && window.electronAuth;

    // Public routes that don't require authentication
    const publicRoutes = ["/login"];
    const isPublicRoute = publicRoutes.includes(pathname);

    /**
     * Logout function - only clears local session, does NOT invalidate server tokens
     * This prevents logging out from desktop from affecting the web app session
     */
    const logout = useCallback(async () => {
        try {
            // Only clear local session from keytar (if in Electron)
            // We do NOT call supabase.auth.signOut() because that would
            // invalidate the tokens on the server and log out the web app too
            if (isElectron && window.electronAuth) {
                await window.electronAuth.logout();
            }

            // Clear user state
            setUser(null);

            // Redirect to login
            router.push("/login");
        } catch (error) {
            console.error("[AuthProvider] Logout error:", error);
        }
    }, [isElectron, router]);

    /**
     * Initialize authentication on mount
     */
    useEffect(() => {
        let unsubscribe: (() => void) | null = null;

        async function initAuth() {
            // If not in Electron, skip auth check (for development in browser)
            if (!isElectron) {
                console.log("[AuthProvider] Not in Electron environment");
                setIsLoading(false);
                return;
            }

            try {
                // Check if session exists in keytar
                const hasStoredSession = await window.electronAuth!.hasSession();

                if (!hasStoredSession) {
                    console.log("[AuthProvider] No stored session found");
                    setUser(null);
                    setIsLoading(false);

                    // Redirect to login if on protected route
                    if (!isPublicRoute) {
                        router.push("/login");
                    }
                    return;
                }

                // Load session from keytar
                const savedSession: SessionPayload | null =
                    await window.electronAuth!.getSession();

                if (!savedSession) {
                    console.log("[AuthProvider] Failed to load session");
                    setUser(null);
                    setIsLoading(false);

                    if (!isPublicRoute) {
                        router.push("/login");
                    }
                    return;
                }

                // Initialize Supabase with the session
                const success = await initializeSession(savedSession);

                if (!success) {
                    console.log("[AuthProvider] Session invalid, clearing...");
                    await window.electronAuth!.logout();
                    setUser(null);
                    setIsLoading(false);

                    if (!isPublicRoute) {
                        router.push("/login");
                    }
                    return;
                }

                // Set user data
                setUser(savedSession.user);

                // Setup token refresh listener
                unsubscribe = setupTokenRefreshListener(async (newSession) => {
                    // Save new tokens to keytar
                    if (window.electronAuth) {
                        await window.electronAuth.saveSession(newSession);
                    }
                    console.log("[AuthProvider] Session refreshed and saved");

                    // Update user data if it changed
                    setUser(newSession.user);
                });

                // If on login page but authenticated, redirect to home
                if (isPublicRoute && pathname === "/login") {
                    router.push("/");
                }
            } catch (error) {
                console.error("[AuthProvider] Init error:", error);
                setUser(null);

                if (!isPublicRoute) {
                    router.push("/login");
                }
            } finally {
                setIsLoading(false);
            }
        }

        initAuth();

        // Cleanup
        return () => {
            if (unsubscribe) {
                unsubscribe();
            }
        };
    }, [isElectron, isPublicRoute, pathname, router]);

    // Context value
    const value: AuthContextValue = {
        user,
        isLoading,
        isAuthenticated: !!user,
        logout,
    };

    // Show loading state while checking auth
    if (isLoading) {
        return (
            <AuthContext.Provider value={value}>
                <div className="min-h-screen flex items-center justify-center bg-background">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading...</p>
                    </div>
                </div>
            </AuthContext.Provider>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Type declarations for Electron APIs
declare global {
    interface Window {
        electronAuth?: {
            getSession: () => Promise<SessionPayload | null>;
            hasSession: () => Promise<boolean>;
            saveSession: (session: SessionPayload) => Promise<boolean>;
            logout: () => Promise<boolean>;
            login: () => Promise<{ success: boolean; session?: SessionPayload; error?: string }>;
        };
    }
}

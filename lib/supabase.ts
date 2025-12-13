/**
 * Supabase client for renderer process.
 * Handles session initialization and token refresh.
 */

import { createClient, Session, AuthChangeEvent } from "@supabase/supabase-js";

// Supabase configuration
const SUPABASE_URL = "https://dtrhvwhdilpfxevvcqdx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0cmh2d2hkaWxwZnhldnZjcWR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0Nzk5MjYsImV4cCI6MjA4MTA1NTkyNn0.atT6vF0OPybreAullYrXWRHNr9pT_DsolMnK-Wgb-K4";

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        // Don't persist session in browser storage (we use keytar instead)
        persistSession: false,
        // Don't auto-detect session from URL
        detectSessionInUrl: false,
    },
});

/**
 * Session payload structure (matches what web sends)
 */
export interface SessionPayload {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expires_at: number;
    token_type: string;
    user: {
        id: string;
        email: string;
        name: string | null;
        avatar_url: string | null;
    };
}

/**
 * Initialize Supabase with a saved session
 * Returns true if session is valid, false otherwise
 */
export async function initializeSession(
    savedSession: SessionPayload
): Promise<boolean> {
    if (!savedSession?.access_token || !savedSession?.refresh_token) {
        console.log("[Supabase] No valid session data");
        return false;
    }

    try {
        const { data, error } = await supabase.auth.setSession({
            access_token: savedSession.access_token,
            refresh_token: savedSession.refresh_token,
        });

        if (error) {
            console.error("[Supabase] Failed to set session:", error.message);
            return false;
        }

        console.log("[Supabase] Session initialized for:", data.user?.email);
        return true;
    } catch (error) {
        console.error("[Supabase] Error initializing session:", error);
        return false;
    }
}

/**
 * Setup listener for token refresh events
 * Calls the callback with new session data when tokens are refreshed
 */
export function setupTokenRefreshListener(
    onRefresh: (session: SessionPayload) => void
): () => void {
    const { data: subscription } = supabase.auth.onAuthStateChange(
        (event: AuthChangeEvent, session: Session | null) => {
            console.log("[Supabase] Auth state changed:", event);

            if (event === "TOKEN_REFRESHED" && session) {
                console.log("[Supabase] Tokens refreshed, saving new session...");

                // Convert Supabase session to our format
                const sessionPayload: SessionPayload = {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_in: session.expires_in ?? 3600,
                    expires_at: session.expires_at ?? 0,
                    token_type: "bearer",
                    user: {
                        id: session.user.id,
                        email: session.user.email ?? "",
                        name: session.user.user_metadata?.full_name ?? null,
                        avatar_url: session.user.user_metadata?.avatar_url ?? null,
                    },
                };

                onRefresh(sessionPayload);
            }

            if (event === "SIGNED_OUT") {
                console.log("[Supabase] User signed out");
            }
        }
    );

    // Return unsubscribe function
    return () => {
        subscription.subscription.unsubscribe();
    };
}

/**
 * Get current user from Supabase
 */
export async function getCurrentUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
        console.error("[Supabase] Failed to get user:", error.message);
        return null;
    }
    return data.user;
}

/**
 * Sign out from Supabase (clears Supabase session)
 */
export async function signOut(): Promise<void> {
    await supabase.auth.signOut();
}

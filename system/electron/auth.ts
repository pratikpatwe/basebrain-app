/**
 * Authentication module for Electron main process.
 * Handles:
 * - Secure token storage with keytar (OS keychain)
 * - OAuth flow via localhost server
 * - Session persistence
 */

import http, { IncomingMessage, ServerResponse } from "http";
import { shell, BrowserWindow } from "electron";
import keytar from "keytar";
import { KEYTAR_SERVICE, KEYTAR_ACCOUNT, WEB_APP_URL } from "./config";

/**
 * Session data structure received from web app
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
 * Save session securely to OS keychain
 */
export async function saveSession(session: SessionPayload): Promise<void> {
    try {
        await keytar.setPassword(
            KEYTAR_SERVICE,
            KEYTAR_ACCOUNT,
            JSON.stringify(session)
        );
        console.log("[Auth] Session saved to keychain");
    } catch (error) {
        console.error("[Auth] Failed to save session:", error);
        throw error;
    }
}

/**
 * Load session from OS keychain
 * Returns null if no session exists
 */
export async function loadSession(): Promise<SessionPayload | null> {
    try {
        const data = await keytar.getPassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
        if (data) {
            const session = JSON.parse(data) as SessionPayload;
            console.log("[Auth] Session loaded from keychain for:", session.user.email);
            return session;
        }
        return null;
    } catch (error) {
        console.error("[Auth] Failed to load session:", error);
        return null;
    }
}

/**
 * Clear session from keychain (logout)
 */
export async function clearSession(): Promise<void> {
    try {
        await keytar.deletePassword(KEYTAR_SERVICE, KEYTAR_ACCOUNT);
        console.log("[Auth] Session cleared from keychain");
    } catch (error) {
        console.error("[Auth] Failed to clear session:", error);
        throw error;
    }
}

/**
 * Check if a session exists in keychain
 */
export async function hasSession(): Promise<boolean> {
    const session = await loadSession();
    return session !== null;
}

/**
 * Start the OAuth flow
 * - Creates a localhost server to receive tokens
 * - Opens browser to web authorization page
 * - Returns the session when received
 */
export function startAuthFlow(mainWindow: BrowserWindow | null): Promise<SessionPayload> {
    return new Promise((resolve, reject) => {
        // Create HTTP server
        const server = http.createServer(
            async (req: IncomingMessage, res: ServerResponse) => {
                // CORS headers - only allow your web app
                res.setHeader("Access-Control-Allow-Origin", WEB_APP_URL);
                res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
                res.setHeader("Access-Control-Allow-Headers", "Content-Type");

                // Handle CORS preflight
                if (req.method === "OPTIONS") {
                    res.writeHead(204);
                    res.end();
                    return;
                }

                // Handle the actual POST request
                if (req.method === "POST" && req.url === "/authorize") {
                    let body = "";

                    req.on("data", (chunk: Buffer) => {
                        body += chunk.toString();
                    });

                    req.on("end", async () => {
                        try {
                            const session = JSON.parse(body) as SessionPayload;

                            console.log("[Auth] Received session for:", session.user.email);

                            // Save to keychain
                            await saveSession(session);

                            // Send success response
                            res.writeHead(200, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ success: true }));

                            // Close server
                            server.close();

                            // Focus the main window
                            if (mainWindow) {
                                if (mainWindow.isMinimized()) mainWindow.restore();
                                mainWindow.focus();
                            }

                            // Resolve with session
                            resolve(session);
                        } catch (error) {
                            console.error("[Auth] Error processing auth response:", error);
                            res.writeHead(400, { "Content-Type": "application/json" });
                            res.end(JSON.stringify({ error: "Invalid request" }));
                            server.close();
                            reject(error);
                        }
                    });
                } else {
                    res.writeHead(404);
                    res.end("Not found");
                }
            }
        );

        // Listen on random available port
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (address && typeof address === "object") {
                const port = address.port;
                const callbackUrl = `http://127.0.0.1:${port}/authorize`;

                console.log(`[Auth] Auth server listening on port ${port}`);
                console.log(`[Auth] Callback URL: ${callbackUrl}`);

                // Open browser to authorization page
                const authUrl = `${WEB_APP_URL}/authorization?callback=${encodeURIComponent(callbackUrl)}`;
                console.log(`[Auth] Opening browser to: ${authUrl}`);
                shell.openExternal(authUrl);
            }
        });

        // Handle server errors
        server.on("error", (error) => {
            console.error("[Auth] Auth server error:", error);
            reject(error);
        });

        // Timeout after 5 minutes
        const timeout = setTimeout(() => {
            server.close();
            reject(new Error("Authentication timeout - no response received"));
        }, 5 * 60 * 1000);

        // Clear timeout when server closes
        server.on("close", () => {
            clearTimeout(timeout);
        });
    });
}

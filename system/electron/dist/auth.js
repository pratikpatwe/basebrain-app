"use strict";
/**
 * Authentication module for Electron main process.
 * Handles:
 * - Secure token storage with keytar (OS keychain)
 * - OAuth flow via localhost server
 * - Session persistence
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveSession = saveSession;
exports.loadSession = loadSession;
exports.clearSession = clearSession;
exports.hasSession = hasSession;
exports.startAuthFlow = startAuthFlow;
const http_1 = __importDefault(require("http"));
const electron_1 = require("electron");
const keytar_1 = __importDefault(require("keytar"));
const config_1 = require("./config");
/**
 * Save session securely to OS keychain
 */
async function saveSession(session) {
    try {
        await keytar_1.default.setPassword(config_1.KEYTAR_SERVICE, config_1.KEYTAR_ACCOUNT, JSON.stringify(session));
        console.log("[Auth] Session saved to keychain");
    }
    catch (error) {
        console.error("[Auth] Failed to save session:", error);
        throw error;
    }
}
/**
 * Load session from OS keychain
 * Returns null if no session exists
 */
async function loadSession() {
    try {
        const data = await keytar_1.default.getPassword(config_1.KEYTAR_SERVICE, config_1.KEYTAR_ACCOUNT);
        if (data) {
            const session = JSON.parse(data);
            console.log("[Auth] Session loaded from keychain for:", session.user.email);
            return session;
        }
        return null;
    }
    catch (error) {
        console.error("[Auth] Failed to load session:", error);
        return null;
    }
}
/**
 * Clear session from keychain (logout)
 */
async function clearSession() {
    try {
        await keytar_1.default.deletePassword(config_1.KEYTAR_SERVICE, config_1.KEYTAR_ACCOUNT);
        console.log("[Auth] Session cleared from keychain");
    }
    catch (error) {
        console.error("[Auth] Failed to clear session:", error);
        throw error;
    }
}
/**
 * Check if a session exists in keychain
 */
async function hasSession() {
    const session = await loadSession();
    return session !== null;
}
/**
 * Start the OAuth flow
 * - Creates a localhost server to receive tokens
 * - Opens browser to web authorization page
 * - Returns the session when received
 */
function startAuthFlow(mainWindow) {
    return new Promise((resolve, reject) => {
        // Create HTTP server
        const server = http_1.default.createServer(async (req, res) => {
            // CORS headers - only allow your web app
            res.setHeader("Access-Control-Allow-Origin", config_1.WEB_APP_URL);
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
                req.on("data", (chunk) => {
                    body += chunk.toString();
                });
                req.on("end", async () => {
                    try {
                        const session = JSON.parse(body);
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
                            if (mainWindow.isMinimized())
                                mainWindow.restore();
                            mainWindow.focus();
                        }
                        // Resolve with session
                        resolve(session);
                    }
                    catch (error) {
                        console.error("[Auth] Error processing auth response:", error);
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Invalid request" }));
                        server.close();
                        reject(error);
                    }
                });
            }
            else {
                res.writeHead(404);
                res.end("Not found");
            }
        });
        // Listen on random available port
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
            if (address && typeof address === "object") {
                const port = address.port;
                const callbackUrl = `http://127.0.0.1:${port}/authorize`;
                console.log(`[Auth] Auth server listening on port ${port}`);
                console.log(`[Auth] Callback URL: ${callbackUrl}`);
                // Open browser to authorization page
                const authUrl = `${config_1.WEB_APP_URL}/authorization?callback=${encodeURIComponent(callbackUrl)}`;
                console.log(`[Auth] Opening browser to: ${authUrl}`);
                electron_1.shell.openExternal(authUrl);
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

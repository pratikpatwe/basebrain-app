/**
 * Electron Launcher Script
 * Starts Next.js on a random available port and launches Electron with that port.
 */

const { spawn, exec } = require("child_process");
const net = require("net");
const path = require("path");

// Get a random available port
function getAvailablePort() {
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.listen(0, "127.0.0.1", () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on("error", reject);
    });
}

// Wait for a port to be ready
function waitForPort(port, timeout = 30000) {
    const startTime = Date.now();
    return new Promise((resolve, reject) => {
        const check = () => {
            const socket = net.createConnection(port, "127.0.0.1");
            socket.on("connect", () => {
                socket.destroy();
                resolve();
            });
            socket.on("error", () => {
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for port ${port}`));
                } else {
                    setTimeout(check, 200);
                }
            });
        };
        check();
    });
}

async function main() {
    const mode = process.argv[2] || "dev"; // 'dev' or 'prod'
    const isProd = mode === "prod";

    console.log(`[Launcher] Starting in ${isProd ? "production" : "development"} mode...`);

    // Get a random available port
    const port = await getAvailablePort();
    console.log(`[Launcher] Using port: ${port}`);

    // Set environment variable for Electron
    process.env.NEXT_PORT = port.toString();

    let nextProcess;

    if (isProd) {
        // Production: Start next start on the port
        console.log("[Launcher] Starting Next.js production server...");
        nextProcess = spawn("npm", ["run", "start", "--", "-p", port.toString()], {
            stdio: "inherit",
            shell: true,
            env: { ...process.env },
        });
    } else {
        // Development: Start next dev on the port
        console.log("[Launcher] Starting Next.js development server...");
        nextProcess = spawn("npm", ["run", "dev:next", "--", "-p", port.toString()], {
            stdio: "inherit",
            shell: true,
            env: { ...process.env },
        });
    }

    // Wait for Next.js to be ready
    console.log("[Launcher] Waiting for Next.js server to be ready...");
    try {
        await waitForPort(port);
        console.log("[Launcher] Next.js server is ready!");
    } catch (error) {
        console.error("[Launcher] Failed to start Next.js:", error);
        nextProcess.kill();
        process.exit(1);
    }

    // Build Electron (TypeScript)
    console.log("[Launcher] Building Electron...");
    await new Promise((resolve, reject) => {
        exec("npm run build:electron", (error, stdout, stderr) => {
            if (error) {
                console.error("[Launcher] Electron build failed:", stderr);
                reject(error);
            } else {
                console.log("[Launcher] Electron build complete!");
                resolve();
            }
        });
    });

    // Start Electron with the port
    console.log("[Launcher] Starting Electron...");
    const electronProcess = spawn("electron", ["."], {
        stdio: "inherit",
        shell: true,
        env: { ...process.env, NEXT_PORT: port.toString() },
    });

    // Handle process cleanup
    const cleanup = () => {
        console.log("\n[Launcher] Shutting down...");
        electronProcess.kill();
        nextProcess.kill();
        process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    electronProcess.on("close", (code) => {
        console.log(`[Launcher] Electron exited with code ${code}`);
        nextProcess.kill();
        process.exit(code || 0);
    });

    nextProcess.on("close", (code) => {
        console.log(`[Launcher] Next.js exited with code ${code}`);
        electronProcess.kill();
        process.exit(code || 0);
    });
}

main().catch((error) => {
    console.error("[Launcher] Error:", error);
    process.exit(1);
});

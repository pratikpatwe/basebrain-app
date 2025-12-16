/**
 * Electron Launcher Script
 * In production: Starts Next.js production server on a random port
 * In development: Starts Next.js dev server on a random port
 * Then launches Electron with that port.
 */

const { spawn, exec } = require("child_process");
const net = require("net");
const path = require("path");
const fs = require("fs");

// Determine if we're running from a packaged app
const isPackaged = process.env.ELECTRON_IS_PACKAGED === "true" ||
    (process.defaultApp === undefined && !process.argv[0].includes("node"));

// Get the app root directory
const appRoot = isPackaged
    ? path.join(process.resourcesPath, "app")
    : path.join(__dirname, "..");

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
function waitForPort(port, timeout = 60000) {
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
    const isProd = mode === "prod" || isPackaged;

    console.log(`[Launcher] Starting in ${isProd ? "production" : "development"} mode...`);
    console.log(`[Launcher] App root: ${appRoot}`);
    console.log(`[Launcher] Is packaged: ${isPackaged}`);

    // Get a random available port
    const port = await getAvailablePort();
    console.log(`[Launcher] Using port: ${port}`);

    // Set environment variable for Electron
    process.env.NEXT_PORT = port.toString();

    let nextProcess;

    if (isProd) {
        // Production: Start next start on the port
        console.log("[Launcher] Starting Next.js production server...");

        // In packaged mode, we need to run next start from the app directory
        const nextBin = path.join(appRoot, "node_modules", ".bin", "next");
        const nextBinCmd = process.platform === "win32" ? `${nextBin}.cmd` : nextBin;

        // Check if next binary exists
        if (fs.existsSync(nextBinCmd) || fs.existsSync(nextBin)) {
            nextProcess = spawn(nextBinCmd, ["start", "-p", port.toString()], {
                stdio: "inherit",
                shell: true,
                cwd: appRoot,
                env: { ...process.env, NODE_ENV: "production" },
            });
        } else {
            // Fallback to npm run start
            nextProcess = spawn("npm", ["run", "start", "--", "-p", port.toString()], {
                stdio: "inherit",
                shell: true,
                cwd: appRoot,
                env: { ...process.env, NODE_ENV: "production" },
            });
        }
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

    // In development, build Electron TypeScript
    if (!isPackaged && !isProd) {
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
    }

    // Start Electron with the port
    console.log("[Launcher] Starting Electron...");
    const electronPath = isPackaged
        ? process.execPath
        : require("electron");

    const electronArgs = isPackaged ? [] : ["."];
    const electronProcess = spawn(electronPath, electronArgs, {
        stdio: "inherit",
        shell: !isPackaged,
        cwd: appRoot,
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

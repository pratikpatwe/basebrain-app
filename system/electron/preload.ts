import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("api", {
    ping: () => "pong"
});

// Expose platform information to the renderer
contextBridge.exposeInMainWorld("electronPlatform", {
    platform: process.platform,
    isMac: process.platform === "darwin",
    isWindows: process.platform === "win32",
    isLinux: process.platform === "linux"
});

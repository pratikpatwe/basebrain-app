"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("api", {
    ping: () => "pong"
});
// Expose platform information to the renderer
electron_1.contextBridge.exposeInMainWorld("electronPlatform", {
    platform: process.platform,
    isMac: process.platform === "darwin",
    isWindows: process.platform === "win32",
    isLinux: process.platform === "linux"
});

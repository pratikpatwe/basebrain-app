"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let mainWindow = null;
// Minimum window dimensions to prevent squeezed UI
const MIN_WIDTH = 900;
const MIN_HEIGHT = 600;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: MIN_WIDTH,
        minHeight: MIN_HEIGHT,
        titleBarStyle: "hidden",
        // Windows-specific: show window controls as overlay
        ...(process.platform === "win32" && {
            titleBarOverlay: {
                color: "#0a0a0a",
                symbolColor: "#ffffff",
                height: 64
            }
        }),
        // macOS-specific: position traffic lights
        ...(process.platform === "darwin" && {
            trafficLightPosition: { x: 16, y: 22 }
        }),
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
            contextIsolation: true
        }
    });
    // Next.js dev server
    mainWindow.loadURL("http://localhost:3000");
}
electron_1.app.whenReady().then(createWindow);

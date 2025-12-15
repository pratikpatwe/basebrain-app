"use strict";
/**
 * App State Repository - Stores and retrieves UI state
 * Used to persist user preferences and restore app state on launch
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.APP_STATE_KEYS = void 0;
exports.getAppStateValue = getAppStateValue;
exports.setAppStateValue = setAppStateValue;
exports.getAppState = getAppState;
exports.saveAppState = saveAppState;
exports.deleteAppStateValue = deleteAppStateValue;
exports.clearAppState = clearAppState;
const index_1 = require("../index");
// App state keys
exports.APP_STATE_KEYS = {
    LAST_PROJECT_PATH: 'last_project_path',
    LAST_CHAT_ID: 'last_chat_id',
    SIDEBAR_COLLAPSED: 'sidebar_collapsed',
    EDITOR_COLLAPSED: 'editor_collapsed',
    EDITOR_PANEL_SIZE: 'editor_panel_size',
    CHAT_PANEL_SIZE: 'chat_panel_size',
};
// Default state values
const DEFAULT_STATE = {
    lastProjectPath: null,
    lastChatId: null,
    sidebarCollapsed: true,
    editorCollapsed: false,
    editorPanelSize: 50,
    chatPanelSize: 30,
};
/**
 * Get a single app state value
 */
function getAppStateValue(key) {
    const db = (0, index_1.getDatabase)();
    const row = db.prepare(`
        SELECT value FROM app_state WHERE key = ?
    `).get(key);
    return row?.value || null;
}
/**
 * Set a single app state value
 */
function setAppStateValue(key, value) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`
        INSERT INTO app_state (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET 
            value = excluded.value,
            updated_at = CURRENT_TIMESTAMP
    `).run(key, value);
}
/**
 * Get the full app state
 */
function getAppState() {
    const lastProjectPath = getAppStateValue(exports.APP_STATE_KEYS.LAST_PROJECT_PATH);
    const lastChatId = getAppStateValue(exports.APP_STATE_KEYS.LAST_CHAT_ID);
    const sidebarCollapsed = getAppStateValue(exports.APP_STATE_KEYS.SIDEBAR_COLLAPSED);
    const editorCollapsed = getAppStateValue(exports.APP_STATE_KEYS.EDITOR_COLLAPSED);
    const editorPanelSize = getAppStateValue(exports.APP_STATE_KEYS.EDITOR_PANEL_SIZE);
    const chatPanelSize = getAppStateValue(exports.APP_STATE_KEYS.CHAT_PANEL_SIZE);
    return {
        lastProjectPath,
        lastChatId,
        sidebarCollapsed: sidebarCollapsed === 'true' ? true : sidebarCollapsed === 'false' ? false : DEFAULT_STATE.sidebarCollapsed,
        editorCollapsed: editorCollapsed === 'true' ? true : editorCollapsed === 'false' ? false : DEFAULT_STATE.editorCollapsed,
        editorPanelSize: editorPanelSize ? parseFloat(editorPanelSize) : DEFAULT_STATE.editorPanelSize,
        chatPanelSize: chatPanelSize ? parseFloat(chatPanelSize) : DEFAULT_STATE.chatPanelSize,
    };
}
/**
 * Save the full app state
 */
function saveAppState(state) {
    if (state.lastProjectPath !== undefined) {
        if (state.lastProjectPath === null) {
            deleteAppStateValue(exports.APP_STATE_KEYS.LAST_PROJECT_PATH);
        }
        else {
            setAppStateValue(exports.APP_STATE_KEYS.LAST_PROJECT_PATH, state.lastProjectPath);
        }
    }
    if (state.lastChatId !== undefined) {
        if (state.lastChatId === null) {
            deleteAppStateValue(exports.APP_STATE_KEYS.LAST_CHAT_ID);
        }
        else {
            setAppStateValue(exports.APP_STATE_KEYS.LAST_CHAT_ID, state.lastChatId);
        }
    }
    if (state.sidebarCollapsed !== undefined) {
        setAppStateValue(exports.APP_STATE_KEYS.SIDEBAR_COLLAPSED, String(state.sidebarCollapsed));
    }
    if (state.editorCollapsed !== undefined) {
        setAppStateValue(exports.APP_STATE_KEYS.EDITOR_COLLAPSED, String(state.editorCollapsed));
    }
    if (state.editorPanelSize !== undefined) {
        setAppStateValue(exports.APP_STATE_KEYS.EDITOR_PANEL_SIZE, String(state.editorPanelSize));
    }
    if (state.chatPanelSize !== undefined) {
        setAppStateValue(exports.APP_STATE_KEYS.CHAT_PANEL_SIZE, String(state.chatPanelSize));
    }
}
/**
 * Delete an app state value
 */
function deleteAppStateValue(key) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`DELETE FROM app_state WHERE key = ?`).run(key);
}
/**
 * Clear all app state (for reset)
 */
function clearAppState() {
    const db = (0, index_1.getDatabase)();
    db.prepare(`DELETE FROM app_state`).run();
}

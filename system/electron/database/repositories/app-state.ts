/**
 * App State Repository - Stores and retrieves UI state
 * Used to persist user preferences and restore app state on launch
 */

import { getDatabase } from '../index';

// App state keys
export const APP_STATE_KEYS = {
    LAST_PROJECT_PATH: 'last_project_path',
    LAST_CHAT_ID: 'last_chat_id',
    SIDEBAR_COLLAPSED: 'sidebar_collapsed',
    EDITOR_COLLAPSED: 'editor_collapsed',
    EDITOR_PANEL_SIZE: 'editor_panel_size',
    CHAT_PANEL_SIZE: 'chat_panel_size',
} as const;

export type AppStateKey = typeof APP_STATE_KEYS[keyof typeof APP_STATE_KEYS];

// Full app state interface
export interface AppState {
    lastProjectPath: string | null;
    lastChatId: string | null;
    sidebarCollapsed: boolean;
    editorCollapsed: boolean;
    editorPanelSize: number;
    chatPanelSize: number;
}

// Default state values
const DEFAULT_STATE: AppState = {
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
export function getAppStateValue(key: AppStateKey): string | null {
    const db = getDatabase();
    const row = db.prepare(`
        SELECT value FROM app_state WHERE key = ?
    `).get(key) as { value: string } | undefined;

    return row?.value || null;
}

/**
 * Set a single app state value
 */
export function setAppStateValue(key: AppStateKey, value: string): void {
    const db = getDatabase();
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
export function getAppState(): AppState {
    const lastProjectPath = getAppStateValue(APP_STATE_KEYS.LAST_PROJECT_PATH);
    const lastChatId = getAppStateValue(APP_STATE_KEYS.LAST_CHAT_ID);
    const sidebarCollapsed = getAppStateValue(APP_STATE_KEYS.SIDEBAR_COLLAPSED);
    const editorCollapsed = getAppStateValue(APP_STATE_KEYS.EDITOR_COLLAPSED);
    const editorPanelSize = getAppStateValue(APP_STATE_KEYS.EDITOR_PANEL_SIZE);
    const chatPanelSize = getAppStateValue(APP_STATE_KEYS.CHAT_PANEL_SIZE);

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
export function saveAppState(state: Partial<AppState>): void {
    if (state.lastProjectPath !== undefined) {
        if (state.lastProjectPath === null) {
            deleteAppStateValue(APP_STATE_KEYS.LAST_PROJECT_PATH);
        } else {
            setAppStateValue(APP_STATE_KEYS.LAST_PROJECT_PATH, state.lastProjectPath);
        }
    }

    if (state.lastChatId !== undefined) {
        if (state.lastChatId === null) {
            deleteAppStateValue(APP_STATE_KEYS.LAST_CHAT_ID);
        } else {
            setAppStateValue(APP_STATE_KEYS.LAST_CHAT_ID, state.lastChatId);
        }
    }

    if (state.sidebarCollapsed !== undefined) {
        setAppStateValue(APP_STATE_KEYS.SIDEBAR_COLLAPSED, String(state.sidebarCollapsed));
    }

    if (state.editorCollapsed !== undefined) {
        setAppStateValue(APP_STATE_KEYS.EDITOR_COLLAPSED, String(state.editorCollapsed));
    }

    if (state.editorPanelSize !== undefined) {
        setAppStateValue(APP_STATE_KEYS.EDITOR_PANEL_SIZE, String(state.editorPanelSize));
    }

    if (state.chatPanelSize !== undefined) {
        setAppStateValue(APP_STATE_KEYS.CHAT_PANEL_SIZE, String(state.chatPanelSize));
    }
}

/**
 * Delete an app state value
 */
export function deleteAppStateValue(key: AppStateKey): void {
    const db = getDatabase();
    db.prepare(`DELETE FROM app_state WHERE key = ?`).run(key);
}

/**
 * Clear all app state (for reset)
 */
export function clearAppState(): void {
    const db = getDatabase();
    db.prepare(`DELETE FROM app_state`).run();
}

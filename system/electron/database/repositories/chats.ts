/**
 * Chats Repository - CRUD operations for chats
 */

import { getDatabase, generateId } from '../index';

export interface Chat {
    id: string;
    project_id: string;
    title: string | null;
    created_at: string;
    updated_at: string;
}

export interface ChatWithProject extends Chat {
    project_name: string;
    project_path: string;
}

/**
 * Create a new chat for a project
 */
export function createChat(projectId: string, title?: string): Chat {
    const db = getDatabase();
    const id = generateId();

    db.prepare(`
        INSERT INTO chats (id, project_id, title, created_at, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, projectId, title || null);

    return {
        id,
        project_id: projectId,
        title: title || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
}

/**
 * Get a chat by ID
 */
export function getChatById(id: string): Chat | null {
    const db = getDatabase();
    const chat = db.prepare(`
        SELECT * FROM chats WHERE id = ?
    `).get(id) as Chat | undefined;

    return chat || null;
}

/**
 * Get all chats for a project, ordered by most recent
 */
export function getChatsByProject(projectId: string): Chat[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM chats 
        WHERE project_id = ? 
        ORDER BY updated_at DESC
    `).all(projectId) as Chat[];
}

/**
 * Get all chats NOT in the current project (for "Other Chats" section)
 * Includes project info for display
 */
export function getOtherChats(currentProjectId: string): ChatWithProject[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT 
            c.*,
            p.name as project_name,
            p.path as project_path
        FROM chats c
        JOIN projects p ON c.project_id = p.id
        WHERE c.project_id != ?
        ORDER BY c.updated_at DESC
    `).all(currentProjectId) as ChatWithProject[];
}

/**
 * Get all chats with project info
 */
export function getAllChatsWithProjects(): ChatWithProject[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT 
            c.*,
            p.name as project_name,
            p.path as project_path
        FROM chats c
        JOIN projects p ON c.project_id = p.id
        ORDER BY c.updated_at DESC
    `).all() as ChatWithProject[];
}

/**
 * Update chat title
 */
export function updateChatTitle(id: string, title: string): void {
    const db = getDatabase();
    db.prepare(`
        UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(title, id);
}

/**
 * Update chat's updated_at timestamp (called when new message added)
 */
export function touchChat(id: string): void {
    const db = getDatabase();
    db.prepare(`
        UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
}

/**
 * Delete a chat and all its messages/snapshots
 */
export function deleteChat(id: string): void {
    const db = getDatabase();
    db.prepare(`DELETE FROM chats WHERE id = ?`).run(id);
}

/**
 * Auto-generate chat title from first user message
 * Takes first 50 characters
 */
export function generateChatTitle(firstMessage: string): string {
    const cleaned = firstMessage.trim().replace(/\n/g, ' ');
    if (cleaned.length <= 50) {
        return cleaned;
    }
    return cleaned.substring(0, 47) + '...';
}

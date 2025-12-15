/**
 * Snapshots Repository - File snapshots for undo/rollback feature
 * Stores the state of files before they are modified by AI
 */

import { getDatabase, generateId } from '../index';

export interface FileSnapshot {
    id: string;
    message_id: string;
    file_path: string;
    action: 'created' | 'modified' | 'deleted';
    content_before: string | null;
    content_after: string | null;
    created_at: string;
}

export interface FileChange {
    file_path: string;
    action: 'created' | 'modified' | 'deleted';
    content_before?: string;
    content_after?: string;
}

/**
 * Create file snapshots for a message
 * Called before executing file operations
 */
export function createSnapshots(messageId: string, changes: FileChange[]): FileSnapshot[] {
    const db = getDatabase();
    const snapshots: FileSnapshot[] = [];

    const stmt = db.prepare(`
        INSERT INTO file_snapshots (
            id, message_id, file_path, action, content_before, content_after, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);

    for (const change of changes) {
        const id = generateId();

        stmt.run(
            id,
            messageId,
            change.file_path,
            change.action,
            change.content_before || null,
            change.content_after || null
        );

        snapshots.push({
            id,
            message_id: messageId,
            file_path: change.file_path,
            action: change.action,
            content_before: change.content_before || null,
            content_after: change.content_after || null,
            created_at: new Date().toISOString()
        });
    }

    return snapshots;
}

/**
 * Get all snapshots for a message
 */
export function getSnapshotsByMessage(messageId: string): FileSnapshot[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM file_snapshots 
        WHERE message_id = ? 
        ORDER BY created_at ASC
    `).all(messageId) as FileSnapshot[];
}

/**
 * Get all snapshots for messages after a certain point
 * Used for rollback to get all changes that need to be undone
 */
export function getSnapshotsAfterMessage(chatId: string, fromMessageId: string): FileSnapshot[] {
    const db = getDatabase();

    // Get the message's created_at time
    const message = db.prepare(`
        SELECT created_at FROM messages WHERE id = ?
    `).get(fromMessageId) as { created_at: string } | undefined;

    if (!message) return [];

    // Get all snapshots for messages after this point
    return db.prepare(`
        SELECT s.* FROM file_snapshots s
        JOIN messages m ON s.message_id = m.id
        WHERE m.chat_id = ? AND m.created_at >= ?
        ORDER BY m.created_at DESC, s.created_at DESC
    `).all(chatId, message.created_at) as FileSnapshot[];
}

/**
 * Delete snapshots for a message
 */
export function deleteSnapshotsByMessage(messageId: string): void {
    const db = getDatabase();
    db.prepare(`DELETE FROM file_snapshots WHERE message_id = ?`).run(messageId);
}

/**
 * Delete all snapshots after a certain message
 * Used when rolling back to a previous state
 */
export function deleteSnapshotsAfterMessage(chatId: string, fromMessageId: string): void {
    const db = getDatabase();

    const message = db.prepare(`
        SELECT created_at FROM messages WHERE id = ?
    `).get(fromMessageId) as { created_at: string } | undefined;

    if (!message) return;

    db.prepare(`
        DELETE FROM file_snapshots 
        WHERE message_id IN (
            SELECT id FROM messages 
            WHERE chat_id = ? AND created_at >= ?
        )
    `).run(chatId, message.created_at);
}

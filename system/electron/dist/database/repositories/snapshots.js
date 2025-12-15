"use strict";
/**
 * Snapshots Repository - File snapshots for undo/rollback feature
 * Stores the state of files before they are modified by AI
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSnapshots = createSnapshots;
exports.getSnapshotsByMessage = getSnapshotsByMessage;
exports.getSnapshotsAfterMessage = getSnapshotsAfterMessage;
exports.deleteSnapshotsByMessage = deleteSnapshotsByMessage;
exports.deleteSnapshotsAfterMessage = deleteSnapshotsAfterMessage;
const index_1 = require("../index");
/**
 * Create file snapshots for a message
 * Called before executing file operations
 */
function createSnapshots(messageId, changes) {
    const db = (0, index_1.getDatabase)();
    const snapshots = [];
    const stmt = db.prepare(`
        INSERT INTO file_snapshots (
            id, message_id, file_path, action, content_before, content_after, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    for (const change of changes) {
        const id = (0, index_1.generateId)();
        stmt.run(id, messageId, change.file_path, change.action, change.content_before || null, change.content_after || null);
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
function getSnapshotsByMessage(messageId) {
    const db = (0, index_1.getDatabase)();
    return db.prepare(`
        SELECT * FROM file_snapshots 
        WHERE message_id = ? 
        ORDER BY created_at ASC
    `).all(messageId);
}
/**
 * Get all snapshots for messages after a certain point
 * Used for rollback to get all changes that need to be undone
 */
function getSnapshotsAfterMessage(chatId, fromMessageId) {
    const db = (0, index_1.getDatabase)();
    // Get the message's created_at time
    const message = db.prepare(`
        SELECT created_at FROM messages WHERE id = ?
    `).get(fromMessageId);
    if (!message)
        return [];
    // Get all snapshots for messages after this point
    return db.prepare(`
        SELECT s.* FROM file_snapshots s
        JOIN messages m ON s.message_id = m.id
        WHERE m.chat_id = ? AND m.created_at >= ?
        ORDER BY m.created_at DESC, s.created_at DESC
    `).all(chatId, message.created_at);
}
/**
 * Delete snapshots for a message
 */
function deleteSnapshotsByMessage(messageId) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`DELETE FROM file_snapshots WHERE message_id = ?`).run(messageId);
}
/**
 * Delete all snapshots after a certain message
 * Used when rolling back to a previous state
 */
function deleteSnapshotsAfterMessage(chatId, fromMessageId) {
    const db = (0, index_1.getDatabase)();
    const message = db.prepare(`
        SELECT created_at FROM messages WHERE id = ?
    `).get(fromMessageId);
    if (!message)
        return;
    db.prepare(`
        DELETE FROM file_snapshots 
        WHERE message_id IN (
            SELECT id FROM messages 
            WHERE chat_id = ? AND created_at >= ?
        )
    `).run(chatId, message.created_at);
}

"use strict";
/**
 * Chats Repository - CRUD operations for chats
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createChat = createChat;
exports.getChatById = getChatById;
exports.getChatsByProject = getChatsByProject;
exports.getOtherChats = getOtherChats;
exports.getAllChatsWithProjects = getAllChatsWithProjects;
exports.updateChatTitle = updateChatTitle;
exports.touchChat = touchChat;
exports.deleteChat = deleteChat;
exports.generateChatTitle = generateChatTitle;
const index_1 = require("../index");
/**
 * Create a new chat for a project
 */
function createChat(projectId, title) {
    const db = (0, index_1.getDatabase)();
    const id = (0, index_1.generateId)();
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
function getChatById(id) {
    const db = (0, index_1.getDatabase)();
    const chat = db.prepare(`
        SELECT * FROM chats WHERE id = ?
    `).get(id);
    return chat || null;
}
/**
 * Get all chats for a project, ordered by most recent
 */
function getChatsByProject(projectId) {
    const db = (0, index_1.getDatabase)();
    return db.prepare(`
        SELECT * FROM chats 
        WHERE project_id = ? 
        ORDER BY updated_at DESC
    `).all(projectId);
}
/**
 * Get all chats NOT in the current project (for "Other Chats" section)
 * Includes project info for display
 */
function getOtherChats(currentProjectId) {
    const db = (0, index_1.getDatabase)();
    return db.prepare(`
        SELECT 
            c.*,
            p.name as project_name,
            p.path as project_path
        FROM chats c
        JOIN projects p ON c.project_id = p.id
        WHERE c.project_id != ?
        ORDER BY c.updated_at DESC
    `).all(currentProjectId);
}
/**
 * Get all chats with project info
 */
function getAllChatsWithProjects() {
    const db = (0, index_1.getDatabase)();
    return db.prepare(`
        SELECT 
            c.*,
            p.name as project_name,
            p.path as project_path
        FROM chats c
        JOIN projects p ON c.project_id = p.id
        ORDER BY c.updated_at DESC
    `).all();
}
/**
 * Update chat title
 */
function updateChatTitle(id, title) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`
        UPDATE chats SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(title, id);
}
/**
 * Update chat's updated_at timestamp (called when new message added)
 */
function touchChat(id) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`
        UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
}
/**
 * Delete a chat and all its messages/snapshots
 */
function deleteChat(id) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`DELETE FROM chats WHERE id = ?`).run(id);
}
/**
 * Auto-generate chat title from first user message
 * Takes first 50 characters
 */
function generateChatTitle(firstMessage) {
    const cleaned = firstMessage.trim().replace(/\n/g, ' ');
    if (cleaned.length <= 50) {
        return cleaned;
    }
    return cleaned.substring(0, 47) + '...';
}

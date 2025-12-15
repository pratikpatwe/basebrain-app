"use strict";
/**
 * Messages Repository - CRUD operations for chat messages
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveMessage = saveMessage;
exports.updateMessage = updateMessage;
exports.getMessageById = getMessageById;
exports.getMessagesByChat = getMessagesByChat;
exports.getLastNMessages = getLastNMessages;
exports.getMessagesCount = getMessagesCount;
exports.deleteMessagesFromPoint = deleteMessagesFromPoint;
exports.deleteMessage = deleteMessage;
const index_1 = require("../index");
const chats_1 = require("./chats");
/**
 * Save a message to the database
 * Also updates the chat's updated_at timestamp
 * Auto-generates chat title from first user message
 */
function saveMessage(input) {
    const db = (0, index_1.getDatabase)();
    const id = (0, index_1.generateId)();
    const toolCallsJson = input.tool_calls ? JSON.stringify(input.tool_calls) : null;
    const toolResultsJson = input.tool_results ? JSON.stringify(input.tool_results) : null;
    db.prepare(`
        INSERT INTO messages (
            id, chat_id, role, content, thinking, 
            tool_calls, tool_results, tokens_prompt, tokens_completion, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(id, input.chat_id, input.role, input.content || null, input.thinking || null, toolCallsJson, toolResultsJson, input.tokens_prompt || 0, input.tokens_completion || 0);
    // Update chat's updated_at
    (0, chats_1.touchChat)(input.chat_id);
    // Auto-generate title if this is the first user message
    if (input.role === 'user' && input.content) {
        const chat = (0, chats_1.getChatById)(input.chat_id);
        if (chat && !chat.title) {
            const title = (0, chats_1.generateChatTitle)(input.content);
            (0, chats_1.updateChatTitle)(input.chat_id, title);
        }
    }
    return {
        id,
        chat_id: input.chat_id,
        role: input.role,
        content: input.content || null,
        thinking: input.thinking || null,
        tool_calls: toolCallsJson,
        tool_results: toolResultsJson,
        tokens_prompt: input.tokens_prompt || 0,
        tokens_completion: input.tokens_completion || 0,
        created_at: new Date().toISOString()
    };
}
/**
 * Update an existing message (e.g., after streaming completes)
 */
function updateMessage(id, updates) {
    const db = (0, index_1.getDatabase)();
    const setClauses = [];
    const values = [];
    if (updates.content !== undefined) {
        setClauses.push('content = ?');
        values.push(updates.content);
    }
    if (updates.thinking !== undefined) {
        setClauses.push('thinking = ?');
        values.push(updates.thinking);
    }
    if (updates.tool_calls !== undefined) {
        setClauses.push('tool_calls = ?');
        values.push(JSON.stringify(updates.tool_calls));
    }
    if (updates.tool_results !== undefined) {
        setClauses.push('tool_results = ?');
        values.push(JSON.stringify(updates.tool_results));
    }
    if (updates.tokens_prompt !== undefined) {
        setClauses.push('tokens_prompt = ?');
        values.push(updates.tokens_prompt);
    }
    if (updates.tokens_completion !== undefined) {
        setClauses.push('tokens_completion = ?');
        values.push(updates.tokens_completion);
    }
    if (setClauses.length > 0) {
        values.push(id);
        db.prepare(`
            UPDATE messages SET ${setClauses.join(', ')} WHERE id = ?
        `).run(...values);
    }
}
/**
 * Get a message by ID
 */
function getMessageById(id) {
    const db = (0, index_1.getDatabase)();
    const message = db.prepare(`
        SELECT * FROM messages WHERE id = ?
    `).get(id);
    return message || null;
}
/**
 * Get all messages for a chat, ordered by creation time
 */
function getMessagesByChat(chatId) {
    const db = (0, index_1.getDatabase)();
    return db.prepare(`
        SELECT * FROM messages 
        WHERE chat_id = ? 
        ORDER BY created_at ASC
    `).all(chatId);
}
/**
 * Get last N messages for a chat (for context restoration)
 */
function getLastNMessages(chatId, n) {
    const db = (0, index_1.getDatabase)();
    return db.prepare(`
        SELECT * FROM messages 
        WHERE chat_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(chatId, n).reverse();
}
/**
 * Get messages count for a chat
 */
function getMessagesCount(chatId) {
    const db = (0, index_1.getDatabase)();
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE chat_id = ?
    `).get(chatId);
    return result.count;
}
/**
 * Delete a message and all messages after it
 * Used for undo/rollback feature
 */
function deleteMessagesFromPoint(chatId, fromMessageId) {
    const db = (0, index_1.getDatabase)();
    // Get the message's created_at time
    const message = getMessageById(fromMessageId);
    if (!message)
        return;
    // Delete this message and all after it
    db.prepare(`
        DELETE FROM messages 
        WHERE chat_id = ? AND created_at >= ?
    `).run(chatId, message.created_at);
}
/**
 * Delete a single message
 */
function deleteMessage(id) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
}

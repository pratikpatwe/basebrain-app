/**
 * Messages Repository - CRUD operations for chat messages
 */

import { getDatabase, generateId } from '../index';
import { touchChat, getChatById, updateChatTitle, generateChatTitle } from './chats';

export interface Message {
    id: string;
    chat_id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    thinking: string | null;
    tool_calls: string | null;      // JSON string
    tool_results: string | null;    // JSON string
    tokens_prompt: number;
    tokens_completion: number;
    created_at: string;
}

export interface MessageInput {
    chat_id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content?: string;
    thinking?: string;
    tool_calls?: unknown[];         // Will be JSON stringified
    tool_results?: unknown[];       // Will be JSON stringified  
    tokens_prompt?: number;
    tokens_completion?: number;
}

/**
 * Save a message to the database
 * Also updates the chat's updated_at timestamp
 * Auto-generates chat title from first user message
 */
export function saveMessage(input: MessageInput): Message {
    const db = getDatabase();
    const id = generateId();

    const toolCallsJson = input.tool_calls ? JSON.stringify(input.tool_calls) : null;
    const toolResultsJson = input.tool_results ? JSON.stringify(input.tool_results) : null;

    db.prepare(`
        INSERT INTO messages (
            id, chat_id, role, content, thinking, 
            tool_calls, tool_results, tokens_prompt, tokens_completion, created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(
        id,
        input.chat_id,
        input.role,
        input.content || null,
        input.thinking || null,
        toolCallsJson,
        toolResultsJson,
        input.tokens_prompt || 0,
        input.tokens_completion || 0
    );

    // Update chat's updated_at
    touchChat(input.chat_id);

    // Auto-generate title if this is the first user message
    if (input.role === 'user' && input.content) {
        const chat = getChatById(input.chat_id);
        if (chat && !chat.title) {
            const title = generateChatTitle(input.content);
            updateChatTitle(input.chat_id, title);
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
export function updateMessage(id: string, updates: Partial<MessageInput>): void {
    const db = getDatabase();

    const setClauses: string[] = [];
    const values: unknown[] = [];

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
export function getMessageById(id: string): Message | null {
    const db = getDatabase();
    const message = db.prepare(`
        SELECT * FROM messages WHERE id = ?
    `).get(id) as Message | undefined;

    return message || null;
}

/**
 * Get all messages for a chat, ordered by creation time
 */
export function getMessagesByChat(chatId: string): Message[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM messages 
        WHERE chat_id = ? 
        ORDER BY created_at ASC
    `).all(chatId) as Message[];
}

/**
 * Get last N messages for a chat (for context restoration)
 */
export function getLastNMessages(chatId: string, n: number): Message[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM messages 
        WHERE chat_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
    `).all(chatId, n).reverse() as Message[];
}

/**
 * Get messages count for a chat
 */
export function getMessagesCount(chatId: string): number {
    const db = getDatabase();
    const result = db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE chat_id = ?
    `).get(chatId) as { count: number };

    return result.count;
}

/**
 * Delete a message and all messages after it
 * Used for undo/rollback feature
 */
export function deleteMessagesFromPoint(chatId: string, fromMessageId: string): void {
    const db = getDatabase();

    // Get the message's created_at time
    const message = getMessageById(fromMessageId);
    if (!message) return;

    // Delete this message and all after it
    db.prepare(`
        DELETE FROM messages 
        WHERE chat_id = ? AND created_at >= ?
    `).run(chatId, message.created_at);
}

/**
 * Delete a single message
 */
export function deleteMessage(id: string): void {
    const db = getDatabase();
    db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
}

/**
 * Database Module - SQLite database initialization and management
 * Uses better-sqlite3 for synchronous, fast database operations
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

// Database instance
let db: Database.Database | null = null;

/**
 * Get the database file path
 * Stored in userData folder so it persists across app updates
 * and gets deleted when app is uninstalled
 */
function getDatabasePath(): string {
    const userDataPath = app.getPath('userData');
    return path.join(userDataPath, 'basebrain.db');
}

/**
 * Initialize the database
 * Creates tables if they don't exist
 */
export function initializeDatabase(): Database.Database {
    if (db) return db;

    const dbPath = getDatabasePath();

    // Ensure directory exists
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('[Database] Initializing at:', dbPath);

    // Create database connection
    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create schema
    createSchema(db);

    console.log('[Database] Initialized successfully');

    return db;
}

/**
 * Create database schema
 */
function createSchema(database: Database.Database): void {
    // Projects table - folders that user opens
    database.exec(`
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            path TEXT NOT NULL UNIQUE,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Chats table - conversations within projects
    database.exec(`
        CREATE TABLE IF NOT EXISTS chats (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            title TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    `);

    // Messages table - individual messages in chats
    database.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chat_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT,
            thinking TEXT,
            tool_calls TEXT,
            tool_results TEXT,
            tokens_prompt INTEGER DEFAULT 0,
            tokens_completion INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
        )
    `);

    // File snapshots for undo/rollback feature
    database.exec(`
        CREATE TABLE IF NOT EXISTS file_snapshots (
            id TEXT PRIMARY KEY,
            message_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            action TEXT NOT NULL,
            content_before TEXT,
            content_after TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        )
    `);

    // App state - stores UI state for restoration
    database.exec(`
        CREATE TABLE IF NOT EXISTS app_state (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create indexes for faster queries
    database.exec(`
        CREATE INDEX IF NOT EXISTS idx_chats_project ON chats(project_id);
        CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
        CREATE INDEX IF NOT EXISTS idx_snapshots_message ON file_snapshots(message_id);
        CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
    `);

    console.log('[Database] Schema created/verified');
}

/**
 * Get the database instance
 * Throws if not initialized
 */
export function getDatabase(): Database.Database {
    if (!db) {
        throw new Error('Database not initialized. Call initializeDatabase() first.');
    }
    return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        db = null;
        console.log('[Database] Connection closed');
    }
}

/**
 * Generate a UUID v4
 */
export function generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

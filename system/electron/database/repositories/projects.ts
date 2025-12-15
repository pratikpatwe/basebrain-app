/**
 * Projects Repository - CRUD operations for projects (folders)
 */

import { getDatabase, generateId } from '../index';

export interface Project {
    id: string;
    path: string;
    name: string;
    created_at: string;
    last_accessed_at: string;
}

/**
 * Get or create a project for a folder path
 * If project exists, updates last_accessed_at
 * If not, creates a new project
 */
export function getOrCreateProject(folderPath: string): Project {
    const db = getDatabase();

    // Check if project exists
    const existing = db.prepare(`
        SELECT * FROM projects WHERE path = ?
    `).get(folderPath) as Project | undefined;

    if (existing) {
        // Update last accessed time
        db.prepare(`
            UPDATE projects SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(existing.id);

        return {
            ...existing,
            last_accessed_at: new Date().toISOString()
        };
    }

    // Create new project
    const id = generateId();
    const name = folderPath.split(/[\\/]/).pop() || folderPath;

    db.prepare(`
        INSERT INTO projects (id, path, name, created_at, last_accessed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, folderPath, name);

    return {
        id,
        path: folderPath,
        name,
        created_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString()
    };
}

/**
 * Get a project by ID
 */
export function getProjectById(id: string): Project | null {
    const db = getDatabase();
    const project = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(id) as Project | undefined;

    return project || null;
}

/**
 * Get a project by path
 */
export function getProjectByPath(path: string): Project | null {
    const db = getDatabase();
    const project = db.prepare(`
        SELECT * FROM projects WHERE path = ?
    `).get(path) as Project | undefined;

    return project || null;
}

/**
 * Get all projects, ordered by last accessed
 */
export function getAllProjects(): Project[] {
    const db = getDatabase();
    return db.prepare(`
        SELECT * FROM projects ORDER BY last_accessed_at DESC
    `).all() as Project[];
}

/**
 * Delete a project and all its chats/messages
 */
export function deleteProject(id: string): void {
    const db = getDatabase();
    db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}

/**
 * Update project's last accessed time
 */
export function touchProject(id: string): void {
    const db = getDatabase();
    db.prepare(`
        UPDATE projects SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
}

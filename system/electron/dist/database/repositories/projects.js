"use strict";
/**
 * Projects Repository - CRUD operations for projects (folders)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateProject = getOrCreateProject;
exports.getProjectById = getProjectById;
exports.getProjectByPath = getProjectByPath;
exports.getAllProjects = getAllProjects;
exports.deleteProject = deleteProject;
exports.touchProject = touchProject;
const index_1 = require("../index");
/**
 * Get or create a project for a folder path
 * If project exists, updates last_accessed_at
 * If not, creates a new project
 */
function getOrCreateProject(folderPath) {
    const db = (0, index_1.getDatabase)();
    // Check if project exists
    const existing = db.prepare(`
        SELECT * FROM projects WHERE path = ?
    `).get(folderPath);
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
    const id = (0, index_1.generateId)();
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
function getProjectById(id) {
    const db = (0, index_1.getDatabase)();
    const project = db.prepare(`
        SELECT * FROM projects WHERE id = ?
    `).get(id);
    return project || null;
}
/**
 * Get a project by path
 */
function getProjectByPath(path) {
    const db = (0, index_1.getDatabase)();
    const project = db.prepare(`
        SELECT * FROM projects WHERE path = ?
    `).get(path);
    return project || null;
}
/**
 * Get all projects, ordered by last accessed
 */
function getAllProjects() {
    const db = (0, index_1.getDatabase)();
    return db.prepare(`
        SELECT * FROM projects ORDER BY last_accessed_at DESC
    `).all();
}
/**
 * Delete a project and all its chats/messages
 */
function deleteProject(id) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`DELETE FROM projects WHERE id = ?`).run(id);
}
/**
 * Update project's last accessed time
 */
function touchProject(id) {
    const db = (0, index_1.getDatabase)();
    db.prepare(`
        UPDATE projects SET last_accessed_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(id);
}

"use strict";
/**
 * Rollback Service - Handles undoing file changes made by AI
 * Restores files to their previous state and removes messages after the rollback point
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.rollbackToMessage = rollbackToMessage;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const snapshots_1 = require("../database/repositories/snapshots");
const messages_1 = require("../database/repositories/messages");
/**
 * Rollback to a specific message point
 * This will:
 * 1. Get all file snapshots for messages after this point
 * 2. Revert file changes in reverse order
 * 3. Delete messages and snapshots after this point
 */
async function rollbackToMessage(chatId, messageId, projectPath) {
    const restoredFiles = [];
    try {
        // Verify the message exists
        const message = (0, messages_1.getMessageById)(messageId);
        if (!message) {
            return { success: false, restoredFiles: [], error: "Message not found" };
        }
        // Get all snapshots for messages after this point (in reverse order)
        const snapshots = (0, snapshots_1.getSnapshotsAfterMessage)(chatId, messageId);
        console.log(`[Rollback] Found ${snapshots.length} file snapshots to revert`);
        // Revert each snapshot in reverse order (newest first)
        for (const snapshot of snapshots) {
            try {
                await revertSnapshot(snapshot, projectPath);
                restoredFiles.push(snapshot.file_path);
                console.log(`[Rollback] Reverted: ${snapshot.file_path} (${snapshot.action})`);
            }
            catch (error) {
                console.error(`[Rollback] Failed to revert ${snapshot.file_path}:`, error);
                // Continue with other files even if one fails
            }
        }
        // Delete messages from this point onwards (this also cascades to delete snapshots)
        (0, messages_1.deleteMessagesFromPoint)(chatId, messageId);
        console.log(`[Rollback] Completed. Restored ${restoredFiles.length} files`);
        return { success: true, restoredFiles };
    }
    catch (error) {
        console.error("[Rollback] Error:", error);
        return {
            success: false,
            restoredFiles,
            error: error.message
        };
    }
}
/**
 * Revert a single file snapshot
 */
async function revertSnapshot(snapshot, projectPath) {
    const absolutePath = path.resolve(projectPath, snapshot.file_path);
    console.log(`[Rollback] Reverting snapshot:`, {
        path: snapshot.file_path,
        action: snapshot.action,
        hasContentBefore: !!snapshot.content_before,
        contentBeforeLength: snapshot.content_before?.length
    });
    switch (snapshot.action) {
        case 'created':
            // File was created - delete it
            console.log(`[Rollback] Deleting created file: ${absolutePath}`);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
                // Try to remove empty parent directories
                cleanupEmptyDirs(path.dirname(absolutePath), projectPath);
            }
            break;
        case 'modified':
            // File was modified - restore original content
            console.log(`[Rollback] Restoring modified file: ${absolutePath}`);
            if (snapshot.content_before !== null) {
                fs.writeFileSync(absolutePath, snapshot.content_before, 'utf-8');
                console.log(`[Rollback] Restored ${snapshot.content_before.length} bytes`);
            }
            else {
                console.log(`[Rollback] WARNING: No content_before for modified file!`);
            }
            break;
        case 'deleted':
            // File was deleted - recreate it
            console.log(`[Rollback] Recreating deleted file: ${absolutePath}`);
            if (snapshot.content_before !== null) {
                // Ensure directory exists
                const dir = path.dirname(absolutePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
                fs.writeFileSync(absolutePath, snapshot.content_before, 'utf-8');
            }
            break;
    }
}
/**
 * Remove empty directories up to the project root
 */
function cleanupEmptyDirs(dirPath, projectPath) {
    // Don't go above project root
    if (!dirPath.startsWith(projectPath) || dirPath === projectPath) {
        return;
    }
    try {
        const files = fs.readdirSync(dirPath);
        if (files.length === 0) {
            fs.rmdirSync(dirPath);
            // Recursively check parent
            cleanupEmptyDirs(path.dirname(dirPath), projectPath);
        }
    }
    catch {
        // Ignore errors (directory might not be empty or other issues)
    }
}

/**
 * Rollback Service - Handles undoing file changes made by AI
 * Restores files to their previous state and removes messages after the rollback point
 */

import * as fs from 'fs';
import * as path from 'path';
import { getSnapshotsAfterMessage, FileSnapshot } from '../database/repositories/snapshots';
import { deleteMessagesFromPoint, getMessageById } from '../database/repositories/messages';

/**
 * Rollback to a specific message point
 * This will:
 * 1. Get all file snapshots for messages after this point
 * 2. Revert file changes in reverse order
 * 3. Delete messages and snapshots after this point
 */
export async function rollbackToMessage(
    chatId: string,
    messageId: string,
    projectPath: string
): Promise<{ success: boolean; restoredFiles: string[]; error?: string }> {
    const restoredFiles: string[] = [];

    try {
        // Verify the message exists
        const message = getMessageById(messageId);
        if (!message) {
            return { success: false, restoredFiles: [], error: "Message not found" };
        }

        // Get all snapshots for messages after this point (in reverse order)
        const snapshots = getSnapshotsAfterMessage(chatId, messageId);

        console.log(`[Rollback] Found ${snapshots.length} file snapshots to revert`);

        // Revert each snapshot in reverse order (newest first)
        for (const snapshot of snapshots) {
            try {
                await revertSnapshot(snapshot, projectPath);
                restoredFiles.push(snapshot.file_path);
                console.log(`[Rollback] Reverted: ${snapshot.file_path} (${snapshot.action})`);
            } catch (error) {
                console.error(`[Rollback] Failed to revert ${snapshot.file_path}:`, error);
                // Continue with other files even if one fails
            }
        }

        // Delete messages from this point onwards (this also cascades to delete snapshots)
        deleteMessagesFromPoint(chatId, messageId);

        console.log(`[Rollback] Completed. Restored ${restoredFiles.length} files`);

        return { success: true, restoredFiles };
    } catch (error) {
        console.error("[Rollback] Error:", error);
        return {
            success: false,
            restoredFiles,
            error: (error as Error).message
        };
    }
}

/**
 * Revert a single file snapshot
 */
async function revertSnapshot(snapshot: FileSnapshot, projectPath: string): Promise<void> {
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
            } else {
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
function cleanupEmptyDirs(dirPath: string, projectPath: string): void {
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
    } catch {
        // Ignore errors (directory might not be empty or other issues)
    }
}

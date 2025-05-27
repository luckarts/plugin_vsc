import * as vscode from 'vscode';
import { ICodeAction, IActionResult } from './types';
/**
 * Manages undo/redo operations for code actions
 * Tracks changes and provides rollback functionality
 */
export declare class UndoManager {
    private readonly context;
    private readonly undoStack;
    private readonly redoStack;
    private readonly maxUndoEntries;
    constructor(context: vscode.ExtensionContext);
    /**
     * Record an action for potential undo
     * @param action The action that was performed
     * @param result The result of the action
     * @param originalState The state before the action
     */
    recordAction(action: ICodeAction, result: IActionResult, originalState: IFileState[]): void;
    /**
     * Undo the last action
     * @returns Promise resolving to undo result
     */
    undoLastAction(): Promise<IUndoResult>;
    /**
     * Redo the last undone action
     * @returns Promise resolving to redo result
     */
    redoLastAction(): Promise<IUndoResult>;
    /**
     * Get undo history for display
     * @returns Array of undo entries
     */
    getUndoHistory(): IUndoHistoryItem[];
    /**
     * Get redo history for display
     * @returns Array of redo entries
     */
    getRedoHistory(): IUndoHistoryItem[];
    /**
     * Undo specific action by ID
     * @param undoId The ID of the action to undo
     * @returns Promise resolving to undo result
     */
    undoSpecificAction(undoId: string): Promise<IUndoResult>;
    /**
     * Clear all undo/redo history
     */
    clearHistory(): void;
    /**
     * Check if undo is available
     */
    canUndo(): boolean;
    /**
     * Check if redo is available
     */
    canRedo(): boolean;
    /**
     * Restore file states from backup
     */
    private restoreFileStates;
    /**
     * Re-apply an action for redo
     */
    private reapplyAction;
    /**
     * Generate description for undo entry
     */
    private generateUndoDescription;
    /**
     * Generate unique undo ID
     */
    private generateUndoId;
    /**
     * Show undo notification with action button
     */
    private showUndoNotification;
    /**
     * Save undo history to persistent storage
     */
    private saveUndoHistory;
    /**
     * Load undo history from persistent storage
     */
    private loadUndoHistory;
    /**
     * Create file state snapshot before action
     * @param filePaths Files that will be affected
     * @returns Promise resolving to file states
     */
    createFileStateSnapshot(filePaths: string[]): Promise<IFileState[]>;
    /**
     * Dispose resources
     */
    dispose(): void;
}
interface IUndoEntry {
    id: string;
    timestamp: number;
    action: ICodeAction;
    result: IActionResult;
    originalState: IFileState[];
    description: string;
}
interface IFileState {
    filePath: string;
    content: string;
    existed: boolean;
    lastModified: number;
}
interface IUndoResult {
    success: boolean;
    message: string;
    undoEntry: IUndoEntry | null;
}
interface IUndoHistoryItem {
    id: string;
    description: string;
    timestamp: number;
    actionType: string;
    filesAffected: string[];
}
export {};
//# sourceMappingURL=undoManager.d.ts.map
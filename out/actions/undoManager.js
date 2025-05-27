"use strict";
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
exports.UndoManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
/**
 * Manages undo/redo operations for code actions
 * Tracks changes and provides rollback functionality
 */
class UndoManager {
    constructor(context) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxUndoEntries = 50;
        this.context = context;
        this.loadUndoHistory();
    }
    /**
     * Record an action for potential undo
     * @param action The action that was performed
     * @param result The result of the action
     * @param originalState The state before the action
     */
    recordAction(action, result, originalState) {
        if (!result.success) {
            return; // Don't record failed actions
        }
        const undoEntry = {
            id: this.generateUndoId(),
            timestamp: Date.now(),
            action,
            result,
            originalState,
            description: this.generateUndoDescription(action, result)
        };
        // Add to undo stack
        this.undoStack.push(undoEntry);
        // Clear redo stack (new action invalidates redo)
        this.redoStack.length = 0;
        // Limit stack size
        if (this.undoStack.length > this.maxUndoEntries) {
            this.undoStack.shift();
        }
        // Save to persistent storage
        this.saveUndoHistory();
        // Show undo notification
        this.showUndoNotification(undoEntry);
    }
    /**
     * Undo the last action
     * @returns Promise resolving to undo result
     */
    async undoLastAction() {
        if (this.undoStack.length === 0) {
            return {
                success: false,
                message: 'No actions to undo',
                undoEntry: null
            };
        }
        const undoEntry = this.undoStack.pop();
        try {
            // Restore original state
            await this.restoreFileStates(undoEntry.originalState);
            // Move to redo stack
            this.redoStack.push(undoEntry);
            // Save history
            this.saveUndoHistory();
            return {
                success: true,
                message: `Undid: ${undoEntry.description}`,
                undoEntry
            };
        }
        catch (error) {
            // Put back on undo stack if restoration failed
            this.undoStack.push(undoEntry);
            return {
                success: false,
                message: `Failed to undo: ${error instanceof Error ? error.message : 'Unknown error'}`,
                undoEntry
            };
        }
    }
    /**
     * Redo the last undone action
     * @returns Promise resolving to redo result
     */
    async redoLastAction() {
        if (this.redoStack.length === 0) {
            return {
                success: false,
                message: 'No actions to redo',
                undoEntry: null
            };
        }
        const redoEntry = this.redoStack.pop();
        try {
            // Re-apply the action
            await this.reapplyAction(redoEntry);
            // Move back to undo stack
            this.undoStack.push(redoEntry);
            // Save history
            this.saveUndoHistory();
            return {
                success: true,
                message: `Redid: ${redoEntry.description}`,
                undoEntry: redoEntry
            };
        }
        catch (error) {
            // Put back on redo stack if reapplication failed
            this.redoStack.push(redoEntry);
            return {
                success: false,
                message: `Failed to redo: ${error instanceof Error ? error.message : 'Unknown error'}`,
                undoEntry: redoEntry
            };
        }
    }
    /**
     * Get undo history for display
     * @returns Array of undo entries
     */
    getUndoHistory() {
        return this.undoStack.map(entry => ({
            id: entry.id,
            description: entry.description,
            timestamp: entry.timestamp,
            actionType: entry.action.type,
            filesAffected: entry.result.filesModified.concat(entry.result.filesCreated)
        }));
    }
    /**
     * Get redo history for display
     * @returns Array of redo entries
     */
    getRedoHistory() {
        return this.redoStack.map(entry => ({
            id: entry.id,
            description: entry.description,
            timestamp: entry.timestamp,
            actionType: entry.action.type,
            filesAffected: entry.result.filesModified.concat(entry.result.filesCreated)
        }));
    }
    /**
     * Undo specific action by ID
     * @param undoId The ID of the action to undo
     * @returns Promise resolving to undo result
     */
    async undoSpecificAction(undoId) {
        const entryIndex = this.undoStack.findIndex(entry => entry.id === undoId);
        if (entryIndex === -1) {
            return {
                success: false,
                message: 'Action not found in undo history',
                undoEntry: null
            };
        }
        // For now, only allow undoing the most recent action
        // Complex selective undo would require dependency analysis
        if (entryIndex !== this.undoStack.length - 1) {
            return {
                success: false,
                message: 'Can only undo the most recent action. Use "Undo Last" instead.',
                undoEntry: null
            };
        }
        return this.undoLastAction();
    }
    /**
     * Clear all undo/redo history
     */
    clearHistory() {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
        this.saveUndoHistory();
    }
    /**
     * Check if undo is available
     */
    canUndo() {
        return this.undoStack.length > 0;
    }
    /**
     * Check if redo is available
     */
    canRedo() {
        return this.redoStack.length > 0;
    }
    /**
     * Restore file states from backup
     */
    async restoreFileStates(fileStates) {
        for (const fileState of fileStates) {
            try {
                if (fileState.existed) {
                    // Restore original content
                    const uri = vscode.Uri.file(fileState.filePath);
                    const encoder = new TextEncoder();
                    await vscode.workspace.fs.writeFile(uri, encoder.encode(fileState.content));
                }
                else {
                    // Delete file that was created
                    const uri = vscode.Uri.file(fileState.filePath);
                    try {
                        await vscode.workspace.fs.delete(uri);
                    }
                    catch {
                        // File might not exist, ignore
                    }
                }
            }
            catch (error) {
                console.error(`Failed to restore file ${fileState.filePath}:`, error);
                throw error;
            }
        }
    }
    /**
     * Re-apply an action for redo
     */
    async reapplyAction(undoEntry) {
        // This would re-execute the original action
        // For now, we'll restore from the result state
        // In a full implementation, we'd re-run the action executor
        for (const filePath of undoEntry.result.filesCreated) {
            // Re-create files that were created
            // We'd need to store the created content in the undo entry
            console.log(`Would re-create file: ${filePath}`);
        }
        for (const filePath of undoEntry.result.filesModified) {
            // Re-apply modifications
            // We'd need to store the modified content in the undo entry
            console.log(`Would re-modify file: ${filePath}`);
        }
    }
    /**
     * Generate description for undo entry
     */
    generateUndoDescription(action, result) {
        const actionTypeMap = {
            'CREATE_FILE': 'Create file',
            'CREATE_FUNCTION': 'Create function',
            'CREATE_CLASS': 'Create class',
            'CREATE_COMPONENT': 'Create component',
            'APPLY_MODIFICATION': 'Modify code',
            'FIX_ERROR': 'Fix error',
            'REFACTOR_CODE': 'Refactor code',
            'ADD_IMPORT': 'Add import',
            'REMOVE_CODE': 'Remove code'
        };
        const actionName = actionTypeMap[action.type] || 'Code action';
        if (result.filesCreated.length > 0) {
            const fileName = path.basename(result.filesCreated[0]);
            return `${actionName}: ${fileName}`;
        }
        if (result.filesModified.length > 0) {
            const fileName = path.basename(result.filesModified[0]);
            return `${actionName} in ${fileName}`;
        }
        return actionName;
    }
    /**
     * Generate unique undo ID
     */
    generateUndoId() {
        return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Show undo notification with action button
     */
    showUndoNotification(undoEntry) {
        const message = `${undoEntry.description} completed`;
        vscode.window.showInformationMessage(message, 'Undo').then(selection => {
            if (selection === 'Undo') {
                this.undoLastAction().then(result => {
                    if (result.success) {
                        vscode.window.showInformationMessage(result.message);
                    }
                    else {
                        vscode.window.showErrorMessage(result.message);
                    }
                });
            }
        });
    }
    /**
     * Save undo history to persistent storage
     */
    saveUndoHistory() {
        try {
            const historyData = {
                undoStack: this.undoStack.map(entry => ({
                    ...entry,
                    // Don't store large content in persistent storage
                    originalState: entry.originalState.map(state => ({
                        ...state,
                        content: state.content.length > 10000 ? '[Content too large]' : state.content
                    }))
                })),
                redoStack: this.redoStack.map(entry => ({
                    ...entry,
                    originalState: entry.originalState.map(state => ({
                        ...state,
                        content: state.content.length > 10000 ? '[Content too large]' : state.content
                    }))
                }))
            };
            this.context.globalState.update('codeAssist.undoHistory', historyData);
        }
        catch (error) {
            console.error('Failed to save undo history:', error);
        }
    }
    /**
     * Load undo history from persistent storage
     */
    loadUndoHistory() {
        try {
            const historyData = this.context.globalState.get('codeAssist.undoHistory');
            if (historyData) {
                this.undoStack.push(...(historyData.undoStack || []));
                this.redoStack.push(...(historyData.redoStack || []));
            }
        }
        catch (error) {
            console.error('Failed to load undo history:', error);
        }
    }
    /**
     * Create file state snapshot before action
     * @param filePaths Files that will be affected
     * @returns Promise resolving to file states
     */
    async createFileStateSnapshot(filePaths) {
        const fileStates = [];
        for (const filePath of filePaths) {
            try {
                const uri = vscode.Uri.file(filePath);
                try {
                    const content = await vscode.workspace.fs.readFile(uri);
                    const textContent = new TextDecoder().decode(content);
                    fileStates.push({
                        filePath,
                        content: textContent,
                        existed: true,
                        lastModified: Date.now()
                    });
                }
                catch {
                    // File doesn't exist
                    fileStates.push({
                        filePath,
                        content: '',
                        existed: false,
                        lastModified: Date.now()
                    });
                }
            }
            catch (error) {
                console.error(`Failed to create snapshot for ${filePath}:`, error);
            }
        }
        return fileStates;
    }
    /**
     * Dispose resources
     */
    dispose() {
        this.saveUndoHistory();
    }
}
exports.UndoManager = UndoManager;
//# sourceMappingURL=undoManager.js.map
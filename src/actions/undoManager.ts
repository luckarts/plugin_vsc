import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ICodeAction, IActionResult } from './types';

/**
 * Manages undo/redo operations for code actions
 * Tracks changes and provides rollback functionality
 */
export class UndoManager {
  private readonly context: vscode.ExtensionContext;
  private readonly undoStack: IUndoEntry[] = [];
  private readonly redoStack: IUndoEntry[] = [];
  private readonly maxUndoEntries = 50;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.loadUndoHistory();
  }

  /**
   * Record an action for potential undo
   * @param action The action that was performed
   * @param result The result of the action
   * @param originalState The state before the action
   */
  recordAction(
    action: ICodeAction,
    result: IActionResult,
    originalState: IFileState[]
  ): void {
    if (!result.success) {
      return; // Don't record failed actions
    }

    const undoEntry: IUndoEntry = {
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
  async undoLastAction(): Promise<IUndoResult> {
    if (this.undoStack.length === 0) {
      return {
        success: false,
        message: 'No actions to undo',
        undoEntry: null
      };
    }

    const undoEntry = this.undoStack.pop()!;

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

    } catch (error) {
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
  async redoLastAction(): Promise<IUndoResult> {
    if (this.redoStack.length === 0) {
      return {
        success: false,
        message: 'No actions to redo',
        undoEntry: null
      };
    }

    const redoEntry = this.redoStack.pop()!;

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

    } catch (error) {
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
  getUndoHistory(): IUndoHistoryItem[] {
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
  getRedoHistory(): IUndoHistoryItem[] {
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
  async undoSpecificAction(undoId: string): Promise<IUndoResult> {
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
  clearHistory(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.saveUndoHistory();
  }

  /**
   * Check if undo is available
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * Check if redo is available
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * Restore file states from backup
   */
  private async restoreFileStates(fileStates: IFileState[]): Promise<void> {
    for (const fileState of fileStates) {
      try {
        if (fileState.existed) {
          // Restore original content
          const uri = vscode.Uri.file(fileState.filePath);
          const encoder = new TextEncoder();
          await vscode.workspace.fs.writeFile(uri, encoder.encode(fileState.content));
        } else {
          // Delete file that was created
          const uri = vscode.Uri.file(fileState.filePath);
          try {
            await vscode.workspace.fs.delete(uri);
          } catch {
            // File might not exist, ignore
          }
        }
      } catch (error) {
        console.error(`Failed to restore file ${fileState.filePath}:`, error);
        throw error;
      }
    }
  }

  /**
   * Re-apply an action for redo
   */
  private async reapplyAction(undoEntry: IUndoEntry): Promise<void> {
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
  private generateUndoDescription(action: ICodeAction, result: IActionResult): string {
    const actionTypeMap: Record<string, string> = {
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
  private generateUndoId(): string {
    return `undo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Show undo notification with action button
   */
  private showUndoNotification(undoEntry: IUndoEntry): void {
    const message = `${undoEntry.description} completed`;
    
    vscode.window.showInformationMessage(
      message,
      'Undo'
    ).then(selection => {
      if (selection === 'Undo') {
        this.undoLastAction().then(result => {
          if (result.success) {
            vscode.window.showInformationMessage(result.message);
          } else {
            vscode.window.showErrorMessage(result.message);
          }
        });
      }
    });
  }

  /**
   * Save undo history to persistent storage
   */
  private saveUndoHistory(): void {
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
    } catch (error) {
      console.error('Failed to save undo history:', error);
    }
  }

  /**
   * Load undo history from persistent storage
   */
  private loadUndoHistory(): void {
    try {
      const historyData = this.context.globalState.get<any>('codeAssist.undoHistory');
      
      if (historyData) {
        this.undoStack.push(...(historyData.undoStack || []));
        this.redoStack.push(...(historyData.redoStack || []));
      }
    } catch (error) {
      console.error('Failed to load undo history:', error);
    }
  }

  /**
   * Create file state snapshot before action
   * @param filePaths Files that will be affected
   * @returns Promise resolving to file states
   */
  async createFileStateSnapshot(filePaths: string[]): Promise<IFileState[]> {
    const fileStates: IFileState[] = [];

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
        } catch {
          // File doesn't exist
          fileStates.push({
            filePath,
            content: '',
            existed: false,
            lastModified: Date.now()
          });
        }
      } catch (error) {
        console.error(`Failed to create snapshot for ${filePath}:`, error);
      }
    }

    return fileStates;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.saveUndoHistory();
  }
}

// Interfaces for undo system
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

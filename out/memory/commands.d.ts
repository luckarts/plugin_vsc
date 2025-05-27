/**
 * VSCode commands for the intelligent memory system
 */
import * as vscode from 'vscode';
import { IntelligentMemoryManager } from './memoryManager';
export declare class MemoryCommands {
    private memoryManager;
    constructor(memoryManager: IntelligentMemoryManager);
    /**
     * Register all memory-related commands
     */
    registerCommands(context: vscode.ExtensionContext): void;
    /**
     * Add a new memory through input dialog
     */
    private addMemory;
    /**
     * Add selected text as a memory
     */
    private addSelectionToMemory;
    /**
     * Search memories and display results
     */
    private searchMemories;
    /**
     * Open memory panel (placeholder for webview)
     */
    private openMemoryPanel;
    /**
     * Compress memories manually
     */
    private compressMemories;
    /**
     * Optimize memory storage
     */
    private optimizeStorage;
    /**
     * Show memory statistics
     */
    private showMemoryStats;
    /**
     * Export memories
     */
    private exportMemories;
    /**
     * Import memories
     */
    private importMemories;
    /**
     * Create backup
     */
    private createBackup;
    /**
     * Restore from backup
     */
    private restoreBackup;
    /**
     * Add memory of specific type
     */
    private addMemoryOfType;
}
//# sourceMappingURL=commands.d.ts.map
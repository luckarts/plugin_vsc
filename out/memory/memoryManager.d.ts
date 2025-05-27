/**
 * Intelligent Memory Manager
 * Core implementation of the advanced memory system inspired by Augment
 */
import * as vscode from 'vscode';
import { IMemoryManager, IMemory, IMemoryStats, IMemoryFilters, IMemorySearchResult, IMemoryBackup, IMemoryImportResult, IMemoryExportOptions, IMemoryEvent, IMemoryMetadata, MemoryType } from './types';
export declare class IntelligentMemoryManager implements IMemoryManager {
    private storageService;
    private compressionService;
    private eventCallbacks;
    private isInitialized;
    private autoCompressionTimer?;
    constructor(globalStorageUri: vscode.Uri);
    /**
     * Initialize the memory manager
     */
    initialize(): Promise<void>;
    /**
     * Create a new memory
     */
    createMemory(content: string, type: MemoryType, tags?: string[], metadata?: Partial<IMemoryMetadata>): Promise<string>;
    /**
     * Get a memory by ID
     */
    getMemory(id: string): Promise<IMemory | null>;
    /**
     * Update a memory
     */
    updateMemory(id: string, updates: Partial<IMemory>): Promise<void>;
    /**
     * Delete a memory
     */
    deleteMemory(id: string): Promise<void>;
    /**
     * Search memories
     */
    searchMemories(query: string, filters?: IMemoryFilters): Promise<IMemorySearchResult[]>;
    /**
     * Get memories by type
     */
    getMemoriesByType(type: MemoryType): Promise<IMemory[]>;
    /**
     * Get memories by tags
     */
    getMemoriesByTags(tags: string[]): Promise<IMemory[]>;
    /**
     * Get memory statistics
     */
    getStats(): Promise<IMemoryStats>;
    /**
     * Get total memory usage in bytes
     */
    getMemoryUsage(): Promise<number>;
    /**
     * Compress memories
     */
    compressMemories(): Promise<void>;
    /**
     * Optimize storage
     */
    optimizeStorage(): Promise<void>;
    /**
     * Export memories
     */
    exportMemories(options?: IMemoryExportOptions): Promise<string>;
    /**
     * Import memories
     */
    importMemories(data: string, format?: 'json' | 'markdown'): Promise<IMemoryImportResult>;
    /**
     * Create backup
     */
    createBackup(): Promise<IMemoryBackup>;
    /**
     * Restore from backup
     */
    restoreFromBackup(backup: IMemoryBackup): Promise<IMemoryImportResult>;
    /**
     * Register event callback
     */
    onMemoryEvent(callback: (event: IMemoryEvent) => void): void;
    /**
     * Dispose resources
     */
    dispose(): Promise<void>;
    private ensureInitialized;
    private validateMemoryInput;
    private validateContent;
    private validateMemoryObject;
    private sanitizeTags;
    private emitEvent;
    private startAutoCompression;
    private checkAndCompress;
    private cleanupOldSessionMemories;
    private formatAsMarkdown;
    private formatAsCSV;
}
//# sourceMappingURL=memoryManager.d.ts.map
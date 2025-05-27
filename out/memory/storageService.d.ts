/**
 * Storage service for the intelligent memory system
 * Handles persistent storage of memories using VSCode's file system API
 */
import * as vscode from 'vscode';
import { IStorageService, IMemory, IMemoryStats, IMemoryFilters, IMemorySearchResult, IMemoryBackup, IMemoryImportResult } from './types';
export declare class StorageService implements IStorageService {
    private storageUri;
    private memoriesUri;
    private backupsUri;
    private indexUri;
    private memoryIndex;
    private isInitialized;
    constructor(globalStorageUri: vscode.Uri);
    /**
     * Initialize the storage service
     */
    initialize(): Promise<void>;
    /**
     * Save a memory to storage
     */
    save(memory: IMemory): Promise<void>;
    /**
     * Load a memory by ID
     */
    load(id: string): Promise<IMemory | null>;
    /**
     * Load all memories
     */
    loadAll(): Promise<IMemory[]>;
    /**
     * Delete a memory
     */
    delete(id: string): Promise<void>;
    /**
     * Search memories
     */
    search(query: string, filters?: IMemoryFilters): Promise<IMemorySearchResult[]>;
    /**
     * Get storage statistics
     */
    getStats(): Promise<IMemoryStats>;
    /**
     * Create a backup
     */
    backup(): Promise<IMemoryBackup>;
    /**
     * Restore from backup
     */
    restore(backup: IMemoryBackup): Promise<IMemoryImportResult>;
    /**
     * Clear all memories
     */
    clear(): Promise<void>;
    private ensureInitialized;
    private ensureDirectoryExists;
    private validateMemory;
    private loadIndex;
    private saveIndex;
    private matchesFilters;
    private calculateRelevanceScore;
    private getMatchedFields;
    private generateSnippet;
    private calculateChecksum;
    private cleanOldBackups;
}
//# sourceMappingURL=storageService.d.ts.map
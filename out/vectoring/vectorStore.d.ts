import * as vscode from 'vscode';
import { IVectorStore, IVectorEntry } from './types';
/**
 * Simple file-based vector store optimized for VSCode extensions
 * Stores vectors in JSON format with efficient similarity search
 */
export declare class FileVectorStore implements IVectorStore {
    private readonly storageUri;
    private readonly indexFile;
    private readonly dataFile;
    private vectorIndex;
    private isInitialized;
    constructor(storageUri: vscode.Uri);
    /**
     * Initialize the vector store
     */
    initialize(): Promise<void>;
    /**
     * Store vector entries
     * @param entries Array of vector entries to store
     */
    store(entries: IVectorEntry[]): Promise<void>;
    /**
     * Search for similar vectors using cosine similarity
     * @param queryVector Query vector
     * @param limit Maximum number of results
     * @returns Array of similar vector entries with similarity scores
     */
    search(queryVector: number[], limit?: number): Promise<IVectorEntry[]>;
    /**
     * Delete vector entries by chunk IDs
     * @param chunkIds Array of chunk IDs to delete
     */
    delete(chunkIds: string[]): Promise<void>;
    /**
     * Clear all vectors
     */
    clear(): Promise<void>;
    /**
     * Get the number of stored vectors
     */
    getSize(): Promise<number>;
    /**
     * Load index from disk
     */
    private loadIndex;
    /**
     * Save index to disk
     */
    private saveIndex;
    /**
     * Calculate cosine similarity between two vectors
     * @param a First vector
     * @param b Second vector
     * @returns Similarity score between 0 and 1
     */
    private cosineSimilarity;
    /**
     * Get storage statistics
     */
    getStats(): Promise<{
        size: number;
        lastUpdated: number;
        storageSize: number;
    }>;
    /**
     * Optimize storage by removing duplicate vectors
     */
    optimize(): Promise<void>;
    /**
     * Export vectors to a backup file
     */
    exportBackup(backupPath: string): Promise<void>;
}
//# sourceMappingURL=vectorStore.d.ts.map
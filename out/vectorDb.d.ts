import * as vscode from 'vscode';
import { ContextualRetriever } from './contextual/contextualRetriever';
import { IVectorDatabase, ISearchResult, IIndexStats, IIndexingProgress } from './vectoring/types';
export declare class VectorDatabase implements IVectorDatabase {
    private readonly storageUri;
    private readonly embeddingProvider;
    private readonly vectorStore;
    private readonly contextualRetriever;
    private isInitialized;
    private indexingProgress;
    private readonly config;
    constructor(globalStorageUri: vscode.Uri);
    /**
     * Initialize the vector database
     */
    initialize(): Promise<void>;
    /**
     * Index entire workspace
     */
    indexWorkspace(workspacePath?: string): Promise<void>;
    /**
     * Index a single file
     */
    indexFile(filePath: string): Promise<void>;
    /**
     * Search for relevant code based on query
     */
    search(query: string, limit?: number): Promise<ISearchResult[]>;
    /**
     * Get relevant code snippets for a query using contextual retrieval
     */
    getRelevantCode(query: string, limit?: number): Promise<string[]>;
    /**
     * Delete indexed data for a file
     */
    deleteFile(filePath: string): Promise<void>;
    /**
     * Clear all indexed data
     */
    clear(): Promise<void>;
    /**
     * Get database statistics
     */
    getStats(): Promise<IIndexStats>;
    /**
     * Get current indexing progress
     */
    getIndexingProgress(): IIndexingProgress | null;
    private initStorage;
    /**
     * Find files to index in workspace
     */
    private findFilesToIndex;
    /**
     * Process files in batches optimized for i5-7300U
     */
    private processFilesInBatches;
    /**
     * Process promises with limited concurrency
     */
    private processConcurrently;
    /**
     * Utility sleep function
     */
    private sleep;
    /**
     * Initialize vector database with progress tracking
     */
    initializeWithProgress(): Promise<void>;
    /**
     * Index workspace with progress tracking
     */
    indexWorkspaceWithProgress(): Promise<void>;
    /**
     * Get contextual search statistics
     */
    getContextualStats(): Promise<any>;
    /**
     * Explain contextual ranking for debugging
     */
    explainContextualRanking(query: string): Promise<string[]>;
    /**
     * Get recently modified files
     */
    getRecentlyModifiedFiles(maxAge?: number): Promise<string[]>;
    /**
     * Get files near the active file
     */
    getNearbyFiles(maxResults?: number): Promise<Array<{
        path: string;
        score: number;
    }>>;
    /**
     * Get contextual retriever instance for advanced usage
     */
    getContextualRetriever(): ContextualRetriever;
}
//# sourceMappingURL=vectorDb.d.ts.map
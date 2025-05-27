import * as vscode from 'vscode';
import { VectorDatabase } from '../vectorDb';
import { IContextualRetriever, IContextualSearchResult, IContextualSearchConfig, IRelevanceScores, ICodeChunk } from './types';
/**
 * Main contextual retriever that combines semantic, temporal, spatial, and structural analysis
 * Provides intelligent code context for AI assistance
 */
export declare class ContextualRetriever implements IContextualRetriever {
    private readonly vectorDb;
    private readonly temporalAnalyzer;
    private readonly spatialAnalyzer;
    private readonly structuralAnalyzer;
    private readonly scoreCombiner;
    private readonly config;
    constructor(vectorDb: VectorDatabase, storageUri: vscode.Uri, config?: Partial<IContextualSearchConfig>);
    /**
     * Search for contextually relevant code chunks
     * @param query Search query
     * @param activeFilePath Currently active file path
     * @returns Array of contextually ranked results
     */
    search(query: string, activeFilePath?: string): Promise<IContextualSearchResult[]>;
    /**
     * Analyze code relevance across all dimensions
     * @param chunk Code chunk to analyze
     * @param query Search query
     * @param activeFilePath Currently active file path
     * @returns Relevance scores
     */
    analyzeCodeRelevance(chunk: ICodeChunk, query: string, activeFilePath?: string): Promise<IRelevanceScores>;
    /**
     * Get relevant context optimized for token limits
     * @param query Search query
     * @param maxTokens Maximum tokens to return
     * @returns Array of context strings
     */
    getRelevantContext(query: string, maxTokens?: number): Promise<string[]>;
    /**
     * Update file modification time for temporal analysis
     * @param filePath Path to the modified file
     */
    updateFileModificationTime(filePath: string): Promise<void>;
    /**
     * Get contextual search statistics
     * @returns Statistics about the contextual search system
     */
    getSearchStats(): Promise<{
        temporal: any;
        spatial: any;
        structural: any;
        config: IContextualSearchConfig;
    }>;
    /**
     * Explain why specific results were ranked as they were
     * @param query Search query
     * @param activeFilePath Currently active file path
     * @returns Detailed explanation of ranking
     */
    explainRanking(query: string, activeFilePath?: string): Promise<string[]>;
    /**
     * Get recently modified files for context prioritization
     * @param maxAge Maximum age in milliseconds
     * @returns Array of recently modified file paths
     */
    getRecentlyModifiedFiles(maxAge?: number): Promise<string[]>;
    /**
     * Get files near the active file for spatial context
     * @param activeFilePath Currently active file path
     * @param maxResults Maximum number of results
     * @returns Array of nearby files with scores
     */
    getNearbyFiles(activeFilePath: string, maxResults?: number): Promise<Array<{
        path: string;
        score: number;
    }>>;
    /**
     * Calculate semantic score for a chunk
     */
    private calculateSemanticScore;
    /**
     * Format a search result into a context string
     */
    private formatContextString;
    /**
     * Update configuration
     * @param newConfig New configuration to apply
     */
    updateConfig(newConfig: Partial<IContextualSearchConfig>): void;
    /**
     * Get current configuration
     * @returns Current configuration
     */
    getConfig(): IContextualSearchConfig;
}
//# sourceMappingURL=contextualRetriever.d.ts.map
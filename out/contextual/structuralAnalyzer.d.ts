import { IStructuralAnalyzer, ICodeChunk, IContextualSearchConfig, IStructuralInfo, CodeChunkType } from './types';
/**
 * Analyzes structural aspects of code for contextual retrieval
 * Considers code type, language, complexity, and relationships
 */
export declare class StructuralAnalyzer implements IStructuralAnalyzer {
    private symbolCache;
    private languageWeights;
    constructor();
    /**
     * Calculate structural score based on code characteristics
     * @param chunk Code chunk to analyze
     * @param query Search query
     * @param config Configuration for structural scoring
     * @returns Structural score (0-1)
     */
    calculateStructuralScore(chunk: ICodeChunk, query: string, config: IContextualSearchConfig): number;
    /**
     * Analyze the structural characteristics of a code chunk
     * @param chunk Code chunk to analyze
     * @returns Structural information
     */
    analyzeCodeStructure(chunk: ICodeChunk): IStructuralInfo;
    /**
     * Get related symbols based on a symbol name
     * @param symbolName Name of the symbol to find relations for
     * @returns Array of related code chunks
     */
    getRelatedSymbols(symbolName: string): Promise<ICodeChunk[]>;
    /**
     * Find structurally similar code chunks
     * @param referenceChunk Reference chunk to find similarities for
     * @param allChunks All available chunks to search through
     * @returns Array of similar chunks with similarity scores
     */
    findSimilarStructures(referenceChunk: ICodeChunk, allChunks: ICodeChunk[]): Array<{
        chunk: ICodeChunk;
        similarity: number;
    }>;
    /**
     * Analyze query for structural hints
     * @param query Search query
     * @returns Structural hints found in the query
     */
    analyzeQueryStructure(query: string): {
        mentionedTypes: CodeChunkType[];
        mentionedLanguages: string[];
        mentionedSymbols: string[];
        isLookingForFunction: boolean;
        isLookingForClass: boolean;
        isLookingForInterface: boolean;
    };
    /**
     * Get structural score based on chunk type
     */
    private getTypeScore;
    /**
     * Get complexity score (moderate complexity is often most relevant)
     */
    private getComplexityScore;
    /**
     * Analyze query for structural relevance to a specific chunk
     */
    private analyzeQueryStructuralRelevance;
    /**
     * Calculate structural similarity between two code structures
     */
    private calculateStructuralSimilarity;
    /**
     * Calculate complexity of code content
     */
    private calculateComplexity;
    /**
     * Check if a chunk represents an exported symbol
     */
    private isExported;
    /**
     * Check if a chunk contains imports
     */
    private isImported;
    /**
     * Check if a chunk has documentation
     */
    private hasDocumentation;
    /**
     * Convert VSCode symbol to code chunk
     */
    private symbolToCodeChunk;
    /**
     * Convert VSCode symbol kind to our chunk type
     */
    private symbolKindToChunkType;
    /**
     * Initialize language weights for scoring
     */
    private initializeLanguageWeights;
    /**
     * Clear symbol cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        entries: number;
        symbols: string[];
    };
}
//# sourceMappingURL=structuralAnalyzer.d.ts.map
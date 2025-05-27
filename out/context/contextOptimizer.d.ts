import { IContextOptimizer, IOptimizedContext, IContentPriority, CompressionLevel } from './types';
/**
 * Optimizes context for token limits and improves relevance
 * Manages context size while preserving the most important information
 */
export declare class ContextOptimizer implements IContextOptimizer {
    private readonly tokensPerCharacter;
    private readonly maxContextRatio;
    /**
     * Optimize context to fit within token limits
     * @param context Array of context strings
     * @param maxTokens Maximum tokens allowed
     * @returns Optimized context with metadata
     */
    optimizeForTokenLimit(context: string[], maxTokens: number): Promise<IOptimizedContext>;
    /**
     * Estimate token count for text
     * @param text Text to analyze
     * @returns Estimated token count
     */
    estimateTokenCount(text: string): number;
    /**
     * Prioritize content based on importance
     * @param context Array of context strings
     * @param priorities Priority configuration
     * @returns Prioritized context array
     */
    prioritizeContent(context: string[], priorities: IContentPriority[]): string[];
    /**
     * Compress context by removing redundancy and noise
     * @param context Array of context strings
     * @returns Compressed context array
     */
    compressContext(context: string[]): string[];
    /**
     * Apply smart compression based on compression level
     * @param context Array of context strings
     * @param level Compression level
     * @returns Compressed context
     */
    applySmartCompression(context: string[], level: CompressionLevel): string[];
    /**
     * Get optimization statistics
     * @param original Original context
     * @param optimized Optimized context
     * @returns Optimization statistics
     */
    getOptimizationStats(original: string[], optimized: IOptimizedContext): {
        originalFiles: number;
        includedFiles: number;
        excludedFiles: number;
        truncatedFiles: number;
        originalTokens: number;
        optimizedTokens: number;
        compressionRatio: number;
        spaceSaved: number;
    };
    /**
     * Calculate content score based on priorities
     */
    private calculateContentScore;
    /**
     * Detect content type from content string
     */
    private detectContentType;
    /**
     * Get default content priorities
     */
    private getDefaultPriorities;
    /**
     * Extract file path from content string
     */
    private extractFilePathFromContent;
    /**
     * Truncate content to fit token limit
     */
    private truncateContent;
    /**
     * Hash content for deduplication
     */
    private hashContent;
    /**
     * Apply compression techniques
     */
    private applyCompressionTechniques;
    /**
     * Light compression - minimal changes
     */
    private lightCompression;
    /**
     * Moderate compression - remove some redundancy
     */
    private moderateCompression;
    /**
     * Aggressive compression - significant reduction
     */
    private aggressiveCompression;
}
//# sourceMappingURL=contextOptimizer.d.ts.map
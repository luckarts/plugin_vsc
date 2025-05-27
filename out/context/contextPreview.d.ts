import { IContextPreview, IPreviewData, IContextStats } from './types';
/**
 * Generates previews and statistics for context before sending to AI
 * Helps users understand what context will be sent and make adjustments
 */
export declare class ContextPreview implements IContextPreview {
    private readonly tokensPerCharacter;
    /**
     * Generate comprehensive preview of context
     * @param context Array of context strings
     * @returns Preview data with summary and file details
     */
    generatePreview(context: string[]): IPreviewData;
    /**
     * Format preview data for display
     * @param preview Preview data to format
     * @returns Formatted string for display
     */
    formatForDisplay(preview: IPreviewData): string;
    /**
     * Get detailed statistics about context
     * @param context Array of context strings
     * @returns Detailed context statistics
     */
    getContextStats(context: string[]): IContextStats;
    /**
     * Generate quick summary for UI display
     * @param context Array of context strings
     * @returns Quick summary string
     */
    generateQuickSummary(context: string[]): string;
    /**
     * Check if context is within recommended limits
     * @param context Array of context strings
     * @param maxTokens Maximum recommended tokens
     * @returns Warning information
     */
    checkContextLimits(context: string[], maxTokens: number): {
        isWithinLimits: boolean;
        warnings: string[];
        suggestions: string[];
    };
    /**
     * Parse context strings into file information
     */
    private parseContextFiles;
    /**
     * Extract file information from context string
     */
    private extractFileInfo;
    /**
     * Generate summary from file information
     */
    private generateSummary;
    /**
     * Extract main topics from files
     */
    private extractMainTopics;
    /**
     * Determine complexity level
     */
    private determineComplexity;
    /**
     * Calculate total tokens for context
     */
    private calculateTotalTokens;
    /**
     * Estimate token count for content
     */
    private estimateTokenCount;
    /**
     * Estimate cost based on token count
     */
    private estimateCost;
    /**
     * Detect language from file path
     */
    private detectLanguageFromPath;
    /**
     * Create visual relevance bar
     */
    private createRelevanceBar;
    /**
     * Format complexity for display
     */
    private formatComplexity;
    /**
     * Generate recommendations based on preview
     */
    private generateRecommendations;
}
//# sourceMappingURL=contextPreview.d.ts.map
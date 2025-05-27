import { IScoreCombiner, IRelevanceScores, IContextualSearchResult, IContextualSearchConfig } from './types';
/**
 * Combines different scoring components into a final relevance score
 * Handles normalization and ranking of search results
 */
export declare class ScoreCombiner implements IScoreCombiner {
    /**
     * Combine multiple scores into a final weighted score
     * @param scores Individual relevance scores
     * @param config Configuration with weights
     * @returns Combined final score (0-1)
     */
    combineScores(scores: IRelevanceScores, config: IContextualSearchConfig): number;
    /**
     * Normalize scores across all results to improve ranking
     * @param results Array of search results
     * @returns Normalized results
     */
    normalizeScores(results: IContextualSearchResult[]): IContextualSearchResult[];
    /**
     * Rank results by final score and assign rank numbers
     * @param results Array of search results
     * @returns Ranked results
     */
    rankResults(results: IContextualSearchResult[]): IContextualSearchResult[];
    /**
     * Apply advanced scoring strategies
     * @param results Array of search results
     * @param config Configuration
     * @returns Results with advanced scoring applied
     */
    applyAdvancedScoring(results: IContextualSearchResult[], config: IContextualSearchConfig): IContextualSearchResult[];
    /**
     * Filter results based on minimum thresholds
     * @param results Array of search results
     * @param config Configuration with thresholds
     * @returns Filtered results
     */
    filterResults(results: IContextualSearchResult[], config: IContextualSearchConfig): IContextualSearchResult[];
    /**
     * Get detailed scoring explanation for debugging
     * @param result Search result to explain
     * @param config Configuration used
     * @returns Detailed explanation
     */
    explainScoring(result: IContextualSearchResult, config: IContextualSearchConfig): string;
    /**
     * Calculate statistics for score normalization
     */
    private calculateScoreStatistics;
    /**
     * Get statistics for a set of scores
     */
    private getScoreStats;
    /**
     * Normalize a single score using min-max normalization
     */
    private normalizeScore;
    /**
     * Enhance score separation using non-linear transformation
     */
    private enhanceScoreSeparation;
    /**
     * Apply diversity bonus to avoid clustering results from same file
     */
    private applyDiversityBonus;
    /**
     * Apply recency boost for recently modified files
     */
    private applyRecencyBoost;
    /**
     * Apply quality boost based on code characteristics
     */
    private applyQualityBoost;
    /**
     * Create a default configuration for score combination
     */
    static createDefaultConfig(): IContextualSearchConfig;
}
//# sourceMappingURL=scoreCombiner.d.ts.map
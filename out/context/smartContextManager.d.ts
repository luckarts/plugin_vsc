import { ContextualRetriever } from '../contextual/contextualRetriever';
import { ISmartContextManager, ISmartContext, IContextOptions, IPreviewData } from './types';
/**
 * Smart context manager that orchestrates all context-related operations
 * Provides intelligent context building, optimization, and preview capabilities
 */
export declare class SmartContextManager implements ISmartContextManager {
    private readonly contextDetector;
    private readonly contextFilter;
    private readonly contextOptimizer;
    private readonly contextPreview;
    private readonly contextualRetriever;
    constructor(contextualRetriever: ContextualRetriever);
    /**
     * Build intelligent context for a query
     * @param query User query
     * @param options Context building options
     * @returns Smart context with all relevant information
     */
    buildContext(query: string, options?: IContextOptions): Promise<ISmartContext>;
    /**
     * Preview context before building
     * @param query User query
     * @param options Context building options
     * @returns Preview data
     */
    previewContext(query: string, options?: IContextOptions): Promise<IPreviewData>;
    /**
     * Optimize context for token limits
     * @param context Smart context to optimize
     * @param maxTokens Maximum tokens allowed
     * @returns Optimized context
     */
    optimizeContext(context: ISmartContext, maxTokens: number): Promise<ISmartContext>;
    /**
     * Explain context composition and decisions
     * @param context Smart context to explain
     * @returns Array of explanation strings
     */
    explainContext(context: ISmartContext): string[];
    /**
     * Get context statistics for monitoring
     * @param context Smart context to analyze
     * @returns Context statistics
     */
    getContextStatistics(context: ISmartContext): {
        tokenUsage: number;
        fileCount: number;
        languageDistribution: Record<string, number>;
        averageRelevance: number;
        compressionRatio: number;
    };
    /**
     * Merge options with defaults
     */
    private mergeWithDefaults;
    /**
     * Get list of applied filters
     */
    private getAppliedFilters;
    /**
     * Build import context string
     */
    private buildImportContext;
    /**
     * Build dependency context string
     */
    private buildDependencyContext;
    /**
     * Build recent files context string
     */
    private buildRecentFilesContext;
    /**
     * Create simple relevance bar for explanations
     */
    private createSimpleRelevanceBar;
}
//# sourceMappingURL=smartContextManager.d.ts.map
import { IContextFilter, IWorkspaceContext } from './types';
/**
 * Filters workspace context based on various criteria
 * Helps focus on relevant files and reduce noise
 */
export declare class ContextFilter implements IContextFilter {
    private readonly supportedLanguages;
    private readonly codeExtensions;
    /**
     * Filter context by programming languages
     * @param context Workspace context to filter
     * @param languages Array of language IDs to include
     * @returns Filtered context
     */
    filterByLanguage(context: IWorkspaceContext, languages: string[]): IWorkspaceContext;
    /**
     * Filter context by file extensions
     * @param context Workspace context to filter
     * @param extensions Array of file extensions to include (with or without dots)
     * @returns Filtered context
     */
    filterByExtension(context: IWorkspaceContext, extensions: string[]): IWorkspaceContext;
    /**
     * Filter context by relevance score threshold
     * @param context Workspace context to filter
     * @param threshold Minimum relevance score (0-1)
     * @returns Filtered context
     */
    filterByRelevance(context: IWorkspaceContext, threshold: number): IWorkspaceContext;
    /**
     * Filter context by file size to avoid very large files
     * @param context Workspace context to filter
     * @param maxSize Maximum file size in bytes
     * @returns Filtered context
     */
    filterByFileSize(context: IWorkspaceContext, maxSize: number): IWorkspaceContext;
    /**
     * Apply multiple filters in sequence
     * @param context Workspace context to filter
     * @param filters Array of filter configurations
     * @returns Filtered context
     */
    applyMultipleFilters(context: IWorkspaceContext, filters: Array<{
        type: 'language' | 'extension' | 'relevance' | 'fileSize';
        value: any;
    }>): IWorkspaceContext;
    /**
     * Filter to only include code files (exclude docs, configs, etc.)
     * @param context Workspace context to filter
     * @returns Filtered context with only code files
     */
    filterCodeFilesOnly(context: IWorkspaceContext): IWorkspaceContext;
    /**
     * Filter to prioritize recently modified files
     * @param context Workspace context to filter
     * @param maxAge Maximum age in milliseconds
     * @returns Filtered context with recent files prioritized
     */
    filterRecentlyModified(context: IWorkspaceContext, maxAge: number): IWorkspaceContext;
    /**
     * Create a smart filter based on the active file context
     * @param context Workspace context to filter
     * @returns Intelligently filtered context
     */
    createSmartFilter(context: IWorkspaceContext): IWorkspaceContext;
    /**
     * Get file statistics after filtering
     * @param originalContext Original context
     * @param filteredContext Filtered context
     * @returns Statistics about the filtering operation
     */
    getFilterStats(originalContext: IWorkspaceContext, filteredContext: IWorkspaceContext): {
        originalFiles: number;
        filteredFiles: number;
        reductionPercentage: number;
        languagesIncluded: string[];
        extensionsIncluded: string[];
    };
    /**
     * Helper method to get language from file extension
     */
    private getLanguageFromExtension;
    /**
     * Get related languages for smart filtering
     */
    private getRelatedLanguages;
    /**
     * Estimate file size (simplified implementation)
     */
    private estimateFileSize;
}
//# sourceMappingURL=contextFilter.d.ts.map
import { ISpatialAnalyzer, IContextualSearchConfig, IFileProximityInfo } from './types';
/**
 * Analyzes spatial relationships between files for contextual retrieval
 * Prioritizes code based on proximity to the active file
 */
export declare class SpatialAnalyzer implements ISpatialAnalyzer {
    private workspaceRoot;
    private fileCache;
    constructor();
    /**
     * Calculate spatial score based on file proximity
     * @param chunkPath Path of the code chunk
     * @param activeFilePath Path of the currently active file
     * @param config Configuration for spatial scoring
     * @returns Spatial score (0-1, higher = closer proximity)
     */
    calculateSpatialScore(chunkPath: string, activeFilePath: string, config: IContextualSearchConfig): number;
    /**
     * Get detailed proximity information between two files
     * @param filePath1 First file path
     * @param filePath2 Second file path
     * @returns Proximity information
     */
    getFileProximity(filePath1: string, filePath2: string): IFileProximityInfo;
    /**
     * Get all files in a directory
     * @param directoryPath Path to the directory
     * @param recursive Whether to search recursively
     * @returns Array of file paths
     */
    getFilesInDirectory(directoryPath: string, recursive?: boolean): Promise<string[]>;
    /**
     * Get files in the same directory as the given file
     * @param filePath Path to the reference file
     * @returns Array of file paths in the same directory
     */
    getSiblingFiles(filePath: string): Promise<string[]>;
    /**
     * Get files in nearby directories
     * @param filePath Path to the reference file
     * @param maxDepth Maximum depth to search
     * @returns Array of file paths with their distances
     */
    getNearbyFiles(filePath: string, maxDepth?: number): Promise<Array<{
        path: string;
        distance: number;
    }>>;
    /**
     * Get the most relevant files based on spatial proximity
     * @param activeFilePath Currently active file
     * @param config Configuration for spatial analysis
     * @param maxResults Maximum number of results
     * @returns Array of relevant file paths with scores
     */
    getRelevantFilesByProximity(activeFilePath: string, config: IContextualSearchConfig, maxResults?: number): Promise<Array<{
        path: string;
        score: number;
    }>>;
    /**
     * Initialize file cache for better performance
     */
    private initializeFileCache;
    /**
     * Calculate the distance between two file paths
     */
    private calculatePathDistance;
    /**
     * Calculate shared path depth between two files
     */
    private calculateSharedPathDepth;
    /**
     * Get the depth of a path (number of directory levels)
     */
    private getPathDepth;
    /**
     * Check if a file is within the workspace
     */
    private isInWorkspace;
    /**
     * Normalize file path for consistent comparison
     */
    private normalizePath;
    /**
     * Get all files in the workspace
     */
    private getAllWorkspaceFiles;
    /**
     * Recursive helper for searching nearby files
     */
    private searchNearbyFilesRecursive;
    /**
     * Clear the file cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        entries: number;
        directories: string[];
    };
}
//# sourceMappingURL=spatialAnalyzer.d.ts.map
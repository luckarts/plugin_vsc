import * as vscode from 'vscode';
import { ITemporalAnalyzer, IContextualSearchConfig, ITemporalInfo } from './types';
/**
 * Analyzes temporal aspects of code for contextual retrieval
 * Prioritizes recently modified files and code chunks
 */
export declare class TemporalAnalyzer implements ITemporalAnalyzer {
    private fileTimestamps;
    private readonly storageUri;
    constructor(storageUri: vscode.Uri);
    /**
     * Initialize the temporal analyzer
     */
    private initialize;
    /**
     * Calculate temporal score based on last modification time
     * @param lastModified Timestamp of last modification
     * @param config Configuration for temporal scoring
     * @returns Temporal score (0-1, higher = more recent)
     */
    calculateTemporalScore(lastModified: number, config: IContextualSearchConfig): number;
    /**
     * Get recently modified files within the specified age
     * @param maxAge Maximum age in milliseconds
     * @returns Array of file paths
     */
    getRecentlyModifiedFiles(maxAge: number): Promise<string[]>;
    /**
     * Update file timestamp
     * @param filePath Path to the file
     */
    updateFileTimestamp(filePath: string): Promise<void>;
    /**
     * Get detailed temporal information for a file
     * @param filePath Path to the file
     * @param config Configuration for temporal analysis
     * @returns Temporal information
     */
    getTemporalInfo(filePath: string, config: IContextualSearchConfig): ITemporalInfo;
    /**
     * Get files modified within a specific time range
     * @param startTime Start timestamp
     * @param endTime End timestamp
     * @returns Array of file paths
     */
    getFilesModifiedInRange(startTime: number, endTime: number): string[];
    /**
     * Get temporal statistics
     * @returns Statistics about file modifications
     */
    getTemporalStats(): {
        totalFiles: number;
        recentFiles: number;
        oldestFile: {
            path: string;
            timestamp: number;
        } | null;
        newestFile: {
            path: string;
            timestamp: number;
        } | null;
    };
    /**
     * Setup file system watcher to track modifications
     */
    private setupFileWatcher;
    /**
     * Load timestamps from storage
     */
    private loadTimestamps;
    /**
     * Save timestamps to storage
     */
    private saveTimestamps;
    /**
     * Normalize file path for consistent storage
     */
    private normalizePath;
    /**
     * Clean up old timestamps to prevent memory bloat
     * @param maxAge Maximum age to keep in milliseconds
     */
    cleanupOldTimestamps(maxAge: number): Promise<void>;
    /**
     * Force update timestamps for all files in workspace
     */
    refreshAllTimestamps(): Promise<void>;
    /**
     * Refresh timestamps for files in a directory
     */
    private refreshDirectoryTimestamps;
}
//# sourceMappingURL=temporalAnalyzer.d.ts.map
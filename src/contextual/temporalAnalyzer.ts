import * as vscode from 'vscode';
import * as path from 'path';
import { ITemporalAnalyzer, IContextualSearchConfig, ITemporalInfo, ContextualRetrievalException } from './types';

/**
 * Analyzes temporal aspects of code for contextual retrieval
 * Prioritizes recently modified files and code chunks
 */
export class TemporalAnalyzer implements ITemporalAnalyzer {
  private fileTimestamps: Map<string, number> = new Map();
  private readonly storageUri: vscode.Uri;

  constructor(storageUri: vscode.Uri) {
    this.storageUri = vscode.Uri.joinPath(storageUri, 'temporal');
    this.initialize();
  }

  /**
   * Initialize the temporal analyzer
   */
  private async initialize(): Promise<void> {
    try {
      // Create storage directory if it doesn't exist
      try {
        await vscode.workspace.fs.stat(this.storageUri);
      } catch {
        await vscode.workspace.fs.createDirectory(this.storageUri);
      }

      // Load existing timestamps
      await this.loadTimestamps();

      // Setup file system watcher
      this.setupFileWatcher();

    } catch (error) {
      throw new ContextualRetrievalException('initialize', 'Failed to initialize temporal analyzer', error);
    }
  }

  /**
   * Calculate temporal score based on last modification time
   * @param lastModified Timestamp of last modification
   * @param config Configuration for temporal scoring
   * @returns Temporal score (0-1, higher = more recent)
   */
  calculateTemporalScore(lastModified: number, config: IContextualSearchConfig): number {
    const now = Date.now();
    const ageInMilliseconds = now - lastModified;

    // If the file is very recent, give it a bonus
    if (ageInMilliseconds < config.recentModificationBonus) {
      return 1.0;
    }

    // If the file is too old, give it minimum score
    if (ageInMilliseconds > config.maxTemporalAge) {
      return 0.1;
    }

    // Calculate exponential decay score
    const normalizedAge = ageInMilliseconds / config.maxTemporalAge;
    const score = Math.exp(-config.temporalDecayFactor * normalizedAge);

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Get recently modified files within the specified age
   * @param maxAge Maximum age in milliseconds
   * @returns Array of file paths
   */
  async getRecentlyModifiedFiles(maxAge: number): Promise<string[]> {
    const now = Date.now();
    const recentFiles: string[] = [];

    for (const [filePath, timestamp] of this.fileTimestamps) {
      if (now - timestamp <= maxAge) {
        recentFiles.push(filePath);
      }
    }

    // Sort by recency (most recent first)
    return recentFiles.sort((a, b) => {
      const timestampA = this.fileTimestamps.get(a) || 0;
      const timestampB = this.fileTimestamps.get(b) || 0;
      return timestampB - timestampA;
    });
  }

  /**
   * Update file timestamp
   * @param filePath Path to the file
   */
  async updateFileTimestamp(filePath: string): Promise<void> {
    try {
      const normalizedPath = this.normalizePath(filePath);
      const timestamp = Date.now();
      
      this.fileTimestamps.set(normalizedPath, timestamp);
      
      // Persist to storage
      await this.saveTimestamps();

    } catch (error) {
      throw new ContextualRetrievalException('updateFileTimestamp', `Failed to update timestamp for ${filePath}`, error);
    }
  }

  /**
   * Get detailed temporal information for a file
   * @param filePath Path to the file
   * @param config Configuration for temporal analysis
   * @returns Temporal information
   */
  getTemporalInfo(filePath: string, config: IContextualSearchConfig): ITemporalInfo {
    const normalizedPath = this.normalizePath(filePath);
    const lastModified = this.fileTimestamps.get(normalizedPath) || 0;
    const now = Date.now();
    const ageInMilliseconds = now - lastModified;
    const ageScore = this.calculateTemporalScore(lastModified, config);
    const isRecentlyModified = ageInMilliseconds < config.recentModificationBonus;

    return {
      lastModified,
      ageInMilliseconds,
      ageScore,
      isRecentlyModified
    };
  }

  /**
   * Get files modified within a specific time range
   * @param startTime Start timestamp
   * @param endTime End timestamp
   * @returns Array of file paths
   */
  getFilesModifiedInRange(startTime: number, endTime: number): string[] {
    const filesInRange: string[] = [];

    for (const [filePath, timestamp] of this.fileTimestamps) {
      if (timestamp >= startTime && timestamp <= endTime) {
        filesInRange.push(filePath);
      }
    }

    return filesInRange.sort((a, b) => {
      const timestampA = this.fileTimestamps.get(a) || 0;
      const timestampB = this.fileTimestamps.get(b) || 0;
      return timestampB - timestampA;
    });
  }

  /**
   * Get temporal statistics
   * @returns Statistics about file modifications
   */
  getTemporalStats(): {
    totalFiles: number;
    recentFiles: number;
    oldestFile: { path: string; timestamp: number } | null;
    newestFile: { path: string; timestamp: number } | null;
  } {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    let oldestTimestamp = Number.MAX_SAFE_INTEGER;
    let newestTimestamp = 0;
    let oldestFile: string | null = null;
    let newestFile: string | null = null;
    let recentCount = 0;

    for (const [filePath, timestamp] of this.fileTimestamps) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestFile = filePath;
      }
      
      if (timestamp > newestTimestamp) {
        newestTimestamp = timestamp;
        newestFile = filePath;
      }
      
      if (timestamp > oneHourAgo) {
        recentCount++;
      }
    }

    return {
      totalFiles: this.fileTimestamps.size,
      recentFiles: recentCount,
      oldestFile: oldestFile ? { path: oldestFile, timestamp: oldestTimestamp } : null,
      newestFile: newestFile ? { path: newestFile, timestamp: newestTimestamp } : null
    };
  }

  /**
   * Setup file system watcher to track modifications
   */
  private setupFileWatcher(): void {
    // Watch for file changes in the workspace
    const watcher = vscode.workspace.createFileSystemWatcher('**/*');

    watcher.onDidChange(async (uri) => {
      await this.updateFileTimestamp(uri.fsPath);
    });

    watcher.onDidCreate(async (uri) => {
      await this.updateFileTimestamp(uri.fsPath);
    });

    // Don't track deletions as we want to keep historical data
  }

  /**
   * Load timestamps from storage
   */
  private async loadTimestamps(): Promise<void> {
    try {
      const timestampsFile = vscode.Uri.joinPath(this.storageUri, 'timestamps.json');
      const data = await vscode.workspace.fs.readFile(timestampsFile);
      const jsonData = new TextDecoder().decode(data);
      const timestamps = JSON.parse(jsonData);
      
      this.fileTimestamps.clear();
      for (const [filePath, timestamp] of Object.entries(timestamps)) {
        this.fileTimestamps.set(filePath, timestamp as number);
      }
      
    } catch (error) {
      // File doesn't exist or is corrupted, start with empty timestamps
      this.fileTimestamps.clear();
    }
  }

  /**
   * Save timestamps to storage
   */
  private async saveTimestamps(): Promise<void> {
    try {
      const timestampsFile = vscode.Uri.joinPath(this.storageUri, 'timestamps.json');
      const timestamps = Object.fromEntries(this.fileTimestamps);
      const jsonData = JSON.stringify(timestamps, null, 2);
      const data = new TextEncoder().encode(jsonData);
      
      await vscode.workspace.fs.writeFile(timestampsFile, data);
      
    } catch (error) {
      console.error('Failed to save timestamps:', error);
    }
  }

  /**
   * Normalize file path for consistent storage
   */
  private normalizePath(filePath: string): string {
    return path.normalize(filePath).replace(/\\/g, '/');
  }

  /**
   * Clean up old timestamps to prevent memory bloat
   * @param maxAge Maximum age to keep in milliseconds
   */
  async cleanupOldTimestamps(maxAge: number): Promise<void> {
    const now = Date.now();
    const cutoffTime = now - maxAge;
    
    for (const [filePath, timestamp] of this.fileTimestamps) {
      if (timestamp < cutoffTime) {
        this.fileTimestamps.delete(filePath);
      }
    }
    
    await this.saveTimestamps();
  }

  /**
   * Force update timestamps for all files in workspace
   */
  async refreshAllTimestamps(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
        return;
      }

      for (const folder of workspaceFolders) {
        await this.refreshDirectoryTimestamps(folder.uri.fsPath);
      }

    } catch (error) {
      throw new ContextualRetrievalException('refreshAllTimestamps', 'Failed to refresh all timestamps', error);
    }
  }

  /**
   * Refresh timestamps for files in a directory
   */
  private async refreshDirectoryTimestamps(directoryPath: string): Promise<void> {
    try {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(directoryPath, '**/*'),
        '**/node_modules/**'
      );

      for (const file of files) {
        try {
          const stat = await vscode.workspace.fs.stat(file);
          this.fileTimestamps.set(this.normalizePath(file.fsPath), stat.mtime);
        } catch (error) {
          // Skip files that can't be accessed
          continue;
        }
      }

      await this.saveTimestamps();

    } catch (error) {
      console.error(`Failed to refresh timestamps for directory ${directoryPath}:`, error);
    }
  }
}

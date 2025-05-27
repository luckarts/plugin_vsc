import * as vscode from 'vscode';
import * as path from 'path';
import {
  IVectorEntry,
  MemoryException,
  SearchOptions,
  MetadataFilters,
  VectorStoreStats,
  StoredMemory,
  MemoryMetadata,
  MemoryType
} from '../core/types';
import { IEnhancedVectorStore } from '../core/interfaces';

/**
 * Enhanced file-based vector store with filtering capabilities
 * Supports both Memory storage (Task 002) and Code indexing
 */
export class EnhancedVectorStore implements IEnhancedVectorStore {
  private readonly storageUri: vscode.Uri;
  private readonly indexFile: vscode.Uri;
  private readonly dataFile: vscode.Uri;
  private readonly metadataFile: vscode.Uri;
  private vectorIndex: Map<string, IVectorEntry> = new Map();
  private metadataIndex: Map<string, any> = new Map();
  private isInitialized = false;
  private searchTimes: number[] = [];

  constructor(storageUri: vscode.Uri) {
    this.storageUri = vscode.Uri.joinPath(storageUri, 'vectors');
    this.indexFile = vscode.Uri.joinPath(this.storageUri, 'index.json');
    this.dataFile = vscode.Uri.joinPath(this.storageUri, 'vectors.json');
    this.metadataFile = vscode.Uri.joinPath(this.storageUri, 'metadata.json');
  }

  /**
   * Initialize the vector store
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create storage directory if it doesn't exist
      try {
        await vscode.workspace.fs.stat(this.storageUri);
      } catch {
        await vscode.workspace.fs.createDirectory(this.storageUri);
      }

      // Load existing data
      await this.loadIndex();
      await this.loadMetadata();

      this.isInitialized = true;

    } catch (error) {
      throw new MemoryException('initialize', 'Failed to initialize vector store', error);
    }
  }

  /**
   * Store vector entries
   */
  async store(entries: IVectorEntry[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Add entries to in-memory index
      for (const entry of entries) {
        this.vectorIndex.set(entry.id, entry);
      }

      // Persist to disk
      await this.saveIndex();

    } catch (error) {
      throw new MemoryException('store', 'Failed to store vector entries', error);
    }
  }

  /**
   * Store a memory with metadata
   */
  async storeMemory(memory: StoredMemory): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Create vector entry
      const vectorEntry: IVectorEntry = {
        id: memory.id,
        chunkId: memory.id,
        vector: memory.embedding
      };

      // Store vector
      this.vectorIndex.set(memory.id, vectorEntry);

      // Store metadata separately for efficient filtering
      this.metadataIndex.set(memory.id, {
        content: memory.content,
        metadata: memory.metadata,
        created: memory.created,
        updated: memory.updated,
        embeddingModel: memory.embeddingModel,
        embeddingVersion: memory.embeddingVersion
      });

      // Persist to disk
      await this.saveIndex();
      await this.saveMetadata();

    } catch (error) {
      throw new MemoryException('storeMemory', 'Failed to store memory', error);
    }
  }

  /**
   * Basic search for similar vectors
   */
  async search(queryVector: number[], limit: number = 10): Promise<IVectorEntry[]> {
    return this.searchWithFilters(queryVector, { limit });
  }

  /**
   * Enhanced search with filtering capabilities
   */
  async searchWithFilters(queryVector: number[], options: SearchOptions): Promise<IVectorEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      const {
        limit = 10,
        threshold = 0.0,
        filters,
        sortBy = 'similarity'
      } = options;

      let results: IVectorEntry[] = [];

      // Calculate similarity for each vector
      for (const [id, entry] of this.vectorIndex) {
        // Apply metadata filters first (more efficient)
        if (filters && !this.matchesFilters(id, filters)) {
          continue;
        }

        const similarity = this.cosineSimilarity(queryVector, entry.vector);

        // Apply similarity threshold
        if (similarity >= threshold) {
          results.push({
            ...entry,
            similarity
          });
        }
      }

      // Sort results
      results = this.sortResults(results, sortBy);

      // Apply limit
      results = results.slice(0, limit);

      // Track search performance
      const searchTime = Date.now() - startTime;
      this.searchTimes.push(searchTime);
      if (this.searchTimes.length > 100) {
        this.searchTimes.shift(); // Keep only last 100 searches
      }

      return results;

    } catch (error) {
      throw new MemoryException('searchWithFilters', 'Failed to search vectors with filters', error);
    }
  }

  /**
   * Delete vector entries by chunk IDs
   */
  async delete(chunkIds: string[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Remove from both indexes
      for (const chunkId of chunkIds) {
        // Find entries with matching chunkId
        const entriesToDelete = Array.from(this.vectorIndex.entries())
          .filter(([_, entry]) => entry.chunkId === chunkId)
          .map(([id, _]) => id);

        for (const id of entriesToDelete) {
          this.vectorIndex.delete(id);
          this.metadataIndex.delete(id);
        }
      }

      // Persist changes
      await this.saveIndex();
      await this.saveMetadata();

    } catch (error) {
      throw new MemoryException('delete', 'Failed to delete vector entries', error);
    }
  }

  /**
   * Clear all vectors and metadata
   */
  async clear(): Promise<void> {
    try {
      this.vectorIndex.clear();
      this.metadataIndex.clear();
      await this.saveIndex();
      await this.saveMetadata();

    } catch (error) {
      throw new MemoryException('clear', 'Failed to clear vector store', error);
    }
  }

  /**
   * Get the number of stored vectors
   */
  async getSize(): Promise<number> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return this.vectorIndex.size;
  }

  /**
   * Get comprehensive statistics
   */
  async getStatistics(): Promise<VectorStoreStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const stats = await this.getBasicStats();

      return {
        totalVectors: this.vectorIndex.size,
        indexSize: stats.storageSize,
        averageSearchTime: this.searchTimes.length > 0
          ? this.searchTimes.reduce((a, b) => a + b, 0) / this.searchTimes.length
          : 0,
        memoryUsage: this.estimateMemoryUsage(),
        embeddingModel: this.getEmbeddingModel(),
        lastOptimization: new Date(stats.lastUpdated)
      };

    } catch (error) {
      throw new MemoryException('getStatistics', 'Failed to get statistics', error);
    }
  }

  /**
   * Optimize storage by removing duplicate vectors
   */
  async optimize(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const uniqueVectors = new Map<string, IVectorEntry>();
      const uniqueMetadata = new Map<string, any>();

      // Remove duplicates based on vector content
      for (const [id, entry] of this.vectorIndex) {
        const vectorKey = entry.vector.join(',');
        if (!uniqueVectors.has(vectorKey)) {
          uniqueVectors.set(vectorKey, entry);
          const metadata = this.metadataIndex.get(id);
          if (metadata) {
            uniqueMetadata.set(entry.id, metadata);
          }
        }
      }

      // Update indexes with unique vectors only
      this.vectorIndex.clear();
      this.metadataIndex.clear();

      for (const [_, entry] of uniqueVectors) {
        this.vectorIndex.set(entry.id, entry);
      }

      for (const [id, metadata] of uniqueMetadata) {
        this.metadataIndex.set(id, metadata);
      }

      await this.saveIndex();
      await this.saveMetadata();

    } catch (error) {
      throw new MemoryException('optimize', 'Failed to optimize vector store', error);
    }
  }

  /**
   * Export vectors to a backup file
   */
  async exportBackup(backupPath: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const entries = Array.from(this.vectorIndex.values());
      const metadata = Object.fromEntries(this.metadataIndex);

      const backupData = {
        version: '2.0',
        timestamp: Date.now(),
        entries,
        metadata
      };

      const jsonData = JSON.stringify(backupData, null, 2);
      const data = new TextEncoder().encode(jsonData);
      const backupUri = vscode.Uri.file(backupPath);

      await vscode.workspace.fs.writeFile(backupUri, data);

    } catch (error) {
      throw new MemoryException('exportBackup', 'Failed to export backup', error);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Load vector index from disk
   */
  private async loadIndex(): Promise<void> {
    try {
      const data = await vscode.workspace.fs.readFile(this.dataFile);
      const jsonData = new TextDecoder().decode(data);
      const entries: IVectorEntry[] = JSON.parse(jsonData);

      this.vectorIndex.clear();
      for (const entry of entries) {
        this.vectorIndex.set(entry.id, entry);
      }

    } catch (error) {
      // File doesn't exist or is corrupted, start with empty index
      this.vectorIndex.clear();
    }
  }

  /**
   * Load metadata index from disk
   */
  private async loadMetadata(): Promise<void> {
    try {
      const data = await vscode.workspace.fs.readFile(this.metadataFile);
      const jsonData = new TextDecoder().decode(data);
      const metadata = JSON.parse(jsonData);

      this.metadataIndex.clear();
      for (const [id, meta] of Object.entries(metadata)) {
        this.metadataIndex.set(id, meta);
      }

    } catch (error) {
      // File doesn't exist or is corrupted, start with empty metadata
      this.metadataIndex.clear();
    }
  }

  /**
   * Save vector index to disk
   */
  private async saveIndex(): Promise<void> {
    try {
      const entries = Array.from(this.vectorIndex.values());
      const jsonData = JSON.stringify(entries, null, 2);
      const data = new TextEncoder().encode(jsonData);

      await vscode.workspace.fs.writeFile(this.dataFile, data);

      // Also save a lightweight index for quick metadata access
      const indexData = {
        size: entries.length,
        lastUpdated: Date.now(),
        chunkIds: entries.map(e => e.chunkId)
      };

      const indexJsonData = JSON.stringify(indexData, null, 2);
      const indexDataEncoded = new TextEncoder().encode(indexJsonData);

      await vscode.workspace.fs.writeFile(this.indexFile, indexDataEncoded);

    } catch (error) {
      throw new MemoryException('saveIndex', 'Failed to save vector index', error);
    }
  }

  /**
   * Save metadata index to disk
   */
  private async saveMetadata(): Promise<void> {
    try {
      const metadata = Object.fromEntries(this.metadataIndex);
      const jsonData = JSON.stringify(metadata, null, 2);
      const data = new TextEncoder().encode(jsonData);

      await vscode.workspace.fs.writeFile(this.metadataFile, data);

    } catch (error) {
      throw new MemoryException('saveMetadata', 'Failed to save metadata', error);
    }
  }

  /**
   * Check if metadata matches the given filters
   */
  private matchesFilters(id: string, filters: MetadataFilters): boolean {
    const metadata = this.metadataIndex.get(id);
    if (!metadata || !metadata.metadata) {
      return false;
    }

    const memoryMetadata = metadata.metadata as MemoryMetadata;

    // Type filter
    if (filters.type && filters.type.length > 0) {
      if (!filters.type.includes(memoryMetadata.type)) {
        return false;
      }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag =>
        memoryMetadata.tags.includes(tag)
      );
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Project filter
    if (filters.project && memoryMetadata.project !== filters.project) {
      return false;
    }

    // Language filter
    if (filters.language && memoryMetadata.language !== filters.language) {
      return false;
    }

    // Date range filter
    if (filters.dateRange) {
      const created = new Date(metadata.created);
      if (created < filters.dateRange.from || created > filters.dateRange.to) {
        return false;
      }
    }

    // Importance filter
    if (filters.importance) {
      const importance = memoryMetadata.importance;
      if (importance < filters.importance.min || importance > filters.importance.max) {
        return false;
      }
    }

    return true;
  }

  /**
   * Sort search results
   */
  private sortResults(results: IVectorEntry[], sortBy: string): IVectorEntry[] {
    switch (sortBy) {
      case 'similarity':
        return results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));

      case 'date':
        return results.sort((a, b) => {
          const metaA = this.metadataIndex.get(a.id);
          const metaB = this.metadataIndex.get(b.id);
          const dateA = metaA ? new Date(metaA.created).getTime() : 0;
          const dateB = metaB ? new Date(metaB.created).getTime() : 0;
          return dateB - dateA; // Most recent first
        });

      case 'importance':
        return results.sort((a, b) => {
          const metaA = this.metadataIndex.get(a.id);
          const metaB = this.metadataIndex.get(b.id);
          const impA = metaA?.metadata?.importance || 0;
          const impB = metaB?.metadata?.importance || 0;
          return impB - impA; // Highest importance first
        });

      default:
        return results;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Get basic storage statistics
   */
  private async getBasicStats(): Promise<{ size: number; lastUpdated: number; storageSize: number }> {
    try {
      const indexStat = await vscode.workspace.fs.stat(this.indexFile);
      const dataStat = await vscode.workspace.fs.stat(this.dataFile);
      const metadataStat = await vscode.workspace.fs.stat(this.metadataFile);

      return {
        size: this.vectorIndex.size,
        lastUpdated: Math.max(indexStat.mtime, dataStat.mtime, metadataStat.mtime),
        storageSize: indexStat.size + dataStat.size + metadataStat.size
      };

    } catch (error) {
      return {
        size: this.vectorIndex.size,
        lastUpdated: Date.now(),
        storageSize: 0
      };
    }
  }

  /**
   * Estimate memory usage in bytes
   */
  private estimateMemoryUsage(): number {
    let totalSize = 0;

    // Estimate vector index size
    for (const entry of this.vectorIndex.values()) {
      totalSize += entry.vector.length * 8; // 8 bytes per number
      totalSize += entry.id.length * 2; // 2 bytes per character
      totalSize += entry.chunkId.length * 2;
    }

    // Estimate metadata index size
    for (const metadata of this.metadataIndex.values()) {
      totalSize += JSON.stringify(metadata).length * 2;
    }

    return totalSize;
  }

  /**
   * Get the embedding model from stored metadata
   */
  private getEmbeddingModel(): string {
    // Try to get from first stored memory
    for (const metadata of this.metadataIndex.values()) {
      if (metadata.embeddingModel) {
        return metadata.embeddingModel;
      }
    }
    return 'unknown';
  }
}

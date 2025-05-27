import * as vscode from 'vscode';
import * as path from 'path';
import { IVectorStore, IVectorEntry, VectoringException } from './types';

/**
 * Simple file-based vector store optimized for VSCode extensions
 * Stores vectors in JSON format with efficient similarity search
 */
export class FileVectorStore implements IVectorStore {
  private readonly storageUri: vscode.Uri;
  private readonly indexFile: vscode.Uri;
  private readonly dataFile: vscode.Uri;
  private vectorIndex: Map<string, IVectorEntry> = new Map();
  private isInitialized = false;

  constructor(storageUri: vscode.Uri) {
    this.storageUri = vscode.Uri.joinPath(storageUri, 'vectors');
    this.indexFile = vscode.Uri.joinPath(this.storageUri, 'index.json');
    this.dataFile = vscode.Uri.joinPath(this.storageUri, 'vectors.json');
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

      // Load existing index
      await this.loadIndex();
      
      this.isInitialized = true;
      
    } catch (error) {
      throw new VectoringException('initialize', 'Failed to initialize vector store', error);
    }
  }

  /**
   * Store vector entries
   * @param entries Array of vector entries to store
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
      throw new VectoringException('store', 'Failed to store vector entries', error);
    }
  }

  /**
   * Search for similar vectors using cosine similarity
   * @param queryVector Query vector
   * @param limit Maximum number of results
   * @returns Array of similar vector entries with similarity scores
   */
  async search(queryVector: number[], limit: number = 10): Promise<IVectorEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const results: IVectorEntry[] = [];
      
      // Calculate similarity for each vector
      for (const [id, entry] of this.vectorIndex) {
        const similarity = this.cosineSimilarity(queryVector, entry.vector);
        
        results.push({
          ...entry,
          similarity
        });
      }

      // Sort by similarity (descending) and limit results
      return results
        .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
        .slice(0, limit);
        
    } catch (error) {
      throw new VectoringException('search', 'Failed to search vectors', error);
    }
  }

  /**
   * Delete vector entries by chunk IDs
   * @param chunkIds Array of chunk IDs to delete
   */
  async delete(chunkIds: string[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Remove from in-memory index
      for (const chunkId of chunkIds) {
        // Find entries with matching chunkId
        const entriesToDelete = Array.from(this.vectorIndex.entries())
          .filter(([_, entry]) => entry.chunkId === chunkId)
          .map(([id, _]) => id);
          
        for (const id of entriesToDelete) {
          this.vectorIndex.delete(id);
        }
      }

      // Persist changes
      await this.saveIndex();
      
    } catch (error) {
      throw new VectoringException('delete', 'Failed to delete vector entries', error);
    }
  }

  /**
   * Clear all vectors
   */
  async clear(): Promise<void> {
    try {
      this.vectorIndex.clear();
      await this.saveIndex();
      
    } catch (error) {
      throw new VectoringException('clear', 'Failed to clear vector store', error);
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
   * Load index from disk
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
   * Save index to disk
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
      throw new VectoringException('saveIndex', 'Failed to save vector index', error);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Similarity score between 0 and 1
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
   * Get storage statistics
   */
  async getStats(): Promise<{ size: number; lastUpdated: number; storageSize: number }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const indexStat = await vscode.workspace.fs.stat(this.indexFile);
      const dataStat = await vscode.workspace.fs.stat(this.dataFile);
      
      return {
        size: this.vectorIndex.size,
        lastUpdated: Math.max(indexStat.mtime, dataStat.mtime),
        storageSize: indexStat.size + dataStat.size
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
   * Optimize storage by removing duplicate vectors
   */
  async optimize(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const uniqueVectors = new Map<string, IVectorEntry>();
      
      // Remove duplicates based on vector content
      for (const [id, entry] of this.vectorIndex) {
        const vectorKey = entry.vector.join(',');
        if (!uniqueVectors.has(vectorKey)) {
          uniqueVectors.set(vectorKey, entry);
        }
      }

      // Update index with unique vectors only
      this.vectorIndex.clear();
      for (const [_, entry] of uniqueVectors) {
        this.vectorIndex.set(entry.id, entry);
      }

      await this.saveIndex();
      
    } catch (error) {
      throw new VectoringException('optimize', 'Failed to optimize vector store', error);
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
      const backupData = {
        version: '1.0',
        timestamp: Date.now(),
        entries
      };
      
      const jsonData = JSON.stringify(backupData, null, 2);
      const data = new TextEncoder().encode(jsonData);
      const backupUri = vscode.Uri.file(backupPath);
      
      await vscode.workspace.fs.writeFile(backupUri, data);
      
    } catch (error) {
      throw new VectoringException('exportBackup', 'Failed to export backup', error);
    }
  }
}

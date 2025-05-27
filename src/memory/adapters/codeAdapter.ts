/**
 * Code Adapter - Maintains compatibility with existing code indexing functionality
 * Wraps the new memory system to provide the old IVectorDatabase interface
 */

import * as vscode from 'vscode';
import * as path from 'path';
import {
  ICodeChunk,
  ISearchResult,
  IIndexingProgress,
  IndexingStatus,
  MemoryException,
  MemoryType,
  Memory,
  MemoryMetadata
} from '../core/types';
import { ICodeAdapter, IEmbeddingProvider, ICodeParser } from '../core/interfaces';
import { MemoryAdapter } from './memoryAdapter';

export class CodeAdapter implements ICodeAdapter {
  private memoryAdapter: MemoryAdapter;
  private embeddingProvider: IEmbeddingProvider;
  private indexingProgress: IIndexingProgress;
  private isIndexing = false;
  private isPaused = false;

  constructor(
    memoryAdapter: MemoryAdapter,
    embeddingProvider: IEmbeddingProvider
  ) {
    this.memoryAdapter = memoryAdapter;
    this.embeddingProvider = embeddingProvider;
    this.indexingProgress = {
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      status: IndexingStatus.IDLE,
      errors: []
    };
  }

  /**
   * Initialize the code adapter
   */
  async initialize(): Promise<void> {
    try {
      await this.memoryAdapter.initialize();
    } catch (error) {
      throw new MemoryException('initialize', 'Failed to initialize code adapter', error);
    }
  }

  /**
   * Index an entire workspace
   */
  async indexWorkspace(workspacePath: string): Promise<void> {
    if (this.isIndexing) {
      throw new MemoryException('indexWorkspace', 'Indexing already in progress');
    }

    try {
      this.isIndexing = true;
      this.isPaused = false;
      this.indexingProgress.status = IndexingStatus.SCANNING;
      this.indexingProgress.errors = [];

      // Find all code files
      const files = await this.findCodeFiles(workspacePath);
      this.indexingProgress.totalFiles = files.length;
      this.indexingProgress.processedFiles = 0;

      // Index each file
      for (const file of files) {
        if (this.isPaused) {
          this.indexingProgress.status = IndexingStatus.IDLE;
          return;
        }

        try {
          this.indexingProgress.currentFile = file;
          this.indexingProgress.status = IndexingStatus.PROCESSING;
          
          await this.indexFile(file);
          this.indexingProgress.processedFiles++;
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.indexingProgress.errors.push(`${file}: ${errorMessage}`);
        }
      }

      this.indexingProgress.status = IndexingStatus.COMPLETED;
      this.indexingProgress.currentFile = '';

    } catch (error) {
      this.indexingProgress.status = IndexingStatus.ERROR;
      throw new MemoryException('indexWorkspace', 'Failed to index workspace', error);
    } finally {
      this.isIndexing = false;
    }
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<void> {
    try {
      // Read file content
      const fileUri = vscode.Uri.file(filePath);
      const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(fileUri));

      // Parse the file into chunks
      const parser = this.getParserForFile(filePath);
      const chunks = await parser.parseFile(content, filePath);

      // Convert chunks to memories and store them
      for (const chunk of chunks) {
        const memory = this.convertChunkToMemory(chunk);
        await this.memoryAdapter.store(memory);
      }

    } catch (error) {
      throw new MemoryException('indexFile', `Failed to index file ${filePath}`, error);
    }
  }

  /**
   * Search for code using semantic similarity
   */
  async search(query: string, limit: number = 10): Promise<ISearchResult[]> {
    try {
      const searchResults = await this.memoryAdapter.search(query, {
        limit,
        filters: {
          type: [MemoryType.CODE_SNIPPET, MemoryType.FUNCTION, MemoryType.CLASS, MemoryType.INTERFACE]
        }
      });

      // Convert back to ISearchResult format
      return searchResults.map(result => ({
        chunk: this.convertMemoryToChunk(result.memory),
        similarity: result.similarity,
        relevanceScore: result.similarity * (result.memory.metadata.importance || 1)
      }));

    } catch (error) {
      throw new MemoryException('search', `Failed to search code for query: ${query}`, error);
    }
  }

  /**
   * Get relevant code snippets
   */
  async getRelevantCode(query: string, limit: number = 5): Promise<string[]> {
    try {
      const results = await this.search(query, limit);
      return results.map(result => result.chunk.content);
    } catch (error) {
      throw new MemoryException('getRelevantCode', `Failed to get relevant code for query: ${query}`, error);
    }
  }

  /**
   * Delete a file from the index
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      // Find all memories related to this file
      const allResults = await this.memoryAdapter.search('', { limit: 1000 });
      const fileMemories = allResults.filter(result => 
        result.memory.metadata.source === filePath
      );

      // Delete each memory
      for (const result of fileMemories) {
        await this.memoryAdapter.delete(result.memory.id);
      }

    } catch (error) {
      throw new MemoryException('deleteFile', `Failed to delete file ${filePath}`, error);
    }
  }

  /**
   * Clear all indexed code
   */
  async clear(): Promise<void> {
    try {
      await this.memoryAdapter.clear();
    } catch (error) {
      throw new MemoryException('clear', 'Failed to clear code index', error);
    }
  }

  /**
   * Get indexing statistics
   */
  async getStats(): Promise<any> {
    try {
      const memoryStats = await this.memoryAdapter.getStats();
      return {
        totalChunks: memoryStats.totalVectors,
        totalFiles: this.estimateFileCount(),
        indexSize: memoryStats.indexSize,
        lastUpdated: memoryStats.lastOptimization.getTime(),
        languages: await this.getLanguageStats()
      };
    } catch (error) {
      throw new MemoryException('getStats', 'Failed to get code indexing statistics', error);
    }
  }

  /**
   * Get current indexing progress
   */
  async getIndexingProgress(): Promise<IIndexingProgress> {
    return { ...this.indexingProgress };
  }

  /**
   * Pause indexing
   */
  async pauseIndexing(): Promise<void> {
    this.isPaused = true;
  }

  /**
   * Resume indexing
   */
  async resumeIndexing(): Promise<void> {
    this.isPaused = false;
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Find all code files in a workspace
   */
  private async findCodeFiles(workspacePath: string): Promise<string[]> {
    const files: string[] = [];
    const supportedExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.cpp', '.c', '.go', '.rs'];
    
    // This is a simplified implementation
    // In a real implementation, you'd use vscode.workspace.findFiles
    // For now, we'll return an empty array
    return files;
  }

  /**
   * Get appropriate parser for a file
   */
  private getParserForFile(filePath: string): ICodeParser {
    // Import and use the existing CodeParser
    const { CodeParser } = require('../../vectoring/codeParser');
    return CodeParser.getParserForFile(filePath);
  }

  /**
   * Convert a code chunk to a memory
   */
  private convertChunkToMemory(chunk: ICodeChunk): Memory {
    const memoryMetadata: MemoryMetadata = {
      type: this.mapChunkTypeToMemoryType(chunk.type),
      tags: this.extractTagsFromChunk(chunk),
      language: chunk.language,
      importance: this.calculateImportance(chunk),
      category: 'code',
      source: chunk.filePath,
      project: this.extractProjectName(chunk.filePath)
    };

    return {
      id: chunk.id,
      content: chunk.content,
      metadata: memoryMetadata,
      created: new Date(),
      updated: new Date()
    };
  }

  /**
   * Convert a memory back to a code chunk
   */
  private convertMemoryToChunk(memory: StoredMemory): ICodeChunk {
    // This is a simplified conversion
    // In a real implementation, you'd need to store more chunk-specific data
    return {
      id: memory.id,
      filePath: memory.metadata.source,
      content: memory.content,
      startLine: 0, // Would need to be stored in metadata
      endLine: 0,   // Would need to be stored in metadata
      language: memory.metadata.language || 'unknown',
      type: this.mapMemoryTypeToChunkType(memory.metadata.type),
      metadata: {
        lastModified: memory.updated.getTime()
      }
    };
  }

  private mapChunkTypeToMemoryType(chunkType: any): MemoryType {
    switch (chunkType) {
      case 'function': return MemoryType.FUNCTION;
      case 'class': return MemoryType.CLASS;
      case 'interface': return MemoryType.INTERFACE;
      default: return MemoryType.CODE_SNIPPET;
    }
  }

  private mapMemoryTypeToChunkType(memoryType: MemoryType): any {
    switch (memoryType) {
      case MemoryType.FUNCTION: return 'function';
      case MemoryType.CLASS: return 'class';
      case MemoryType.INTERFACE: return 'interface';
      default: return 'block';
    }
  }

  private extractTagsFromChunk(chunk: ICodeChunk): string[] {
    const tags: string[] = [];
    
    if (chunk.metadata.functionName) {
      tags.push(`function:${chunk.metadata.functionName}`);
    }
    
    if (chunk.metadata.className) {
      tags.push(`class:${chunk.metadata.className}`);
    }
    
    tags.push(`language:${chunk.language}`);
    
    return tags;
  }

  private calculateImportance(chunk: ICodeChunk): number {
    let importance = 1;
    
    // Increase importance for complex code
    if (chunk.metadata.complexity && chunk.metadata.complexity > 5) {
      importance += 0.5;
    }
    
    // Increase importance for exported functions/classes
    if (chunk.metadata.exports && chunk.metadata.exports.length > 0) {
      importance += 0.3;
    }
    
    return Math.min(importance, 3); // Cap at 3
  }

  private extractProjectName(filePath: string): string {
    // Extract project name from file path
    const parts = filePath.split(path.sep);
    return parts.length > 1 ? parts[parts.length - 2] : 'unknown';
  }

  private estimateFileCount(): number {
    // This would need to be tracked during indexing
    return Math.ceil(this.indexingProgress.totalFiles || 0);
  }

  private async getLanguageStats(): Promise<Record<string, number>> {
    // This would need to be implemented by querying the memory store
    return {};
  }
}

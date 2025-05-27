/**
 * Memory Adapter - Implements the exact interface from Task 002
 * Provides high-level memory management operations
 */

import {
  Memory,
  StoredMemory,
  SearchOptions,
  SearchResult,
  VectorStoreStats,
  MemoryException,
  MemoryType
} from '../core/types';
import { IMemoryAdapter, IEmbeddingProvider } from '../core/interfaces';
import { EnhancedVectorStore } from '../storage/vectorStore';

export class MemoryAdapter implements IMemoryAdapter {
  private vectorStore: EnhancedVectorStore;
  private embeddingProvider: IEmbeddingProvider;
  private isInitialized = false;

  constructor(
    vectorStore: EnhancedVectorStore,
    embeddingProvider: IEmbeddingProvider
  ) {
    this.vectorStore = vectorStore;
    this.embeddingProvider = embeddingProvider;
  }

  /**
   * Initialize the memory adapter
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.vectorStore.initialize();
      await this.embeddingProvider.initialize();
      this.isInitialized = true;
    } catch (error) {
      throw new MemoryException('initialize', 'Failed to initialize memory adapter', error);
    }
  }

  /**
   * Store a memory with automatic embedding generation
   * Implements the exact specification from Task 002
   */
  async store(memory: Memory): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Generate embedding for the memory content
      const embedding = await this.embeddingProvider.embed(memory.content);

      // Create stored memory with embedding
      const storedMemory: StoredMemory = {
        ...memory,
        embedding,
        embeddingModel: this.embeddingProvider.name,
        embeddingVersion: '1.0' // Could be made configurable
      };

      // Store in vector store
      await this.vectorStore.storeMemory(storedMemory);

    } catch (error) {
      throw new MemoryException('store', `Failed to store memory ${memory.id}`, error);
    }
  }

  /**
   * Search memories by semantic similarity
   * Implements the exact specification from Task 002
   */
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingProvider.embed(query);

      // Search with filters
      const vectorResults = await this.vectorStore.searchWithFilters(queryEmbedding, options);

      // Convert to SearchResult format
      const searchResults: SearchResult[] = [];

      for (let i = 0; i < vectorResults.length; i++) {
        const vectorEntry = vectorResults[i];
        const storedMemory = await this.getMemoryById(vectorEntry.id);

        if (storedMemory) {
          searchResults.push({
            memory: storedMemory,
            similarity: vectorEntry.similarity || 0,
            rank: i + 1,
            explanation: this.generateExplanation(query, storedMemory, vectorEntry.similarity || 0)
          });
        }
      }

      return searchResults;

    } catch (error) {
      throw new MemoryException('search', `Failed to search memories for query: ${query}`, error);
    }
  }

  /**
   * Update an existing memory
   * Implements the exact specification from Task 002
   */
  async update(memoryId: string, memory: Memory): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Check if memory exists
      const existingMemory = await this.getMemoryById(memoryId);
      if (!existingMemory) {
        throw new MemoryException('update', `Memory with id ${memoryId} not found`);
      }

      // Delete old memory
      await this.delete(memoryId);

      // Store updated memory with new ID if different
      const updatedMemory: Memory = {
        ...memory,
        id: memoryId, // Keep the same ID
        updated: new Date()
      };

      await this.store(updatedMemory);

    } catch (error) {
      throw new MemoryException('update', `Failed to update memory ${memoryId}`, error);
    }
  }

  /**
   * Delete a memory from the store
   * Implements the exact specification from Task 002
   */
  async delete(memoryId: string): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.vectorStore.delete([memoryId]);
    } catch (error) {
      throw new MemoryException('delete', `Failed to delete memory ${memoryId}`, error);
    }
  }

  /**
   * Get store statistics
   * Implements the exact specification from Task 002
   */
  async getStats(): Promise<VectorStoreStats> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await this.vectorStore.getStatistics();
    } catch (error) {
      throw new MemoryException('getStats', 'Failed to get memory store statistics', error);
    }
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      await this.vectorStore.clear();
    } catch (error) {
      throw new MemoryException('clear', 'Failed to clear memory store', error);
    }
  }

  /**
   * Import multiple memories at once
   */
  async importMemories(memories: Memory[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      for (const memory of memories) {
        await this.store(memory);
      }
    } catch (error) {
      throw new MemoryException('importMemories', 'Failed to import memories', error);
    }
  }

  /**
   * Export all memories
   */
  async exportMemories(): Promise<StoredMemory[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // This would need to be implemented in the vector store
      // For now, we'll throw an error indicating it's not yet implemented
      throw new MemoryException('exportMemories', 'Export functionality not yet implemented');
    } catch (error) {
      throw new MemoryException('exportMemories', 'Failed to export memories', error);
    }
  }

  /**
   * Get a specific memory by ID
   */
  async getMemoryById(id: string): Promise<StoredMemory | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // This is a simplified implementation
      // In a real implementation, we'd need a more efficient way to get by ID
      const results = await this.vectorStore.searchWithFilters(
        new Array(this.embeddingProvider.getDimensions()).fill(0), // Dummy vector
        { limit: 1000 } // Get all and filter
      );

      for (const result of results) {
        if (result.id === id) {
          // Reconstruct the StoredMemory from vector store data
          // This would need to be implemented properly
          return null; // Placeholder
        }
      }

      return null;
    } catch (error) {
      throw new MemoryException('getMemoryById', `Failed to get memory ${id}`, error);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Generate explanation for search results
   */
  private generateExplanation(query: string, memory: StoredMemory, similarity: number): string {
    const similarityPercent = Math.round(similarity * 100);
    
    let explanation = `${similarityPercent}% similarity`;
    
    // Add context based on memory type
    if (memory.metadata.type === MemoryType.CODE_SNIPPET) {
      explanation += ` - Code snippet`;
    } else if (memory.metadata.type === MemoryType.DOCUMENTATION) {
      explanation += ` - Documentation`;
    }
    
    // Add tag information
    if (memory.metadata.tags.length > 0) {
      explanation += ` - Tags: ${memory.metadata.tags.slice(0, 3).join(', ')}`;
    }
    
    return explanation;
  }
}

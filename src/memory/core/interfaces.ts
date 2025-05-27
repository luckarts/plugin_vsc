/**
 * Core interfaces for the Memory system
 */

import {
  Memory,
  StoredMemory,
  SearchOptions,
  SearchResult,
  VectorStoreStats,
  IVectorEntry,
  ICodeChunk,
  ISearchResult,
  IIndexingProgress,
  VectorConfig
} from './types';

// ============================================================================
// MEMORY INTERFACES (Task 002)
// ============================================================================

/**
 * Main interface for memory storage and retrieval
 * Implements the exact specification from Task 002
 */
export interface IMemoryStore {
  /**
   * Store a memory with automatic embedding generation
   */
  store(memory: Memory): Promise<void>;

  /**
   * Search memories by semantic similarity
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Update an existing memory
   */
  update(memoryId: string, memory: Memory): Promise<void>;

  /**
   * Delete a memory from the store
   */
  delete(memoryId: string): Promise<void>;

  /**
   * Get store statistics
   */
  getStats(): Promise<VectorStoreStats>;

  /**
   * Initialize the memory store
   */
  initialize(): Promise<void>;

  /**
   * Clear all memories
   */
  clear(): Promise<void>;
}

// ============================================================================
// VECTOR STORAGE INTERFACES
// ============================================================================

/**
 * Generic vector storage interface
 */
export interface IVectorStore {
  initialize(): Promise<void>;
  store(entries: IVectorEntry[]): Promise<void>;
  search(queryVector: number[], limit: number): Promise<IVectorEntry[]>;
  delete(chunkIds: string[]): Promise<void>;
  clear(): Promise<void>;
  getSize(): Promise<number>;
}

/**
 * Enhanced vector store with filtering capabilities
 */
export interface IEnhancedVectorStore extends IVectorStore {
  searchWithFilters(
    queryVector: number[],
    options: SearchOptions
  ): Promise<IVectorEntry[]>;
  
  getStatistics(): Promise<VectorStoreStats>;
  optimize(): Promise<void>;
  exportBackup(backupPath: string): Promise<void>;
}

// ============================================================================
// EMBEDDING INTERFACES
// ============================================================================

export interface IEmbeddingProvider {
  name: string;
  initialize(): Promise<void>;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  isReady(): boolean;
}

// ============================================================================
// PARSING INTERFACES
// ============================================================================

export interface ICodeParser {
  language: string;
  parseFile(content: string, filePath: string): Promise<ICodeChunk[]>;
  extractMetadata(content: string): Promise<any>;
}

export interface ITextParser {
  parseText(content: string): Promise<Memory[]>;
  extractKeywords(content: string): Promise<string[]>;
}

// ============================================================================
// CODE INDEXING INTERFACES (Legacy compatibility)
// ============================================================================

export interface IVectorDatabase {
  initialize(): Promise<void>;
  indexWorkspace(workspacePath: string): Promise<void>;
  indexFile(filePath: string): Promise<void>;
  search(query: string, limit?: number): Promise<ISearchResult[]>;
  getRelevantCode(query: string, limit?: number): Promise<string[]>;
  deleteFile(filePath: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): Promise<any>;
}

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface IConfigLoader {
  loadConfig(configPath?: string): Promise<VectorConfig>;
  saveConfig(config: VectorConfig, configPath?: string): Promise<void>;
  getDefaultConfig(): VectorConfig;
}

// ============================================================================
// ADAPTER INTERFACES
// ============================================================================

export interface IMemoryAdapter extends IMemoryStore {
  // Additional methods specific to memory management
  importMemories(memories: Memory[]): Promise<void>;
  exportMemories(): Promise<StoredMemory[]>;
  getMemoryById(id: string): Promise<StoredMemory | null>;
}

export interface ICodeAdapter extends IVectorDatabase {
  // Additional methods specific to code indexing
  getIndexingProgress(): Promise<IIndexingProgress>;
  pauseIndexing(): Promise<void>;
  resumeIndexing(): Promise<void>;
}

// ============================================================================
// FACTORY INTERFACES
// ============================================================================

export interface IMemoryFactory {
  createMemoryStore(config?: Partial<VectorConfig>): Promise<IMemoryAdapter>;
  createCodeStore(config?: Partial<VectorConfig>): Promise<ICodeAdapter>;
  createEmbeddingProvider(config?: Partial<VectorConfig>): Promise<IEmbeddingProvider>;
}

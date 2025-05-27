/**
 * Core types for the Memory system
 * Supports both Memory storage (Task 002) and Code indexing
 */

// ============================================================================
// MEMORY TYPES (Task 002)
// ============================================================================

export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  created: Date;
  updated: Date;
}

export interface StoredMemory extends Memory {
  embedding: number[];
  embeddingModel: string;
  embeddingVersion: string;
}

export interface MemoryMetadata {
  type: MemoryType;
  tags: string[];
  project?: string;
  language?: string;
  importance: number;
  category: string;
  source: string;
}

export enum MemoryType {
  CODE_SNIPPET = 'code_snippet',
  DOCUMENTATION = 'documentation',
  CONVERSATION = 'conversation',
  TASK = 'task',
  NOTE = 'note',
  FUNCTION = 'function',
  CLASS = 'class',
  INTERFACE = 'interface'
}

export interface SearchOptions {
  limit?: number;
  threshold?: number;
  filters?: MetadataFilters;
  includeEmbeddings?: boolean;
  sortBy?: 'similarity' | 'date' | 'importance';
}

export interface MetadataFilters {
  type?: MemoryType[];
  tags?: string[];
  project?: string;
  language?: string;
  dateRange?: { from: Date; to: Date };
  importance?: { min: number; max: number };
}

export interface SearchResult {
  memory: StoredMemory;
  similarity: number;
  rank: number;
  explanation?: string;
}

export interface VectorStoreStats {
  totalVectors: number;
  indexSize: number;
  averageSearchTime: number;
  memoryUsage: number;
  embeddingModel: string;
  lastOptimization: Date;
}

// ============================================================================
// CODE INDEXING TYPES (Legacy compatibility)
// ============================================================================

export interface ICodeChunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  language: string;
  type: CodeChunkType;
  metadata: ICodeMetadata;
}

export interface ICodeMetadata {
  functionName?: string;
  className?: string;
  imports?: string[];
  exports?: string[];
  dependencies?: string[];
  complexity?: number;
  lastModified: number;
}

export enum CodeChunkType {
  FUNCTION = 'function',
  CLASS = 'class',
  INTERFACE = 'interface',
  TYPE = 'type',
  VARIABLE = 'variable',
  IMPORT = 'import',
  COMMENT = 'comment',
  BLOCK = 'block'
}

export interface ISearchResult {
  chunk: ICodeChunk;
  similarity: number;
  relevanceScore: number;
}

// ============================================================================
// COMMON VECTOR TYPES
// ============================================================================

export interface IVectorEntry {
  id: string;
  chunkId: string;
  vector: number[];
  similarity?: number;
}

export interface IIndexingProgress {
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  status: IndexingStatus;
  errors: string[];
}

export enum IndexingStatus {
  IDLE = 'idle',
  SCANNING = 'scanning',
  PROCESSING = 'processing',
  EMBEDDING = 'embedding',
  STORING = 'storing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type StorableItem = StoredMemory | ICodeChunk;
export type StorableMetadata = MemoryMetadata | ICodeMetadata;

export class MemoryException extends Error {
  constructor(
    public readonly operation: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'MemoryException';
  }
}

// Legacy alias for compatibility
export const VectoringException = MemoryException;

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface VectorConfig {
  vectorStore: {
    provider: 'file' | 'chroma' | 'qdrant';
    dimensions: number;
    similarity: 'cosine' | 'euclidean';
    indexType: 'hnsw' | 'flat';
    storageDir: string;
    maxVectors: number;
    batchSize: number;
  };
  embedding: {
    model: string;
    provider: 'local' | 'openai' | 'huggingface';
    cacheSize: number;
    timeout: number;
  };
  search: {
    defaultLimit: number;
    maxLimit: number;
    defaultThreshold: number;
    enableFilters: boolean;
  };
}

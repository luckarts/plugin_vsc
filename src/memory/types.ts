/**
 * Types and interfaces for the intelligent memory system
 * Inspired by Augment's memory management capabilities
 */

export enum MemoryType {
  PERSONAL = 'personal',
  REPOSITORY = 'repository',
  GUIDELINE = 'guideline',
  SESSION = 'session'
}

export interface IMemory {
  id: string;
  content: string;
  type: MemoryType;
  timestamp: Date;
  size: number;
  compressed: boolean;
  tags: string[];
  metadata: IMemoryMetadata;
}

export interface IMemoryMetadata {
  project?: string;
  language?: string;
  category?: string;
  priority?: number;
  lastAccessed?: Date;
  accessCount?: number;
  source?: string; // File path or source of the memory
  relatedFiles?: string[]; // Related file paths
  compressionStats?: ICompressionStats; // Compression statistics if compressed
  originalSize?: number; // Original size before compression
  summary?: string; // Summary of compressed content
}

export interface IMemoryStats {
  totalMemories: number;
  totalSize: number;
  compressedCount: number;
  compressionRatio: number;
  memoryByType: Record<MemoryType, number>;
  averageSize: number;
  oldestMemory?: Date;
  newestMemory?: Date;
}

export interface IMemoryFilters {
  type?: MemoryType;
  tags?: string[];
  project?: string;
  language?: string;
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  sizeRange?: {
    min: number;
    max: number;
  };
  compressed?: boolean;
}

export interface IMemorySearchResult {
  memory: IMemory;
  relevanceScore: number;
  matchedFields: string[];
  snippet?: string;
}

export interface ICompressionStats {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  timeToCompress: number;
  algorithm: string;
}

export interface ICompressionResult {
  compressedContent: string;
  stats: ICompressionStats;
  preservedKeywords: string[];
  summary: string;
}

export interface IMemoryBackup {
  version: string;
  timestamp: Date;
  memories: IMemory[];
  stats: IMemoryStats;
  checksum: string;
}

export interface IMemoryImportResult {
  imported: number;
  skipped: number;
  errors: string[];
  duplicates: number;
}

export interface IMemoryExportOptions {
  includeCompressed?: boolean;
  types?: MemoryType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  format?: 'json' | 'markdown' | 'csv';
}

// Events for memory system
export interface IMemoryEvent {
  type: 'created' | 'updated' | 'deleted' | 'compressed' | 'searched';
  memoryId: string;
  timestamp: Date;
  metadata?: any;
}

// Configuration interfaces
export interface IMemoryConfig {
  maxMemorySize: number;
  compressionThreshold: number;
  maxMemoriesPerType: number;
  autoCompress: boolean;
  backupInterval: number;
  searchDebounce: number;
  enableAnalytics: boolean;
  retentionPolicy?: {
    maxAge: number; // in days
    maxCount: number;
  };
}

// Storage interfaces
export interface IStorageService {
  save(memory: IMemory): Promise<void>;
  load(id: string): Promise<IMemory | null>;
  loadAll(): Promise<IMemory[]>;
  delete(id: string): Promise<void>;
  search(query: string, filters?: IMemoryFilters): Promise<IMemorySearchResult[]>;
  getStats(): Promise<IMemoryStats>;
  backup(): Promise<IMemoryBackup>;
  restore(backup: IMemoryBackup): Promise<IMemoryImportResult>;
  clear(): Promise<void>;
}

// Compression service interfaces
export interface ICompressionService {
  shouldCompress(memories: IMemory[]): Promise<boolean>;
  compressMemory(memory: IMemory): Promise<ICompressionResult>;
  compressMemories(memories: IMemory[]): Promise<IMemory[]>;
  decompressMemory(memory: IMemory): Promise<string>;
  getCompressionStats(memories: IMemory[]): ICompressionStats;
}

// Memory manager interfaces
export interface IMemoryManager {
  // CRUD operations
  createMemory(content: string, type: MemoryType, tags?: string[], metadata?: Partial<IMemoryMetadata>): Promise<string>;
  getMemory(id: string): Promise<IMemory | null>;
  updateMemory(id: string, updates: Partial<IMemory>): Promise<void>;
  deleteMemory(id: string): Promise<void>;

  // Search and filtering
  searchMemories(query: string, filters?: IMemoryFilters): Promise<IMemorySearchResult[]>;
  getMemoriesByType(type: MemoryType): Promise<IMemory[]>;
  getMemoriesByTags(tags: string[]): Promise<IMemory[]>;

  // Statistics and analytics
  getStats(): Promise<IMemoryStats>;
  getMemoryUsage(): Promise<number>;

  // Compression and optimization
  compressMemories(): Promise<void>;
  optimizeStorage(): Promise<void>;

  // Import/Export
  exportMemories(options?: IMemoryExportOptions): Promise<string>;
  importMemories(data: string, format?: 'json' | 'markdown'): Promise<IMemoryImportResult>;

  // Backup and restore
  createBackup(): Promise<IMemoryBackup>;
  restoreFromBackup(backup: IMemoryBackup): Promise<IMemoryImportResult>;

  // Event handling
  onMemoryEvent(callback: (event: IMemoryEvent) => void): void;

  // Lifecycle
  initialize(): Promise<void>;
  dispose(): Promise<void>;
}

// UI-related interfaces
export interface IMemoryPanelState {
  searchQuery: string;
  selectedType?: MemoryType;
  selectedTags: string[];
  sortBy: 'timestamp' | 'size' | 'relevance' | 'accessCount';
  sortOrder: 'asc' | 'desc';
  showCompressed: boolean;
  viewMode: 'list' | 'grid' | 'compact';
}

export interface IMemoryFormData {
  content: string;
  type: MemoryType;
  tags: string[];
  metadata: Partial<IMemoryMetadata>;
}

// Error types
export class MemoryError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class CompressionError extends MemoryError {
  constructor(message: string, details?: any) {
    super(message, 'COMPRESSION_ERROR', details);
    this.name = 'CompressionError';
  }
}

export class StorageError extends MemoryError {
  constructor(message: string, details?: any) {
    super(message, 'STORAGE_ERROR', details);
    this.name = 'StorageError';
  }
}

export class ValidationError extends MemoryError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

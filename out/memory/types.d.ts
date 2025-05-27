/**
 * Types and interfaces for the intelligent memory system
 * Inspired by Augment's memory management capabilities
 */
export declare enum MemoryType {
    PERSONAL = "personal",
    REPOSITORY = "repository",
    GUIDELINE = "guideline",
    SESSION = "session"
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
    source?: string;
    relatedFiles?: string[];
    compressionStats?: ICompressionStats;
    originalSize?: number;
    summary?: string;
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
export interface IMemoryEvent {
    type: 'created' | 'updated' | 'deleted' | 'compressed' | 'searched';
    memoryId: string;
    timestamp: Date;
    metadata?: any;
}
export interface IMemoryConfig {
    maxMemorySize: number;
    compressionThreshold: number;
    maxMemoriesPerType: number;
    autoCompress: boolean;
    backupInterval: number;
    searchDebounce: number;
    enableAnalytics: boolean;
    retentionPolicy?: {
        maxAge: number;
        maxCount: number;
    };
}
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
export interface ICompressionService {
    shouldCompress(memories: IMemory[]): Promise<boolean>;
    compressMemory(memory: IMemory): Promise<ICompressionResult>;
    compressMemories(memories: IMemory[]): Promise<IMemory[]>;
    decompressMemory(memory: IMemory): Promise<string>;
    getCompressionStats(memories: IMemory[]): ICompressionStats;
}
export interface IMemoryManager {
    createMemory(content: string, type: MemoryType, tags?: string[], metadata?: Partial<IMemoryMetadata>): Promise<string>;
    getMemory(id: string): Promise<IMemory | null>;
    updateMemory(id: string, updates: Partial<IMemory>): Promise<void>;
    deleteMemory(id: string): Promise<void>;
    searchMemories(query: string, filters?: IMemoryFilters): Promise<IMemorySearchResult[]>;
    getMemoriesByType(type: MemoryType): Promise<IMemory[]>;
    getMemoriesByTags(tags: string[]): Promise<IMemory[]>;
    getStats(): Promise<IMemoryStats>;
    getMemoryUsage(): Promise<number>;
    compressMemories(): Promise<void>;
    optimizeStorage(): Promise<void>;
    exportMemories(options?: IMemoryExportOptions): Promise<string>;
    importMemories(data: string, format?: 'json' | 'markdown'): Promise<IMemoryImportResult>;
    createBackup(): Promise<IMemoryBackup>;
    restoreFromBackup(backup: IMemoryBackup): Promise<IMemoryImportResult>;
    onMemoryEvent(callback: (event: IMemoryEvent) => void): void;
    initialize(): Promise<void>;
    dispose(): Promise<void>;
}
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
export declare class MemoryError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
export declare class CompressionError extends MemoryError {
    constructor(message: string, details?: any);
}
export declare class StorageError extends MemoryError {
    constructor(message: string, details?: any);
}
export declare class ValidationError extends MemoryError {
    constructor(message: string, details?: any);
}
//# sourceMappingURL=types.d.ts.map
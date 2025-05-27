/**
 * Types and interfaces for vector indexing system
 */
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
export declare enum CodeChunkType {
    FUNCTION = "function",
    CLASS = "class",
    INTERFACE = "interface",
    TYPE = "type",
    VARIABLE = "variable",
    IMPORT = "import",
    COMMENT = "comment",
    BLOCK = "block"
}
export interface IVectorEntry {
    id: string;
    chunkId: string;
    vector: number[];
    similarity?: number;
}
export interface ISearchResult {
    chunk: ICodeChunk;
    similarity: number;
    relevanceScore: number;
}
export interface IIndexingProgress {
    totalFiles: number;
    processedFiles: number;
    currentFile: string;
    status: IndexingStatus;
    errors: string[];
}
export declare enum IndexingStatus {
    IDLE = "idle",
    SCANNING = "scanning",
    PROCESSING = "processing",
    EMBEDDING = "embedding",
    STORING = "storing",
    COMPLETED = "completed",
    ERROR = "error"
}
export interface IVectorDatabase {
    initialize(): Promise<void>;
    indexWorkspace(workspacePath: string): Promise<void>;
    indexFile(filePath: string): Promise<void>;
    search(query: string, limit?: number): Promise<ISearchResult[]>;
    getRelevantCode(query: string, limit?: number): Promise<string[]>;
    deleteFile(filePath: string): Promise<void>;
    clear(): Promise<void>;
    getStats(): Promise<IIndexStats>;
}
export interface IIndexStats {
    totalChunks: number;
    totalFiles: number;
    indexSize: number;
    lastUpdated: number;
    languages: Record<string, number>;
}
export interface IEmbeddingProvider {
    name: string;
    initialize(): Promise<void>;
    embed(text: string): Promise<number[]>;
    embedBatch(texts: string[]): Promise<number[][]>;
    getDimensions(): number;
    isReady(): boolean;
}
export interface ICodeParser {
    language: string;
    parseFile(content: string, filePath: string): Promise<ICodeChunk[]>;
    extractMetadata(content: string): Promise<ICodeMetadata>;
}
export interface IVectorStore {
    initialize(): Promise<void>;
    store(entries: IVectorEntry[]): Promise<void>;
    search(queryVector: number[], limit: number): Promise<IVectorEntry[]>;
    delete(chunkIds: string[]): Promise<void>;
    clear(): Promise<void>;
    getSize(): Promise<number>;
}
export interface IIndexingConfig {
    maxChunkSize: number;
    chunkOverlap: number;
    excludePatterns: string[];
    includePatterns: string[];
    supportedLanguages: string[];
    embeddingProvider: string;
    vectorDimensions: number;
    similarityThreshold: number;
    maxResults: number;
}
export declare class VectoringException extends Error {
    readonly operation: string;
    readonly details?: any | undefined;
    constructor(operation: string, message: string, details?: any | undefined);
}
//# sourceMappingURL=types.d.ts.map
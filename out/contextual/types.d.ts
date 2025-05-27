/**
 * Types and interfaces for contextual code retrieval
 */
export interface IContextualSearchResult {
    chunk: ICodeChunk;
    scores: IRelevanceScores;
    finalScore: number;
    rank: number;
}
export interface IRelevanceScores {
    semantic: number;
    temporal: number;
    spatial: number;
    structural: number;
    combined: number;
}
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
    fileSize?: number;
    linesOfCode?: number;
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
export interface IContextualSearchConfig {
    semanticWeight: number;
    temporalWeight: number;
    spatialWeight: number;
    structuralWeight: number;
    recentModificationBonus: number;
    temporalDecayFactor: number;
    maxTemporalAge: number;
    sameFileBonus: number;
    sameDirectoryBonus: number;
    maxSpatialDistance: number;
    sameLanguageBonus: number;
    functionTypeBonus: number;
    classTypeBonus: number;
    maxResults: number;
    minSemanticThreshold: number;
    minFinalScore: number;
}
export interface IFileProximityInfo {
    filePath: string;
    distance: number;
    isInSameDirectory: boolean;
    isInSameProject: boolean;
    sharedPathDepth: number;
}
export interface ITemporalInfo {
    lastModified: number;
    ageInMilliseconds: number;
    ageScore: number;
    isRecentlyModified: boolean;
}
export interface IStructuralInfo {
    chunkType: CodeChunkType;
    language: string;
    complexity: number;
    isExported: boolean;
    isImported: boolean;
    hasDocumentation: boolean;
}
export interface IContextualRetriever {
    search(query: string, activeFilePath?: string): Promise<IContextualSearchResult[]>;
    updateFileModificationTime(filePath: string): Promise<void>;
    getRelevantContext(query: string, maxTokens?: number): Promise<string[]>;
    analyzeCodeRelevance(chunk: ICodeChunk, query: string): Promise<IRelevanceScores>;
}
export interface ISemanticSearchEngine {
    search(query: string, limit?: number): Promise<Array<{
        chunk: ICodeChunk;
        similarity: number;
    }>>;
    embed(text: string): Promise<number[]>;
}
export interface ITemporalAnalyzer {
    calculateTemporalScore(lastModified: number, config: IContextualSearchConfig): number;
    getRecentlyModifiedFiles(maxAge: number): Promise<string[]>;
    updateFileTimestamp(filePath: string): Promise<void>;
}
export interface ISpatialAnalyzer {
    calculateSpatialScore(chunkPath: string, activeFilePath: string, config: IContextualSearchConfig): number;
    getFileProximity(filePath1: string, filePath2: string): IFileProximityInfo;
    getFilesInDirectory(directoryPath: string, recursive?: boolean): Promise<string[]>;
}
export interface IStructuralAnalyzer {
    calculateStructuralScore(chunk: ICodeChunk, query: string, config: IContextualSearchConfig): number;
    analyzeCodeStructure(chunk: ICodeChunk): IStructuralInfo;
    getRelatedSymbols(symbolName: string): Promise<ICodeChunk[]>;
}
export interface IScoreCombiner {
    combineScores(scores: IRelevanceScores, config: IContextualSearchConfig): number;
    normalizeScores(results: IContextualSearchResult[]): IContextualSearchResult[];
    rankResults(results: IContextualSearchResult[]): IContextualSearchResult[];
}
export declare class ContextualRetrievalException extends Error {
    readonly operation: string;
    readonly details?: any | undefined;
    constructor(operation: string, message: string, details?: any | undefined);
}
//# sourceMappingURL=types.d.ts.map
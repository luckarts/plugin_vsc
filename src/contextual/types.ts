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
  semantic: number;        // Similarité sémantique (0-1)
  temporal: number;        // Score basé sur la récence (0-1)
  spatial: number;         // Score basé sur la proximité (0-1)
  structural: number;      // Score basé sur la structure du code (0-1)
  combined: number;        // Score final combiné (0-1)
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

export interface IContextualSearchConfig {
  // Weights for different scoring components (must sum to 1.0)
  semanticWeight: number;     // Poids de la similarité sémantique
  temporalWeight: number;     // Poids de la récence
  spatialWeight: number;      // Poids de la proximité
  structuralWeight: number;   // Poids de la structure

  // Temporal scoring parameters
  recentModificationBonus: number;    // Bonus pour les modifications récentes
  temporalDecayFactor: number;        // Facteur de décroissance temporelle
  maxTemporalAge: number;             // Âge maximum en millisecondes

  // Spatial scoring parameters
  sameFileBonus: number;              // Bonus pour le même fichier
  sameDirectoryBonus: number;         // Bonus pour le même répertoire
  maxSpatialDistance: number;         // Distance maximale considérée

  // Structural scoring parameters
  sameLanguageBonus: number;          // Bonus pour le même langage
  functionTypeBonus: number;          // Bonus pour les fonctions
  classTypeBonus: number;             // Bonus pour les classes

  // Search parameters
  maxResults: number;                 // Nombre maximum de résultats
  minSemanticThreshold: number;       // Seuil minimum de similarité sémantique
  minFinalScore: number;              // Score final minimum
}

export interface IFileProximityInfo {
  filePath: string;
  distance: number;           // Distance relative (0 = même fichier, 1 = très éloigné)
  isInSameDirectory: boolean;
  isInSameProject: boolean;
  sharedPathDepth: number;    // Profondeur du chemin partagé
}

export interface ITemporalInfo {
  lastModified: number;
  ageInMilliseconds: number;
  ageScore: number;           // Score basé sur l'âge (0-1, 1 = très récent)
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
  search(query: string, limit?: number): Promise<Array<{chunk: ICodeChunk, similarity: number}>>;
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

export class ContextualRetrievalException extends Error {
  constructor(
    public readonly operation: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ContextualRetrievalException';
  }
}

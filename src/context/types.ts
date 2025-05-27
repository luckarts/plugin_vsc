/**
 * Types and interfaces for intelligent context detection and management
 */

export interface IContextDetector {
  detectCurrentContext(): Promise<IWorkspaceContext>;
  getRelevantImports(filePath: string): Promise<IImportInfo[]>;
  getRelatedFiles(filePath: string): Promise<string[]>;
  analyzeCodeDependencies(content: string, language: string): Promise<IDependencyInfo>;
}

export interface IWorkspaceContext {
  activeFile?: IActiveFileContext;
  openFiles: IOpenFileContext[];
  recentFiles: string[];
  projectStructure: IProjectStructure;
  workspaceSettings: IWorkspaceSettings;
  gitContext?: IGitContext;
}

export interface IActiveFileContext {
  filePath: string;
  language: string;
  content: string;
  cursorPosition: IPosition;
  selectedText?: string;
  surroundingContext: ISurroundingContext;
  imports: IImportInfo[];
  exports: IExportInfo[];
  symbols: ISymbolInfo[];
}

export interface IOpenFileContext {
  filePath: string;
  language: string;
  isModified: boolean;
  lastAccessed: number;
  relevanceScore: number;
}

export interface IProjectStructure {
  rootPath: string;
  packageJson?: IPackageInfo;
  tsConfig?: ITsConfigInfo;
  gitignore?: string[];
  mainDirectories: string[];
  filesByExtension: Map<string, string[]>;
  totalFiles: number;
}

export interface IImportInfo {
  source: string;
  imports: string[];
  type: ImportType;
  isLocal: boolean;
  resolvedPath?: string;
  line: number;
}

export interface IExportInfo {
  name: string;
  type: ExportType;
  line: number;
  isDefault: boolean;
}

export interface ISymbolInfo {
  name: string;
  type: SymbolType;
  line: number;
  scope: string;
  parameters?: string[];
  returnType?: string;
}

export interface IDependencyInfo {
  imports: IImportInfo[];
  exports: IExportInfo[];
  internalDependencies: string[];
  externalDependencies: string[];
  unusedImports: string[];
  missingImports: string[];
}

export interface ISurroundingContext {
  beforeCursor: string;
  afterCursor: string;
  currentFunction?: string;
  currentClass?: string;
  currentScope: string;
  indentationLevel: number;
}

export interface IPosition {
  line: number;
  character: number;
}

export interface IPackageInfo {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
  main?: string;
  types?: string;
}

export interface ITsConfigInfo {
  compilerOptions: Record<string, any>;
  include: string[];
  exclude: string[];
  paths: Record<string, string[]>;
}

export interface IWorkspaceSettings {
  language: string;
  tabSize: number;
  insertSpaces: boolean;
  trimTrailingWhitespace: boolean;
  endOfLine: string;
}

export interface IGitContext {
  branch: string;
  hasUncommittedChanges: boolean;
  recentCommits: IGitCommit[];
  modifiedFiles: string[];
}

export interface IGitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  files: string[];
}

export enum ImportType {
  DEFAULT = 'default',
  NAMED = 'named',
  NAMESPACE = 'namespace',
  SIDE_EFFECT = 'side-effect'
}

export enum ExportType {
  DEFAULT = 'default',
  NAMED = 'named',
  NAMESPACE = 'namespace'
}

export enum SymbolType {
  FUNCTION = 'function',
  CLASS = 'class',
  INTERFACE = 'interface',
  TYPE = 'type',
  VARIABLE = 'variable',
  CONSTANT = 'constant',
  ENUM = 'enum'
}

export interface IContextFilter {
  filterByLanguage(context: IWorkspaceContext, languages: string[]): IWorkspaceContext;
  filterByExtension(context: IWorkspaceContext, extensions: string[]): IWorkspaceContext;
  filterByRelevance(context: IWorkspaceContext, threshold: number): IWorkspaceContext;
  filterByFileSize(context: IWorkspaceContext, maxSize: number): IWorkspaceContext;
}

export interface IContextOptimizer {
  optimizeForTokenLimit(context: string[], maxTokens: number): Promise<IOptimizedContext>;
  estimateTokenCount(text: string): number;
  prioritizeContent(context: string[], priorities: IContentPriority[]): string[];
  compressContext(context: string[]): string[];
}

export interface IOptimizedContext {
  content: string[];
  totalTokens: number;
  compressionRatio: number;
  includedFiles: string[];
  excludedFiles: string[];
  truncatedFiles: string[];
}

export interface IContentPriority {
  type: ContentType;
  weight: number;
  maxTokens?: number;
}

export enum ContentType {
  ACTIVE_FILE = 'active-file',
  IMPORTS = 'imports',
  RELATED_FILES = 'related-files',
  RECENT_FILES = 'recent-files',
  DEPENDENCIES = 'dependencies',
  DOCUMENTATION = 'documentation'
}

export interface IContextPreview {
  generatePreview(context: string[]): IPreviewData;
  formatForDisplay(preview: IPreviewData): string;
  getContextStats(context: string[]): IContextStats;
}

export interface IPreviewData {
  summary: IContextSummary;
  files: IFilePreview[];
  totalTokens: number;
  estimatedCost: number;
}

export interface IContextSummary {
  totalFiles: number;
  languages: string[];
  mainTopics: string[];
  complexity: ContextComplexity;
  relevanceScore: number;
}

export interface IFilePreview {
  filePath: string;
  language: string;
  lines: number;
  tokens: number;
  relevance: number;
  preview: string; // First few lines
  included: boolean;
  reason: string; // Why included/excluded
}

export enum ContextComplexity {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very-complex'
}

export interface IContextStats {
  totalFiles: number;
  totalLines: number;
  totalTokens: number;
  averageRelevance: number;
  languageDistribution: Record<string, number>;
  fileTypeDistribution: Record<string, number>;
  largestFiles: Array<{ path: string; tokens: number }>;
}

export interface ISmartContextManager {
  buildContext(query: string, options?: IContextOptions): Promise<ISmartContext>;
  previewContext(query: string, options?: IContextOptions): Promise<IPreviewData>;
  optimizeContext(context: ISmartContext, maxTokens: number): Promise<ISmartContext>;
  explainContext(context: ISmartContext): string[];
}

export interface ISmartContext {
  query: string;
  workspace: IWorkspaceContext;
  relevantCode: string[];
  dependencies: IDependencyInfo;
  metadata: IContextMetadata;
  optimized: boolean;
}

export interface IContextMetadata {
  generatedAt: number;
  totalTokens: number;
  compressionApplied: boolean;
  filtersApplied: string[];
  relevanceThreshold: number;
  includedFileCount: number;
  excludedFileCount: number;
}

export interface IContextOptions {
  maxTokens?: number;
  includeImports?: boolean;
  includeDependencies?: boolean;
  includeRecentFiles?: boolean;
  languageFilter?: string[];
  extensionFilter?: string[];
  relevanceThreshold?: number;
  compressionLevel?: CompressionLevel;
}

export enum CompressionLevel {
  NONE = 'none',
  LIGHT = 'light',
  MODERATE = 'moderate',
  AGGRESSIVE = 'aggressive'
}

export class ContextException extends Error {
  constructor(
    public readonly operation: string,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'ContextException';
  }
}

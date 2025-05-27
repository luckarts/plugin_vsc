import { IContextDetector, IWorkspaceContext, IImportInfo, IDependencyInfo } from './types';
/**
 * Detects and analyzes the current workspace context
 * Provides intelligent understanding of the development environment
 */
export declare class ContextDetector implements IContextDetector {
    private workspaceRoot;
    private gitExtension?;
    constructor();
    /**
     * Detect the complete current workspace context
     */
    detectCurrentContext(): Promise<IWorkspaceContext>;
    /**
     * Get relevant imports for a specific file
     */
    getRelevantImports(filePath: string): Promise<IImportInfo[]>;
    /**
     * Get files related to the given file
     */
    getRelatedFiles(filePath: string): Promise<string[]>;
    /**
     * Analyze code dependencies in content
     */
    analyzeCodeDependencies(content: string, language: string): Promise<IDependencyInfo>;
    /**
     * Detect active file context
     */
    private detectActiveFileContext;
    /**
     * Detect open files context
     */
    private detectOpenFiles;
    /**
     * Get recently accessed files
     */
    private getRecentFiles;
    /**
     * Analyze project structure
     */
    private analyzeProjectStructure;
    /**
     * Get workspace settings
     */
    private getWorkspaceSettings;
    /**
     * Get Git context if available
     */
    private getGitContext;
    /**
     * Parse imports from code content
     */
    private parseImports;
    /**
     * Parse exports from code content
     */
    private parseExports;
    /**
     * Parse symbols from code content
     */
    private parseSymbols;
    /**
     * Get surrounding context for cursor position
     */
    private getSurroundingContext;
    /**
     * Helper methods
     */
    private parseImportClause;
    private getImportType;
    private resolveLocalImport;
    private calculateFileRelevance;
    private getAllWorkspaceFiles;
    private getFilesInDirectory;
    private detectUnusedImports;
    private detectMissingImports;
}
//# sourceMappingURL=contextDetector.d.ts.map
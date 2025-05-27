import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  IContextDetector,
  IWorkspaceContext,
  IActiveFileContext,
  IOpenFileContext,
  IProjectStructure,
  IImportInfo,
  IDependencyInfo,
  IWorkspaceSettings,
  IGitContext,
  ISurroundingContext,
  ISymbolInfo,
  IExportInfo,
  ImportType,
  ExportType,
  SymbolType,
  ContextException
} from './types';

/**
 * Detects and analyzes the current workspace context
 * Provides intelligent understanding of the development environment
 */
export class ContextDetector implements IContextDetector {
  private workspaceRoot: string;
  private gitExtension?: vscode.Extension<any>;

  constructor() {
    this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    this.gitExtension = vscode.extensions.getExtension('vscode.git');
  }

  /**
   * Detect the complete current workspace context
   */
  async detectCurrentContext(): Promise<IWorkspaceContext> {
    try {
      const [activeFile, openFiles, recentFiles, projectStructure, workspaceSettings, gitContext] = await Promise.all([
        this.detectActiveFileContext(),
        this.detectOpenFiles(),
        this.getRecentFiles(),
        this.analyzeProjectStructure(),
        this.getWorkspaceSettings(),
        this.getGitContext()
      ]);

      return {
        activeFile,
        openFiles,
        recentFiles,
        projectStructure,
        workspaceSettings,
        gitContext
      };

    } catch (error) {
      throw new ContextException('detectCurrentContext', 'Failed to detect workspace context', error);
    }
  }

  /**
   * Get relevant imports for a specific file
   */
  async getRelevantImports(filePath: string): Promise<IImportInfo[]> {
    try {
      const document = await vscode.workspace.openTextDocument(filePath);
      const content = document.getText();
      const language = document.languageId;

      return this.parseImports(content, language);

    } catch (error) {
      throw new ContextException('getRelevantImports', `Failed to get imports for ${filePath}`, error);
    }
  }

  /**
   * Get files related to the given file
   */
  async getRelatedFiles(filePath: string): Promise<string[]> {
    try {
      const relatedFiles = new Set<string>();
      
      // Get imports from the file
      const imports = await this.getRelevantImports(filePath);
      
      // Add imported files
      for (const importInfo of imports) {
        if (importInfo.isLocal && importInfo.resolvedPath) {
          relatedFiles.add(importInfo.resolvedPath);
        }
      }

      // Find files that import this file
      const allFiles = await this.getAllWorkspaceFiles();
      for (const file of allFiles) {
        try {
          const fileImports = await this.getRelevantImports(file);
          const relativeFilePath = path.relative(path.dirname(file), filePath);
          
          if (fileImports.some(imp => imp.source.includes(path.basename(filePath, path.extname(filePath))))) {
            relatedFiles.add(file);
          }
        } catch {
          // Skip files that can't be analyzed
        }
      }

      // Add files in the same directory
      const directory = path.dirname(filePath);
      const siblingFiles = await this.getFilesInDirectory(directory);
      siblingFiles.slice(0, 5).forEach(file => relatedFiles.add(file)); // Limit to 5 siblings

      return Array.from(relatedFiles).filter(file => file !== filePath);

    } catch (error) {
      throw new ContextException('getRelatedFiles', `Failed to get related files for ${filePath}`, error);
    }
  }

  /**
   * Analyze code dependencies in content
   */
  async analyzeCodeDependencies(content: string, language: string): Promise<IDependencyInfo> {
    try {
      const imports = this.parseImports(content, language);
      const exports = this.parseExports(content, language);
      
      const internalDependencies: string[] = [];
      const externalDependencies: string[] = [];
      
      for (const importInfo of imports) {
        if (importInfo.isLocal) {
          internalDependencies.push(importInfo.source);
        } else {
          externalDependencies.push(importInfo.source);
        }
      }

      // Detect unused imports (simplified)
      const unusedImports = this.detectUnusedImports(content, imports);
      
      // Detect missing imports (simplified)
      const missingImports = this.detectMissingImports(content, language);

      return {
        imports,
        exports,
        internalDependencies: [...new Set(internalDependencies)],
        externalDependencies: [...new Set(externalDependencies)],
        unusedImports,
        missingImports
      };

    } catch (error) {
      throw new ContextException('analyzeCodeDependencies', 'Failed to analyze code dependencies', error);
    }
  }

  /**
   * Detect active file context
   */
  private async detectActiveFileContext(): Promise<IActiveFileContext | undefined> {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      return undefined;
    }

    const document = activeEditor.document;
    const content = document.getText();
    const language = document.languageId;
    const cursorPosition = activeEditor.selection.active;
    const selectedText = document.getText(activeEditor.selection);

    const [imports, exports, symbols, surroundingContext] = await Promise.all([
      this.getRelevantImports(document.fileName),
      this.parseExports(content, language),
      this.parseSymbols(content, language),
      this.getSurroundingContext(document, cursorPosition)
    ]);

    return {
      filePath: document.fileName,
      language,
      content,
      cursorPosition: {
        line: cursorPosition.line,
        character: cursorPosition.character
      },
      selectedText: selectedText || undefined,
      surroundingContext,
      imports,
      exports,
      symbols
    };
  }

  /**
   * Detect open files context
   */
  private async detectOpenFiles(): Promise<IOpenFileContext[]> {
    const openFiles: IOpenFileContext[] = [];
    
    for (const tabGroup of vscode.window.tabGroups.all) {
      for (const tab of tabGroup.tabs) {
        if (tab.input instanceof vscode.TabInputText) {
          const document = await vscode.workspace.openTextDocument(tab.input.uri);
          
          openFiles.push({
            filePath: document.fileName,
            language: document.languageId,
            isModified: document.isDirty,
            lastAccessed: Date.now(), // Simplified - would track actual access time
            relevanceScore: this.calculateFileRelevance(document.fileName)
          });
        }
      }
    }

    return openFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get recently accessed files
   */
  private async getRecentFiles(): Promise<string[]> {
    // This would integrate with VSCode's recent files API
    // For now, return open files as a proxy
    const openFiles = await this.detectOpenFiles();
    return openFiles.map(file => file.filePath);
  }

  /**
   * Analyze project structure
   */
  private async analyzeProjectStructure(): Promise<IProjectStructure> {
    const filesByExtension = new Map<string, string[]>();
    const mainDirectories: string[] = [];
    let totalFiles = 0;

    // Get all files in workspace
    const files = await this.getAllWorkspaceFiles();
    totalFiles = files.length;

    // Group by extension
    for (const file of files) {
      const ext = path.extname(file);
      if (!filesByExtension.has(ext)) {
        filesByExtension.set(ext, []);
      }
      filesByExtension.get(ext)!.push(file);
    }

    // Find main directories
    const directories = new Set<string>();
    for (const file of files) {
      const relativePath = path.relative(this.workspaceRoot, file);
      const firstDir = relativePath.split(path.sep)[0];
      if (firstDir && !firstDir.startsWith('.')) {
        directories.add(firstDir);
      }
    }
    mainDirectories.push(...Array.from(directories).slice(0, 10)); // Top 10 directories

    // Read package.json if exists
    let packageJson;
    try {
      const packagePath = path.join(this.workspaceRoot, 'package.json');
      const packageContent = await fs.promises.readFile(packagePath, 'utf8');
      packageJson = JSON.parse(packageContent);
    } catch {
      // No package.json or invalid
    }

    // Read tsconfig.json if exists
    let tsConfig;
    try {
      const tsConfigPath = path.join(this.workspaceRoot, 'tsconfig.json');
      const tsConfigContent = await fs.promises.readFile(tsConfigPath, 'utf8');
      tsConfig = JSON.parse(tsConfigContent);
    } catch {
      // No tsconfig.json or invalid
    }

    return {
      rootPath: this.workspaceRoot,
      packageJson,
      tsConfig,
      mainDirectories,
      filesByExtension,
      totalFiles
    };
  }

  /**
   * Get workspace settings
   */
  private getWorkspaceSettings(): IWorkspaceSettings {
    const config = vscode.workspace.getConfiguration();
    
    return {
      language: vscode.env.language,
      tabSize: config.get('editor.tabSize', 4),
      insertSpaces: config.get('editor.insertSpaces', true),
      trimTrailingWhitespace: config.get('files.trimTrailingWhitespace', false),
      endOfLine: config.get('files.eol', 'auto')
    };
  }

  /**
   * Get Git context if available
   */
  private async getGitContext(): Promise<IGitContext | undefined> {
    if (!this.gitExtension?.isActive) {
      return undefined;
    }

    try {
      const git = this.gitExtension.exports.getAPI(1);
      const repository = git.repositories[0];
      
      if (!repository) {
        return undefined;
      }

      const branch = repository.state.HEAD?.name || 'unknown';
      const hasUncommittedChanges = repository.state.workingTreeChanges.length > 0;
      const modifiedFiles = repository.state.workingTreeChanges.map((change: any) => change.uri.fsPath);

      return {
        branch,
        hasUncommittedChanges,
        recentCommits: [], // Would implement commit history
        modifiedFiles
      };

    } catch (error) {
      console.error('Failed to get Git context:', error);
      return undefined;
    }
  }

  /**
   * Parse imports from code content
   */
  private parseImports(content: string, language: string): IImportInfo[] {
    const imports: IImportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (language === 'typescript' || language === 'javascript') {
        // ES6 imports
        const importMatch = line.match(/import\s+(.+?)\s+from\s+['"`](.+?)['"`]/);
        if (importMatch) {
          const importClause = importMatch[1];
          const source = importMatch[2];
          const isLocal = source.startsWith('.') || source.startsWith('/');
          
          imports.push({
            source,
            imports: this.parseImportClause(importClause),
            type: this.getImportType(importClause),
            isLocal,
            resolvedPath: isLocal ? this.resolveLocalImport(source, path.dirname('')) : undefined,
            line: i + 1
          });
        }

        // CommonJS require
        const requireMatch = line.match(/(?:const|let|var)\s+(.+?)\s*=\s*require\(['"`](.+?)['"`]\)/);
        if (requireMatch) {
          const importClause = requireMatch[1];
          const source = requireMatch[2];
          const isLocal = source.startsWith('.') || source.startsWith('/');
          
          imports.push({
            source,
            imports: [importClause.replace(/[{}]/g, '').trim()],
            type: ImportType.NAMED,
            isLocal,
            resolvedPath: isLocal ? this.resolveLocalImport(source, path.dirname('')) : undefined,
            line: i + 1
          });
        }
      }
    }

    return imports;
  }

  /**
   * Parse exports from code content
   */
  private parseExports(content: string, language: string): IExportInfo[] {
    const exports: IExportInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (language === 'typescript' || language === 'javascript') {
        // Default export
        if (line.startsWith('export default')) {
          const name = line.replace('export default', '').trim().split(/\s+/)[0];
          exports.push({
            name: name || 'default',
            type: ExportType.DEFAULT,
            line: i + 1,
            isDefault: true
          });
        }
        
        // Named exports
        const namedExportMatch = line.match(/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/);
        if (namedExportMatch) {
          exports.push({
            name: namedExportMatch[1],
            type: ExportType.NAMED,
            line: i + 1,
            isDefault: false
          });
        }
      }
    }

    return exports;
  }

  /**
   * Parse symbols from code content
   */
  private parseSymbols(content: string, language: string): ISymbolInfo[] {
    const symbols: ISymbolInfo[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (language === 'typescript' || language === 'javascript') {
        // Functions
        const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
        if (functionMatch) {
          symbols.push({
            name: functionMatch[1],
            type: SymbolType.FUNCTION,
            line: i + 1,
            scope: 'global',
            parameters: functionMatch[2] ? functionMatch[2].split(',').map(p => p.trim()) : []
          });
        }

        // Classes
        const classMatch = line.match(/(?:export\s+)?class\s+(\w+)/);
        if (classMatch) {
          symbols.push({
            name: classMatch[1],
            type: SymbolType.CLASS,
            line: i + 1,
            scope: 'global'
          });
        }

        // Interfaces
        const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/);
        if (interfaceMatch) {
          symbols.push({
            name: interfaceMatch[1],
            type: SymbolType.INTERFACE,
            line: i + 1,
            scope: 'global'
          });
        }
      }
    }

    return symbols;
  }

  /**
   * Get surrounding context for cursor position
   */
  private getSurroundingContext(document: vscode.TextDocument, position: vscode.Position): ISurroundingContext {
    const lineCount = document.lineCount;
    const currentLine = position.line;
    
    // Get context before and after cursor
    const beforeStart = Math.max(0, currentLine - 5);
    const afterEnd = Math.min(lineCount - 1, currentLine + 5);
    
    const beforeCursor = document.getText(new vscode.Range(beforeStart, 0, currentLine, position.character));
    const afterCursor = document.getText(new vscode.Range(currentLine, position.character, afterEnd, 0));
    
    // Detect current scope
    const currentLineText = document.lineAt(currentLine).text;
    const indentationLevel = currentLineText.length - currentLineText.trimStart().length;
    
    return {
      beforeCursor,
      afterCursor,
      currentScope: 'global', // Simplified - would implement proper scope detection
      indentationLevel
    };
  }

  /**
   * Helper methods
   */
  private parseImportClause(clause: string): string[] {
    // Simplified import parsing
    if (clause.includes('{')) {
      return clause.replace(/[{}]/g, '').split(',').map(s => s.trim());
    }
    return [clause.trim()];
  }

  private getImportType(clause: string): ImportType {
    if (clause.includes('{')) return ImportType.NAMED;
    if (clause.includes('*')) return ImportType.NAMESPACE;
    return ImportType.DEFAULT;
  }

  private resolveLocalImport(source: string, basePath: string): string {
    return path.resolve(basePath, source);
  }

  private calculateFileRelevance(filePath: string): number {
    // Simplified relevance calculation
    const ext = path.extname(filePath);
    const relevanceMap: Record<string, number> = {
      '.ts': 1.0,
      '.js': 0.9,
      '.tsx': 0.95,
      '.jsx': 0.85,
      '.json': 0.3,
      '.md': 0.2
    };
    return relevanceMap[ext] || 0.5;
  }

  private async getAllWorkspaceFiles(): Promise<string[]> {
    const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
    return files.map(file => file.fsPath);
  }

  private async getFilesInDirectory(directory: string): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(directory);
      return files.map(file => path.join(directory, file));
    } catch {
      return [];
    }
  }

  private detectUnusedImports(content: string, imports: IImportInfo[]): string[] {
    const unused: string[] = [];
    
    for (const importInfo of imports) {
      for (const importName of importInfo.imports) {
        // Simple check - look for usage in content
        const regex = new RegExp(`\\b${importName}\\b`, 'g');
        const matches = content.match(regex);
        
        // If only found in import statement, it might be unused
        if (!matches || matches.length <= 1) {
          unused.push(importName);
        }
      }
    }
    
    return unused;
  }

  private detectMissingImports(content: string, language: string): string[] {
    // Simplified missing import detection
    // Would implement proper AST analysis for production
    const missing: string[] = [];
    
    if (language === 'typescript' || language === 'javascript') {
      // Look for common patterns that might need imports
      const patterns = [
        /React\./g,
        /useState/g,
        /useEffect/g,
        /Component/g
      ];
      
      for (const pattern of patterns) {
        if (pattern.test(content)) {
          const match = pattern.source.replace(/[\\/.]/g, '');
          if (!content.includes(`import`) || !content.includes(match)) {
            missing.push(match);
          }
        }
      }
    }
    
    return missing;
  }
}

"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextDetector = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const types_1 = require("./types");
/**
 * Detects and analyzes the current workspace context
 * Provides intelligent understanding of the development environment
 */
class ContextDetector {
    constructor() {
        this.workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
        this.gitExtension = vscode.extensions.getExtension('vscode.git');
    }
    /**
     * Detect the complete current workspace context
     */
    async detectCurrentContext() {
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
        }
        catch (error) {
            throw new types_1.ContextException('detectCurrentContext', 'Failed to detect workspace context', error);
        }
    }
    /**
     * Get relevant imports for a specific file
     */
    async getRelevantImports(filePath) {
        try {
            const document = await vscode.workspace.openTextDocument(filePath);
            const content = document.getText();
            const language = document.languageId;
            return this.parseImports(content, language);
        }
        catch (error) {
            throw new types_1.ContextException('getRelevantImports', `Failed to get imports for ${filePath}`, error);
        }
    }
    /**
     * Get files related to the given file
     */
    async getRelatedFiles(filePath) {
        try {
            const relatedFiles = new Set();
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
                }
                catch {
                    // Skip files that can't be analyzed
                }
            }
            // Add files in the same directory
            const directory = path.dirname(filePath);
            const siblingFiles = await this.getFilesInDirectory(directory);
            siblingFiles.slice(0, 5).forEach(file => relatedFiles.add(file)); // Limit to 5 siblings
            return Array.from(relatedFiles).filter(file => file !== filePath);
        }
        catch (error) {
            throw new types_1.ContextException('getRelatedFiles', `Failed to get related files for ${filePath}`, error);
        }
    }
    /**
     * Analyze code dependencies in content
     */
    async analyzeCodeDependencies(content, language) {
        try {
            const imports = this.parseImports(content, language);
            const exports = this.parseExports(content, language);
            const internalDependencies = [];
            const externalDependencies = [];
            for (const importInfo of imports) {
                if (importInfo.isLocal) {
                    internalDependencies.push(importInfo.source);
                }
                else {
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
        }
        catch (error) {
            throw new types_1.ContextException('analyzeCodeDependencies', 'Failed to analyze code dependencies', error);
        }
    }
    /**
     * Detect active file context
     */
    async detectActiveFileContext() {
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
    async detectOpenFiles() {
        const openFiles = [];
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
    async getRecentFiles() {
        // This would integrate with VSCode's recent files API
        // For now, return open files as a proxy
        const openFiles = await this.detectOpenFiles();
        return openFiles.map(file => file.filePath);
    }
    /**
     * Analyze project structure
     */
    async analyzeProjectStructure() {
        const filesByExtension = new Map();
        const mainDirectories = [];
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
            filesByExtension.get(ext).push(file);
        }
        // Find main directories
        const directories = new Set();
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
        }
        catch {
            // No package.json or invalid
        }
        // Read tsconfig.json if exists
        let tsConfig;
        try {
            const tsConfigPath = path.join(this.workspaceRoot, 'tsconfig.json');
            const tsConfigContent = await fs.promises.readFile(tsConfigPath, 'utf8');
            tsConfig = JSON.parse(tsConfigContent);
        }
        catch {
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
    getWorkspaceSettings() {
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
    async getGitContext() {
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
            const modifiedFiles = repository.state.workingTreeChanges.map((change) => change.uri.fsPath);
            return {
                branch,
                hasUncommittedChanges,
                recentCommits: [], // Would implement commit history
                modifiedFiles
            };
        }
        catch (error) {
            console.error('Failed to get Git context:', error);
            return undefined;
        }
    }
    /**
     * Parse imports from code content
     */
    parseImports(content, language) {
        const imports = [];
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
                        type: types_1.ImportType.NAMED,
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
    parseExports(content, language) {
        const exports = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (language === 'typescript' || language === 'javascript') {
                // Default export
                if (line.startsWith('export default')) {
                    const name = line.replace('export default', '').trim().split(/\s+/)[0];
                    exports.push({
                        name: name || 'default',
                        type: types_1.ExportType.DEFAULT,
                        line: i + 1,
                        isDefault: true
                    });
                }
                // Named exports
                const namedExportMatch = line.match(/export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/);
                if (namedExportMatch) {
                    exports.push({
                        name: namedExportMatch[1],
                        type: types_1.ExportType.NAMED,
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
    parseSymbols(content, language) {
        const symbols = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (language === 'typescript' || language === 'javascript') {
                // Functions
                const functionMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/);
                if (functionMatch) {
                    symbols.push({
                        name: functionMatch[1],
                        type: types_1.SymbolType.FUNCTION,
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
                        type: types_1.SymbolType.CLASS,
                        line: i + 1,
                        scope: 'global'
                    });
                }
                // Interfaces
                const interfaceMatch = line.match(/(?:export\s+)?interface\s+(\w+)/);
                if (interfaceMatch) {
                    symbols.push({
                        name: interfaceMatch[1],
                        type: types_1.SymbolType.INTERFACE,
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
    getSurroundingContext(document, position) {
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
    parseImportClause(clause) {
        // Simplified import parsing
        if (clause.includes('{')) {
            return clause.replace(/[{}]/g, '').split(',').map(s => s.trim());
        }
        return [clause.trim()];
    }
    getImportType(clause) {
        if (clause.includes('{'))
            return types_1.ImportType.NAMED;
        if (clause.includes('*'))
            return types_1.ImportType.NAMESPACE;
        return types_1.ImportType.DEFAULT;
    }
    resolveLocalImport(source, basePath) {
        return path.resolve(basePath, source);
    }
    calculateFileRelevance(filePath) {
        // Simplified relevance calculation
        const ext = path.extname(filePath);
        const relevanceMap = {
            '.ts': 1.0,
            '.js': 0.9,
            '.tsx': 0.95,
            '.jsx': 0.85,
            '.json': 0.3,
            '.md': 0.2
        };
        return relevanceMap[ext] || 0.5;
    }
    async getAllWorkspaceFiles() {
        const files = await vscode.workspace.findFiles('**/*', '**/node_modules/**');
        return files.map(file => file.fsPath);
    }
    async getFilesInDirectory(directory) {
        try {
            const files = await fs.promises.readdir(directory);
            return files.map(file => path.join(directory, file));
        }
        catch {
            return [];
        }
    }
    detectUnusedImports(content, imports) {
        const unused = [];
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
    detectMissingImports(content, language) {
        // Simplified missing import detection
        // Would implement proper AST analysis for production
        const missing = [];
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
exports.ContextDetector = ContextDetector;
//# sourceMappingURL=contextDetector.js.map
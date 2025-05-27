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
exports.VectorDatabase = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const embeddingProvider_1 = require("./vectoring/embeddingProvider");
const codeParser_1 = require("./vectoring/codeParser");
const vectorStore_1 = require("./vectoring/vectorStore");
const contextualRetriever_1 = require("./contextual/contextualRetriever");
const types_1 = require("./vectoring/types");
class VectorDatabase {
    constructor(globalStorageUri) {
        this.isInitialized = false;
        this.indexingProgress = null;
        // Configuration optimized for i5-7300U
        this.config = {
            maxChunkSize: 512,
            chunkOverlap: 50,
            batchSize: 4, // Optimized for 4-core CPU
            maxConcurrency: 2,
            excludePatterns: [
                '**/node_modules/**',
                '**/dist/**',
                '**/build/**',
                '**/.git/**',
                '**/coverage/**',
                '**/*.min.js',
                '**/*.map'
            ],
            includePatterns: [
                '**/*.ts',
                '**/*.js',
                '**/*.tsx',
                '**/*.jsx',
                '**/*.py',
                '**/*.java',
                '**/*.cs',
                '**/*.cpp',
                '**/*.c',
                '**/*.go',
                '**/*.rs'
            ],
            supportedLanguages: ['typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'c', 'go', 'rust'],
            similarityThreshold: 0.7,
            maxResults: 10
        };
        this.storageUri = vscode.Uri.joinPath(globalStorageUri, 'vectordb');
        this.embeddingProvider = new embeddingProvider_1.TransformersEmbeddingProvider('Xenova/all-MiniLM-L6-v2');
        this.vectorStore = new vectorStore_1.FileVectorStore(this.storageUri);
        // Initialize contextual retriever with optimized configuration
        const contextualConfig = {
            semanticWeight: 0.4,
            temporalWeight: 0.25,
            spatialWeight: 0.25,
            structuralWeight: 0.1,
            maxResults: 10,
            minSemanticThreshold: 0.3,
            recentModificationBonus: 10 * 60 * 1000, // 10 minutes
            sameFileBonus: 0.3,
            sameDirectoryBonus: 0.2
        };
        this.contextualRetriever = new contextualRetriever_1.ContextualRetriever(this, globalStorageUri, contextualConfig);
    }
    /**
     * Initialize the vector database
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        try {
            vscode.window.showInformationMessage('🚀 Initializing Code Assistant AI vector database...');
            // Create storage directory
            await this.initStorage();
            // Initialize components
            await this.embeddingProvider.initialize();
            await this.vectorStore.initialize();
            this.isInitialized = true;
            vscode.window.showInformationMessage('✅ Vector database initialized successfully!');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to initialize vector database: ${errorMessage}`);
            throw new types_1.VectoringException('initialize', 'Failed to initialize vector database', error);
        }
    }
    /**
     * Index entire workspace
     */
    async indexWorkspace(workspacePath) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        const workspaceFolder = workspacePath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceFolder) {
            throw new types_1.VectoringException('indexWorkspace', 'No workspace folder found');
        }
        try {
            // Initialize progress tracking
            this.indexingProgress = {
                totalFiles: 0,
                processedFiles: 0,
                currentFile: '',
                status: types_1.IndexingStatus.SCANNING,
                errors: []
            };
            vscode.window.showInformationMessage('📊 Scanning workspace for files to index...');
            // Find all files to index
            const files = await this.findFilesToIndex(workspaceFolder);
            this.indexingProgress.totalFiles = files.length;
            this.indexingProgress.status = types_1.IndexingStatus.PROCESSING;
            vscode.window.showInformationMessage(`📚 Found ${files.length} files to index. Starting indexation...`);
            // Process files in batches
            await this.processFilesInBatches(files);
            this.indexingProgress.status = types_1.IndexingStatus.COMPLETED;
            const stats = await this.getStats();
            vscode.window.showInformationMessage(`🎉 Indexing completed! Processed ${stats.totalChunks} code chunks from ${stats.totalFiles} files.`);
        }
        catch (error) {
            if (this.indexingProgress) {
                this.indexingProgress.status = types_1.IndexingStatus.ERROR;
                this.indexingProgress.errors.push(error instanceof Error ? error.message : 'Unknown error');
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Workspace indexing failed: ${errorMessage}`);
            throw new types_1.VectoringException('indexWorkspace', 'Failed to index workspace', error);
        }
    }
    /**
     * Index a single file
     */
    async indexFile(filePath) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            const fileUri = vscode.Uri.file(filePath);
            // Read file content
            const content = await vscode.workspace.fs.readFile(fileUri);
            const text = new TextDecoder().decode(content);
            // Parse file into chunks
            const parser = codeParser_1.CodeParser.getParserForFile(filePath);
            const chunks = await parser.parseFile(text, filePath);
            if (chunks.length === 0) {
                return; // No meaningful content to index
            }
            // Generate embeddings for chunks
            const embeddings = await this.embeddingProvider.embedBatch(chunks.map(chunk => chunk.content));
            // Create vector entries
            const vectorEntries = chunks.map((chunk, index) => ({
                id: `${chunk.id}_vector`,
                chunkId: chunk.id,
                vector: embeddings[index]
            }));
            // Store vectors
            await this.vectorStore.store(vectorEntries);
            // Update temporal information for contextual retrieval
            await this.contextualRetriever.updateFileModificationTime(filePath);
        }
        catch (error) {
            throw new types_1.VectoringException('indexFile', `Failed to index file ${filePath}`, error);
        }
    }
    /**
     * Search for relevant code based on query
     */
    async search(query, limit = 10) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            // Generate embedding for query
            const queryVector = await this.embeddingProvider.embed(query);
            // Search vector store
            const vectorResults = await this.vectorStore.search(queryVector, limit * 2); // Get more results for filtering
            // Filter by similarity threshold and convert to search results
            const results = [];
            for (const vectorEntry of vectorResults) {
                if ((vectorEntry.similarity || 0) >= this.config.similarityThreshold) {
                    // Find the corresponding chunk (in a real implementation, you'd store chunk data separately)
                    // For now, we'll create a minimal result
                    const result = {
                        chunk: {
                            id: vectorEntry.chunkId,
                            filePath: '', // Would be retrieved from chunk storage
                            content: '', // Would be retrieved from chunk storage
                            startLine: 0,
                            endLine: 0,
                            language: '',
                            type: 'block',
                            metadata: { lastModified: Date.now() }
                        },
                        similarity: vectorEntry.similarity || 0,
                        relevanceScore: vectorEntry.similarity || 0
                    };
                    results.push(result);
                }
            }
            return results.slice(0, limit);
        }
        catch (error) {
            throw new types_1.VectoringException('search', 'Failed to search vector database', error);
        }
    }
    /**
     * Get relevant code snippets for a query using contextual retrieval
     */
    async getRelevantCode(query, limit = 5) {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            const activeFilePath = activeEditor?.document.fileName;
            // Use contextual retriever for intelligent context selection
            const contextualResults = await this.contextualRetriever.search(query, activeFilePath);
            // Convert to context strings with relevance information
            const contextStrings = [];
            for (let i = 0; i < Math.min(limit, contextualResults.length); i++) {
                const result = contextualResults[i];
                const chunk = result.chunk;
                const filePath = chunk.filePath.split('/').pop() || chunk.filePath;
                let contextString = `// File: ${filePath} (Lines ${chunk.startLine}-${chunk.endLine})\n`;
                contextString += `// Relevance: ${(result.finalScore * 100).toFixed(1)}% `;
                contextString += `[S:${(result.scores.semantic * 100).toFixed(0)}% `;
                contextString += `T:${(result.scores.temporal * 100).toFixed(0)}% `;
                contextString += `P:${(result.scores.spatial * 100).toFixed(0)}% `;
                contextString += `C:${(result.scores.structural * 100).toFixed(0)}%]\n`;
                if (chunk.metadata.functionName) {
                    contextString += `// Function: ${chunk.metadata.functionName}\n`;
                }
                if (chunk.metadata.className) {
                    contextString += `// Class: ${chunk.metadata.className}\n`;
                }
                contextString += chunk.content;
                contextStrings.push(contextString);
            }
            return contextStrings;
        }
        catch (error) {
            console.error('Failed to get relevant code:', error);
            // Fallback to basic search
            try {
                const results = await this.search(query, limit);
                return results.map(result => result.chunk.content).filter(content => content.length > 0);
            }
            catch (fallbackError) {
                console.error('Fallback search also failed:', fallbackError);
                return [];
            }
        }
    }
    /**
     * Delete indexed data for a file
     */
    async deleteFile(filePath) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            // Find chunks for this file
            const fileName = path.basename(filePath);
            const chunkIds = [fileName]; // Simplified - would need proper chunk ID tracking
            await this.vectorStore.delete(chunkIds);
        }
        catch (error) {
            throw new types_1.VectoringException('deleteFile', `Failed to delete file ${filePath}`, error);
        }
    }
    /**
     * Clear all indexed data
     */
    async clear() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            await this.vectorStore.clear();
            vscode.window.showInformationMessage('🗑️ Vector database cleared successfully');
        }
        catch (error) {
            throw new types_1.VectoringException('clear', 'Failed to clear vector database', error);
        }
    }
    /**
     * Get database statistics
     */
    async getStats() {
        if (!this.isInitialized) {
            await this.initialize();
        }
        try {
            const storeStats = await this.vectorStore.getStats();
            return {
                totalChunks: storeStats.size,
                totalFiles: 0, // Would need to track this separately
                indexSize: storeStats.storageSize,
                lastUpdated: storeStats.lastUpdated,
                languages: {} // Would need to track this separately
            };
        }
        catch (error) {
            return {
                totalChunks: 0,
                totalFiles: 0,
                indexSize: 0,
                lastUpdated: Date.now(),
                languages: {}
            };
        }
    }
    /**
     * Get current indexing progress
     */
    getIndexingProgress() {
        return this.indexingProgress;
    }
    async initStorage() {
        try {
            await vscode.workspace.fs.stat(this.storageUri);
        }
        catch {
            await vscode.workspace.fs.createDirectory(this.storageUri);
        }
    }
    /**
     * Find files to index in workspace
     */
    async findFilesToIndex(workspacePath) {
        const files = [];
        try {
            const workspaceUri = vscode.Uri.file(workspacePath);
            // Use VSCode's file search API
            for (const pattern of this.config.includePatterns) {
                const foundFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceUri, pattern), new vscode.RelativePattern(workspaceUri, `{${this.config.excludePatterns.join(',')}}`));
                files.push(...foundFiles.map(uri => uri.fsPath));
            }
            // Remove duplicates
            return [...new Set(files)];
        }
        catch (error) {
            throw new types_1.VectoringException('findFilesToIndex', 'Failed to find files to index', error);
        }
    }
    /**
     * Process files in batches optimized for i5-7300U
     */
    async processFilesInBatches(files) {
        const batchSize = this.config.batchSize;
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            // Process batch with limited concurrency
            const promises = batch.map(async (filePath, index) => {
                try {
                    if (this.indexingProgress) {
                        this.indexingProgress.currentFile = path.basename(filePath);
                        this.indexingProgress.processedFiles = i + index + 1;
                    }
                    await this.indexFile(filePath);
                    // Small delay to prevent CPU overload
                    await this.sleep(50);
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error(`Failed to index file ${filePath}:`, error);
                    if (this.indexingProgress) {
                        this.indexingProgress.errors.push(`${path.basename(filePath)}: ${errorMessage}`);
                    }
                }
            });
            // Wait for batch to complete with limited concurrency
            await this.processConcurrently(promises, this.config.maxConcurrency);
            // Progress update
            if (this.indexingProgress) {
                const progress = Math.round((this.indexingProgress.processedFiles / this.indexingProgress.totalFiles) * 100);
                vscode.window.showInformationMessage(`📊 Indexing progress: ${progress}% (${this.indexingProgress.processedFiles}/${this.indexingProgress.totalFiles})`);
            }
        }
    }
    /**
     * Process promises with limited concurrency
     */
    async processConcurrently(promises, maxConcurrency) {
        const results = [];
        for (let i = 0; i < promises.length; i += maxConcurrency) {
            const batch = promises.slice(i, i + maxConcurrency);
            const batchResults = await Promise.allSettled(batch);
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
            }
        }
        return results;
    }
    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Initialize vector database with progress tracking
     */
    async initializeWithProgress() {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Initializing Code Assistant AI",
            cancellable: false
        }, async (progress) => {
            progress.report({ increment: 0, message: "Loading embedding model..." });
            await this.initialize();
            progress.report({ increment: 100, message: "Ready!" });
        });
    }
    /**
     * Index workspace with progress tracking
     */
    async indexWorkspaceWithProgress() {
        return vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Indexing Workspace",
            cancellable: true
        }, async (progress, token) => {
            await this.indexWorkspace();
            // Update progress based on indexing progress
            const updateProgress = () => {
                if (this.indexingProgress) {
                    const percent = Math.round((this.indexingProgress.processedFiles / this.indexingProgress.totalFiles) * 100);
                    progress.report({
                        increment: percent,
                        message: `${this.indexingProgress.currentFile} (${this.indexingProgress.processedFiles}/${this.indexingProgress.totalFiles})`
                    });
                }
            };
            const interval = setInterval(updateProgress, 1000);
            try {
                await this.indexWorkspace();
            }
            finally {
                clearInterval(interval);
            }
        });
    }
    /**
     * Get contextual search statistics
     */
    async getContextualStats() {
        return await this.contextualRetriever.getSearchStats();
    }
    /**
     * Explain contextual ranking for debugging
     */
    async explainContextualRanking(query) {
        const activeEditor = vscode.window.activeTextEditor;
        const activeFilePath = activeEditor?.document.fileName;
        return await this.contextualRetriever.explainRanking(query, activeFilePath);
    }
    /**
     * Get recently modified files
     */
    async getRecentlyModifiedFiles(maxAge = 60 * 60 * 1000) {
        return await this.contextualRetriever.getRecentlyModifiedFiles(maxAge);
    }
    /**
     * Get files near the active file
     */
    async getNearbyFiles(maxResults = 10) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return [];
        }
        return await this.contextualRetriever.getNearbyFiles(activeEditor.document.fileName, maxResults);
    }
    /**
     * Get contextual retriever instance for advanced usage
     */
    getContextualRetriever() {
        return this.contextualRetriever;
    }
}
exports.VectorDatabase = VectorDatabase;
//# sourceMappingURL=vectorDb.js.map
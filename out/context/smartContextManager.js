"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartContextManager = void 0;
const contextDetector_1 = require("./contextDetector");
const contextFilter_1 = require("./contextFilter");
const contextOptimizer_1 = require("./contextOptimizer");
const contextPreview_1 = require("./contextPreview");
const types_1 = require("./types");
/**
 * Smart context manager that orchestrates all context-related operations
 * Provides intelligent context building, optimization, and preview capabilities
 */
class SmartContextManager {
    constructor(contextualRetriever) {
        this.contextDetector = new contextDetector_1.ContextDetector();
        this.contextFilter = new contextFilter_1.ContextFilter();
        this.contextOptimizer = new contextOptimizer_1.ContextOptimizer();
        this.contextPreview = new contextPreview_1.ContextPreview();
        this.contextualRetriever = contextualRetriever;
    }
    /**
     * Build intelligent context for a query
     * @param query User query
     * @param options Context building options
     * @returns Smart context with all relevant information
     */
    async buildContext(query, options = {}) {
        try {
            const startTime = Date.now();
            // Set default options
            const opts = this.mergeWithDefaults(options);
            // Step 1: Detect current workspace context
            const workspaceContext = await this.contextDetector.detectCurrentContext();
            // Step 2: Apply filters based on options
            let filteredContext = workspaceContext;
            if (opts.languageFilter && opts.languageFilter.length > 0) {
                filteredContext = this.contextFilter.filterByLanguage(filteredContext, opts.languageFilter);
            }
            if (opts.extensionFilter && opts.extensionFilter.length > 0) {
                filteredContext = this.contextFilter.filterByExtension(filteredContext, opts.extensionFilter);
            }
            if (opts.relevanceThreshold !== undefined) {
                filteredContext = this.contextFilter.filterByRelevance(filteredContext, opts.relevanceThreshold);
            }
            // Step 3: Get contextually relevant code using the retriever
            const activeFilePath = workspaceContext.activeFile?.filePath;
            const contextualResults = await this.contextualRetriever.search(query, activeFilePath);
            // Convert contextual results to context strings
            const relevantCode = contextualResults.map(result => {
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
                return contextString;
            });
            // Step 4: Add additional context based on options
            if (opts.includeImports && workspaceContext.activeFile) {
                const imports = await this.contextDetector.getRelevantImports(workspaceContext.activeFile.filePath);
                const importContext = this.buildImportContext(imports);
                if (importContext) {
                    relevantCode.unshift(importContext);
                }
            }
            if (opts.includeDependencies && workspaceContext.activeFile) {
                const dependencies = await this.contextDetector.analyzeCodeDependencies(workspaceContext.activeFile.content, workspaceContext.activeFile.language);
                const depContext = this.buildDependencyContext(dependencies);
                if (depContext) {
                    relevantCode.push(depContext);
                }
            }
            if (opts.includeRecentFiles) {
                const recentContext = this.buildRecentFilesContext(filteredContext);
                if (recentContext) {
                    relevantCode.push(recentContext);
                }
            }
            // Step 5: Analyze dependencies
            const dependencies = workspaceContext.activeFile
                ? await this.contextDetector.analyzeCodeDependencies(workspaceContext.activeFile.content, workspaceContext.activeFile.language)
                : {
                    imports: [],
                    exports: [],
                    internalDependencies: [],
                    externalDependencies: [],
                    unusedImports: [],
                    missingImports: []
                };
            // Step 6: Create metadata
            const metadata = {
                generatedAt: startTime,
                totalTokens: this.contextOptimizer.estimateTokenCount(relevantCode.join('\n')),
                compressionApplied: false,
                filtersApplied: this.getAppliedFilters(opts),
                relevanceThreshold: opts.relevanceThreshold || 0.3,
                includedFileCount: relevantCode.length,
                excludedFileCount: 0
            };
            return {
                query,
                workspace: filteredContext,
                relevantCode,
                dependencies,
                metadata,
                optimized: false
            };
        }
        catch (error) {
            throw new types_1.ContextException('buildContext', 'Failed to build smart context', error);
        }
    }
    /**
     * Preview context before building
     * @param query User query
     * @param options Context building options
     * @returns Preview data
     */
    async previewContext(query, options = {}) {
        try {
            // Build context first
            const context = await this.buildContext(query, options);
            // Generate preview
            return this.contextPreview.generatePreview(context.relevantCode);
        }
        catch (error) {
            throw new types_1.ContextException('previewContext', 'Failed to preview context', error);
        }
    }
    /**
     * Optimize context for token limits
     * @param context Smart context to optimize
     * @param maxTokens Maximum tokens allowed
     * @returns Optimized context
     */
    async optimizeContext(context, maxTokens) {
        try {
            if (context.metadata.totalTokens <= maxTokens) {
                return context; // Already within limits
            }
            // Apply compression if needed
            let optimizedCode = context.relevantCode;
            if (context.metadata.totalTokens > maxTokens * 1.5) {
                // Apply aggressive compression for very large contexts
                optimizedCode = this.contextOptimizer.applySmartCompression(optimizedCode, types_1.CompressionLevel.AGGRESSIVE);
            }
            else if (context.metadata.totalTokens > maxTokens * 1.2) {
                // Apply moderate compression
                optimizedCode = this.contextOptimizer.applySmartCompression(optimizedCode, types_1.CompressionLevel.MODERATE);
            }
            // Optimize for token limit
            const optimizedResult = await this.contextOptimizer.optimizeForTokenLimit(optimizedCode, maxTokens);
            // Update metadata
            const updatedMetadata = {
                ...context.metadata,
                totalTokens: optimizedResult.totalTokens,
                compressionApplied: true,
                includedFileCount: optimizedResult.includedFiles.length,
                excludedFileCount: optimizedResult.excludedFiles.length
            };
            return {
                ...context,
                relevantCode: optimizedResult.content,
                metadata: updatedMetadata,
                optimized: true
            };
        }
        catch (error) {
            throw new types_1.ContextException('optimizeContext', 'Failed to optimize context', error);
        }
    }
    /**
     * Explain context composition and decisions
     * @param context Smart context to explain
     * @returns Array of explanation strings
     */
    explainContext(context) {
        try {
            const explanations = [];
            explanations.push(`🧠 Smart Context Analysis for: "${context.query}"`);
            explanations.push('═'.repeat(60));
            explanations.push('');
            // Workspace context
            explanations.push('📁 Workspace Context:');
            if (context.workspace.activeFile) {
                explanations.push(`   Active File: ${context.workspace.activeFile.filePath}`);
                explanations.push(`   Language: ${context.workspace.activeFile.language}`);
                explanations.push(`   Cursor Position: Line ${context.workspace.activeFile.cursorPosition.line + 1}`);
            }
            explanations.push(`   Open Files: ${context.workspace.openFiles.length}`);
            explanations.push(`   Recent Files: ${context.workspace.recentFiles.length}`);
            explanations.push('');
            // Context composition
            explanations.push('🎯 Context Composition:');
            explanations.push(`   Total Files: ${context.metadata.includedFileCount}`);
            explanations.push(`   Total Tokens: ${context.metadata.totalTokens.toLocaleString()}`);
            explanations.push(`   Relevance Threshold: ${(context.metadata.relevanceThreshold * 100).toFixed(0)}%`);
            explanations.push(`   Optimized: ${context.optimized ? 'Yes' : 'No'}`);
            explanations.push(`   Compression Applied: ${context.metadata.compressionApplied ? 'Yes' : 'No'}`);
            explanations.push('');
            // Filters applied
            if (context.metadata.filtersApplied.length > 0) {
                explanations.push('🔍 Filters Applied:');
                for (const filter of context.metadata.filtersApplied) {
                    explanations.push(`   • ${filter}`);
                }
                explanations.push('');
            }
            // Dependencies
            explanations.push('📦 Dependencies Analysis:');
            explanations.push(`   Imports: ${context.dependencies.imports.length}`);
            explanations.push(`   Exports: ${context.dependencies.exports.length}`);
            explanations.push(`   Internal Dependencies: ${context.dependencies.internalDependencies.length}`);
            explanations.push(`   External Dependencies: ${context.dependencies.externalDependencies.length}`);
            if (context.dependencies.unusedImports.length > 0) {
                explanations.push(`   Unused Imports: ${context.dependencies.unusedImports.join(', ')}`);
            }
            if (context.dependencies.missingImports.length > 0) {
                explanations.push(`   Potential Missing Imports: ${context.dependencies.missingImports.join(', ')}`);
            }
            explanations.push('');
            // File breakdown
            explanations.push('📄 Included Files:');
            const preview = this.contextPreview.generatePreview(context.relevantCode);
            for (const file of preview.files.slice(0, 10)) {
                const relevanceBar = this.createSimpleRelevanceBar(file.relevance);
                explanations.push(`   ${file.filePath} (${file.tokens} tokens) ${relevanceBar}`);
            }
            if (preview.files.length > 10) {
                explanations.push(`   ... and ${preview.files.length - 10} more files`);
            }
            return explanations;
        }
        catch (error) {
            return [`Failed to explain context: ${error instanceof Error ? error.message : 'Unknown error'}`];
        }
    }
    /**
     * Get context statistics for monitoring
     * @param context Smart context to analyze
     * @returns Context statistics
     */
    getContextStatistics(context) {
        const stats = this.contextPreview.getContextStats(context.relevantCode);
        return {
            tokenUsage: context.metadata.totalTokens,
            fileCount: context.metadata.includedFileCount,
            languageDistribution: stats.languageDistribution,
            averageRelevance: stats.averageRelevance,
            compressionRatio: context.metadata.compressionApplied ? 0.7 : 1.0 // Estimate
        };
    }
    /**
     * Merge options with defaults
     */
    mergeWithDefaults(options) {
        return {
            maxTokens: options.maxTokens || 8000,
            includeImports: options.includeImports ?? true,
            includeDependencies: options.includeDependencies ?? true,
            includeRecentFiles: options.includeRecentFiles ?? false,
            languageFilter: options.languageFilter || [],
            extensionFilter: options.extensionFilter || [],
            relevanceThreshold: options.relevanceThreshold ?? 0.3,
            compressionLevel: options.compressionLevel || types_1.CompressionLevel.MODERATE
        };
    }
    /**
     * Get list of applied filters
     */
    getAppliedFilters(options) {
        const filters = [];
        if (options.languageFilter && options.languageFilter.length > 0) {
            filters.push(`Language filter: ${options.languageFilter.join(', ')}`);
        }
        if (options.extensionFilter && options.extensionFilter.length > 0) {
            filters.push(`Extension filter: ${options.extensionFilter.join(', ')}`);
        }
        if (options.relevanceThreshold !== undefined) {
            filters.push(`Relevance threshold: ${(options.relevanceThreshold * 100).toFixed(0)}%`);
        }
        return filters;
    }
    /**
     * Build import context string
     */
    buildImportContext(imports) {
        if (imports.length === 0)
            return null;
        let context = '// === IMPORTS CONTEXT ===\n';
        context += '// Relevant imports for the current file:\n';
        for (const imp of imports.slice(0, 10)) { // Limit to 10 imports
            context += `// ${imp.source}: ${imp.imports.join(', ')}\n`;
        }
        return context;
    }
    /**
     * Build dependency context string
     */
    buildDependencyContext(dependencies) {
        if (dependencies.internalDependencies.length === 0 && dependencies.externalDependencies.length === 0) {
            return null;
        }
        let context = '// === DEPENDENCIES CONTEXT ===\n';
        if (dependencies.internalDependencies.length > 0) {
            context += '// Internal dependencies:\n';
            for (const dep of dependencies.internalDependencies.slice(0, 5)) {
                context += `// - ${dep}\n`;
            }
        }
        if (dependencies.externalDependencies.length > 0) {
            context += '// External dependencies:\n';
            for (const dep of dependencies.externalDependencies.slice(0, 5)) {
                context += `// - ${dep}\n`;
            }
        }
        return context;
    }
    /**
     * Build recent files context string
     */
    buildRecentFilesContext(workspaceContext) {
        if (workspaceContext.recentFiles.length === 0)
            return null;
        let context = '// === RECENT FILES CONTEXT ===\n';
        context += '// Recently accessed files:\n';
        for (const file of workspaceContext.recentFiles.slice(0, 5)) {
            const fileName = file.split('/').pop() || file;
            context += `// - ${fileName}\n`;
        }
        return context;
    }
    /**
     * Create simple relevance bar for explanations
     */
    createSimpleRelevanceBar(relevance) {
        const percentage = Math.round(relevance * 100);
        if (percentage >= 80)
            return '🟢';
        if (percentage >= 60)
            return '🟡';
        if (percentage >= 40)
            return '🟠';
        return '🔴';
    }
}
exports.SmartContextManager = SmartContextManager;
//# sourceMappingURL=smartContextManager.js.map
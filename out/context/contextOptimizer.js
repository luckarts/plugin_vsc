"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextOptimizer = void 0;
const types_1 = require("./types");
/**
 * Optimizes context for token limits and improves relevance
 * Manages context size while preserving the most important information
 */
class ContextOptimizer {
    constructor() {
        this.tokensPerCharacter = 0.25; // Rough estimate for English text
        this.maxContextRatio = 0.8; // Use max 80% of available tokens for context
    }
    /**
     * Optimize context to fit within token limits
     * @param context Array of context strings
     * @param maxTokens Maximum tokens allowed
     * @returns Optimized context with metadata
     */
    async optimizeForTokenLimit(context, maxTokens) {
        try {
            const availableTokens = Math.floor(maxTokens * this.maxContextRatio);
            let currentTokens = 0;
            const includedContent = [];
            const excludedFiles = [];
            const truncatedFiles = [];
            const includedFiles = [];
            // Sort context by priority (most important first)
            const prioritizedContext = this.prioritizeContent(context, this.getDefaultPriorities());
            for (const content of prioritizedContext) {
                const contentTokens = this.estimateTokenCount(content);
                const filePath = this.extractFilePathFromContent(content);
                if (currentTokens + contentTokens <= availableTokens) {
                    // Include full content
                    includedContent.push(content);
                    includedFiles.push(filePath);
                    currentTokens += contentTokens;
                }
                else {
                    const remainingTokens = availableTokens - currentTokens;
                    if (remainingTokens > 100) { // Minimum viable content size
                        // Truncate content to fit
                        const truncatedContent = this.truncateContent(content, remainingTokens);
                        if (truncatedContent) {
                            includedContent.push(truncatedContent);
                            truncatedFiles.push(filePath);
                            currentTokens = availableTokens; // We've used all available tokens
                            break;
                        }
                    }
                    // Exclude this content
                    excludedFiles.push(filePath);
                }
            }
            const originalTokens = context.reduce((sum, content) => sum + this.estimateTokenCount(content), 0);
            const compressionRatio = originalTokens > 0 ? currentTokens / originalTokens : 1;
            return {
                content: includedContent,
                totalTokens: currentTokens,
                compressionRatio,
                includedFiles,
                excludedFiles,
                truncatedFiles
            };
        }
        catch (error) {
            throw new types_1.ContextException('optimizeForTokenLimit', 'Failed to optimize context for token limit', error);
        }
    }
    /**
     * Estimate token count for text
     * @param text Text to analyze
     * @returns Estimated token count
     */
    estimateTokenCount(text) {
        // More sophisticated estimation considering:
        // - Code vs natural language
        // - Special tokens
        // - Whitespace and formatting
        const baseTokens = Math.ceil(text.length * this.tokensPerCharacter);
        // Adjust for code content (typically more tokens per character)
        const codeIndicators = ['{', '}', '(', ')', ';', 'function', 'class', 'import', 'export'];
        const codeScore = codeIndicators.reduce((score, indicator) => {
            return score + (text.split(indicator).length - 1);
        }, 0);
        const codeMultiplier = Math.min(1.5, 1 + (codeScore / text.length) * 2);
        return Math.ceil(baseTokens * codeMultiplier);
    }
    /**
     * Prioritize content based on importance
     * @param context Array of context strings
     * @param priorities Priority configuration
     * @returns Prioritized context array
     */
    prioritizeContent(context, priorities) {
        try {
            const priorityMap = new Map(priorities.map(p => [p.type, p]));
            // Categorize and score each content piece
            const scoredContent = context.map(content => ({
                content,
                score: this.calculateContentScore(content, priorityMap),
                type: this.detectContentType(content)
            }));
            // Sort by score (highest first)
            return scoredContent
                .sort((a, b) => b.score - a.score)
                .map(item => item.content);
        }
        catch (error) {
            throw new types_1.ContextException('prioritizeContent', 'Failed to prioritize content', error);
        }
    }
    /**
     * Compress context by removing redundancy and noise
     * @param context Array of context strings
     * @returns Compressed context array
     */
    compressContext(context) {
        try {
            const compressed = [];
            const seenContent = new Set();
            for (const content of context) {
                // Remove duplicate content
                const contentHash = this.hashContent(content);
                if (seenContent.has(contentHash)) {
                    continue;
                }
                seenContent.add(contentHash);
                // Apply compression techniques
                const compressedContent = this.applyCompressionTechniques(content);
                compressed.push(compressedContent);
            }
            return compressed;
        }
        catch (error) {
            throw new types_1.ContextException('compressContext', 'Failed to compress context', error);
        }
    }
    /**
     * Apply smart compression based on compression level
     * @param context Array of context strings
     * @param level Compression level
     * @returns Compressed context
     */
    applySmartCompression(context, level) {
        try {
            switch (level) {
                case types_1.CompressionLevel.NONE:
                    return context;
                case types_1.CompressionLevel.LIGHT:
                    return context.map(content => this.lightCompression(content));
                case types_1.CompressionLevel.MODERATE:
                    return context.map(content => this.moderateCompression(content));
                case types_1.CompressionLevel.AGGRESSIVE:
                    return context.map(content => this.aggressiveCompression(content));
                default:
                    return context;
            }
        }
        catch (error) {
            throw new types_1.ContextException('applySmartCompression', 'Failed to apply smart compression', error);
        }
    }
    /**
     * Get optimization statistics
     * @param original Original context
     * @param optimized Optimized context
     * @returns Optimization statistics
     */
    getOptimizationStats(original, optimized) {
        const originalTokens = original.reduce((sum, content) => sum + this.estimateTokenCount(content), 0);
        const spaceSaved = originalTokens - optimized.totalTokens;
        return {
            originalFiles: original.length,
            includedFiles: optimized.includedFiles.length,
            excludedFiles: optimized.excludedFiles.length,
            truncatedFiles: optimized.truncatedFiles.length,
            originalTokens,
            optimizedTokens: optimized.totalTokens,
            compressionRatio: optimized.compressionRatio,
            spaceSaved
        };
    }
    /**
     * Calculate content score based on priorities
     */
    calculateContentScore(content, priorityMap) {
        const contentType = this.detectContentType(content);
        const priority = priorityMap.get(contentType);
        if (!priority) {
            return 0.5; // Default score
        }
        let score = priority.weight;
        // Boost score based on content characteristics
        if (content.includes('// File:')) {
            score += 0.1; // Boost for file headers
        }
        if (content.includes('export') || content.includes('public')) {
            score += 0.15; // Boost for public APIs
        }
        if (content.includes('function') || content.includes('class')) {
            score += 0.1; // Boost for definitions
        }
        if (content.includes('TODO') || content.includes('FIXME')) {
            score += 0.05; // Slight boost for actionable comments
        }
        return Math.min(1.0, score);
    }
    /**
     * Detect content type from content string
     */
    detectContentType(content) {
        if (content.includes('// File:') && content.includes('(Lines')) {
            if (content.includes('Relevance:')) {
                return types_1.ContentType.ACTIVE_FILE;
            }
            return types_1.ContentType.RELATED_FILES;
        }
        if (content.includes('import') || content.includes('require')) {
            return types_1.ContentType.IMPORTS;
        }
        if (content.includes('/**') || content.includes('*')) {
            return types_1.ContentType.DOCUMENTATION;
        }
        if (content.includes('dependencies') || content.includes('package.json')) {
            return types_1.ContentType.DEPENDENCIES;
        }
        return types_1.ContentType.RELATED_FILES;
    }
    /**
     * Get default content priorities
     */
    getDefaultPriorities() {
        return [
            { type: types_1.ContentType.ACTIVE_FILE, weight: 1.0, maxTokens: 2000 },
            { type: types_1.ContentType.IMPORTS, weight: 0.8, maxTokens: 500 },
            { type: types_1.ContentType.RELATED_FILES, weight: 0.6, maxTokens: 1500 },
            { type: types_1.ContentType.RECENT_FILES, weight: 0.4, maxTokens: 1000 },
            { type: types_1.ContentType.DEPENDENCIES, weight: 0.3, maxTokens: 300 },
            { type: types_1.ContentType.DOCUMENTATION, weight: 0.2, maxTokens: 500 }
        ];
    }
    /**
     * Extract file path from content string
     */
    extractFilePathFromContent(content) {
        const match = content.match(/\/\/ File: (.+?) \(/);
        return match ? match[1] : 'unknown';
    }
    /**
     * Truncate content to fit token limit
     */
    truncateContent(content, maxTokens) {
        const lines = content.split('\n');
        const header = lines.slice(0, 3).join('\n'); // Keep file header
        const codeLines = lines.slice(3);
        let truncatedContent = header + '\n';
        let currentTokens = this.estimateTokenCount(truncatedContent);
        for (const line of codeLines) {
            const lineTokens = this.estimateTokenCount(line + '\n');
            if (currentTokens + lineTokens > maxTokens - 50) { // Leave buffer for truncation notice
                truncatedContent += '\n// ... (content truncated for token limit) ...\n';
                break;
            }
            truncatedContent += line + '\n';
            currentTokens += lineTokens;
        }
        return currentTokens > 100 ? truncatedContent : null; // Only return if meaningful content remains
    }
    /**
     * Hash content for deduplication
     */
    hashContent(content) {
        // Simple hash based on content structure
        const normalized = content
            .replace(/\/\/ File: .+? \(Lines \d+-\d+\)/g, '') // Remove file headers
            .replace(/\/\/ Relevance: .+?\n/g, '') // Remove relevance info
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        return normalized.substring(0, 100); // Use first 100 chars as hash
    }
    /**
     * Apply compression techniques
     */
    applyCompressionTechniques(content) {
        return content
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive blank lines
            .replace(/\s+$/gm, '') // Remove trailing whitespace
            .replace(/^\s*\/\/.*$/gm, '') // Remove comment-only lines (aggressive)
            .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
    }
    /**
     * Light compression - minimal changes
     */
    lightCompression(content) {
        return content
            .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive blank lines
            .replace(/\s+$/gm, ''); // Remove trailing whitespace
    }
    /**
     * Moderate compression - remove some redundancy
     */
    moderateCompression(content) {
        return this.lightCompression(content)
            .replace(/^\s*\/\/\s*$/gm, '') // Remove empty comment lines
            .replace(/\n{3,}/g, '\n\n'); // Limit consecutive newlines
    }
    /**
     * Aggressive compression - significant reduction
     */
    aggressiveCompression(content) {
        return this.moderateCompression(content)
            .replace(/^\s*\/\/(?!.*TODO|.*FIXME|.*NOTE).*$/gm, '') // Remove most comments except important ones
            .replace(/^\s*console\.log.*$/gm, '') // Remove console.log statements
            .replace(/\n{2,}/g, '\n'); // Single newlines only
    }
}
exports.ContextOptimizer = ContextOptimizer;
//# sourceMappingURL=contextOptimizer.js.map
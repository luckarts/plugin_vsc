"use strict";
/**
 * Compression service for the intelligent memory system
 * Provides intelligent compression that preserves essential context
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompressionService = void 0;
const types_1 = require("./types");
const config_1 = require("./config");
class CompressionService {
    constructor() {
        this.compressionCache = new Map();
    }
    /**
     * Determine if memories should be compressed
     */
    async shouldCompress(memories) {
        const totalSize = memories.reduce((sum, memory) => sum + memory.size, 0);
        const uncompressedMemories = memories.filter(memory => !memory.compressed);
        const uncompressedSize = uncompressedMemories.reduce((sum, memory) => sum + memory.size, 0);
        // Check if total size exceeds threshold
        if (totalSize > config_1.MEMORY_CONFIG.compressionThreshold) {
            return true;
        }
        // Check if we have too many memories
        if (memories.length > config_1.MEMORY_CONFIG.maxMemoriesPerType) {
            return true;
        }
        // Check if uncompressed size is significant
        if (uncompressedSize > config_1.COMPRESSION_CONFIG.minSizeForCompression) {
            return true;
        }
        return false;
    }
    /**
     * Compress a single memory
     */
    async compressMemory(memory) {
        if (memory.compressed) {
            throw new types_1.CompressionError('Memory is already compressed');
        }
        if (memory.size < config_1.COMPRESSION_CONFIG.minSizeForCompression) {
            throw new types_1.CompressionError('Memory too small to compress');
        }
        // Check cache first
        const cacheKey = this.getCacheKey(memory);
        const cached = this.compressionCache.get(cacheKey);
        if (cached) {
            return cached;
        }
        const startTime = Date.now();
        try {
            // Extract and preserve important elements
            const preservedElements = this.extractPreservedElements(memory.content);
            // Perform intelligent compression
            const compressedContent = await this.performIntelligentCompression(memory.content, preservedElements);
            // Generate summary
            const summary = this.generateSummary(memory.content, compressedContent);
            // Calculate compression stats
            const originalSize = memory.content.length;
            const compressedSize = compressedContent.length;
            const compressionRatio = compressedSize / originalSize;
            const timeToCompress = Date.now() - startTime;
            const result = {
                compressedContent,
                stats: {
                    originalSize,
                    compressedSize,
                    compressionRatio,
                    timeToCompress,
                    algorithm: 'intelligent-semantic'
                },
                preservedKeywords: preservedElements.keywords,
                summary
            };
            // Cache the result
            this.compressionCache.set(cacheKey, result);
            return result;
        }
        catch (error) {
            throw new types_1.CompressionError(`Failed to compress memory ${memory.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Compress multiple memories
     */
    async compressMemories(memories) {
        const compressedMemories = [];
        for (const memory of memories) {
            try {
                if (!memory.compressed && memory.size >= config_1.COMPRESSION_CONFIG.minSizeForCompression) {
                    const compressionResult = await this.compressMemory(memory);
                    const compressedMemory = {
                        ...memory,
                        content: compressionResult.compressedContent,
                        size: compressionResult.stats.compressedSize,
                        compressed: true,
                        metadata: {
                            ...memory.metadata,
                            compressionStats: compressionResult.stats,
                            originalSize: compressionResult.stats.originalSize,
                            summary: compressionResult.summary
                        }
                    };
                    compressedMemories.push(compressedMemory);
                }
                else {
                    compressedMemories.push(memory);
                }
            }
            catch (error) {
                console.warn(`Failed to compress memory ${memory.id}:`, error);
                compressedMemories.push(memory); // Keep original if compression fails
            }
        }
        return compressedMemories;
    }
    /**
     * Decompress a memory (restore original content if possible)
     */
    async decompressMemory(memory) {
        if (!memory.compressed) {
            return memory.content;
        }
        // For now, return the compressed content as-is
        // In a more advanced implementation, we could store the original
        // content separately or use reversible compression
        return memory.content;
    }
    /**
     * Get compression statistics for a set of memories
     */
    getCompressionStats(memories) {
        const compressedMemories = memories.filter(memory => memory.compressed);
        const totalOriginalSize = memories.reduce((sum, memory) => {
            if (memory.compressed && memory.metadata.originalSize) {
                return sum + memory.metadata.originalSize;
            }
            return sum + memory.size;
        }, 0);
        const totalCompressedSize = memories.reduce((sum, memory) => sum + memory.size, 0);
        return {
            originalSize: totalOriginalSize,
            compressedSize: totalCompressedSize,
            compressionRatio: totalOriginalSize > 0 ? totalCompressedSize / totalOriginalSize : 0,
            timeToCompress: 0, // Aggregate time not tracked
            algorithm: 'intelligent-semantic'
        };
    }
    /**
     * Extract elements that should be preserved during compression
     */
    extractPreservedElements(content) {
        const keywords = [];
        const patterns = [];
        const structures = [];
        // Extract preserved keywords
        for (const keyword of config_1.COMPRESSION_CONFIG.preservedKeywords) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            const matches = content.match(regex);
            if (matches) {
                keywords.push(...matches);
            }
        }
        // Extract preserved patterns
        for (const pattern of config_1.COMPRESSION_CONFIG.preservedPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                patterns.push(...matches);
            }
        }
        // Extract code structures
        structures.push(...this.extractCodeStructures(content));
        return { keywords, patterns, structures };
    }
    /**
     * Extract important code structures
     */
    extractCodeStructures(content) {
        const structures = [];
        // Function declarations
        const functionRegex = /(?:function|const|let|var)\s+(\w+)\s*[=\(]/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            structures.push(match[1]);
        }
        // Class declarations
        const classRegex = /class\s+(\w+)/g;
        while ((match = classRegex.exec(content)) !== null) {
            structures.push(match[1]);
        }
        // Interface declarations
        const interfaceRegex = /interface\s+(\w+)/g;
        while ((match = interfaceRegex.exec(content)) !== null) {
            structures.push(match[1]);
        }
        // Type declarations
        const typeRegex = /type\s+(\w+)/g;
        while ((match = typeRegex.exec(content)) !== null) {
            structures.push(match[1]);
        }
        return structures;
    }
    /**
     * Perform intelligent compression while preserving important content
     */
    async performIntelligentCompression(content, preservedElements) {
        // Split content into sentences/lines
        const lines = content.split('\n');
        const compressedLines = [];
        for (const line of lines) {
            const trimmedLine = line.trim();
            // Always preserve important lines
            if (this.isImportantLine(trimmedLine, preservedElements)) {
                compressedLines.push(line);
                continue;
            }
            // Compress or remove less important lines
            const compressedLine = this.compressLine(trimmedLine);
            if (compressedLine) {
                compressedLines.push(compressedLine);
            }
        }
        return compressedLines.join('\n');
    }
    /**
     * Check if a line contains important information that should be preserved
     */
    isImportantLine(line, preservedElements) {
        // Empty lines
        if (!line) {
            return false;
        }
        // Comments with TODO, FIXME, etc.
        if (/\/\/\s*(TODO|FIXME|NOTE|WARNING|ERROR|DEBUG)/i.test(line)) {
            return true;
        }
        // Function/class/interface declarations
        if (/^(function|class|interface|type|const|let|var|export|import)/i.test(line)) {
            return true;
        }
        // Lines containing preserved keywords
        for (const keyword of config_1.COMPRESSION_CONFIG.preservedKeywords) {
            if (new RegExp(`\\b${keyword}\\b`, 'i').test(line)) {
                return true;
            }
        }
        // Lines matching preserved patterns
        for (const pattern of config_1.COMPRESSION_CONFIG.preservedPatterns) {
            if (pattern.test(line)) {
                return true;
            }
        }
        // Lines containing preserved structures
        for (const structure of preservedElements.structures) {
            if (line.includes(structure)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Compress a single line while preserving meaning
     */
    compressLine(line) {
        // Remove excessive whitespace
        line = line.replace(/\s+/g, ' ').trim();
        // Skip very short lines
        if (line.length < 10) {
            return null;
        }
        // Skip lines that are mostly punctuation
        if (/^[^\w\s]*$/.test(line)) {
            return null;
        }
        // Compress common patterns
        line = line.replace(/console\.log\([^)]*\);?/g, '// debug log');
        line = line.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
        line = line.replace(/\/\/.*$/, ''); // Remove line comments (except important ones)
        // Remove empty result
        line = line.trim();
        if (!line) {
            return null;
        }
        return line;
    }
    /**
     * Generate a summary of the compressed content
     */
    generateSummary(originalContent, compressedContent) {
        const originalLines = originalContent.split('\n').length;
        const compressedLines = compressedContent.split('\n').filter(line => line.trim()).length;
        const compressionRatio = ((originalContent.length - compressedContent.length) / originalContent.length * 100).toFixed(1);
        // Extract key elements for summary
        const functions = this.extractCodeStructures(originalContent);
        const keywords = config_1.COMPRESSION_CONFIG.preservedKeywords.filter(keyword => originalContent.toLowerCase().includes(keyword.toLowerCase()));
        let summary = `Compressed from ${originalLines} to ${compressedLines} lines (${compressionRatio}% reduction). `;
        if (functions.length > 0) {
            summary += `Contains: ${functions.slice(0, 3).join(', ')}${functions.length > 3 ? '...' : ''}. `;
        }
        if (keywords.length > 0) {
            summary += `Key concepts: ${keywords.slice(0, 5).join(', ')}${keywords.length > 5 ? '...' : ''}.`;
        }
        return summary;
    }
    /**
     * Generate cache key for compression result
     */
    getCacheKey(memory) {
        // Simple hash of content and metadata
        const data = `${memory.content}:${memory.type}:${memory.tags.join(',')}`;
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    }
    /**
     * Clear compression cache
     */
    clearCache() {
        this.compressionCache.clear();
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.compressionCache.size,
            hitRate: 0 // Would need to track hits/misses for accurate calculation
        };
    }
}
exports.CompressionService = CompressionService;
//# sourceMappingURL=compressionService.js.map
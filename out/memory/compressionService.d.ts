/**
 * Compression service for the intelligent memory system
 * Provides intelligent compression that preserves essential context
 */
import { ICompressionService, IMemory, ICompressionResult, ICompressionStats } from './types';
export declare class CompressionService implements ICompressionService {
    private compressionCache;
    /**
     * Determine if memories should be compressed
     */
    shouldCompress(memories: IMemory[]): Promise<boolean>;
    /**
     * Compress a single memory
     */
    compressMemory(memory: IMemory): Promise<ICompressionResult>;
    /**
     * Compress multiple memories
     */
    compressMemories(memories: IMemory[]): Promise<IMemory[]>;
    /**
     * Decompress a memory (restore original content if possible)
     */
    decompressMemory(memory: IMemory): Promise<string>;
    /**
     * Get compression statistics for a set of memories
     */
    getCompressionStats(memories: IMemory[]): ICompressionStats;
    /**
     * Extract elements that should be preserved during compression
     */
    private extractPreservedElements;
    /**
     * Extract important code structures
     */
    private extractCodeStructures;
    /**
     * Perform intelligent compression while preserving important content
     */
    private performIntelligentCompression;
    /**
     * Check if a line contains important information that should be preserved
     */
    private isImportantLine;
    /**
     * Compress a single line while preserving meaning
     */
    private compressLine;
    /**
     * Generate a summary of the compressed content
     */
    private generateSummary;
    /**
     * Generate cache key for compression result
     */
    private getCacheKey;
    /**
     * Clear compression cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
    };
}
//# sourceMappingURL=compressionService.d.ts.map
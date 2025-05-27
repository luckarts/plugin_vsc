import { IEmbeddingProvider } from './types';
/**
 * Embedding provider using Transformers.js for local processing
 * Optimized for Intel i5-7300U with 8GB RAM
 */
export declare class TransformersEmbeddingProvider implements IEmbeddingProvider {
    readonly name = "transformers-js";
    private embedder;
    private isInitializing;
    private readonly modelName;
    private readonly dimensions;
    constructor(modelName?: string);
    /**
     * Initialize the embedding model
     * Downloads and loads the model on first use
     */
    initialize(): Promise<void>;
    /**
     * Generate embedding for a single text
     * @param text Text to embed
     * @returns Vector representation
     */
    embed(text: string): Promise<number[]>;
    /**
     * Generate embeddings for multiple texts in batch
     * Optimized for i5-7300U (4 cores)
     * @param texts Array of texts to embed
     * @returns Array of vector representations
     */
    embedBatch(texts: string[]): Promise<number[][]>;
    /**
     * Get the dimensions of the embedding vectors
     */
    getDimensions(): number;
    /**
     * Check if the provider is ready to use
     */
    isReady(): boolean;
    /**
     * Preprocess text for better embedding quality
     * @param text Raw text
     * @returns Cleaned text
     */
    private preprocessText;
    /**
     * Utility function for delays
     */
    private sleep;
    /**
     * Get model information
     */
    getModelInfo(): {
        name: string;
        dimensions: number;
        size: string;
    };
    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=embeddingProvider.d.ts.map
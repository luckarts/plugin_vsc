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
exports.TransformersEmbeddingProvider = void 0;
const transformers_1 = require("@xenova/transformers");
const types_1 = require("./types");
const vscode = __importStar(require("vscode"));
/**
 * Embedding provider using Transformers.js for local processing
 * Optimized for Intel i5-7300U with 8GB RAM
 */
class TransformersEmbeddingProvider {
    constructor(modelName = 'Xenova/all-MiniLM-L6-v2') {
        this.name = 'transformers-js';
        this.embedder = null;
        this.isInitializing = false;
        this.modelName = modelName;
        // all-MiniLM-L6-v2 produces 384-dimensional vectors
        this.dimensions = modelName.includes('MiniLM-L6') ? 384 : 768;
    }
    /**
     * Initialize the embedding model
     * Downloads and loads the model on first use
     */
    async initialize() {
        if (this.embedder || this.isInitializing) {
            return;
        }
        this.isInitializing = true;
        try {
            vscode.window.showInformationMessage('Loading embedding model... This may take a moment on first use.');
            // Configure transformers for VSCode environment
            const { env } = await Promise.resolve().then(() => __importStar(require('@xenova/transformers')));
            // Set cache directory to VSCode global storage
            env.cacheDir = vscode.workspace.getConfiguration('codeAssist').get('cacheDirectory') || '.cache';
            // Disable local model loading for security
            env.allowLocalModels = false;
            // Load the embedding pipeline
            this.embedder = await (0, transformers_1.pipeline)('feature-extraction', this.modelName, {
                quantized: true, // Use quantized model for better performance
                progress_callback: (progress) => {
                    if (progress.status === 'downloading') {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        vscode.window.showInformationMessage(`Downloading model: ${percent}%`);
                    }
                }
            });
            vscode.window.showInformationMessage('✅ Embedding model loaded successfully!');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`Failed to load embedding model: ${errorMessage}`);
            throw new types_1.VectoringException('initialize', `Failed to initialize embedding provider: ${errorMessage}`, error);
        }
        finally {
            this.isInitializing = false;
        }
    }
    /**
     * Generate embedding for a single text
     * @param text Text to embed
     * @returns Vector representation
     */
    async embed(text) {
        if (!this.isReady()) {
            await this.initialize();
        }
        if (!this.embedder) {
            throw new types_1.VectoringException('embed', 'Embedding provider not initialized');
        }
        try {
            // Clean and prepare text
            const cleanText = this.preprocessText(text);
            // Generate embedding
            const result = await this.embedder(cleanText, {
                pooling: 'mean',
                normalize: true
            });
            // Extract the embedding array
            const embedding = Array.from(result.data);
            return embedding;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new types_1.VectoringException('embed', `Failed to generate embedding: ${errorMessage}`, error);
        }
    }
    /**
     * Generate embeddings for multiple texts in batch
     * Optimized for i5-7300U (4 cores)
     * @param texts Array of texts to embed
     * @returns Array of vector representations
     */
    async embedBatch(texts) {
        if (!this.isReady()) {
            await this.initialize();
        }
        if (!this.embedder) {
            throw new types_1.VectoringException('embedBatch', 'Embedding provider not initialized');
        }
        try {
            // Process in batches of 4 to optimize for 4-core CPU
            const batchSize = 4;
            const results = [];
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const cleanBatch = batch.map(text => this.preprocessText(text));
                // Process batch in parallel
                const batchPromises = cleanBatch.map(text => this.embed(text));
                const batchResults = await Promise.all(batchPromises);
                results.push(...batchResults);
                // Small delay to prevent CPU overload
                if (i + batchSize < texts.length) {
                    await this.sleep(10);
                }
            }
            return results;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new types_1.VectoringException('embedBatch', `Failed to generate batch embeddings: ${errorMessage}`, error);
        }
    }
    /**
     * Get the dimensions of the embedding vectors
     */
    getDimensions() {
        return this.dimensions;
    }
    /**
     * Check if the provider is ready to use
     */
    isReady() {
        return this.embedder !== null && !this.isInitializing;
    }
    /**
     * Preprocess text for better embedding quality
     * @param text Raw text
     * @returns Cleaned text
     */
    preprocessText(text) {
        return text
            .trim()
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
            .replace(/\/\/.*$/gm, '') // Remove line comments
            .substring(0, 512); // Limit to 512 characters for performance
    }
    /**
     * Utility function for delays
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Get model information
     */
    getModelInfo() {
        const sizeMap = {
            'Xenova/all-MiniLM-L6-v2': '25MB',
            'Xenova/all-mpnet-base-v2': '120MB',
            'Xenova/codebert-base': '500MB'
        };
        return {
            name: this.modelName,
            dimensions: this.dimensions,
            size: sizeMap[this.modelName] || 'Unknown'
        };
    }
    /**
     * Cleanup resources
     */
    async dispose() {
        this.embedder = null;
        this.isInitializing = false;
    }
}
exports.TransformersEmbeddingProvider = TransformersEmbeddingProvider;
//# sourceMappingURL=embeddingProvider.js.map
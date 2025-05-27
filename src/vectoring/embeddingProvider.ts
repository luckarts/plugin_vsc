import { pipeline } from '@xenova/transformers';
import { IEmbeddingProvider, VectoringException } from './types';
import * as vscode from 'vscode';

/**
 * Embedding provider using Transformers.js for local processing
 * Optimized for Intel i5-7300U with 8GB RAM
 */
export class TransformersEmbeddingProvider implements IEmbeddingProvider {
  public readonly name = 'transformers-js';
  private embedder: any = null;
  private isInitializing = false;
  private readonly modelName: string;
  private readonly dimensions: number;

  constructor(modelName: string = 'Xenova/all-MiniLM-L6-v2') {
    this.modelName = modelName;
    // all-MiniLM-L6-v2 produces 384-dimensional vectors
    this.dimensions = modelName.includes('MiniLM-L6') ? 384 : 768;
  }

  /**
   * Initialize the embedding model
   * Downloads and loads the model on first use
   */
  async initialize(): Promise<void> {
    if (this.embedder || this.isInitializing) {
      return;
    }

    this.isInitializing = true;

    try {
      vscode.window.showInformationMessage('Loading embedding model... This may take a moment on first use.');

      // Configure transformers for VSCode environment
      const { env } = await import('@xenova/transformers');

      // Set cache directory to VSCode global storage
      env.cacheDir = vscode.workspace.getConfiguration('codeAssist').get('cacheDirectory') || '.cache';

      // Disable local model loading for security
      env.allowLocalModels = false;

      // Load the embedding pipeline
      this.embedder = await pipeline('feature-extraction', this.modelName, {
        quantized: true, // Use quantized model for better performance
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            vscode.window.showInformationMessage(`Downloading model: ${percent}%`);
          }
        }
      });

      vscode.window.showInformationMessage('✅ Embedding model loaded successfully!');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      vscode.window.showErrorMessage(`Failed to load embedding model: ${errorMessage}`);
      throw new VectoringException('initialize', `Failed to initialize embedding provider: ${errorMessage}`, error);
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Generate embedding for a single text
   * @param text Text to embed
   * @returns Vector representation
   */
  async embed(text: string): Promise<number[]> {
    if (!this.isReady()) {
      await this.initialize();
    }

    if (!this.embedder) {
      throw new VectoringException('embed', 'Embedding provider not initialized');
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
      const embedding = Array.from(result.data) as number[];

      return embedding;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new VectoringException('embed', `Failed to generate embedding: ${errorMessage}`, error);
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * Optimized for i5-7300U (4 cores)
   * @param texts Array of texts to embed
   * @returns Array of vector representations
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isReady()) {
      await this.initialize();
    }

    if (!this.embedder) {
      throw new VectoringException('embedBatch', 'Embedding provider not initialized');
    }

    try {
      // Process in batches of 4 to optimize for 4-core CPU
      const batchSize = 4;
      const results: number[][] = [];

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

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new VectoringException('embedBatch', `Failed to generate batch embeddings: ${errorMessage}`, error);
    }
  }

  /**
   * Get the dimensions of the embedding vectors
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Check if the provider is ready to use
   */
  isReady(): boolean {
    return this.embedder !== null && !this.isInitializing;
  }

  /**
   * Preprocess text for better embedding quality
   * @param text Raw text
   * @returns Cleaned text
   */
  private preprocessText(text: string): string {
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
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get model information
   */
  getModelInfo(): { name: string; dimensions: number; size: string } {
    const sizeMap: Record<string, string> = {
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
  async dispose(): Promise<void> {
    this.embedder = null;
    this.isInitializing = false;
  }
}

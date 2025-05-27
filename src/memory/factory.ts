/**
 * Memory Factory - Simplifies creation and initialization of memory components
 * Provides easy-to-use factory methods for different use cases
 */

import * as vscode from 'vscode';
import { VectorConfig, MemoryException } from './core/types';
import { IMemoryAdapter, ICodeAdapter, IEmbeddingProvider, IMemoryFactory } from './core/interfaces';
import { EnhancedVectorStore } from './storage/vectorStore';
import { MemoryAdapter } from './adapters/memoryAdapter';
import { CodeAdapter } from './adapters/codeAdapter';
import { defaultConfig, vscodeConfig, testConfig, mergeConfig } from './config/defaultConfig';

export class MemoryFactory implements IMemoryFactory {
  
  /**
   * Create a memory store for Task 002 use case
   */
  static async createMemoryStore(config?: Partial<VectorConfig>): Promise<IMemoryAdapter> {
    try {
      const finalConfig = mergeConfig(config || {}, vscodeConfig);
      
      // Create components
      const vectorStore = await this.createVectorStore(finalConfig);
      const embeddingProvider = await this.createEmbeddingProvider(finalConfig);
      
      // Create and initialize adapter
      const memoryAdapter = new MemoryAdapter(vectorStore, embeddingProvider);
      await memoryAdapter.initialize();
      
      return memoryAdapter;
      
    } catch (error) {
      throw new MemoryException('createMemoryStore', 'Failed to create memory store', error);
    }
  }

  /**
   * Create a code store for legacy code indexing
   */
  static async createCodeStore(config?: Partial<VectorConfig>): Promise<ICodeAdapter> {
    try {
      const finalConfig = mergeConfig(config || {}, vscodeConfig);
      
      // Create memory adapter first
      const memoryAdapter = await this.createMemoryStore(finalConfig);
      const embeddingProvider = await this.createEmbeddingProvider(finalConfig);
      
      // Create and initialize code adapter
      const codeAdapter = new CodeAdapter(memoryAdapter as MemoryAdapter, embeddingProvider);
      await codeAdapter.initialize();
      
      return codeAdapter;
      
    } catch (error) {
      throw new MemoryException('createCodeStore', 'Failed to create code store', error);
    }
  }

  /**
   * Create an embedding provider
   */
  static async createEmbeddingProvider(config?: Partial<VectorConfig>): Promise<IEmbeddingProvider> {
    try {
      const finalConfig = mergeConfig(config || {}, vscodeConfig);
      
      // Import the embedding provider
      const { TransformersEmbeddingProvider } = await import('../vectoring/embeddingProvider');
      
      const provider = new TransformersEmbeddingProvider(finalConfig.embedding.model);
      await provider.initialize();
      
      return provider;
      
    } catch (error) {
      throw new MemoryException('createEmbeddingProvider', 'Failed to create embedding provider', error);
    }
  }

  /**
   * Create a vector store
   */
  private static async createVectorStore(config: VectorConfig): Promise<EnhancedVectorStore> {
    try {
      // Get storage URI from VSCode context or use default
      const storageUri = this.getStorageUri(config.vectorStore.storageDir);
      
      const vectorStore = new EnhancedVectorStore(storageUri);
      await vectorStore.initialize();
      
      return vectorStore;
      
    } catch (error) {
      throw new MemoryException('createVectorStore', 'Failed to create vector store', error);
    }
  }

  /**
   * Get storage URI for the vector store
   */
  private static getStorageUri(storageDir: string): vscode.Uri {
    // Try to use VSCode's global storage if available
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      const workspaceRoot = vscode.workspace.workspaceFolders[0].uri;
      return vscode.Uri.joinPath(workspaceRoot, storageDir);
    }
    
    // Fallback to a default location
    return vscode.Uri.file(storageDir);
  }

  /**
   * Create a memory store with test configuration
   */
  static async createTestMemoryStore(): Promise<IMemoryAdapter> {
    return this.createMemoryStore(testConfig);
  }

  /**
   * Create a code store with test configuration
   */
  static async createTestCodeStore(): Promise<ICodeAdapter> {
    return this.createCodeStore(testConfig);
  }
}

/**
 * Convenience functions for common use cases
 */

/**
 * Quick setup for Task 002 memory functionality
 */
export async function setupMemorySystem(config?: Partial<VectorConfig>): Promise<IMemoryAdapter> {
  return MemoryFactory.createMemoryStore(config);
}

/**
 * Quick setup for legacy code indexing
 */
export async function setupCodeIndexing(config?: Partial<VectorConfig>): Promise<ICodeAdapter> {
  return MemoryFactory.createCodeStore(config);
}

/**
 * Setup both memory and code systems
 */
export async function setupFullSystem(config?: Partial<VectorConfig>): Promise<{
  memoryStore: IMemoryAdapter;
  codeStore: ICodeAdapter;
}> {
  const memoryStore = await MemoryFactory.createMemoryStore(config);
  const codeStore = await MemoryFactory.createCodeStore(config);
  
  return { memoryStore, codeStore };
}

/**
 * Migration helper to convert existing vector data
 */
export async function migrateFromLegacyVectorStore(
  legacyStoragePath: string,
  newConfig?: Partial<VectorConfig>
): Promise<IMemoryAdapter> {
  try {
    // Create new memory store
    const memoryStore = await MemoryFactory.createMemoryStore(newConfig);
    
    // TODO: Implement migration logic
    // This would read from the old format and convert to new format
    vscode.window.showInformationMessage('Migration functionality will be implemented in a future version');
    
    return memoryStore;
    
  } catch (error) {
    throw new MemoryException('migrateFromLegacyVectorStore', 'Failed to migrate legacy vector store', error);
  }
}

/**
 * Health check for the memory system
 */
export async function healthCheck(config?: Partial<VectorConfig>): Promise<{
  memoryStore: boolean;
  embeddingProvider: boolean;
  vectorStore: boolean;
  errors: string[];
}> {
  const result = {
    memoryStore: false,
    embeddingProvider: false,
    vectorStore: false,
    errors: [] as string[]
  };

  try {
    // Test embedding provider
    const embeddingProvider = await MemoryFactory.createEmbeddingProvider(config);
    result.embeddingProvider = embeddingProvider.isReady();
    
    // Test vector store
    const finalConfig = mergeConfig(config || {}, vscodeConfig);
    const storageUri = MemoryFactory['getStorageUri'](finalConfig.vectorStore.storageDir);
    const vectorStore = new EnhancedVectorStore(storageUri);
    await vectorStore.initialize();
    result.vectorStore = true;
    
    // Test memory store
    const memoryStore = await MemoryFactory.createMemoryStore(config);
    result.memoryStore = true;
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
  }

  return result;
}

/**
 * Get system information
 */
export async function getSystemInfo(config?: Partial<VectorConfig>): Promise<{
  config: VectorConfig;
  embeddingModel: string;
  storageLocation: string;
  version: string;
}> {
  const finalConfig = mergeConfig(config || {}, vscodeConfig);
  
  return {
    config: finalConfig,
    embeddingModel: finalConfig.embedding.model,
    storageLocation: finalConfig.vectorStore.storageDir,
    version: '2.0.0' // Version of the memory system
  };
}

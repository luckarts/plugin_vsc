/**
 * Default configuration for the Memory system
 * Based on Task 002 specifications
 */

import { VectorConfig } from '../core/types';

export const defaultConfig: VectorConfig = {
  vectorStore: {
    provider: 'file',
    dimensions: 384,
    similarity: 'cosine',
    indexType: 'hnsw',
    storageDir: './data/vectors',
    maxVectors: 100000,
    batchSize: 100
  },
  embedding: {
    model: 'Xenova/all-MiniLM-L6-v2',
    provider: 'local',
    cacheSize: 1000,
    timeout: 5000
  },
  search: {
    defaultLimit: 10,
    maxLimit: 100,
    defaultThreshold: 0.7,
    enableFilters: true
  }
};

/**
 * Configuration optimized for VSCode extension environment
 */
export const vscodeConfig: VectorConfig = {
  vectorStore: {
    provider: 'file',
    dimensions: 384,
    similarity: 'cosine',
    indexType: 'flat', // Simpler for VSCode
    storageDir: './.vscode/memory-vectors',
    maxVectors: 10000, // Smaller limit for VSCode
    batchSize: 50 // Smaller batches for responsiveness
  },
  embedding: {
    model: 'Xenova/all-MiniLM-L6-v2',
    provider: 'local',
    cacheSize: 500, // Smaller cache for VSCode
    timeout: 10000 // Longer timeout for first load
  },
  search: {
    defaultLimit: 5,
    maxLimit: 50,
    defaultThreshold: 0.6, // Lower threshold for more results
    enableFilters: true
  }
};

/**
 * Configuration for development/testing
 */
export const testConfig: VectorConfig = {
  vectorStore: {
    provider: 'file',
    dimensions: 384,
    similarity: 'cosine',
    indexType: 'flat',
    storageDir: './test-data/vectors',
    maxVectors: 1000,
    batchSize: 10
  },
  embedding: {
    model: 'Xenova/all-MiniLM-L6-v2',
    provider: 'local',
    cacheSize: 100,
    timeout: 5000
  },
  search: {
    defaultLimit: 5,
    maxLimit: 20,
    defaultThreshold: 0.5,
    enableFilters: true
  }
};

/**
 * Get configuration based on environment
 */
export function getConfigForEnvironment(env: 'default' | 'vscode' | 'test' = 'default'): VectorConfig {
  switch (env) {
    case 'vscode':
      return vscodeConfig;
    case 'test':
      return testConfig;
    default:
      return defaultConfig;
  }
}

/**
 * Merge user config with defaults
 */
export function mergeConfig(userConfig: Partial<VectorConfig>, baseConfig: VectorConfig = defaultConfig): VectorConfig {
  return {
    vectorStore: {
      ...baseConfig.vectorStore,
      ...userConfig.vectorStore
    },
    embedding: {
      ...baseConfig.embedding,
      ...userConfig.embedding
    },
    search: {
      ...baseConfig.search,
      ...userConfig.search
    }
  };
}

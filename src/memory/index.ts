/**
 * Intelligent Memory System
 * Main exports for the advanced memory management system
 */

// ============================================================================
// EXISTING MEMORY SYSTEM
// ============================================================================

// Core types and interfaces
export * from './types';

// Configuration
export * from './config';

// Core services
export { StorageService } from './storageService';
export { CompressionService } from './compressionService';

// Main memory manager
export { IntelligentMemoryManager } from './memoryManager';

// Re-export for convenience
export { IntelligentMemoryManager as MemoryManager } from './memoryManager';

// ============================================================================
// NEW VECTOR MEMORY SYSTEM (Task 002)
// ============================================================================

// Core types and interfaces for vector system
export * from './core/types';
export * from './core/interfaces';

// Configuration for vector system
export * from './config/defaultConfig';

// Storage layer
export { EnhancedVectorStore } from './storage/vectorStore';

// Adapters
export { MemoryAdapter } from './adapters/memoryAdapter';
export { CodeAdapter } from './adapters/codeAdapter';

// Factory and convenience functions
export {
  MemoryFactory,
  setupMemorySystem,
  setupCodeIndexing,
  setupFullSystem,
  migrateFromLegacyVectorStore,
  healthCheck,
  getSystemInfo
} from './factory';

// ============================================================================
// LEGACY COMPATIBILITY (for existing vectoring module)
// ============================================================================

// Re-export legacy types for backward compatibility
export type {
  IVectorDatabase,
  IVectorStore,
  IEmbeddingProvider,
  ICodeParser
} from './core/types';

// Version information
export const VECTOR_SYSTEM_VERSION = '2.0.0';
export const LEGACY_COMPATIBILITY_VERSION = '1.0.0';

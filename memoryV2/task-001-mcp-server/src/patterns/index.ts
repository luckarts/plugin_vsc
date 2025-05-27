/**
 * Patterns Index: Central export for all design patterns
 */

// Import instances for PatternUtils
import { getMCPToolFactory, resetMCPToolFactory } from './factory/mcp-tool-factory'
import { memoryCache, toolMetadataCache } from './cache/performance-cache'
import { eventSystem } from './observer/event-system'

// Factory Pattern
export {
  MCPToolFactory,
  getMCPToolFactory,
  resetMCPToolFactory,
  type ToolConfig,
  type ToolDefinition,
  type ToolContext
} from './factory/mcp-tool-factory'

export {
  allToolDefinitions,
  validateAllToolsPresent,
  getToolDefinition,
  getAllToolNames,
  createMemoryToolDefinition,
  updateMemoryToolDefinition,
  deleteMemoryToolDefinition,
  searchMemoriesToolDefinition,
  getMemoryToolDefinition,
  getStatsToolDefinition
} from './factory/tool-definitions'

// Decorator Pattern
export {
  type IToolDecorator,
  BaseToolDecorator,
  CompositeDecorator,
  MetadataTrackingDecorator,
  DecoratorUtils,
  type DecoratorMetadata,
  type DecoratedMCPTool
} from './decorators/tool-decorator'

export {
  LoggingDecorator,
  withLogging,
  BatchLoggingDecorator,
  type LoggingConfig
} from './decorators/logging-decorator'

export {
  PerformanceDecorator,
  withPerformanceTracking,
  type PerformanceConfig,
  type PerformanceMetrics
} from './decorators/performance-decorator'

export {
  ValidationDecorator,
  withValidation,
  type ValidationConfig
} from './decorators/validation-decorator'

export {
  ErrorHandlingDecorator,
  withErrorHandling,
  type ErrorHandlingConfig,
  type RetryContext
} from './decorators/error-handling-decorator'

// Strategy Pattern
export {
  type IMemoryTypeStrategy,
  BaseMemoryTypeStrategy,
  PersonalMemoryStrategy,
  RepositoryMemoryStrategy,
  GuidelineMemoryStrategy,
  MemoryTypeStrategyFactory,
  type RetentionPolicy,
  type CompressionPolicy
} from './strategy/memory-type-strategy'

// Cache Pattern
export {
  PerformanceCache,
  MemoryCache,
  memoryCache,
  toolMetadataCache,
  type CacheConfig,
  type CacheEntry,
  type CacheMetrics
} from './cache/performance-cache'

// Command Pattern
export {
  type ICommand,
  BaseCommand,
  CreateMemoryCommand,
  UpdateMemoryCommand,
  DeleteMemoryCommand,
  SearchMemoriesCommand,
  GetMemoryCommand,
  GetStatsCommand,
  CommandFactory,
  CommandQueue,
  type CommandMetadata,
  type CommandContext
} from './command/mcp-command'

// Observer Pattern
export {
  type IEventListener,
  EventSystem,
  eventSystem,
  PerformanceMonitorListener,
  SecurityMonitorListener,
  MCPEventType,
  type Event,
  type EventSubscription
} from './observer/event-system'

/**
 * Pattern utilities and helpers
 */
export class PatternUtils {
  /**
   * Initialize all patterns with default configuration
   */
  static initializePatterns(): void {
    // Patterns are initialized automatically when imported
    // This method can be used for any additional setup
  }

  /**
   * Get pattern status information
   */
  static getPatternStatus(): {
    factory: { initialized: boolean; toolCount: number }
    cache: { memoryCache: any; toolCache: any }
    events: { subscriptions: any; history: number }
  } {
    try {
      const factory = getMCPToolFactory()

      return {
        factory: {
          initialized: !!factory,
          toolCount: factory ? factory.getAvailableTools().length : 0
        },
        cache: {
          memoryCache: memoryCache.getMetrics(),
          toolCache: toolMetadataCache.getMetrics()
        },
        events: {
          subscriptions: eventSystem.getSubscriptions(),
          history: eventSystem.getHistory().length
        }
      }
    } catch (error) {
      return {
        factory: { initialized: false, toolCount: 0 },
        cache: { memoryCache: {}, toolCache: {} },
        events: { subscriptions: [], history: 0 }
      }
    }
  }

  /**
   * Reset all patterns (useful for testing)
   */
  static resetPatterns(): void {
    try {
      resetMCPToolFactory()
      memoryCache.clear()
      toolMetadataCache.clear()
      eventSystem.removeAllListeners()
      eventSystem.clearHistory()
    } catch (error) {
      // Ignore errors during reset
    }
  }

  /**
   * Get performance metrics from all patterns
   */
  static getPerformanceMetrics(): {
    cache: { memory: any; tools: any }
    events: { totalEvents: number; recentEvents: number }
  } {
    try {
      return {
        cache: {
          memory: memoryCache.getMetrics(),
          tools: toolMetadataCache.getMetrics()
        },
        events: {
          totalEvents: eventSystem.getHistory().length,
          recentEvents: eventSystem.getHistory('', 100).length
        }
      }
    } catch (error) {
      return {
        cache: { memory: {}, tools: {} },
        events: { totalEvents: 0, recentEvents: 0 }
      }
    }
  }
}

/**
 * Pattern configuration interface
 */
export interface PatternConfiguration {
  factory?: {
    enableLogging?: boolean
    enableValidation?: boolean
    enablePerformanceTracking?: boolean
    enableErrorHandling?: boolean
  }
  cache?: {
    memoryMaxSize?: number
    memoryTTL?: number
    toolsMaxSize?: number
    toolsTTL?: number
  }
  events?: {
    maxHistorySize?: number
    enableBuiltinListeners?: boolean
  }
}

/**
 * Configure all patterns with provided configuration
 */
export function configurePatterns(config: PatternConfiguration): void {
  // Configuration would be applied to pattern instances
  // This is a placeholder for future configuration needs
  console.log('Pattern configuration applied:', config)
}

/**
 * Factory Pattern: MCPToolFactory
 * Centralizes the creation of MCP tools with dependency injection and configuration
 */

import { MCPTool } from '../../types/mcp'
import { MemoryService } from '../../services/memory-service'
import { IToolDecorator } from '../decorators/tool-decorator'
import { LoggingDecorator } from '../decorators/logging-decorator'
import { ValidationDecorator } from '../decorators/validation-decorator'
import { PerformanceDecorator } from '../decorators/performance-decorator'
import { ErrorHandlingDecorator } from '../decorators/error-handling-decorator'

export interface ToolConfig {
  enableLogging?: boolean
  enableValidation?: boolean
  enablePerformanceTracking?: boolean
  enableErrorHandling?: boolean
  customDecorators?: IToolDecorator[]
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: object
  handler: (params: unknown, context: ToolContext) => Promise<object>
}

export interface ToolContext {
  memoryService: MemoryService
  requestId: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export class MCPToolFactory {
  private memoryService: MemoryService
  private defaultConfig: ToolConfig
  private toolDefinitions: Map<string, ToolDefinition> = new Map()

  constructor(memoryService: MemoryService, defaultConfig: ToolConfig = {}) {
    this.memoryService = memoryService
    this.defaultConfig = {
      enableLogging: true,
      enableValidation: true,
      enablePerformanceTracking: true,
      enableErrorHandling: true,
      ...defaultConfig
    }
  }

  /**
   * Register a tool definition
   */
  registerTool(definition: ToolDefinition): void {
    this.toolDefinitions.set(definition.name, definition)
  }

  /**
   * Create a tool with decorators applied
   */
  createTool(name: string, config?: ToolConfig): MCPTool {
    const definition = this.toolDefinitions.get(name)
    if (!definition) {
      throw new Error(`Tool definition not found: ${name}`)
    }

    const finalConfig = { ...this.defaultConfig, ...config }
    
    // Create base tool
    let tool: MCPTool = {
      name: definition.name,
      description: definition.description,
      inputSchema: definition.inputSchema,
      handler: this.createContextualHandler(definition.handler)
    }

    // Apply decorators in order
    tool = this.applyDecorators(tool, finalConfig)

    return tool
  }

  /**
   * Create all registered tools
   */
  createAllTools(config?: ToolConfig): MCPTool[] {
    const tools: MCPTool[] = []
    
    for (const name of this.toolDefinitions.keys()) {
      tools.push(this.createTool(name, config))
    }

    return tools
  }

  /**
   * Get available tool names
   */
  getAvailableTools(): string[] {
    return Array.from(this.toolDefinitions.keys())
  }

  /**
   * Create a contextual handler that injects dependencies
   */
  private createContextualHandler(
    originalHandler: (params: unknown, context: ToolContext) => Promise<object>
  ): (params: unknown) => Promise<object> {
    return async (params: unknown) => {
      const context: ToolContext = {
        memoryService: this.memoryService,
        requestId: this.generateRequestId(),
        timestamp: new Date(),
        metadata: {}
      }

      return originalHandler(params, context)
    }
  }

  /**
   * Apply decorators to a tool based on configuration
   */
  private applyDecorators(tool: MCPTool, config: ToolConfig): MCPTool {
    let decoratedTool = tool

    // Apply built-in decorators
    if (config.enableErrorHandling) {
      decoratedTool = new ErrorHandlingDecorator(decoratedTool).getTool()
    }

    if (config.enableValidation) {
      decoratedTool = new ValidationDecorator(decoratedTool).getTool()
    }

    if (config.enablePerformanceTracking) {
      decoratedTool = new PerformanceDecorator(decoratedTool).getTool()
    }

    if (config.enableLogging) {
      decoratedTool = new LoggingDecorator(decoratedTool).getTool()
    }

    // Apply custom decorators
    if (config.customDecorators) {
      for (const decorator of config.customDecorators) {
        decoratedTool = decorator.decorate(decoratedTool)
      }
    }

    return decoratedTool
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Singleton factory instance
 */
let factoryInstance: MCPToolFactory | null = null

export function getMCPToolFactory(
  memoryService?: MemoryService, 
  config?: ToolConfig
): MCPToolFactory {
  if (!factoryInstance && memoryService) {
    factoryInstance = new MCPToolFactory(memoryService, config)
  }
  
  if (!factoryInstance) {
    throw new Error('MCPToolFactory not initialized. Provide memoryService on first call.')
  }
  
  return factoryInstance
}

export function resetMCPToolFactory(): void {
  factoryInstance = null
}

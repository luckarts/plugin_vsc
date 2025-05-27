/**
 * Logging Decorator: Automatically logs tool execution with detailed context
 */

import { MCPTool } from '../../types/mcp'
import { MetadataTrackingDecorator } from './tool-decorator'
import { logMCPOperation, logInfo, logError, logPerformance } from '../../logging/logger'

export interface LoggingConfig extends Record<string, unknown> {
  logInput?: boolean
  logOutput?: boolean
  logPerformance?: boolean
  logErrors?: boolean
  sensitiveFields?: string[]
  maxLogLength?: number
}

export class LoggingDecorator extends MetadataTrackingDecorator {
  protected override config: LoggingConfig

  constructor(tool: MCPTool, config: LoggingConfig = {}) {
    super(tool, 'LoggingDecorator', config)
    this.config = {
      logInput: true,
      logOutput: true,
      logPerformance: true,
      logErrors: true,
      sensitiveFields: ['password', 'token', 'secret', 'key'],
      maxLogLength: 1000,
      ...config
    }
  }

  protected decorateHandler(
    originalHandler: (params: unknown) => Promise<object>
  ): (params: unknown) => Promise<object> {
    return async (params: unknown): Promise<object> => {
      const startTime = Date.now()
      const requestId = this.generateRequestId()

      try {
        // Log input if enabled
        if (this.config.logInput) {
          const sanitizedParams = this.sanitizeData(params)
          logInfo(`Tool execution started: ${this.tool.name}`, {
            requestId,
            toolName: this.tool.name,
            params: sanitizedParams,
            timestamp: new Date().toISOString()
          })
        }

        // Execute original handler
        const result = await originalHandler(params)
        const duration = Date.now() - startTime

        // Log output if enabled
        if (this.config.logOutput) {
          const sanitizedResult = this.sanitizeData(result)
          logInfo(`Tool execution completed: ${this.tool.name}`, {
            requestId,
            toolName: this.tool.name,
            result: sanitizedResult,
            duration,
            timestamp: new Date().toISOString()
          })
        }

        // Log performance if enabled
        if (this.config.logPerformance) {
          logPerformance(this.tool.name, duration, {
            requestId,
            success: true,
            resultSize: JSON.stringify(result).length
          })
        }

        // Log using existing MCP operation logger
        logMCPOperation(this.tool.name, params as object, result, undefined, duration)

        return result

      } catch (error) {
        const duration = Date.now() - startTime

        // Log error if enabled
        if (this.config.logErrors) {
          logError(`Tool execution failed: ${this.tool.name}`, error as Error, {
            requestId,
            toolName: this.tool.name,
            params: this.sanitizeData(params),
            duration,
            timestamp: new Date().toISOString()
          })
        }

        // Log performance for failed operations
        if (this.config.logPerformance) {
          logPerformance(this.tool.name, duration, {
            requestId,
            success: false,
            error: (error as Error).message
          })
        }

        // Log using existing MCP operation logger
        logMCPOperation(this.tool.name, params as object, undefined, error as Error, duration)

        throw error
      }
    }
  }

  /**
   * Sanitize data by removing sensitive fields and truncating long values
   */
  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return this.truncateValue(data)
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item))
    }

    const sanitized: Record<string, unknown> = {}
    const obj = data as Record<string, unknown>

    for (const [key, value] of Object.entries(obj)) {
      if (this.config.sensitiveFields?.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = this.sanitizeData(value)
      }
    }

    return sanitized
  }

  /**
   * Truncate long values for logging
   */
  private truncateValue(value: unknown): unknown {
    if (typeof value === 'string' && this.config.maxLogLength) {
      if (value.length > this.config.maxLogLength) {
        return value.substring(0, this.config.maxLogLength) + '...[truncated]'
      }
    }
    return value
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Factory function for easy creation
 */
export function withLogging(tool: MCPTool, config?: LoggingConfig): MCPTool {
  return new LoggingDecorator(tool, config).getTool()
}

/**
 * Batch logging decorator for multiple tools
 */
export class BatchLoggingDecorator {
  private config: LoggingConfig

  constructor(config: LoggingConfig = {}) {
    this.config = config
  }

  /**
   * Apply logging to multiple tools
   */
  decorateTools(tools: MCPTool[]): MCPTool[] {
    return tools.map(tool => new LoggingDecorator(tool, this.config).getTool())
  }

  /**
   * Apply logging to tools with individual configs
   */
  decorateToolsWithConfigs(
    toolConfigs: Array<{ tool: MCPTool; config?: LoggingConfig }>
  ): MCPTool[] {
    return toolConfigs.map(({ tool, config }) =>
      new LoggingDecorator(tool, { ...this.config, ...config }).getTool()
    )
  }
}

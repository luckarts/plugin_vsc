/**
 * Error Handling Decorator: Provides comprehensive error handling and recovery for MCP tools
 */

import { MCPTool, MCPServerError, ValidationError, NotFoundError } from '../../types/mcp'
import { MetadataTrackingDecorator } from './tool-decorator'
import { logError, logInfo, logSecurityEvent } from '../../logging/logger'

export interface ErrorHandlingConfig extends Record<string, unknown> {
  enableRetry?: boolean
  maxRetries?: number
  retryDelay?: number
  retryBackoff?: 'linear' | 'exponential'
  enableFallback?: boolean
  fallbackHandler?: (params: unknown, error: Error) => Promise<object>
  enableErrorTransformation?: boolean
  enableSecurityLogging?: boolean
  timeoutMs?: number
}

export interface RetryContext {
  attempt: number
  maxAttempts: number
  lastError: Error
  totalDelay: number
}

export class ErrorHandlingDecorator extends MetadataTrackingDecorator {
  protected override config: ErrorHandlingConfig

  constructor(tool: MCPTool, config: ErrorHandlingConfig = {}) {
    super(tool, 'ErrorHandlingDecorator', config)
    this.config = {
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      retryBackoff: 'exponential',
      enableFallback: false,
      enableErrorTransformation: true,
      enableSecurityLogging: true,
      timeoutMs: 30000,
      ...config
    }
  }

  protected decorateHandler(
    originalHandler: (params: unknown) => Promise<object>
  ): (params: unknown) => Promise<object> {
    return async (params: unknown): Promise<object> => {
      const startTime = Date.now()

      try {
        // Execute with timeout if configured
        if (this.config.timeoutMs) {
          return await this.executeWithTimeout(originalHandler, params, this.config.timeoutMs)
        }

        return await this.executeWithRetry(originalHandler, params)

      } catch (error) {
        const duration = Date.now() - startTime

        // Log security events for suspicious errors
        if (this.config.enableSecurityLogging) {
          this.logSecurityEvents(error as Error, params, duration)
        }

        // Try fallback if enabled
        if (this.config.enableFallback && this.config.fallbackHandler) {
          try {
            logInfo(`Attempting fallback for tool: ${this.tool.name}`, {
              originalError: (error as Error).message,
              params
            })

            const fallbackResult = await this.config.fallbackHandler(params, error as Error)

            logInfo(`Fallback successful for tool: ${this.tool.name}`, {
              fallbackResult
            })

            return fallbackResult

          } catch (fallbackError) {
            logError(`Fallback failed for tool: ${this.tool.name}`, fallbackError as Error, {
              originalError: (error as Error).message,
              params
            })
            // Continue with original error handling
          }
        }

        // Transform error if enabled
        if (this.config.enableErrorTransformation) {
          throw this.transformError(error as Error, params, duration)
        }

        throw error
      }
    }
  }

  /**
   * Execute handler with retry logic
   */
  private async executeWithRetry(
    handler: (params: unknown) => Promise<object>,
    params: unknown
  ): Promise<object> {
    let lastError: Error
    let totalDelay = 0

    for (let attempt = 1; attempt <= (this.config.maxRetries! + 1); attempt++) {
      try {
        if (attempt > 1) {
          const delay = this.calculateRetryDelay(attempt - 1)
          totalDelay += delay

          logInfo(`Retrying tool execution: ${this.tool.name}`, {
            attempt: attempt - 1,
            maxRetries: this.config.maxRetries,
            delay,
            totalDelay
          })

          await this.sleep(delay)
        }

        return await handler(params)

      } catch (error) {
        lastError = error as Error

        // Don't retry for certain error types
        if (!this.shouldRetry(error as Error, attempt)) {
          throw error
        }

        logError(`Tool execution failed, attempt ${attempt}`, error as Error, {
          toolName: this.tool.name,
          attempt,
          maxRetries: this.config.maxRetries,
          willRetry: attempt <= this.config.maxRetries!
        })
      }
    }

    // All retries exhausted
    const retryContext: RetryContext = {
      attempt: this.config.maxRetries! + 1,
      maxAttempts: this.config.maxRetries! + 1,
      lastError: lastError!,
      totalDelay
    }

    logError(`All retries exhausted for tool: ${this.tool.name}`, lastError!, {
      retryContext,
      params
    })

    throw this.createRetryExhaustedError(lastError!, retryContext)
  }

  /**
   * Execute handler with timeout
   */
  private async executeWithTimeout(
    handler: (params: unknown) => Promise<object>,
    params: unknown,
    timeoutMs: number
  ): Promise<object> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new MCPServerError(
          `Tool execution timeout: ${this.tool.name}`,
          -32001,
          { timeoutMs, toolName: this.tool.name }
        ))
      }, timeoutMs)

      try {
        const result = await this.executeWithRetry(handler, params)
        clearTimeout(timeoutId)
        resolve(result)
      } catch (error) {
        clearTimeout(timeoutId)
        reject(error)
      }
    })
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetry(error: Error, attempt: number): boolean {
    if (!this.config.enableRetry || attempt > this.config.maxRetries!) {
      return false
    }

    // Don't retry validation errors
    if (error instanceof ValidationError) {
      return false
    }

    // Don't retry not found errors
    if (error instanceof NotFoundError) {
      return false
    }

    // Don't retry authentication errors
    if (error.name === 'AuthenticationError') {
      return false
    }

    // Don't retry client errors (4xx equivalent)
    if (error instanceof MCPServerError && error.code >= -32099 && error.code <= -32000) {
      return false
    }

    // Retry for network errors, timeouts, and server errors
    return true
  }

  /**
   * Calculate retry delay with backoff
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.config.retryDelay!

    switch (this.config.retryBackoff) {
      case 'linear':
        return baseDelay * attempt

      case 'exponential':
        return baseDelay * Math.pow(2, attempt - 1)

      default:
        return baseDelay
    }
  }

  /**
   * Transform errors into appropriate MCP errors
   */
  private transformError(error: Error, params: unknown, duration: number): Error {
    // Already an MCP error
    if (error instanceof MCPServerError) {
      return error
    }

    // Timeout errors
    if (error.message.includes('timeout')) {
      return new MCPServerError(
        `Tool execution timeout: ${this.tool.name}`,
        -32001,
        { originalError: error.message, duration, params }
      )
    }

    // Network errors
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      return new MCPServerError(
        `Network error in tool: ${this.tool.name}`,
        -32002,
        { originalError: error.message, duration, params }
      )
    }

    // Memory errors
    if (error.message.includes('out of memory') || error.message.includes('heap')) {
      return new MCPServerError(
        `Memory error in tool: ${this.tool.name}`,
        -32003,
        { originalError: error.message, duration, params }
      )
    }

    // Generic server error
    return new MCPServerError(
      `Internal error in tool: ${this.tool.name}`,
      -32000,
      { originalError: error.message, duration, params }
    )
  }

  /**
   * Create error for retry exhaustion
   */
  private createRetryExhaustedError(lastError: Error, context: RetryContext): Error {
    return new MCPServerError(
      `Tool execution failed after ${context.maxAttempts} attempts: ${this.tool.name}`,
      -32005,
      {
        lastError: lastError.message,
        retryContext: context,
        toolName: this.tool.name
      }
    )
  }

  /**
   * Log security-related events
   */
  private logSecurityEvents(error: Error, params: unknown, duration: number): void {
    // Log potential security issues
    if (error.message.includes('unauthorized') ||
        error.message.includes('forbidden') ||
        error.message.includes('access denied')) {

      logSecurityEvent('Unauthorized tool access attempt', {
        toolName: this.tool.name,
        error: error.message,
        params: this.sanitizeParams(params),
        duration,
        timestamp: new Date().toISOString()
      })
    }

    // Log potential injection attempts
    if (this.detectInjectionAttempt(params)) {
      logSecurityEvent('Potential injection attempt detected', {
        toolName: this.tool.name,
        params: this.sanitizeParams(params),
        error: error.message,
        timestamp: new Date().toISOString()
      })
    }
  }

  /**
   * Detect potential injection attempts
   */
  private detectInjectionAttempt(params: unknown): boolean {
    if (typeof params !== 'object' || params === null) {
      return false
    }

    const paramString = JSON.stringify(params).toLowerCase()
    const suspiciousPatterns = [
      'script>',
      'javascript:',
      'eval(',
      'function(',
      'require(',
      'import(',
      '__proto__',
      'constructor',
      'prototype'
    ]

    return suspiciousPatterns.some(pattern => paramString.includes(pattern))
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: unknown): unknown {
    if (typeof params === 'object' && params !== null) {
      const sanitized = { ...params as Record<string, unknown> }
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth']

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]'
        }
      }

      return sanitized
    }

    return params
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Factory function for easy creation
 */
export function withErrorHandling(tool: MCPTool, config?: ErrorHandlingConfig): MCPTool {
  return new ErrorHandlingDecorator(tool, config).getTool()
}

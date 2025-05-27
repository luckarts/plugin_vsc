/**
 * Performance Decorator: Tracks and optimizes tool execution performance
 */

import { MCPTool } from '../../types/mcp'
import { MetadataTrackingDecorator } from './tool-decorator'
import { logPerformance, logInfo, logError } from '../../logging/logger'

export interface PerformanceConfig extends Record<string, unknown> {
  enableMetrics?: boolean
  enableCaching?: boolean
  cacheTimeout?: number
  slowThreshold?: number
  enableCircuitBreaker?: boolean
  failureThreshold?: number
  recoveryTimeout?: number
}

export interface PerformanceMetrics {
  totalCalls: number
  successfulCalls: number
  failedCalls: number
  averageResponseTime: number
  minResponseTime: number
  maxResponseTime: number
  lastExecutionTime: number
  cacheHits: number
  cacheMisses: number
}

export interface CacheEntry {
  result: object
  timestamp: number
  hits: number
}

export class PerformanceDecorator extends MetadataTrackingDecorator {
  protected override config: PerformanceConfig
  private metrics: PerformanceMetrics
  private cache: Map<string, CacheEntry> = new Map()
  private circuitBreakerOpen = false
  private lastFailureTime = 0
  private consecutiveFailures = 0

  constructor(tool: MCPTool, config: PerformanceConfig = {}) {
    super(tool, 'PerformanceDecorator', config)
    this.config = {
      enableMetrics: true,
      enableCaching: false,
      cacheTimeout: 300000, // 5 minutes
      slowThreshold: 1000, // 1 second
      enableCircuitBreaker: false,
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      ...config
    }

    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      lastExecutionTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  }

  protected decorateHandler(
    originalHandler: (params: unknown) => Promise<object>
  ): (params: unknown) => Promise<object> {
    return async (params: unknown): Promise<object> => {
      const startTime = Date.now()

      try {
        // Check circuit breaker
        if (this.config.enableCircuitBreaker && this.isCircuitBreakerOpen()) {
          throw new Error(`Circuit breaker is open for tool: ${this.tool.name}`)
        }

        // Check cache first
        if (this.config.enableCaching) {
          const cacheKey = this.generateCacheKey(params)
          const cachedResult = this.getCachedResult(cacheKey)

          if (cachedResult) {
            this.updateMetrics(Date.now() - startTime, true, true)
            return cachedResult
          }
        }

        // Execute original handler
        const result = await originalHandler(params)
        const duration = Date.now() - startTime

        // Cache result if enabled
        if (this.config.enableCaching) {
          const cacheKey = this.generateCacheKey(params)
          this.setCachedResult(cacheKey, result)
        }

        // Update metrics
        this.updateMetrics(duration, true, false)

        // Reset circuit breaker on success
        if (this.config.enableCircuitBreaker) {
          this.consecutiveFailures = 0
        }

        // Log slow operations
        if (this.config.slowThreshold && duration > this.config.slowThreshold) {
          logInfo(`Slow operation detected: ${this.tool.name}`, {
            duration,
            threshold: this.config.slowThreshold,
            params: this.sanitizeParams(params)
          })
        }

        return result

      } catch (error) {
        const duration = Date.now() - startTime

        // Update metrics
        this.updateMetrics(duration, false, false)

        // Update circuit breaker
        if (this.config.enableCircuitBreaker) {
          this.consecutiveFailures++
          this.lastFailureTime = Date.now()
        }

        throw error
      }
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(duration: number, success: boolean, fromCache: boolean): void {
    if (!this.config.enableMetrics) return

    this.metrics.totalCalls++
    this.metrics.lastExecutionTime = duration

    if (success) {
      this.metrics.successfulCalls++

      if (fromCache) {
        this.metrics.cacheHits++
      } else {
        this.metrics.cacheMisses++

        // Update response time metrics only for non-cached calls
        this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, duration)
        this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, duration)

        // Calculate rolling average
        const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.cacheMisses - 1) + duration
        this.metrics.averageResponseTime = totalResponseTime / this.metrics.cacheMisses
      }
    } else {
      this.metrics.failedCalls++
    }

    // Log performance metrics
    logPerformance(this.tool.name, duration, {
      success,
      fromCache,
      totalCalls: this.metrics.totalCalls,
      averageResponseTime: this.metrics.averageResponseTime
    })
  }

  /**
   * Generate cache key from parameters
   */
  private generateCacheKey(params: unknown): string {
    return `${this.tool.name}_${JSON.stringify(params)}`
  }

  /**
   * Get cached result if valid
   */
  private getCachedResult(cacheKey: string): object | null {
    const entry = this.cache.get(cacheKey)

    if (!entry) return null

    const now = Date.now()
    if (now - entry.timestamp > this.config.cacheTimeout!) {
      this.cache.delete(cacheKey)
      return null
    }

    entry.hits++
    return entry.result
  }

  /**
   * Set cached result
   */
  private setCachedResult(cacheKey: string, result: object): void {
    this.cache.set(cacheKey, {
      result,
      timestamp: Date.now(),
      hits: 0
    })

    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache()
    }
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.cacheTimeout!) {
        expiredKeys.push(key)
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key))
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(): boolean {
    if (!this.circuitBreakerOpen) {
      // Check if we should open the circuit breaker
      if (this.consecutiveFailures >= this.config.failureThreshold!) {
        this.circuitBreakerOpen = true
        logError(`Circuit breaker opened for tool: ${this.tool.name}`, new Error('Too many failures'), {
          consecutiveFailures: this.consecutiveFailures,
          threshold: this.config.failureThreshold
        })
        return true
      }
      return false
    }

    // Check if we should close the circuit breaker
    const now = Date.now()
    if (now - this.lastFailureTime > this.config.recoveryTimeout!) {
      this.circuitBreakerOpen = false
      this.consecutiveFailures = 0
      logInfo(`Circuit breaker closed for tool: ${this.tool.name}`, {
        recoveryTime: now - this.lastFailureTime
      })
      return false
    }

    return true
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalCalls: 0,
      successfulCalls: 0,
      failedCalls: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      lastExecutionTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Sanitize parameters for logging
   */
  private sanitizeParams(params: unknown): unknown {
    // Simple sanitization - remove sensitive data
    if (typeof params === 'object' && params !== null) {
      const sanitized = { ...params as Record<string, unknown> }
      const sensitiveFields = ['password', 'token', 'secret', 'key']

      for (const field of sensitiveFields) {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]'
        }
      }

      return sanitized
    }

    return params
  }
}

/**
 * Factory function for easy creation
 */
export function withPerformanceTracking(tool: MCPTool, config?: PerformanceConfig): MCPTool {
  return new PerformanceDecorator(tool, config).getTool()
}

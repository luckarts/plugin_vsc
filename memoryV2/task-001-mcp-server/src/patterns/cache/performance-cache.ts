/**
 * Cache Pattern: High-performance LRU cache with intelligent invalidation
 */

import { Memory } from '../../types/mcp'
import { logInfo, logError, logPerformance } from '../../logging/logger'

export interface CacheConfig {
  maxSize: number
  ttl: number // Time to live in milliseconds
  enableMetrics: boolean
  enableCompression: boolean
  compressionThreshold: number
}

export interface CacheEntry<T> {
  value: T
  timestamp: number
  accessCount: number
  lastAccessed: number
  size: number
  compressed: boolean
}

export interface CacheMetrics {
  hits: number
  misses: number
  evictions: number
  totalSize: number
  averageAccessTime: number
  hitRate: number
  memoryUsage: number
}

export class PerformanceCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private accessOrder: string[] = []
  private config: CacheConfig
  private metrics: CacheMetrics

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      ttl: 300000, // 5 minutes
      enableMetrics: true,
      enableCompression: false,
      compressionThreshold: 1000,
      ...config
    }

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      averageAccessTime: 0,
      hitRate: 0,
      memoryUsage: 0
    }

    // Start cleanup interval
    this.startCleanupInterval()
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const start = Date.now()

    try {
      const entry = this.cache.get(key)

      if (!entry) {
        this.updateMetrics('miss', Date.now() - start)
        return null
      }

      // Check TTL
      if (this.isExpired(entry)) {
        this.cache.delete(key)
        this.removeFromAccessOrder(key)
        this.updateMetrics('miss', Date.now() - start)
        return null
      }

      // Update access information
      entry.accessCount++
      entry.lastAccessed = Date.now()
      this.updateAccessOrder(key)

      this.updateMetrics('hit', Date.now() - start)

      // Decompress if needed
      const value = this.decompressValue(entry.value, entry.compressed)
      return value

    } catch (error) {
      logError('Cache get error', error as Error, { key })
      this.updateMetrics('miss', Date.now() - start)
      return null
    }
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    const start = Date.now()

    try {
      // Remove existing entry if present
      if (this.cache.has(key)) {
        this.delete(key)
      }

      // Ensure we have space
      this.ensureCapacity()

      // Compress value if needed
      const { compressedValue, compressed } = this.compressValue(value)
      const size = this.calculateSize(compressedValue)

      const entry: CacheEntry<T> = {
        value: compressedValue,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        compressed
      }

      this.cache.set(key, entry)
      this.accessOrder.push(key)
      this.metrics.totalSize += size

      logPerformance('cache-set', Date.now() - start, {
        key,
        size,
        compressed,
        cacheSize: this.cache.size
      })

    } catch (error) {
      logError('Cache set error', error as Error, { key })
    }
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    this.cache.delete(key)
    this.removeFromAccessOrder(key)
    this.metrics.totalSize -= entry.size

    return true
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.metrics.totalSize = 0
    this.metrics.evictions = 0

    logInfo('Cache cleared')
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) {
      return false
    }

    if (this.isExpired(entry)) {
      this.delete(key)
      return false
    }

    return true
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    this.updateHitRate()
    this.updateMemoryUsage()
    return { ...this.metrics }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  /**
   * Invalidate entries matching pattern
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.delete(key)
        invalidated++
      }
    }

    logInfo('Cache pattern invalidation', { pattern: pattern.toString(), invalidated })
    return invalidated
  }

  /**
   * Invalidate entries by prefix
   */
  invalidatePrefix(prefix: string): number {
    let invalidated = 0

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.delete(key)
        invalidated++
      }
    }

    logInfo('Cache prefix invalidation', { prefix, invalidated })
    return invalidated
  }

  /**
   * Ensure cache doesn't exceed capacity
   */
  private ensureCapacity(): void {
    while (this.cache.size >= this.config.maxSize) {
      this.evictLRU()
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) {
      return
    }

    const keyToEvict = this.accessOrder[0]
    if (!keyToEvict) return

    const entry = this.cache.get(keyToEvict)

    if (entry) {
      this.metrics.totalSize -= entry.size
      this.metrics.evictions++
    }

    this.cache.delete(keyToEvict)
    this.accessOrder.shift()

    logInfo('Cache LRU eviction', { key: keyToEvict })
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    this.removeFromAccessOrder(key)
    this.accessOrder.push(key)
  }

  /**
   * Remove key from access order
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > this.config.ttl
  }

  /**
   * Compress value if enabled and above threshold
   */
  private compressValue(value: T): { compressedValue: T; compressed: boolean } {
    if (!this.config.enableCompression) {
      return { compressedValue: value, compressed: false }
    }

    const size = this.calculateSize(value)
    if (size < this.config.compressionThreshold) {
      return { compressedValue: value, compressed: false }
    }

    try {
      // Simple compression simulation (in real implementation, use actual compression)
      const compressed = JSON.stringify(value)
      return { compressedValue: compressed as T, compressed: true }
    } catch (error) {
      logError('Compression failed', error as Error)
      return { compressedValue: value, compressed: false }
    }
  }

  /**
   * Decompress value if compressed
   */
  private decompressValue(value: T, compressed: boolean): T {
    if (!compressed) {
      return value
    }

    try {
      // Simple decompression simulation
      return JSON.parse(value as string) as T
    } catch (error) {
      logError('Decompression failed', error as Error)
      return value
    }
  }

  /**
   * Calculate size of value
   */
  private calculateSize(value: T): number {
    try {
      return JSON.stringify(value).length
    } catch (error) {
      return 0
    }
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(type: 'hit' | 'miss', accessTime: number): void {
    if (!this.config.enableMetrics) {
      return
    }

    if (type === 'hit') {
      this.metrics.hits++
    } else {
      this.metrics.misses++
    }

    // Update average access time
    const totalAccesses = this.metrics.hits + this.metrics.misses
    this.metrics.averageAccessTime =
      (this.metrics.averageAccessTime * (totalAccesses - 1) + accessTime) / totalAccesses
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0
  }

  /**
   * Update memory usage estimate
   */
  private updateMemoryUsage(): void {
    this.metrics.memoryUsage = this.metrics.totalSize +
      (this.cache.size * 100) + // Overhead per entry
      (this.accessOrder.length * 50) // Access order overhead
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpired()
    }, this.config.ttl / 4) // Cleanup every quarter of TTL
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.delete(key)
    }

    if (expiredKeys.length > 0) {
      logInfo('Cache cleanup completed', { expiredEntries: expiredKeys.length })
    }
  }
}

/**
 * Specialized cache for Memory objects
 */
export class MemoryCache extends PerformanceCache<Memory> {
  constructor(config?: Partial<CacheConfig>) {
    super({
      maxSize: 500,
      ttl: 600000, // 10 minutes for memories
      enableCompression: true,
      compressionThreshold: 500,
      ...config
    })
  }

  /**
   * Invalidate memories by type
   */
  invalidateByType(type: string): number {
    return this.invalidatePattern(new RegExp(`^memory_${type}_`))
  }

  /**
   * Invalidate memories by project
   */
  invalidateByProject(project: string): number {
    return this.invalidatePattern(new RegExp(`_project_${project}_`))
  }
}

/**
 * Global cache instances
 */
export const memoryCache = new MemoryCache()
export const toolMetadataCache = new PerformanceCache<object>({
  maxSize: 100,
  ttl: 3600000, // 1 hour for tool metadata
  enableCompression: false
})

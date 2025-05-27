/**
 * Memory service implementation (enhanced with patterns for Task 001 refactoring)
 * This will be replaced with the real implementation in later tasks
 */

import { v4 as uuidv4 } from 'uuid'
import {
  Memory,
  MemoryType,
  MemoryMetadata,
  CreateMemoryParams,
  SearchMemoriesParams,
  UpdateMemoryParams,
  SearchResultMemory,
  MemoryStatsResult
} from '../types/mcp'
import { logInfo, logError, logPerformance } from '../logging/logger'
import { MemoryTypeStrategyFactory } from '../patterns/strategy/memory-type-strategy'
import { memoryCache } from '../patterns/cache/performance-cache'
import { eventSystem, MCPEventType } from '../patterns/observer/event-system'

export class MemoryService {
  private memories: Map<string, Memory> = new Map()
  private accessCounts: Map<string, number> = new Map()

  /**
   * Create a new memory (enhanced with Strategy pattern)
   */
  async createMemory(params: CreateMemoryParams): Promise<string> {
    const start = Date.now()

    try {
      const memoryId = uuidv4()
      const now = new Date()
      const memoryType = (params.type as MemoryType) || MemoryType.PERSONAL

      // Get strategy for memory type
      const strategy = MemoryTypeStrategyFactory.getStrategy(memoryType)

      // Validate creation with strategy
      await strategy.validateCreation(params)

      // Process content with strategy
      const processedContent = await strategy.processContent(params.content, memoryType)

      // Create default metadata
      const defaultMetadata: MemoryMetadata = {
        tags: params.tags || [],
        importance: 5,
        category: 'general',
        source: 'mcp-api',
        ...params.metadata
      }

      // Enhance metadata with strategy
      const enhancedMetadata = await strategy.enhanceMetadata(defaultMetadata, params)

      const memory: Memory = {
        id: memoryId,
        content: processedContent,
        type: memoryType,
        metadata: enhancedMetadata,
        created: now,
        updated: now,
        accessed: now,
        accessCount: 0,
        compressed: false,
        version: 1
      }

      this.memories.set(memoryId, memory)
      this.accessCounts.set(memoryId, 0)

      // Cache the new memory
      memoryCache.set(`memory_${memoryId}`, memory)

      const duration = Date.now() - start
      logPerformance('createMemory', duration, { memoryId, type: memory.type })
      logInfo('Memory created', { memoryId, type: memory.type, contentLength: params.content.length })

      // Emit memory created event
      eventSystem.emitSync(MCPEventType.MEMORY_CREATED, {
        memoryId,
        type: memory.type,
        contentLength: memory.content.length,
        metadata: memory.metadata
      }, 'memory-service')

      return memoryId
    } catch (error) {
      const duration = Date.now() - start
      logError('Failed to create memory', error as Error, { params, duration })
      throw error
    }
  }

  /**
   * Get a memory by ID (enhanced with cache)
   */
  async getMemory(memoryId: string): Promise<Memory | null> {
    const start = Date.now()

    try {
      // Try cache first
      const cacheKey = `memory_${memoryId}`
      let memory = memoryCache.get(cacheKey)
      let fromCache = !!memory

      if (!memory) {
        // Cache miss - get from storage
        memory = this.memories.get(memoryId) || null

        if (memory) {
          // Cache the memory for future requests
          memoryCache.set(cacheKey, memory)
        }
      }

      if (memory) {
        // Update access tracking
        memory.accessed = new Date()
        memory.accessCount++
        this.accessCounts.set(memoryId, memory.accessCount)

        logInfo('Memory retrieved', { memoryId, accessCount: memory.accessCount, fromCache })

        // Emit memory accessed event
        eventSystem.emitSync(MCPEventType.MEMORY_ACCESSED, {
          memoryId,
          accessCount: memory.accessCount,
          fromCache
        }, 'memory-service')
      }

      const duration = Date.now() - start
      logPerformance('getMemory', duration, { memoryId, found: !!memory, fromCache })

      return memory || null
    } catch (error) {
      const duration = Date.now() - start
      logError('Failed to get memory', error as Error, { memoryId, duration })
      throw error
    }
  }

  /**
   * Update a memory
   */
  async updateMemory(params: UpdateMemoryParams): Promise<string[]> {
    const start = Date.now()

    try {
      const memory = this.memories.get(params.memory_id)
      if (!memory) {
        throw new Error(`Memory not found: ${params.memory_id}`)
      }

      const updatedFields: string[] = []

      if (params.content !== undefined) {
        memory.content = params.content
        updatedFields.push('content')
      }

      if (params.tags !== undefined) {
        memory.metadata.tags = params.tags
        updatedFields.push('tags')
      }

      if (params.metadata !== undefined) {
        memory.metadata = { ...memory.metadata, ...params.metadata }
        updatedFields.push('metadata')
      }

      memory.updated = new Date()
      memory.version++

      const duration = Date.now() - start
      logPerformance('updateMemory', duration, { memoryId: params.memory_id, updatedFields })
      logInfo('Memory updated', { memoryId: params.memory_id, updatedFields })

      return updatedFields
    } catch (error) {
      const duration = Date.now() - start
      logError('Failed to update memory', error as Error, { params, duration })
      throw error
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    const start = Date.now()

    try {
      const existed = this.memories.has(memoryId)

      if (existed) {
        this.memories.delete(memoryId)
        this.accessCounts.delete(memoryId)

        // Also remove from cache
        const cacheKey = `memory_${memoryId}`
        memoryCache.delete(cacheKey)

        logInfo('Memory deleted', { memoryId })
      }

      const duration = Date.now() - start
      logPerformance('deleteMemory', duration, { memoryId, existed })

      return existed
    } catch (error) {
      const duration = Date.now() - start
      logError('Failed to delete memory', error as Error, { memoryId, duration })
      throw error
    }
  }

  /**
   * Search memories (basic text search for now)
   */
  async searchMemories(params: SearchMemoriesParams): Promise<SearchResultMemory[]> {
    const start = Date.now()

    try {
      const query = params.query.toLowerCase()
      const results: SearchResultMemory[] = []

      for (const memory of this.memories.values()) {
        // Basic text matching
        const contentMatch = memory.content.toLowerCase().includes(query)
        const tagMatch = memory.metadata.tags.some(tag =>
          tag.toLowerCase().includes(query)
        )

        if (contentMatch || tagMatch) {
          // Apply type filter
          if (params.type) {
            const types = Array.isArray(params.type) ? params.type : [params.type]
            if (!types.includes(memory.type)) {
              continue
            }
          }

          // Apply tag filter
          if (params.tags && params.tags.length > 0) {
            const hasMatchingTag = params.tags.some(tag =>
              memory.metadata.tags.includes(tag)
            )
            if (!hasMatchingTag) {
              continue
            }
          }

          // Calculate basic similarity score
          const similarity = this.calculateSimilarity(query, memory)

          if (similarity >= (params.threshold || 0.7)) {
            results.push({
              memory,
              similarity,
              rank: results.length + 1,
              highlights: this.getHighlights(query, memory)
            })
          }
        }
      }

      // Sort by similarity and limit results
      results.sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      const limitedResults = results.slice(0, params.limit || 10)

      // Update ranks
      limitedResults.forEach((result, index) => {
        result.rank = index + 1
      })

      const duration = Date.now() - start
      logPerformance('searchMemories', duration, {
        query: params.query,
        resultsCount: limitedResults.length,
        totalMemories: this.memories.size
      })

      return limitedResults
    } catch (error) {
      const duration = Date.now() - start
      logError('Failed to search memories', error as Error, { params, duration })
      throw error
    }
  }

  /**
   * Get memory statistics
   */
  async getStats(_includeDetails: boolean = false): Promise<MemoryStatsResult> {
    const start = Date.now()

    try {
      const memories = Array.from(this.memories.values())
      const byType: Record<MemoryType, number> = {
        [MemoryType.PERSONAL]: 0,
        [MemoryType.REPOSITORY]: 0,
        [MemoryType.GUIDELINE]: 0,
        [MemoryType.SESSION]: 0,
        [MemoryType.TEMPLATE]: 0
      }

      let totalSize = 0
      let compressedSize = 0

      for (const memory of memories) {
        byType[memory.type]++
        totalSize += memory.content.length
        if (memory.compressed) {
          compressedSize += memory.content.length
        }
      }

      const stats: MemoryStatsResult = {
        total: memories.length,
        byType,
        storage: {
          totalSize,
          compressedSize
        },
        performance: {
          averageSearchTime: 45, // Mock value
          averageCreateTime: 12   // Mock value
        }
      }

      const duration = Date.now() - start
      logPerformance('getStats', duration, { totalMemories: memories.length })

      return stats
    } catch (error) {
      const duration = Date.now() - start
      logError('Failed to get stats', error as Error, { duration })
      throw error
    }
  }

  /**
   * Calculate basic similarity score
   */
  private calculateSimilarity(query: string, memory: Memory): number {
    const content = memory.content.toLowerCase()
    const queryWords = query.split(' ')
    let matches = 0

    for (const word of queryWords) {
      if (content.includes(word)) {
        matches++
      }
    }

    return matches / queryWords.length
  }

  /**
   * Get highlighted text snippets
   */
  private getHighlights(query: string, memory: Memory): string[] {
    const content = memory.content
    const queryWords = query.toLowerCase().split(' ')
    const highlights: string[] = []

    for (const word of queryWords) {
      const index = content.toLowerCase().indexOf(word)
      if (index !== -1) {
        const start = Math.max(0, index - 20)
        const end = Math.min(content.length, index + word.length + 20)
        const snippet = content.substring(start, end)
        highlights.push(`...${snippet}...`)
      }
    }

    return highlights.slice(0, 3) // Limit to 3 highlights
  }

  /**
   * Get total number of memories (for testing)
   */
  getMemoryCount(): number {
    return this.memories.size
  }

  /**
   * Clear all memories (for testing)
   */
  clearMemories(): void {
    this.memories.clear()
    this.accessCounts.clear()
  }
}

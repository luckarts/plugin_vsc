/**
 * Tests for Cache Pattern implementation
 */

import { PerformanceCache, MemoryCache } from '../../../src/patterns/cache/performance-cache'
import { Memory, MemoryType } from '../../../src/types/mcp'

describe('PerformanceCache', () => {
  let cache: PerformanceCache<string>

  beforeEach(() => {
    cache = new PerformanceCache<string>({
      maxSize: 3,
      ttl: 1000, // 1 second for testing
      enableMetrics: true,
      enableCompression: false
    })
  })

  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
    })

    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })

    it('should check if key exists', () => {
      cache.set('key1', 'value1')
      expect(cache.has('key1')).toBe(true)
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should delete values', () => {
      cache.set('key1', 'value1')
      expect(cache.delete('key1')).toBe(true)
      expect(cache.get('key1')).toBeNull()
      expect(cache.delete('nonexistent')).toBe(false)
    })

    it('should clear all values', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })
  })

  describe('LRU Eviction', () => {
    it('should evict least recently used items when at capacity', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // Cache is now at capacity (3 items)
      expect(cache.size()).toBe(3)
      
      // Adding a new item should evict the least recently used (key1)
      cache.set('key4', 'value4')
      
      expect(cache.size()).toBe(3)
      expect(cache.get('key1')).toBeNull() // Evicted
      expect(cache.get('key2')).toBe('value2')
      expect(cache.get('key3')).toBe('value3')
      expect(cache.get('key4')).toBe('value4')
    })

    it('should update access order when getting values', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      
      // Access key1 to make it most recently used
      cache.get('key1')
      
      // Add new item - key2 should be evicted (least recently used)
      cache.set('key4', 'value4')
      
      expect(cache.get('key1')).toBe('value1') // Still there
      expect(cache.get('key2')).toBeNull() // Evicted
      expect(cache.get('key3')).toBe('value3')
      expect(cache.get('key4')).toBe('value4')
    })
  })

  describe('TTL (Time To Live)', () => {
    it('should expire items after TTL', async () => {
      cache.set('key1', 'value1')
      expect(cache.get('key1')).toBe('value1')
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(cache.get('key1')).toBeNull()
    })

    it('should not return expired items', async () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 1100))
      
      expect(cache.has('key1')).toBe(false)
      expect(cache.has('key2')).toBe(false)
    })
  })

  describe('Metrics', () => {
    it('should track cache hits and misses', () => {
      cache.set('key1', 'value1')
      
      // Hit
      cache.get('key1')
      
      // Miss
      cache.get('nonexistent')
      
      const metrics = cache.getMetrics()
      expect(metrics.hits).toBe(1)
      expect(metrics.misses).toBe(1)
      expect(metrics.hitRate).toBe(0.5)
    })

    it('should track cache size and evictions', () => {
      cache.set('key1', 'value1')
      cache.set('key2', 'value2')
      cache.set('key3', 'value3')
      cache.set('key4', 'value4') // Should cause eviction
      
      const metrics = cache.getMetrics()
      expect(metrics.evictions).toBe(1)
      expect(metrics.totalSize).toBeGreaterThan(0)
    })
  })

  describe('Pattern Invalidation', () => {
    it('should invalidate entries matching pattern', () => {
      cache.set('user_1', 'value1')
      cache.set('user_2', 'value2')
      cache.set('post_1', 'value3')
      
      const invalidated = cache.invalidatePattern(/^user_/)
      
      expect(invalidated).toBe(2)
      expect(cache.get('user_1')).toBeNull()
      expect(cache.get('user_2')).toBeNull()
      expect(cache.get('post_1')).toBe('value3')
    })

    it('should invalidate entries by prefix', () => {
      cache.set('memory_123', 'value1')
      cache.set('memory_456', 'value2')
      cache.set('tool_789', 'value3')
      
      const invalidated = cache.invalidatePrefix('memory_')
      
      expect(invalidated).toBe(2)
      expect(cache.get('memory_123')).toBeNull()
      expect(cache.get('memory_456')).toBeNull()
      expect(cache.get('tool_789')).toBe('value3')
    })
  })
})

describe('MemoryCache', () => {
  let memoryCache: MemoryCache

  beforeEach(() => {
    memoryCache = new MemoryCache({
      maxSize: 5,
      ttl: 5000,
      enableCompression: false
    })
  })

  describe('Memory-specific Operations', () => {
    it('should cache Memory objects', () => {
      const memory: Memory = {
        id: 'mem_123',
        content: 'Test memory content',
        type: MemoryType.PERSONAL,
        metadata: {
          tags: ['test'],
          importance: 5,
          category: 'test',
          source: 'test'
        },
        created: new Date(),
        updated: new Date(),
        accessed: new Date(),
        accessCount: 0,
        compressed: false,
        version: 1
      }

      memoryCache.set('memory_123', memory)
      const retrieved = memoryCache.get('memory_123')

      expect(retrieved).toEqual(memory)
      expect(retrieved!.id).toBe('mem_123')
      expect(retrieved!.content).toBe('Test memory content')
    })

    it('should invalidate memories by type', () => {
      const personalMemory: Memory = {
        id: 'mem_1',
        content: 'Personal memory',
        type: MemoryType.PERSONAL,
        metadata: { tags: [], importance: 5, category: 'personal', source: 'test' },
        created: new Date(),
        updated: new Date(),
        accessed: new Date(),
        accessCount: 0,
        compressed: false,
        version: 1
      }

      const repoMemory: Memory = {
        id: 'mem_2',
        content: 'Repository memory',
        type: MemoryType.REPOSITORY,
        metadata: { tags: [], importance: 5, category: 'code', source: 'test' },
        created: new Date(),
        updated: new Date(),
        accessed: new Date(),
        accessCount: 0,
        compressed: false,
        version: 1
      }

      memoryCache.set('memory_personal_1', personalMemory)
      memoryCache.set('memory_repository_1', repoMemory)

      const invalidated = memoryCache.invalidateByType('personal')

      expect(invalidated).toBe(1)
      expect(memoryCache.get('memory_personal_1')).toBeNull()
      expect(memoryCache.get('memory_repository_1')).toEqual(repoMemory)
    })

    it('should invalidate memories by project', () => {
      const projectAMemory: Memory = {
        id: 'mem_1',
        content: 'Project A memory',
        type: MemoryType.REPOSITORY,
        metadata: { 
          tags: [], 
          importance: 5, 
          category: 'code', 
          source: 'test',
          project: 'projectA'
        },
        created: new Date(),
        updated: new Date(),
        accessed: new Date(),
        accessCount: 0,
        compressed: false,
        version: 1
      }

      const projectBMemory: Memory = {
        id: 'mem_2',
        content: 'Project B memory',
        type: MemoryType.REPOSITORY,
        metadata: { 
          tags: [], 
          importance: 5, 
          category: 'code', 
          source: 'test',
          project: 'projectB'
        },
        created: new Date(),
        updated: new Date(),
        accessed: new Date(),
        accessCount: 0,
        compressed: false,
        version: 1
      }

      memoryCache.set('memory_project_projectA_1', projectAMemory)
      memoryCache.set('memory_project_projectB_1', projectBMemory)

      const invalidated = memoryCache.invalidateByProject('projectA')

      expect(invalidated).toBe(1)
      expect(memoryCache.get('memory_project_projectA_1')).toBeNull()
      expect(memoryCache.get('memory_project_projectB_1')).toEqual(projectBMemory)
    })
  })
})

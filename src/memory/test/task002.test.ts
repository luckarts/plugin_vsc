/**
 * Tests for Task 002 Memory System
 * Validates the exact specifications from the behavior document
 */

import {
  MemoryFactory,
  Memory,
  MemoryType,
  SearchOptions,
  createMemoryId,
  IMemoryAdapter
} from '../index';

describe('Task 002: Vector Memory Store', () => {
  let memoryStore: IMemoryAdapter;

  beforeAll(async () => {
    // Create test memory store
    memoryStore = await MemoryFactory.createTestMemoryStore();
  });

  afterAll(async () => {
    // Clean up
    await memoryStore.clear();
  });

  describe('Memory Storage', () => {
    test('should store a memory with automatic embedding generation', async () => {
      const memory: Memory = {
        id: createMemoryId('test'),
        content: 'Test memory for storage validation',
        metadata: {
          type: MemoryType.NOTE,
          tags: ['test', 'storage'],
          importance: 1,
          category: 'test',
          source: 'unit-test'
        },
        created: new Date(),
        updated: new Date()
      };

      await expect(memoryStore.store(memory)).resolves.not.toThrow();

      // Verify storage by searching
      const results = await memoryStore.search('storage validation', { limit: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toBe(memory.content);
    });

    test('should handle multiple memories with different types', async () => {
      const memories: Memory[] = [
        {
          id: createMemoryId('test'),
          content: 'function authenticate(user) { return true; }',
          metadata: {
            type: MemoryType.CODE_SNIPPET,
            tags: ['javascript', 'function'],
            importance: 2,
            category: 'code',
            source: 'unit-test'
          },
          created: new Date(),
          updated: new Date()
        },
        {
          id: createMemoryId('test'),
          content: 'Documentation about authentication best practices',
          metadata: {
            type: MemoryType.DOCUMENTATION,
            tags: ['authentication', 'security'],
            importance: 1.5,
            category: 'docs',
            source: 'unit-test'
          },
          created: new Date(),
          updated: new Date()
        }
      ];

      for (const memory of memories) {
        await memoryStore.store(memory);
      }

      const stats = await memoryStore.getStats();
      expect(stats.totalVectors).toBeGreaterThanOrEqual(memories.length);
    });
  });

  describe('Semantic Search', () => {
    beforeEach(async () => {
      // Clear and add test data
      await memoryStore.clear();
      
      const testMemories: Memory[] = [
        {
          id: createMemoryId('search'),
          content: 'How to implement user authentication with JWT tokens',
          metadata: {
            type: MemoryType.DOCUMENTATION,
            tags: ['jwt', 'authentication', 'security'],
            importance: 2,
            category: 'security',
            source: 'test'
          },
          created: new Date(),
          updated: new Date()
        },
        {
          id: createMemoryId('search'),
          content: 'Performance optimization techniques for React applications',
          metadata: {
            type: MemoryType.DOCUMENTATION,
            tags: ['react', 'performance', 'optimization'],
            importance: 1.5,
            category: 'frontend',
            source: 'test'
          },
          created: new Date(),
          updated: new Date()
        }
      ];

      for (const memory of testMemories) {
        await memoryStore.store(memory);
      }
    });

    test('should find semantically similar memories', async () => {
      const results = await memoryStore.search('JWT security authentication', {
        limit: 5,
        threshold: 0.3
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(0.3);
      expect(results[0].memory.content).toContain('authentication');
    });

    test('should return results sorted by similarity', async () => {
      const results = await memoryStore.search('React performance', {
        limit: 5,
        sortBy: 'similarity'
      });

      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i-1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
        }
      }
    });

    test('should include similarity scores and rankings', async () => {
      const results = await memoryStore.search('authentication', { limit: 3 });

      results.forEach((result, index) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
        expect(result.rank).toBe(index + 1);
        expect(result.explanation).toBeDefined();
      });
    });
  });

  describe('Search with Filters', () => {
    beforeEach(async () => {
      await memoryStore.clear();
      
      const testMemories: Memory[] = [
        {
          id: createMemoryId('filter'),
          content: 'TypeScript interface for user authentication',
          metadata: {
            type: MemoryType.CODE_SNIPPET,
            tags: ['typescript', 'interface', 'auth'],
            language: 'typescript',
            importance: 2,
            category: 'code',
            source: 'test',
            project: 'auth-service'
          },
          created: new Date(),
          updated: new Date()
        },
        {
          id: createMemoryId('filter'),
          content: 'Python function for data validation',
          metadata: {
            type: MemoryType.CODE_SNIPPET,
            tags: ['python', 'validation'],
            language: 'python',
            importance: 1,
            category: 'code',
            source: 'test',
            project: 'data-service'
          },
          created: new Date(),
          updated: new Date()
        }
      ];

      for (const memory of testMemories) {
        await memoryStore.store(memory);
      }
    });

    test('should filter by memory type', async () => {
      const options: SearchOptions = {
        limit: 10,
        filters: {
          type: [MemoryType.CODE_SNIPPET]
        }
      };

      const results = await memoryStore.search('function', options);
      
      results.forEach(result => {
        expect(result.memory.metadata.type).toBe(MemoryType.CODE_SNIPPET);
      });
    });

    test('should filter by tags', async () => {
      const options: SearchOptions = {
        limit: 10,
        filters: {
          tags: ['typescript']
        }
      };

      const results = await memoryStore.search('interface', options);
      
      results.forEach(result => {
        expect(result.memory.metadata.tags).toContain('typescript');
      });
    });

    test('should filter by language', async () => {
      const options: SearchOptions = {
        limit: 10,
        filters: {
          language: 'python'
        }
      };

      const results = await memoryStore.search('validation', options);
      
      results.forEach(result => {
        expect(result.memory.metadata.language).toBe('python');
      });
    });

    test('should filter by importance range', async () => {
      const options: SearchOptions = {
        limit: 10,
        filters: {
          importance: { min: 1.5, max: 3 }
        }
      };

      const results = await memoryStore.search('code', options);
      
      results.forEach(result => {
        expect(result.memory.metadata.importance).toBeGreaterThanOrEqual(1.5);
        expect(result.memory.metadata.importance).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Memory Updates', () => {
    test('should update existing memory content and regenerate embedding', async () => {
      const originalMemory: Memory = {
        id: createMemoryId('update'),
        content: 'Original content about React',
        metadata: {
          type: MemoryType.NOTE,
          tags: ['react'],
          importance: 1,
          category: 'frontend',
          source: 'test'
        },
        created: new Date(),
        updated: new Date()
      };

      await memoryStore.store(originalMemory);

      const updatedMemory: Memory = {
        ...originalMemory,
        content: 'Updated content about React hooks and state management',
        metadata: {
          ...originalMemory.metadata,
          tags: ['react', 'hooks', 'state']
        },
        updated: new Date()
      };

      await memoryStore.update(originalMemory.id, updatedMemory);

      // Search should find the updated content
      const results = await memoryStore.search('hooks state management', { limit: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toBe(updatedMemory.content);
      expect(results[0].memory.metadata.tags).toContain('hooks');
    });
  });

  describe('Memory Deletion', () => {
    test('should delete memory and remove from search results', async () => {
      const memory: Memory = {
        id: createMemoryId('delete'),
        content: 'Memory to be deleted',
        metadata: {
          type: MemoryType.NOTE,
          tags: ['delete', 'test'],
          importance: 1,
          category: 'test',
          source: 'test'
        },
        created: new Date(),
        updated: new Date()
      };

      await memoryStore.store(memory);
      
      // Verify it exists
      let results = await memoryStore.search('deleted', { limit: 5 });
      expect(results.some(r => r.memory.id === memory.id)).toBe(true);

      // Delete it
      await memoryStore.delete(memory.id);

      // Verify it's gone
      results = await memoryStore.search('deleted', { limit: 5 });
      expect(results.some(r => r.memory.id === memory.id)).toBe(false);
    });
  });

  describe('Statistics and Performance', () => {
    test('should provide comprehensive statistics', async () => {
      const stats = await memoryStore.getStats();

      expect(stats).toHaveProperty('totalVectors');
      expect(stats).toHaveProperty('indexSize');
      expect(stats).toHaveProperty('averageSearchTime');
      expect(stats).toHaveProperty('memoryUsage');
      expect(stats).toHaveProperty('embeddingModel');
      expect(stats).toHaveProperty('lastOptimization');

      expect(typeof stats.totalVectors).toBe('number');
      expect(typeof stats.indexSize).toBe('number');
      expect(typeof stats.averageSearchTime).toBe('number');
      expect(typeof stats.memoryUsage).toBe('number');
      expect(typeof stats.embeddingModel).toBe('string');
      expect(stats.lastOptimization).toBeInstanceOf(Date);
    });

    test('should handle search performance requirements', async () => {
      // Add some test data
      const memories: Memory[] = [];
      for (let i = 0; i < 10; i++) {
        memories.push({
          id: createMemoryId('perf'),
          content: `Performance test memory ${i} with various content`,
          metadata: {
            type: MemoryType.NOTE,
            tags: ['performance', 'test'],
            importance: 1,
            category: 'test',
            source: 'performance-test'
          },
          created: new Date(),
          updated: new Date()
        });
      }

      for (const memory of memories) {
        await memoryStore.store(memory);
      }

      // Measure search time
      const startTime = Date.now();
      await memoryStore.search('performance test', { limit: 5 });
      const searchTime = Date.now() - startTime;

      // Should be reasonably fast (under 1 second for small dataset)
      expect(searchTime).toBeLessThan(1000);
    });
  });

  describe('Data Persistence', () => {
    test('should persist data across restarts', async () => {
      const testMemory: Memory = {
        id: createMemoryId('persist'),
        content: 'This memory should persist across restarts',
        metadata: {
          type: MemoryType.NOTE,
          tags: ['persistence', 'test'],
          importance: 1,
          category: 'test',
          source: 'persistence-test'
        },
        created: new Date(),
        updated: new Date()
      };

      await memoryStore.store(testMemory);

      // Create a new memory store instance (simulating restart)
      const newMemoryStore = await MemoryFactory.createTestMemoryStore();
      
      // Should find the persisted memory
      const results = await newMemoryStore.search('persist across restarts', { limit: 1 });
      expect(results).toHaveLength(1);
      expect(results[0].memory.content).toBe(testMemory.content);
    });
  });
});

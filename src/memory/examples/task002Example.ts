/**
 * Example usage of the Task 002 Memory System
 * Demonstrates the exact interface specified in the task
 */

import {
  setupMemorySystem,
  Memory,
  MemoryType,
  SearchOptions,
  MemoryFactory,
  createMemoryId,
  calculateMemoryImportance
} from '../index';

/**
 * Example 1: Basic memory storage and retrieval
 */
export async function basicMemoryExample(): Promise<void> {
  console.log('🚀 Starting Task 002 Memory System Example...');

  try {
    // Initialize the memory system
    const memoryStore = await setupMemorySystem({
      search: {
        defaultLimit: 5,
        defaultThreshold: 0.6
      }
    });

    console.log('✅ Memory system initialized');

    // Create some test memories
    const memories: Memory[] = [
      {
        id: createMemoryId('example'),
        content: 'How to implement authentication in TypeScript using JWT tokens',
        metadata: {
          type: MemoryType.DOCUMENTATION,
          tags: ['typescript', 'authentication', 'jwt', 'security'],
          importance: 2,
          category: 'development',
          source: 'user-input',
          language: 'typescript'
        },
        created: new Date(),
        updated: new Date()
      },
      {
        id: createMemoryId('example'),
        content: 'function validateUser(token: string): boolean { return jwt.verify(token, secret); }',
        metadata: {
          type: MemoryType.CODE_SNIPPET,
          tags: ['typescript', 'function', 'validation', 'jwt'],
          importance: calculateMemoryImportance('function validateUser'),
          category: 'code',
          source: 'code-analysis',
          language: 'typescript'
        },
        created: new Date(),
        updated: new Date()
      },
      {
        id: createMemoryId('example'),
        content: 'Remember to handle JWT expiration and refresh tokens properly',
        metadata: {
          type: MemoryType.NOTE,
          tags: ['jwt', 'security', 'best-practices'],
          importance: 1.5,
          category: 'reminder',
          source: 'user-note'
        },
        created: new Date(),
        updated: new Date()
      }
    ];

    // Store memories
    console.log('📝 Storing memories...');
    for (const memory of memories) {
      await memoryStore.store(memory);
      console.log(`   Stored: ${memory.content.substring(0, 50)}...`);
    }

    // Search for memories
    console.log('\n🔍 Searching memories...');
    
    const searchOptions: SearchOptions = {
      limit: 10,
      threshold: 0.5,
      sortBy: 'similarity'
    };

    const results = await memoryStore.search('JWT authentication TypeScript', searchOptions);
    
    console.log(`Found ${results.length} relevant memories:`);
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Similarity: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`   Content: ${result.memory.content.substring(0, 80)}...`);
      console.log(`   Type: ${result.memory.metadata.type}`);
      console.log(`   Tags: ${result.memory.metadata.tags.join(', ')}`);
      console.log(`   Explanation: ${result.explanation}`);
    });

    // Get statistics
    console.log('\n📊 Memory store statistics:');
    const stats = await memoryStore.getStats();
    console.log(`   Total memories: ${stats.totalVectors}`);
    console.log(`   Index size: ${stats.indexSize} bytes`);
    console.log(`   Average search time: ${stats.averageSearchTime.toFixed(2)}ms`);
    console.log(`   Embedding model: ${stats.embeddingModel}`);

  } catch (error) {
    console.error('❌ Error in basic memory example:', error);
  }
}

/**
 * Example 2: Advanced search with filters
 */
export async function advancedSearchExample(): Promise<void> {
  console.log('\n🔍 Advanced Search Example...');

  try {
    const memoryStore = await setupMemorySystem();

    // Search with type filter
    const codeResults = await memoryStore.search('authentication', {
      limit: 5,
      filters: {
        type: [MemoryType.CODE_SNIPPET, MemoryType.FUNCTION],
        tags: ['typescript']
      },
      sortBy: 'importance'
    });

    console.log(`Found ${codeResults.length} code-related memories:`);
    codeResults.forEach(result => {
      console.log(`   ${result.memory.metadata.type}: ${result.memory.content.substring(0, 60)}...`);
    });

    // Search with date range filter
    const recentResults = await memoryStore.search('security', {
      limit: 5,
      filters: {
        dateRange: {
          from: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          to: new Date()
        }
      }
    });

    console.log(`Found ${recentResults.length} recent memories about security`);

  } catch (error) {
    console.error('❌ Error in advanced search example:', error);
  }
}

/**
 * Example 3: Memory updates and management
 */
export async function memoryManagementExample(): Promise<void> {
  console.log('\n🔄 Memory Management Example...');

  try {
    const memoryStore = await setupMemorySystem();

    // Create a memory
    const originalMemory: Memory = {
      id: createMemoryId('mgmt'),
      content: 'Original content about React hooks',
      metadata: {
        type: MemoryType.DOCUMENTATION,
        tags: ['react', 'hooks'],
        importance: 1,
        category: 'frontend',
        source: 'documentation'
      },
      created: new Date(),
      updated: new Date()
    };

    await memoryStore.store(originalMemory);
    console.log('✅ Original memory stored');

    // Update the memory
    const updatedMemory: Memory = {
      ...originalMemory,
      content: 'Updated content about React hooks with useState and useEffect examples',
      metadata: {
        ...originalMemory.metadata,
        tags: ['react', 'hooks', 'useState', 'useEffect'],
        importance: 2
      },
      updated: new Date()
    };

    await memoryStore.update(originalMemory.id, updatedMemory);
    console.log('✅ Memory updated');

    // Search to verify update
    const searchResults = await memoryStore.search('React hooks useState', { limit: 1 });
    if (searchResults.length > 0) {
      console.log('✅ Updated memory found in search');
      console.log(`   Content: ${searchResults[0].memory.content}`);
    }

    // Delete the memory
    await memoryStore.delete(originalMemory.id);
    console.log('✅ Memory deleted');

  } catch (error) {
    console.error('❌ Error in memory management example:', error);
  }
}

/**
 * Example 4: Performance testing
 */
export async function performanceExample(): Promise<void> {
  console.log('\n⚡ Performance Testing Example...');

  try {
    const memoryStore = await setupMemorySystem();

    // Create multiple memories for testing
    const testMemories: Memory[] = [];
    for (let i = 0; i < 50; i++) {
      testMemories.push({
        id: createMemoryId('perf'),
        content: `Test memory ${i} about various programming concepts like functions, classes, and algorithms`,
        metadata: {
          type: i % 2 === 0 ? MemoryType.CODE_SNIPPET : MemoryType.DOCUMENTATION,
          tags: [`tag${i % 5}`, 'test', 'performance'],
          importance: Math.random() * 3,
          category: 'test',
          source: 'performance-test'
        },
        created: new Date(),
        updated: new Date()
      });
    }

    // Measure storage time
    const storeStart = Date.now();
    for (const memory of testMemories) {
      await memoryStore.store(memory);
    }
    const storeTime = Date.now() - storeStart;
    console.log(`✅ Stored ${testMemories.length} memories in ${storeTime}ms`);
    console.log(`   Average: ${(storeTime / testMemories.length).toFixed(2)}ms per memory`);

    // Measure search time
    const searchStart = Date.now();
    const results = await memoryStore.search('programming functions algorithms', { limit: 10 });
    const searchTime = Date.now() - searchStart;
    console.log(`✅ Search completed in ${searchTime}ms`);
    console.log(`   Found ${results.length} results`);

    // Get final statistics
    const stats = await memoryStore.getStats();
    console.log(`📊 Final stats: ${stats.totalVectors} memories, ${stats.averageSearchTime.toFixed(2)}ms avg search`);

  } catch (error) {
    console.error('❌ Error in performance example:', error);
  }
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('🎯 Running Task 002 Memory System Examples\n');
  
  await basicMemoryExample();
  await advancedSearchExample();
  await memoryManagementExample();
  await performanceExample();
  
  console.log('\n✅ All examples completed!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

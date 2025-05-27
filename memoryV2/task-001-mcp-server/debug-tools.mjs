/**
 * Debug script to test our tools directly
 */

import { MemoryService } from './dist/src/services/memory-service.js';
import { getMCPToolFactory } from './dist/src/patterns/factory/mcp-tool-factory.js';
import { allToolDefinitions } from './dist/src/patterns/factory/tool-definitions.js';

async function debugTools() {
  try {
    console.log('🔧 Debugging MCP Tools...');

    // Create memory service
    const memoryService = new MemoryService();

    // Create factory
    const factory = getMCPToolFactory(memoryService, {
      enableLogging: false,
      enableValidation: false, // Disable validation for debugging
      enablePerformanceTracking: false,
      enableErrorHandling: true
    });

    // Register tools
    for (const definition of allToolDefinitions) {
      factory.registerTool(definition);
    }

    // Create tools
    const tools = factory.createAllTools();
    console.log(`✅ Created ${tools.length} tools:`, tools.map(t => t.name));

    // Test create_memory tool
    const createTool = tools.find(t => t.name === 'create_memory');
    if (createTool) {
      console.log('\n🧪 Testing create_memory tool...');

      try {
        const result = await createTool.handler({
          content: 'Test memory content',
          type: 'personal'
        });
        console.log('✅ create_memory result:', result);
      } catch (error) {
        console.error('❌ create_memory error:', error.message);
        console.error('Stack:', error.stack);
      }
    }

    // Test get_stats tool
    const statsTool = tools.find(t => t.name === 'get_stats');
    if (statsTool) {
      console.log('\n🧪 Testing get_stats tool...');

      try {
        const result = await statsTool.handler({});
        console.log('✅ get_stats result:', result);
      } catch (error) {
        console.error('❌ get_stats error:', error.message);
        console.error('Stack:', error.stack);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugTools().then(() => {
  console.log('\n🏁 Debug complete');
  process.exit(0);
}).catch(error => {
  console.error('💥 Debug crashed:', error);
  process.exit(1);
});

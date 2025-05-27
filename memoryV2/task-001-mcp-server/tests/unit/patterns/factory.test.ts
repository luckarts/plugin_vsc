/**
 * Tests for Factory Pattern implementation
 */

import { MCPToolFactory, ToolDefinition, ToolContext } from '../../../src/patterns/factory/mcp-tool-factory'
import { MemoryService } from '../../../src/services/memory-service'
import { MemoryType } from '../../../src/types/mcp'

describe('MCPToolFactory', () => {
  let memoryService: MemoryService
  let factory: MCPToolFactory

  beforeEach(() => {
    memoryService = new MemoryService()
    factory = new MCPToolFactory(memoryService)
  })

  afterEach(() => {
    memoryService.clearMemories()
  })

  describe('Tool Registration', () => {
    it('should register a tool definition', () => {
      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ success: true })
      }

      factory.registerTool(toolDef)
      expect(factory.getAvailableTools()).toContain('test_tool')
    })

    it('should create a tool from definition', () => {
      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ success: true })
      }

      factory.registerTool(toolDef)
      const tool = factory.createTool('test_tool')

      expect(tool.name).toBe('test_tool')
      expect(tool.description).toBe('Test tool')
      expect(typeof tool.handler).toBe('function')
    })

    it('should throw error for unknown tool', () => {
      expect(() => {
        factory.createTool('unknown_tool')
      }).toThrow('Tool definition not found: unknown_tool')
    })
  })

  describe('Decorator Application', () => {
    it('should apply decorators based on configuration', () => {
      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ success: true })
      }

      factory.registerTool(toolDef)

      const tool = factory.createTool('test_tool', {
        enableLogging: true,
        enableValidation: true,
        enablePerformanceTracking: true,
        enableErrorHandling: true
      })

      expect(tool.name).toBe('test_tool')
      // Tool should be wrapped with decorators
      expect(typeof tool.handler).toBe('function')
    })

    it('should create tools without decorators when disabled', () => {
      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: async () => ({ success: true })
      }

      factory.registerTool(toolDef)

      const tool = factory.createTool('test_tool', {
        enableLogging: false,
        enableValidation: false,
        enablePerformanceTracking: false,
        enableErrorHandling: false
      })

      expect(tool.name).toBe('test_tool')
    })
  })

  describe('Context Injection', () => {
    it('should inject context into tool handlers', async () => {
      let capturedContext: ToolContext | undefined

      const toolDef: ToolDefinition = {
        name: 'test_tool',
        description: 'Test tool',
        inputSchema: { type: 'object' },
        handler: async (_params: unknown, context: ToolContext) => {
          capturedContext = context
          return { success: true }
        }
      }

      factory.registerTool(toolDef)
      const tool = factory.createTool('test_tool', {
        enableLogging: false,
        enableValidation: false,
        enablePerformanceTracking: false,
        enableErrorHandling: false
      })

      await tool.handler({})

      expect(capturedContext).toBeDefined()
      expect(capturedContext!.memoryService).toBe(memoryService)
      expect(capturedContext!.requestId).toBeDefined()
      expect(capturedContext!.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('Batch Operations', () => {
    it('should create all registered tools', () => {
      const toolDefs: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          inputSchema: { type: 'object' },
          handler: async () => ({ success: true })
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          inputSchema: { type: 'object' },
          handler: async () => ({ success: true })
        }
      ]

      toolDefs.forEach(def => factory.registerTool(def))
      const tools = factory.createAllTools()

      expect(tools).toHaveLength(2)
      expect(tools.map(t => t.name)).toEqual(['tool1', 'tool2'])
    })

    it('should apply same configuration to all tools', () => {
      const toolDefs: ToolDefinition[] = [
        {
          name: 'tool1',
          description: 'Tool 1',
          inputSchema: { type: 'object' },
          handler: async () => ({ success: true })
        },
        {
          name: 'tool2',
          description: 'Tool 2',
          inputSchema: { type: 'object' },
          handler: async () => ({ success: true })
        }
      ]

      toolDefs.forEach(def => factory.registerTool(def))
      const tools = factory.createAllTools({
        enableLogging: true,
        enableValidation: true
      })

      expect(tools).toHaveLength(2)
      // All tools should have decorators applied
      tools.forEach(tool => {
        expect(typeof tool.handler).toBe('function')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle tool execution errors gracefully', async () => {
      const toolDef: ToolDefinition = {
        name: 'failing_tool',
        description: 'Tool that fails',
        inputSchema: { type: 'object' },
        handler: async () => {
          throw new Error('Tool execution failed')
        }
      }

      factory.registerTool(toolDef)
      const tool = factory.createTool('failing_tool', {
        enableErrorHandling: true,
        enableLogging: false,
        enableValidation: false,
        enablePerformanceTracking: false
      })

      await expect(tool.handler({})).rejects.toThrow('Internal error in tool: failing_tool')
    })
  })

  describe('Memory Integration', () => {
    it('should integrate with memory service through context', async () => {
      const toolDef: ToolDefinition = {
        name: 'memory_tool',
        description: 'Tool that uses memory service',
        inputSchema: { type: 'object' },
        handler: async (_params: unknown, context: ToolContext) => {
          const memoryId = await context.memoryService.createMemory({
            content: 'Test memory',
            type: MemoryType.PERSONAL
          })
          return { memoryId }
        }
      }

      factory.registerTool(toolDef)
      const tool = factory.createTool('memory_tool', {
        enableLogging: false,
        enableValidation: false,
        enablePerformanceTracking: false,
        enableErrorHandling: false
      })

      const result = await tool.handler({}) as { memoryId: string }

      expect(result.memoryId).toBeDefined()
      expect(typeof result.memoryId).toBe('string')

      // Verify memory was created
      const memory = await memoryService.getMemory(result.memoryId)
      expect(memory).toBeDefined()
      expect(memory!.content).toBe('Test memory')
    })
  })
})

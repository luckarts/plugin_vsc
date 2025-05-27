/**
 * Unit tests for create_memory tool
 * Following TDD methodology
 */

import { createCreateMemoryTool } from '../../../src/mcp/tools/create-memory'
import { MemoryService } from '../../../src/services/memory-service'
import { MemoryType, ValidationError } from '../../../src/types/mcp'

describe('create_memory tool', () => {
  let memoryService: MemoryService
  let createMemoryTool: any

  beforeEach(() => {
    memoryService = new MemoryService()
    createMemoryTool = createCreateMemoryTool(memoryService)
  })

  afterEach(() => {
    memoryService.clearMemories()
  })

  describe('Tool Definition', () => {
    it('should have correct tool metadata', () => {
      expect(createMemoryTool.name).toBe('create_memory')
      expect(createMemoryTool.description).toBeTruthy()
      expect(createMemoryTool.inputSchema).toBeDefined()
      expect(typeof createMemoryTool.handler).toBe('function')
    })

    it('should have valid JSON schema', () => {
      const schema = createMemoryTool.inputSchema

      expect(schema.type).toBe('object')
      expect(schema.properties).toBeDefined()
      expect(schema.properties.content).toBeDefined()
      expect(schema.required).toContain('content')
    })
  })

  describe('Valid Parameters', () => {
    it('should create a memory with minimal parameters', async () => {
      const params = {
        content: 'Test memory content'
      }

      const result = await createMemoryTool.handler(params)

      expect(result.memory_id).toBeDefined()
      expect(result.status).toBe('created')
      expect(typeof result.memory_id).toBe('string')
    })

    it('should create a memory with all parameters', async () => {
      const params = {
        content: 'Test memory content with metadata',
        type: 'repository',
        tags: ['test', 'example'],
        metadata: {
          project: 'test-project',
          language: 'typescript',
          importance: 8,
          category: 'testing',
          source: 'unit-test'
        }
      }

      const result = await createMemoryTool.handler(params)

      expect(result.memory_id).toBeDefined()
      expect(result.status).toBe('created')

      // Verify the memory was actually created
      const memory = await memoryService.getMemory(result.memory_id)
      expect(memory).toBeTruthy()
      expect(memory!.content).toBe(params.content)
      expect(memory!.type).toBe(MemoryType.REPOSITORY)
      expect(memory!.metadata.tags).toEqual(params.tags)
    })

    it('should use default values for optional parameters', async () => {
      const params = {
        content: 'Test memory with defaults'
      }

      const result = await createMemoryTool.handler(params)
      const memory = await memoryService.getMemory(result.memory_id)

      expect(memory!.type).toBe(MemoryType.PERSONAL) // default type
      expect(memory!.metadata.tags).toEqual([]) // default empty tags
    })
  })

  describe('Invalid Parameters', () => {
    it('should reject empty content', async () => {
      const params = {
        content: ''
      }

      await expect(createMemoryTool.handler(params))
        .rejects.toThrow(ValidationError)
    })

    it('should reject missing content', async () => {
      const params = {
        type: 'personal'
      }

      await expect(createMemoryTool.handler(params))
        .rejects.toThrow(ValidationError)
    })

    it('should reject invalid memory type', async () => {
      const params = {
        content: 'Test content',
        type: 'invalid_type'
      }

      await expect(createMemoryTool.handler(params))
        .rejects.toThrow(ValidationError)
    })

    it('should reject content that is too long', async () => {
      const params = {
        content: 'x'.repeat(100001) // Exceeds max length
      }

      await expect(createMemoryTool.handler(params))
        .rejects.toThrow(ValidationError)
    })

    it('should reject invalid tags format', async () => {
      const params = {
        content: 'Test content',
        tags: 'not-an-array'
      }

      await expect(createMemoryTool.handler(params))
        .rejects.toThrow(ValidationError)
    })
  })

  describe('Memory Creation', () => {
    it('should generate unique IDs for different memories', async () => {
      const params1 = { content: 'First memory' }
      const params2 = { content: 'Second memory' }

      const result1 = await createMemoryTool.handler(params1)
      const result2 = await createMemoryTool.handler(params2)

      expect(result1.memory_id).not.toBe(result2.memory_id)
    })

    it('should set correct timestamps', async () => {
      const beforeCreate = new Date()

      const params = { content: 'Timestamp test' }
      const result = await createMemoryTool.handler(params)

      const afterCreate = new Date()
      const memory = await memoryService.getMemory(result.memory_id)

      expect(memory!.created.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime())
      expect(memory!.created.getTime()).toBeLessThanOrEqual(afterCreate.getTime())
      expect(memory!.updated).toEqual(memory!.created)
      // accessed is updated by getMemory(), so it will be >= created
      expect(memory!.accessed.getTime()).toBeGreaterThanOrEqual(memory!.created.getTime())
    })

    it('should initialize access count to 0', async () => {
      const params = { content: 'Access count test' }
      const result = await createMemoryTool.handler(params)

      const memory = await memoryService.getMemory(result.memory_id)
      // After getMemory(), accessCount becomes 1 (it was 0 initially)
      expect(memory!.accessCount).toBe(1)
    })

    it('should set compression flag to false initially', async () => {
      const params = { content: 'Compression test' }
      const result = await createMemoryTool.handler(params)

      const memory = await memoryService.getMemory(result.memory_id)
      expect(memory!.compressed).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock a service error
      jest.spyOn(memoryService, 'createMemory').mockRejectedValue(new Error('Service error'))

      const params = { content: 'Test content' }

      await expect(createMemoryTool.handler(params))
        .rejects.toThrow('Service error')
    })

    it('should preserve validation error details', async () => {
      const params = {
        content: '',
        invalidField: 'should not be here'
      }

      try {
        await createMemoryTool.handler(params)
        fail('Should have thrown validation error')
      } catch (error: any) {
        expect(error).toBeInstanceOf(ValidationError)
        expect(error.data).toBeDefined()
        expect(error.data.params).toBeDefined()
      }
    })
  })
})

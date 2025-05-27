/**
 * Integration tests for MCP client communication
 * Tests the full MCP protocol flow
 */

import { MCPServer } from '../../src/mcp/server'
import { MemoryService } from '../../src/services/memory-service'
import { loadTestConfig } from '../../src/config'
import { initializeLogger } from '../../src/logging/logger'

describe('MCP Client Integration', () => {
  let mcpServer: MCPServer
  let memoryService: MemoryService
  let testConfig: any
  let serverUrl: string

  beforeAll(async () => {
    testConfig = loadTestConfig()
    initializeLogger(testConfig.logging)
    
    memoryService = new MemoryService()
    mcpServer = new MCPServer(testConfig, memoryService)
    
    await mcpServer.start()
    serverUrl = `http://localhost:${mcpServer.getPort()}`
  })

  afterAll(async () => {
    await mcpServer.stop()
  })

  beforeEach(() => {
    memoryService.clearMemories()
  })

  describe('MCP Protocol Compliance', () => {
    it('should respond to tools/list request', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      }
      
      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      
      const data = await response.json() as any
      
      expect(response.status).toBe(200)
      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toBeDefined()
      expect(data.result.tools).toHaveLength(6)
      expect(data.id).toBe(1)
    })

    it('should handle tools/call requests', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_memory',
          arguments: {
            content: 'Integration test memory'
          }
        },
        id: 2
      }
      
      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      
      const data = await response.json() as any
      
      expect(response.status).toBe(200)
      expect(data.jsonrpc).toBe('2.0')
      expect(data.result).toBeDefined()
      expect(data.result.memory_id).toBeDefined()
      expect(data.result.status).toBe('created')
      expect(data.id).toBe(2)
    })

    it('should return errors in MCP format', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'unknown_method',
        id: 3
      }
      
      const response = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })
      
      const data = await response.json() as any
      
      expect(response.status).toBe(400)
      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBeDefined()
      expect(data.error.message).toBeDefined()
      expect(data.id).toBe(3)
    })
  })

  describe('Memory Operations Flow', () => {
    it('should create and retrieve a memory', async () => {
      // Create memory
      const createRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_memory',
          arguments: {
            content: 'Integration test memory',
            type: 'session',
            tags: ['integration', 'test']
          }
        },
        id: 1
      }
      
      const createResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequest)
      })
      
      const createData = await createResponse.json() as any
      expect(createData.result.memory_id).toBeDefined()
      
      const memoryId = createData.result.memory_id
      
      // Retrieve memory
      const getRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_memory',
          arguments: {
            memory_id: memoryId
          }
        },
        id: 2
      }
      
      const getResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getRequest)
      })
      
      const getData = await getResponse.json() as any
      
      expect(getData.result.memory).toBeDefined()
      expect(getData.result.memory.content).toBe('Integration test memory')
      expect(getData.result.memory.type).toBe('session')
      expect(getData.result.memory.metadata.tags).toEqual(['integration', 'test'])
      expect(getData.result.status).toBe('found')
    })

    it('should search memories', async () => {
      // Create multiple memories
      const memories = [
        { content: 'TypeScript best practices', tags: ['typescript', 'coding'] },
        { content: 'React component patterns', tags: ['react', 'frontend'] },
        { content: 'Database optimization tips', tags: ['database', 'performance'] }
      ]
      
      for (const memory of memories) {
        const createRequest = {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'create_memory',
            arguments: memory
          },
          id: Math.random()
        }
        
        await fetch(`${serverUrl}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createRequest)
        })
      }
      
      // Search for TypeScript memories
      const searchRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'search_memories',
          arguments: {
            query: 'TypeScript',
            limit: 10
          }
        },
        id: 4
      }
      
      const searchResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchRequest)
      })
      
      const searchData = await searchResponse.json() as any
      
      expect(searchData.result.memories).toBeDefined()
      expect(searchData.result.memories.length).toBeGreaterThan(0)
      expect(searchData.result.total).toBeGreaterThan(0)
      expect(searchData.result.queryTime).toBeDefined()
      
      // Check that the TypeScript memory is in results
      const foundMemory = searchData.result.memories.find((m: any) => 
        m.memory.content.includes('TypeScript')
      )
      expect(foundMemory).toBeDefined()
    })

    it('should update and delete memories', async () => {
      // Create memory
      const createRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_memory',
          arguments: {
            content: 'Original content'
          }
        },
        id: 1
      }
      
      const createResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createRequest)
      })
      
      const createData = await createResponse.json() as any
      const memoryId = createData.result.memory_id
      
      // Update memory
      const updateRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'update_memory',
          arguments: {
            memory_id: memoryId,
            content: 'Updated content',
            tags: ['updated']
          }
        },
        id: 2
      }
      
      const updateResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateRequest)
      })
      
      const updateData = await updateResponse.json() as any
      expect(updateData.result.status).toBe('updated')
      expect(updateData.result.updatedFields).toContain('content')
      expect(updateData.result.updatedFields).toContain('tags')
      
      // Delete memory
      const deleteRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'delete_memory',
          arguments: {
            memory_id: memoryId
          }
        },
        id: 3
      }
      
      const deleteResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deleteRequest)
      })
      
      const deleteData = await deleteResponse.json() as any
      expect(deleteData.result.status).toBe('deleted')
      
      // Verify memory is gone
      const getRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_memory',
          arguments: {
            memory_id: memoryId
          }
        },
        id: 4
      }
      
      const getResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getRequest)
      })
      
      const getData = await getResponse.json() as any
      expect(getData.result.status).toBe('not_found')
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide system statistics', async () => {
      // Create some test memories
      for (let i = 0; i < 5; i++) {
        const createRequest = {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: 'create_memory',
            arguments: {
              content: `Test memory ${i}`,
              type: i % 2 === 0 ? 'personal' : 'repository'
            }
          },
          id: i
        }
        
        await fetch(`${serverUrl}/mcp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createRequest)
        })
      }
      
      // Get statistics
      const statsRequest = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_stats',
          arguments: {
            includeDetails: true
          }
        },
        id: 10
      }
      
      const statsResponse = await fetch(`${serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statsRequest)
      })
      
      const statsData = await statsResponse.json() as any
      
      expect(statsData.result.total).toBe(5)
      expect(statsData.result.byType).toBeDefined()
      expect(statsData.result.byType.personal).toBeGreaterThan(0)
      expect(statsData.result.byType.repository).toBeGreaterThan(0)
      expect(statsData.result.storage).toBeDefined()
      expect(statsData.result.performance).toBeDefined()
    })
  })
})

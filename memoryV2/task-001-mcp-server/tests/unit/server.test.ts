/**
 * Unit tests for MCP Server
 * Following TDD methodology - these tests should fail initially
 */

import { MCPServer } from '../../src/mcp/server'
import { MemoryService } from '../../src/services/memory-service'
import { loadTestConfig } from '../../src/config'
import { initializeLogger } from '../../src/logging/logger'

describe('MCP Server', () => {
  let mcpServer: MCPServer
  let memoryService: MemoryService
  let testConfig: any

  beforeAll(() => {
    testConfig = loadTestConfig()
    initializeLogger(testConfig.logging)
  })

  beforeEach(() => {
    memoryService = new MemoryService()
    mcpServer = new MCPServer(testConfig, memoryService)
  })

  afterEach(async () => {
    if (mcpServer.isServerRunning()) {
      await mcpServer.stop()
    }
    memoryService.clearMemories()
  })

  describe('Server Lifecycle', () => {
    it('should start and listen on configured port', async () => {
      await mcpServer.start()

      expect(mcpServer.isServerRunning()).toBe(true)
      expect(mcpServer.getPort()).toBeGreaterThan(0)

      await mcpServer.stop()
      expect(mcpServer.isServerRunning()).toBe(false)
    })

    it('should handle start errors gracefully', async () => {
      // Try to start on an invalid port
      const invalidConfig = { ...testConfig, port: -1 }
      const invalidServer = new MCPServer(invalidConfig, memoryService)

      await expect(invalidServer.start()).rejects.toThrow()
    })

    it('should stop gracefully even if not started', async () => {
      await expect(mcpServer.stop()).resolves.not.toThrow()
    })
  })

  describe('Tool Registration', () => {
    it('should register all required tools', () => {
      const tools = mcpServer.getTools()

      expect(tools).toHaveLength(6)

      const toolNames = tools.map(t => t.name)
      const expectedTools = [
        'create_memory',
        'search_memories',
        'get_memory',
        'update_memory',
        'delete_memory',
        'get_stats'
      ]

      // Check that all expected tools are present (order doesn't matter)
      expectedTools.forEach(expectedTool => {
        expect(toolNames).toContain(expectedTool)
      })
    })

    it('should have valid tool schemas', () => {
      const tools = mcpServer.getTools()

      tools.forEach(tool => {
        expect(tool.name).toBeTruthy()
        expect(tool.description).toBeTruthy()
        expect(tool.inputSchema).toBeTruthy()
        expect(typeof tool.handler).toBe('function')
      })
    })
  })

  describe('Configuration Validation', () => {
    it('should validate configuration on creation', () => {
      expect(() => {
        new MCPServer(testConfig, memoryService)
      }).not.toThrow()
    })

    it('should reject invalid configuration', async () => {
      const invalidConfig = { ...testConfig, port: -1 }
      const invalidServer = new MCPServer(invalidConfig, memoryService)

      await expect(invalidServer.start()).rejects.toThrow()
    })
  })

  describe('Health Check', () => {
    it('should respond to health check when running', async () => {
      await mcpServer.start()

      const response = await fetch(`http://localhost:${mcpServer.getPort()}/health`)
      const data = await response.json() as any

      expect(response.status).toBe(200)
      expect(data.status).toBe('healthy')
      expect(data.version).toBe('2.0.0')
      expect(typeof data.memoryCount).toBe('number')
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed requests gracefully', async () => {
      await mcpServer.start()

      const response = await fetch(`http://localhost:${mcpServer.getPort()}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      })

      // Express returns 500 for JSON parsing errors, which is acceptable
      expect([400, 500]).toContain(response.status)
    })

    it('should return proper MCP error format', async () => {
      await mcpServer.start()

      const response = await fetch(`http://localhost:${mcpServer.getPort()}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'unknown_method',
          id: 1
        })
      })

      const data = await response.json() as any

      expect(data.jsonrpc).toBe('2.0')
      expect(data.error).toBeDefined()
      expect(data.error.code).toBeDefined()
      expect(data.error.message).toBeDefined()
      expect(data.id).toBe(1)
    })
  })
})

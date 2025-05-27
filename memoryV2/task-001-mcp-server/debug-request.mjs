#!/usr/bin/env node

/**
 * Debug script to test MCP requests directly
 */

import { MCPServer } from './dist/src/mcp/server.js'
import { MemoryService } from './dist/src/services/memory-service.js'
import { loadTestConfig } from './dist/src/config/index.js'
import { initializeLogger } from './dist/src/logging/logger.js'

async function testMCPRequest() {
  console.log('🚀 Starting MCP Server debug test...')

  try {
    // Initialize
    const testConfig = loadTestConfig()
    initializeLogger(testConfig.logging)

    const memoryService = new MemoryService()
    const mcpServer = new MCPServer(testConfig, memoryService)

    // Start server
    await mcpServer.start()
    const port = mcpServer.getPort()
    console.log(`✅ Server started on port ${port}`)

    // Test tools/list
    console.log('\n📋 Testing tools/list...')
    const listResponse = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1
      })
    })

    const listData = await listResponse.json()
    console.log('Status:', listResponse.status)
    console.log('Response:', JSON.stringify(listData, null, 2))

    // Test create_memory
    console.log('\n🧠 Testing create_memory...')
    const createResponse = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'create_memory',
          arguments: {
            content: 'Debug test memory'
          }
        },
        id: 2
      })
    })

    const createData = await createResponse.json()
    console.log('Status:', createResponse.status)
    console.log('Response:', JSON.stringify(createData, null, 2))

    const memoryId = createData.result.memory_id

    // Test delete_memory
    console.log('\n🗑️ Testing delete_memory...')
    const deleteResponse = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'delete_memory',
          arguments: {
            memory_id: memoryId
          }
        },
        id: 3
      })
    })

    const deleteData = await deleteResponse.json()
    console.log('Status:', deleteResponse.status)
    console.log('Response:', JSON.stringify(deleteData, null, 2))

    // Check memory count after deletion
    console.log('\n📊 Checking memory count after deletion...')
    const memoryCount = memoryService.getMemoryCount()
    console.log('Memory count:', memoryCount)

    // Test get_memory after deletion
    console.log('\n🔍 Testing get_memory after deletion...')
    const getResponse = await fetch(`http://localhost:${port}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'get_memory',
          arguments: {
            memory_id: memoryId
          }
        },
        id: 4
      })
    })

    const getData = await getResponse.json()
    console.log('Status:', getResponse.status)
    console.log('Response:', JSON.stringify(getData, null, 2))

    // Stop server
    await mcpServer.stop()
    console.log('\n✅ Server stopped')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

testMCPRequest()

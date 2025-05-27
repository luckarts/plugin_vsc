/**
 * MCP Tools registry
 * Exports all available MCP tools for the memory system
 */

import { MCPTool } from '../../types/mcp'
import { MemoryService } from '../../services/memory-service'
import { createCreateMemoryTool } from './create-memory'
import { createSearchMemoriesTool } from './search-memories'
import { createGetMemoryTool } from './get-memory'
import { createUpdateMemoryTool } from './update-memory'
import { createDeleteMemoryTool } from './delete-memory'
import { createGetStatsTool } from './get-stats'

/**
 * Create all MCP tools with the provided memory service
 */
export function createMCPTools(memoryService: MemoryService): MCPTool[] {
  return [
    createCreateMemoryTool(memoryService),
    createSearchMemoriesTool(memoryService),
    createGetMemoryTool(memoryService),
    createUpdateMemoryTool(memoryService),
    createDeleteMemoryTool(memoryService),
    createGetStatsTool(memoryService)
  ]
}

/**
 * Get tool by name
 */
export function getToolByName(tools: MCPTool[], name: string): MCPTool | undefined {
  return tools.find(tool => tool.name === name)
}

/**
 * Get all tool names
 */
export function getToolNames(tools: MCPTool[]): string[] {
  return tools.map(tool => tool.name)
}

/**
 * Validate that all required tools are present
 */
export function validateTools(tools: MCPTool[]): boolean {
  const requiredTools = [
    'create_memory',
    'search_memories',
    'get_memory',
    'update_memory',
    'delete_memory',
    'get_stats'
  ]
  
  const toolNames = getToolNames(tools)
  
  for (const requiredTool of requiredTools) {
    if (!toolNames.includes(requiredTool)) {
      throw new Error(`Required tool missing: ${requiredTool}`)
    }
  }
  
  return true
}

/**
 * Get tools metadata for MCP discovery
 */
export function getToolsMetadata(tools: MCPTool[]) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema
  }))
}

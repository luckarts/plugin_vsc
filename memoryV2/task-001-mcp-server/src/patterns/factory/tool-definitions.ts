/**
 * Tool Definitions: Centralized definitions for all MCP tools
 */

import { ToolDefinition, ToolContext } from './mcp-tool-factory'
import {
  CreateMemoryResult,
  UpdateMemoryResult,
  DeleteMemoryResult,
  SearchResultMemory,
  MemoryStatsResult,
  ValidationError,
  NotFoundError
} from '../../types/mcp'
import {
  validateCreateMemoryParams,
  validateUpdateMemoryParams,
  validateDeleteMemoryParams,
  validateSearchMemoriesParams,
  getCreateMemoryJsonSchema,
  getUpdateMemoryJsonSchema,
  getDeleteMemoryJsonSchema,
  getSearchMemoriesJsonSchema,
  getGetMemoryJsonSchema,
  getGetStatsJsonSchema
} from '../../validation/schemas'
import { CommandFactory } from '../command/mcp-command'

/**
 * Create Memory Tool Definition
 */
export const createMemoryToolDefinition: ToolDefinition = {
  name: 'create_memory',
  description: 'Create a new memory with content, type, tags, and metadata',
  inputSchema: getCreateMemoryJsonSchema(),

  async handler(params: unknown, context: ToolContext): Promise<CreateMemoryResult> {
    // Validate parameters
    const validatedParams = validateCreateMemoryParams(params)

    // Create and execute command
    const command = CommandFactory.createCommand('create_memory', validatedParams, {
      memoryService: context.memoryService,
      requestId: context.requestId,
      userId: context.metadata?.userId as string,
      sessionId: context.metadata?.sessionId as string
    })

    const result = await command.execute()
    return result as CreateMemoryResult
  }
}

/**
 * Update Memory Tool Definition
 */
export const updateMemoryToolDefinition: ToolDefinition = {
  name: 'update_memory',
  description: 'Update an existing memory with new content, tags, or metadata',
  inputSchema: getUpdateMemoryJsonSchema(),

  async handler(params: unknown, context: ToolContext): Promise<UpdateMemoryResult> {
    const validatedParams = validateUpdateMemoryParams(params)

    // Check if memory exists
    const existingMemory = await context.memoryService.getMemory(validatedParams.memory_id)
    if (!existingMemory) {
      throw new NotFoundError(`Memory not found: ${validatedParams.memory_id}`)
    }

    const command = CommandFactory.createCommand('update_memory', validatedParams, {
      memoryService: context.memoryService,
      requestId: context.requestId,
      userId: context.metadata?.userId as string,
      sessionId: context.metadata?.sessionId as string
    })

    const result = await command.execute()
    return result as UpdateMemoryResult
  }
}

/**
 * Delete Memory Tool Definition
 */
export const deleteMemoryToolDefinition: ToolDefinition = {
  name: 'delete_memory',
  description: 'Delete a memory by its ID',
  inputSchema: getDeleteMemoryJsonSchema(),

  async handler(params: unknown, context: ToolContext): Promise<DeleteMemoryResult> {
    const validatedParams = validateDeleteMemoryParams(params)

    // Check if memory exists
    const existingMemory = await context.memoryService.getMemory(validatedParams.memory_id)
    if (!existingMemory) {
      throw new NotFoundError(`Memory not found: ${validatedParams.memory_id}`)
    }

    const command = CommandFactory.createCommand('delete_memory', validatedParams, {
      memoryService: context.memoryService,
      requestId: context.requestId,
      userId: context.metadata?.userId as string,
      sessionId: context.metadata?.sessionId as string
    })

    const result = await command.execute()
    return result as DeleteMemoryResult
  }
}

/**
 * Search Memories Tool Definition
 */
export const searchMemoriesToolDefinition: ToolDefinition = {
  name: 'search_memories',
  description: 'Search memories using text query with optional filters',
  inputSchema: getSearchMemoriesJsonSchema(),

  async handler(params: unknown, context: ToolContext): Promise<{ memories: SearchResultMemory[] }> {
    const validatedParams = validateSearchMemoriesParams(params)

    const command = CommandFactory.createCommand('search_memories', validatedParams, {
      memoryService: context.memoryService,
      requestId: context.requestId,
      userId: context.metadata?.userId as string,
      sessionId: context.metadata?.sessionId as string
    })

    const result = await command.execute()
    return result as { memories: SearchResultMemory[] }
  }
}

/**
 * Get Memory Tool Definition
 */
export const getMemoryToolDefinition: ToolDefinition = {
  name: 'get_memory',
  description: 'Retrieve a specific memory by its ID',
  inputSchema: getGetMemoryJsonSchema(),

  async handler(params: unknown, context: ToolContext): Promise<{ memory: any }> {
    const validatedParams = params as { memory_id: string }

    if (!validatedParams.memory_id || typeof validatedParams.memory_id !== 'string') {
      throw new ValidationError('memory_id is required and must be a string')
    }

    const command = CommandFactory.createCommand('get_memory', validatedParams, {
      memoryService: context.memoryService,
      requestId: context.requestId,
      userId: context.metadata?.userId as string,
      sessionId: context.metadata?.sessionId as string
    })

    const result = await command.execute()
    return result as { memory: any }
  }
}

/**
 * Get Stats Tool Definition
 */
export const getStatsToolDefinition: ToolDefinition = {
  name: 'get_stats',
  description: 'Get statistics about the memory system',
  inputSchema: getGetStatsJsonSchema(),

  async handler(params: unknown, context: ToolContext): Promise<MemoryStatsResult> {
    // Provide default params for stats
    const statsParams = params || { includeDetails: false }

    const command = CommandFactory.createCommand('get_stats', statsParams, {
      memoryService: context.memoryService,
      requestId: context.requestId,
      userId: context.metadata?.userId as string,
      sessionId: context.metadata?.sessionId as string
    })

    const result = await command.execute()
    return result as MemoryStatsResult
  }
}

/**
 * All tool definitions registry
 */
export const allToolDefinitions: ToolDefinition[] = [
  createMemoryToolDefinition,
  updateMemoryToolDefinition,
  deleteMemoryToolDefinition,
  searchMemoriesToolDefinition,
  getMemoryToolDefinition,
  getStatsToolDefinition
]

/**
 * Get tool definition by name
 */
export function getToolDefinition(name: string): ToolDefinition | undefined {
  return allToolDefinitions.find(def => def.name === name)
}

/**
 * Get all tool names
 */
export function getAllToolNames(): string[] {
  return allToolDefinitions.map(def => def.name)
}

/**
 * Validate that all required tools are defined
 */
export function validateAllToolsPresent(): boolean {
  const requiredTools = [
    'create_memory',
    'update_memory',
    'delete_memory',
    'search_memories',
    'get_memory',
    'get_stats'
  ]

  const definedTools = getAllToolNames()

  for (const requiredTool of requiredTools) {
    if (!definedTools.includes(requiredTool)) {
      throw new Error(`Required tool definition missing: ${requiredTool}`)
    }
  }

  return true
}

/**
 * MCP Tool: search_memories
 * Search for memories using query, filters, and parameters
 */

import { MCPTool, SearchMemoriesResult, ValidationError } from '../../types/mcp'
import { validateSearchMemoriesParams, getSearchMemoriesJsonSchema } from '../../validation/schemas'
import { MemoryService } from '../../services/memory-service'
import { logMCPOperation } from '../../logging/logger'

export function createSearchMemoriesTool(memoryService: MemoryService): MCPTool {
  return {
    name: 'search_memories',
    description: 'Search for memories using text query with optional filters',
    inputSchema: getSearchMemoriesJsonSchema(),

    async handler(params: unknown): Promise<SearchMemoriesResult> {
      const start = Date.now()
      let validatedParams

      try {
        // Validate input parameters
        validatedParams = validateSearchMemoriesParams(params)

        // Search memories using the memory service
        const searchResults = await memoryService.searchMemories({
          ...validatedParams,
          type: validatedParams.type as any // Type conversion for flexibility
        })

        const result: SearchMemoriesResult = {
          memories: searchResults,
          total: searchResults.length,
          queryTime: Date.now() - start
        }

        const duration = Date.now() - start
        logMCPOperation('search_memories', validatedParams, result, undefined, duration)

        return result

      } catch (error) {
        const duration = Date.now() - start

        if (error instanceof Error && error.name === 'ZodError') {
          const validationError = new ValidationError(
            'Invalid parameters for search_memories',
            {
              originalError: error.message,
              params
            }
          )
          logMCPOperation('search_memories', params as object, undefined, validationError, duration)
          throw validationError
        }

        logMCPOperation('search_memories', (validatedParams || params) as object, undefined, error as Error, duration)
        throw error
      }
    }
  }
}

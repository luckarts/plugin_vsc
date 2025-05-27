/**
 * MCP Tool: get_memory
 * Retrieve a specific memory by its ID
 */

import { MCPTool, GetMemoryResult, ValidationError } from '../../types/mcp'
import { validateGetMemoryParams, getGetMemoryJsonSchema } from '../../validation/schemas'
import { MemoryService } from '../../services/memory-service'
import { logMCPOperation } from '../../logging/logger'

export function createGetMemoryTool(memoryService: MemoryService): MCPTool {
  return {
    name: 'get_memory',
    description: 'Retrieve a specific memory by its unique identifier',
    inputSchema: getGetMemoryJsonSchema(),

    async handler(params: unknown): Promise<GetMemoryResult> {
      const start = Date.now()
      let validatedParams

      try {
        // Validate input parameters
        validatedParams = validateGetMemoryParams(params)

        // Get the memory using the memory service
        const memory = await memoryService.getMemory(validatedParams.memory_id)

        const result: GetMemoryResult = {
          memory,
          status: memory ? 'found' : 'not_found'
        }

        const duration = Date.now() - start
        logMCPOperation('get_memory', validatedParams, result, undefined, duration)

        return result

      } catch (error) {
        const duration = Date.now() - start

        if (error instanceof Error && error.name === 'ZodError') {
          const validationError = new ValidationError(
            'Invalid parameters for get_memory',
            {
              originalError: error.message,
              params
            }
          )
          logMCPOperation('get_memory', params as object, undefined, validationError, duration)
          throw validationError
        }

        logMCPOperation('get_memory', (validatedParams || params) as object, undefined, error as Error, duration)
        throw error
      }
    }
  }
}

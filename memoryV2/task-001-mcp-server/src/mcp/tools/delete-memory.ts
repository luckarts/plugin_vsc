/**
 * MCP Tool: delete_memory
 * Delete a memory by its ID
 */

import { MCPTool, DeleteMemoryResult, ValidationError } from '../../types/mcp'
import { validateDeleteMemoryParams, getDeleteMemoryJsonSchema } from '../../validation/schemas'
import { MemoryService } from '../../services/memory-service'
import { logMCPOperation } from '../../logging/logger'

export function createDeleteMemoryTool(memoryService: MemoryService): MCPTool {
  return {
    name: 'delete_memory',
    description: 'Delete a memory by its unique identifier',
    inputSchema: getDeleteMemoryJsonSchema(),

    async handler(params: unknown): Promise<DeleteMemoryResult> {
      const start = Date.now()
      let validatedParams

      try {
        // Validate input parameters
        validatedParams = validateDeleteMemoryParams(params)

        // Delete the memory using the memory service
        const deleted = await memoryService.deleteMemory(validatedParams.memory_id)

        const result: DeleteMemoryResult = {
          status: deleted ? 'deleted' : 'not_found'
        }

        const duration = Date.now() - start
        logMCPOperation('delete_memory', validatedParams, result, undefined, duration)

        return result

      } catch (error) {
        const duration = Date.now() - start

        if (error instanceof Error && error.name === 'ZodError') {
          const validationError = new ValidationError(
            'Invalid parameters for delete_memory',
            {
              originalError: error.message,
              params
            }
          )
          logMCPOperation('delete_memory', params as object, undefined, validationError, duration)
          throw validationError
        }

        logMCPOperation('delete_memory', (validatedParams || params) as object, undefined, error as Error, duration)
        throw error
      }
    }
  }
}

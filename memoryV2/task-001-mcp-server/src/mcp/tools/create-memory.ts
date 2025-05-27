/**
 * MCP Tool: create_memory
 * Creates a new memory with the provided content and metadata
 */

import { MCPTool, CreateMemoryResult, ValidationError } from '../../types/mcp'
import { validateCreateMemoryParams, getCreateMemoryJsonSchema } from '../../validation/schemas'
import { MemoryService } from '../../services/memory-service'
import { logMCPOperation } from '../../logging/logger'

export function createCreateMemoryTool(memoryService: MemoryService): MCPTool {
  return {
    name: 'create_memory',
    description: 'Create a new memory with content, type, tags, and metadata',
    inputSchema: getCreateMemoryJsonSchema(),

    async handler(params: unknown): Promise<CreateMemoryResult> {
      const start = Date.now()
      let validatedParams

      try {
        // Validate input parameters
        validatedParams = validateCreateMemoryParams(params)

        // Create the memory using the memory service
        const memoryId = await memoryService.createMemory({
          ...validatedParams,
          type: validatedParams.type as any // Type conversion for flexibility
        })

        const result: CreateMemoryResult = {
          memory_id: memoryId,
          status: 'created'
        }

        const duration = Date.now() - start
        logMCPOperation('create_memory', validatedParams, result, undefined, duration)

        return result

      } catch (error) {
        const duration = Date.now() - start

        if (error instanceof Error && error.name === 'ZodError') {
          const validationError = new ValidationError(
            'Invalid parameters for create_memory',
            {
              originalError: error.message,
              params
            }
          )
          logMCPOperation('create_memory', params as object, undefined, validationError, duration)
          throw validationError
        }

        logMCPOperation('create_memory', (validatedParams || params) as object, undefined, error as Error, duration)
        throw error
      }
    }
  }
}

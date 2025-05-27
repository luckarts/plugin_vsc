/**
 * MCP Tool: update_memory
 * Update an existing memory's content, tags, or metadata
 */

import { MCPTool, UpdateMemoryResult, ValidationError, NotFoundError } from '../../types/mcp'
import { validateUpdateMemoryParams, getUpdateMemoryJsonSchema } from '../../validation/schemas'
import { MemoryService } from '../../services/memory-service'
import { logMCPOperation } from '../../logging/logger'

export function createUpdateMemoryTool(memoryService: MemoryService): MCPTool {
  return {
    name: 'update_memory',
    description: 'Update an existing memory with new content, tags, or metadata',
    inputSchema: getUpdateMemoryJsonSchema(),

    async handler(params: unknown): Promise<UpdateMemoryResult> {
      const start = Date.now()
      let validatedParams

      try {
        // Validate input parameters
        validatedParams = validateUpdateMemoryParams(params)

        // Update the memory using the memory service
        const updatedFields = await memoryService.updateMemory({
          memory_id: validatedParams.memory_id,
          content: validatedParams.content,
          tags: validatedParams.tags,
          metadata: validatedParams.metadata
        })

        const result: UpdateMemoryResult = {
          status: 'updated',
          updatedFields
        }

        const duration = Date.now() - start
        logMCPOperation('update_memory', validatedParams, result, undefined, duration)

        return result

      } catch (error) {
        const duration = Date.now() - start

        if (error instanceof Error && error.name === 'ZodError') {
          const validationError = new ValidationError(
            'Invalid parameters for update_memory',
            {
              originalError: error.message,
              params
            }
          )
          logMCPOperation('update_memory', params as object, undefined, validationError, duration)
          throw validationError
        }

        // Check if it's a "not found" error
        if (error instanceof Error && error.message.includes('not found')) {
          const notFoundError = new NotFoundError(`Memory not found: ${validatedParams?.memory_id}`)
          logMCPOperation('update_memory', (validatedParams || params) as object, undefined, notFoundError, duration)

          return {
            status: 'not_found'
          }
        }

        logMCPOperation('update_memory', (validatedParams || params) as object, undefined, error as Error, duration)
        throw error
      }
    }
  }
}

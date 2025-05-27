/**
 * MCP Tool: get_stats
 * Get statistics about the memory system
 */

import { MCPTool, MemoryStatsResult, ValidationError } from '../../types/mcp'
import { validateGetStatsParams, getGetStatsJsonSchema } from '../../validation/schemas'
import { MemoryService } from '../../services/memory-service'
import { logMCPOperation } from '../../logging/logger'

export function createGetStatsTool(memoryService: MemoryService): MCPTool {
  return {
    name: 'get_stats',
    description: 'Get statistics about the memory system including counts, storage, and performance metrics',
    inputSchema: getGetStatsJsonSchema(),

    async handler(params: unknown): Promise<MemoryStatsResult> {
      const start = Date.now()
      let validatedParams

      try {
        // Validate input parameters
        validatedParams = validateGetStatsParams(params)

        // Get stats using the memory service
        const stats = await memoryService.getStats(validatedParams.includeDetails)

        const duration = Date.now() - start
        logMCPOperation('get_stats', validatedParams, stats, undefined, duration)

        return stats

      } catch (error) {
        const duration = Date.now() - start

        if (error instanceof Error && error.name === 'ZodError') {
          const validationError = new ValidationError(
            'Invalid parameters for get_stats',
            {
              originalError: error.message,
              params
            }
          )
          logMCPOperation('get_stats', params as object, undefined, validationError, duration)
          throw validationError
        }

        logMCPOperation('get_stats', (validatedParams || params) as object, undefined, error as Error, duration)
        throw error
      }
    }
  }
}

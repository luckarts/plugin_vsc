/**
 * Zod schemas for validation of MCP requests and memory operations
 */

import { z } from 'zod'

// Base schemas
export const MemoryTypeSchema = z.enum([
  'personal',
  'repository',
  'guideline',
  'session',
  'template'
])

export const ContextInfoSchema = z.object({
  file: z.string().optional(),
  line: z.number().optional(),
  function: z.string().optional(),
  class: z.string().optional(),
  module: z.string().optional(),
  workspace: z.string().optional()
})

export const MemoryMetadataSchema = z.object({
  tags: z.array(z.string()),
  project: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  importance: z.number().min(0).max(10),
  category: z.string(),
  source: z.string(),
  context: ContextInfoSchema.optional()
})

// MCP Request schemas
export const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.string(),
  params: z.any().optional(), // Allow any params structure for flexibility
  id: z.union([z.string(), z.number()])
})

// Specific schema for tools/call requests
export const MCPToolCallRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.any().optional()
  }),
  id: z.union([z.string(), z.number()])
})

// Tool parameter schemas
export const CreateMemoryParamsSchema = z.object({
  content: z.string().min(1).max(100000),
  type: MemoryTypeSchema.optional().default('personal'),
  tags: z.array(z.string()).optional().default([]),
  metadata: MemoryMetadataSchema.partial().optional()
})

export const SearchMemoriesParamsSchema = z.object({
  query: z.string().min(1),
  type: z.union([MemoryTypeSchema, z.array(MemoryTypeSchema)]).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().default(10),
  threshold: z.number().min(0).max(1).optional().default(0.7)
})

export const GetMemoryParamsSchema = z.object({
  memory_id: z.string().uuid()
})

export const UpdateMemoryParamsSchema = z.object({
  memory_id: z.string().uuid(),
  content: z.string().min(1).max(100000).optional(),
  tags: z.array(z.string()).optional(),
  metadata: MemoryMetadataSchema.partial().optional()
})

export const DeleteMemoryParamsSchema = z.object({
  memory_id: z.string().uuid()
})

export const GetStatsParamsSchema = z.object({
  includeDetails: z.boolean().optional().default(false)
}).optional().default({})

// Validation helper functions
export function validateCreateMemoryParams(params: unknown) {
  return CreateMemoryParamsSchema.parse(params)
}

export function validateSearchMemoriesParams(params: unknown) {
  return SearchMemoriesParamsSchema.parse(params)
}

export function validateGetMemoryParams(params: unknown) {
  return GetMemoryParamsSchema.parse(params)
}

export function validateUpdateMemoryParams(params: unknown) {
  return UpdateMemoryParamsSchema.parse(params)
}

export function validateDeleteMemoryParams(params: unknown) {
  return DeleteMemoryParamsSchema.parse(params)
}

export function validateGetStatsParams(params: unknown) {
  return GetStatsParamsSchema.parse(params)
}

export function validateMCPRequest(request: unknown) {
  return MCPRequestSchema.parse(request)
}

export function validateMCPToolCallRequest(request: unknown) {
  return MCPToolCallRequestSchema.parse(request)
}

// JSON Schema generation for MCP tool descriptions
export function getCreateMemoryJsonSchema() {
  return {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        minLength: 1,
        maxLength: 100000,
        description: 'Content of the memory'
      },
      type: {
        type: 'string',
        enum: ['personal', 'repository', 'guideline', 'session', 'template'],
        default: 'personal',
        description: 'Type of memory'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        default: [],
        description: 'Tags associated with the memory'
      },
      metadata: {
        type: 'object',
        properties: {
          project: { type: 'string' },
          language: { type: 'string' },
          framework: { type: 'string' },
          importance: { type: 'number', minimum: 0, maximum: 10 },
          category: { type: 'string' },
          source: { type: 'string' }
        },
        description: 'Additional metadata for the memory'
      }
    },
    required: ['content'],
    additionalProperties: false
  }
}

export function getSearchMemoriesJsonSchema() {
  return {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        minLength: 1,
        description: 'Search query'
      },
      type: {
        oneOf: [
          {
            type: 'string',
            enum: ['personal', 'repository', 'guideline', 'session', 'template']
          },
          {
            type: 'array',
            items: {
              type: 'string',
              enum: ['personal', 'repository', 'guideline', 'session', 'template']
            }
          }
        ],
        description: 'Filter by memory type(s)'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Filter by tags'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 100,
        default: 10,
        description: 'Maximum number of results'
      },
      threshold: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.7,
        description: 'Similarity threshold'
      }
    },
    required: ['query'],
    additionalProperties: false
  }
}

export function getGetMemoryJsonSchema() {
  return {
    type: 'object',
    properties: {
      memory_id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of the memory'
      }
    },
    required: ['memory_id'],
    additionalProperties: false
  }
}

export function getUpdateMemoryJsonSchema() {
  return {
    type: 'object',
    properties: {
      memory_id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of the memory'
      },
      content: {
        type: 'string',
        minLength: 1,
        maxLength: 100000,
        description: 'New content for the memory'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'New tags for the memory'
      },
      metadata: {
        type: 'object',
        description: 'Updated metadata for the memory'
      }
    },
    required: ['memory_id'],
    additionalProperties: false
  }
}

export function getDeleteMemoryJsonSchema() {
  return {
    type: 'object',
    properties: {
      memory_id: {
        type: 'string',
        format: 'uuid',
        description: 'Unique identifier of the memory to delete'
      }
    },
    required: ['memory_id'],
    additionalProperties: false
  }
}

export function getGetStatsJsonSchema() {
  return {
    type: 'object',
    properties: {
      includeDetails: {
        type: 'boolean',
        default: false,
        description: 'Include detailed statistics'
      }
    },
    additionalProperties: false
  }
}

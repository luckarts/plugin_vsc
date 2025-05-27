/**
 * Types for MCP (Model Context Protocol) implementation
 * Based on the official MCP specification
 */

export interface MCPRequest {
  jsonrpc: '2.0'
  method: string
  params?: object
  id: string | number
}

export interface MCPResponse {
  jsonrpc: '2.0'
  result?: object
  error?: MCPError
  id: string | number
}

export interface MCPError {
  code: number
  message: string
  data?: object
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: object
  handler: (params: unknown) => Promise<object>
}

export interface MCPToolCall {
  name: string
  arguments: object
}

export interface MCPToolResult {
  content: MCPContent[]
  isError?: boolean
}

export interface MCPContent {
  type: 'text' | 'image' | 'resource'
  text?: string
  data?: string
  mimeType?: string
}

// Memory-specific types
export enum MemoryType {
  PERSONAL = 'personal',
  REPOSITORY = 'repository',
  GUIDELINE = 'guideline',
  SESSION = 'session',
  TEMPLATE = 'template'
}

export interface Memory {
  id: string
  content: string
  type: MemoryType
  metadata: MemoryMetadata
  created: Date
  updated: Date
  accessed: Date
  accessCount: number
  compressed: boolean
  version: number
}

export interface MemoryMetadata {
  tags: string[]
  project?: string
  language?: string
  framework?: string
  importance: number
  category: string
  source: string
  context?: ContextInfo
}

export interface ContextInfo {
  file?: string
  line?: number
  function?: string
  class?: string
  module?: string
  workspace?: string
}

// Tool parameter types
export interface CreateMemoryParams {
  content: string
  type?: MemoryType | string
  tags?: string[]
  metadata?: Partial<MemoryMetadata>
}

export interface SearchMemoriesParams {
  query: string
  type?: MemoryType | MemoryType[] | string | string[]
  tags?: string[]
  limit?: number
  threshold?: number
}

export interface GetMemoryParams {
  memory_id: string
}

export interface UpdateMemoryParams {
  memory_id: string
  content?: string | undefined
  tags?: string[] | undefined
  metadata?: Partial<MemoryMetadata> | undefined
}

export interface DeleteMemoryParams {
  memory_id: string
}

export interface GetStatsParams {
  includeDetails?: boolean
}

// Tool result types
export interface CreateMemoryResult {
  memory_id: string
  status: 'created' | 'updated'
}

export interface SearchMemoriesResult {
  memories: SearchResultMemory[]
  total: number
  queryTime: number
}

export interface SearchResultMemory {
  memory: Memory
  similarity?: number
  rank: number
  highlights?: string[]
}

export interface GetMemoryResult {
  memory: Memory | null
  status: 'found' | 'not_found'
}

export interface UpdateMemoryResult {
  status: 'updated' | 'not_found'
  updatedFields?: string[]
}

export interface DeleteMemoryResult {
  status: 'deleted' | 'not_found'
}

export interface MemoryStatsResult {
  total: number
  byType: Record<MemoryType, number>
  storage: {
    totalSize: number
    compressedSize: number
  }
  performance: {
    averageSearchTime: number
    averageCreateTime: number
  }
}

// Error types
export class MCPServerError extends Error {
  constructor(
    message: string,
    public code: number = -32000,
    public data?: object
  ) {
    super(message)
    this.name = 'MCPServerError'
  }
}

export class ValidationError extends MCPServerError {
  constructor(message: string, data?: object) {
    super(message, -32602, data)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends MCPServerError {
  constructor(message: string = 'Authentication required') {
    super(message, -32001)
    this.name = 'AuthenticationError'
  }
}

export class NotFoundError extends MCPServerError {
  constructor(message: string = 'Resource not found') {
    super(message, -32004)
    this.name = 'NotFoundError'
  }
}

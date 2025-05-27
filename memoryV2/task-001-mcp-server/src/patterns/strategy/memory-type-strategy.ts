/**
 * Strategy Pattern: Memory Type Strategies
 * Provides specialized handling for different memory types
 */

import {
  Memory,
  MemoryType,
  MemoryMetadata,
  CreateMemoryParams,
  UpdateMemoryParams
} from '../../types/mcp'
import { logInfo } from '../../logging/logger'

export interface IMemoryTypeStrategy {
  validateCreation(params: CreateMemoryParams): Promise<void>
  validateUpdate(memory: Memory, params: UpdateMemoryParams): Promise<void>
  enhanceMetadata(metadata: MemoryMetadata, params: CreateMemoryParams): Promise<MemoryMetadata>
  processContent(content: string, type: MemoryType): Promise<string>
  getSearchWeight(): number
  getRetentionPolicy(): RetentionPolicy
  getCompressionPolicy(): CompressionPolicy
}

export interface RetentionPolicy {
  maxAge?: number // in milliseconds
  maxAccessCount?: number
  autoArchive?: boolean
  archiveAfterDays?: number
}

export interface CompressionPolicy {
  enabled: boolean
  threshold: number // content length threshold
  algorithm: 'gzip' | 'lz4' | 'none'
  level?: number
}

/**
 * Base strategy with common functionality
 */
export abstract class BaseMemoryTypeStrategy implements IMemoryTypeStrategy {
  protected memoryType: MemoryType

  constructor(memoryType: MemoryType) {
    this.memoryType = memoryType
  }

  async validateCreation(params: CreateMemoryParams): Promise<void> {
    // Basic validation
    if (!params.content || params.content.trim().length === 0) {
      throw new Error('Content cannot be empty')
    }

    if (params.content.length > this.getMaxContentLength()) {
      throw new Error(`Content exceeds maximum length for ${this.memoryType}`)
    }

    // Type-specific validation
    await this.validateTypeSpecific(params)
  }

  async validateUpdate(memory: Memory, params: UpdateMemoryParams): Promise<void> {
    if (memory.type !== this.memoryType) {
      throw new Error(`Strategy mismatch: expected ${this.memoryType}, got ${memory.type}`)
    }

    if (params.content && params.content.length > this.getMaxContentLength()) {
      throw new Error(`Content exceeds maximum length for ${this.memoryType}`)
    }

    // Type-specific update validation
    await this.validateUpdateTypeSpecific(memory, params)
  }

  async enhanceMetadata(metadata: MemoryMetadata, params: CreateMemoryParams): Promise<MemoryMetadata> {
    const enhanced = { ...metadata }

    // Add type-specific metadata
    enhanced.category = enhanced.category || this.getDefaultCategory()
    enhanced.importance = enhanced.importance || this.getDefaultImportance()

    // Type-specific enhancement
    return this.enhanceTypeSpecificMetadata(enhanced, params)
  }

  async processContent(content: string, _type: MemoryType): Promise<string> {
    // Basic content processing
    let processed = content.trim()

    // Type-specific processing
    processed = await this.processTypeSpecificContent(processed)

    return processed
  }

  // Abstract methods to be implemented by concrete strategies
  abstract getSearchWeight(): number
  abstract getRetentionPolicy(): RetentionPolicy
  abstract getCompressionPolicy(): CompressionPolicy
  protected abstract getMaxContentLength(): number
  protected abstract getDefaultCategory(): string
  protected abstract getDefaultImportance(): number
  protected abstract validateTypeSpecific(params: CreateMemoryParams): Promise<void>
  protected abstract validateUpdateTypeSpecific(memory: Memory, params: UpdateMemoryParams): Promise<void>
  protected abstract enhanceTypeSpecificMetadata(metadata: MemoryMetadata, params: CreateMemoryParams): Promise<MemoryMetadata>
  protected abstract processTypeSpecificContent(content: string): Promise<string>
}

/**
 * Personal Memory Strategy
 */
export class PersonalMemoryStrategy extends BaseMemoryTypeStrategy {
  constructor() {
    super(MemoryType.PERSONAL)
  }

  getSearchWeight(): number {
    return 1.0 // Standard weight
  }

  getRetentionPolicy(): RetentionPolicy {
    return {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      autoArchive: true,
      archiveAfterDays: 180
    }
  }

  getCompressionPolicy(): CompressionPolicy {
    return {
      enabled: true,
      threshold: 1000,
      algorithm: 'gzip',
      level: 6
    }
  }

  protected getMaxContentLength(): number {
    return 10000 // 10KB
  }

  protected getDefaultCategory(): string {
    return 'personal'
  }

  protected getDefaultImportance(): number {
    return 5
  }

  protected async validateTypeSpecific(params: CreateMemoryParams): Promise<void> {
    // Personal memories can have any content
    logInfo('Validating personal memory creation', { contentLength: params.content.length })
  }

  protected async validateUpdateTypeSpecific(memory: Memory, _params: UpdateMemoryParams): Promise<void> {
    // Personal memories can be updated freely
    logInfo('Validating personal memory update', { memoryId: memory.id })
  }

  protected async enhanceTypeSpecificMetadata(metadata: MemoryMetadata, _params: CreateMemoryParams): Promise<MemoryMetadata> {
    const enhanced = { ...metadata }

    // Add personal-specific metadata
    enhanced.source = enhanced.source || 'user-input'

    return enhanced
  }

  protected async processTypeSpecificContent(content: string): Promise<string> {
    // No special processing for personal memories
    return content
  }
}

/**
 * Repository Memory Strategy
 */
export class RepositoryMemoryStrategy extends BaseMemoryTypeStrategy {
  constructor() {
    super(MemoryType.REPOSITORY)
  }

  getSearchWeight(): number {
    return 1.5 // Higher weight for repository memories
  }

  getRetentionPolicy(): RetentionPolicy {
    return {
      maxAge: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
      autoArchive: false // Keep repository memories active
    }
  }

  getCompressionPolicy(): CompressionPolicy {
    return {
      enabled: true,
      threshold: 500,
      algorithm: 'lz4', // Faster compression for code
      level: 1
    }
  }

  protected getMaxContentLength(): number {
    return 50000 // 50KB for code snippets
  }

  protected getDefaultCategory(): string {
    return 'code'
  }

  protected getDefaultImportance(): number {
    return 7
  }

  protected async validateTypeSpecific(params: CreateMemoryParams): Promise<void> {
    // Repository memories should have project context
    if (!params.metadata?.project) {
      logInfo('Repository memory created without project context', {
        hasMetadata: !!params.metadata
      })
    }
  }

  protected async validateUpdateTypeSpecific(memory: Memory, params: UpdateMemoryParams): Promise<void> {
    // Ensure repository context is maintained
    if (params.metadata && !params.metadata.project && !memory.metadata.project) {
      throw new Error('Repository memories must maintain project context')
    }
  }

  protected async enhanceTypeSpecificMetadata(metadata: MemoryMetadata, params: CreateMemoryParams): Promise<MemoryMetadata> {
    const enhanced = { ...metadata }

    // Add repository-specific metadata
    enhanced.source = enhanced.source || 'repository'
    enhanced.category = 'code'

    // Try to detect language from content
    if (!enhanced.language) {
      enhanced.language = this.detectLanguage(params.content)
    }

    return enhanced
  }

  protected async processTypeSpecificContent(content: string): Promise<string> {
    // Remove sensitive information from code
    let processed = content

    // Remove common sensitive patterns
    processed = processed.replace(/password\s*=\s*["'][^"']*["']/gi, 'password = "[REDACTED]"')
    processed = processed.replace(/api[_-]?key\s*=\s*["'][^"']*["']/gi, 'api_key = "[REDACTED]"')
    processed = processed.replace(/token\s*=\s*["'][^"']*["']/gi, 'token = "[REDACTED]"')

    return processed
  }

  private detectLanguage(content: string): string {
    // Simple language detection based on content patterns
    if (content.includes('function') && content.includes('{')) {
      if (content.includes('const ') || content.includes('let ')) return 'javascript'
      if (content.includes('def ')) return 'python'
      if (content.includes('func ')) return 'go'
    }

    if (content.includes('class ') && content.includes('public')) return 'java'
    if (content.includes('#include') || content.includes('int main')) return 'cpp'
    if (content.includes('<?php')) return 'php'

    return 'unknown'
  }
}

/**
 * Guideline Memory Strategy
 */
export class GuidelineMemoryStrategy extends BaseMemoryTypeStrategy {
  constructor() {
    super(MemoryType.GUIDELINE)
  }

  getSearchWeight(): number {
    return 2.0 // Highest weight for guidelines
  }

  getRetentionPolicy(): RetentionPolicy {
    return {
      autoArchive: false, // Never archive guidelines
      maxAge: undefined // Keep indefinitely
    }
  }

  getCompressionPolicy(): CompressionPolicy {
    return {
      enabled: false, // Don't compress guidelines for fast access
      threshold: Infinity,
      algorithm: 'none'
    }
  }

  protected getMaxContentLength(): number {
    return 20000 // 20KB for detailed guidelines
  }

  protected getDefaultCategory(): string {
    return 'guideline'
  }

  protected getDefaultImportance(): number {
    return 9 // Very high importance
  }

  protected async validateTypeSpecific(params: CreateMemoryParams): Promise<void> {
    // Guidelines should be well-structured
    if (params.content.length < 50) {
      throw new Error('Guidelines should be detailed (minimum 50 characters)')
    }
  }

  protected async validateUpdateTypeSpecific(memory: Memory, params: UpdateMemoryParams): Promise<void> {
    // Guidelines require careful updating
    logInfo('Updating guideline memory', {
      memoryId: memory.id,
      hasNewContent: !!params.content
    })
  }

  protected async enhanceTypeSpecificMetadata(metadata: MemoryMetadata, _params: CreateMemoryParams): Promise<MemoryMetadata> {
    const enhanced = { ...metadata }

    enhanced.source = enhanced.source || 'guideline-system'
    enhanced.category = 'guideline'
    enhanced.importance = Math.max(enhanced.importance, 8) // Ensure high importance

    return enhanced
  }

  protected async processTypeSpecificContent(content: string): Promise<string> {
    // Ensure guidelines are well-formatted
    let processed = content

    // Add structure if missing
    if (!processed.includes('#') && !processed.includes('**')) {
      // Add basic formatting for plain text guidelines
      const lines = processed.split('\n')
      if (lines.length > 1) {
        processed = `# ${lines[0]}\n\n${lines.slice(1).join('\n')}`
      }
    }

    return processed
  }
}

/**
 * Strategy Factory
 */
export class MemoryTypeStrategyFactory {
  private static strategies: Map<MemoryType, IMemoryTypeStrategy> = new Map()

  static getStrategy(type: MemoryType): IMemoryTypeStrategy {
    if (!this.strategies.has(type)) {
      this.strategies.set(type, this.createStrategy(type))
    }

    return this.strategies.get(type)!
  }

  private static createStrategy(type: MemoryType): IMemoryTypeStrategy {
    switch (type) {
      case MemoryType.PERSONAL:
        return new PersonalMemoryStrategy()

      case MemoryType.REPOSITORY:
        return new RepositoryMemoryStrategy()

      case MemoryType.GUIDELINE:
        return new GuidelineMemoryStrategy()

      case MemoryType.SESSION:
        // For now, use personal strategy for session memories
        return new PersonalMemoryStrategy()

      case MemoryType.TEMPLATE:
        // For now, use repository strategy for template memories
        return new RepositoryMemoryStrategy()

      default:
        throw new Error(`Unknown memory type: ${type}`)
    }
  }

  static getAllStrategies(): Map<MemoryType, IMemoryTypeStrategy> {
    // Ensure all strategies are created
    Object.values(MemoryType).forEach(type => this.getStrategy(type))
    return new Map(this.strategies)
  }
}

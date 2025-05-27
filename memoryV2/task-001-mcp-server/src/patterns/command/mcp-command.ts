/**
 * Command Pattern: Encapsulates MCP operations for better control and extensibility
 */


import { MemoryService } from '../../services/memory-service'
import { logInfo, logError, logPerformance } from '../../logging/logger'

export interface ICommand {
  execute(): Promise<object>
  undo?(): Promise<void>
  canUndo(): boolean
  getMetadata(): CommandMetadata
}

export interface CommandMetadata {
  id: string
  name: string
  timestamp: Date
  params: unknown
  userId?: string
  sessionId?: string
  undoable: boolean
}

export interface CommandContext {
  memoryService: MemoryService
  userId?: string
  sessionId?: string
  requestId: string
  metadata?: Record<string, unknown>
}

/**
 * Abstract base command
 */
export abstract class BaseCommand implements ICommand {
  protected context: CommandContext
  protected metadata: CommandMetadata
  protected executed = false
  protected result?: object

  constructor(
    name: string,
    params: unknown,
    context: CommandContext,
    undoable = false
  ) {
    this.context = context
    this.metadata = {
      id: this.generateCommandId(),
      name,
      timestamp: new Date(),
      params,
      userId: context.userId,
      sessionId: context.sessionId,
      undoable
    }
  }

  async execute(): Promise<object> {
    if (this.executed) {
      throw new Error(`Command ${this.metadata.name} has already been executed`)
    }

    const start = Date.now()

    try {
      logInfo(`Executing command: ${this.metadata.name}`, {
        commandId: this.metadata.id,
        params: this.metadata.params
      })

      this.result = await this.doExecute()
      this.executed = true

      const duration = Date.now() - start
      logPerformance(`command-${this.metadata.name}`, duration, {
        commandId: this.metadata.id,
        success: true
      })

      return this.result

    } catch (error) {
      const duration = Date.now() - start

      logError(`Command execution failed: ${this.metadata.name}`, error as Error, {
        commandId: this.metadata.id,
        params: this.metadata.params,
        duration
      })

      logPerformance(`command-${this.metadata.name}`, duration, {
        commandId: this.metadata.id,
        success: false,
        error: (error as Error).message
      })

      throw error
    }
  }

  async undo(): Promise<void> {
    if (!this.canUndo()) {
      throw new Error(`Command ${this.metadata.name} cannot be undone`)
    }

    if (!this.executed) {
      throw new Error(`Command ${this.metadata.name} has not been executed yet`)
    }

    try {
      logInfo(`Undoing command: ${this.metadata.name}`, {
        commandId: this.metadata.id
      })

      await this.doUndo()
      this.executed = false

    } catch (error) {
      logError(`Command undo failed: ${this.metadata.name}`, error as Error, {
        commandId: this.metadata.id
      })
      throw error
    }
  }

  canUndo(): boolean {
    return this.metadata.undoable && this.executed
  }

  getMetadata(): CommandMetadata {
    return { ...this.metadata }
  }

  protected abstract doExecute(): Promise<object>

  protected async doUndo(): Promise<void> {
    // Default implementation - override in subclasses
    throw new Error(`Undo not implemented for command: ${this.metadata.name}`)
  }

  private generateCommandId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Create Memory Command
 */
export class CreateMemoryCommand extends BaseCommand {
  private createdMemoryId?: string

  constructor(params: unknown, context: CommandContext) {
    super('create_memory', params, context, true)
  }

  protected async doExecute(): Promise<object> {
    const params = this.metadata.params as any

    this.createdMemoryId = await this.context.memoryService.createMemory(params)

    return {
      memory_id: this.createdMemoryId,
      status: 'created'
    }
  }

  protected override async doUndo(): Promise<void> {
    if (this.createdMemoryId) {
      await this.context.memoryService.deleteMemory(this.createdMemoryId)
    }
  }
}

/**
 * Update Memory Command
 */
export class UpdateMemoryCommand extends BaseCommand {
  private previousState?: object

  constructor(params: unknown, context: CommandContext) {
    super('update_memory', params, context, true)
  }

  protected async doExecute(): Promise<object> {
    const params = this.metadata.params as any

    // Store previous state for undo
    const existingMemory = await this.context.memoryService.getMemory(params.memory_id)
    if (existingMemory) {
      this.previousState = {
        content: existingMemory.content,
        metadata: existingMemory.metadata
      }
    }

    const updatedFields = await this.context.memoryService.updateMemory(params)

    return {
      status: 'updated',
      updatedFields
    }
  }

  protected override async doUndo(): Promise<void> {
    if (this.previousState) {
      const params = this.metadata.params as any
      const undoParams = {
        memory_id: params.memory_id,
        ...this.previousState
      }
      await this.context.memoryService.updateMemory(undoParams)
    }
  }
}

/**
 * Delete Memory Command
 */
export class DeleteMemoryCommand extends BaseCommand {
  private deletedMemory?: object | null

  constructor(params: unknown, context: CommandContext) {
    super('delete_memory', params, context, true)
  }

  protected async doExecute(): Promise<object> {
    const params = this.metadata.params as any

    // Store a deep copy of memory for potential undo
    const originalMemory = await this.context.memoryService.getMemory(params.memory_id)
    if (originalMemory) {
      this.deletedMemory = JSON.parse(JSON.stringify(originalMemory))
    }

    await this.context.memoryService.deleteMemory(params.memory_id)

    return {
      status: 'deleted',
      memory_id: params.memory_id
    }
  }

  protected override async doUndo(): Promise<void> {
    if (this.deletedMemory) {
      const memory = this.deletedMemory as any
      await this.context.memoryService.createMemory({
        content: memory.content,
        type: memory.type,
        metadata: memory.metadata
      })
    }
  }
}

/**
 * Search Memories Command (read-only, not undoable)
 */
export class SearchMemoriesCommand extends BaseCommand {
  constructor(params: unknown, context: CommandContext) {
    super('search_memories', params, context, false)
  }

  protected async doExecute(): Promise<object> {
    const params = this.metadata.params as any
    const searchResults = await this.context.memoryService.searchMemories(params)

    return {
      memories: searchResults,
      total: searchResults.length,
      queryTime: Date.now() // Mock query time
    }
  }
}

/**
 * Get Memory Command (read-only, not undoable)
 */
export class GetMemoryCommand extends BaseCommand {
  constructor(params: unknown, context: CommandContext) {
    super('get_memory', params, context, false)
  }

  protected async doExecute(): Promise<object> {
    const params = this.metadata.params as any
    const memory = await this.context.memoryService.getMemory(params.memory_id)

    if (!memory) {
      return {
        memory: null,
        status: 'not_found'
      }
    }

    return {
      memory,
      status: 'found'
    }
  }
}

/**
 * Get Stats Command (read-only, not undoable)
 */
export class GetStatsCommand extends BaseCommand {
  constructor(params: unknown, context: CommandContext) {
    super('get_stats', params, context, false)
  }

  protected async doExecute(): Promise<object> {
    return this.context.memoryService.getStats()
  }
}

/**
 * Command Factory
 */
export class CommandFactory {
  static createCommand(toolName: string, params: unknown, context: CommandContext): ICommand {
    switch (toolName) {
      case 'create_memory':
        return new CreateMemoryCommand(params, context)

      case 'update_memory':
        return new UpdateMemoryCommand(params, context)

      case 'delete_memory':
        return new DeleteMemoryCommand(params, context)

      case 'search_memories':
        return new SearchMemoriesCommand(params, context)

      case 'get_memory':
        return new GetMemoryCommand(params, context)

      case 'get_stats':
        return new GetStatsCommand(params, context)

      default:
        throw new Error(`Unknown tool: ${toolName}`)
    }
  }
}

/**
 * Command Queue for batch processing
 */
export class CommandQueue {
  private queue: ICommand[] = []
  private processing = false
  private history: ICommand[] = []
  private maxHistorySize = 100

  /**
   * Add command to queue
   */
  enqueue(command: ICommand): void {
    this.queue.push(command)

    if (!this.processing) {
      this.processQueue()
    }
  }

  /**
   * Process all commands in queue
   */
  private async processQueue(): Promise<void> {
    this.processing = true

    while (this.queue.length > 0) {
      const command = this.queue.shift()!

      try {
        await command.execute()
        this.addToHistory(command)
      } catch (error) {
        logError('Command queue processing failed', error as Error, {
          commandId: command.getMetadata().id,
          commandName: command.getMetadata().name
        })
        // Continue processing other commands
      }
    }

    this.processing = false
  }

  /**
   * Add command to history
   */
  private addToHistory(command: ICommand): void {
    this.history.push(command)

    // Maintain history size limit
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }

  /**
   * Get command history
   */
  getHistory(): CommandMetadata[] {
    return this.history.map(cmd => cmd.getMetadata())
  }

  /**
   * Undo last undoable command
   */
  async undoLast(): Promise<void> {
    for (let i = this.history.length - 1; i >= 0; i--) {
      const command = this.history[i]

      if (command && command.canUndo() && command.undo) {
        await command.undo()
        this.history.splice(i, 1)
        return
      }
    }

    throw new Error('No undoable commands found')
  }

  /**
   * Clear queue and history
   */
  clear(): void {
    this.queue = []
    this.history = []
  }

  /**
   * Get queue status
   */
  getStatus(): { queueSize: number; historySize: number; processing: boolean } {
    return {
      queueSize: this.queue.length,
      historySize: this.history.length,
      processing: this.processing
    }
  }
}

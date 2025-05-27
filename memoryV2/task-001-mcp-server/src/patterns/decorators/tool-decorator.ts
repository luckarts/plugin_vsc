/**
 * Decorator Pattern: Base interfaces and abstract classes for tool decoration
 */

import { MCPTool } from '../../types/mcp'

/**
 * Interface for tool decorators
 */
export interface IToolDecorator {
  decorate(tool: MCPTool): MCPTool
}

/**
 * Abstract base class for tool decorators
 */
export abstract class BaseToolDecorator implements IToolDecorator {
  protected tool: MCPTool

  constructor(tool: MCPTool) {
    this.tool = tool
  }

  /**
   * Get the decorated tool
   */
  getTool(): MCPTool {
    return {
      name: this.tool.name,
      description: this.tool.description,
      inputSchema: this.tool.inputSchema,
      handler: this.decorateHandler(this.tool.handler)
    }
  }

  /**
   * Decorate method for interface compliance
   */
  decorate(tool: MCPTool): MCPTool {
    this.tool = tool
    return this.getTool()
  }

  /**
   * Abstract method to decorate the handler
   */
  protected abstract decorateHandler(
    originalHandler: (params: unknown) => Promise<object>
  ): (params: unknown) => Promise<object>
}

/**
 * Decorator for chaining multiple decorators
 */
export class CompositeDecorator implements IToolDecorator {
  private decorators: IToolDecorator[]

  constructor(decorators: IToolDecorator[]) {
    this.decorators = decorators
  }

  decorate(tool: MCPTool): MCPTool {
    return this.decorators.reduce((decoratedTool, decorator) => {
      return decorator.decorate(decoratedTool)
    }, tool)
  }

  /**
   * Add a decorator to the chain
   */
  addDecorator(decorator: IToolDecorator): void {
    this.decorators.push(decorator)
  }

  /**
   * Remove a decorator from the chain
   */
  removeDecorator(decoratorType: new (...args: any[]) => IToolDecorator): void {
    this.decorators = this.decorators.filter(
      decorator => !(decorator instanceof decoratorType)
    )
  }
}

/**
 * Decorator metadata for tracking applied decorators
 */
export interface DecoratorMetadata {
  name: string
  appliedAt: Date
  config?: Record<string, unknown>
}

/**
 * Enhanced tool with decorator metadata
 */
export interface DecoratedMCPTool extends MCPTool {
  decoratorMetadata?: DecoratorMetadata[]
}

/**
 * Base class for decorators with metadata tracking
 */
export abstract class MetadataTrackingDecorator extends BaseToolDecorator {
  protected decoratorName: string
  protected config?: Record<string, unknown>

  constructor(tool: MCPTool, decoratorName: string, config?: Record<string, unknown>) {
    super(tool)
    this.decoratorName = decoratorName
    this.config = config
  }

  override getTool(): DecoratedMCPTool {
    const decoratedTool = super.getTool() as DecoratedMCPTool

    // Add metadata tracking
    if (!decoratedTool.decoratorMetadata) {
      decoratedTool.decoratorMetadata = []
    }

    decoratedTool.decoratorMetadata.push({
      name: this.decoratorName,
      appliedAt: new Date(),
      config: this.config
    })

    return decoratedTool
  }
}

/**
 * Utility functions for decorator management
 */
export class DecoratorUtils {
  /**
   * Check if a tool has a specific decorator applied
   */
  static hasDecorator(tool: DecoratedMCPTool, decoratorName: string): boolean {
    return tool.decoratorMetadata?.some(meta => meta.name === decoratorName) ?? false
  }

  /**
   * Get decorator metadata for a specific decorator
   */
  static getDecoratorMetadata(
    tool: DecoratedMCPTool,
    decoratorName: string
  ): DecoratorMetadata | undefined {
    return tool.decoratorMetadata?.find(meta => meta.name === decoratorName)
  }

  /**
   * Get all applied decorators
   */
  static getAppliedDecorators(tool: DecoratedMCPTool): string[] {
    return tool.decoratorMetadata?.map(meta => meta.name) ?? []
  }

  /**
   * Remove decorator metadata (for testing/debugging)
   */
  static removeDecoratorMetadata(tool: DecoratedMCPTool, decoratorName: string): void {
    if (tool.decoratorMetadata) {
      tool.decoratorMetadata = tool.decoratorMetadata.filter(
        meta => meta.name !== decoratorName
      )
    }
  }
}

/**
 * Validation Decorator: Provides automatic input validation for MCP tools
 */

import { MCPTool, ValidationError } from '../../types/mcp'
import { MetadataTrackingDecorator } from './tool-decorator'
import { logError, logInfo } from '../../logging/logger'
import { z, ZodSchema, ZodError } from 'zod'

export interface ValidationConfig extends Record<string, unknown> {
  enableInputValidation?: boolean
  enableOutputValidation?: boolean
  strictMode?: boolean
  customValidators?: Array<(params: unknown) => Promise<void> | void>
  transformInput?: (params: unknown) => unknown
  transformOutput?: (result: object) => object
}

export class ValidationDecorator extends MetadataTrackingDecorator {
  protected override config: ValidationConfig
  private inputSchema?: ZodSchema

  constructor(tool: MCPTool, config: ValidationConfig = {}) {
    super(tool, 'ValidationDecorator', config)
    this.config = {
      enableInputValidation: true,
      enableOutputValidation: false,
      strictMode: true,
      ...config
    }

    // Try to convert inputSchema to Zod schema if it's a JSON schema
    this.inputSchema = this.convertToZodSchema(tool.inputSchema)
  }

  protected decorateHandler(
    originalHandler: (params: unknown) => Promise<object>
  ): (params: unknown) => Promise<object> {
    return async (params: unknown): Promise<object> => {
      try {
        // Input validation
        let validatedParams = params
        if (this.config.enableInputValidation) {
          validatedParams = await this.validateInput(params)
        }

        // Transform input if configured
        if (this.config.transformInput) {
          validatedParams = this.config.transformInput(validatedParams)
        }

        // Execute original handler
        let result = await originalHandler(validatedParams)

        // Transform output if configured
        if (this.config.transformOutput) {
          result = this.config.transformOutput(result)
        }

        // Output validation
        if (this.config.enableOutputValidation) {
          await this.validateOutput(result)
        }

        return result

      } catch (error) {
        if (error instanceof ZodError) {
          const validationError = new ValidationError(
            `Validation failed for tool: ${this.tool.name}`,
            {
              tool: this.tool.name,
              errors: error.errors,
              params
            }
          )

          logError('Tool validation failed', validationError, {
            toolName: this.tool.name,
            validationErrors: error.errors
          })

          throw validationError
        }

        throw error
      }
    }
  }

  /**
   * Validate input parameters
   */
  private async validateInput(params: unknown): Promise<unknown> {
    // Zod schema validation
    if (this.inputSchema) {
      try {
        return this.inputSchema.parse(params)
      } catch (error) {
        if (error instanceof ZodError) {
          logError(`Input validation failed for ${this.tool.name}`, error, {
            params,
            errors: error.errors
          })
        }
        throw error
      }
    }

    // Custom validators
    if (this.config.customValidators) {
      for (const validator of this.config.customValidators) {
        await validator(params)
      }
    }

    // Basic validation in strict mode
    if (this.config.strictMode) {
      this.performBasicValidation(params)
    }

    return params
  }

  /**
   * Validate output result
   */
  private async validateOutput(result: object): Promise<void> {
    // Basic output validation
    if (result === null || result === undefined) {
      throw new ValidationError(`Tool ${this.tool.name} returned null or undefined`)
    }

    if (typeof result !== 'object') {
      throw new ValidationError(`Tool ${this.tool.name} must return an object`)
    }

    // Additional output validation can be added here
    logInfo(`Output validation passed for ${this.tool.name}`, {
      resultType: typeof result,
      resultKeys: Object.keys(result)
    })
  }

  /**
   * Perform basic validation checks
   */
  private performBasicValidation(params: unknown): void {
    if (params === null || params === undefined) {
      throw new ValidationError(`Parameters cannot be null or undefined for tool: ${this.tool.name}`)
    }

    if (typeof params !== 'object') {
      throw new ValidationError(`Parameters must be an object for tool: ${this.tool.name}`)
    }

    // Check for required fields based on tool name
    this.validateRequiredFields(params as Record<string, unknown>)
  }

  /**
   * Validate required fields based on tool conventions
   */
  private validateRequiredFields(params: Record<string, unknown>): void {
    const toolName = this.tool.name

    // Tool-specific validation rules
    switch (toolName) {
      case 'create_memory':
        if (!params.content || typeof params.content !== 'string') {
          throw new ValidationError('create_memory requires a valid content string')
        }
        break

      case 'get_memory':
      case 'update_memory':
      case 'delete_memory':
        if (!params.memory_id || typeof params.memory_id !== 'string') {
          throw new ValidationError(`${toolName} requires a valid memory_id string`)
        }
        break

      case 'search_memories':
        if (!params.query || typeof params.query !== 'string') {
          throw new ValidationError('search_memories requires a valid query string')
        }
        break

      default:
        // Generic validation for unknown tools
        break
    }
  }

  /**
   * Convert JSON schema to Zod schema (basic conversion)
   */
  private convertToZodSchema(jsonSchema: object): ZodSchema | undefined {
    try {
      // This is a simplified conversion - in a real implementation,
      // you might want to use a library like json-schema-to-zod
      const schema = jsonSchema as any

      if (schema.type === 'object' && schema.properties) {
        const zodObject: Record<string, ZodSchema> = {}

        for (const [key, prop] of Object.entries(schema.properties as Record<string, any>)) {
          zodObject[key] = this.convertPropertyToZod(prop)
        }

        let zodSchema = z.object(zodObject)

        // Handle required fields
        if (schema.required && Array.isArray(schema.required)) {
          // Zod objects are strict by default, so we need to make optional fields optional
          const optionalFields = Object.keys(schema.properties).filter(
            key => !schema.required.includes(key)
          )

          if (optionalFields.length > 0) {
            // Make optional fields optional
            const optionalSchema = zodSchema.partial()
            const optionalPick = optionalSchema.pick(
              optionalFields.reduce((acc, key) => ({ ...acc, [key]: true }), {} as any)
            )
            zodSchema = zodSchema.merge(optionalPick)
          }
        }

        return zodSchema
      }

      return undefined
    } catch (error) {
      logError('Failed to convert JSON schema to Zod schema', error as Error, {
        toolName: this.tool.name,
        schema: jsonSchema
      })
      return undefined
    }
  }

  /**
   * Convert a single property to Zod schema
   */
  private convertPropertyToZod(property: any): ZodSchema {
    switch (property.type) {
      case 'string':
        let stringSchema = z.string()
        if (property.minLength) stringSchema = stringSchema.min(property.minLength)
        if (property.maxLength) stringSchema = stringSchema.max(property.maxLength)
        if (property.pattern) stringSchema = stringSchema.regex(new RegExp(property.pattern))
        return stringSchema

      case 'number':
        let numberSchema = z.number()
        if (property.minimum) numberSchema = numberSchema.min(property.minimum)
        if (property.maximum) numberSchema = numberSchema.max(property.maximum)
        return numberSchema

      case 'integer':
        let intSchema = z.number().int()
        if (property.minimum) intSchema = intSchema.min(property.minimum)
        if (property.maximum) intSchema = intSchema.max(property.maximum)
        return intSchema

      case 'boolean':
        return z.boolean()

      case 'array':
        const itemSchema = property.items ? this.convertPropertyToZod(property.items) : z.unknown()
        let arraySchema = z.array(itemSchema)
        if (property.minItems) arraySchema = arraySchema.min(property.minItems)
        if (property.maxItems) arraySchema = arraySchema.max(property.maxItems)
        return arraySchema

      case 'object':
        if (property.properties) {
          const objectSchema: Record<string, ZodSchema> = {}
          for (const [key, prop] of Object.entries(property.properties)) {
            objectSchema[key] = this.convertPropertyToZod(prop)
          }
          return z.object(objectSchema)
        }
        return z.object({})

      default:
        return z.unknown()
    }
  }
}

/**
 * Factory function for easy creation
 */
export function withValidation(tool: MCPTool, config?: ValidationConfig): MCPTool {
  return new ValidationDecorator(tool, config).getTool()
}

/**
 * MCP Server implementation for Memory V2
 * Handles MCP protocol communication and tool execution
 */

import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import { Server } from 'http'
import {
  MCPResponse,
  MCPError,
  MCPTool,
  MCPServerError,
  ValidationError
} from '../types/mcp'
import { ServerConfig } from '../config'
import { MemoryService } from '../services/memory-service'
import { validateTools, getToolsMetadata, getToolByName } from './tools'
import { validateMCPRequest, validateMCPToolCallRequest } from '../validation/schemas'
import { logInfo, logError, createRequestLogger, logSecurityEvent } from '../logging/logger'
import { getMCPToolFactory, ToolConfig } from '../patterns/factory/mcp-tool-factory'
import { allToolDefinitions, validateAllToolsPresent } from '../patterns/factory/tool-definitions'
import { eventSystem, MCPEventType } from '../patterns/observer/event-system'
import { toolMetadataCache } from '../patterns/cache/performance-cache'

export class MCPServer {
  private app: express.Application
  private server: Server | null = null
  private config: ServerConfig
  private memoryService: MemoryService
  private tools: MCPTool[] = []
  private isRunning = false

  constructor(config: ServerConfig, memoryService: MemoryService) {
    this.config = config
    this.memoryService = memoryService
    this.app = express()

    // Initialize tools using the new factory pattern
    this.initializeTools()

    this.setupMiddleware()
    this.setupRoutes()
    this.validateConfiguration()
  }

  /**
   * Initialize tools using factory pattern
   */
  private initializeTools(): void {
    try {
      // Validate all tool definitions are present
      validateAllToolsPresent()

      // Configure tool factory
      const toolConfig: ToolConfig = {
        enableLogging: this.config.logging?.level !== 'error',
        enableValidation: true,
        enablePerformanceTracking: true,
        enableErrorHandling: true
      }

      // Get factory instance
      const factory = getMCPToolFactory(this.memoryService, toolConfig)

      // Register all tool definitions
      for (const definition of allToolDefinitions) {
        factory.registerTool(definition)
      }

      // Create all tools with decorators applied
      this.tools = factory.createAllTools()

      logInfo('Tools initialized with factory pattern', {
        toolCount: this.tools.length,
        toolNames: this.tools.map(t => t.name),
        decoratorsEnabled: {
          logging: toolConfig.enableLogging,
          validation: toolConfig.enableValidation,
          performance: toolConfig.enablePerformanceTracking,
          errorHandling: toolConfig.enableErrorHandling
        }
      })

      // Emit server event
      eventSystem.emitSync(MCPEventType.SERVER_STARTED, {
        toolCount: this.tools.length,
        toolNames: this.tools.map(t => t.name)
      }, 'mcp-server')

    } catch (error) {
      logError('Failed to initialize tools', error as Error)
      throw error
    }
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"]
        }
      }
    }))

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, etc.)
        if (!origin) return callback(null, true)

        // Check if origin is allowed
        const allowedOrigins = [
          'http://localhost:*',
          'vscode-webview://*',
          'cursor://*',
          'claude-desktop://*'
        ]

        const isAllowed = allowedOrigins.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'))
            return regex.test(origin)
          }
          return pattern === origin
        })

        if (isAllowed) {
          callback(null, true)
        } else {
          logSecurityEvent('cors_violation', { origin }, 'medium')
          callback(new Error('Not allowed by CORS'))
        }
      },
      credentials: true
    }))

    // Compression
    this.app.use(compression())

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }))
    this.app.use(express.urlencoded({ extended: true }))

    // Request logging
    this.app.use(createRequestLogger())

    // Authentication middleware (if enabled)
    if (this.config.auth.enabled) {
      this.app.use('/mcp', this.authenticationMiddleware.bind(this))
    }
  }

  /**
   * Setup Express routes
   */
  private setupRoutes(): void {
    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        memoryCount: this.memoryService.getMemoryCount()
      })
    })

    // MCP tools discovery (with caching)
    this.app.get('/mcp/tools', (_req, res) => {
      try {
        // Try cache first
        const cacheKey = 'tools_metadata'
        let toolsMetadata = toolMetadataCache.get(cacheKey)

        if (!toolsMetadata) {
          // Cache miss - generate metadata
          toolsMetadata = getToolsMetadata(this.tools)
          toolMetadataCache.set(cacheKey, toolsMetadata)
        }

        res.json({
          tools: toolsMetadata
        })
      } catch (error) {
        logError('Failed to get tools metadata', error as Error)
        res.status(500).json({
          error: 'Internal server error'
        })
      }
    })

    // MCP request handler
    this.app.post('/mcp', this.handleMCPRequest.bind(this))

    // Error handling
    this.app.use(this.errorHandler.bind(this))
  }

  /**
   * Authentication middleware
   */
  private authenticationMiddleware(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logSecurityEvent('missing_auth_header', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, 'medium')

      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Authentication required'
        },
        id: null
      })
      return
    }

    const token = authHeader.substring(7)

    // Simple token validation (in production, use JWT or similar)
    if (token !== this.config.auth.secretKey) {
      logSecurityEvent('invalid_auth_token', {
        ip: req.ip,
        userAgent: req.get('User-Agent')
      }, 'high')

      res.status(401).json({
        jsonrpc: '2.0',
        error: {
          code: -32001,
          message: 'Invalid authentication token'
        },
        id: null
      })
      return
    }

    next()
  }

  /**
   * Handle MCP requests
   */
  private async handleMCPRequest(req: express.Request, res: express.Response): Promise<void> {
    let requestId: string | number | null = null

    try {
      // Validate MCP request format
      const mcpRequest = validateMCPRequest(req.body)
      requestId = mcpRequest.id

      // Handle different MCP methods
      if (mcpRequest.method === 'tools/list') {
        const response: MCPResponse = {
          jsonrpc: '2.0',
          result: {
            tools: getToolsMetadata(this.tools)
          },
          id: requestId
        }
        res.json(response)
        return
      }

      if (mcpRequest.method === 'tools/call') {
        // Validate tool call request structure
        const toolCallRequest = validateMCPToolCallRequest(req.body)
        const toolName = toolCallRequest.params.name
        const toolParams = toolCallRequest.params.arguments

        const tool = getToolByName(this.tools, toolName)
        if (!tool) {
          throw new ValidationError(`Unknown tool: ${toolName}`)
        }

        // Execute the tool
        const result = await tool.handler(toolParams)

        const response: MCPResponse = {
          jsonrpc: '2.0',
          result,
          id: requestId
        }
        res.json(response)
        return
      }

      // Unknown method
      throw new ValidationError(`Unknown method: ${mcpRequest.method}`)

    } catch (error) {
      const mcpError = this.createMCPError(error as Error)

      const response: MCPResponse = {
        jsonrpc: '2.0',
        error: mcpError,
        id: requestId || 'unknown'
      }

      res.status(400).json(response)
    }
  }

  /**
   * Create MCP error from regular error
   */
  private createMCPError(error: Error): MCPError {
    if (error instanceof MCPServerError) {
      return {
        code: error.code,
        message: error.message,
        data: error.data
      }
    }

    // Default error
    const mcpError: MCPError = {
      code: -32000,
      message: error.message || 'Internal server error'
    }

    if (error.stack) {
      mcpError.data = { stack: error.stack }
    }

    return mcpError
  }

  /**
   * Error handling middleware
   */
  private errorHandler(error: Error, req: express.Request, res: express.Response, next: express.NextFunction): void {
    logError('Unhandled error in MCP server', error, {
      method: req.method,
      url: req.url,
      body: req.body
    })

    if (res.headersSent) {
      return next(error)
    }

    const mcpError = this.createMCPError(error)
    res.status(500).json({
      jsonrpc: '2.0',
      error: mcpError,
      id: null
    })
  }

  /**
   * Validate server configuration
   */
  private validateConfiguration(): void {
    validateTools(this.tools)
    logInfo('MCP Server configuration validated', {
      toolCount: this.tools.length,
      authEnabled: this.config.auth.enabled,
      port: this.config.port
    })
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, this.config.host, () => {
          this.isRunning = true
          logInfo('MCP Server started', {
            host: this.config.host,
            port: this.config.port,
            toolCount: this.tools.length
          })
          resolve()
        })

        this.server.on('error', (error) => {
          logError('Server startup error', error)
          reject(error)
        })

        // Set server timeout
        this.server.timeout = this.config.timeout

      } catch (error) {
        logError('Failed to start MCP server', error as Error)
        reject(error)
      }
    })
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.isRunning = false
          logInfo('MCP Server stopped')
          resolve()
        })
      } else {
        resolve()
      }
    })
  }

  /**
   * Check if server is running
   */
  isServerRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get server port
   */
  getPort(): number {
    if (this.server) {
      const address = this.server.address()
      if (address && typeof address === 'object') {
        return address.port
      }
    }
    return this.config.port
  }

  /**
   * Get available tools
   */
  getTools(): MCPTool[] {
    return this.tools
  }
}

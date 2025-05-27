/**
 * Main server entry point for Memory V2 MCP Server
 */

import { getConfigInstance } from './config'
import { initializeLogger, logInfo, logError, closeLogger } from './logging/logger'
import { MemoryService } from './services/memory-service'
import { MCPServer } from './mcp/server'

// Global instances
let mcpServer: MCPServer | null = null
let memoryService: MemoryService | null = null

/**
 * Initialize all services
 */
async function initializeServices(): Promise<{ mcpServer: MCPServer; memoryService: MemoryService }> {
  try {
    // Load configuration
    const config = getConfigInstance()

    // Initialize logging
    initializeLogger(config.logging)
    logInfo('Starting Memory V2 MCP Server', {
      version: '2.0.0',
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    })

    // Initialize memory service
    memoryService = new MemoryService()
    logInfo('Memory service initialized')

    // Initialize MCP server
    mcpServer = new MCPServer(config, memoryService)
    logInfo('MCP server initialized', {
      toolCount: mcpServer.getTools().length,
      authEnabled: config.auth.enabled
    })

    return { mcpServer, memoryService }

  } catch (error) {
    logError('Failed to initialize services', error as Error)
    throw error
  }
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    const { mcpServer: server } = await initializeServices()

    await server.start()

    logInfo('Memory V2 MCP Server is ready', {
      port: server.getPort(),
      toolsAvailable: server.getTools().map(t => t.name)
    })

    // Setup graceful shutdown
    setupGracefulShutdown(server)

  } catch (error) {
    logError('Failed to start server', error as Error)
    process.exit(1)
  }
}

/**
 * Setup graceful shutdown handlers
 */
function setupGracefulShutdown(server: MCPServer): void {
  const shutdown = async (signal: string) => {
    logInfo(`Received ${signal}, starting graceful shutdown`)

    try {
      // Stop accepting new connections
      await server.stop()
      logInfo('MCP server stopped')

      // Close logger
      await closeLogger()

      logInfo('Graceful shutdown completed')
      process.exit(0)
    } catch (error) {
      logError('Error during shutdown', error as Error)
      process.exit(1)
    }
  }

  // Handle different shutdown signals
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logError('Uncaught exception', error)
    process.exit(1)
  })

  process.on('unhandledRejection', (reason, promise) => {
    logError('Unhandled rejection', new Error(String(reason)), { promise })
    process.exit(1)
  })
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    await startServer()
  } catch (error) {
    console.error('Failed to start Memory V2 MCP Server:', error)
    process.exit(1)
  }
}

// Export for testing
export { initializeServices, mcpServer, memoryService }

// Start server if this file is run directly
if (require.main === module) {
  main()
}

/**
 * Configuration management for the MCP server
 */

import { config } from 'dotenv'
import { z } from 'zod'

// Load environment variables
config()

// Configuration schemas
const AuthConfigSchema = z.object({
  enabled: z.boolean(),
  tokenExpiry: z.number(),
  allowedClients: z.array(z.string()),
  secretKey: z.string().min(32)
})

const LoggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug']),
  format: z.enum(['json', 'simple']),
  file: z.string(),
  maxSize: z.string(),
  maxFiles: z.number()
})

const ServerConfigSchema = z.object({
  port: z.number().min(0).max(65535), // Allow port 0 for automatic assignment
  host: z.string(),
  maxConnections: z.number().min(1),
  timeout: z.number().min(1000),
  auth: AuthConfigSchema,
  logging: LoggingConfigSchema
})

// Configuration interfaces
export interface AuthConfig {
  enabled: boolean
  tokenExpiry: number
  allowedClients: string[]
  secretKey: string
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug'
  format: 'json' | 'simple'
  file: string
  maxSize: string
  maxFiles: number
}

export interface ServerConfig {
  port: number
  host: string
  maxConnections: number
  timeout: number
  auth: AuthConfig
  logging: LoggingConfig
}

// Default configuration
const defaultConfig: ServerConfig = {
  port: 3000,
  host: 'localhost',
  maxConnections: 100,
  timeout: 30000,
  auth: {
    enabled: true,
    tokenExpiry: 3600,
    allowedClients: ['vscode', 'cursor', 'claude-desktop', 'windsurf'],
    secretKey: 'default-secret-key-change-this-in-production-please'
  },
  logging: {
    level: 'info',
    format: 'json',
    file: './logs/mcp-server.log',
    maxSize: '10MB',
    maxFiles: 5
  }
}

// Load configuration from environment
export function loadConfig(): ServerConfig {
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '3000'),
    host: process.env.HOST || 'localhost',
    maxConnections: parseInt(process.env.MAX_CONNECTIONS || '100'),
    timeout: parseInt(process.env.TIMEOUT || '30000'),
    auth: {
      enabled: process.env.AUTH_ENABLED !== 'false',
      tokenExpiry: parseInt(process.env.TOKEN_EXPIRY || '3600'),
      allowedClients: process.env.ALLOWED_CLIENTS?.split(',') || defaultConfig.auth.allowedClients,
      secretKey: process.env.SECRET_KEY || defaultConfig.auth.secretKey
    },
    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      format: (process.env.LOG_FORMAT as any) || 'json',
      file: process.env.LOG_FILE || './logs/mcp-server.log',
      maxSize: process.env.LOG_MAX_SIZE || '10MB',
      maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
    }
  }

  // Validate configuration
  try {
    return ServerConfigSchema.parse(config)
  } catch (error) {
    console.error('Invalid configuration:', error)
    throw new Error('Configuration validation failed')
  }
}

// Load test configuration
export function loadTestConfig(): ServerConfig {
  const testConfig = {
    ...defaultConfig,
    port: 0, // Use random available port for tests
    auth: {
      ...defaultConfig.auth,
      enabled: false // Disable auth for tests
    },
    logging: {
      ...defaultConfig.logging,
      level: 'error' as const, // Reduce log noise in tests
      file: './logs/test-2025-05-27.log'
    }
  }

  // Validate test configuration
  try {
    return ServerConfigSchema.parse(testConfig)
  } catch (error) {
    console.error('Invalid test configuration:', error)
    throw new Error('Test configuration validation failed')
  }
}

// Validate configuration
export function validateConfig(config: unknown): ServerConfig {
  return ServerConfigSchema.parse(config)
}

// Get configuration for specific environment
export function getConfig(env: string = process.env.NODE_ENV || 'development'): ServerConfig {
  switch (env) {
    case 'test':
      return loadTestConfig()
    case 'production':
      const prodConfig = loadConfig()
      // Additional production validations
      if (prodConfig.auth.secretKey === defaultConfig.auth.secretKey) {
        throw new Error('Default secret key detected in production. Please set SECRET_KEY environment variable.')
      }
      return prodConfig
    default:
      return loadConfig()
  }
}

// Export singleton instance
let configInstance: ServerConfig | null = null

export function getConfigInstance(): ServerConfig {
  if (!configInstance) {
    configInstance = getConfig()
  }
  return configInstance
}

// Reset configuration (useful for tests)
export function resetConfig(): void {
  configInstance = null
}

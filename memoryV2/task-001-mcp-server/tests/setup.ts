/**
 * Jest setup file
 * Runs before each test file
 */

import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Polyfill fetch for Node.js tests
if (!global.fetch) {
  global.fetch = require('node-fetch')
}

// Set test environment
process.env.NODE_ENV = 'test'

// Increase timeout for integration tests
jest.setTimeout(30000)

// Mock console methods to reduce noise in tests
const originalConsole = console
global.console = {
  ...originalConsole,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Keep error for debugging
}

// Global test utilities
declare global {
  var testUtils: any
}

global.testUtils = {
  createTestMemory: (overrides = {}) => ({
    content: 'Test memory content',
    type: 'personal',
    tags: ['test'],
    metadata: {
      importance: 5,
      category: 'test',
      source: 'jest'
    },
    ...overrides
  }),

  createMCPRequest: (method: string, params?: object, id: string | number = 1) => ({
    jsonrpc: '2.0' as const,
    method,
    params,
    id
  }),

  delay: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks()
})

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

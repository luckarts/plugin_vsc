/**
 * Jest global setup
 * Runs once before all tests
 */

import { mkdir } from 'fs/promises'
import { join } from 'path'

export default async function globalSetup() {
  console.log('Setting up test environment...')
  
  // Create test directories
  const testDirs = [
    'logs',
    'data/memories',
    'data/vectors',
    'data/backups'
  ]
  
  for (const dir of testDirs) {
    try {
      await mkdir(join(process.cwd(), dir), { recursive: true })
    } catch (error) {
      // Directory might already exist
    }
  }
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'error'
  process.env.AUTH_ENABLED = 'false'
  
  console.log('Test environment setup complete')
}

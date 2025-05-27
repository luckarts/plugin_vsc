/**
 * Jest global teardown
 * Runs once after all tests
 */

export default async function globalTeardown() {
  console.log('Cleaning up test environment...')
  
  // Close any remaining connections
  // Clean up test files if needed
  
  console.log('Test environment cleanup complete')
}

/**
 * Test setup for api-client package
 */

import { vi } from 'vitest'

// Mock environment variables for testing
vi.stubEnv('VITE_SERVERLESS_API_BASE_URL', 'https://test-api.example.com')
vi.stubEnv('VITE_SERVERLESS_API_TIMEOUT', '15000')
vi.stubEnv('VITE_SERVERLESS_API_RETRY_ATTEMPTS', '3')
vi.stubEnv('VITE_SERVERLESS_API_RETRY_DELAY', '1000')
vi.stubEnv('VITE_SERVERLESS_API_MAX_RETRY_DELAY', '10000')
vi.stubEnv('VITE_SERVERLESS_CONNECTION_WARMING', 'true')

// Mock fetch globally
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

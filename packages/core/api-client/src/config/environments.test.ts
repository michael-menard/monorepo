/**
 * Tests for environment configuration
 */

import { describe, it, expect, vi } from 'vitest'
import { getServerlessApiConfig, validateEnvironmentConfig } from './environments'

describe('Environment Configuration', () => {
  it('should load configuration from environment variables', () => {
    const config = getServerlessApiConfig()
    
    expect(config).toEqual({
      baseUrl: 'https://test-api.example.com',
      timeout: 15000,
      retryAttempts: 3,
      retryDelay: 1000,
      maxRetryDelay: 10000,
      connectionWarmingEnabled: true,
    })
  })

  it('should use default values for optional environment variables', () => {
    vi.stubEnv('VITE_SERVERLESS_API_TIMEOUT', '')
    vi.stubEnv('VITE_SERVERLESS_API_RETRY_ATTEMPTS', '')
    
    const config = getServerlessApiConfig()
    
    expect(config.timeout).toBe(15000) // default
    expect(config.retryAttempts).toBe(3) // default
  })

  it('should throw error when base URL is missing', () => {
    vi.stubEnv('VITE_SERVERLESS_API_BASE_URL', '')
    
    expect(() => getServerlessApiConfig()).toThrow(
      'VITE_SERVERLESS_API_BASE_URL environment variable is required'
    )
  })

  it('should throw error when base URL is invalid', () => {
    vi.stubEnv('VITE_SERVERLESS_API_BASE_URL', 'invalid-url')
    
    expect(() => getServerlessApiConfig()).toThrow(
      'Invalid VITE_SERVERLESS_API_BASE_URL'
    )
  })

  it('should validate environment configuration', () => {
    vi.stubEnv('VITE_SERVERLESS_API_BASE_URL', 'https://test-api.example.com')
    
    expect(() => validateEnvironmentConfig()).not.toThrow()
  })
})

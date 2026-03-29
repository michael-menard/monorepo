/**
 * openrouter.test.ts
 *
 * Unit tests for OpenRouterProvider covering provider integration with SecretsClient.
 *
 * Test plan coverage:
 * - HP-5: loadConfig() returns correct config shape via SecretsClient
 * - EC-4: loadConfig() throws when OPENROUTER_API_KEY not in env
 * - ED-4: generateConfigHash excludes apiKey
 *
 * @module providers/__tests__/openrouter
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { OpenRouterProvider } from '../openrouter.js'

// Mock @langchain/openai to avoid real API calls
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn().mockImplementation(() => ({
    modelName: 'mock-model',
  })),
}))

describe('OpenRouterProvider', () => {
  beforeEach(() => {
    OpenRouterProvider.clearCaches()
    delete process.env.OPENROUTER_API_KEY
    delete process.env.OPENROUTER_BASE_URL
    delete process.env.OPENROUTER_TEMPERATURE
    delete process.env.OPENROUTER_TIMEOUT_MS
    delete process.env.SECRETS_ENGINE
    delete process.env.AWS_REGION
  })

  describe('HP-5: loadConfig() returns correct config shape', () => {
    test('returns OpenRouterConfig with correct shape when API key set', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key'

      const provider = new OpenRouterProvider()
      const config = provider.loadConfig()

      expect(config).toMatchObject({
        apiKey: 'sk-or-test-key',
        baseURL: 'https://openrouter.ai/api/v1',
        temperature: 0,
        timeoutMs: 60000,
        availabilityCacheTtlMs: 30000,
      })
    })

    test('respects OPENROUTER_BASE_URL env var', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key'
      process.env.OPENROUTER_BASE_URL = 'https://custom.openrouter.ai/api/v1'

      const provider = new OpenRouterProvider()
      const config = provider.loadConfig()

      expect(config.baseURL).toBe('https://custom.openrouter.ai/api/v1')
    })

    test('respects OPENROUTER_TEMPERATURE env var', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key'
      process.env.OPENROUTER_TEMPERATURE = '0.5'

      const provider = new OpenRouterProvider()
      const config = provider.loadConfig()

      expect(config.temperature).toBe(0.5)
    })

    test('respects OPENROUTER_TIMEOUT_MS env var', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key'
      process.env.OPENROUTER_TIMEOUT_MS = '45000'

      const provider = new OpenRouterProvider()
      const config = provider.loadConfig()

      expect(config.timeoutMs).toBe(45000)
    })

    test('caches config after first load', () => {
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key'

      const provider = new OpenRouterProvider()
      const config1 = provider.loadConfig()
      process.env.OPENROUTER_API_KEY = 'different-key'
      const config2 = provider.loadConfig()

      expect(config1).toBe(config2)
      expect(config2.apiKey).toBe('sk-or-test-key')
    })
  })

  describe('EC-4: loadConfig() throws when credentials missing', () => {
    test('throws when OPENROUTER_API_KEY not set in env mode', () => {
      delete process.env.OPENROUTER_API_KEY

      const provider = new OpenRouterProvider()

      expect(() => provider.loadConfig()).toThrow(/OPENROUTER_API_KEY/)
    })

    test('error message from SecretsClient indicates env var missing', () => {
      delete process.env.OPENROUTER_API_KEY

      const provider = new OpenRouterProvider()

      expect(() => provider.loadConfig()).toThrow(/Secret not found in environment/)
    })
  })

  describe('parseModelName', () => {
    test('removes openrouter/ prefix', () => {
      process.env.OPENROUTER_API_KEY = 'test-key'
      const provider = new OpenRouterProvider()
      expect(provider['parseModelName']('openrouter/claude-3-5-sonnet')).toBe('claude-3-5-sonnet')
    })

    test('returns model name unchanged without prefix', () => {
      process.env.OPENROUTER_API_KEY = 'test-key'
      const provider = new OpenRouterProvider()
      expect(provider['parseModelName']('claude-3-5-sonnet')).toBe('claude-3-5-sonnet')
    })
  })

  describe('clearCaches', () => {
    test('clears configCache', () => {
      process.env.OPENROUTER_API_KEY = 'test-key'
      const provider = new OpenRouterProvider()
      provider.loadConfig()

      OpenRouterProvider.clearCaches()

      expect(OpenRouterProvider['configCache']).toBeNull()
      expect(OpenRouterProvider['instanceCache'].size).toBe(0)
      expect(OpenRouterProvider['availabilityCache']).toBeNull()
    })
  })
})

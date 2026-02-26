/**
 * anthropic.test.ts
 *
 * Unit tests for AnthropicProvider covering provider integration with SecretsClient.
 *
 * Test plan coverage:
 * - HP-4: loadConfig() returns correct config shape via SecretsClient
 * - EC-4: loadConfig() throws when ANTHROPIC_API_KEY not in env
 * - ED-4: generateConfigHash excludes apiKey
 *
 * @module providers/__tests__/anthropic
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { AnthropicProvider } from '../anthropic.js'
import { generateConfigHash } from '../base.js'

// Mock @langchain/anthropic to avoid real API calls
vi.mock('@langchain/anthropic', () => ({
  ChatAnthropic: vi.fn().mockImplementation(() => ({
    modelName: 'mock-model',
  })),
}))

describe('AnthropicProvider', () => {
  beforeEach(() => {
    AnthropicProvider.clearCaches()
    delete process.env.ANTHROPIC_API_KEY
    delete process.env.ANTHROPIC_TEMPERATURE
    delete process.env.ANTHROPIC_TIMEOUT_MS
    delete process.env.SECRETS_ENGINE
    delete process.env.AWS_REGION
  })

  describe('HP-4: loadConfig() returns correct config shape', () => {
    test('returns AnthropicConfig with correct shape when API key set', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

      const provider = new AnthropicProvider()
      const config = provider.loadConfig()

      expect(config).toMatchObject({
        apiKey: 'sk-ant-test-key',
        temperature: 0,
        timeoutMs: 60000,
        availabilityCacheTtlMs: 30000,
      })
    })

    test('respects ANTHROPIC_TEMPERATURE env var', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
      process.env.ANTHROPIC_TEMPERATURE = '0.7'

      const provider = new AnthropicProvider()
      const config = provider.loadConfig()

      expect(config.temperature).toBe(0.7)
    })

    test('respects ANTHROPIC_TIMEOUT_MS env var', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'
      process.env.ANTHROPIC_TIMEOUT_MS = '30000'

      const provider = new AnthropicProvider()
      const config = provider.loadConfig()

      expect(config.timeoutMs).toBe(30000)
    })

    test('caches config after first load', () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key'

      const provider = new AnthropicProvider()
      const config1 = provider.loadConfig()
      process.env.ANTHROPIC_API_KEY = 'different-key'
      const config2 = provider.loadConfig()

      expect(config1).toBe(config2)
      expect(config2.apiKey).toBe('sk-ant-test-key')
    })
  })

  describe('EC-4: loadConfig() throws when credentials missing', () => {
    test('throws when ANTHROPIC_API_KEY not set in env mode', () => {
      delete process.env.ANTHROPIC_API_KEY

      const provider = new AnthropicProvider()

      // SecretsClient env mode throws first
      expect(() => provider.loadConfig()).toThrow(/ANTHROPIC_API_KEY/)
    })

    test('error message indicates secret not found in environment', () => {
      delete process.env.ANTHROPIC_API_KEY

      const provider = new AnthropicProvider()

      expect(() => provider.loadConfig()).toThrow(/Secret not found in environment/)
    })
  })

  describe('ED-4: generateConfigHash excludes apiKey', () => {
    test('two configs with same settings but different apiKey produce the same hash', () => {
      const config1 = { apiKey: 'key-1', temperature: 0, timeoutMs: 60000, model: 'claude-3' }
      const config2 = { apiKey: 'key-2', temperature: 0, timeoutMs: 60000, model: 'claude-3' }

      const hash1 = generateConfigHash(config1)
      const hash2 = generateConfigHash(config2)

      // Same non-apiKey config produces same hash (apiKey excluded)
      expect(hash1).toBe(hash2)
    })

    test('configs with different non-apiKey fields produce different hashes', () => {
      const config1 = { apiKey: 'key-1', temperature: 0, timeoutMs: 60000, model: 'claude-3' }
      const config2 = { apiKey: 'key-1', temperature: 0.5, timeoutMs: 60000, model: 'claude-3' }

      const hash1 = generateConfigHash(config1)
      const hash2 = generateConfigHash(config2)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('parseModelName', () => {
    test('removes anthropic/ prefix', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      const provider = new AnthropicProvider()
      expect(provider['parseModelName']('anthropic/claude-opus-4')).toBe('claude-opus-4')
    })

    test('returns model name unchanged without prefix', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      const provider = new AnthropicProvider()
      expect(provider['parseModelName']('claude-opus-4')).toBe('claude-opus-4')
    })
  })

  describe('clearCaches', () => {
    test('clears all provider caches', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key'
      const provider = new AnthropicProvider()
      provider.loadConfig()

      AnthropicProvider.clearCaches()

      expect(AnthropicProvider['configCache']).toBeNull()
      expect(AnthropicProvider['instanceCache'].size).toBe(0)
      expect(AnthropicProvider['availabilityCache']).toBeNull()
    })
  })
})

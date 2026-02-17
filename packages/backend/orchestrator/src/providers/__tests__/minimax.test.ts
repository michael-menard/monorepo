/**
 * minimax.test.ts
 *
 * Unit tests for MiniMax provider adapter.
 * These tests do not require API credentials and can run in CI.
 *
 * @module providers/__tests__/minimax
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { MinimaxProvider } from '../minimax.js'
import { MinimaxConfigSchema } from '../__types__/minimax.js'
import { getProviderForModel, clearProviderRegistry } from '../index.js'
import { ZodError } from 'zod'

describe('MinimaxProvider', () => {
  beforeEach(() => {
    // Clear all caches before each test
    MinimaxProvider.clearCaches()
    clearProviderRegistry()
    
    // Clear environment variables
    delete process.env.MINIMAX_API_KEY
    delete process.env.MINIMAX_GROUP_ID
    delete process.env.MINIMAX_TEMPERATURE
    delete process.env.MINIMAX_TIMEOUT_MS
  })

  describe('Configuration Schema', () => {
    test('validates correct configuration', () => {
      const config = {
        apiKey: 'test-key',
        groupId: 'test-group',
        temperature: 0.5,
        timeoutMs: 30000,
        availabilityCacheTtlMs: 10000,
      }

      const result = MinimaxConfigSchema.parse(config)
      expect(result).toEqual(config)
    })

    test('validates configuration with only required fields', () => {
      const config = {
        apiKey: 'test-key',
        groupId: 'test-group',
      }

      const result = MinimaxConfigSchema.parse(config)
      expect(result.apiKey).toBe('test-key')
      expect(result.groupId).toBe('test-group')
      expect(result.temperature).toBe(0) // Default
      expect(result.timeoutMs).toBe(60000) // Default
      expect(result.availabilityCacheTtlMs).toBe(30000) // Default
    })

    test('rejects configuration with missing API key', () => {
      const config = {
        groupId: 'test-group',
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })

    test('rejects configuration with missing Group ID', () => {
      const config = {
        apiKey: 'test-key',
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })

    test('rejects configuration with empty API key', () => {
      const config = {
        apiKey: '',
        groupId: 'test-group',
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })

    test('rejects configuration with empty Group ID', () => {
      const config = {
        apiKey: 'test-key',
        groupId: '',
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })

    test('rejects configuration with temperature out of range (too low)', () => {
      const config = {
        apiKey: 'test-key',
        groupId: 'test-group',
        temperature: -0.1,
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })

    test('rejects configuration with temperature out of range (too high)', () => {
      const config = {
        apiKey: 'test-key',
        groupId: 'test-group',
        temperature: 2.1,
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })

    test('rejects configuration with negative timeout', () => {
      const config = {
        apiKey: 'test-key',
        groupId: 'test-group',
        timeoutMs: -1000,
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })

    test('rejects configuration with zero timeout', () => {
      const config = {
        apiKey: 'test-key',
        groupId: 'test-group',
        timeoutMs: 0,
      }

      expect(() => MinimaxConfigSchema.parse(config)).toThrow(ZodError)
    })
  })

  describe('Model Prefix Parsing', () => {
    test('removes minimax/ prefix from model name', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = new MinimaxProvider()
      const parsed = provider['parseModelName']('minimax/abab5.5-chat')

      expect(parsed).toBe('abab5.5-chat')
    })

    test('returns model name unchanged if no prefix', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = new MinimaxProvider()
      const parsed = provider['parseModelName']('abab5.5-chat')

      expect(parsed).toBe('abab5.5-chat')
    })

    test('handles model name with multiple slashes', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = new MinimaxProvider()
      const parsed = provider['parseModelName']('minimax/path/to/model')

      expect(parsed).toBe('path/to/model')
    })
  })

  describe('Configuration Loading', () => {
    test('loads configuration from environment variables', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'
      process.env.MINIMAX_TEMPERATURE = '0.7'
      process.env.MINIMAX_TIMEOUT_MS = '45000'

      const provider = new MinimaxProvider()
      const config = provider.loadConfig()

      expect(config.apiKey).toBe('test-key')
      expect(config.groupId).toBe('test-group')
      expect(config.temperature).toBe(0.7)
      expect(config.timeoutMs).toBe(45000)
      expect(config.availabilityCacheTtlMs).toBe(30000)
    })

    test('uses default values when optional env vars missing', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = new MinimaxProvider()
      const config = provider.loadConfig()

      expect(config.temperature).toBe(0)
      expect(config.timeoutMs).toBe(60000)
      expect(config.availabilityCacheTtlMs).toBe(30000)
    })

    test('throws clear error when API key missing', () => {
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = new MinimaxProvider()

      expect(() => provider.loadConfig()).toThrow(/MINIMAX_API_KEY.*required/)
      expect(() => provider.loadConfig()).toThrow(/Setup instructions/)
    })

    test('throws clear error when Group ID missing', () => {
      process.env.MINIMAX_API_KEY = 'test-key'

      const provider = new MinimaxProvider()

      expect(() => provider.loadConfig()).toThrow(/MINIMAX_GROUP_ID.*required/)
      expect(() => provider.loadConfig()).toThrow(/Setup instructions/)
    })

    test('caches configuration after first load', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = new MinimaxProvider()
      const config1 = provider.loadConfig()
      
      // Change env vars (should not affect cached config)
      process.env.MINIMAX_API_KEY = 'different-key'
      
      const config2 = provider.loadConfig()

      expect(config1).toBe(config2) // Same reference
      expect(config2.apiKey).toBe('test-key') // Original value
    })
  })

  describe('Factory Routing', () => {
    test('routes minimax/* prefix to MinimaxProvider', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = getProviderForModel('minimax/abab5.5-chat')

      expect(provider).toBeInstanceOf(MinimaxProvider)
    })

    test('returns same provider instance for multiple calls', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider1 = getProviderForModel('minimax/abab5.5-chat')
      const provider2 = getProviderForModel('minimax/abab6-chat')

      expect(provider1).toBe(provider2) // Same instance
    })

    test('error message includes minimax in supported providers', () => {
      expect(() => getProviderForModel('unknown/model')).toThrow(/minimax/)
    })
  })

  describe('Cache Management', () => {
    test('clearCaches resets all caches', () => {
      process.env.MINIMAX_API_KEY = 'test-key'
      process.env.MINIMAX_GROUP_ID = 'test-group'

      const provider = new MinimaxProvider()
      provider.loadConfig() // Populate config cache

      MinimaxProvider.clearCaches()

      // Config cache should be cleared
      expect(MinimaxProvider['configCache']).toBeNull()
      expect(MinimaxProvider['instanceCache'].size).toBe(0)
      expect(MinimaxProvider['availabilityCache']).toBeNull()
    })
  })

  describe('Error Messages', () => {
    test('missing credentials error includes setup URL', () => {
      const provider = new MinimaxProvider()

      expect(() => provider.loadConfig()).toThrow(/https:\/\/api\.minimax\.chat/)
    })

    test('missing credentials error includes export commands', () => {
      const provider = new MinimaxProvider()

      expect(() => provider.loadConfig()).toThrow(/export MINIMAX_API_KEY/)
      expect(() => provider.loadConfig()).toThrow(/export MINIMAX_GROUP_ID/)
    })
  })
})

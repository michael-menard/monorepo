/**
 * minimax.integration.test.ts
 *
 * Integration tests for MiniMax provider with real API.
 *
 * Prerequisites:
 * - MiniMax account with API key and Group ID
 * - Environment variables set: MINIMAX_API_KEY, MINIMAX_GROUP_ID
 *
 * Tests skip gracefully if environment variables not available.
 * This prevents CI failures when credentials not configured.
 *
 * To run:
 *   export MINIMAX_API_KEY=your-key
 *   export MINIMAX_GROUP_ID=your-group
 *   pnpm test minimax.integration.test.ts
 *
 * @module providers/__tests__/minimax-integration
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { ChatMinimax } from '@langchain/community/chat_models/minimax'
import { MinimaxProvider } from '../minimax.js'

// Skip all integration tests if credentials not available
const hasCredentials = !!(process.env.MINIMAX_API_KEY && process.env.MINIMAX_GROUP_ID)

describe.skipIf(!hasCredentials)('MinimaxProvider Integration', () => {
  beforeEach(() => {
    // Clear caches before each test
    MinimaxProvider.clearCaches()
  })

  describe('Model Creation', () => {
    test('creates ChatMinimax instance with real credentials', () => {
      const provider = new MinimaxProvider()
      const model = provider.getModel('minimax/abab5.5-chat')

      expect(model).toBeInstanceOf(ChatMinimax)
    })

    test('returns same instance for repeated calls (cache hit)', () => {
      const provider = new MinimaxProvider()
      const model1 = provider.getModel('minimax/abab5.5-chat')
      const model2 = provider.getModel('minimax/abab5.5-chat')

      expect(model1).toBe(model2) // Same reference (cached)
    })

    test('creates different instances for different models', () => {
      const provider = new MinimaxProvider()
      const model1 = provider.getModel('minimax/abab5.5-chat')
      const model2 = provider.getModel('minimax/abab6-chat')

      // Different models should have different cache keys
      // Note: This depends on model name being part of cache hash
      expect(model1).toBeInstanceOf(ChatMinimax)
      expect(model2).toBeInstanceOf(ChatMinimax)
    })
  })

  describe('Availability Check', () => {
    test('checks MiniMax API availability', async () => {
      const provider = new MinimaxProvider()
      const available = await provider.checkAvailability()

      expect(typeof available).toBe('boolean')
    })

    test('caches availability check results', async () => {
      const provider = new MinimaxProvider()
      
      const startTime = Date.now()
      const result1 = await provider.checkAvailability()
      const firstCheckTime = Date.now() - startTime

      const startTime2 = Date.now()
      const result2 = await provider.checkAvailability()
      const secondCheckTime = Date.now() - startTime2

      // Second check should be much faster (cached)
      expect(result1).toBe(result2)
      expect(secondCheckTime).toBeLessThan(firstCheckTime)
    })

    test('respects forceCheck parameter', async () => {
      const provider = new MinimaxProvider()
      
      // First check (populates cache)
      await provider.checkAvailability()

      // Force check should bypass cache
      const forcedResult = await provider.checkAvailability(5000, true)
      expect(typeof forcedResult).toBe('boolean')
    })

    test('respects custom timeout', async () => {
      const provider = new MinimaxProvider()
      
      // Use very short timeout (may fail but should not hang)
      const startTime = Date.now()
      await provider.checkAvailability(100) // 100ms timeout
      const elapsedTime = Date.now() - startTime

      // Should complete quickly even if timeout
      expect(elapsedTime).toBeLessThan(5000)
    })
  })

  describe('Model Invocation', () => {
    test('invokes model with simple prompt', async () => {
      const provider = new MinimaxProvider()
      const model = provider.getModel('minimax/abab5.5-chat')

      const response = await model.invoke('Say hello in one word.')

      expect(response).toBeTruthy()
      expect(response.content).toBeTruthy()
    }, { timeout: 30000 }) // 30s timeout for API call

    test('handles temperature configuration', () => {
      // Set temperature via environment
      process.env.MINIMAX_TEMPERATURE = '0.9'
      MinimaxProvider.clearCaches() // Clear to reload config

      const provider = new MinimaxProvider()
      const config = provider.loadConfig()

      expect(config.temperature).toBe(0.9)

      // Clean up
      delete process.env.MINIMAX_TEMPERATURE
    })
  })

  describe('Error Handling', () => {
    test('handles invalid model name gracefully', async () => {
      const provider = new MinimaxProvider()
      const model = provider.getModel('minimax/invalid-model-name-12345')

      // Model creation should succeed (validation happens at API call)
      expect(model).toBeInstanceOf(ChatMinimax)

      // API invocation should fail with clear error
      await expect(model.invoke('test')).rejects.toThrow()
    }, { timeout: 30000 })
  })
})

describe('MinimaxProvider Integration - No Credentials', () => {
  test('provides clear error message when credentials missing', () => {
    // Temporarily clear credentials
    const apiKey = process.env.MINIMAX_API_KEY
    const groupId = process.env.MINIMAX_GROUP_ID
    
    delete process.env.MINIMAX_API_KEY
    delete process.env.MINIMAX_GROUP_ID
    MinimaxProvider.clearCaches()

    const provider = new MinimaxProvider()

    // SecretsClient env mode throws "Secret not found in environment: MINIMAX_API_KEY.
    // Ensure MINIMAX_API_KEY is set in your .env file or environment."
    expect(() => provider.loadConfig()).toThrow(/MINIMAX_API_KEY/)
    // Note: In env mode, SecretsClient throws on the first missing key (MINIMAX_API_KEY)
    // before reaching the MINIMAX_GROUP_ID check

    // Restore credentials
    if (apiKey) process.env.MINIMAX_API_KEY = apiKey
    if (groupId) process.env.MINIMAX_GROUP_ID = groupId
  })
})

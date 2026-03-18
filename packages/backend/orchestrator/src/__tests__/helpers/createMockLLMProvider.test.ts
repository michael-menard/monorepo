/**
 * createMockLLMProvider.test.ts
 *
 * Self-test (Local Testing Plan) for the createMockLLMProvider factory.
 *
 * These tests verify:
 * - AC-3: Local Testing Plan defined (factory is self-tested here)
 * - AC-2: Interface contract (all ILLMProvider methods are present and vi.fn() spies)
 * - AC-5: vi.hoisted() compliance
 * - AC-6: Test tier scope (unit/integration only)
 *
 * Scope: Unit tests only.
 * Playwright E2E fixtures are explicitly out of scope.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockLLMProvider } from './createMockLLMProvider.js'

describe('createMockLLMProvider', () => {
  describe('interface contract (AC-2)', () => {
    it('returns an object with getModel method', () => {
      const provider = createMockLLMProvider()
      expect(typeof provider.getModel).toBe('function')
    })

    it('returns an object with checkAvailability method', () => {
      const provider = createMockLLMProvider()
      expect(typeof provider.checkAvailability).toBe('function')
    })

    it('returns an object with loadConfig method', () => {
      const provider = createMockLLMProvider()
      expect(typeof provider.loadConfig).toBe('function')
    })

    it('getModel returns a model stub', () => {
      const provider = createMockLLMProvider()
      const model = provider.getModel('openrouter/claude-3-5-sonnet')
      expect(model).toBeDefined()
    })

    it('checkAvailability resolves to true by default', async () => {
      const provider = createMockLLMProvider()
      await expect(provider.checkAvailability()).resolves.toBe(true)
    })

    it('loadConfig returns the default empty config object', () => {
      const provider = createMockLLMProvider()
      expect(provider.loadConfig()).toEqual({})
    })
  })

  describe('vi.fn() spy independence (AC-5)', () => {
    it('each factory call produces independent spies', () => {
      const provider1 = createMockLLMProvider()
      const provider2 = createMockLLMProvider()

      provider1.getModel('openrouter/model-a')
      provider1.getModel('openrouter/model-b')

      expect(provider1.getModel).toHaveBeenCalledTimes(2)
      // provider2 spy is completely independent
      expect(provider2.getModel).toHaveBeenCalledTimes(0)
    })

    it('calls are trackable on getModel spy', () => {
      const provider = createMockLLMProvider()
      provider.getModel('openrouter/claude-3-5-sonnet')
      expect(provider.getModel).toHaveBeenCalledWith('openrouter/claude-3-5-sonnet')
    })

    it('calls are trackable on checkAvailability spy', async () => {
      const provider = createMockLLMProvider()
      await provider.checkAvailability(5000, true)
      expect(provider.checkAvailability).toHaveBeenCalledWith(5000, true)
    })

    it('calls are trackable on loadConfig spy', () => {
      const provider = createMockLLMProvider()
      provider.loadConfig()
      expect(provider.loadConfig).toHaveBeenCalledOnce()
    })
  })

  describe('overrides parameter (AC-2)', () => {
    it('available: false makes checkAvailability resolve to false', async () => {
      const provider = createMockLLMProvider({ available: false })
      await expect(provider.checkAvailability()).resolves.toBe(false)
    })

    it('custom config is returned by loadConfig', () => {
      const customConfig = { apiKey: 'test-key', region: 'us-east-1' }
      const provider = createMockLLMProvider({ config: customConfig })
      expect(provider.loadConfig()).toEqual(customConfig)
    })

    it('custom model is returned by getModel', () => {
      // Create a typed stub that satisfies the BaseChatModel shape for testing
      const customModel = { _llmType: () => 'custom-stub', invoke: vi.fn() }
      const provider = createMockLLMProvider({ model: customModel as never })
      expect(provider.getModel('any/model')).toBe(customModel)
    })
  })

  describe('vi.fn() mock control', () => {
    it('allows mockResolvedValue override on checkAvailability', async () => {
      const provider = createMockLLMProvider()
      vi.mocked(provider.checkAvailability).mockResolvedValue(false)
      await expect(provider.checkAvailability()).resolves.toBe(false)
    })

    it('allows mockReturnValue override on loadConfig', () => {
      const provider = createMockLLMProvider()
      vi.mocked(provider.loadConfig).mockReturnValue({ overridden: true })
      expect(provider.loadConfig()).toEqual({ overridden: true })
    })
  })

  describe('spy reset between tests', () => {
    let provider: ReturnType<typeof createMockLLMProvider>

    beforeEach(() => {
      provider = createMockLLMProvider()
    })

    it('starts with no calls on getModel', () => {
      expect(provider.getModel).toHaveBeenCalledTimes(0)
    })

    it('starts with no calls on checkAvailability', () => {
      expect(provider.checkAvailability).toHaveBeenCalledTimes(0)
    })

    it('starts with no calls on loadConfig', () => {
      expect(provider.loadConfig).toHaveBeenCalledTimes(0)
    })
  })
})

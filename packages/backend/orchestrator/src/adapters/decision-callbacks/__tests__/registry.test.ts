import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DecisionCallbackRegistry } from '../registry.js'
import { CLIDecisionCallback } from '../cli-callback.js'
import { AutoDecisionCallback } from '../auto-callback.js'
import { NoopDecisionCallback } from '../noop-callback.js'
import type { DecisionCallback } from '../types.js'

describe('DecisionCallbackRegistry', () => {
  let registry: DecisionCallbackRegistry
  let originalCli: DecisionCallback
  let originalAuto: DecisionCallback
  let originalNoop: DecisionCallback

  beforeEach(() => {
    // Get singleton instance
    registry = DecisionCallbackRegistry.getInstance()
    // Save original callbacks to restore after tests
    originalCli = registry.get('cli')
    originalAuto = registry.get('auto')
    originalNoop = registry.get('noop')
  })

  afterEach(() => {
    // Restore original callbacks to prevent test pollution
    registry.register('cli', originalCli)
    registry.register('auto', originalAuto)
    registry.register('noop', originalNoop)
  })

  describe('getInstance()', () => {
    it('should return singleton instance', () => {
      const instance1 = DecisionCallbackRegistry.getInstance()
      const instance2 = DecisionCallbackRegistry.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('Built-in callbacks', () => {
    it('should register cli callback on construction', () => {
      const cli = originalCli
      expect(cli).toBeInstanceOf(CLIDecisionCallback)
    })

    it('should register auto callback on construction', () => {
      const auto = originalAuto
      expect(auto).toBeInstanceOf(AutoDecisionCallback)
    })

    it('should register noop callback on construction', () => {
      const noop = originalNoop
      expect(noop).toBeInstanceOf(NoopDecisionCallback)
    })
  })

  describe('register()', () => {
    it('should register custom callback by name', () => {
      const customCallback: DecisionCallback = {
        ask: async (request) => ({
          id: request.id,
          answer: 'custom',
          cancelled: false,
          timedOut: false,
          timestamp: new Date().toISOString(),
        }),
      }

      registry.register('custom', customCallback)
      const retrieved = registry.get('custom')

      expect(retrieved).toBe(customCallback)
    })

    it('should allow overriding built-in callbacks', () => {
      const customCli: DecisionCallback = {
        ask: async (request) => ({
          id: request.id,
          answer: 'overridden',
          cancelled: false,
          timedOut: false,
          timestamp: new Date().toISOString(),
        }),
      }

      registry.register('cli', customCli)
      const retrieved = registry.get('cli')

      expect(retrieved).toBe(customCli)
    })
  })

  describe('get()', () => {
    it('should retrieve registered callback by name', () => {
      const callback = registry.get('cli')
      expect(callback).toBeInstanceOf(CLIDecisionCallback)
    })

    it('should throw error for non-existent callback', () => {
      expect(() => registry.get('invalid')).toThrow(
        "Decision callback 'invalid' not found",
      )
    })

    it('should include callback name in error message', () => {
      const callbackName = 'non-existent-callback'
      expect(() => registry.get(callbackName)).toThrow(callbackName)
    })
  })

  describe('getDefault()', () => {
    it('should return CLI callback by default', () => {
      const defaultCallback = registry.getDefault()
      expect(defaultCallback).toBeInstanceOf(CLIDecisionCallback)
    })

    it('should return same instance as get("cli")', () => {
      const defaultCallback = registry.getDefault()
      const cliCallback = registry.get('cli')
      expect(defaultCallback).toBe(cliCallback)
    })
  })

  describe('Custom callback usage', () => {
    it('should allow using custom callback with DecisionRequest', async () => {
      const mockCallback: DecisionCallback = {
        ask: async (request) => ({
          id: request.id,
          answer: 'mock-answer',
          cancelled: false,
          timedOut: false,
          timestamp: new Date().toISOString(),
        }),
      }

      registry.register('mock', mockCallback)
      const callback = registry.get('mock')

      const response = await callback.ask({
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'single-choice',
        question: 'Test?',
        options: [{ value: 'test', label: 'Test' }],
        timeout_ms: 5000,
      })

      expect(response.answer).toBe('mock-answer')
    })
  })
})

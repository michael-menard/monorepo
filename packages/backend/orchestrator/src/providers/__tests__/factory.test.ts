/**
 * factory.test.ts
 *
 * Unit tests for provider factory.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getProviderForModel, clearProviderRegistry } from '../index.js'
import { OllamaProvider } from '../ollama.js'
import { OpenRouterProvider } from '../openrouter.js'
import { AnthropicProvider } from '../anthropic.js'

describe('Provider Factory', () => {
  beforeEach(() => {
    clearProviderRegistry()
  })

  describe('getProviderForModel', () => {
    it('routes openrouter/* prefix to OpenRouterProvider', () => {
      const provider = getProviderForModel('openrouter/claude-3-5-sonnet')
      expect(provider).toBeInstanceOf(OpenRouterProvider)
    })

    it('routes ollama/* prefix to OllamaProvider', () => {
      const provider = getProviderForModel('ollama/qwen2.5-coder:7b')
      expect(provider).toBeInstanceOf(OllamaProvider)
    })

    it('routes legacy ollama: prefix to OllamaProvider', () => {
      const provider = getProviderForModel('ollama:qwen2.5-coder:7b')
      expect(provider).toBeInstanceOf(OllamaProvider)
    })

    it('routes anthropic/* prefix to AnthropicProvider', () => {
      const provider = getProviderForModel('anthropic/claude-opus-4')
      expect(provider).toBeInstanceOf(AnthropicProvider)
    })

    it('throws error for unsupported provider prefix', () => {
      expect(() => getProviderForModel('unknown/model')).toThrow('Unsupported model format')
      expect(() => getProviderForModel('unknown/model')).toThrow('unknown')
    })

    it('throws error for invalid format (no prefix)', () => {
      expect(() => getProviderForModel('just-a-model-name')).toThrow('Unsupported model format')
    })

    it('caches provider instances', () => {
      const provider1 = getProviderForModel('openrouter/model-a')
      const provider2 = getProviderForModel('openrouter/model-b')
      expect(provider1).toBe(provider2) // Same instance
    })
  })

  describe('clearProviderRegistry', () => {
    it('clears the provider cache', () => {
      const provider1 = getProviderForModel('openrouter/model')
      clearProviderRegistry()
      const provider2 = getProviderForModel('openrouter/model')
      expect(provider1).not.toBe(provider2) // Different instances
    })
  })
})

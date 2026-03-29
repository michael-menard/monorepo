/**
 * pipeline-providers.test.ts
 *
 * Tests for PROVIDER_CHAIN config shape and derived constants.
 * WINT-0250: AC-3 (PROVIDER_CHAIN shape), AC-5 (isExplorationCapable selection)
 *
 * @module config/__tests__/pipeline-providers
 */

import { describe, it, expect } from 'vitest'
import {
  PROVIDER_CHAIN,
  ESCALATION_CHAIN,
  DEFAULT_MODELS,
  DEFAULT_RATE_LIMIT,
  CONFIDENCE_THRESHOLDS,
  ProviderEntrySchema,
} from '../pipeline-providers.js'

describe('PROVIDER_CHAIN config shape (AC-3)', () => {
  it('has three entries: ollama, openrouter, anthropic', () => {
    expect(PROVIDER_CHAIN).toHaveLength(3)
    const names = PROVIDER_CHAIN.map(p => p.name)
    expect(names).toEqual(['ollama', 'openrouter', 'anthropic'])
  })

  it('every entry passes ProviderEntrySchema validation', () => {
    for (const entry of PROVIDER_CHAIN) {
      const result = ProviderEntrySchema.safeParse(entry)
      expect(result.success).toBe(true)
    }
  })

  it('each entry has required fields: name, defaultModel, rateLimits', () => {
    for (const entry of PROVIDER_CHAIN) {
      expect(entry.name).toBeTruthy()
      expect(entry.defaultModel).toBeTruthy()
      expect(entry.rateLimits.capacity).toBeGreaterThan(0)
      expect(entry.rateLimits.refillRate).toBeGreaterThan(0)
      expect(entry.rateLimits.maxWaitMs).toBeGreaterThan(0)
    }
  })

  it('isExplorationCapable defaults to false for non-ollama providers', () => {
    const nonOllama = PROVIDER_CHAIN.filter(p => p.name !== 'ollama')
    for (const entry of nonOllama) {
      expect(entry.isExplorationCapable).toBe(false)
    }
  })
})

describe('isExplorationCapable selection (AC-5)', () => {
  it('ollama is marked as isExplorationCapable=true', () => {
    const ollama = PROVIDER_CHAIN.find(p => p.name === 'ollama')
    expect(ollama).toBeDefined()
    expect(ollama?.isExplorationCapable).toBe(true)
  })

  it('PROVIDER_CHAIN.find(p => p.isExplorationCapable) returns ollama', () => {
    const explorationProvider = PROVIDER_CHAIN.find(p => p.isExplorationCapable)
    expect(explorationProvider).toBeDefined()
    expect(explorationProvider?.name).toBe('ollama')
  })

  it('exactly one provider is exploration-capable', () => {
    const explorationProviders = PROVIDER_CHAIN.filter(p => p.isExplorationCapable)
    expect(explorationProviders).toHaveLength(1)
  })
})

describe('ESCALATION_CHAIN derived from PROVIDER_CHAIN', () => {
  it('contains provider names in order', () => {
    expect(ESCALATION_CHAIN).toEqual(['ollama', 'openrouter', 'anthropic'])
  })

  it('length matches PROVIDER_CHAIN length', () => {
    expect(ESCALATION_CHAIN).toHaveLength(PROVIDER_CHAIN.length)
  })
})

describe('DEFAULT_MODELS derived from PROVIDER_CHAIN', () => {
  it('has a model entry for each provider', () => {
    for (const provider of PROVIDER_CHAIN) {
      expect(DEFAULT_MODELS[provider.name]).toBeDefined()
      expect(DEFAULT_MODELS[provider.name]).toBeTruthy()
    }
  })

  it('ollama model starts with ollama/', () => {
    expect(DEFAULT_MODELS['ollama']).toMatch(/^ollama\//)
  })

  it('openrouter model starts with openrouter/', () => {
    expect(DEFAULT_MODELS['openrouter']).toMatch(/^openrouter\//)
  })

  it('anthropic model starts with anthropic/', () => {
    expect(DEFAULT_MODELS['anthropic']).toMatch(/^anthropic\//)
  })
})

describe('DEFAULT_RATE_LIMIT derived from PROVIDER_CHAIN', () => {
  it('has a rate limit config for each provider', () => {
    for (const provider of PROVIDER_CHAIN) {
      const limits = DEFAULT_RATE_LIMIT[provider.name]
      expect(limits).toBeDefined()
      expect(limits.capacity).toBeGreaterThan(0)
      expect(limits.refillRate).toBeGreaterThan(0)
      expect(limits.maxWaitMs).toBeGreaterThan(0)
    }
  })
})

describe('CONFIDENCE_THRESHOLDS', () => {
  it('has none, low, medium, high keys', () => {
    expect(CONFIDENCE_THRESHOLDS).toHaveProperty('none')
    expect(CONFIDENCE_THRESHOLDS).toHaveProperty('low')
    expect(CONFIDENCE_THRESHOLDS).toHaveProperty('medium')
    expect(CONFIDENCE_THRESHOLDS).toHaveProperty('high')
  })

  it('thresholds are in ascending order', () => {
    expect(CONFIDENCE_THRESHOLDS.none).toBeLessThan(CONFIDENCE_THRESHOLDS.low)
    expect(CONFIDENCE_THRESHOLDS.low).toBeLessThan(CONFIDENCE_THRESHOLDS.medium)
    expect(CONFIDENCE_THRESHOLDS.medium).toBeLessThan(CONFIDENCE_THRESHOLDS.high)
  })

  it('none=0, low=5, medium=10, high=20', () => {
    expect(CONFIDENCE_THRESHOLDS.none).toBe(0)
    expect(CONFIDENCE_THRESHOLDS.low).toBe(5)
    expect(CONFIDENCE_THRESHOLDS.medium).toBe(10)
    expect(CONFIDENCE_THRESHOLDS.high).toBe(20)
  })
})

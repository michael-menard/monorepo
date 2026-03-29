/**
 * model-router-cold-start.test.ts
 *
 * Unit tests for APIP-3070: Cold-start bootstrapping and exploration budget.
 * Tests UT-1 through UT-4, UT-7 through UT-10, UT-12.
 *
 * AC-9: 12 unit tests covering cold-start detection, confidence gate,
 * exploration slot, and cache invalidation behavior.
 *
 * @module pipeline/__tests__/model-router-cold-start
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { BaseMessage } from '@langchain/core/messages'
import { AIMessage } from '@langchain/core/messages'
import { PipelineModelRouter } from '../model-router.js'
import type { AffinityProfile, PipelineDispatchOptions } from '../__types__/index.js'

// ============================================================================
// Mock Helpers
// ============================================================================

function createMockInvoke(
  response: string,
  inputTokens = 100,
  outputTokens = 50,
): (messages: BaseMessage[]) => Promise<AIMessage> {
  return vi.fn().mockResolvedValue(
    new AIMessage({
      content: response,
      usage_metadata: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      },
    }),
  )
}

const makeOptions = (
  overrides: Partial<PipelineDispatchOptions> = {},
): PipelineDispatchOptions => ({
  storyId: 'STORY-001',
  agentId: 'dev-execute-leader',
  messages: [
    { _getType: () => 'human', content: 'Hello', id: '1' },
  ] as unknown as BaseMessage[],
  changeType: 'refactor',
  fileType: '.ts',
  ...overrides,
})

type ProviderResult = { invoke: (messages: BaseMessage[]) => Promise<AIMessage> } | 'fail'
type ProviderMap = Record<string, ProviderResult>

/**
 * Creates a PipelineModelRouter with _getModelInstance stubbed per provider.
 */
function createRouter(
  config: ConstructorParameters<typeof PipelineModelRouter>[0],
  providers: ProviderMap,
): PipelineModelRouter {
  const router = new PipelineModelRouter(config)

  vi.spyOn(router as any, '_getModelInstance').mockImplementation(
    async (provider: string, _modelString: string) => {
      const result = providers[provider]
      if (!result || result === 'fail') {
        throw new Error(`Provider '${provider}' is unavailable`)
      }
      return result
    },
  )

  return router
}

// ============================================================================
// UT-1: Cold-start shortcut — no qualifying profiles → tier 4
// ============================================================================

describe('UT-1: cold-start detection skips tiers 2 and 3 when hasAnyQualifyingProfile returns false', () => {
  beforeEach(() => vi.clearAllMocks())

  it('routes directly to conservative OpenRouter model when in cold-start state', async () => {
    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(null),
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(false),
      },
      {
        ollama: { invoke: createMockInvoke('Ollama response') },
        openrouter: { invoke: createMockInvoke('Conservative OpenRouter response') },
        anthropic: { invoke: createMockInvoke('Anthropic response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    // Should use the conservative OpenRouter model (tier 4 cold-start path)
    expect(result.response).toBe('Conservative OpenRouter response')
    // Affinity reader should NOT have been called
    expect(mockAffinityReader.query).not.toHaveBeenCalled()
  })
})

// ============================================================================
// UT-2: Cold-start flag cached — hasAnyQualifyingProfile called only once
// ============================================================================

describe('UT-2: cold-start flag is cached after first evaluation', () => {
  it('calls hasAnyQualifyingProfile only once across multiple dispatches', async () => {
    const mockHasAnyQualifyingProfile = vi.fn().mockResolvedValue(false)
    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(null),
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
        hasAnyQualifyingProfile: mockHasAnyQualifyingProfile,
      },
      {
        openrouter: { invoke: createMockInvoke('response') },
      },
    )

    await router.dispatch(makeOptions())
    await router.dispatch(makeOptions())
    await router.dispatch(makeOptions())

    expect(mockHasAnyQualifyingProfile).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// UT-3: invalidateAffinityCache() resets cold-start flag
// ============================================================================

describe('UT-3: invalidateAffinityCache() resets the cold-start flag (AC-8)', () => {
  it('re-evaluates hasAnyQualifyingProfile after cache invalidation', async () => {
    const mockHasAnyQualifyingProfile = vi
      .fn()
      .mockResolvedValueOnce(false) // first call: cold-start
      .mockResolvedValueOnce(true)  // second call: profiles now exist

    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue({
        model: 'ollama/qwen2.5-coder:7b',
        success_rate: 0.92,
        avg_cost_usd: 0.001,
        confidence_level: 'high',
        sample_size: 50,
      } as AffinityProfile),
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
        hasAnyQualifyingProfile: mockHasAnyQualifyingProfile,
      },
      {
        ollama: { invoke: createMockInvoke('Ollama affinity response') },
        openrouter: { invoke: createMockInvoke('Conservative response') },
      },
    )

    // First dispatch: cold-start → conservative OpenRouter
    const result1 = await router.dispatch(makeOptions())
    expect(result1.response).toBe('Conservative response')
    expect(mockHasAnyQualifyingProfile).toHaveBeenCalledTimes(1)

    // Invalidate cache (resets cold-start flag)
    router.invalidateAffinityCache()

    // Second dispatch: profiles now exist → affinity routing
    const result2 = await router.dispatch(makeOptions())
    expect(result2.response).toBe('Ollama affinity response')
    expect(mockHasAnyQualifyingProfile).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// UT-4: Confidence gate — 'medium' confidence qualifies for tier 2
// ============================================================================

describe("UT-4: confidence gate accepts 'medium' confidence profiles (AC-3)", () => {
  it("routes via affinity when confidence_level is 'medium' and sample_size meets threshold", async () => {
    const affinityProfile: AffinityProfile = {
      model: 'ollama/qwen2.5-coder:7b',
      success_rate: 0.92,
      avg_cost_usd: 0.001,
      confidence_level: 'medium',
      sample_size: 25,
    }

    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(affinityProfile),
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        affinityMinSampleSize: 20,
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(true),
      },
      {
        ollama: { invoke: createMockInvoke('Medium confidence affinity response') },
        openrouter: { invoke: createMockInvoke('OpenRouter response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    expect(result.response).toBe('Medium confidence affinity response')
  })
})

// ============================================================================
// UT-7: 'low' confidence does NOT qualify for tier 2
// ============================================================================

describe("UT-7: confidence gate rejects 'low' confidence — falls to exploration/tier 4 (AC-3)", () => {
  it("does not route via affinity when confidence_level is 'low'", async () => {
    const affinityProfile: AffinityProfile = {
      model: 'ollama/qwen2.5-coder:7b',
      success_rate: 0.92,
      avg_cost_usd: 0.001,
      confidence_level: 'low',
      sample_size: 50,
    }

    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(affinityProfile),
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        explorationBudgetFraction: 0, // disable exploration so we fall to tier 4
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(true),
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
      },
      {
        ollama: { invoke: createMockInvoke('Ollama response') },
        openrouter: { invoke: createMockInvoke('Conservative fallback response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    // Should fall through to tier 4 (not affinity)
    expect(result.response).toBe('Conservative fallback response')
  })
})

// ============================================================================
// UT-8: Exploration fires when randomFn() < explorationBudgetFraction
// ============================================================================

describe('UT-8: exploration slot fires when randomFn() < explorationBudgetFraction (AC-4)', () => {
  it('routes to Ollama when random roll is below exploration fraction', async () => {
    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(null), // no affinity profile
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        explorationBudgetFraction: 0.1,
        randomFn: () => 0.05, // 5% < 10% → fire exploration
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(true),
      },
      {
        ollama: { invoke: createMockInvoke('Exploration Ollama response') },
        openrouter: { invoke: createMockInvoke('Conservative response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    expect(result.response).toBe('Exploration Ollama response')
  })
})

// ============================================================================
// UT-9: Exploration does NOT fire when randomFn() >= explorationBudgetFraction
// ============================================================================

describe('UT-9: exploration slot does NOT fire when randomFn() >= explorationBudgetFraction (AC-4)', () => {
  it('falls to tier 4 when random roll is at or above exploration fraction', async () => {
    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(null), // no affinity profile
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        explorationBudgetFraction: 0.1,
        randomFn: () => 0.15, // 15% >= 10% → skip exploration
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(true),
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
      },
      {
        ollama: { invoke: createMockInvoke('Ollama response') },
        openrouter: { invoke: createMockInvoke('Conservative tier 4 response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    expect(result.response).toBe('Conservative tier 4 response')
  })
})

// ============================================================================
// UT-10: explorationBudgetFraction = 0.0 disables exploration entirely
// ============================================================================

describe('UT-10: explorationBudgetFraction = 0.0 disables exploration (AC-4)', () => {
  it('never routes to Ollama when exploration fraction is zero', async () => {
    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(null),
    }
    const ollamaInvoke = createMockInvoke('Ollama response')

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        explorationBudgetFraction: 0.0,
        randomFn: () => 0, // would fire if fraction > 0
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(true),
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
      },
      {
        ollama: { invoke: ollamaInvoke },
        openrouter: { invoke: createMockInvoke('Conservative response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    expect(result.response).toBe('Conservative response')
    expect(ollamaInvoke).not.toHaveBeenCalled()
  })
})

// ============================================================================
// UT-12: Exploration skipped when success_rate < floor AND sample_size > 0
// ============================================================================

describe('UT-12: exploration skipped when success_rate < floor and sample_size > 0 (AC-4a)', () => {
  it('skips exploration and falls to tier 4 when affinity entry has bad success rate', async () => {
    const badAffinityProfile: AffinityProfile = {
      model: 'ollama/qwen2.5-coder:7b',
      success_rate: 0.1, // below 0.3 floor
      avg_cost_usd: 0.001,
      confidence_level: 'low', // low confidence — won't pass tier 2 gate
      sample_size: 5, // > 0 so floor check applies
    }

    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(badAffinityProfile),
    }

    const ollamaInvoke = createMockInvoke('Ollama exploration response')

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        explorationBudgetFraction: 1.0, // would always fire without the floor check
        explorationMinSuccessRateFloor: 0.3,
        randomFn: () => 0, // always below fraction
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(true),
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
      },
      {
        ollama: { invoke: ollamaInvoke },
        openrouter: { invoke: createMockInvoke('Conservative response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    // Exploration skipped due to low success_rate floor check → falls to tier 4
    expect(result.response).toBe('Conservative response')
    expect(ollamaInvoke).not.toHaveBeenCalled()
  })

  it('allows exploration when sample_size = 0 regardless of success_rate', async () => {
    const zeroSampleProfile: AffinityProfile = {
      model: 'ollama/qwen2.5-coder:7b',
      success_rate: 0.0, // irrelevant when sample_size = 0
      avg_cost_usd: 0.001,
      confidence_level: 'none',
      sample_size: 0, // = 0 → floor check does NOT apply
    }

    const mockAffinityReader = {
      query: vi.fn().mockResolvedValue(zeroSampleProfile),
    }

    const router = createRouter(
      {
        affinityReader: mockAffinityReader,
        explorationBudgetFraction: 1.0,
        explorationMinSuccessRateFloor: 0.3,
        randomFn: () => 0,
        hasAnyQualifyingProfile: vi.fn().mockResolvedValue(true),
      },
      {
        ollama: { invoke: createMockInvoke('Ollama exploration with zero sample') },
        openrouter: { invoke: createMockInvoke('Conservative response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    expect(result.response).toBe('Ollama exploration with zero sample')
  })
})

// ============================================================================
// No affinityReader: backward compat uses legacy escalation chain
// ============================================================================

describe('backward compat: no affinityReader — uses legacy escalation chain', () => {
  it('routes to Ollama first in legacy mode (no affinityReader)', async () => {
    const router = createRouter(
      {
        conservativeOpenRouterModel: 'openrouter/anthropic/claude-3-haiku',
        // no affinityReader
      },
      {
        ollama: { invoke: createMockInvoke('Legacy Ollama response') },
        openrouter: { invoke: createMockInvoke('OpenRouter response') },
        anthropic: { invoke: createMockInvoke('Anthropic response') },
      },
    )

    const result = await router.dispatch(makeOptions())

    // Legacy mode: tries Ollama first
    expect(result.response).toBe('Legacy Ollama response')
  })
})

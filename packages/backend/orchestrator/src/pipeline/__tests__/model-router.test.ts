/**
 * model-router.test.ts
 *
 * Unit tests for PipelineModelRouter and PipelineModelRouterFactory.
 *
 * Mock strategy: Directly spy on _getModelInstance to return mock BaseChatModel
 * instances without going through the full provider chain.
 *
 * @module pipeline/__tests__/model-router
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { BaseMessage } from '@langchain/core/messages'
import { AIMessage } from '@langchain/core/messages'
import { PipelineModelRouter, PipelineModelRouterFactory } from '../model-router.js'
import {
  BudgetExhaustedError,
  ProviderChainExhaustedError,
  type PipelineDispatchOptions,
  type AffinityProfile,
} from '../__types__/index.js'

// ============================================================================
// Mock Helpers
// ============================================================================

/**
 * Creates a mock invoke function that returns a fixed AIMessage.
 */
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

const makeOptions = (overrides: Partial<PipelineDispatchOptions> = {}): PipelineDispatchOptions => ({
  storyId: 'STORY-001',
  agentId: 'dev-execute-leader',
  messages: [{ _getType: () => 'human', content: 'Hello', id: '1' }] as unknown as BaseMessage[],
  changeType: 'unknown',
  fileType: 'unknown',
  ...overrides,
})

// ============================================================================
// Helper: create a router with _getModelInstance stubbed per provider
// ============================================================================

type ProviderResult = { invoke: (messages: BaseMessage[]) => Promise<AIMessage> } | 'fail'
type ProviderMap = Record<string, ProviderResult>

function createRouterWithProviders(
  providers: ProviderMap,
  hardBudgetCap = 500_000,
): PipelineModelRouter {
  const router = new PipelineModelRouter(hardBudgetCap)

  // Stub _getModelInstance using vi.spyOn
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

/**
 * Helper: create a router with an affinityReader configured.
 */
function createRouterWithAffinity(
  providers: ProviderMap,
  affinityProfile: AffinityProfile | null,
  overrides: { hardBudgetCap?: number; affinitySuccessRateThreshold?: number; affinityMinSampleSize?: number } = {},
): PipelineModelRouter {
  const mockAffinityReader = {
    query: vi.fn().mockResolvedValue(affinityProfile),
  }

  const router = new PipelineModelRouter({
    hardBudgetCap: overrides.hardBudgetCap ?? 500_000,
    affinityReader: mockAffinityReader,
    affinitySuccessRateThreshold: overrides.affinitySuccessRateThreshold,
    affinityMinSampleSize: overrides.affinityMinSampleSize,
  })

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
// Tests
// ============================================================================

describe('PipelineModelRouterFactory', () => {
  afterEach(() => {
    PipelineModelRouterFactory.clearInstance()
  })

  describe('singleton verification', () => {
    it('getInstance() returns the same instance across multiple calls', () => {
      const inst1 = PipelineModelRouterFactory.getInstance()
      const inst2 = PipelineModelRouterFactory.getInstance()
      const inst3 = PipelineModelRouterFactory.getInstance()

      expect(inst1).toBe(inst2)
      expect(inst2).toBe(inst3)
    })

    it('clearInstance() causes next getInstance() to return a new instance', () => {
      const inst1 = PipelineModelRouterFactory.getInstance()
      PipelineModelRouterFactory.clearInstance()
      const inst2 = PipelineModelRouterFactory.getInstance()

      expect(inst1).not.toBe(inst2)
    })
  })
})

describe('PipelineModelRouter.dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // HP-4: Ollama succeeds on first try
  // ============================================================================

  describe('HP-4: Ollama succeeds on first try', () => {
    it('returns response from Ollama when available', async () => {
      const router = createRouterWithProviders({
        ollama: { invoke: createMockInvoke('Ollama response', 100, 50) },
        openrouter: { invoke: createMockInvoke('OpenRouter response') },
        anthropic: { invoke: createMockInvoke('Anthropic response') },
      })

      const result = await router.dispatch(makeOptions())

      expect(result.response).toBe('Ollama response')
      expect(result.inputTokens).toBe(100)
      expect(result.outputTokens).toBe(50)
    })
  })

  // ============================================================================
  // EC-3: Escalation — Ollama fails, OpenRouter succeeds
  // ============================================================================

  describe('EC-3: Escalation — Ollama fails, OpenRouter succeeds', () => {
    it('falls back to OpenRouter when Ollama fails', async () => {
      const router = createRouterWithProviders({
        ollama: 'fail',
        openrouter: { invoke: createMockInvoke('OpenRouter response', 200, 80) },
        anthropic: { invoke: createMockInvoke('Anthropic response') },
      })

      const result = await router.dispatch(makeOptions())

      expect(result.response).toBe('OpenRouter response')
      expect(result.inputTokens).toBe(200)
      expect(result.outputTokens).toBe(80)
    })
  })

  // ============================================================================
  // EC-5: ProviderChainExhaustedError when all fail
  // ============================================================================

  describe('EC-5: all providers fail', () => {
    it('throws ProviderChainExhaustedError when all providers fail', async () => {
      const router = createRouterWithProviders({
        ollama: 'fail',
        openrouter: 'fail',
        anthropic: 'fail',
      })

      await expect(router.dispatch(makeOptions())).rejects.toBeInstanceOf(
        ProviderChainExhaustedError,
      )
    })

    it('ProviderChainExhaustedError includes storyId and all tried providers', async () => {
      const router = createRouterWithProviders({
        ollama: 'fail',
        openrouter: 'fail',
        anthropic: 'fail',
      })

      let caught: unknown
      try {
        await router.dispatch(makeOptions({ storyId: 'STORY-FAIL' }))
      } catch (e) {
        caught = e
      }

      expect(caught).toBeInstanceOf(ProviderChainExhaustedError)
      if (caught instanceof ProviderChainExhaustedError) {
        expect(caught.storyId).toBe('STORY-FAIL')
        expect(caught.providers).toContain('ollama')
        expect(caught.providers).toContain('openrouter')
        expect(caught.providers).toContain('anthropic')
        expect(caught.reasons).toHaveLength(3)
      }
    })
  })

  // ============================================================================
  // Budget accumulation per storyId
  // ============================================================================

  describe('budget accumulation per storyId', () => {
    it('accumulates token usage across multiple dispatches', async () => {
      const router = createRouterWithProviders({
        ollama: { invoke: createMockInvoke('ok', 100, 50) },
      })

      await router.dispatch(makeOptions({ storyId: 'STORY-A' }))
      await router.dispatch(makeOptions({ storyId: 'STORY-A' }))

      expect(router.getStoryUsage('STORY-A')).toBe(300) // 2 × 150
    })

    it('keeps story usage isolated across stories', async () => {
      const router = createRouterWithProviders({
        ollama: { invoke: createMockInvoke('ok', 100, 50) },
      })

      await router.dispatch(makeOptions({ storyId: 'STORY-A' }))
      await router.dispatch(makeOptions({ storyId: 'STORY-B' }))

      expect(router.getStoryUsage('STORY-A')).toBe(150)
      expect(router.getStoryUsage('STORY-B')).toBe(150)
    })
  })

  // ============================================================================
  // EC-1: BudgetExhaustedError at hard cap
  // ============================================================================

  describe('EC-1: BudgetExhaustedError at hard cap', () => {
    it('throws BudgetExhaustedError when story usage exceeds hard cap', async () => {
      // Cap is 400 tokens, each dispatch uses 500 (400+100=500)
      // First dispatch: pre-check 0+0=0 ≤ 400 OK, then records 500 tokens
      // Second dispatch: pre-check 500+0=500 > 400 → throw BudgetExhaustedError
      const router = createRouterWithProviders(
        { ollama: { invoke: createMockInvoke('ok', 400, 100) } },
        400, // hard cap
      )

      await router.dispatch(makeOptions({ storyId: 'STORY-CAP' })) // records 500 tokens

      await expect(
        router.dispatch(makeOptions({ storyId: 'STORY-CAP' })),
      ).rejects.toBeInstanceOf(BudgetExhaustedError)
    })

    it('BudgetExhaustedError has correct storyId and budgetCap fields', async () => {
      const router = createRouterWithProviders(
        { ollama: { invoke: createMockInvoke('ok', 300, 200) } },
        400,
      )
      await router.dispatch(makeOptions({ storyId: 'STORY-CAP2' })) // records 500

      let caught: unknown
      try {
        await router.dispatch(makeOptions({ storyId: 'STORY-CAP2' }))
      } catch (e) {
        caught = e
      }

      expect(caught).toBeInstanceOf(BudgetExhaustedError)
      if (caught instanceof BudgetExhaustedError) {
        expect(caught.storyId).toBe('STORY-CAP2')
        expect(caught.budgetCap).toBe(400)
      }
    })
  })

  // ============================================================================
  // HP-5: DB config override
  // ============================================================================

  describe('HP-5: DB config override', () => {
    it('uses DB assignment model when pattern matches', async () => {
      const router = createRouterWithProviders({
        ollama: { invoke: createMockInvoke('custom model response', 10, 5) },
      })
      await router.loadAssignmentsCache([
        {
          agentPattern: 'dev-execute-leader',
          provider: 'ollama',
          model: 'custom-model:7b',
          tier: 3,
        },
      ])

      const result = await router.dispatch(makeOptions())
      expect(result.response).toBe('custom model response')
    })
  })

  // ============================================================================
  // ED-3: Cache invalidation
  // ============================================================================

  describe('ED-3: cache invalidation', () => {
    it('invalidateAssignmentsCache() clears the DB assignment cache', async () => {
      const router = createRouterWithProviders({
        ollama: { invoke: createMockInvoke('response', 10, 5) },
      })
      await router.loadAssignmentsCache([
        { agentPattern: '*', provider: 'ollama', model: 'special:7b', tier: 3 },
      ])

      router.invalidateAssignmentsCache()

      // After invalidation, falls back to default model (no crash)
      const result = await router.dispatch(makeOptions())
      expect(result).toBeDefined()
      expect(result.response).toBe('response')
    })
  })

  // ============================================================================
  // APIP-3040: Affinity Routing Tests
  // ============================================================================

  describe('HP-1 (AC-1, AC-2, AC-3, AC-7): affinity routing selected when high-confidence profile exists', () => {
    it('uses the affinity model instead of the static fallback chain', async () => {
      const affinityProfile: AffinityProfile = {
        model: 'ollama/qwen2.5-coder:7b',
        success_rate: 0.92,
        avg_cost_usd: 0.001,
        confidence_level: 'high',
        sample_size: 50,
      }

      const router = createRouterWithAffinity(
        {
          ollama: { invoke: createMockInvoke('Affinity model response', 80, 40) },
          openrouter: { invoke: createMockInvoke('OpenRouter response') },
          anthropic: { invoke: createMockInvoke('Anthropic response') },
        },
        affinityProfile,
      )

      const result = await router.dispatch(
        makeOptions({ changeType: 'refactor', fileType: '.ts' }),
      )

      expect(result.response).toBe('Affinity model response')
    })
  })

  describe('HP-2 (AC-3, AC-7): DB override takes precedence over affinity', () => {
    it('uses DB assignment model even when affinity reader is configured', async () => {
      const affinityProfile: AffinityProfile = {
        model: 'openrouter/anthropic/claude-3.5-haiku',
        success_rate: 0.95,
        avg_cost_usd: 0.002,
        confidence_level: 'high',
        sample_size: 100,
      }

      const mockAffinityReader = {
        query: vi.fn().mockResolvedValue(affinityProfile),
      }

      const router = new PipelineModelRouter({
        affinityReader: mockAffinityReader,
      })

      vi.spyOn(router as any, '_getModelInstance').mockImplementation(
        async (_provider: string, _modelString: string) => ({
          invoke: createMockInvoke('DB override response', 10, 5),
        }),
      )

      await router.loadAssignmentsCache([
        {
          agentPattern: 'dev-execute-leader',
          provider: 'ollama',
          model: 'custom-model:7b',
          tier: 3,
        },
      ])

      const result = await router.dispatch(
        makeOptions({ changeType: 'feat', fileType: '.ts' }),
      )

      expect(result.response).toBe('DB override response')
      // Affinity reader should NOT have been called because DB override wins
      expect(mockAffinityReader.query).not.toHaveBeenCalled()
    })
  })

  describe('HP-4-affinity (AC-6): cache populated on first dispatch, reused on second', () => {
    it('calls affinityReader.query only once for the same changeType/fileType pair', async () => {
      const affinityProfile: AffinityProfile = {
        model: 'ollama/qwen2.5-coder:7b',
        success_rate: 0.92,
        avg_cost_usd: 0.001,
        confidence_level: 'high',
        sample_size: 50,
      }

      const mockAffinityReader = {
        query: vi.fn().mockResolvedValue(affinityProfile),
      }

      const router = new PipelineModelRouter({
        affinityReader: mockAffinityReader,
      })

      vi.spyOn(router as any, '_getModelInstance').mockResolvedValue({
        invoke: createMockInvoke('ok', 10, 5),
      })

      await router.dispatch(makeOptions({ changeType: 'refactor', fileType: '.ts' }))
      await router.dispatch(makeOptions({ changeType: 'refactor', fileType: '.ts' }))

      expect(mockAffinityReader.query).toHaveBeenCalledTimes(1)
    })
  })

  describe('EC-1-affinity (AC-13): affinity reader throws → graceful fallback to static chain', () => {
    it('falls back to static escalation chain when affinityReader.query throws', async () => {
      const mockAffinityReader = {
        query: vi.fn().mockRejectedValue(new Error('DB connection failed')),
      }

      const router = new PipelineModelRouter({
        affinityReader: mockAffinityReader,
      })

      vi.spyOn(router as any, '_getModelInstance').mockImplementation(
        async (provider: string, _modelString: string) => {
          if (provider === 'ollama') {
            return { invoke: createMockInvoke('Fallback response', 10, 5) }
          }
          throw new Error(`Provider '${provider}' is unavailable`)
        },
      )

      const result = await router.dispatch(
        makeOptions({ changeType: 'refactor', fileType: '.ts' }),
      )

      // Should not throw; should fall back to static chain
      expect(result.response).toBe('Fallback response')
    })
  })

  describe('EC-2 (AC-4): success_rate below threshold → fallback to static chain', () => {
    it('falls back when profile success_rate is below threshold', async () => {
      const affinityProfile: AffinityProfile = {
        model: 'ollama/qwen2.5-coder:7b',
        success_rate: 0.5, // below 0.85 threshold
        avg_cost_usd: 0.001,
        confidence_level: 'high',
        sample_size: 50,
      }

      const router = createRouterWithAffinity(
        {
          ollama: { invoke: createMockInvoke('Static chain response', 10, 5) },
        },
        affinityProfile,
      )

      const result = await router.dispatch(
        makeOptions({ changeType: 'refactor', fileType: '.ts' }),
      )

      expect(result.response).toBe('Static chain response')
    })
  })

  describe("EC-3-affinity (AC-4, AC-10c): confidence_level 'none' → fallback", () => {
    it("falls back to static chain when confidence_level is 'none'", async () => {
      const affinityProfile: AffinityProfile = {
        model: 'ollama/qwen2.5-coder:7b',
        success_rate: 0.95,
        avg_cost_usd: 0.001,
        confidence_level: 'none',
        sample_size: 50,
      }

      const router = createRouterWithAffinity(
        {
          ollama: { invoke: createMockInvoke('Static fallback', 10, 5) },
        },
        affinityProfile,
      )

      const result = await router.dispatch(
        makeOptions({ changeType: 'refactor', fileType: '.ts' }),
      )

      expect(result.response).toBe('Static fallback')
    })
  })

  describe("EC-4-affinity (AC-4, AC-10c): confidence_level 'low' → fallback", () => {
    it("falls back to static chain when confidence_level is 'low'", async () => {
      const affinityProfile: AffinityProfile = {
        model: 'ollama/qwen2.5-coder:7b',
        success_rate: 0.95,
        avg_cost_usd: 0.001,
        confidence_level: 'low',
        sample_size: 50,
      }

      const router = createRouterWithAffinity(
        {
          ollama: { invoke: createMockInvoke('Static fallback low', 10, 5) },
        },
        affinityProfile,
      )

      const result = await router.dispatch(
        makeOptions({ changeType: 'refactor', fileType: '.ts' }),
      )

      expect(result.response).toBe('Static fallback low')
    })
  })

  describe('EC-5-affinity (AC-4, AC-10b): no matching profile (null) → cold-start fallback', () => {
    it('falls back to static chain when affinityReader returns null', async () => {
      const router = createRouterWithAffinity(
        {
          ollama: { invoke: createMockInvoke('Cold start fallback', 10, 5) },
        },
        null, // no profile in DB
      )

      const result = await router.dispatch(
        makeOptions({ changeType: 'refactor', fileType: '.ts' }),
      )

      expect(result.response).toBe('Cold start fallback')
    })
  })

  describe('ED-1 (AC-8, AC-10g): changeType/fileType default to "unknown"', () => {
    it('queries affinity reader with "unknown", "unknown" when not specified', async () => {
      const mockAffinityReader = {
        query: vi.fn().mockResolvedValue(null),
      }

      const router = new PipelineModelRouter({
        affinityReader: mockAffinityReader,
      })

      vi.spyOn(router as any, '_getModelInstance').mockResolvedValue({
        invoke: createMockInvoke('ok', 10, 5),
      })

      // Dispatch without changeType/fileType (they will default to 'unknown')
      await router.dispatch(makeOptions({ changeType: 'unknown', fileType: 'unknown' }))

      expect(mockAffinityReader.query).toHaveBeenCalledWith(
        'unknown',
        'unknown',
        expect.any(Number),
        expect.any(Number),
      )
    })
  })

  describe('ED-2 (AC-6, AC-10f): invalidateAffinityCache() causes re-query', () => {
    it('calls affinityReader.query twice after cache invalidation', async () => {
      const affinityProfile: AffinityProfile = {
        model: 'ollama/qwen2.5-coder:7b',
        success_rate: 0.92,
        avg_cost_usd: 0.001,
        confidence_level: 'high',
        sample_size: 50,
      }

      const mockAffinityReader = {
        query: vi.fn().mockResolvedValue(affinityProfile),
      }

      const router = new PipelineModelRouter({
        affinityReader: mockAffinityReader,
      })

      vi.spyOn(router as any, '_getModelInstance').mockResolvedValue({
        invoke: createMockInvoke('ok', 10, 5),
      })

      // First dispatch: populates cache, query called once
      await router.dispatch(makeOptions({ changeType: 'refactor', fileType: '.ts' }))
      expect(mockAffinityReader.query).toHaveBeenCalledTimes(1)

      // Invalidate cache
      router.invalidateAffinityCache()

      // Second dispatch: cache cleared, query called again
      await router.dispatch(makeOptions({ changeType: 'refactor', fileType: '.ts' }))
      expect(mockAffinityReader.query).toHaveBeenCalledTimes(2)
    })
  })
})

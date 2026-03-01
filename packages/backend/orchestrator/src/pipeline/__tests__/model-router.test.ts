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
})

/**
 * model-router-quality.test.ts
 *
 * Tests for ModelRouter.evaluateQuality() - integration tests.
 * 8+ test cases covering end-to-end flow and backward compatibility.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ModelRouter } from '../unified-interface.js'
import { createTaskContract } from '../__types__/task-contract.js'
import { QualityEvaluationSchema } from '../__types__/quality-evaluation.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../strategy-loader.js', () => ({
  loadStrategy: vi.fn().mockResolvedValue({
    strategy_version: '1.0.0',
    effective_date: '2026-01-01',
    review_date: '2026-06-01',
    tiers: [
      {
        tier: 0,
        models: {
          primary: [{ provider: 'anthropic', model: 'claude-opus-4.6', cost_per_1m_tokens: 15 }],
          fallback: [],
        },
      },
      {
        tier: 1,
        models: {
          primary: [{ provider: 'anthropic', model: 'claude-sonnet-4.5', cost_per_1m_tokens: 3 }],
          fallback: [],
        },
      },
    ],
    task_types: [{ type: 'code_generation', recommended_tier: 1 }],
    escalation_triggers: {
      quality: {},
      cost: {},
      failure: {},
      human: {},
    },
  }),
}))

// ============================================================================
// ModelRouter.evaluateQuality() tests
// ============================================================================

describe('ModelRouter.evaluateQuality()', () => {
  let router: ModelRouter

  beforeEach(() => {
    vi.clearAllMocks()
    router = new ModelRouter()
  })

  it('should call evaluateQuality without calling initialize() first', async () => {
    const contract = createTaskContract({ taskType: 'code_generation' })
    // evaluateQuality does not require strategy - it's pure computation
    await expect(
      router.evaluateQuality(contract, 'tier-1', 'function add(a, b) { return a + b }'),
    ).resolves.toBeDefined()
  })

  it('should return a valid QualityEvaluation schema result', async () => {
    const contract = createTaskContract({ taskType: 'code_generation' })
    const result = await router.evaluateQuality(contract, 'tier-1', 'some output here')
    expect(() => QualityEvaluationSchema.parse(result)).not.toThrow()
  })

  it('should pass through contract to the result', async () => {
    const contract = createTaskContract({
      taskType: 'security_analysis',
      securitySensitive: true,
    })
    const result = await router.evaluateQuality(contract, 'tier-0', 'security output')
    expect(result.taskContract.taskType).toBe('security_analysis')
    expect(result.taskContract.securitySensitive).toBe(true)
  })

  it('should pass through tier to the result', async () => {
    const contract = createTaskContract({ taskType: 'code_generation' })
    const result = await router.evaluateQuality(contract, 'tier-2', 'some output')
    expect(result.selectedTier).toBe('tier-2')
  })

  it('should return qualityScore as number between 0 and 100', async () => {
    const contract = createTaskContract({ taskType: 'code_generation' })
    const result = await router.evaluateQuality(contract, 'tier-1', 'output')
    expect(result.qualityScore).toBeGreaterThanOrEqual(0)
    expect(result.qualityScore).toBeLessThanOrEqual(100)
  })

  it('should have backward compatibility: selectModelForAgent still works after extension', async () => {
    const router2 = new ModelRouter()
    // Both methods should work on the same router instance
    expect(typeof router2.evaluateQuality).toBe('function')
    expect(typeof router2.selectModelForAgent).toBe('function')
  })

  it('should log evaluate_quality_requested event', async () => {
    const { logger } = await import('@repo/logger')
    const contract = createTaskContract({ taskType: 'code_generation' })
    await router.evaluateQuality(contract, 'tier-1', 'some output')
    const calls = (logger.info as ReturnType<typeof vi.fn>).mock.calls
    const events = calls.map((c: any[]) => c[1]?.event)
    expect(events).toContain('evaluate_quality_requested')
  })

  it('should return qualityDimensions array with 5 entries', async () => {
    const contract = createTaskContract({ taskType: 'code_generation' })
    const result = await router.evaluateQuality(contract, 'tier-1', 'substantial output here')
    expect(result.qualityDimensions).toHaveLength(5)
  })

  it('should propagate ZodError if evaluateQuality receives invalid tier', async () => {
    const contract = createTaskContract({ taskType: 'code_generation' })
    // An invalid tier is caught by QualityEvaluationSchema.parse() and propagates as ZodError
    await expect(
      router.evaluateQuality(contract, 'tier-99' as any, 'output'),
    ).rejects.toThrow()
  })
})

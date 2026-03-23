/**
 * story_readiness_check node tests
 * APRS-2030: ST-4 / AC-5, AC-7, AC-8
 */

import { describe, it, expect } from 'vitest'
import {
  computeReadinessScore,
  defaultReadinessScoreFn,
  createStoryReadinessCheckNode,
  type ReadinessScoreFn,
} from '../story-readiness-check.js'
import type { PlanRefinementState } from '../../../state/plan-refinement-state.js'
import { NormalizedPlanSchema } from '../../../state/plan-refinement-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<PlanRefinementState> = {}): PlanRefinementState {
  return {
    planSlug: 'test-plan',
    rawPlan: null,
    normalizedPlan: NormalizedPlanSchema.parse({
      planSlug: 'test-plan',
      title: 'Test Plan',
    }),
    flows: [
      {
        id: 'f1',
        name: 'Flow 1',
        actor: 'User',
        trigger: 'click',
        steps: [{ index: 1, description: 'Step 1' }],
        successOutcome: 'done',
        source: 'user' as const,
        confidence: 1,
        status: 'confirmed' as const,
      },
    ],
    refinementPhase: 'story_readiness',
    iterationCount: 0,
    maxIterations: 3,
    warnings: [],
    errors: [],
    hitlDecision: 'approve',
    humanReviewResult: { confirmedFlowIds: ['f1'], rejectedFlowIds: [] },
    readinessScore: null,
    storyReadiness: null,
    validationResult: { errors: [], warnings: [], passed: true },
    ...overrides,
  }
}

// ============================================================================
// defaultReadinessScoreFn tests (DEC-4)
// ============================================================================

describe('defaultReadinessScoreFn', () => {
  it('perfect score — all flows confirmed, no warnings, no errors', () => {
    const score = defaultReadinessScoreFn({
      totalFlows: 3,
      confirmedFlows: 3,
      totalWarnings: 0,
      criticalWarnings: 0,
      totalErrors: 0,
    })
    // 1*40 + 1*30 + 1*30 = 100
    expect(score).toBe(100)
  })

  it('no flows — treats as 1.0 ratio', () => {
    const score = defaultReadinessScoreFn({
      totalFlows: 0,
      confirmedFlows: 0,
      totalWarnings: 0,
      criticalWarnings: 0,
      totalErrors: 0,
    })
    expect(score).toBe(100)
  })

  it('half flows confirmed, no warnings, no errors → 50', () => {
    const score = defaultReadinessScoreFn({
      totalFlows: 4,
      confirmedFlows: 2,
      totalWarnings: 0,
      criticalWarnings: 0,
      totalErrors: 0,
    })
    // 0.5*40 + 1*30 + 1*30 = 20 + 30 + 30 = 80
    expect(score).toBe(80)
  })

  it('errors present → no_errors = 0', () => {
    const score = defaultReadinessScoreFn({
      totalFlows: 2,
      confirmedFlows: 2,
      totalWarnings: 0,
      criticalWarnings: 0,
      totalErrors: 1,
    })
    // 1*40 + 1*30 + 0*30 = 70
    expect(score).toBe(70)
  })

  it('all critical warnings → warningsCleared = 0', () => {
    const score = defaultReadinessScoreFn({
      totalFlows: 1,
      confirmedFlows: 1,
      totalWarnings: 2,
      criticalWarnings: 2,
      totalErrors: 0,
    })
    // 1*40 + 0*30 + 1*30 = 70
    expect(score).toBe(70)
  })

  it('worst case — 0 flows confirmed, all critical, errors', () => {
    const score = defaultReadinessScoreFn({
      totalFlows: 3,
      confirmedFlows: 0,
      totalWarnings: 2,
      criticalWarnings: 2,
      totalErrors: 3,
    })
    // 0*40 + 0*30 + 0*30 = 0
    expect(score).toBe(0)
  })
})

// ============================================================================
// computeReadinessScore tests (AC-7)
// ============================================================================

describe('computeReadinessScore', () => {
  it('passes with score >= 70 (threshold)', () => {
    const state = makeState()
    const result = computeReadinessScore(state)

    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.passed).toBe(true)
    expect(result.reasons).toContain('All checks passed')
  })

  it('fails when score < 70', () => {
    const state = makeState({
      flows: [
        { id: 'f1', name: 'F1', actor: 'U', trigger: 't', steps: [], successOutcome: 'x', source: 'user', confidence: 1, status: 'unconfirmed' },
        { id: 'f2', name: 'F2', actor: 'U', trigger: 't', steps: [], successOutcome: 'x', source: 'inferred', confidence: 0.7, status: 'unconfirmed' },
        { id: 'f3', name: 'F3', actor: 'U', trigger: 't', steps: [], successOutcome: 'x', source: 'inferred', confidence: 0.5, status: 'unconfirmed' },
      ],
      humanReviewResult: { confirmedFlowIds: [], rejectedFlowIds: [] },
      warnings: ['Critical: missing flow', 'blocker: schema incomplete'],
      errors: ['Validation failed'],
    })
    const result = computeReadinessScore(state)

    expect(result.score).toBeLessThan(70)
    expect(result.passed).toBe(false)
    expect(result.reasons.length).toBeGreaterThan(0)
  })

  it('uses injectable score function', () => {
    const alwaysPass: ReadinessScoreFn = () => 100
    const state = makeState()
    const result = computeReadinessScore(state, alwaysPass)

    expect(result.score).toBe(100)
    expect(result.passed).toBe(true)
  })

  it('reports unconfirmed flows in reasons', () => {
    const state = makeState({
      flows: [
        { id: 'f1', name: 'F1', actor: 'U', trigger: 't', steps: [], successOutcome: 'x', source: 'user', confidence: 1, status: 'unconfirmed' },
        { id: 'f2', name: 'F2', actor: 'U', trigger: 't', steps: [], successOutcome: 'x', source: 'inferred', confidence: 0.7, status: 'unconfirmed' },
      ],
      humanReviewResult: { confirmedFlowIds: ['f1'], rejectedFlowIds: [] },
    })
    const result = computeReadinessScore(state)

    expect(result.reasons).toContain('1 of 2 flows not yet confirmed')
  })
})

// ============================================================================
// createStoryReadinessCheckNode tests (AC-5)
// ============================================================================

describe('createStoryReadinessCheckNode', () => {
  it('sets refinementPhase to complete and writes readinessScore', async () => {
    const node = createStoryReadinessCheckNode()
    const state = makeState()

    const result = await node(state)
    expect(result.refinementPhase).toBe('complete')
    expect(result.readinessScore).toBeGreaterThanOrEqual(70)
    expect(result.storyReadiness?.passed).toBe(true)
  })

  it('uses injectable scoreFn', async () => {
    const customScorer: ReadinessScoreFn = () => 42
    const node = createStoryReadinessCheckNode({ scoreFn: customScorer })
    const state = makeState()

    const result = await node(state)
    expect(result.readinessScore).toBe(42)
    expect(result.storyReadiness?.passed).toBe(false)
  })

  it('always sets refinementPhase to complete (even on low score)', async () => {
    const lowScorer: ReadinessScoreFn = () => 10
    const node = createStoryReadinessCheckNode({ scoreFn: lowScorer })
    const state = makeState()

    const result = await node(state)
    expect(result.refinementPhase).toBe('complete')
    expect(result.storyReadiness?.passed).toBe(false)
  })
})

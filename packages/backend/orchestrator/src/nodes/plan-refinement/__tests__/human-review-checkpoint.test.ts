/**
 * human_review_checkpoint node tests
 * APRS-2030: ST-2 / AC-2, AC-3, AC-7, AC-9
 */

import { describe, it, expect, vi } from 'vitest'
import {
  routeHiTLDecision,
  createHumanReviewCheckpointNode,
  AutoDecisionCallback,
  type DecisionCallback,
} from '../human-review-checkpoint.js'
import type { PlanRefinementState } from '../../../state/plan-refinement-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<PlanRefinementState> = {}): PlanRefinementState {
  return {
    planSlug: 'test-plan',
    rawPlan: null,
    normalizedPlan: null,
    flows: [],
    refinementPhase: 'human_review',
    iterationCount: 0,
    maxIterations: 3,
    warnings: [],
    errors: [],
    gapFindings: [],
    specialistFindings: [],
    reconciledFindings: [],
    coverageScore: null,
    circuitBreakerOpen: false,
    previousGapCount: 0,
    consecutiveLlmFailures: 0,
    hitlDecision: null,
    humanReviewResult: null,
    readinessScore: null,
    storyReadiness: null,
    validationResult: null,
    ...overrides,
  }
}

// ============================================================================
// routeHiTLDecision tests (AC-7)
// ============================================================================

describe('routeHiTLDecision', () => {
  it('approve → sets refinementPhase to final_validation', () => {
    const result = routeHiTLDecision('approve', {
      confirmedFlowIds: ['f1', 'f2'],
      rejectedFlowIds: [],
    })
    expect(result.hitlDecision).toBe('approve')
    expect(result.refinementPhase).toBe('final_validation')
    expect(result.humanReviewResult?.confirmedFlowIds).toEqual(['f1', 'f2'])
  })

  it('edit → sets refinementPhase to gap_coverage', () => {
    const result = routeHiTLDecision('edit', {
      confirmedFlowIds: ['f1'],
      rejectedFlowIds: ['f2'],
    })
    expect(result.hitlDecision).toBe('edit')
    expect(result.refinementPhase).toBe('gap_coverage')
  })

  it('reject → sets refinementPhase to error with reason', () => {
    const result = routeHiTLDecision('reject', { reason: 'Plan is incomplete' })
    expect(result.hitlDecision).toBe('reject')
    expect(result.refinementPhase).toBe('error')
    expect(result.errors).toContain('Human review rejected: Plan is incomplete')
  })

  it('defer → sets refinementPhase to complete with warning', () => {
    const result = routeHiTLDecision('defer', { reason: 'Waiting for stakeholder input' })
    expect(result.hitlDecision).toBe('defer')
    expect(result.refinementPhase).toBe('complete')
    expect(result.warnings).toContain('Human review deferred: Waiting for stakeholder input')
  })

  it('reject without reason → uses default message', () => {
    const result = routeHiTLDecision('reject')
    expect(result.errors).toContain('Human review rejected: No reason provided')
  })
})

// ============================================================================
// AutoDecisionCallback tests (AC-3)
// ============================================================================

describe('AutoDecisionCallback', () => {
  it('auto-approves when no critical warnings', async () => {
    const result = await AutoDecisionCallback.ask({
      planSlug: 'test',
      flows: [{ id: 'f1', name: 'Flow 1', actor: 'User', trigger: 'click', steps: [], successOutcome: 'done', source: 'user', confidence: 1, status: 'unconfirmed' }],
      warnings: ['minor issue'],
      errors: [],
    })
    expect(result.decision).toBe('approve')
    expect(result.confirmedFlowIds).toEqual(['f1'])
  })

  it('auto-defers when critical warnings present', async () => {
    const result = await AutoDecisionCallback.ask({
      planSlug: 'test',
      flows: [],
      warnings: ['Critical: missing auth flow'],
      errors: [],
    })
    expect(result.decision).toBe('defer')
    expect(result.reason).toContain('critical warnings')
  })

  it('auto-defers on blocker warnings', async () => {
    const result = await AutoDecisionCallback.ask({
      planSlug: 'test',
      flows: [],
      warnings: ['Blocker: DB schema not ready'],
      errors: [],
    })
    expect(result.decision).toBe('defer')
  })
})

// ============================================================================
// createHumanReviewCheckpointNode tests (AC-2)
// ============================================================================

describe('createHumanReviewCheckpointNode', () => {
  it('uses existing hitlDecision from state (soft HiTL resume)', async () => {
    const node = createHumanReviewCheckpointNode()
    const state = makeState({
      hitlDecision: 'approve',
      humanReviewResult: { confirmedFlowIds: ['f1'], rejectedFlowIds: [] },
    })

    const result = await node(state)
    expect(result.hitlDecision).toBe('approve')
    expect(result.refinementPhase).toBe('final_validation')
  })

  it('invokes decision callback when hitlDecision is null', async () => {
    const mockCallback: DecisionCallback = {
      ask: vi.fn().mockResolvedValue({
        decision: 'edit',
        confirmedFlowIds: ['f1'],
        rejectedFlowIds: ['f2'],
      }),
    }

    const node = createHumanReviewCheckpointNode({ decisionCallback: mockCallback })
    const state = makeState({
      flows: [
        { id: 'f1', name: 'Flow 1', actor: 'User', trigger: 'click', steps: [], successOutcome: 'done', source: 'user', confidence: 1, status: 'unconfirmed' },
        { id: 'f2', name: 'Flow 2', actor: 'Admin', trigger: 'schedule', steps: [], successOutcome: 'done', source: 'inferred', confidence: 0.7, status: 'unconfirmed' },
      ],
    })

    const result = await node(state)
    expect(mockCallback.ask).toHaveBeenCalledOnce()
    expect(result.hitlDecision).toBe('edit')
    expect(result.refinementPhase).toBe('gap_coverage')
  })

  it('defaults to AutoDecisionCallback when no callback provided', async () => {
    const node = createHumanReviewCheckpointNode()
    const state = makeState()

    const result = await node(state)
    // AutoDecisionCallback auto-approves with no critical warnings
    expect(result.hitlDecision).toBe('approve')
    expect(result.refinementPhase).toBe('final_validation')
  })

  it('handles callback error gracefully', async () => {
    const mockCallback: DecisionCallback = {
      ask: vi.fn().mockRejectedValue(new Error('Callback timeout')),
    }

    const node = createHumanReviewCheckpointNode({ decisionCallback: mockCallback })
    const state = makeState()

    const result = await node(state)
    expect(result.refinementPhase).toBe('error')
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Callback timeout')]),
    )
  })
})

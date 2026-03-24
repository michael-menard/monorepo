/**
 * final_validation node tests
 * APRS-2030: ST-3 / AC-4, AC-7, AC-9
 */

import { describe, it, expect } from 'vitest'
import { validatePlan, createFinalValidationNode } from '../final-validation.js'
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
    refinementPhase: 'final_validation',
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
    hitlDecision: 'approve',
    humanReviewResult: { confirmedFlowIds: ['f1'], rejectedFlowIds: [] },
    readinessScore: null,
    storyReadiness: null,
    validationResult: null,
    ...overrides,
  }
}

// ============================================================================
// validatePlan tests (AC-7)
// ============================================================================

describe('validatePlan', () => {
  it('passes with valid normalizedPlan and confirmed flows with steps', () => {
    const state = makeState()
    const result = validatePlan(state)

    expect(result.passed).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('fails when normalizedPlan is null', () => {
    const state = makeState({ normalizedPlan: null })
    const result = validatePlan(state)

    expect(result.passed).toBe(false)
    expect(result.errors).toContain('normalizedPlan is null — cannot validate')
  })

  it('fails when confirmed flow has no steps', () => {
    const state = makeState({
      flows: [
        {
          id: 'f1',
          name: 'Empty Flow',
          actor: 'User',
          trigger: 'click',
          steps: [],
          successOutcome: 'done',
          source: 'user' as const,
          confidence: 1,
          status: 'confirmed' as const,
        },
      ],
      humanReviewResult: { confirmedFlowIds: ['f1'], rejectedFlowIds: [] },
    })
    const result = validatePlan(state)

    expect(result.passed).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Empty Flow')]),
    )
  })

  it('adds warnings for critical warnings in state', () => {
    const state = makeState({
      warnings: ['Critical: missing auth flow', 'minor issue'],
    })
    const result = validatePlan(state)

    expect(result.warnings.length).toBe(1)
    expect(result.warnings[0]).toContain('Critical')
    // Still passes if no errors
    expect(result.passed).toBe(true)
  })

  it('passes when no confirmed flows exist (nothing to check)', () => {
    const state = makeState({
      humanReviewResult: { confirmedFlowIds: [], rejectedFlowIds: [] },
    })
    const result = validatePlan(state)

    expect(result.passed).toBe(true)
  })
})

// ============================================================================
// createFinalValidationNode tests (AC-4)
// ============================================================================

describe('createFinalValidationNode', () => {
  it('sets refinementPhase to story_readiness on pass', async () => {
    const node = createFinalValidationNode()
    const state = makeState()

    const result = await node(state)
    expect(result.refinementPhase).toBe('story_readiness')
    expect(result.validationResult?.passed).toBe(true)
  })

  it('sets refinementPhase to error on fail', async () => {
    const node = createFinalValidationNode()
    const state = makeState({ normalizedPlan: null })

    const result = await node(state)
    expect(result.refinementPhase).toBe('error')
    expect(result.validationResult?.passed).toBe(false)
    expect(result.errors?.length).toBeGreaterThan(0)
  })

  it('no mutations to state — returns new objects', async () => {
    const node = createFinalValidationNode()
    const state = makeState()
    const originalPlan = state.normalizedPlan

    await node(state)
    // normalizedPlan should not be modified
    expect(state.normalizedPlan).toBe(originalPlan)
  })
})

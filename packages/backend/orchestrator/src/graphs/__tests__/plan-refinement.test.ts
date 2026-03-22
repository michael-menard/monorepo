/**
 * Plan Refinement Graph tests
 * APRS-2010: ST-5 / AC-7
 * APRS-2020: ST-5 — gap coverage loop integration tests
 * APRS-2030: ST-5 / AC-6, AC-8
 */

import { describe, it, expect, vi } from 'vitest'
import { createPlanRefinementGraph, afterGapCoverage } from '../plan-refinement.js'
import type { LlmAdapterFn } from '../../nodes/plan-refinement/extract-flows.js'
import type { DecisionCallback } from '../../nodes/plan-refinement/human-review-checkpoint.js'

const SAMPLE_MARKDOWN = `
# Test Plan

## Problem Statement

Users cannot organize their flows.

## Proposed Solution

Build a normalize and extract flow pipeline.

## Goals

- Normalize plans
- Extract flows

## Flows

### Flow 1: User Creates Plan

- Actor: Admin
- Trigger: User clicks create
- Steps:
  - Open form
  - Submit
- Success Outcome: Plan created
`

// ============================================================================
// Graph Compilation Tests
// ============================================================================

describe('createPlanRefinementGraph', () => {
  it('compiles without error', () => {
    expect(() => createPlanRefinementGraph()).not.toThrow()
  })

  it('compiles with all adapters provided', () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue([])
    const decisionCallback: DecisionCallback = {
      ask: vi.fn().mockResolvedValue({ decision: 'approve', confirmedFlowIds: [], rejectedFlowIds: [] }),
    }
    expect(() =>
      createPlanRefinementGraph({ llmAdapter, decisionCallback }),
    ).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createPlanRefinementGraph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// Original Routing Tests (APRS-2010 — preserved for backward compat)
// ============================================================================

describe('plan-refinement graph routing (original APRS-2010)', () => {
  it('full invocation completes with auto-approve', async () => {
    const graph = createPlanRefinementGraph()

    const result = await graph.invoke({
      planSlug: 'my-plan',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.normalizedPlan).not.toBeNull()
    expect(result.normalizedPlan?.planSlug).toBe('my-plan')
    expect(Array.isArray(result.flows)).toBe(true)
    expect(result.errors).toEqual([])
    // With AutoDecisionCallback, should auto-approve and complete
    expect(result.hitlDecision).toBe('approve')
    expect(result.refinementPhase).toBe('complete')
  })

  it('normalize_plan sets normalizedPlan before extract_flows runs', async () => {
    // Track call order via flow-writer side effect
    const callOrder: string[] = []

    const llmAdapter: LlmAdapterFn = vi.fn().mockImplementation(async _prompt => {
      callOrder.push('extract_flows:llm')
      return []
    })

    const graph = createPlanRefinementGraph({ llmAdapter })

    const result = await graph.invoke({
      planSlug: 'order-test',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    // normalizedPlan should exist (set by normalize_plan, then used by extract_flows)
    expect(result.normalizedPlan).not.toBeNull()
    // LLM was called (meaning extract_flows ran after normalize_plan)
    expect(callOrder).toContain('extract_flows:llm')
  })

  it('with mocked LLM adapter — inferred flows are in state', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue([
      {
        name: 'Admin Reviews Report',
        actor: 'Admin',
        trigger: 'Daily schedule',
        steps: ['Load report', 'Send email'],
        successOutcome: 'Report sent',
        confidence: 0.7,
      },
    ])

    const graph = createPlanRefinementGraph({ llmAdapter })

    const result = await graph.invoke({
      planSlug: 'llm-test',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    const inferredFlows = result.flows.filter((f: { source: string }) => f.source === 'inferred')
    expect(inferredFlows.length).toBeGreaterThanOrEqual(1)
    expect(inferredFlows[0].confidence).toBe(0.7)
  })

  it('empty rawPlan — completes without error', async () => {
    const graph = createPlanRefinementGraph()

    const result = await graph.invoke({
      planSlug: 'empty-plan',
      rawPlan: null,
    })

    expect(result.normalizedPlan).not.toBeNull()
    expect(result.errors).toEqual([])
    expect(Array.isArray(result.flows)).toBe(true)
  })

  it('graph state contains planSlug throughout', async () => {
    const graph = createPlanRefinementGraph()

    const result = await graph.invoke({
      planSlug: 'slug-check',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.planSlug).toBe('slug-check')
    expect(result.normalizedPlan?.planSlug).toBe('slug-check')
  })
})

// ============================================================================
// afterGapCoverage Unit Tests
// ============================================================================

describe('afterGapCoverage', () => {
  const baseState = {
    planSlug: 'test',
    rawPlan: null,
    normalizedPlan: null,
    flows: [],
    refinementPhase: 'gap_coverage' as const,
    iterationCount: 1,
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
  }

  it('returns human_review_checkpoint when refinementPhase is complete', () => {
    const state = { ...baseState, refinementPhase: 'complete' as const }
    expect(afterGapCoverage(state)).toBe('human_review_checkpoint')
  })

  it('returns human_review_checkpoint when iterationCount >= maxIterations', () => {
    const state = { ...baseState, iterationCount: 3, maxIterations: 3 }
    expect(afterGapCoverage(state)).toBe('human_review_checkpoint')
  })

  it('returns human_review_checkpoint when circuitBreakerOpen is true', () => {
    const state = { ...baseState, circuitBreakerOpen: true }
    expect(afterGapCoverage(state)).toBe('human_review_checkpoint')
  })

  it('returns human_review_checkpoint on convergence (delta < 0.05)', () => {
    // previousGapCount=10, currentCount=10 → delta=0 < 0.05
    const state = { ...baseState, previousGapCount: 10, gapFindings: Array(10).fill({}) as any[] }
    expect(afterGapCoverage(state)).toBe('human_review_checkpoint')
  })

  it('returns coverage_agent when gaps exist and no exit condition met', () => {
    // iterationCount=1 < maxIterations=3, not open, phase not complete
    const state = {
      ...baseState,
      iterationCount: 1,
      gapFindings: [{ id: 'gap-1' } as any],
      previousGapCount: 0,
    }
    expect(afterGapCoverage(state)).toBe('coverage_agent')
  })
})

// ============================================================================
// Gap Coverage Loop Integration Tests (APRS-2020)
// ============================================================================

describe('gap coverage loop (APRS-2020)', () => {
  it('runs gap coverage loop with coverage + specialist + reconciliation', async () => {
    let callCount = 0
    const coverageAdapter = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 1)
        return [
          {
            id: 'gap-1',
            type: 'coverage',
            description: 'Missing error handling',
            severity: 'medium',
            sourceFlowIds: [],
            relatedAcIds: [],
          },
        ]
      return [] // second iteration finds no new gaps
    })
    const uxSpecialist = vi.fn().mockResolvedValue([
      {
        id: 'sf-1',
        gapId: 'gap-1',
        specialistType: 'ux',
        analysis: 'Error state UX needed',
        recommendation: 'Add error boundary',
        severity: 'medium',
        confidence: 0.8,
      },
    ])

    const graph = createPlanRefinementGraph({ coverageAdapter, uxSpecialist })
    const result = await graph.invoke({ planSlug: 'loop-test', rawPlan: { content: SAMPLE_MARKDOWN } })

    expect(result.coverageScore).not.toBeNull()
    expect(result.gapFindings.length).toBeGreaterThanOrEqual(1)
    expect(result.errors).toEqual([])
  })

  it('terminates at maxIterations boundary', async () => {
    const coverageAdapter = vi.fn().mockResolvedValue([
      {
        id: 'gap-1',
        type: 'coverage',
        description: 'Persistent gap',
        severity: 'high',
        sourceFlowIds: [],
        relatedAcIds: [],
      },
    ])

    const graph = createPlanRefinementGraph({ coverageAdapter })
    const result = await graph.invoke({
      planSlug: 'boundary-test',
      rawPlan: { content: SAMPLE_MARKDOWN },
      maxIterations: 3,
    })

    expect(result.iterationCount).toBeLessThanOrEqual(3)
    // Graph should have terminated, not looped forever
    expect(result.errors).toEqual([])
  })

  it('circuit breaker opens after consecutive failures', async () => {
    // Circuit breaker opens after consecutiveLlmFailures >= 2.
    // Seed consecutiveLlmFailures=1 so a single adapter failure triggers it.
    const coverageAdapter = vi.fn().mockRejectedValue(new Error('LLM timeout'))

    const graph = createPlanRefinementGraph({ coverageAdapter })
    const result = await graph.invoke({
      planSlug: 'cb-test',
      rawPlan: { content: SAMPLE_MARKDOWN },
      consecutiveLlmFailures: 1,
    })

    expect(result.circuitBreakerOpen).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('no gaps found exits immediately with complete phase', async () => {
    const coverageAdapter = vi.fn().mockResolvedValue([])

    const graph = createPlanRefinementGraph({ coverageAdapter })
    const result = await graph.invoke({ planSlug: 'no-gaps', rawPlan: { content: SAMPLE_MARKDOWN } })

    expect(result.coverageScore).toBe(1.0)
    expect(result.reconciledFindings).toEqual([])
  })

  it('no gap coverage adapters — graph completes without error', async () => {
    const graph = createPlanRefinementGraph()
    const result = await graph.invoke({ planSlug: 'no-adapters', rawPlan: { content: SAMPLE_MARKDOWN } })

    expect(result.errors).toEqual([])
    expect(result.coverageScore).toBe(1.0)
  })
})

// ============================================================================
// APRS-2030 Routing Tests — AC-6: all new conditional edges
// ============================================================================

describe('plan-refinement graph routing (APRS-2030)', () => {
  it('approve flow: gap_coverage → human_review → final_validation → story_readiness → END', async () => {
    const decisionCallback: DecisionCallback = {
      ask: vi.fn().mockResolvedValue({
        decision: 'approve',
        confirmedFlowIds: ['flow-user-1'],
        rejectedFlowIds: [],
      }),
    }

    const graph = createPlanRefinementGraph({ decisionCallback })
    const result = await graph.invoke({
      planSlug: 'approve-flow',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.hitlDecision).toBe('approve')
    expect(result.validationResult?.passed).toBe(true)
    expect(result.storyReadiness).not.toBeNull()
    expect(result.readinessScore).toBeGreaterThanOrEqual(0)
    expect(result.refinementPhase).toBe('complete')
  })

  it('reject flow: human_review → END with error', async () => {
    const decisionCallback: DecisionCallback = {
      ask: vi.fn().mockResolvedValue({
        decision: 'reject',
        reason: 'Plan is not viable',
      }),
    }

    const graph = createPlanRefinementGraph({ decisionCallback })
    const result = await graph.invoke({
      planSlug: 'reject-flow',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.hitlDecision).toBe('reject')
    expect(result.refinementPhase).toBe('error')
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Plan is not viable')]),
    )
    // Should NOT reach final_validation or story_readiness
    expect(result.validationResult).toBeNull()
    expect(result.storyReadiness).toBeNull()
  })

  it('defer flow: human_review → END with complete + warning', async () => {
    const decisionCallback: DecisionCallback = {
      ask: vi.fn().mockResolvedValue({
        decision: 'defer',
        reason: 'Waiting for stakeholder',
      }),
    }

    const graph = createPlanRefinementGraph({ decisionCallback })
    const result = await graph.invoke({
      planSlug: 'defer-flow',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.hitlDecision).toBe('defer')
    expect(result.refinementPhase).toBe('complete')
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('deferred')]),
    )
    expect(result.validationResult).toBeNull()
  })

  it('edit flow: human_review → extract_flows (DEC-6 stub) → human_review again', async () => {
    // First call: edit. Second call: approve (to avoid infinite loop).
    let callCount = 0
    const decisionCallback: DecisionCallback = {
      ask: vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) {
          return { decision: 'edit', confirmedFlowIds: [], rejectedFlowIds: [] }
        }
        return { decision: 'approve', confirmedFlowIds: ['flow-user-1'], rejectedFlowIds: [] }
      }),
    }

    const graph = createPlanRefinementGraph({ decisionCallback })
    const result = await graph.invoke({
      planSlug: 'edit-flow',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    // Should have gone through edit → extract_flows → gap_coverage → human_review → approve → final_validation → readiness → complete
    expect(callCount).toBe(2)
    expect(result.hitlDecision).toBe('approve')
    expect(result.refinementPhase).toBe('complete')
  })

  it('final_validation failure → END with error (does not reach story_readiness)', async () => {
    // Approve with confirmed flow that has no steps → validation fails
    const decisionCallback: DecisionCallback = {
      ask: vi.fn().mockResolvedValue({
        decision: 'approve',
        confirmedFlowIds: ['flow-user-1'],
        rejectedFlowIds: [],
      }),
    }

    // Use rawPlan with a flow that will parse as having no steps
    const noStepsPlan = `
# Minimal Plan

## Problem Statement
Test

## Proposed Solution
Test

## Flows

- Basic Flow
`

    const graph = createPlanRefinementGraph({ decisionCallback })
    const result = await graph.invoke({
      planSlug: 'validation-fail',
      rawPlan: { content: noStepsPlan },
    })

    expect(result.hitlDecision).toBe('approve')
    // The confirmed flow-user-1 has no steps → validation should fail
    expect(result.validationResult?.passed).toBe(false)
    expect(result.refinementPhase).toBe('error')
    expect(result.storyReadiness).toBeNull()
  })
})

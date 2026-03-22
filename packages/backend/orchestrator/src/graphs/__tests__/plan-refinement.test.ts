/**
 * Plan Refinement Graph tests
 * APRS-2010: ST-5 / AC-7
 * APRS-2030: ST-5 / AC-6, AC-8
 */

import { describe, it, expect, vi } from 'vitest'
import { createPlanRefinementGraph } from '../plan-refinement.js'
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
// APRS-2030 Routing Tests — AC-6: all new conditional edges
// ============================================================================

describe('plan-refinement graph routing (APRS-2030)', () => {
  it('approve flow: extract_flows → human_review → final_validation → story_readiness → END', async () => {
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

    // Should have gone through edit → extract_flows → human_review → approve → final_validation → readiness → complete
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

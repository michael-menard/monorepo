/**
 * Plan Refinement Graph tests
 * APRS-2010: ST-5 / AC-7
 */

import { describe, it, expect, vi } from 'vitest'
import { createPlanRefinementGraph } from '../plan-refinement.js'
import type { LlmAdapterFn } from '../../nodes/plan-refinement/extract-flows.js'

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

  it('compiles with adapters provided', () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue([])
    expect(() => createPlanRefinementGraph({ llmAdapter })).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createPlanRefinementGraph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// Routing Tests (START -> normalize_plan -> extract_flows -> END)
// ============================================================================

describe('plan-refinement graph routing', () => {
  it('START -> normalize_plan -> extract_flows -> END: full invocation completes', async () => {
    const graph = createPlanRefinementGraph()

    const result = await graph.invoke({
      planSlug: 'my-plan',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    // After full run, normalizedPlan should be populated
    expect(result.normalizedPlan).not.toBeNull()
    expect(result.normalizedPlan?.planSlug).toBe('my-plan')
    expect(result.normalizedPlan?.title).toBe('Test Plan')
    // flows array initialized (may be empty without LLM adapter)
    expect(Array.isArray(result.flows)).toBe(true)
    // No errors
    expect(result.errors).toEqual([])
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

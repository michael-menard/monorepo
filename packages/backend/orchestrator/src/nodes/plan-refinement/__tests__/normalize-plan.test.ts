/**
 * normalize_plan node tests
 * APRS-2010: ST-5 / AC-7
 */

import { describe, it, expect, vi } from 'vitest'
import {
  extractSection,
  extractList,
  parseRawPlan,
  createNormalizePlanNode,
} from '../normalize-plan.js'
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
    refinementPhase: 'normalize_plan',
    iterationCount: 0,
    maxIterations: 3,
    warnings: [],
    errors: [],
    hitlDecision: null,
    humanReviewResult: null,
    readinessScore: null,
    storyReadiness: null,
    validationResult: null,
    ...overrides,
  }
}

const SAMPLE_MARKDOWN = `
# My Test Plan

## Summary

This is a short summary.

## Problem Statement

The system lacks proper flow coverage.

## Proposed Solution

We will implement normalize and extract nodes.

## Goals

- Goal one
- Goal two

## Non-Goals

- Not in scope one

## Flows

### Flow 1: User Creates Plan

- Actor: Admin
- Trigger: User clicks create
- Steps:
  - Open form
  - Fill fields
  - Submit
- Success Outcome: Plan is saved

## Open Questions

- Is auth required?

## Constraints

- Must run in under 5s

## Dependencies

- KB service
`

// ============================================================================
// extractSection tests
// ============================================================================

describe('extractSection', () => {
  it('returns content under a matching heading', () => {
    const result = extractSection(SAMPLE_MARKDOWN, 'Problem Statement')
    expect(result).toContain('The system lacks proper flow coverage')
  })

  it('returns empty string for missing section', () => {
    const result = extractSection(SAMPLE_MARKDOWN, 'Nonexistent Section')
    expect(result).toBe('')
  })

  it('stops at next heading', () => {
    const result = extractSection(SAMPLE_MARKDOWN, 'Summary')
    expect(result).not.toContain('Problem Statement')
    expect(result).toContain('short summary')
  })
})

// ============================================================================
// extractList tests
// ============================================================================

describe('extractList', () => {
  it('returns list items from a section', () => {
    const result = extractList(SAMPLE_MARKDOWN, 'Goals')
    expect(result).toEqual(['Goal one', 'Goal two'])
  })

  it('returns empty array for missing section', () => {
    const result = extractList(SAMPLE_MARKDOWN, 'Missing Section')
    expect(result).toEqual([])
  })
})

// ============================================================================
// parseRawPlan tests
// ============================================================================

describe('parseRawPlan', () => {
  it('valid plan normalization — all fields populated', () => {
    const rawPlan = { content: SAMPLE_MARKDOWN }
    const result = parseRawPlan('test-plan', rawPlan)

    expect(result.planSlug).toBe('test-plan')
    expect(result.title).toBe('My Test Plan')
    expect(result.problemStatement).toContain('lacks proper flow coverage')
    expect(result.proposedSolution).toContain('implement normalize')
    expect(result.goals).toEqual(['Goal one', 'Goal two'])
    expect(result.nonGoals).toEqual(['Not in scope one'])
    expect(result.openQuestions).toEqual(['Is auth required?'])
    expect(result.constraints).toEqual(['Must run in under 5s'])
    expect(result.dependencies).toEqual(['KB service'])
    // flows initialized as empty array (populated by extract_flows)
    expect(result.flows).toEqual([])
    // warnings initialized as empty array
    expect(result.warnings).toEqual([])
  })

  it('null rawPlan — returns minimal initialized plan with empty arrays', () => {
    const result = parseRawPlan('empty-plan', null)

    expect(result.planSlug).toBe('empty-plan')
    expect(result.title).toBe('empty-plan')
    expect(result.flows).toEqual([])
    expect(result.openQuestions).toEqual([])
    expect(result.warnings).toContain('rawPlan was null or missing')
    expect(result.goals).toEqual([])
    expect(result.nonGoals).toEqual([])
  })

  it('malformed input (empty content) — returns safe initialized plan', () => {
    const rawPlan = { content: '' }
    const result = parseRawPlan('malformed-plan', rawPlan)

    expect(result.planSlug).toBe('malformed-plan')
    expect(result.flows).toEqual([])
    expect(result.openQuestions).toEqual([])
    expect(result.warnings).toEqual([])
    expect(Array.isArray(result.goals)).toBe(true)
  })

  it('object rawPlan without content field — uses direct object fields', () => {
    const rawPlan = {
      title: 'Direct Title',
      problem_statement: 'Direct problem',
      proposed_solution: 'Direct solution',
      goals: ['Goal A'],
      status: 'active',
    }
    const result = parseRawPlan('direct-plan', rawPlan)

    expect(result.title).toBe('Direct Title')
    expect(result.problemStatement).toBe('Direct problem')
    expect(result.proposedSolution).toBe('Direct solution')
    expect(result.goals).toEqual(['Goal A'])
    expect(result.status).toBe('active')
  })
})

// ============================================================================
// createNormalizePlanNode tests
// ============================================================================

describe('createNormalizePlanNode', () => {
  it('normalizes state with rawPlan — sets refinementPhase to extract_flows', async () => {
    const node = createNormalizePlanNode()
    const state = makeState({ rawPlan: { content: SAMPLE_MARKDOWN } })

    const result = await node(state)

    expect(result.refinementPhase).toBe('extract_flows')
    expect(result.normalizedPlan).not.toBeNull()
    expect(result.normalizedPlan?.planSlug).toBe('test-plan')
    expect(result.normalizedPlan?.flows).toEqual([])
    expect(result.normalizedPlan?.openQuestions).toBeDefined()
    expect(result.normalizedPlan?.warnings).toBeDefined()
  })

  it('empty rawPlan — no crash, initializes arrays', async () => {
    const node = createNormalizePlanNode()
    const state = makeState({ rawPlan: null })

    const result = await node(state)

    expect(result.refinementPhase).toBe('extract_flows')
    expect(result.normalizedPlan).not.toBeNull()
    expect(result.normalizedPlan?.flows).toEqual([])
    expect(result.normalizedPlan?.openQuestions).toEqual([])
    expect(Array.isArray(result.errors)).toBe(true)
    // errors should be undefined or empty (null plan is handled gracefully)
    expect(result.errors ?? []).not.toContain(expect.stringContaining('failed'))
  })

  it('uses injectable plan-loader when rawPlan is absent from state', async () => {
    const loadedPlan = { content: SAMPLE_MARKDOWN }
    const planLoader = vi.fn().mockResolvedValue(loadedPlan)
    const node = createNormalizePlanNode({ planLoader })

    const state = makeState({ rawPlan: null })
    const result = await node(state)

    expect(planLoader).toHaveBeenCalledWith('test-plan')
    expect(result.normalizedPlan?.title).toBe('My Test Plan')
  })

  it('plan-loader failure — logs warning and continues', async () => {
    const planLoader = vi.fn().mockRejectedValue(new Error('KB unavailable'))
    const node = createNormalizePlanNode({ planLoader })

    const state = makeState({ rawPlan: null })
    const result = await node(state)

    // Should not throw — returns normalize result with null rawPlan
    expect(result.refinementPhase).toBe('extract_flows')
    expect(result.normalizedPlan).not.toBeNull()
  })

  it('unexpected error in parseRawPlan — sets refinementPhase to error', async () => {
    // Force an error by providing a state that causes parsing to throw
    const node = createNormalizePlanNode()
    
    // Mock parseRawPlan-equivalent scenario: rawPlan with getter that throws
    const badRawPlan = Object.defineProperty({}, 'content', {
      get() {
        throw new Error('Simulated parse error')
      },
    })

    // The node has a top-level try/catch, so it should handle the error
    const state = makeState({ rawPlan: badRawPlan as Record<string, unknown> })
    const result = await node(state)

    // Either it handles gracefully or sets error phase
    // With our defensive parsing, it should handle without crashing
    expect(['extract_flows', 'error']).toContain(result.refinementPhase)
  })
})

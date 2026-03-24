/**
 * Integration test: graph.invoke() with bridged CLI adapter
 *
 * Verifies the full wire from createCLIDecisionCallbackAdapter through
 * createPlanRefinementGraph with a stub planLoader, covering all 4 HiTL outcomes.
 *
 * AC-3: Integration test with graph.invoke()
 * APRS-5040: ST-4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCLIDecisionCallbackAdapter } from '../cli-decision-callback-adapter.js'
import { createPlanRefinementGraph } from '../../../graphs/plan-refinement.js'
import type { PlanLoaderFn } from '../../../nodes/plan-refinement/normalize-plan.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock inquirer so tests don't require interactive terminal
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

import inquirer from 'inquirer'

// ============================================================================
// Stub Plan Loader
// ============================================================================

/**
 * Stub planLoader: returns a minimal raw plan object.
 * INJECTION POINT: Replace with MCP client call in production.
 */
const stubPlanLoader: PlanLoaderFn = async _planSlug => {
  return {
    content: `
# Test Plan

## Problem Statement

Users cannot manage their workflow flows.

## Proposed Solution

Build a plan refinement pipeline with HiTL review.

## Goals

- Normalize plans
- Extract flows
- Human review checkpoint

## Flows

### Flow 1: Admin Creates Plan

- Actor: Admin
- Trigger: User clicks create
- Steps:
  - Open form
  - Fill details
  - Submit
- Success Outcome: Plan created and saved

### Flow 2: User Reviews Plan

- Actor: User
- Trigger: Plan notification received
- Steps:
  - Open plan
  - Review flows
  - Approve or reject
- Success Outcome: Plan reviewed
`,
  }
}

// ============================================================================
// Sample Plan State (for direct invoke)
// ============================================================================

const SAMPLE_MARKDOWN = `
# Integration Test Plan

## Problem Statement

Integration test for CLI adapter wiring.

## Proposed Solution

Wire the CLI adapter to the graph.

## Goals

- Test full wire from CLI adapter through graph.invoke()

## Flows

### Flow 1: User Creates Story

- Actor: Developer
- Trigger: Plan approved
- Steps:
  - Open KB
  - Create story
  - Assign to sprint
- Success Outcome: Story created in KB
`

// ============================================================================
// Integration Tests
// ============================================================================

describe('createCLIDecisionCallbackAdapter integration with createPlanRefinementGraph', () => {
  let writeSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
  })

  afterEach(() => {
    writeSpy.mockRestore()
  })

  it('approve: graph completes with hitlDecision=approve and refinementPhase=complete', async () => {
    // First prompt: list → approve
    // Second prompt: checkbox → confirm all flows
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ decision: 'approve' })
      .mockResolvedValueOnce({ confirmedFlowIds: ['flow-user-1'] })

    const decisionCallback = createCLIDecisionCallbackAdapter()
    const graph = createPlanRefinementGraph({
      planLoader: stubPlanLoader,
      decisionCallback,
    })

    const result = await graph.invoke({
      planSlug: 'integration-approve',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.hitlDecision).toBe('approve')
    expect(result.refinementPhase).toBe('complete')
    expect(result.errors).toEqual([])
    expect(result.validationResult?.passed).toBe(true)
  })

  it('reject: graph ends with hitlDecision=reject and refinementPhase=error', async () => {
    // First prompt: list → reject
    // Second prompt: input → reason
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ decision: 'reject' })
      .mockResolvedValueOnce({ reason: 'Plan lacks sufficient detail' })

    const decisionCallback = createCLIDecisionCallbackAdapter()
    const graph = createPlanRefinementGraph({
      planLoader: stubPlanLoader,
      decisionCallback,
    })

    const result = await graph.invoke({
      planSlug: 'integration-reject',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.hitlDecision).toBe('reject')
    expect(result.refinementPhase).toBe('error')
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('Plan lacks sufficient detail')]),
    )
    expect(result.validationResult).toBeNull()
    expect(result.storyReadiness).toBeNull()
  })

  it('defer: graph ends with hitlDecision=defer and refinementPhase=complete', async () => {
    // First prompt: list → defer
    // Second prompt: input → reason
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ decision: 'defer' })
      .mockResolvedValueOnce({ reason: 'Waiting for stakeholder input' })

    const decisionCallback = createCLIDecisionCallbackAdapter()
    const graph = createPlanRefinementGraph({
      planLoader: stubPlanLoader,
      decisionCallback,
    })

    const result = await graph.invoke({
      planSlug: 'integration-defer',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.hitlDecision).toBe('defer')
    expect(result.refinementPhase).toBe('complete')
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('deferred')]),
    )
    expect(result.validationResult).toBeNull()
  })

  it('edit then approve: graph re-runs extract_flows then completes', async () => {
    // First call: edit. Second call: approve all.
    let callCount = 0
    vi.mocked(inquirer.prompt).mockImplementation(async (_questions: any) => {
      callCount++
      // Calls: 1=first decision(edit), 2=second decision(approve), 3=checkbox(all)
      if (callCount === 1) return { decision: 'edit' }
      if (callCount === 2) return { decision: 'approve' }
      return { confirmedFlowIds: ['flow-user-1'] }
    })

    const decisionCallback = createCLIDecisionCallbackAdapter()
    const graph = createPlanRefinementGraph({
      planLoader: stubPlanLoader,
      decisionCallback,
    })

    const result = await graph.invoke({
      planSlug: 'integration-edit',
      rawPlan: { content: SAMPLE_MARKDOWN },
    })

    expect(result.hitlDecision).toBe('approve')
    expect(result.refinementPhase).toBe('complete')
    // The adapter was called at least twice (edit + approve)
    expect(callCount).toBeGreaterThanOrEqual(2)
  })

  it('graph with stub planLoader returns valid state (smoke test)', async () => {
    vi.mocked(inquirer.prompt)
      .mockResolvedValueOnce({ decision: 'approve' })
      .mockResolvedValueOnce({ confirmedFlowIds: [] })

    const decisionCallback = createCLIDecisionCallbackAdapter()
    const graph = createPlanRefinementGraph({
      planLoader: stubPlanLoader,
      decisionCallback,
    })

    // Invoke with no rawPlan — planLoader will be called
    const result = await graph.invoke({
      planSlug: 'stub-planloader-test',
    })

    // Even with stub planLoader returning a valid plan, graph should complete
    expect(typeof result.planSlug).toBe('string')
    expect(result.planSlug).toBe('stub-planloader-test')
    expect(Array.isArray(result.errors)).toBe(true)
  })
})

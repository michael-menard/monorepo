/**
 * extract_flows node tests
 * APRS-2010: ST-5 / AC-7
 */

import { describe, it, expect, vi } from 'vitest'
import {
  extractUserFlows,
  inferFlows,
  writeFlows,
  convertLlmFlow,
  createExtractFlowsNode,
} from '../extract-flows.js'
import type { LlmAdapterFn, FlowWriterFn, LlmRawFlow } from '../extract-flows.js'
import type {
  NormalizedPlan,
  PlanRefinementState,
} from '../../../state/plan-refinement-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeNormalizedPlan(overrides: Partial<NormalizedPlan> = {}): NormalizedPlan {
  return {
    planSlug: 'test-plan',
    title: 'Test Plan',
    summary: 'A test plan',
    problemStatement: 'Users cannot create flows automatically',
    proposedSolution: 'Build an extract_flows node that uses LLM inference',
    goals: ['Extract flows'],
    nonGoals: [],
    flows: [],
    openQuestions: [],
    warnings: [],
    constraints: [],
    dependencies: [],
    status: 'draft',
    priority: 'medium',
    tags: [],
    ...overrides,
  }
}

function makeState(overrides: Partial<PlanRefinementState> = {}): PlanRefinementState {
  return {
    planSlug: 'test-plan',
    rawPlan: null,
    normalizedPlan: makeNormalizedPlan(),
    flows: [],
    refinementPhase: 'extract_flows',
    iterationCount: 0,
    maxIterations: 3,
    warnings: [],
    errors: [],
    ...overrides,
  }
}

const FLOWS_MARKDOWN = `
# Plan With Flows

## Problem Statement

System needs better UX.

## Proposed Solution

Build new flows.

## Flows

### Flow 1: User Creates Item

- Actor: Admin
- Trigger: User clicks New
- Steps:
  - Open modal
  - Fill form
  - Save
- Success Outcome: Item created in DB

### Flow 2: User Views Dashboard

- Actor: User
- Trigger: User navigates to /dashboard
- Steps:
  - Load data
  - Render chart
- Success Outcome: Dashboard displayed
`

// ============================================================================
// extractUserFlows tests
// ============================================================================

describe('extractUserFlows', () => {
  it('extracts user-authored flows from rawPlan markdown', () => {
    const normalizedPlan = makeNormalizedPlan()
    const rawPlan = { content: FLOWS_MARKDOWN }
    const flows = extractUserFlows(normalizedPlan, rawPlan)

    expect(flows.length).toBeGreaterThanOrEqual(1)
    flows.forEach(f => {
      expect(f.source).toBe('user')
      expect(f.confidence).toBe(1.0)
      expect(f.status).toBe('unconfirmed')
    })
  })

  it('returns existing user flows from normalizedPlan when already present', () => {
    const existingFlow = {
      id: 'flow-user-1',
      name: 'Existing Flow',
      actor: 'Admin',
      trigger: 'Click',
      steps: [],
      successOutcome: 'Done',
      source: 'user' as const,
      confidence: 1.0,
      status: 'unconfirmed' as const,
    }
    const normalizedPlan = makeNormalizedPlan({ flows: [existingFlow] })
    const flows = extractUserFlows(normalizedPlan, null)

    expect(flows).toHaveLength(1)
    expect(flows[0].id).toBe('flow-user-1')
    expect(flows[0].source).toBe('user')
  })

  it('returns empty array when no flows section and no existing flows', () => {
    const normalizedPlan = makeNormalizedPlan()
    const flows = extractUserFlows(normalizedPlan, null)
    expect(flows).toEqual([])
  })

  it('handles rawPlan with no content — no crash', () => {
    const normalizedPlan = makeNormalizedPlan()
    const flows = extractUserFlows(normalizedPlan, {})
    expect(Array.isArray(flows)).toBe(true)
  })
})

// ============================================================================
// inferFlows tests
// ============================================================================

describe('inferFlows', () => {
  it('infers flows via LLM adapter with source=inferred and confidence in [0.5, 0.9]', async () => {
    const rawFlows: LlmRawFlow[] = [
      {
        name: 'Admin Approves Item',
        actor: 'Admin',
        trigger: 'Review queue triggered',
        steps: ['Check queue', 'Approve or reject'],
        successOutcome: 'Item approved',
        confidence: 0.7,
      },
    ]

    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue(rawFlows)
    const normalizedPlan = makeNormalizedPlan()

    const flows = await inferFlows(normalizedPlan, [], llmAdapter)

    expect(flows).toHaveLength(1)
    expect(flows[0].source).toBe('inferred')
    expect(flows[0].confidence).toBe(0.7)
    expect(flows[0].confidence).toBeGreaterThanOrEqual(0.5)
    expect(flows[0].confidence).toBeLessThanOrEqual(0.9)
    expect(flows[0].status).toBe('unconfirmed')
  })

  it('returns empty array when no LLM adapter provided', async () => {
    const normalizedPlan = makeNormalizedPlan()
    const flows = await inferFlows(normalizedPlan, [], undefined)
    expect(flows).toEqual([])
  })

  it('returns empty array when no problem statement or proposed solution', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn()
    const normalizedPlan = makeNormalizedPlan({
      problemStatement: '',
      proposedSolution: '',
    })
    const flows = await inferFlows(normalizedPlan, [], llmAdapter)
    expect(flows).toEqual([])
    expect(llmAdapter).not.toHaveBeenCalled()
  })

  it('does not infer already-named user flows (passes existing names to LLM)', async () => {
    const userFlows = [
      {
        id: 'flow-user-1',
        name: 'User Creates Item',
        actor: 'User',
        trigger: 'Click',
        steps: [],
        successOutcome: 'Done',
        source: 'user' as const,
        confidence: 1.0,
        status: 'unconfirmed' as const,
      },
    ]

    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue([])
    const normalizedPlan = makeNormalizedPlan()

    await inferFlows(normalizedPlan, userFlows, llmAdapter)

    expect(llmAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        existingFlowNames: ['User Creates Item'],
      }),
    )
  })

  it('handles LLM adapter failure gracefully — returns empty array without throw', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockRejectedValue(new Error('LLM timeout'))
    const normalizedPlan = makeNormalizedPlan()
    const flows = await inferFlows(normalizedPlan, [], llmAdapter)
    expect(flows).toEqual([])
  })
})

// ============================================================================
// writeFlows tests
// ============================================================================

describe('writeFlows', () => {
  it('no-op flow-writer — does not throw, logs warning', async () => {
    // No flowWriter provided (undefined) — should use internal default no-op
    await expect(writeFlows('test-plan', [], undefined)).resolves.toBeUndefined()
  })

  it('custom flow-writer is called with planSlug and flows', async () => {
    const writer: FlowWriterFn = vi.fn().mockResolvedValue(undefined)
    const flows = [
      {
        id: 'flow-1',
        name: 'Test Flow',
        actor: 'User',
        trigger: 'Click',
        steps: [],
        successOutcome: 'Done',
        source: 'user' as const,
        confidence: 1.0,
        status: 'unconfirmed' as const,
      },
    ]

    await writeFlows('test-plan', flows, writer)

    expect(writer).toHaveBeenCalledWith('test-plan', flows)
  })

  it('flow-writer failure — no throw, logs warning only', async () => {
    const writer: FlowWriterFn = vi.fn().mockRejectedValue(new Error('DB table missing'))
    const flows = [
      {
        id: 'flow-1',
        name: 'Test',
        actor: 'User',
        trigger: 'Click',
        steps: [],
        successOutcome: 'Done',
        source: 'user' as const,
        confidence: 1.0,
        status: 'unconfirmed' as const,
      },
    ]

    // AC-6: must not throw
    await expect(writeFlows('test-plan', flows, writer)).resolves.toBeUndefined()
  })
})

// ============================================================================
// convertLlmFlow tests
// ============================================================================

describe('convertLlmFlow', () => {
  it('converts raw LLM flow to validated Flow with source=inferred', () => {
    const raw: LlmRawFlow = {
      name: 'Admin Exports Report',
      actor: 'Admin',
      trigger: 'Click export button',
      steps: ['Open export modal', 'Select format', 'Download'],
      successOutcome: 'Report file downloaded',
      confidence: 0.7,
    }

    const flow = convertLlmFlow(raw, 0)

    expect(flow.source).toBe('inferred')
    expect(flow.confidence).toBe(0.7)
    expect(flow.steps).toHaveLength(3)
    expect(flow.steps[0].index).toBe(1)
    expect(flow.steps[0].description).toBe('Open export modal')
    expect(flow.status).toBe('unconfirmed')
  })

  it('defaults confidence to 0.7 when not provided', () => {
    const raw: LlmRawFlow = {
      name: 'Flow Without Confidence',
      actor: 'User',
      trigger: 'Start',
      steps: [],
      successOutcome: 'Done',
    }

    const flow = convertLlmFlow(raw, 1)
    expect(flow.confidence).toBe(0.7)
  })
})

// ============================================================================
// createExtractFlowsNode tests
// ============================================================================

describe('createExtractFlowsNode', () => {
  it('extracts user flows from rawPlan markdown', async () => {
    const node = createExtractFlowsNode()
    const state = makeState({
      rawPlan: { content: FLOWS_MARKDOWN },
    })

    const result = await node(state)

    expect(result.refinementPhase).toBe('gap_coverage')
    expect(result.flows).toBeDefined()
    expect(Array.isArray(result.flows)).toBe(true)
    // User flows should be extracted
    const userFlows = result.flows?.filter(f => f.source === 'user') ?? []
    expect(userFlows.length).toBeGreaterThanOrEqual(1)
    userFlows.forEach(f => {
      expect(f.confidence).toBe(1.0)
      expect(f.status).toBe('unconfirmed')
    })
  })

  it('uses LLM adapter for flow inference', async () => {
    const inferredRaw: LlmRawFlow[] = [
      {
        name: 'Admin Views Analytics',
        actor: 'Admin',
        trigger: 'Navigate to analytics',
        steps: ['Load data', 'Render charts'],
        successOutcome: 'Analytics displayed',
        confidence: 0.8,
      },
    ]
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue(inferredRaw)

    const node = createExtractFlowsNode({ llmAdapter })
    const state = makeState()

    const result = await node(state)

    expect(llmAdapter).toHaveBeenCalled()
    const inferredFlows = result.flows?.filter(f => f.source === 'inferred') ?? []
    expect(inferredFlows).toHaveLength(1)
    expect(inferredFlows[0].confidence).toBe(0.8)
  })

  it('updates normalizedPlan.flows with extracted flows (AC-5)', async () => {
    const llmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue([
      {
        name: 'Inferred Flow',
        actor: 'User',
        trigger: 'Action',
        steps: ['Step 1'],
        successOutcome: 'Done',
        confidence: 0.6,
      },
    ])

    const node = createExtractFlowsNode({ llmAdapter })
    const state = makeState({ rawPlan: { content: FLOWS_MARKDOWN } })

    const result = await node(state)

    expect(result.normalizedPlan).not.toBeNull()
    expect(result.normalizedPlan?.flows).toBeDefined()
    expect(Array.isArray(result.normalizedPlan?.flows)).toBe(true)
    expect(result.normalizedPlan?.flows.length).toBeGreaterThanOrEqual(1)
  })

  it('null normalizedPlan — no crash, returns empty flows', async () => {
    const node = createExtractFlowsNode()
    const state = makeState({ normalizedPlan: null })

    const result = await node(state)

    expect(result.flows).toEqual([])
    expect(result.refinementPhase).toBe('gap_coverage')
  })

  it('no-op flow-writer — does not throw (AC-6)', async () => {
    const node = createExtractFlowsNode() // no flowWriter = default no-op
    const state = makeState()

    await expect(node(state)).resolves.toBeDefined()
  })

  it('flow-writer failure — no throw, continues in-memory (AC-6)', async () => {
    const failingWriter: FlowWriterFn = vi.fn().mockRejectedValue(new Error('table missing'))
    const node = createExtractFlowsNode({ flowWriter: failingWriter })
    const state = makeState()

    const result = await node(state)

    // Must not set error phase due to flow-writer failure
    expect(result.refinementPhase).toBe('gap_coverage')
    expect(result.errors ?? []).toEqual([])
  })
})

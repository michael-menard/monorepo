/**
 * slice_flows node tests
 * APRS-4010: ST-3 / AC-4, AC-7
 */

import { describe, it, expect } from 'vitest'
import { hasSideEffect, hasActorBoundary, sliceFlow, createSliceFlowsNode } from '../slice-flows.js'
import type { StoryGenerationState } from '../../../state/story-generation-state.js'
import type { Flow, FlowStep } from '../../../state/plan-refinement-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<StoryGenerationState> = {}): StoryGenerationState {
  return {
    planSlug: 'test-plan',
    refinedPlan: null,
    flows: [],
    slicedFlows: [],
    generatedStories: [],
    generationPhase: 'slice_flows',
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'flow-1',
    name: 'Test Flow',
    actor: 'User',
    trigger: 'User clicks button',
    steps: [],
    successOutcome: 'Completed',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
    ...overrides,
  }
}

function step(index: number, description: string, actor?: string): FlowStep {
  return { index, description, ...(actor ? { actor } : {}) }
}

// ============================================================================
// hasSideEffect tests
// ============================================================================

describe('hasSideEffect', () => {
  it('returns true for steps with side-effect keywords', () => {
    expect(hasSideEffect(step(1, 'Save the document'))).toBe(true)
    expect(hasSideEffect(step(1, 'Send email notification'))).toBe(true)
    expect(hasSideEffect(step(1, 'Delete the record'))).toBe(true)
    expect(hasSideEffect(step(1, 'Create new entry'))).toBe(true)
  })

  it('returns false for pure data-passing steps', () => {
    expect(hasSideEffect(step(1, 'Open form'))).toBe(false)
    expect(hasSideEffect(step(1, 'Display results'))).toBe(false)
    expect(hasSideEffect(step(1, 'Navigate to page'))).toBe(false)
  })
})

// ============================================================================
// hasActorBoundary tests
// ============================================================================

describe('hasActorBoundary', () => {
  it('returns true when step actor differs from previous step actor', () => {
    const s1 = step(1, 'Step 1', 'User')
    const s2 = step(2, 'Step 2', 'System')
    expect(hasActorBoundary(s2, 'User', s1)).toBe(true)
  })

  it('returns false when same actor', () => {
    const s1 = step(1, 'Step 1', 'User')
    const s2 = step(2, 'Step 2', 'User')
    expect(hasActorBoundary(s2, 'User', s1)).toBe(false)
  })

  it('uses flow actor when step has no explicit actor', () => {
    const s1 = step(1, 'Step 1')
    const s2 = step(2, 'Step 2')
    expect(hasActorBoundary(s2, 'User', s1)).toBe(false)
  })

  it('detects boundary when step has actor different from flow actor', () => {
    const s1 = step(1, 'Step 1') // inherits flow actor "User"
    const s2 = step(2, 'Step 2', 'Admin')
    expect(hasActorBoundary(s2, 'User', s1)).toBe(true)
  })
})

// ============================================================================
// sliceFlow tests
// ============================================================================

describe('sliceFlow', () => {
  it('single-step flow produces exactly one slice', () => {
    const flow = makeFlow({
      steps: [step(1, 'Do something')],
    })
    const slices = sliceFlow(flow)

    expect(slices).toHaveLength(1)
    expect(slices[0].flow_id).toBe('flow-1')
    expect(slices[0].step_indices).toEqual([1])
    expect(slices[0].scope_description).toBe('Do something')
  })

  it('empty flow produces one slice with empty description', () => {
    const flow = makeFlow({ steps: [] })
    const slices = sliceFlow(flow)

    expect(slices).toHaveLength(1)
    expect(slices[0].step_indices).toEqual([])
    expect(slices[0].scope_description).toContain('Empty flow')
  })

  it('merges pure data-passing steps within same actor', () => {
    const flow = makeFlow({
      steps: [
        step(1, 'Open form'),
        step(2, 'Fill in fields'),
        step(3, 'Review data'),
      ],
    })
    const slices = sliceFlow(flow)

    // All steps are data-passing within same actor → one slice
    expect(slices).toHaveLength(1)
    expect(slices[0].step_indices).toEqual([1, 2, 3])
  })

  it('splits on side-effect boundaries', () => {
    const flow = makeFlow({
      steps: [
        step(1, 'Open form'),
        step(2, 'Fill fields'),
        step(3, 'Submit and save data'),
        step(4, 'Display confirmation'),
      ],
    })
    const slices = sliceFlow(flow)

    // Steps 1-2 merged, step 3 is a boundary (save), step 4 is after
    expect(slices).toHaveLength(2)
    expect(slices[0].step_indices).toEqual([1, 2])
    expect(slices[1].step_indices).toEqual([3, 4])
  })

  it('splits on actor boundaries', () => {
    const flow = makeFlow({
      actor: 'User',
      steps: [
        step(1, 'User fills form'),
        step(2, 'System processes request', 'System'),
        step(3, 'System returns result', 'System'),
      ],
    })
    const slices = sliceFlow(flow)

    // Step 1 (User) → slice 1, Steps 2-3 (System) → slice 2
    expect(slices).toHaveLength(2)
    expect(slices[0].step_indices).toEqual([1])
    expect(slices[1].step_indices).toEqual([2, 3])
  })

  it('splits on both side-effect and actor boundaries', () => {
    const flow = makeFlow({
      actor: 'User',
      steps: [
        step(1, 'Open page'),
        step(2, 'Submit form'),
        step(3, 'Server validates data', 'Server'),
        step(4, 'Server saves record', 'Server'),
        step(5, 'Display success'),
      ],
    })
    const slices = sliceFlow(flow)

    // Step 1 → merged with nothing before submit
    // Step 2 (submit = side-effect) → boundary
    // Step 3 (actor boundary Server) → boundary
    // Step 4 (save = side-effect) → boundary
    // Step 5 (actor boundary back to User) → boundary
    expect(slices.length).toBeGreaterThanOrEqual(3)
  })

  it('preserves flow_id in all slices', () => {
    const flow = makeFlow({
      id: 'my-flow',
      steps: [
        step(1, 'Step A'),
        step(2, 'Save something'),
        step(3, 'Step C'),
      ],
    })
    const slices = sliceFlow(flow)

    for (const slice of slices) {
      expect(slice.flow_id).toBe('my-flow')
    }
  })
})

// ============================================================================
// createSliceFlowsNode tests
// ============================================================================

describe('createSliceFlowsNode', () => {
  it('slices flows and sets generationPhase to generate_stories', async () => {
    const node = createSliceFlowsNode()
    const flows = [
      makeFlow({
        id: 'f1',
        steps: [step(1, 'Open'), step(2, 'Save data')],
      }),
    ]
    const state = makeState({ flows })

    const result = await node(state)

    expect(result.generationPhase).toBe('generate_stories')
    expect(result.slicedFlows).toBeDefined()
    expect(result.slicedFlows!.length).toBeGreaterThan(0)
  })

  it('returns error when no flows provided', async () => {
    const node = createSliceFlowsNode()
    const state = makeState({ flows: [] })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('no flows provided')
  })

  it('handles multiple flows', async () => {
    const node = createSliceFlowsNode()
    const flows = [
      makeFlow({ id: 'f1', steps: [step(1, 'Step A')] }),
      makeFlow({ id: 'f2', steps: [step(1, 'Step B')] }),
    ]
    const state = makeState({ flows })

    const result = await node(state)

    expect(result.generationPhase).toBe('generate_stories')
    expect(result.slicedFlows).toHaveLength(2)
    expect(result.slicedFlows![0].flow_id).toBe('f1')
    expect(result.slicedFlows![1].flow_id).toBe('f2')
  })
})

/**
 * slice_flows node tests
 * APRS-4010: ST-3 / AC-4
 */

import { describe, it, expect } from 'vitest'
import {
  isBoundaryStep,
  buildScopeDescription,
  sliceFlow,
  sliceAllFlows,
  createSliceFlowsNode,
} from '../slice-flows.js'
import type { Flow, FlowStep } from '../../../state/plan-refinement-state.js'
import type { StoryGenerationState } from '../../../state/story-generation-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeStep(overrides: Partial<FlowStep> = {}): FlowStep {
  return {
    index: 1,
    description: 'Default step',
    ...overrides,
  }
}

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'flow-1',
    name: 'Test Flow',
    actor: 'User',
    trigger: 'User initiates',
    steps: [
      { index: 1, description: 'Step one' },
      { index: 2, description: 'Step two' },
    ],
    successOutcome: 'Flow completes',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
    ...overrides,
  }
}

function makeState(overrides: Partial<StoryGenerationState> = {}): StoryGenerationState {
  return {
    planSlug: 'test-plan',
    refinedPlan: null,
    flows: [],
    slicedFlows: [],
    generatedStories: [],
    dependencyEdges: [],
    parallelGroups: [],
    orderedStories: [],
    validationResult: null,
    generatedStoriesWithDeps: [],
    writeResult: null,
    generationPhase: 'slice_flows',
    errors: [],
    warnings: [],
    ...overrides,
  }
}

// ============================================================================
// isBoundaryStep tests
// ============================================================================

describe('isBoundaryStep', () => {
  it('returns false when previousStep is null (first step)', () => {
    const step = makeStep({ description: 'Save to DB' })
    expect(isBoundaryStep(step, null)).toBe(false)
  })

  it('returns true when actors differ', () => {
    const step = makeStep({ actor: 'System', description: 'Process request' })
    const prev = makeStep({ actor: 'User', description: 'Submit form' })
    expect(isBoundaryStep(step, prev)).toBe(true)
  })

  it('returns false when same actor (no side effect)', () => {
    const step = makeStep({ actor: 'User', description: 'Fill in name field' })
    const prev = makeStep({ actor: 'User', description: 'Open form' })
    expect(isBoundaryStep(step, prev)).toBe(false)
  })

  it('returns true for side-effect keywords: save', () => {
    const step = makeStep({ description: 'Save the record to database' })
    const prev = makeStep({ description: 'Fill in data' })
    expect(isBoundaryStep(step, prev)).toBe(true)
  })

  it('returns true for side-effect keyword: send', () => {
    const step = makeStep({ description: 'Send email notification' })
    const prev = makeStep({ description: 'Prepare email content' })
    expect(isBoundaryStep(step, prev)).toBe(true)
  })

  it('returns true for side-effect keyword: create', () => {
    const step = makeStep({ description: 'Create a new record' })
    const prev = makeStep({ description: 'Validate input' })
    expect(isBoundaryStep(step, prev)).toBe(true)
  })

  it('returns false for pure data-passing steps', () => {
    const step = makeStep({ description: 'Read the value from input' })
    const prev = makeStep({ description: 'Open the panel' })
    expect(isBoundaryStep(step, prev)).toBe(false)
  })
})

// ============================================================================
// buildScopeDescription tests
// ============================================================================

describe('buildScopeDescription', () => {
  it('returns single step description for one step', () => {
    const flow = makeFlow({
      steps: [{ index: 1, description: 'Open form' }],
    })
    expect(buildScopeDescription(flow, [1])).toBe('Open form')
  })

  it('returns range description for multiple steps', () => {
    const flow = makeFlow({
      steps: [
        { index: 1, description: 'Open form' },
        { index: 2, description: 'Submit form' },
      ],
    })
    expect(buildScopeDescription(flow, [1, 2])).toBe('Open form through Submit form')
  })

  it('returns fallback for empty step indices', () => {
    const flow = makeFlow({ name: 'My Flow' })
    expect(buildScopeDescription(flow, [])).toBe('My Flow (no steps)')
  })
})

// ============================================================================
// sliceFlow tests
// ============================================================================

describe('sliceFlow', () => {
  it('single-step flow → exactly one slice', () => {
    const flow = makeFlow({
      id: 'flow-single',
      steps: [{ index: 1, description: 'Do the thing' }],
    })
    const slices = sliceFlow(flow)
    expect(slices).toHaveLength(1)
    expect(slices[0].flow_id).toBe('flow-single')
    expect(slices[0].step_indices).toEqual([1])
  })

  it('no-step flow → exactly one slice with placeholder index', () => {
    const flow = makeFlow({
      id: 'flow-empty',
      steps: [],
    })
    const slices = sliceFlow(flow)
    expect(slices).toHaveLength(1)
    expect(slices[0].flow_id).toBe('flow-empty')
  })

  it('multi-step with no boundaries → single slice', () => {
    const flow = makeFlow({
      id: 'flow-multi',
      steps: [
        { index: 1, description: 'Open form' },
        { index: 2, description: 'Fill in data' },
        { index: 3, description: 'Review input' },
      ],
    })
    const slices = sliceFlow(flow)
    expect(slices).toHaveLength(1)
    expect(slices[0].step_indices).toEqual([1, 2, 3])
  })

  it('splits at side-effect boundary (save)', () => {
    const flow = makeFlow({
      id: 'flow-boundary',
      steps: [
        { index: 1, description: 'Open form' },
        { index: 2, description: 'Fill in data' },
        { index: 3, description: 'Save to database' },
        { index: 4, description: 'Show success message' },
      ],
    })
    const slices = sliceFlow(flow)
    // Step 3 (save) is a boundary — split before it
    expect(slices.length).toBeGreaterThanOrEqual(2)
    // First slice should include steps before boundary
    expect(slices[0].step_indices).toContain(1)
    // Second slice should contain step 3
    const hasSaveStep = slices.some(s => s.step_indices.includes(3))
    expect(hasSaveStep).toBe(true)
  })

  it('splits at actor boundary', () => {
    const flow = makeFlow({
      id: 'flow-actor',
      steps: [
        { index: 1, description: 'Submit form', actor: 'User' },
        { index: 2, description: 'Validate request', actor: 'System' },
        { index: 3, description: 'Return response', actor: 'System' },
      ],
    })
    const slices = sliceFlow(flow)
    // Actor changes from User to System at step 2
    expect(slices.length).toBeGreaterThanOrEqual(2)
    // First slice: User steps
    expect(slices[0].step_indices).toContain(1)
    // Second slice: System steps
    expect(slices[1].step_indices).toContain(2)
  })

  it('each slice has valid flow_id, step_indices, scope_description', () => {
    const flow = makeFlow({
      id: 'flow-validate',
      steps: [
        { index: 1, description: 'Open panel' },
        { index: 2, description: 'Send notification' },
      ],
    })
    const slices = sliceFlow(flow)
    for (const slice of slices) {
      expect(slice.flow_id).toBe('flow-validate')
      expect(Array.isArray(slice.step_indices)).toBe(true)
      expect(slice.step_indices.length).toBeGreaterThan(0)
      expect(typeof slice.scope_description).toBe('string')
      expect(slice.scope_description.length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// sliceAllFlows tests
// ============================================================================

describe('sliceAllFlows', () => {
  it('returns empty array for empty flows', () => {
    expect(sliceAllFlows([])).toEqual([])
  })

  it('combines slices from multiple flows', () => {
    const flows = [
      makeFlow({ id: 'flow-a', steps: [{ index: 1, description: 'Step A' }] }),
      makeFlow({ id: 'flow-b', steps: [{ index: 1, description: 'Step B' }] }),
    ]
    const slices = sliceAllFlows(flows)
    expect(slices).toHaveLength(2)
    expect(slices.map(s => s.flow_id)).toContain('flow-a')
    expect(slices.map(s => s.flow_id)).toContain('flow-b')
  })
})

// ============================================================================
// createSliceFlowsNode tests
// ============================================================================

describe('createSliceFlowsNode', () => {
  it('slices flows and sets generationPhase to generate_stories', async () => {
    const node = createSliceFlowsNode()
    const state = makeState({
      flows: [
        makeFlow({ id: 'flow-1', steps: [{ index: 1, description: 'Do thing' }] }),
        makeFlow({ id: 'flow-2', steps: [{ index: 1, description: 'Do other' }] }),
      ],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('generate_stories')
    expect(result.slicedFlows).toHaveLength(2)
  })

  it('empty flows → warns and sets phase to generate_stories', async () => {
    const node = createSliceFlowsNode()
    const state = makeState({ flows: [] })

    const result = await node(state)

    expect(result.generationPhase).toBe('generate_stories')
    expect(result.slicedFlows).toEqual([])
    expect(result.warnings).toEqual(expect.arrayContaining([expect.stringContaining('no confirmed flows')]))
  })

  it('each sliced flow has all required fields', async () => {
    const node = createSliceFlowsNode()
    const state = makeState({
      flows: [
        makeFlow({
          id: 'flow-test',
          steps: [
            { index: 1, description: 'Read input' },
            { index: 2, description: 'Save result' },
          ],
        }),
      ],
    })

    const result = await node(state)

    for (const slice of result.slicedFlows ?? []) {
      expect(typeof slice.flow_id).toBe('string')
      expect(Array.isArray(slice.step_indices)).toBe(true)
      expect(typeof slice.scope_description).toBe('string')
    }
  })
})

/**
 * load_refined_plan node tests
 * APRS-4010: ST-2 / AC-3, AC-7
 */

import { describe, it, expect, vi } from 'vitest'
import { createLoadRefinedPlanNode } from '../load-refined-plan.js'
import type { StoryGenerationState } from '../../../state/story-generation-state.js'
import type { NormalizedPlan, Flow } from '../../../state/plan-refinement-state.js'

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
    generationPhase: 'load_plan',
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
    steps: [{ index: 1, description: 'Step one' }],
    successOutcome: 'Action completed',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
    ...overrides,
  }
}

function makePlan(overrides: Partial<NormalizedPlan> = {}): NormalizedPlan {
  return {
    planSlug: 'test-plan',
    title: 'Test Plan',
    summary: 'A test plan',
    problemStatement: 'Problem',
    proposedSolution: 'Solution',
    goals: ['Goal 1'],
    nonGoals: [],
    flows: [makeFlow()],
    openQuestions: [],
    warnings: [],
    constraints: [],
    dependencies: [],
    status: 'refined',
    priority: 'medium',
    tags: ['test'],
    ...overrides,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('createLoadRefinedPlanNode', () => {
  it('loads plan from state and extracts confirmed flows', async () => {
    const node = createLoadRefinedPlanNode()
    const plan = makePlan({
      flows: [
        makeFlow({ id: 'f1', status: 'confirmed' }),
        makeFlow({ id: 'f2', status: 'unconfirmed' }),
        makeFlow({ id: 'f3', status: 'confirmed' }),
      ],
    })
    const state = makeState({ refinedPlan: plan })

    const result = await node(state)

    expect(result.generationPhase).toBe('slice_flows')
    expect(result.flows).toHaveLength(2)
    expect(result.flows![0].id).toBe('f1')
    expect(result.flows![1].id).toBe('f3')
    expect(result.refinedPlan).toEqual(plan)
  })

  it('uses injectable PlanLoaderFn when refinedPlan is null in state', async () => {
    const plan = makePlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const node = createLoadRefinedPlanNode({ planLoader })
    const state = makeState({ refinedPlan: null })

    const result = await node(state)

    expect(planLoader).toHaveBeenCalledWith('test-plan')
    expect(result.generationPhase).toBe('slice_flows')
    expect(result.refinedPlan).toEqual(plan)
    expect(result.flows).toHaveLength(1)
  })

  it('sets error phase when no plan found', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const node = createLoadRefinedPlanNode({ planLoader })
    const state = makeState({ refinedPlan: null })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
    expect(result.errors![0]).toContain('no plan found')
  })

  it('sets error phase when no confirmed flows exist', async () => {
    const plan = makePlan({
      flows: [
        makeFlow({ id: 'f1', status: 'unconfirmed' }),
        makeFlow({ id: 'f2', status: 'rejected' }),
      ],
    })
    const node = createLoadRefinedPlanNode()
    const state = makeState({ refinedPlan: plan })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('no confirmed flows')
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.length).toBeGreaterThan(0)
  })

  it('sets error phase on plan validation failure', async () => {
    const invalidPlan = { planSlug: '' } as NormalizedPlan // Missing required fields
    const planLoader = vi.fn().mockResolvedValue(invalidPlan)
    const node = createLoadRefinedPlanNode({ planLoader })
    const state = makeState({ refinedPlan: null })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('validation failed')
  })

  it('handles plan-loader exception gracefully', async () => {
    const planLoader = vi.fn().mockRejectedValue(new Error('KB unavailable'))
    const node = createLoadRefinedPlanNode({ planLoader })
    const state = makeState({ refinedPlan: null })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('KB unavailable')
  })

  it('prefers state.refinedPlan over planLoader', async () => {
    const plan = makePlan()
    const planLoader = vi.fn().mockResolvedValue(null)
    const node = createLoadRefinedPlanNode({ planLoader })
    const state = makeState({ refinedPlan: plan })

    const result = await node(state)

    expect(planLoader).not.toHaveBeenCalled()
    expect(result.generationPhase).toBe('slice_flows')
  })
})

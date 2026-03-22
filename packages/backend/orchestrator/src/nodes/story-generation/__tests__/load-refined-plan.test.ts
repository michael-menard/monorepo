/**
 * load_refined_plan node tests
 * APRS-4010: ST-2 / AC-3
 */

import { describe, it, expect, vi } from 'vitest'
import {
  loadPlanFromKb,
  validateAndParseRefinedPlan,
  extractConfirmedFlows,
  createLoadRefinedPlanNode,
} from '../load-refined-plan.js'
import type { StoryGenerationState } from '../../../state/story-generation-state.js'
import type { Flow } from '../../../state/plan-refinement-state.js'

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
    name: 'User Creates Plan',
    actor: 'User',
    trigger: 'User clicks create',
    steps: [{ index: 1, description: 'Open form' }],
    successOutcome: 'Plan is saved',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
    ...overrides,
  }
}

const VALID_RAW_PLAN = {
  planSlug: 'test-plan',
  title: 'Test Plan',
  summary: 'A test plan',
  problemStatement: 'Problem here',
  proposedSolution: 'Solution here',
  goals: ['Goal 1'],
  nonGoals: ['Non-goal 1'],
  flows: [makeFlow()],
  openQuestions: [],
  warnings: [],
  constraints: [],
  dependencies: [],
  status: 'active',
  priority: 'high',
  tags: ['test'],
}

// ============================================================================
// loadPlanFromKb tests
// ============================================================================

describe('loadPlanFromKb', () => {
  it('returns plan from loader', async () => {
    const planLoader = vi.fn().mockResolvedValue({ title: 'My Plan' })
    const result = await loadPlanFromKb('my-plan', planLoader)
    expect(planLoader).toHaveBeenCalledWith('my-plan')
    expect(result).toEqual({ title: 'My Plan' })
  })

  it('returns null when planSlug is empty', async () => {
    const planLoader = vi.fn()
    const result = await loadPlanFromKb('', planLoader)
    expect(planLoader).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('returns null and logs warning when loader throws', async () => {
    const planLoader = vi.fn().mockRejectedValue(new Error('KB unavailable'))
    const result = await loadPlanFromKb('my-plan', planLoader)
    expect(result).toBeNull()
  })
})

// ============================================================================
// validateAndParseRefinedPlan tests
// ============================================================================

describe('validateAndParseRefinedPlan', () => {
  it('validates a valid plan and returns NormalizedPlan', () => {
    const result = validateAndParseRefinedPlan(VALID_RAW_PLAN, 'test-plan')
    expect(result).not.toBeNull()
    expect(result?.planSlug).toBe('test-plan')
    expect(result?.title).toBe('Test Plan')
    expect(result?.flows).toHaveLength(1)
  })

  it('returns null for null input', () => {
    const result = validateAndParseRefinedPlan(null, 'test-plan')
    expect(result).toBeNull()
  })

  it('returns null for invalid plan missing required title field', () => {
    const invalidPlan = { notAValidField: true }
    const result = validateAndParseRefinedPlan(invalidPlan, 'test-plan')
    // NormalizedPlanSchema requires title: z.string().min(1) — no default
    // Object without title fails validation → returns null
    expect(result).toBeNull()
  })
})

// ============================================================================
// extractConfirmedFlows tests
// ============================================================================

describe('extractConfirmedFlows', () => {
  it('returns only confirmed flows', () => {
    const plan = {
      ...VALID_RAW_PLAN,
      flows: [
        makeFlow({ id: 'flow-1', status: 'confirmed' }),
        makeFlow({ id: 'flow-2', status: 'unconfirmed' }),
        makeFlow({ id: 'flow-3', status: 'rejected' }),
        makeFlow({ id: 'flow-4', status: 'confirmed' }),
      ],
    }
    // parse through the schema first
    const result = extractConfirmedFlows(plan as any)
    expect(result).toHaveLength(2)
    expect(result.map(f => f.id)).toEqual(['flow-1', 'flow-4'])
  })

  it('returns empty array when no confirmed flows', () => {
    const plan = {
      ...VALID_RAW_PLAN,
      flows: [makeFlow({ status: 'unconfirmed' }), makeFlow({ status: 'rejected' })],
    }
    const result = extractConfirmedFlows(plan as any)
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// createLoadRefinedPlanNode tests
// ============================================================================

describe('createLoadRefinedPlanNode', () => {
  it('loads plan and sets generationPhase to slice_flows on success', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_RAW_PLAN)
    const node = createLoadRefinedPlanNode({ planLoader })

    const state = makeState({ planSlug: 'test-plan' })
    const result = await node(state)

    expect(planLoader).toHaveBeenCalledWith('test-plan')
    expect(result.generationPhase).toBe('slice_flows')
    expect(result.refinedPlan).not.toBeNull()
    expect(result.flows).toHaveLength(1)
    expect(result.flows?.[0].status).toBe('confirmed')
  })

  it('sets generationPhase to error when loader returns null', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const node = createLoadRefinedPlanNode({ planLoader })

    const state = makeState({ planSlug: 'missing-plan' })
    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors).toEqual(expect.arrayContaining([expect.stringContaining("could not load plan for slug 'missing-plan'")]))
  })

  it('sets generationPhase to error when loader throws', async () => {
    const planLoader = vi.fn().mockRejectedValue(new Error('Network error'))
    const node = createLoadRefinedPlanNode({ planLoader })

    const state = makeState({ planSlug: 'test-plan' })
    const result = await node(state)

    expect(result.generationPhase).toBe('error')
  })

  it('default no-op loader returns error phase (no plan loaded)', async () => {
    const node = createLoadRefinedPlanNode()

    const state = makeState({ planSlug: 'test-plan' })
    const result = await node(state)

    expect(result.generationPhase).toBe('error')
  })

  it('extracts only confirmed flows from the loaded plan', async () => {
    const planWithMixedFlows = {
      ...VALID_RAW_PLAN,
      flows: [
        makeFlow({ id: 'flow-confirmed', status: 'confirmed' }),
        makeFlow({ id: 'flow-unconfirmed', status: 'unconfirmed' }),
      ],
    }
    const planLoader = vi.fn().mockResolvedValue(planWithMixedFlows)
    const node = createLoadRefinedPlanNode({ planLoader })

    const state = makeState({ planSlug: 'test-plan' })
    const result = await node(state)

    expect(result.flows).toHaveLength(1)
    expect(result.flows?.[0].id).toBe('flow-confirmed')
  })
})

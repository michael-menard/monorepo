/**
 * load_plan node tests (v2)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  loadPlan,
  extractConfirmedFlows,
  createLoadPlanNode,
} from '../load-plan.js'
import type { StoryGenerationV2State } from '../../../state/story-generation-v2-state.js'
import type { NormalizedPlan, Flow } from '../../../state/plan-refinement-state.js'

// ============================================================================
// Helpers
// ============================================================================

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

function makeNormalizedPlan(overrides: Partial<NormalizedPlan> = {}): NormalizedPlan {
  return {
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
    ...overrides,
  }
}

function makeState(overrides: Partial<StoryGenerationV2State> = {}): StoryGenerationV2State {
  return {
    planSlug: 'test-plan',
    refinedPlan: null,
    flows: [],
    flowScoutResults: [],
    storyOutlines: [],
    enrichedStories: [],
    dependencyEdges: [],
    parallelGroups: [],
    orderedStories: [],
    validationResult: null,
    writeResult: null,
    generationV2Phase: 'load_plan',
    enricherRetryCount: 0,
    maxEnricherRetries: 2,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// loadPlan tests
// ============================================================================

describe('loadPlan', () => {
  it('returns null for empty planSlug', async () => {
    const planLoader = vi.fn()
    const result = await loadPlan('', planLoader)
    expect(planLoader).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('returns null when loader returns null', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const result = await loadPlan('test-plan', planLoader)
    expect(result).toBeNull()
  })

  it('returns null and warns when loader throws', async () => {
    const planLoader = vi.fn().mockRejectedValue(new Error('KB unavailable'))
    const result = await loadPlan('test-plan', planLoader)
    expect(result).toBeNull()
  })

  it('returns validated plan when loader returns valid data', async () => {
    const plan = makeNormalizedPlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const result = await loadPlan('test-plan', planLoader)
    expect(result).not.toBeNull()
    expect(result?.planSlug).toBe('test-plan')
    expect(result?.title).toBe('Test Plan')
  })

  it('returns null when loader returns invalid plan missing required title', async () => {
    const planLoader = vi.fn().mockResolvedValue({ notValid: true })
    const result = await loadPlan('test-plan', planLoader)
    expect(result).toBeNull()
  })
})

// ============================================================================
// extractConfirmedFlows tests
// ============================================================================

describe('extractConfirmedFlows', () => {
  it('returns only confirmed flows', () => {
    const plan = makeNormalizedPlan({
      flows: [
        makeFlow({ id: 'f1', status: 'confirmed' }),
        makeFlow({ id: 'f2', status: 'unconfirmed' }),
        makeFlow({ id: 'f3', status: 'rejected' }),
        makeFlow({ id: 'f4', status: 'confirmed' }),
      ],
    })
    const result = extractConfirmedFlows(plan)
    expect(result).toHaveLength(2)
    expect(result.map(f => f.id)).toEqual(['f1', 'f4'])
  })

  it('returns empty array when no confirmed flows', () => {
    const plan = makeNormalizedPlan({
      flows: [makeFlow({ status: 'unconfirmed' })],
    })
    const result = extractConfirmedFlows(plan)
    expect(result).toHaveLength(0)
  })

  it('returns all flows when all are confirmed', () => {
    const plan = makeNormalizedPlan({
      flows: [
        makeFlow({ id: 'f1', status: 'confirmed' }),
        makeFlow({ id: 'f2', status: 'confirmed' }),
      ],
    })
    const result = extractConfirmedFlows(plan)
    expect(result).toHaveLength(2)
  })
})

// ============================================================================
// createLoadPlanNode tests
// ============================================================================

describe('createLoadPlanNode', () => {
  it('sets generationV2Phase to flow_codebase_scout on success', async () => {
    const plan = makeNormalizedPlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const node = createLoadPlanNode({ planLoader })

    const result = await node(makeState({ planSlug: 'test-plan' }))

    expect(result.generationV2Phase).toBe('flow_codebase_scout')
    expect(result.refinedPlan).not.toBeNull()
    expect(result.flows).toHaveLength(1)
  })

  it('sets generationV2Phase to error when loader returns null', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const node = createLoadPlanNode({ planLoader })

    const result = await node(makeState({ planSlug: 'missing-plan' }))

    expect(result.generationV2Phase).toBe('error')
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining("could not load plan for slug 'missing-plan'")]),
    )
  })

  it('sets generationV2Phase to error when loader throws', async () => {
    const planLoader = vi.fn().mockRejectedValue(new Error('Network error'))
    const node = createLoadPlanNode({ planLoader })

    const result = await node(makeState({ planSlug: 'test-plan' }))

    expect(result.generationV2Phase).toBe('error')
  })

  it('default no-op loader returns error phase', async () => {
    const node = createLoadPlanNode()
    const result = await node(makeState({ planSlug: 'test-plan' }))
    expect(result.generationV2Phase).toBe('error')
  })

  it('extracts only confirmed flows from loaded plan', async () => {
    const plan = makeNormalizedPlan({
      flows: [
        makeFlow({ id: 'confirmed', status: 'confirmed' }),
        makeFlow({ id: 'unconfirmed', status: 'unconfirmed' }),
      ],
    })
    const planLoader = vi.fn().mockResolvedValue(plan)
    const node = createLoadPlanNode({ planLoader })

    const result = await node(makeState({ planSlug: 'test-plan' }))

    expect(result.flows).toHaveLength(1)
    expect(result.flows?.[0].id).toBe('confirmed')
  })

  it('sets bakeOffVersion unchanged (v2-agentic default)', async () => {
    const plan = makeNormalizedPlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const node = createLoadPlanNode({ planLoader })

    const state = makeState({ planSlug: 'test-plan', bakeOffVersion: 'v2-agentic' })
    const result = await node(state)

    // bakeOffVersion is not touched by load-plan node — stays in state
    expect(state.bakeOffVersion).toBe('v2-agentic')
    expect(result.generationV2Phase).toBe('flow_codebase_scout')
  })
})

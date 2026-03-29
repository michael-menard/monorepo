import { describe, it, expect, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  fetchExistingStories,
  fetchRelatedPlans,
  extractExistingPatterns,
  createGroundingScoutNode,
  type KbStoriesAdapterFn,
  type KbRelatedPlansAdapterFn,
} from '../grounding-scout.js'
import type { PlanRefinementV2State } from '../../../state/plan-refinement-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeBaseState = (overrides: Partial<PlanRefinementV2State> = {}): PlanRefinementV2State => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan: {
    planSlug: 'test-plan',
    title: 'Test Plan',
    summary: 'A test plan',
    problemStatement: 'Problem',
    proposedSolution: 'Solution',
    goals: [],
    nonGoals: [],
    flows: [],
    openQuestions: [],
    warnings: [],
    constraints: ['must use postgres'],
    dependencies: ['other-plan'],
    status: 'draft',
    priority: 'medium',
    tags: ['lego', 'moc'],
  },
  flows: [],
  groundingContext: null,
  postconditionResult: null,
  refinementV2Phase: 'grounding_scout',
  retryCount: 0,
  maxRetries: 3,
  internalIterations: 0,
  tokenUsage: [],
  bakeOffVersion: 'v2-agentic',
  warnings: [],
  errors: [],
  ...overrides,
})

// ============================================================================
// fetchExistingStories tests
// ============================================================================

describe('fetchExistingStories', () => {
  it('returns empty array when adapter is undefined', async () => {
    const result = await fetchExistingStories('test-plan', undefined)
    expect(result).toEqual([])
  })

  it('calls adapter with planSlug and returns results', async () => {
    const adapter: KbStoriesAdapterFn = vi.fn().mockResolvedValue([
      { storyId: 'APRS-001', title: 'Story 1', state: 'ready', parentFlowId: 'flow-1' },
    ])
    const result = await fetchExistingStories('test-plan', adapter)
    expect(adapter).toHaveBeenCalledWith('test-plan')
    expect(result).toHaveLength(1)
    expect(result[0].storyId).toBe('APRS-001')
  })

  it('returns empty array when adapter throws (graceful degradation)', async () => {
    const adapter: KbStoriesAdapterFn = vi.fn().mockRejectedValue(new Error('KB unavailable'))
    const result = await fetchExistingStories('test-plan', adapter)
    expect(result).toEqual([])
  })
})

// ============================================================================
// fetchRelatedPlans tests
// ============================================================================

describe('fetchRelatedPlans', () => {
  it('returns empty array when adapter is undefined', async () => {
    const result = await fetchRelatedPlans(['lego', 'moc'], undefined)
    expect(result).toEqual([])
  })

  it('returns empty array when tags array is empty', async () => {
    const adapter: KbRelatedPlansAdapterFn = vi.fn().mockResolvedValue([])
    const result = await fetchRelatedPlans([], adapter)
    expect(adapter).not.toHaveBeenCalled()
    expect(result).toEqual([])
  })

  it('calls adapter with tags and returns results', async () => {
    const adapter: KbRelatedPlansAdapterFn = vi.fn().mockResolvedValue([
      { planSlug: 'related-plan', title: 'Related Plan', status: 'active' },
    ])
    const result = await fetchRelatedPlans(['lego', 'moc'], adapter)
    expect(adapter).toHaveBeenCalledWith(['lego', 'moc'])
    expect(result).toHaveLength(1)
    expect(result[0].planSlug).toBe('related-plan')
  })

  it('returns empty array when adapter throws (graceful degradation)', async () => {
    const adapter: KbRelatedPlansAdapterFn = vi.fn().mockRejectedValue(new Error('KB down'))
    const result = await fetchRelatedPlans(['lego'], adapter)
    expect(result).toEqual([])
  })
})

// ============================================================================
// extractExistingPatterns tests
// ============================================================================

describe('extractExistingPatterns', () => {
  it('returns empty array when normalizedPlan is null', () => {
    const state = makeBaseState({ normalizedPlan: null })
    expect(extractExistingPatterns(state)).toEqual([])
  })

  it('extracts constraint patterns from normalizedPlan', () => {
    const state = makeBaseState()
    const patterns = extractExistingPatterns(state)
    expect(patterns).toContain('constraint: must use postgres')
  })

  it('extracts dependency patterns from normalizedPlan', () => {
    const state = makeBaseState()
    const patterns = extractExistingPatterns(state)
    expect(patterns).toContain('dependency: other-plan')
  })

  it('returns empty array when plan has no constraints or dependencies', () => {
    const state = makeBaseState({
      normalizedPlan: {
        planSlug: 'test-plan',
        title: 'Test',
        summary: '',
        problemStatement: '',
        proposedSolution: '',
        goals: [],
        nonGoals: [],
        flows: [],
        openQuestions: [],
        warnings: [],
        constraints: [],
        dependencies: [],
        status: 'draft',
        priority: 'medium',
        tags: [],
      },
    })
    expect(extractExistingPatterns(state)).toEqual([])
  })
})

// ============================================================================
// createGroundingScoutNode tests
// ============================================================================

describe('createGroundingScoutNode', () => {
  it('returns populated groundingContext with empty arrays when no adapters provided', async () => {
    const node = createGroundingScoutNode()
    const result = await node(makeBaseState())
    expect(result.groundingContext).not.toBeNull()
    expect(result.groundingContext?.existingStories).toEqual([])
    expect(result.groundingContext?.relatedPlans).toEqual([])
    expect(result.groundingContext?.feasibilityFlags).toEqual([])
  })

  it('sets refinementV2Phase to feasibility_scan', async () => {
    const node = createGroundingScoutNode()
    const result = await node(makeBaseState())
    expect(result.refinementV2Phase).toBe('feasibility_scan')
  })

  it('populates existingStories from kbStoriesAdapter', async () => {
    const kbStoriesAdapter: KbStoriesAdapterFn = vi.fn().mockResolvedValue([
      { storyId: 'APRS-001', title: 'Story 1', state: 'ready' },
    ])
    const node = createGroundingScoutNode({ kbStoriesAdapter })
    const result = await node(makeBaseState())
    expect(result.groundingContext?.existingStories).toHaveLength(1)
  })

  it('populates relatedPlans from kbRelatedPlansAdapter', async () => {
    const kbRelatedPlansAdapter: KbRelatedPlansAdapterFn = vi.fn().mockResolvedValue([
      { planSlug: 'related-plan', title: 'Related', status: 'active' },
    ])
    const node = createGroundingScoutNode({ kbRelatedPlansAdapter })
    const result = await node(makeBaseState())
    expect(result.groundingContext?.relatedPlans).toHaveLength(1)
  })

  it('extracts existingPatterns from plan constraints and dependencies', async () => {
    const node = createGroundingScoutNode()
    const result = await node(makeBaseState())
    expect(result.groundingContext?.existingPatterns).toContain('constraint: must use postgres')
    expect(result.groundingContext?.existingPatterns).toContain('dependency: other-plan')
  })

  it('never throws even when both adapters fail', async () => {
    const kbStoriesAdapter: KbStoriesAdapterFn = vi.fn().mockRejectedValue(new Error('fail'))
    const kbRelatedPlansAdapter: KbRelatedPlansAdapterFn = vi.fn().mockRejectedValue(new Error('fail'))
    const node = createGroundingScoutNode({ kbStoriesAdapter, kbRelatedPlansAdapter })
    await expect(node(makeBaseState())).resolves.not.toThrow()
  })

  it('initializes feasibilityFlags as empty array (populated by feasibility_scan)', async () => {
    const node = createGroundingScoutNode()
    const result = await node(makeBaseState())
    expect(result.groundingContext?.feasibilityFlags).toEqual([])
  })

  it('handles normalizedPlan with no tags — skips relatedPlans adapter', async () => {
    const kbRelatedPlansAdapter: KbRelatedPlansAdapterFn = vi.fn().mockResolvedValue([])
    const node = createGroundingScoutNode({ kbRelatedPlansAdapter })
    const state = makeBaseState({
      normalizedPlan: {
        planSlug: 'test-plan',
        title: 'Test',
        summary: '',
        problemStatement: '',
        proposedSolution: '',
        goals: [],
        nonGoals: [],
        flows: [],
        openQuestions: [],
        warnings: [],
        constraints: [],
        dependencies: [],
        status: 'draft',
        priority: 'medium',
        tags: [],
      },
    })
    const result = await node(state)
    expect(kbRelatedPlansAdapter).not.toHaveBeenCalled()
    expect(result.groundingContext?.relatedPlans).toEqual([])
  })
})

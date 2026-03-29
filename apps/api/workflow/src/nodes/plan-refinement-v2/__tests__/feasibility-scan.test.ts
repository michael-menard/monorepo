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
  checkFlowImplemented,
  checkDependencyPresent,
  checkFeasibility,
  createFeasibilityScanNode,
} from '../feasibility-scan.js'
import type { Flow, NormalizedPlan } from '../../../state/plan-refinement-state.js'
import type { GroundingContext, PlanRefinementV2State } from '../../../state/plan-refinement-v2-state.js'

// ============================================================================
// Test Fixtures
// ============================================================================

const makeFlow = (id: string, overrides: Partial<Flow> = {}): Flow => ({
  id,
  name: `Flow ${id}`,
  actor: 'user',
  trigger: 'user clicks button',
  steps: [],
  successOutcome: 'success',
  source: 'inferred',
  confidence: 0.9,
  status: 'unconfirmed',
  ...overrides,
})

const makeNormalizedPlan = (overrides: Partial<NormalizedPlan> = {}): NormalizedPlan => ({
  planSlug: 'test-plan',
  title: 'Test Plan',
  summary: 'A test plan',
  problemStatement: 'Problem',
  proposedSolution: 'Solution',
  goals: [],
  nonGoals: [],
  flows: [makeFlow('flow-1'), makeFlow('flow-2')],
  openQuestions: [],
  warnings: [],
  constraints: [],
  dependencies: ['dep-plan-a', 'dep-plan-b'],
  status: 'draft',
  priority: 'medium',
  tags: [],
  ...overrides,
})

const makeGroundingContext = (overrides: Partial<GroundingContext> = {}): GroundingContext => ({
  existingStories: [],
  relatedPlans: [],
  existingPatterns: [],
  feasibilityFlags: [],
  ...overrides,
})

const makeBaseState = (overrides: Partial<PlanRefinementV2State> = {}): PlanRefinementV2State => ({
  planSlug: 'test-plan',
  rawPlan: null,
  normalizedPlan: makeNormalizedPlan(),
  flows: [],
  groundingContext: makeGroundingContext(),
  postconditionResult: null,
  refinementV2Phase: 'feasibility_scan',
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
// checkFlowImplemented tests
// ============================================================================

describe('checkFlowImplemented', () => {
  it('returns null when no stories have matching parentFlowId', () => {
    const flow = makeFlow('flow-1')
    const existingStories: GroundingContext['existingStories'] = [
      { storyId: 'APRS-001', title: 'Other', state: 'ready', parentFlowId: 'flow-999' },
    ]
    expect(checkFlowImplemented(flow, existingStories)).toBeNull()
  })

  it('returns already_implemented flag when stories match the flow id', () => {
    const flow = makeFlow('flow-1')
    const existingStories: GroundingContext['existingStories'] = [
      { storyId: 'APRS-001', title: 'Story 1', state: 'ready', parentFlowId: 'flow-1' },
      { storyId: 'APRS-002', title: 'Story 2', state: 'in_progress', parentFlowId: 'flow-1' },
    ]
    const result = checkFlowImplemented(flow, existingStories)
    expect(result).not.toBeNull()
    expect(result?.flag).toBe('already_implemented')
    expect(result?.evidence).toContain('APRS-001')
    expect(result?.evidence).toContain('APRS-002')
  })

  it('returns null when existingStories is empty', () => {
    const flow = makeFlow('flow-1')
    expect(checkFlowImplemented(flow, [])).toBeNull()
  })

  it('includes flow name in claim', () => {
    const flow = makeFlow('flow-1')
    const existingStories: GroundingContext['existingStories'] = [
      { storyId: 'APRS-001', title: 'Story 1', state: 'ready', parentFlowId: 'flow-1' },
    ]
    const result = checkFlowImplemented(flow, existingStories)
    expect(result?.claim).toContain('Flow flow-1')
  })
})

// ============================================================================
// checkDependencyPresent tests
// ============================================================================

describe('checkDependencyPresent', () => {
  it('returns null when dependency matches a plan slug', () => {
    const relatedPlans: GroundingContext['relatedPlans'] = [
      { planSlug: 'dep-plan-a', title: 'Dep Plan A', status: 'active' },
    ]
    expect(checkDependencyPresent('dep-plan-a', relatedPlans)).toBeNull()
  })

  it('returns missing_dependency flag when dependency not found', () => {
    const relatedPlans: GroundingContext['relatedPlans'] = [
      { planSlug: 'other-plan', title: 'Other Plan', status: 'active' },
    ]
    const result = checkDependencyPresent('dep-plan-a', relatedPlans)
    expect(result).not.toBeNull()
    expect(result?.flag).toBe('missing_dependency')
    expect(result?.claim).toContain('dep-plan-a')
  })

  it('returns null when dependency matches a plan title (case-insensitive)', () => {
    const relatedPlans: GroundingContext['relatedPlans'] = [
      { planSlug: 'some-slug', title: 'My Dependency Module', status: 'active' },
    ]
    expect(checkDependencyPresent('dependency', relatedPlans)).toBeNull()
  })

  it('returns missing_dependency when relatedPlans is empty', () => {
    const result = checkDependencyPresent('dep-plan-a', [])
    expect(result).not.toBeNull()
    expect(result?.flag).toBe('missing_dependency')
  })
})

// ============================================================================
// checkFeasibility tests
// ============================================================================

describe('checkFeasibility', () => {
  it('returns empty flags when all flows and dependencies check out', () => {
    const plan = makeNormalizedPlan({ dependencies: [] })
    const ctx = makeGroundingContext()
    expect(checkFeasibility(plan, ctx)).toEqual([])
  })

  it('flags flows with matching existing stories as already_implemented', () => {
    const plan = makeNormalizedPlan({
      flows: [makeFlow('flow-1')],
      dependencies: [],
    })
    const ctx = makeGroundingContext({
      existingStories: [
        { storyId: 'APRS-001', title: 'Story 1', state: 'ready', parentFlowId: 'flow-1' },
      ],
    })
    const flags = checkFeasibility(plan, ctx)
    expect(flags).toHaveLength(1)
    expect(flags[0].flag).toBe('already_implemented')
  })

  it('flags missing dependencies', () => {
    const plan = makeNormalizedPlan({
      flows: [],
      dependencies: ['missing-plan'],
    })
    const ctx = makeGroundingContext({
      relatedPlans: [{ planSlug: 'other-plan', title: 'Other', status: 'active' }],
    })
    const flags = checkFeasibility(plan, ctx)
    expect(flags).toHaveLength(1)
    expect(flags[0].flag).toBe('missing_dependency')
  })

  it('returns multiple flags for multiple issues', () => {
    const plan = makeNormalizedPlan({
      flows: [makeFlow('flow-1')],
      dependencies: ['missing-dep'],
    })
    const ctx = makeGroundingContext({
      existingStories: [
        { storyId: 'APRS-001', title: 'Story', state: 'ready', parentFlowId: 'flow-1' },
      ],
      relatedPlans: [],
    })
    const flags = checkFeasibility(plan, ctx)
    expect(flags.length).toBeGreaterThanOrEqual(2)
  })
})

// ============================================================================
// createFeasibilityScanNode tests
// ============================================================================

describe('createFeasibilityScanNode', () => {
  it('sets refinementV2Phase to refinement_agent', async () => {
    const node = createFeasibilityScanNode()
    const result = await node(makeBaseState())
    expect(result.refinementV2Phase).toBe('refinement_agent')
  })

  it('populates feasibilityFlags in groundingContext', async () => {
    const state = makeBaseState({
      groundingContext: makeGroundingContext({
        existingStories: [
          { storyId: 'APRS-001', title: 'Story', state: 'ready', parentFlowId: 'flow-1' },
        ],
      }),
      normalizedPlan: makeNormalizedPlan({
        flows: [makeFlow('flow-1')],
        dependencies: [],
      }),
    })
    const node = createFeasibilityScanNode()
    const result = await node(state)
    expect(result.groundingContext?.feasibilityFlags.length).toBeGreaterThan(0)
  })

  it('handles null normalizedPlan gracefully — skips checks', async () => {
    const node = createFeasibilityScanNode()
    const state = makeBaseState({ normalizedPlan: null })
    const result = await node(state)
    expect(result.refinementV2Phase).toBe('refinement_agent')
    expect(result.groundingContext).toBeUndefined()
  })

  it('handles null groundingContext gracefully — skips checks', async () => {
    const node = createFeasibilityScanNode()
    const state = makeBaseState({ groundingContext: null })
    const result = await node(state)
    expect(result.refinementV2Phase).toBe('refinement_agent')
  })

  it('returns updated groundingContext with existing patterns preserved', async () => {
    const state = makeBaseState({
      groundingContext: makeGroundingContext({
        existingPatterns: ['constraint: must use postgres'],
      }),
      normalizedPlan: makeNormalizedPlan({ flows: [], dependencies: [] }),
    })
    const node = createFeasibilityScanNode()
    const result = await node(state)
    expect(result.groundingContext?.existingPatterns).toContain('constraint: must use postgres')
  })

  it('does not set feasibilityFlags when no flows and no dependencies', async () => {
    const state = makeBaseState({
      normalizedPlan: makeNormalizedPlan({ flows: [], dependencies: [] }),
    })
    const node = createFeasibilityScanNode()
    const result = await node(state)
    expect(result.groundingContext?.feasibilityFlags).toEqual([])
  })
})

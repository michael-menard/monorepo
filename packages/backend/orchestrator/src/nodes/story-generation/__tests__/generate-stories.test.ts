/**
 * generate_stories node tests
 * APRS-4010: ST-4 / AC-5, AC-7
 */

import { describe, it, expect, vi } from 'vitest'
import {
  generateTitle,
  generateTags,
  generateStepReference,
  generateSingleStory,
  createGenerateStoriesNode,
  type LlmAdapterFn,
} from '../generate-stories.js'
import type { StoryGenerationState, SlicedFlow } from '../../../state/story-generation-state.js'
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
    generationPhase: 'generate_stories',
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
    steps: [
      { index: 1, description: 'Step one' },
      { index: 2, description: 'Step two' },
    ],
    successOutcome: 'Completed',
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
    goals: [],
    nonGoals: [],
    flows: [],
    openQuestions: [],
    warnings: [],
    constraints: [],
    dependencies: [],
    status: 'refined',
    priority: 'medium',
    tags: ['backend'],
    ...overrides,
  }
}

function makeSlice(overrides: Partial<SlicedFlow> = {}): SlicedFlow {
  return {
    flow_id: 'flow-1',
    step_indices: [1, 2],
    scope_description: 'Do the thing',
    ...overrides,
  }
}

const mockLlmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue({
  description: 'LLM-generated description',
  acceptance_criteria: ['AC-1: Works correctly'],
  subtasks: [{ id: 'st-1', description: 'Implement feature', files: ['src/foo.ts'], verification: 'pnpm test' }],
  risk: 'low',
})

// ============================================================================
// Template helper tests
// ============================================================================

describe('generateTitle', () => {
  it('combines flow name and description', () => {
    const title = generateTitle('User Login', 'Validate credentials')
    expect(title).toBe('User Login: Validate credentials')
  })

  it('truncates long descriptions', () => {
    const longDesc = 'A'.repeat(80)
    const title = generateTitle('Flow', longDesc)
    expect(title.length).toBeLessThanOrEqual(70)
    expect(title).toContain('...')
  })
})

describe('generateTags', () => {
  it('includes plan tags plus actor and flow tags', () => {
    const tags = generateTags(['backend', 'api'], 'Admin User', 'Create Plan')
    expect(tags).toContain('backend')
    expect(tags).toContain('api')
    expect(tags).toContain('actor:admin-user')
    expect(tags).toContain('flow:create-plan')
  })

  it('deduplicates tags', () => {
    const tags = generateTags(['backend', 'backend'], 'User', 'Flow')
    const backendCount = tags.filter(t => t === 'backend').length
    expect(backendCount).toBe(1)
  })
})

describe('generateStepReference', () => {
  it('single step reference', () => {
    expect(generateStepReference('f1', [3])).toBe('f1:step-3')
  })

  it('multi-step reference', () => {
    expect(generateStepReference('f1', [1, 2, 3])).toBe('f1:steps-1-3')
  })

  it('empty steps', () => {
    expect(generateStepReference('f1', [])).toBe('f1:none')
  })
})

// ============================================================================
// generateSingleStory tests
// ============================================================================

describe('generateSingleStory', () => {
  it('generates a complete story from slice + flow + plan', async () => {
    const slice = makeSlice()
    const flow = makeFlow()
    const plan = makePlan()

    const story = await generateSingleStory(slice, flow, plan, mockLlmAdapter)

    expect(story.title).toContain('Test Flow')
    expect(story.description).toBe('LLM-generated description')
    expect(story.acceptance_criteria).toHaveLength(1)
    expect(story.subtasks).toHaveLength(1)
    expect(story.parent_plan_slug).toBe('test-plan')
    expect(story.parent_flow_id).toBe('flow-1')
    expect(story.minimum_path).toBe(false)
    expect(story.tags).toContain('backend')
  })

  it('passes correct prompt to LLM adapter', async () => {
    const adapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['ac'],
      subtasks: [],
      risk: 'low',
    })

    const slice = makeSlice({ scope_description: 'Test scope' })
    const flow = makeFlow({ name: 'My Flow', actor: 'Admin' })
    const plan = makePlan({ title: 'My Plan', summary: 'Plan summary' })

    await generateSingleStory(slice, flow, plan, adapter)

    expect(adapter).toHaveBeenCalledWith(
      expect.objectContaining({
        planTitle: 'My Plan',
        planSummary: 'Plan summary',
        flowName: 'My Flow',
        flowActor: 'Admin',
        sliceDescription: 'Test scope',
      }),
    )
  })
})

// ============================================================================
// createGenerateStoriesNode tests
// ============================================================================

describe('createGenerateStoriesNode', () => {
  it('generates stories and sets phase to complete', async () => {
    const node = createGenerateStoriesNode({ llmAdapter: mockLlmAdapter })
    const flow = makeFlow()
    const plan = makePlan({ flows: [flow] })
    const slice = makeSlice()
    const state = makeState({
      refinedPlan: plan,
      flows: [flow],
      slicedFlows: [slice],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('complete')
    expect(result.generatedStories).toHaveLength(1)
    expect(result.generatedStories![0].title).toContain('Test Flow')
  })

  it('returns error when no sliced flows', async () => {
    const node = createGenerateStoriesNode()
    const state = makeState({ slicedFlows: [] })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('no sliced flows')
  })

  it('returns error when refinedPlan is null', async () => {
    const node = createGenerateStoriesNode()
    const state = makeState({
      refinedPlan: null,
      slicedFlows: [makeSlice()],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('refinedPlan is null')
  })

  it('skips slices with missing flow and adds warning', async () => {
    const node = createGenerateStoriesNode({ llmAdapter: mockLlmAdapter })
    const flow = makeFlow({ id: 'existing-flow' })
    const plan = makePlan({ flows: [flow] })
    const state = makeState({
      refinedPlan: plan,
      flows: [flow],
      slicedFlows: [
        makeSlice({ flow_id: 'missing-flow' }),
        makeSlice({ flow_id: 'existing-flow' }),
      ],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('complete')
    expect(result.generatedStories).toHaveLength(1)
    expect(result.warnings!.length).toBeGreaterThan(0)
    expect(result.warnings![0]).toContain('missing-flow')
  })

  it('handles LLM adapter failure for individual stories', async () => {
    const failingAdapter: LlmAdapterFn = vi.fn()
      .mockRejectedValueOnce(new Error('LLM timeout'))
      .mockResolvedValueOnce({
        description: 'Success',
        acceptance_criteria: ['AC'],
        subtasks: [],
        risk: 'low',
      })

    const node = createGenerateStoriesNode({ llmAdapter: failingAdapter })
    const flow = makeFlow()
    const plan = makePlan()
    const state = makeState({
      refinedPlan: plan,
      flows: [flow],
      slicedFlows: [
        makeSlice({ step_indices: [1] }),
        makeSlice({ step_indices: [2] }),
      ],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('complete')
    expect(result.generatedStories).toHaveLength(1)
    expect(result.warnings!.some(w => w.includes('LLM timeout'))).toBe(true)
  })

  it('uses default adapter when none provided', async () => {
    const node = createGenerateStoriesNode()
    const flow = makeFlow()
    const plan = makePlan()
    const state = makeState({
      refinedPlan: plan,
      flows: [flow],
      slicedFlows: [makeSlice()],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('complete')
    expect(result.generatedStories).toHaveLength(1)
    expect(result.generatedStories![0].description).toContain('Implement')
  })
})

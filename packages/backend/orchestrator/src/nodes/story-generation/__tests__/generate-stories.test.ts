/**
 * generate_stories node tests
 * APRS-4010: ST-4 / AC-5
 */

import { describe, it, expect, vi } from 'vitest'
import {
  deriveStoryTitle,
  deriveStoryTags,
  buildFlowStepReference,
  buildStoryPrompt,
  generateFallbackStory,
  generateStoryForSlice,
  createGenerateStoriesNode,
} from '../generate-stories.js'
import type { NormalizedPlan, Flow } from '../../../state/plan-refinement-state.js'
import type { SlicedFlow, StoryGenerationState } from '../../../state/story-generation-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makePlan(overrides: Partial<NormalizedPlan> = {}): NormalizedPlan {
  return {
    planSlug: 'test-plan',
    title: 'Test Plan',
    summary: 'A test plan summary',
    problemStatement: 'The problem',
    proposedSolution: 'The solution',
    goals: ['Goal 1'],
    nonGoals: ['Non-goal 1'],
    flows: [],
    openQuestions: [],
    warnings: [],
    constraints: [],
    dependencies: [],
    status: 'active',
    priority: 'high',
    tags: ['backend', 'api'],
    ...overrides,
  }
}

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'flow-1',
    name: 'User Creates Plan',
    actor: 'Admin',
    trigger: 'Admin clicks create',
    steps: [
      { index: 1, description: 'Open form' },
      { index: 2, description: 'Fill fields' },
      { index: 3, description: 'Save to database' },
    ],
    successOutcome: 'Plan saved',
    source: 'user',
    confidence: 1.0,
    status: 'confirmed',
    ...overrides,
  }
}

function makeSlice(overrides: Partial<SlicedFlow> = {}): SlicedFlow {
  return {
    flow_id: 'flow-1',
    step_indices: [1, 2],
    scope_description: 'Open form through Fill fields',
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
    generationPhase: 'generate_stories',
    errors: [],
    warnings: [],
    ...overrides,
  }
}

// ============================================================================
// deriveStoryTitle tests
// ============================================================================

describe('deriveStoryTitle', () => {
  it('returns "Actor: scopeDescription" when scope differs from flow name', () => {
    const title = deriveStoryTitle('User Creates Plan', 'Admin', 'Open form through Fill fields')
    expect(title).toBe('Admin: Open form through Fill fields')
  })

  it('returns "Actor: flowName" when scope includes flow name', () => {
    const title = deriveStoryTitle('User Creates Plan', 'Admin', 'User Creates Plan')
    expect(title).toBe('Admin: User Creates Plan')
  })
})

// ============================================================================
// deriveStoryTags tests
// ============================================================================

describe('deriveStoryTags', () => {
  it('includes plan tags, actor tag, and flow tag', () => {
    const tags = deriveStoryTags(['backend', 'api'], 'Admin', 'User Creates Plan')
    expect(tags).toContain('backend')
    expect(tags).toContain('api')
    expect(tags).toContain('admin')
    expect(tags).toContain('user-creates-plan')
  })

  it('deduplicates tags', () => {
    const tags = deriveStoryTags(['admin'], 'Admin', 'Flow')
    const unique = new Set(tags)
    expect(unique.size).toBe(tags.length)
  })
})

// ============================================================================
// buildFlowStepReference tests
// ============================================================================

describe('buildFlowStepReference', () => {
  it('returns all reference when no step indices', () => {
    expect(buildFlowStepReference('flow-1', [])).toBe('flow-1/all')
  })

  it('returns single step reference for one index', () => {
    expect(buildFlowStepReference('flow-1', [3])).toBe('flow-1/step-3')
  })

  it('returns range reference for multiple indices', () => {
    expect(buildFlowStepReference('flow-1', [1, 2, 3])).toBe('flow-1/steps-1-3')
  })
})

// ============================================================================
// buildStoryPrompt tests
// ============================================================================

describe('buildStoryPrompt', () => {
  it('builds a prompt with correct fields', () => {
    const plan = makePlan()
    const flow = makeFlow()
    const slice = makeSlice({ step_indices: [1, 2] })

    const prompt = buildStoryPrompt(plan, flow, slice)

    expect(prompt.planTitle).toBe('Test Plan')
    expect(prompt.planSummary).toBe('A test plan summary')
    expect(prompt.planTags).toEqual(['backend', 'api'])
    expect(prompt.flowName).toBe('User Creates Plan')
    expect(prompt.flowActor).toBe('Admin')
    expect(prompt.scopeDescription).toBe('Open form through Fill fields')
    // stepDescriptions: steps 1 and 2
    expect(prompt.stepDescriptions).toEqual(['Open form', 'Fill fields'])
  })
})

// ============================================================================
// generateFallbackStory tests
// ============================================================================

describe('generateFallbackStory', () => {
  it('generates a valid story without LLM', () => {
    const plan = makePlan()
    const flow = makeFlow()
    const slice = makeSlice()

    const story = generateFallbackStory(plan, flow, slice)

    expect(story.title).toBeTruthy()
    expect(story.description).toBeTruthy()
    expect(Array.isArray(story.acceptance_criteria)).toBe(true)
    expect(story.acceptance_criteria.length).toBeGreaterThan(0)
    expect(story.parent_plan_slug).toBe('test-plan')
    expect(story.parent_flow_id).toBe('flow-1')
    expect(story.flow_step_reference).toContain('flow-1')
    expect(story.minimum_path).toBe(false)
    expect(['low', 'medium', 'high']).toContain(story.risk)
  })
})

// ============================================================================
// generateStoryForSlice tests
// ============================================================================

describe('generateStoryForSlice', () => {
  it('uses LLM adapter when provided', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'LLM description',
      acceptance_criteria: ['AC1', 'AC2'],
      subtasks: ['Task 1'],
      risk: 'low',
    })
    const plan = makePlan()
    const flow = makeFlow()
    const slice = makeSlice()

    const story = await generateStoryForSlice(plan, flow, slice, llmAdapter)

    expect(llmAdapter).toHaveBeenCalledOnce()
    expect(story.description).toBe('LLM description')
    expect(story.acceptance_criteria).toEqual(['AC1', 'AC2'])
    expect(story.subtasks).toEqual(['Task 1'])
    expect(story.risk).toBe('low')
    expect(story.tags).toContain('backend')
    expect(story.tags).toContain('admin')
  })

  it('falls back to template when no LLM adapter', async () => {
    const plan = makePlan()
    const flow = makeFlow()
    const slice = makeSlice()

    const story = await generateStoryForSlice(plan, flow, slice, undefined)

    expect(story.title).toBeTruthy()
    expect(story.parent_plan_slug).toBe('test-plan')
    expect(story.parent_flow_id).toBe('flow-1')
  })

  it('falls back to template when LLM adapter throws', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('LLM unavailable'))
    const plan = makePlan()
    const flow = makeFlow()
    const slice = makeSlice()

    const story = await generateStoryForSlice(plan, flow, slice, llmAdapter)

    // Should not throw — fallback used
    expect(story.title).toBeTruthy()
    expect(story.parent_plan_slug).toBe('test-plan')
  })

  it('title is template-derived (not from LLM)', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['ac'],
      subtasks: [],
    })
    const plan = makePlan()
    const flow = makeFlow({ name: 'Create Record', actor: 'System' })
    const slice = makeSlice({ scope_description: 'Save record to DB' })

    const story = await generateStoryForSlice(plan, flow, slice, llmAdapter)

    // Title is derived from actor + scope, not from LLM
    expect(story.title).toContain('System')
  })

  it('tags are template-derived from plan tags + actor + flow name', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['ac'],
      subtasks: [],
    })
    const plan = makePlan({ tags: ['payments'] })
    const flow = makeFlow({ name: 'Process Payment', actor: 'Gateway' })
    const slice = makeSlice()

    const story = await generateStoryForSlice(plan, flow, slice, llmAdapter)

    expect(story.tags).toContain('payments')
    expect(story.tags).toContain('gateway')
    expect(story.tags).toContain('process-payment')
  })
})

// ============================================================================
// createGenerateStoriesNode tests
// ============================================================================

describe('createGenerateStoriesNode', () => {
  it('generates stories for all sliced flows', async () => {
    const plan = makePlan()
    const flow1 = makeFlow({ id: 'flow-1' })
    const flow2 = makeFlow({ id: 'flow-2', name: 'Review Plan', actor: 'Reviewer' })

    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'Generated',
      acceptance_criteria: ['AC'],
      subtasks: [],
      risk: 'low',
    })

    const node = createGenerateStoriesNode({ llmAdapter })
    const state = makeState({
      refinedPlan: plan,
      flows: [flow1, flow2],
      slicedFlows: [
        makeSlice({ flow_id: 'flow-1' }),
        makeSlice({ flow_id: 'flow-2' }),
      ],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('wire_dependencies')
    expect(result.generatedStories).toHaveLength(2)
    expect(llmAdapter).toHaveBeenCalledTimes(2)
  })

  it('sets error phase when refinedPlan is null', async () => {
    const node = createGenerateStoriesNode()
    const state = makeState({ refinedPlan: null })

    const result = await node(state)

    expect(result.generationPhase).toBe('error')
    expect(result.errors).toEqual(
      expect.arrayContaining([expect.stringContaining('refinedPlan is null')]),
    )
  })

  it('completes with empty stories when no sliced flows', async () => {
    const node = createGenerateStoriesNode()
    const state = makeState({
      refinedPlan: makePlan(),
      slicedFlows: [],
    })

    const result = await node(state)

    expect(result.generationPhase).toBe('complete')
    expect(result.generatedStories).toEqual([])
  })

  it('skips slices with missing flow reference and adds warning', async () => {
    const node = createGenerateStoriesNode()
    const state = makeState({
      refinedPlan: makePlan(),
      flows: [makeFlow({ id: 'flow-1' })],
      slicedFlows: [
        makeSlice({ flow_id: 'flow-1' }),
        makeSlice({ flow_id: 'flow-missing' }), // not in state.flows
      ],
    })

    const result = await node(state)

    expect(result.generatedStories).toHaveLength(1)
    expect(result.warnings).toEqual(
      expect.arrayContaining([expect.stringContaining('flow-missing')]),
    )
  })

  it('each story has all required fields', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'Story desc',
      acceptance_criteria: ['AC1'],
      subtasks: ['Sub1'],
      risk: 'high',
    })
    const node = createGenerateStoriesNode({ llmAdapter })
    const state = makeState({
      refinedPlan: makePlan(),
      flows: [makeFlow()],
      slicedFlows: [makeSlice()],
    })

    const result = await node(state)

    const story = result.generatedStories?.[0]
    expect(story?.title).toBeTruthy()
    expect(story?.description).toBeTruthy()
    expect(Array.isArray(story?.acceptance_criteria)).toBe(true)
    expect(Array.isArray(story?.subtasks)).toBe(true)
    expect(Array.isArray(story?.tags)).toBe(true)
    expect(['low', 'medium', 'high']).toContain(story?.risk)
    expect(typeof story?.minimum_path).toBe('boolean')
    expect(story?.parent_plan_slug).toBe('test-plan')
    expect(story?.parent_flow_id).toBe('flow-1')
    expect(story?.flow_step_reference).toBeTruthy()
  })
})

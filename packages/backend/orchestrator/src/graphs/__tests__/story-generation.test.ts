/**
 * Story Generation Graph tests
 * APRS-4010: ST-5 / AC-6, AC-7
 */

import { describe, it, expect, vi } from 'vitest'
import { createStoryGenerationGraph } from '../story-generation.js'
import type { NormalizedPlan, Flow } from '../../state/plan-refinement-state.js'
import type { LlmAdapterFn } from '../../nodes/story-generation/generate-stories.js'

// ============================================================================
// Helpers
// ============================================================================

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'flow-1',
    name: 'Test Flow',
    actor: 'User',
    trigger: 'User clicks button',
    steps: [
      { index: 1, description: 'Open form' },
      { index: 2, description: 'Save data' },
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

const mockLlmAdapter: LlmAdapterFn = vi.fn().mockResolvedValue({
  description: 'Generated description',
  acceptance_criteria: ['AC-1: Works'],
  subtasks: [],
  risk: 'low',
})

// ============================================================================
// Tests
// ============================================================================

describe('Story Generation Graph', () => {
  it('compiles without throwing (AC-6)', () => {
    expect(() => createStoryGenerationGraph()).not.toThrow()
  })

  it('compiles with injectable adapters', () => {
    const planLoader = vi.fn()
    const llmAdapter = vi.fn()
    expect(() =>
      createStoryGenerationGraph({ planLoader, llmAdapter }),
    ).not.toThrow()
  })

  it('happy path: plan in state → generates stories', async () => {
    const plan = makePlan()
    const graph = createStoryGenerationGraph({ llmAdapter: mockLlmAdapter })

    const result = await graph.invoke({
      planSlug: 'test-plan',
      refinedPlan: plan,
    })

    expect(result.generationPhase).toBe('complete')
    expect(result.generatedStories.length).toBeGreaterThan(0)
    expect(result.generatedStories[0].parent_plan_slug).toBe('test-plan')
    expect(result.generatedStories[0].parent_flow_id).toBe('flow-1')
  })

  it('happy path: plan loaded via adapter → generates stories', async () => {
    const plan = makePlan()
    const planLoader = vi.fn().mockResolvedValue(plan)
    const graph = createStoryGenerationGraph({ planLoader, llmAdapter: mockLlmAdapter })

    const result = await graph.invoke({
      planSlug: 'test-plan',
    })

    expect(planLoader).toHaveBeenCalledWith('test-plan')
    expect(result.generationPhase).toBe('complete')
    expect(result.generatedStories.length).toBeGreaterThan(0)
  })

  it('load_refined_plan error → short-circuits to END', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const graph = createStoryGenerationGraph({ planLoader })

    const result = await graph.invoke({
      planSlug: 'missing-plan',
    })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(result.errors[0]).toContain('no plan found')
    // slice_flows and generate_stories should not have run
    expect(result.slicedFlows).toEqual([])
    expect(result.generatedStories).toEqual([])
  })

  it('no confirmed flows → error at load_refined_plan', async () => {
    const plan = makePlan({
      flows: [makeFlow({ status: 'unconfirmed' })],
    })
    const graph = createStoryGenerationGraph({ llmAdapter: mockLlmAdapter })

    const result = await graph.invoke({
      planSlug: 'test-plan',
      refinedPlan: plan,
    })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.some((e: string) => e.includes('no confirmed flows'))).toBe(true)
  })

  it('multiple flows → multiple stories', async () => {
    const plan = makePlan({
      flows: [
        makeFlow({ id: 'f1', name: 'Flow One' }),
        makeFlow({ id: 'f2', name: 'Flow Two' }),
      ],
    })
    const graph = createStoryGenerationGraph({ llmAdapter: mockLlmAdapter })

    const result = await graph.invoke({
      planSlug: 'test-plan',
      refinedPlan: plan,
    })

    expect(result.generationPhase).toBe('complete')
    // At minimum 2 stories (one per flow), possibly more if slicing splits them
    expect(result.generatedStories.length).toBeGreaterThanOrEqual(2)
  })

  it('stories have correct schema fields (AC-2)', async () => {
    const plan = makePlan()
    const graph = createStoryGenerationGraph({ llmAdapter: mockLlmAdapter })

    const result = await graph.invoke({
      planSlug: 'test-plan',
      refinedPlan: plan,
    })

    const story = result.generatedStories[0]
    expect(story).toHaveProperty('title')
    expect(story).toHaveProperty('description')
    expect(story).toHaveProperty('acceptance_criteria')
    expect(story).toHaveProperty('subtasks')
    expect(story).toHaveProperty('tags')
    expect(story).toHaveProperty('risk')
    expect(story).toHaveProperty('minimum_path')
    expect(story).toHaveProperty('parent_plan_slug')
    expect(story).toHaveProperty('parent_flow_id')
    expect(story).toHaveProperty('flow_step_reference')
    expect(story.minimum_path).toBe(false) // DEC-4
  })
})

// ============================================================================
// APRS-5030: Production Adapter Integration Tests (AC-10)
// ============================================================================

import { createPlanLoaderAdapter } from '../../adapters/story-generation/plan-loader-adapter.js'
import { createStoryIdGeneratorAdapter } from '../../adapters/story-generation/story-id-generator.js'
import { createKbWriterAdapter } from '../../adapters/story-generation/kb-writer-adapter.js'
import type { KbGetPlanFn } from '../../adapters/story-generation/plan-loader-adapter.js'
import type { KbListStoriesFn } from '../../adapters/story-generation/story-id-generator.js'
import type {
  KbIngestStoryFn,
  KbUpdatePlanFn,
} from '../../adapters/story-generation/kb-writer-adapter.js'

describe('story-generation graph with production adapters (AC-10)', () => {
  it('runs full pipeline end-to-end with all three production adapters injected', async () => {
    // Wire all three production adapters via vi.fn() mocks
    const kbGetPlan: KbGetPlanFn = vi.fn().mockResolvedValue(VALID_PLAN)
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([
      { story_id: 'TESTPLAN-1010' },
    ])
    const kbIngestStory: KbIngestStoryFn = vi
      .fn()
      .mockImplementation(async input => ({ story_id: input.story_id }))
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn().mockResolvedValue({ plan_slug: 'test-plan' })
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'Story description',
      acceptance_criteria: ['AC1'],
      subtasks: ['Task 1'],
      risk: 'low',
    })

    const planLoader = createPlanLoaderAdapter(kbGetPlan)
    const storyIdGenerator = createStoryIdGeneratorAdapter(kbListStories)
    const kbWriter = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const graph = createStoryGenerationGraph({
      planLoader,
      llmAdapter,
      storyIdGenerator,
      kbWriter,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('complete')
    expect(result.writeResult).not.toBeNull()
    expect(result.writeResult?.storiesWritten).toBeGreaterThan(0)
    expect(result.writeResult?.storiesFailed).toBe(0)
    expect(result.writeResult?.planStatusUpdated).toBe(true)

    // Adapter calls verified
    expect(kbGetPlan).toHaveBeenCalledWith({ plan_slug: 'test-plan' })
    expect(kbListStories).toHaveBeenCalled()
    expect(kbIngestStory).toHaveBeenCalled()
    expect(kbUpdatePlan).toHaveBeenCalledWith({
      plan_slug: 'test-plan',
      status: 'stories-created',
    })
  })

  it('fails gracefully when plan not found via production adapter', async () => {
    const kbGetPlan: KbGetPlanFn = vi.fn().mockResolvedValue(null)
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([])
    const kbIngestStory: KbIngestStoryFn = vi.fn()
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn()

    const planLoader = createPlanLoaderAdapter(kbGetPlan)
    const storyIdGenerator = createStoryIdGeneratorAdapter(kbListStories)
    const kbWriter = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const graph = createStoryGenerationGraph({ planLoader, storyIdGenerator, kbWriter })
    const result = await graph.invoke({ planSlug: 'nonexistent-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.length).toBeGreaterThan(0)
    expect(kbIngestStory).not.toHaveBeenCalled()
    expect(kbUpdatePlan).not.toHaveBeenCalled()
  })

  it('story IDs are generated with max+10 offset from existing stories', async () => {
    const kbGetPlan: KbGetPlanFn = vi.fn().mockResolvedValue(VALID_PLAN)
    // write-to-kb transforms planSlug 'test-plan' → prefix 'TEST-PLAN'
    const kbListStories: KbListStoriesFn = vi.fn().mockResolvedValue([
      { story_id: 'TEST-PLAN-1010' },
      { story_id: 'TEST-PLAN-1020' },
      { story_id: 'TEST-PLAN-1030' },
    ])
    const capturedStoryIds: string[] = []
    const kbIngestStory: KbIngestStoryFn = vi.fn().mockImplementation(async input => {
      capturedStoryIds.push(input.story_id)
      return { story_id: input.story_id }
    })
    const kbUpdatePlan: KbUpdatePlanFn = vi.fn().mockResolvedValue({ plan_slug: 'test-plan' })
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['AC1'],
      subtasks: [],
      risk: 'low',
    })

    const planLoader = createPlanLoaderAdapter(kbGetPlan)
    const storyIdGenerator = createStoryIdGeneratorAdapter(kbListStories)
    const kbWriter = createKbWriterAdapter(kbIngestStory, kbUpdatePlan)

    const graph = createStoryGenerationGraph({
      planLoader,
      llmAdapter,
      storyIdGenerator,
      kbWriter,
    })
    await graph.invoke({ planSlug: 'test-plan' })

    // IDs should start from 1040 (max 1030 + 10)
    expect(capturedStoryIds.length).toBeGreaterThan(0)
    capturedStoryIds.forEach(id => {
      // IDs have format PREFIX-NNNN, extract last segment
      const segments = id.split('-')
      const suffix = parseInt(segments[segments.length - 1]!, 10)
      expect(suffix).toBeGreaterThanOrEqual(1040)
    })
  })
})

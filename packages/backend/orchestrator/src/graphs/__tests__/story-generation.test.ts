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

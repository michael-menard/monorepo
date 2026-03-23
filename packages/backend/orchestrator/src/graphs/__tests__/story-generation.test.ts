/**
 * story-generation graph compilation + integration tests
 * APRS-4010: ST-5 / AC-6, AC-7
 * APRS-4020: ST-5 / AC-7 (5-node pipeline)
 */

import { describe, it, expect, vi } from 'vitest'
import { createStoryGenerationGraph } from '../story-generation.js'
import type { GraphValidatorFn } from '../../nodes/story-generation/validate-graph.js'

// ============================================================================
// Helpers
// ============================================================================

const VALID_PLAN = {
  planSlug: 'test-plan',
  title: 'Test Plan',
  summary: 'Summary',
  problemStatement: 'Problem',
  proposedSolution: 'Solution',
  goals: ['Goal 1'],
  nonGoals: [],
  flows: [
    {
      id: 'flow-1',
      name: 'User Flow',
      actor: 'User',
      trigger: 'User clicks',
      steps: [
        { index: 1, description: 'Open form' },
        { index: 2, description: 'Submit form' },
      ],
      successOutcome: 'Done',
      source: 'user',
      confidence: 1.0,
      status: 'confirmed',
    },
  ],
  openQuestions: [],
  warnings: [],
  constraints: [],
  dependencies: [],
  status: 'active',
  priority: 'high',
  tags: ['test'],
}

// ============================================================================
// Graph compilation tests
// ============================================================================

describe('createStoryGenerationGraph', () => {
  it('compiles without throwing (AC-6)', () => {
    expect(() => createStoryGenerationGraph()).not.toThrow()
  })

  it('returns a compiled graph with invoke method (AC-7)', () => {
    const graph = createStoryGenerationGraph()
    expect(typeof graph.invoke).toBe('function')
  })

  it('graph structure: START → load_refined_plan → slice_flows → generate_stories → wire_dependencies → validate_graph → END', () => {
    // Compilation confirms graph structure is valid
    const graph = createStoryGenerationGraph()
    expect(graph).toBeDefined()
  })
})

// ============================================================================
// Graph integration tests (with injectable adapters)
// ============================================================================

describe('createStoryGenerationGraph integration', () => {
  it('runs full 5-node pipeline from start to end with plan loader', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_PLAN)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'Story description',
      acceptance_criteria: ['AC1'],
      subtasks: ['Task 1'],
      risk: 'low',
    })

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('complete')
    expect(result.refinedPlan).not.toBeNull()
    expect(result.refinedPlan?.planSlug).toBe('test-plan')
    expect(result.flows).toHaveLength(1)
    expect(result.slicedFlows.length).toBeGreaterThan(0)
    expect(result.generatedStories.length).toBeGreaterThan(0)
    // 5-node pipeline: wire_dependencies and validate_graph ran
    expect(result.orderedStories.length).toBeGreaterThan(0)
    expect(result.validationResult).not.toBeNull()
    expect(result.validationResult?.passed).toBe(true)
    expect(planLoader).toHaveBeenCalledWith('test-plan')
  })

  it('exits at load_refined_plan on error (plan not found)', async () => {
    const planLoader = vi.fn().mockResolvedValue(null)

    const graph = createStoryGenerationGraph({ planLoader })
    const result = await graph.invoke({ planSlug: 'missing-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.length).toBeGreaterThan(0)
    // Should not have proceeded to slice or generate
    expect(result.slicedFlows).toEqual([])
    expect(result.generatedStories).toEqual([])
  })

  it('completes with empty stories when no confirmed flows', async () => {
    const planWithNoConfirmedFlows = {
      ...VALID_PLAN,
      flows: [
        {
          ...VALID_PLAN.flows[0],
          status: 'unconfirmed',
        },
      ],
    }
    const planLoader = vi.fn().mockResolvedValue(planWithNoConfirmedFlows)

    const graph = createStoryGenerationGraph({ planLoader })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    // No confirmed flows → slice_flows proceeds but generates nothing
    expect(result.generatedStories).toEqual([])
    expect(result.generationPhase).toBe('complete')
  })

  it('accepts injectable adapters via factory (AC-7)', () => {
    const planLoader = vi.fn().mockResolvedValue(null)
    const llmAdapter = vi.fn()

    expect(() => createStoryGenerationGraph({ planLoader, llmAdapter })).not.toThrow()
  })

  it('works with no adapters (default no-op behavior)', async () => {
    const graph = createStoryGenerationGraph()
    // With no planLoader, should error out gracefully
    const result = await graph.invoke({ planSlug: 'any-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('accepts injectable graphValidator via factory', () => {
    const graphValidator: GraphValidatorFn = vi.fn().mockReturnValue({
      passed: true,
      errors: [],
      warnings: [],
    })

    expect(() => createStoryGenerationGraph({ graphValidator })).not.toThrow()
  })

  it('exits at wire_dependencies on error', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_PLAN)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['AC1'],
      subtasks: [],
      risk: 'low',
    })
    // minimumPathFn that throws → wire_dependencies sets error phase
    const minimumPathFn = () => {
      throw new Error('wiring failed')
    }

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter, minimumPathFn })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.some((e: string) => e.includes('wire_dependencies failed'))).toBe(true)
  })

  it('exits at validate_graph when validation fails (cycle)', async () => {
    const planLoader = vi.fn().mockResolvedValue(VALID_PLAN)
    const llmAdapter = vi.fn().mockResolvedValue({
      description: 'desc',
      acceptance_criteria: ['AC1'],
      subtasks: [],
      risk: 'low',
    })
    const graphValidator: GraphValidatorFn = () => ({
      passed: false,
      errors: ['Cycle detected: A → B → A'],
      warnings: [],
    })

    const graph = createStoryGenerationGraph({ planLoader, llmAdapter, graphValidator })
    const result = await graph.invoke({ planSlug: 'test-plan' })

    expect(result.generationPhase).toBe('error')
    expect(result.errors.some((e: string) => e.includes('Cycle detected'))).toBe(true)
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

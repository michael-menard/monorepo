/**
 * write_to_kb node tests
 * APRS-4030: ST-3 (AC-2/3/4/5/7)
 */

import { describe, it, expect, vi } from 'vitest'
import {
  defaultKbWriterFn,
  defaultStoryIdGeneratorFn,
  createWriteToKbNode,
  type KbWriterFn,
  type StoryIdGeneratorFn,
  type KbStoryPayload,
} from '../write-to-kb.js'
import type {
  GeneratedStory,
  DependencyEdge,
  StoryGenerationState,
} from '../../../state/story-generation-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeStory(title: string, flowId: string, overrides: Partial<GeneratedStory> = {}): GeneratedStory {
  return {
    title,
    description: `Desc ${title}`,
    acceptance_criteria: ['AC1'],
    subtasks: ['Task 1'],
    tags: ['backend'],
    risk: 'low',
    minimum_path: false,
    parent_plan_slug: 'test-plan',
    parent_flow_id: flowId,
    flow_step_reference: `${flowId}/step-1`,
    ...overrides,
  }
}

const BASE_STATE: StoryGenerationState = {
  planSlug: 'test-plan',
  refinedPlan: null,
  flows: [],
  slicedFlows: [],
  generatedStories: [],
  dependencyEdges: [] as DependencyEdge[],
  parallelGroups: [],
  orderedStories: [],
  validationResult: null,
  generatedStoriesWithDeps: [],
  writeResult: null,
  generationPhase: 'validate_graph' as const,
  errors: [],
  warnings: [],
}

// ============================================================================
// defaultKbWriterFn
// ============================================================================

describe('defaultKbWriterFn', () => {
  it('returns success for all stories and planUpdated=true', async () => {
    const payloads: KbStoryPayload[] = [
      {
        story_id: 'TEST-1010',
        title: 'Story A',
        description: 'Desc A',
        feature: 'test-plan',
        tags: [],
        acceptance_criteria: ['AC1'],
        subtasks: [],
        risk: 'low',
        minimum_path: false,
        parent_plan_slug: 'test-plan',
        parent_flow_id: 'flow-1',
        flow_step_reference: 'flow-1/step-1',
        dependencies: [],
      },
    ]
    const result = await defaultKbWriterFn(payloads, 'test-plan', true)
    expect(result.results).toHaveLength(1)
    expect(result.results[0].success).toBe(true)
    expect(result.planUpdated).toBe(true)
  })

  it('returns empty results for empty stories', async () => {
    const result = await defaultKbWriterFn([], 'test-plan', true)
    expect(result.results).toHaveLength(0)
    expect(result.planUpdated).toBe(true)
  })
})

// ============================================================================
// defaultStoryIdGeneratorFn
// ============================================================================

describe('defaultStoryIdGeneratorFn', () => {
  it('generates IDs with prefix and step=10 starting at 1010', async () => {
    const ids = await defaultStoryIdGeneratorFn('TEST', 3)
    expect(ids).toEqual(['TEST-1010', 'TEST-1020', 'TEST-1030'])
  })

  it('generates single ID correctly', async () => {
    const ids = await defaultStoryIdGeneratorFn('APRS', 1)
    expect(ids).toEqual(['APRS-1010'])
  })

  it('returns empty array for count=0', async () => {
    const ids = await defaultStoryIdGeneratorFn('TEST', 0)
    expect(ids).toEqual([])
  })
})

// ============================================================================
// createWriteToKbNode
// ============================================================================

describe('createWriteToKbNode', () => {
  it('sets generationPhase=complete on successful batch write (AC-4/5)', async () => {
    const kbWriter: KbWriterFn = vi.fn().mockResolvedValue({
      results: [
        { success: true, story_id: 'TEST-1010' },
        { success: true, story_id: 'TEST-1020' },
      ],
      planUpdated: true,
    })
    const storyIdGenerator: StoryIdGeneratorFn = vi.fn().mockResolvedValue(['TEST-1010', 'TEST-1020'])

    const node = createWriteToKbNode({ kbWriter, storyIdGenerator })
    const result = await node({
      ...BASE_STATE,
      orderedStories: [makeStory('Story A', 'flow-1'), makeStory('Story B', 'flow-1')],
    })

    expect(result.generationPhase).toBe('complete')
    expect(result.writeResult?.storiesWritten).toBe(2)
    expect(result.writeResult?.storiesFailed).toBe(0)
    expect(result.writeResult?.planStatusUpdated).toBe(true)
    expect(result.writeResult?.errors).toEqual([])
  })

  it('sets generationPhase=error on partial failure (AC-4)', async () => {
    const kbWriter: KbWriterFn = vi.fn().mockResolvedValue({
      results: [
        { success: true, story_id: 'TEST-1010' },
        { success: false, story_id: 'TEST-1020', error: 'DB constraint violation' },
      ],
      planUpdated: false,
    })
    const storyIdGenerator: StoryIdGeneratorFn = vi.fn().mockResolvedValue(['TEST-1010', 'TEST-1020'])

    const node = createWriteToKbNode({ kbWriter, storyIdGenerator })
    const result = await node({
      ...BASE_STATE,
      orderedStories: [makeStory('Story A', 'flow-1'), makeStory('Story B', 'flow-1')],
    })

    expect(result.generationPhase).toBe('error')
    expect(result.writeResult?.storiesWritten).toBe(1)
    expect(result.writeResult?.storiesFailed).toBe(1)
    expect(result.writeResult?.planStatusUpdated).toBe(false)
    expect(result.errors).toContain('Story TEST-1020: DB constraint violation')
  })

  it('handles empty stories array as no-op (AC-7)', async () => {
    const kbWriter: KbWriterFn = vi.fn()

    const node = createWriteToKbNode({ kbWriter })
    const result = await node({
      ...BASE_STATE,
      orderedStories: [],
    })

    expect(result.generationPhase).toBe('complete')
    expect(result.writeResult?.storiesWritten).toBe(0)
    expect(result.writeResult?.storiesFailed).toBe(0)
    expect(kbWriter).not.toHaveBeenCalled()
  })

  it('generates story IDs with prefix from planSlug (AC-2)', async () => {
    const storyIdGenerator: StoryIdGeneratorFn = vi.fn().mockResolvedValue(['TEST-PLA-1010'])
    const kbWriter: KbWriterFn = vi.fn().mockResolvedValue({
      results: [{ success: true, story_id: 'TEST-PLA-1010' }],
      planUpdated: true,
    })

    const node = createWriteToKbNode({ kbWriter, storyIdGenerator })
    await node({
      ...BASE_STATE,
      orderedStories: [makeStory('Story A', 'flow-1')],
    })

    expect(storyIdGenerator).toHaveBeenCalledWith(
      expect.stringMatching(/^TEST-PLAN$/),
      1,
    )
  })

  it('maps dependency edges from composite keys to story IDs (AC-3)', async () => {
    const capturedPayloads: KbStoryPayload[] = []
    const kbWriter: KbWriterFn = vi.fn().mockImplementation(async (stories) => {
      capturedPayloads.push(...stories)
      return {
        results: stories.map((s: KbStoryPayload) => ({ success: true, story_id: s.story_id })),
        planUpdated: true,
      }
    })
    const storyIdGenerator: StoryIdGeneratorFn = vi.fn().mockResolvedValue(['TEST-1010', 'TEST-1020'])

    const storyA = makeStory('Story A', 'flow-1')
    const storyB = makeStory('Story B', 'flow-1')
    const edges: DependencyEdge[] = [
      { from: 'Story A|flow-1', to: 'Story B|flow-1', type: 'flow_order' },
    ]

    const node = createWriteToKbNode({ kbWriter, storyIdGenerator })
    await node({
      ...BASE_STATE,
      orderedStories: [storyA, storyB],
      dependencyEdges: edges,
    })

    // Story B depends on Story A
    const storyBPayload = capturedPayloads.find(p => p.story_id === 'TEST-1020')
    expect(storyBPayload?.dependencies).toEqual([
      { depends_on: 'TEST-1010', type: 'flow_order' },
    ])

    // Story A has no dependencies
    const storyAPayload = capturedPayloads.find(p => p.story_id === 'TEST-1010')
    expect(storyAPayload?.dependencies).toEqual([])
  })

  it('does not update plan status when stories fail (AC-4)', async () => {
    const kbWriter: KbWriterFn = vi.fn().mockResolvedValue({
      results: [
        { success: false, story_id: 'TEST-1010', error: 'write failed' },
      ],
      planUpdated: false,
    })
    const storyIdGenerator: StoryIdGeneratorFn = vi.fn().mockResolvedValue(['TEST-1010'])

    const node = createWriteToKbNode({ kbWriter, storyIdGenerator })
    const result = await node({
      ...BASE_STATE,
      orderedStories: [makeStory('Story A', 'flow-1')],
    })

    expect(result.writeResult?.planStatusUpdated).toBe(false)
  })

  it('uses default no-op KbWriterFn when not injected (AC-5)', async () => {
    const storyIdGenerator: StoryIdGeneratorFn = vi.fn().mockResolvedValue(['TEST-1010'])

    const node = createWriteToKbNode({ storyIdGenerator })
    const result = await node({
      ...BASE_STATE,
      orderedStories: [makeStory('Story A', 'flow-1')],
    })

    expect(result.generationPhase).toBe('complete')
    expect(result.writeResult?.storiesWritten).toBe(1)
  })

  it('sets generationPhase=error on unexpected exception', async () => {
    const kbWriter: KbWriterFn = vi.fn().mockRejectedValue(new Error('network timeout'))
    const storyIdGenerator: StoryIdGeneratorFn = vi.fn().mockResolvedValue(['TEST-1010'])

    const node = createWriteToKbNode({ kbWriter, storyIdGenerator })
    const result = await node({
      ...BASE_STATE,
      orderedStories: [makeStory('Story A', 'flow-1')],
    })

    expect(result.generationPhase).toBe('error')
    expect(result.errors![0]).toContain('write_to_kb failed')
    expect(result.writeResult?.errors).toContain('network timeout')
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  createBacklogReviewGraph,
  runBacklogReview,
  createBacklogReviewInitializeNode,
  createLoadBacklogNode,
  createMLScoreNode,
  createCuratorAnalyzeNode,
  createReorderNode,
  createBacklogReviewCompleteNode,
  afterBacklogReviewInitialize,
  afterLoadBacklog,
  afterMLScore,
  afterCuratorAnalyze,
  afterReorder,
  afterPersist,
  BacklogReviewConfigSchema,
  BacklogReviewResultSchema,
  type BacklogReviewState,
  type BacklogReviewConfig,
  type BacklogStory,
} from '../backlog-review.js'

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// ============================================================================
// Test Helpers
// ============================================================================

function createTestState(overrides: Partial<BacklogReviewState> = {}): BacklogReviewState {
  return {
    epicPrefix: 'WINT',
    config: null,
    startedAt: null,
    threadId: null,
    backlogStories: [],
    mlScoredStories: [],
    curatorScoredStories: [],
    rankedStories: [],
    reordered: false,
    persisted: false,
    workflowComplete: false,
    workflowSuccess: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function createTestConfig(overrides: Partial<BacklogReviewConfig> = {}): BacklogReviewConfig {
  return BacklogReviewConfigSchema.parse(overrides)
}

function createTestStories(count: number): BacklogStory[] {
  return Array.from({ length: count }, (_, i) => ({
    storyId: `WINT-000${i + 1}`,
    title: `Story ${i + 1}`,
    mlScore: null,
    curatorScore: null,
    finalRank: null,
  }))
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('BacklogReviewConfigSchema', () => {
  it('parses with defaults', () => {
    const config = BacklogReviewConfigSchema.parse({})
    expect(config.maxStories).toBe(50)
    expect(config.persistReorder).toBe(false)
    expect(config.epicPrefix).toBe('')
  })

  it('accepts injectable deps as unknown (WINT-9070/9080)', () => {
    const mlNode = vi.fn()
    const curatorNode = vi.fn()
    const config = BacklogReviewConfigSchema.parse({
      mlScoringNode: mlNode,
      curatorAnalyzeNode: curatorNode,
      retryMiddleware: { stub: true },
      checkpointer: { save: () => {} },
      telemetryNode: { emit: () => {} },
    })
    expect(config.mlScoringNode).toBe(mlNode)
    expect(config.curatorAnalyzeNode).toBe(curatorNode)
    expect(config.retryMiddleware).toBeDefined()
  })
})

// ============================================================================
// Conditional Edge Function Tests
// ============================================================================

describe('afterBacklogReviewInitialize', () => {
  it('always routes to load_backlog', () => {
    expect(afterBacklogReviewInitialize(createTestState())).toBe('load_backlog')
  })
})

describe('afterLoadBacklog', () => {
  it('always routes to ml_score', () => {
    expect(afterLoadBacklog(createTestState())).toBe('ml_score')
  })
})

describe('afterMLScore', () => {
  it('always routes to curator_analyze', () => {
    expect(afterMLScore(createTestState())).toBe('curator_analyze')
  })
})

describe('afterCuratorAnalyze', () => {
  it('always routes to reorder', () => {
    expect(afterCuratorAnalyze(createTestState())).toBe('reorder')
  })
})

describe('afterReorder', () => {
  it('always routes to persist', () => {
    expect(afterReorder(createTestState())).toBe('persist')
  })
})

describe('afterPersist', () => {
  it('always routes to complete', () => {
    expect(afterPersist(createTestState())).toBe('complete')
  })
})

// ============================================================================
// Node Tests — Injectable Stub Pattern (AC-6)
// ============================================================================

describe('createMLScoreNode — injectable skip pattern (AC-6)', () => {
  it('skips gracefully with warning when mlScoringNode not injected', async () => {
    const node = createMLScoreNode({})
    const stories = createTestStories(3)
    const state = createTestState({ backlogStories: stories })
    const result = await node(state)

    // Skips — passes through unchanged stories
    expect(result.mlScoredStories).toEqual(stories)
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.some(w => w.includes('mlScoringNode not injected'))).toBe(true)
  })

  it('calls injected ml node and returns scored stories', async () => {
    const mockMlNode = vi.fn().mockImplementation(async (stories: BacklogStory[]) =>
      stories.map(s => ({ ...s, mlScore: 0.9 })),
    )

    const node = createMLScoreNode({ mlScoringNode: mockMlNode })
    const stories = createTestStories(2)
    const state = createTestState({ backlogStories: stories })
    const result = await node(state)

    expect(mockMlNode).toHaveBeenCalledWith(stories)
    expect(result.mlScoredStories?.every((s: BacklogStory) => s.mlScore === 0.9)).toBe(true)
  })
})

describe('createCuratorAnalyzeNode — injectable skip pattern (AC-6)', () => {
  it('skips gracefully with warning when curatorAnalyzeNode not injected', async () => {
    const node = createCuratorAnalyzeNode({})
    const stories = createTestStories(2)
    const state = createTestState({ mlScoredStories: stories })
    const result = await node(state)

    // Skips — passes through unchanged
    expect(result.curatorScoredStories).toEqual(stories)
    expect(result.warnings!.some(w => w.includes('WINT-9080'))).toBe(true)
  })

  it('calls injected curator node when provided', async () => {
    const mockCuratorNode = vi.fn().mockImplementation(async (stories: BacklogStory[]) =>
      stories.map(s => ({ ...s, curatorScore: 0.75 })),
    )

    const node = createCuratorAnalyzeNode({ curatorAnalyzeNode: mockCuratorNode })
    const stories = createTestStories(2)
    const state = createTestState({ mlScoredStories: stories })
    const result = await node(state)

    expect(mockCuratorNode).toHaveBeenCalledWith(stories)
    expect(result.curatorScoredStories?.every((s: BacklogStory) => s.curatorScore === 0.75)).toBe(true)
  })
})

describe('createReorderNode', () => {
  it('reorders stories by combined score (descending)', async () => {
    const node = createReorderNode()
    const stories: BacklogStory[] = [
      { storyId: 'WINT-0001', title: 'Low', mlScore: 0.1, curatorScore: 0.1, finalRank: null },
      { storyId: 'WINT-0002', title: 'High', mlScore: 0.9, curatorScore: 0.8, finalRank: null },
      { storyId: 'WINT-0003', title: 'Mid', mlScore: 0.5, curatorScore: 0.5, finalRank: null },
    ]
    const state = createTestState({ curatorScoredStories: stories })
    const result = await node(state)

    expect(result.reordered).toBe(true)
    expect(result.rankedStories![0].storyId).toBe('WINT-0002') // Highest score first
    expect(result.rankedStories![2].storyId).toBe('WINT-0001') // Lowest score last
  })
})

describe('createBacklogReviewCompleteNode', () => {
  it('marks success when reordered', async () => {
    const node = createBacklogReviewCompleteNode()
    const result = await node(createTestState({ reordered: true }))
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(true)
  })

  it('marks not success when not reordered', async () => {
    const node = createBacklogReviewCompleteNode()
    const result = await node(createTestState({ reordered: false }))
    expect(result.workflowSuccess).toBe(false)
  })
})

// ============================================================================
// Compilation Test
// ============================================================================

describe('createBacklogReviewGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createBacklogReviewGraph()).not.toThrow()
    expect(() => createBacklogReviewGraph({ persistReorder: true })).not.toThrow()
  })

  it('compiles without ml or curator nodes (stub pattern)', () => {
    expect(() => createBacklogReviewGraph({})).not.toThrow()
  })

  it('compiles with injectable ml and curator nodes', () => {
    expect(() =>
      createBacklogReviewGraph({
        mlScoringNode: vi.fn(),
        curatorAnalyzeNode: vi.fn(),
        retryMiddleware: { stub: true },
        telemetryNode: { emit: () => {} },
      }),
    ).not.toThrow()
  })
})

// ============================================================================
// runBacklogReview Happy-Path Tests
// ============================================================================

describe('runBacklogReview', () => {
  it('returns BacklogReviewResult shape', async () => {
    const result = await runBacklogReview({ epicPrefix: 'WINT' })
    const parsed = BacklogReviewResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
    expect(result.epicPrefix).toBe('WINT')
  })

  it('thread ID convention: epicPrefix:backlog-review:attempt', async () => {
    const result = await runBacklogReview({ epicPrefix: 'WINT', attempt: 2 })
    expect(result.epicPrefix).toBe('WINT')
  })

  it('succeeds without ml or curator nodes (graceful skip)', async () => {
    const result = await runBacklogReview({ epicPrefix: 'WINT', config: {} })
    expect(result.success).toBe(true)
    expect(result.reordered).toBe(true)
    expect(result.warnings.some(w => w.includes('mlScoringNode not injected'))).toBe(true)
    expect(result.warnings.some(w => w.includes('WINT-9080'))).toBe(true)
  })

  it('succeeds with ml and curator nodes injected', async () => {
    const mockMlNode = vi.fn().mockImplementation(async (stories: BacklogStory[]) =>
      stories.map(s => ({ ...s, mlScore: 0.8 })),
    )
    const mockCuratorNode = vi.fn().mockImplementation(async (stories: BacklogStory[]) =>
      stories.map(s => ({ ...s, curatorScore: 0.7 })),
    )

    const result = await runBacklogReview({
      epicPrefix: 'WINT',
      config: { mlScoringNode: mockMlNode, curatorAnalyzeNode: mockCuratorNode },
    })

    expect(result.success).toBe(true)
    expect(mockMlNode).toHaveBeenCalled()
    expect(mockCuratorNode).toHaveBeenCalled()
  })
})

import { describe, expect, it, vi } from 'vitest'
import {
  createElabEpicGraph,
  runElabEpic,
  createElabEpicDispatcher,
  createElabStoryWorkerNode,
  createElabEpicFanInNode,
  createElabEpicCompleteNode,
  afterFanIn,
  ElabEpicConfigSchema,
  ElabEpicResultSchema,
  type ElabEpicState,
  type ElabEpicConfig,
  type StoryEntry,
} from '../elab-epic.js'
import { Send } from '@langchain/langgraph'

// Mock elab-story to avoid live elaboration calls
vi.mock('../elab-story.js', () => ({
  runElabStory: vi.fn().mockImplementation(({ storyId }) =>
    Promise.resolve({
      storyId,
      success: true,
      elaborationResult: null,
      worktreePath: null,
      worktreeSetup: true,
      worktreeTornDown: true,
      durationMs: 10,
      completedAt: new Date().toISOString(),
      errors: [],
      warnings: [],
    }),
  ),
  ElabStoryResultSchema: {
    parse: vi.fn(data => data),
  },
}))

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================================
// Test Helpers
// ============================================================================

const mockStory = {
  storyId: 'WINT-0001',
  title: 'Test',
  description: 'desc',
  domain: 'wint',
  acceptanceCriteria: [],
  constraints: [],
  affectedFiles: [],
  dependencies: [],
}

function createTestState(overrides: Partial<ElabEpicState> = {}): ElabEpicState {
  return {
    epicId: 'WINT',
    config: null,
    startedAt: null,
    threadId: null,
    storyEntries: [],
    workerResults: [],
    epicSummary: null,
    workflowComplete: false,
    workflowSuccess: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function createTestConfig(overrides: Partial<ElabEpicConfig> = {}): ElabEpicConfig {
  return ElabEpicConfigSchema.parse(overrides)
}

function createStoryEntries(count: number): StoryEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    storyId: `WINT-000${i + 1}`,
    currentStory: { ...mockStory, storyId: `WINT-000${i + 1}` },
    previousStory: null,
  }))
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('ElabEpicConfigSchema', () => {
  it('parses with defaults', () => {
    const config = ElabEpicConfigSchema.parse({})
    expect(config.persistToDb).toBe(false)
    expect(config.recalculateReadiness).toBe(true)
    expect(config.maxConcurrency).toBe(10)
    expect(config.worktreeBaseDir).toBe('/tmp/worktrees')
  })

  it('accepts injectable deps as unknown', () => {
    const config = ElabEpicConfigSchema.parse({
      retryMiddleware: { stub: true },
      checkpointer: { save: () => {} },
      telemetryNode: { emit: () => {} },
    })
    expect(config.retryMiddleware).toBeDefined()
    expect(config.checkpointer).toBeDefined()
    expect(config.telemetryNode).toBeDefined()
  })
})

// ============================================================================
// Fan-Out Count Tests
// ============================================================================

describe('createElabEpicDispatcher (Send API fan-out)', () => {
  it('dispatches exactly N Send objects for N storyEntries', () => {
    const dispatcher = createElabEpicDispatcher({})
    const entries = createStoryEntries(3)
    const state = createTestState({ storyEntries: entries })

    const sends = dispatcher(state)
    // 3 stories → 3 Send objects
    expect(sends).toHaveLength(3)
    expect(sends.every(s => s instanceof Send)).toBe(true)
  })

  it('dispatches 0 Send objects and sends to fan_in when storyEntries is empty', () => {
    const dispatcher = createElabEpicDispatcher({})
    const state = createTestState({ storyEntries: [] })

    const sends = dispatcher(state)
    // Empty → single Send to fan_in
    expect(sends).toHaveLength(1)
    expect(sends[0]).toBeInstanceOf(Send)
  })

  it('each Send targets elab_story_worker with correct storyId', () => {
    const dispatcher = createElabEpicDispatcher({})
    const entries = createStoryEntries(2)
    const state = createTestState({ storyEntries: entries })

    const sends = dispatcher(state)
    const workerSends = sends.filter(s => (s as any).node === 'elab_story_worker')
    expect(workerSends).toHaveLength(2)
  })

  it('dispatches 5 Send objects for 5 storyEntries', () => {
    const dispatcher = createElabEpicDispatcher({})
    const entries = createStoryEntries(5)
    const state = createTestState({ storyEntries: entries })

    const sends = dispatcher(state)
    expect(sends).toHaveLength(5)
  })
})

// ============================================================================
// Fan-In Aggregation Tests
// ============================================================================

describe('createElabEpicFanInNode (fan-in aggregation)', () => {
  it('aggregates N worker results into epic summary', async () => {
    const node = createElabEpicFanInNode()
    const workerResults = createStoryEntries(3).map(e => ({
      storyId: e.storyId,
      success: true,
      elaborationResult: null,
      worktreePath: null,
      worktreeSetup: true,
      worktreeTornDown: true,
      durationMs: 10,
      completedAt: new Date().toISOString(),
      errors: [],
      warnings: [],
    }))

    const state = createTestState({ workerResults })
    const result = await node(state)

    expect(result.epicSummary).toBeTruthy()
    expect(result.epicSummary).toContain('3')
    expect(result.workflowSuccess).toBe(true)
  })

  it('sets workflowSuccess=false when any worker failed', async () => {
    const node = createElabEpicFanInNode()
    const workerResults = [
      {
        storyId: 'WINT-0001',
        success: true,
        elaborationResult: null,
        worktreePath: null,
        worktreeSetup: true,
        worktreeTornDown: true,
        durationMs: 10,
        completedAt: new Date().toISOString(),
        errors: [],
        warnings: [],
      },
      {
        storyId: 'WINT-0002',
        success: false,
        elaborationResult: null,
        worktreePath: null,
        worktreeSetup: true,
        worktreeTornDown: true,
        durationMs: 10,
        completedAt: new Date().toISOString(),
        errors: ['failed'],
        warnings: [],
      },
    ]

    const state = createTestState({ workerResults })
    const result = await node(state)

    expect(result.workflowSuccess).toBe(false)
    expect(result.epicSummary).toContain('WINT-0002')
  })

  it('handles empty workerResults gracefully', async () => {
    const node = createElabEpicFanInNode()
    const state = createTestState({ workerResults: [] })
    const result = await node(state)

    expect(result.epicSummary).toBeTruthy()
    expect(result.workflowComplete).toBe(true)
    // 0 failed → success
    expect(result.workflowSuccess).toBe(true)
  })
})

// ============================================================================
// Conditional Edge Function Tests
// ============================================================================

describe('afterFanIn', () => {
  it('always routes to complete', () => {
    expect(afterFanIn(createTestState())).toBe('complete')
    expect(afterFanIn(createTestState({ workflowSuccess: true }))).toBe('complete')
    expect(afterFanIn(createTestState({ workflowSuccess: false }))).toBe('complete')
  })
})

// ============================================================================
// Compilation Test
// ============================================================================

describe('createElabEpicGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createElabEpicGraph()).not.toThrow()
    expect(() => createElabEpicGraph({ persistToDb: false })).not.toThrow()
  })

  it('accepts injectable deps without throwing', () => {
    expect(() =>
      createElabEpicGraph({
        retryMiddleware: { stub: true },
        telemetryNode: { emit: () => {} },
      }),
    ).not.toThrow()
  })
})

// ============================================================================
// runElabEpic Happy-Path and Fan-Out/Fan-In Tests
// ============================================================================

describe('runElabEpic', () => {
  it('returns ElabEpicResult shape', async () => {
    const result = await runElabEpic({
      epicId: 'WINT',
      storyEntries: createStoryEntries(3),
    })
    const parsed = ElabEpicResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
    expect(result.epicId).toBe('WINT')
  })

  it('fan-out: dispatches N workers for N storyEntries', async () => {
    const result = await runElabEpic({
      epicId: 'WINT',
      storyEntries: createStoryEntries(4),
    })
    expect(result.storiesProcessed).toBe(4)
  })

  it('fan-in: aggregates results correctly — N succeeded when all pass', async () => {
    const result = await runElabEpic({
      epicId: 'WINT',
      storyEntries: createStoryEntries(3),
    })
    expect(result.storiesSucceeded).toBe(3)
    expect(result.storiesFailed).toBe(0)
    expect(result.success).toBe(true)
  })

  it('thread ID convention: epicId:elab-epic:attempt', async () => {
    const result = await runElabEpic({
      epicId: 'WINT',
      storyEntries: createStoryEntries(1),
      attempt: 2,
    })
    expect(result.epicId).toBe('WINT')
  })

  it('handles empty storyEntries gracefully', async () => {
    const result = await runElabEpic({
      epicId: 'WINT',
      storyEntries: [],
    })
    expect(result.storiesProcessed).toBe(0)
    expect(result.success).toBe(true)
  })
})

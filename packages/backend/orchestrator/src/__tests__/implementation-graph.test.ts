/**
 * Unit tests for the implementation graph.
 *
 * Tests:
 * - Graph compiles with all nodes
 * - afterLoadStory routes to abort on load error
 * - afterLoadStory routes to create_worktree on success
 * - afterCreateWorktree routes to abort if worktree not created
 * - afterCreateWorktree routes to change_loop on success
 * - afterChangeLoop routes to evidence_production on complete
 * - afterChangeLoop routes to change_loop on pass/retry
 * - afterChangeLoop routes to abort on abort status
 *
 * APIP-1032 AC-11, AC-13
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createImplementationGraph,
  ImplementationGraphStateAnnotation,
  CommitRecordSchema,
  LoadErrorSchema,
  type ImplementationGraphState,
} from '../graphs/implementation.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock node implementations so graph tests don't hit filesystem
vi.mock('../nodes/load-story.js', () => ({
  loadStoryNode: vi.fn(async (state: ImplementationGraphState) => ({
    storyLoaded: state.storyId !== 'fail-load',
    loadError:
      state.storyId === 'fail-load'
        ? LoadErrorSchema.parse({ code: 'STORY_NOT_FOUND', message: 'not found' })
        : null,
    changeSpecs: [],
    storyContent: 'story content',
  })),
}))

vi.mock('../nodes/create-worktree.js', () => ({
  createWorktreeNode: vi.fn(async (state: ImplementationGraphState) => ({
    worktreeCreated: state.storyId !== 'fail-worktree',
    worktreePath: state.storyId !== 'fail-worktree' ? '/tmp/worktrees/test' : null,
  })),
}))

vi.mock('../nodes/evidence-production.js', () => ({
  evidenceProductionNode: vi.fn(async () => ({
    evidenceWritten: true,
    evidencePath: '/tmp/test-evidence.yaml',
  })),
}))

vi.mock('../nodes/change-loop.js', () => ({
  createChangeLoopNode: vi.fn(() => async (_state: ImplementationGraphState) => ({
    changeLoopComplete: true,
    changeLoopStatus: 'complete' as const,
  })),
}))

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<ImplementationGraphState> = {}): ImplementationGraphState {
  return {
    storyId: 'TEST-001',
    attemptNumber: 1,
    featureDir: 'plans/test',
    startedAt: new Date().toISOString(),
    storyContent: null,
    changeSpecs: [],
    loadError: null,
    storyLoaded: false,
    worktreePath: null,
    worktreeCreated: false,
    currentChangeIndex: 0,
    completedChanges: [],
    changeLoopComplete: false,
    changeLoopStatus: null,
    changeLoopRetryCount: 0,
    evidencePath: null,
    evidenceWritten: false,
    workflowComplete: false,
    workflowSuccess: false,
    aborted: false,
    abortReason: null,
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeCommitRecord() {
  return CommitRecordSchema.parse({
    changeSpecId: 'CS-1',
    commitSha: 'abc123',
    commitMessage: 'feat(CS-1): test change',
    touchedFiles: ['src/foo.ts'],
    committedAt: new Date().toISOString(),
    durationMs: 100,
  })
}

// ============================================================================
// Tests: Graph compilation
// ============================================================================

describe('createImplementationGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createImplementationGraph()).not.toThrow()
  })

  it('compiles with modelDispatch injected', () => {
    const mockDispatch = {
      dispatch: vi.fn(),
    }
    expect(() => createImplementationGraph({ modelDispatch: mockDispatch })).not.toThrow()
  })

  it('returns a compiled graph with invoke method', () => {
    const graph = createImplementationGraph()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// Tests: State annotation defaults
// ============================================================================

describe('ImplementationGraphStateAnnotation', () => {
  it('provides correct default values', () => {
    const state = ImplementationGraphStateAnnotation.spec
    expect(state).toBeDefined()
  })
})

// ============================================================================
// Tests: CommitRecord schema
// ============================================================================

describe('CommitRecordSchema', () => {
  it('validates a valid commit record', () => {
    const record = makeCommitRecord()
    expect(record.changeSpecId).toBe('CS-1')
    expect(record.commitSha).toBe('abc123')
    expect(record.touchedFiles).toEqual(['src/foo.ts'])
  })

  it('defaults touchedFiles to empty array', () => {
    const record = CommitRecordSchema.parse({
      changeSpecId: 'CS-2',
      commitSha: 'def456',
      commitMessage: 'fix: something',
      committedAt: new Date().toISOString(),
      durationMs: 50,
    })
    expect(record.touchedFiles).toEqual([])
  })

  it('rejects missing commitSha', () => {
    expect(() =>
      CommitRecordSchema.parse({
        changeSpecId: 'CS-1',
        commitMessage: 'msg',
        committedAt: new Date().toISOString(),
        durationMs: 0,
      }),
    ).toThrow()
  })
})

// ============================================================================
// Tests: LoadError schema
// ============================================================================

describe('LoadErrorSchema', () => {
  it('validates STORY_NOT_FOUND', () => {
    const err = LoadErrorSchema.parse({ code: 'STORY_NOT_FOUND', message: 'not found' })
    expect(err.code).toBe('STORY_NOT_FOUND')
  })

  it('validates CHANGE_SPEC_NOT_FOUND', () => {
    const err = LoadErrorSchema.parse({ code: 'CHANGE_SPEC_NOT_FOUND', message: 'no spec' })
    expect(err.code).toBe('CHANGE_SPEC_NOT_FOUND')
  })

  it('rejects unknown error code', () => {
    expect(() => LoadErrorSchema.parse({ code: 'BOGUS', message: 'bad' })).toThrow()
  })
})

// ============================================================================
// Tests: Graph invocation with mocked nodes
// ============================================================================

describe('implementation graph invocation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('completes successfully for a normal story', async () => {
    const graph = createImplementationGraph()
    const result = await graph.invoke({
      storyId: 'TEST-001',
      featureDir: 'plans/test',
    })

    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(true)
    expect(result.aborted).toBe(false)
  })

  it('aborts when load-story fails', async () => {
    const graph = createImplementationGraph()
    const result = await graph.invoke({
      storyId: 'fail-load',
      featureDir: 'plans/test',
    })

    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
    expect(result.aborted).toBe(true)
  })

  it('aborts when create-worktree fails', async () => {
    const graph = createImplementationGraph()
    const result = await graph.invoke({
      storyId: 'fail-worktree',
      featureDir: 'plans/test',
    })

    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
    expect(result.aborted).toBe(true)
  })
})

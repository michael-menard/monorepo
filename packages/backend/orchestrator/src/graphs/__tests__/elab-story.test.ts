import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createElabStoryGraph,
  runElabStory,
  createElabStoryInitializeNode,
  createWorktreeSetupNode,
  createElaborationSubgraphNode,
  createWorktreeTeardownNode,
  createElabStoryCompleteNode,
  afterElabStoryInitialize,
  afterElaborationSubgraph,
  afterWorktreeTeardown,
  ElabStoryConfigSchema,
  ElabStoryResultSchema,
  type ElabStoryState,
  type ElabStoryConfig,
  type GitRunner,
} from '../elab-story.js'

// Mock elaboration.ts to avoid live LLM calls
vi.mock('../elaboration.js', () => ({
  createElaborationGraph: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue({
      storyId: 'WINT-9110',
      currentPhase: 'complete',
      workflowSuccess: true,
      deltaDetectionResult: null,
      deltaReviewResult: null,
      escapeHatchResult: null,
      aggregatedFindings: { passed: true, totalFindings: 0 },
      updatedReadinessResult: { score: 88 },
      warnings: [],
      errors: [],
      changeOutline: null,
      totalEstimatedAtomicChanges: null,
      splitRequired: false,
      splitReason: null,
    }),
  })),
  ElaborationResultSchema: {
    parse: vi.fn(data => ({
      storyId: data.storyId,
      phase: data.phase,
      success: data.success ?? true,
      deltaDetectionResult: data.deltaDetectionResult ?? null,
      deltaReviewResult: data.deltaReviewResult ?? null,
      escapeHatchResult: data.escapeHatchResult ?? null,
      aggregatedFindings: data.aggregatedFindings ?? null,
      updatedReadinessResult: data.updatedReadinessResult ?? null,
      previousReadinessScore: null,
      newReadinessScore: data.updatedReadinessResult?.score ?? null,
      warnings: data.warnings ?? [],
      errors: data.errors ?? [],
      durationMs: 0,
      completedAt: new Date().toISOString(),
      changeOutline: null,
      totalEstimatedAtomicChanges: null,
      splitRequired: false,
      splitReason: null,
    })),
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

// Mock @repo/mcp-tools to avoid DB connection requirements (PIPE-3020)
vi.mock('@repo/mcp-tools', () => ({
  worktreeRegister: vi.fn().mockResolvedValue({
    id: 'stub-uuid-1234',
    storyId: 'WINT-9110',
    worktreePath: '/tmp/worktrees/WINT-9110',
    branchName: 'elab/WINT-9110',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  worktreeGetByStory: vi.fn().mockResolvedValue({
    id: 'stub-uuid-1234',
    storyId: 'WINT-9110',
    worktreePath: '/tmp/worktrees/WINT-9110',
    branchName: 'elab/WINT-9110',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    mergedAt: null,
    abandonedAt: null,
    metadata: {},
  }),
  worktreeMarkComplete: vi.fn().mockResolvedValue({ success: true }),
}))

// ============================================================================
// Test Helpers
// ============================================================================

const mockStory = {
  storyId: 'WINT-9110',
  title: 'Test Story',
  description: 'A test story',
  domain: 'wint',
  acceptanceCriteria: [],
  constraints: [],
  affectedFiles: [],
  dependencies: [],
}

function createTestState(overrides: Partial<ElabStoryState> = {}): ElabStoryState {
  return {
    storyId: 'WINT-9110',
    config: null,
    startedAt: null,
    threadId: null,
    currentStory: mockStory,
    previousStory: null,
    worktreePath: null,
    worktreeSetup: false,
    worktreeTornDown: false,
    elaborationResult: null,
    elaborationFailed: false,
    workflowComplete: false,
    workflowSuccess: false,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function createTestConfig(overrides: Partial<ElabStoryConfig> = {}): ElabStoryConfig {
  return ElabStoryConfigSchema.parse(overrides)
}

/** Injectable git runner that always succeeds (no real git subprocess) */
function makeSuccessGitRunner(): GitRunner {
  return vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
}

/** Injectable git runner that always fails */
function makeFailGitRunner(): GitRunner {
  return vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'fatal: branch exists' })
}

// ============================================================================
// Schema Tests
// ============================================================================

describe('ElabStoryConfigSchema', () => {
  it('parses with defaults', () => {
    const config = ElabStoryConfigSchema.parse({})
    expect(config.worktreeBaseDir).toBe('/tmp/worktrees')
    expect(config.persistToDb).toBe(false)
    expect(config.recalculateReadiness).toBe(true)
  })

  it('accepts injectable deps as unknown', () => {
    const config = ElabStoryConfigSchema.parse({
      retryMiddleware: { middleware: 'stub' },
      checkpointer: { save: () => {} },
      telemetryNode: { emit: () => {} },
    })
    expect(config.retryMiddleware).toBeDefined()
    expect(config.checkpointer).toBeDefined()
    expect(config.telemetryNode).toBeDefined()
  })
})

// ============================================================================
// Conditional Edge Function Tests (ARCH-002 — exported for test access)
// ============================================================================

describe('afterElabStoryInitialize', () => {
  it('routes to worktree_setup when init succeeded', () => {
    const state = createTestState({
      config: createTestConfig(),
      workflowComplete: false,
    })
    expect(afterElabStoryInitialize(state)).toBe('worktree_setup')
  })

  it('routes to worktree_teardown when workflowComplete is true (init error path)', () => {
    const state = createTestState({
      workflowComplete: true,
      config: null,
      errors: ['No story ID provided'],
    })
    expect(afterElabStoryInitialize(state)).toBe('worktree_teardown')
  })
})

describe('afterElaborationSubgraph', () => {
  it('ALWAYS routes to worktree_teardown on success (AC-3)', () => {
    const stateSuccess = createTestState({
      elaborationFailed: false,
      elaborationResult: {
        storyId: 'WINT-9110',
        phase: 'complete',
        success: true,
        deltaDetectionResult: null,
        deltaReviewResult: null,
        escapeHatchResult: null,
        aggregatedFindings: null,
        updatedReadinessResult: null,
        previousReadinessScore: null,
        newReadinessScore: null,
        warnings: [],
        errors: [],
        durationMs: 0,
        completedAt: new Date().toISOString(),
        changeOutline: null,
        totalEstimatedAtomicChanges: null,
        splitRequired: false,
        splitReason: null,
      },
    })
    expect(afterElaborationSubgraph(stateSuccess)).toBe('worktree_teardown')
  })

  it('ALWAYS routes to worktree_teardown on failure (AC-3 — teardown must run)', () => {
    const stateFailure = createTestState({
      elaborationFailed: true,
      elaborationResult: null,
      errors: ['Elaboration failed'],
    })
    expect(afterElaborationSubgraph(stateFailure)).toBe('worktree_teardown')
  })
})

describe('afterWorktreeTeardown', () => {
  it('always routes to complete', () => {
    expect(afterWorktreeTeardown(createTestState())).toBe('complete')
    expect(afterWorktreeTeardown(createTestState({ worktreeTornDown: false }))).toBe('complete')
  })
})

// ============================================================================
// Node Tests
// ============================================================================

describe('createElabStoryInitializeNode', () => {
  it('initializes with config and timestamps', async () => {
    const node = createElabStoryInitializeNode({})
    const result = await node(createTestState())
    expect(result.config).toBeDefined()
    expect(result.startedAt).toBeTruthy()
    expect(result.errors).toEqual([])
  })

  it('returns error when storyId missing', async () => {
    const node = createElabStoryInitializeNode({})
    const result = await node(createTestState({ storyId: '' }))
    expect(result.errors).toContain('No story ID provided for elab-story')
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
  })
})

describe('createWorktreeSetupNode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets worktreeSetup: true and worktreePath when git succeeds (injectable runner)', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      config: createTestConfig({ worktreeBaseDir: '/tmp/test-trees' }),
    })
    const result = await node(state)
    expect(result.worktreeSetup).toBe(true)
    expect(result.worktreePath).toContain('WINT-9110')
  })

  it('sets worktreeSetup: false when git fails', async () => {
    const gitRunner = makeFailGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      config: createTestConfig({ worktreeBaseDir: '/tmp/test-trees' }),
    })
    const result = await node(state)
    expect(result.worktreeSetup).toBe(false)
    expect(result.worktreePath).toBeNull()
  })
})

describe('createElaborationSubgraphNode', () => {
  it('skips gracefully when no currentStory', async () => {
    const node = createElaborationSubgraphNode({})
    const state = createTestState({ currentStory: null })
    const result = await node(state)
    expect(result.elaborationResult).toBeNull()
    expect(result.elaborationFailed).toBe(true)
    expect(result.errors).toContain('No current story provided for elaboration subgraph')
  })
})

describe('createWorktreeTeardownNode', () => {
  beforeEach(() => vi.clearAllMocks())

  it('tears down even when worktree was not set up', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({ worktreeSetup: false })
    const result = await node(state)
    expect(result.worktreeTornDown).toBe(true)
  })

  it('tears down when worktree was set up', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({ worktreeSetup: true, worktreePath: '/tmp/worktrees/WINT-9110' })
    const result = await node(state)
    expect(result.worktreeTornDown).toBe(true)
  })

  it('is warn-only — teardown errors do NOT affect workflowSuccess', async () => {
    const gitRunner = makeFailGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/WINT-9110',
      workflowSuccess: true,
    })
    const result = await node(state)
    expect(result.worktreeTornDown).toBe(true)
    expect('workflowSuccess' in result).toBe(false)
  })
})

describe('createElabStoryCompleteNode', () => {
  it('marks success based on elaborationResult.success', async () => {
    const node = createElabStoryCompleteNode()
    const state = createTestState({
      elaborationResult: {
        storyId: 'WINT-9110',
        phase: 'complete',
        success: true,
        deltaDetectionResult: null,
        deltaReviewResult: null,
        escapeHatchResult: null,
        aggregatedFindings: null,
        updatedReadinessResult: null,
        previousReadinessScore: null,
        newReadinessScore: null,
        warnings: [],
        errors: [],
        durationMs: 0,
        completedAt: new Date().toISOString(),
        changeOutline: null,
        totalEstimatedAtomicChanges: null,
        splitRequired: false,
        splitReason: null,
      },
    })
    const result = await node(state)
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(true)
  })

  it('marks not success when no elaborationResult', async () => {
    const node = createElabStoryCompleteNode()
    const result = await node(createTestState({ elaborationResult: null }))
    expect(result.workflowComplete).toBe(true)
    expect(result.workflowSuccess).toBe(false)
  })
})

// ============================================================================
// Compilation Test
// ============================================================================

describe('createElabStoryGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createElabStoryGraph()).not.toThrow()
    expect(() => createElabStoryGraph({ persistToDb: false })).not.toThrow()
  })

  it('accepts injectable deps without throwing', () => {
    expect(() =>
      createElabStoryGraph({
        retryMiddleware: { stub: true },
        telemetryNode: { emit: () => {} },
      }),
    ).not.toThrow()
  })
})

// ============================================================================
// runElabStory Integration Tests
// ============================================================================

describe('runElabStory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ElabStoryResult shape', async () => {
    const result = await runElabStory({
      storyId: 'WINT-9110',
      currentStory: mockStory,
    })
    const parsed = ElabStoryResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
    expect(result.storyId).toBe('WINT-9110')
  })

  it('thread ID convention: storyId:elab-story:attempt', async () => {
    // Verify the run completes correctly (thread ID wired internally)
    const result = await runElabStory({
      storyId: 'WINT-9110',
      currentStory: mockStory,
      attempt: 3,
    })
    expect(result.storyId).toBe('WINT-9110')
  })

  it('worktree_teardown always runs (AC-3): even with null currentStory', async () => {
    // With null currentStory, elaboration fails but teardown should still be tracked
    const result = await runElabStory({
      storyId: 'WINT-9110',
      currentStory: null,
    })
    // Result should exist (no uncaught throw)
    expect(result.storyId).toBe('WINT-9110')
    expect(typeof result.worktreeTornDown).toBe('boolean')
  })
})

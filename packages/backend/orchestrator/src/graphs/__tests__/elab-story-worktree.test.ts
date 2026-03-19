/**
 * Unit tests for elab-story.ts worktree lifecycle nodes (PIPE-3020)
 *
 * Tests createWorktreeSetupNode and createWorktreeTeardownNode with:
 * - Injectable gitRunner (no real git subprocess)
 * - Mocked @repo/mcp-tools KB operations
 *
 * All tests run synchronously within the vitest runner — no real git, no DB.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  createWorktreeSetupNode,
  createWorktreeTeardownNode,
  ElabStoryConfigSchema,
  type ElabStoryState,
  type ElabStoryConfig,
  type GitRunner,
} from '../elab-story.js'

// ============================================================================
// Module mocks
// ============================================================================

vi.mock('@repo/mcp-tools', () => ({
  worktreeRegister: vi.fn().mockResolvedValue({
    id: 'mock-uuid-1234',
    storyId: 'PIPE-3020',
    worktreePath: '/tmp/worktrees/PIPE-3020',
    branchName: 'elab/PIPE-3020',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  worktreeGetByStory: vi.fn().mockResolvedValue({
    id: 'mock-uuid-1234',
    storyId: 'PIPE-3020',
    worktreePath: '/tmp/worktrees/PIPE-3020',
    branchName: 'elab/PIPE-3020',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    mergedAt: null,
    abandonedAt: null,
    metadata: {},
  }),
  worktreeMarkComplete: vi.fn().mockResolvedValue({ success: true }),
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================================
// Helpers
// ============================================================================

function makeSuccessGitRunner(): GitRunner {
  return vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
}

function makeFailGitRunner(stderr = 'fatal: branch already exists'): GitRunner {
  return vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr })
}

function makeThrowingGitRunner(msg = 'spawn ENOENT'): GitRunner {
  return vi.fn().mockRejectedValue(new Error(msg))
}

function createTestState(overrides: Partial<ElabStoryState> = {}): ElabStoryState {
  return {
    storyId: 'PIPE-3020',
    config: ElabStoryConfigSchema.parse({ worktreeBaseDir: '/tmp/worktrees' }),
    startedAt: new Date().toISOString(),
    threadId: 'PIPE-3020:elab-story:1',
    currentStory: null,
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

// ============================================================================
// createWorktreeSetupNode
// ============================================================================

describe('createWorktreeSetupNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls git worktree add with correct branch and path', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    await node(createTestState())

    expect(gitRunner).toHaveBeenCalledWith(
      ['worktree', 'add', '-b', 'elab/PIPE-3020', '/tmp/worktrees/PIPE-3020'],
      expect.objectContaining({ cwd: '/repo' }),
    )
  })

  it('sets worktreeSetup: true and worktreePath on success', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const result = await node(createTestState())

    expect(result.worktreeSetup).toBe(true)
    expect(result.worktreePath).toBe('/tmp/worktrees/PIPE-3020')
    expect(result.errors).toBeUndefined()
  })

  it('uses path.join for worktreePath (baseDir + storyId)', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      config: ElabStoryConfigSchema.parse({ worktreeBaseDir: '/custom/trees' }),
    })
    const result = await node(state)

    expect(result.worktreePath).toBe('/custom/trees/PIPE-3020')
  })

  it('returns errors and worktreeSetup: false when git exits non-zero', async () => {
    const gitRunner = makeFailGitRunner('fatal: branch elab/PIPE-3020 already exists')
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const result = await node(createTestState())

    expect(result.worktreeSetup).toBe(false)
    expect(result.worktreePath).toBeNull()
    expect(result.errors).toBeDefined()
    expect(result.errors![0]).toContain('git worktree add failed')
  })

  it('returns errors and worktreeSetup: false when git runner throws', async () => {
    const gitRunner = makeThrowingGitRunner('spawn ENOENT')
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const result = await node(createTestState())

    expect(result.worktreeSetup).toBe(false)
    expect(result.worktreePath).toBeNull()
    expect(result.errors![0]).toContain('git worktree add threw')
  })

  it('calls worktreeRegister after successful git worktree add', async () => {
    const { worktreeRegister } = await import('@repo/mcp-tools')
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    await node(createTestState())

    expect(worktreeRegister).toHaveBeenCalledWith({
      storyId: 'PIPE-3020',
      worktreePath: '/tmp/worktrees/PIPE-3020',
      branchName: 'elab/PIPE-3020',
    })
  })

  it('does NOT call worktreeRegister when git worktree add fails', async () => {
    const { worktreeRegister } = await import('@repo/mcp-tools')
    vi.mocked(worktreeRegister).mockClear()
    const gitRunner = makeFailGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    await node(createTestState())

    expect(worktreeRegister).not.toHaveBeenCalled()
  })

  it('is non-blocking when worktreeRegister returns null (story not in KB)', async () => {
    const { worktreeRegister } = await import('@repo/mcp-tools')
    vi.mocked(worktreeRegister).mockResolvedValueOnce(null)

    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const result = await node(createTestState())

    // Setup should still succeed — KB registration failure is non-blocking
    expect(result.worktreeSetup).toBe(true)
    expect(result.worktreePath).toBe('/tmp/worktrees/PIPE-3020')
    expect(result.errors).toBeUndefined()
  })

  it('is non-blocking when worktreeRegister throws', async () => {
    const { worktreeRegister } = await import('@repo/mcp-tools')
    vi.mocked(worktreeRegister).mockRejectedValueOnce(new Error('DB connection failed'))

    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner, repoRoot: '/repo' })
    const result = await node(createTestState())

    // Setup should still succeed — KB registration failure is non-blocking
    expect(result.worktreeSetup).toBe(true)
  })

  it('uses process.cwd() as default repoRoot', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeSetupNode({ gitRunner })
    await node(createTestState())

    expect(gitRunner).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ cwd: process.cwd() }),
    )
  })
})

// ============================================================================
// createWorktreeTeardownNode
// ============================================================================

describe('createWorktreeTeardownNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('skips git and KB when worktreeSetup is false', async () => {
    const { worktreeGetByStory, worktreeMarkComplete } = await import('@repo/mcp-tools')
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({ worktreeSetup: false, worktreePath: null })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(gitRunner).not.toHaveBeenCalled()
    expect(worktreeGetByStory).not.toHaveBeenCalled()
    expect(worktreeMarkComplete).not.toHaveBeenCalled()
  })

  it('skips git and KB when worktreePath is null', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({ worktreeSetup: true, worktreePath: null })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(gitRunner).not.toHaveBeenCalled()
  })

  it('calls git worktree remove --force with correct path', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    await node(state)

    expect(gitRunner).toHaveBeenCalledWith(
      ['worktree', 'remove', '--force', '/tmp/worktrees/PIPE-3020'],
      expect.objectContaining({ cwd: '/repo' }),
    )
  })

  it('calls worktreeGetByStory to look up KB record', async () => {
    const { worktreeGetByStory } = await import('@repo/mcp-tools')
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    await node(state)

    expect(worktreeGetByStory).toHaveBeenCalledWith({ storyId: 'PIPE-3020' })
  })

  it('calls worktreeMarkComplete with abandoned status', async () => {
    const { worktreeMarkComplete } = await import('@repo/mcp-tools')
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    await node(state)

    expect(worktreeMarkComplete).toHaveBeenCalledWith({
      worktreeId: 'mock-uuid-1234',
      status: 'abandoned',
    })
  })

  it('sets worktreeTornDown: true on success', async () => {
    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('sets worktreeTornDown: true even when git remove fails (warn-only)', async () => {
    const gitRunner = makeFailGitRunner('No such file or directory')
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.some(w => w.includes('git worktree remove failed'))).toBe(true)
  })

  it('sets worktreeTornDown: true even when git runner throws (warn-only)', async () => {
    const gitRunner = makeThrowingGitRunner('spawn ENOENT')
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(result.warnings!.some(w => w.includes('git worktree remove threw'))).toBe(true)
  })

  it('does not call worktreeMarkComplete when KB lookup returns null', async () => {
    const { worktreeGetByStory, worktreeMarkComplete } = await import('@repo/mcp-tools')
    vi.mocked(worktreeGetByStory).mockResolvedValueOnce(null)
    vi.mocked(worktreeMarkComplete).mockClear()

    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(worktreeMarkComplete).not.toHaveBeenCalled()
  })

  it('does not call worktreeMarkComplete when KB lookup throws (warn-only)', async () => {
    const { worktreeGetByStory, worktreeMarkComplete } = await import('@repo/mcp-tools')
    vi.mocked(worktreeGetByStory).mockRejectedValueOnce(new Error('DB down'))
    vi.mocked(worktreeMarkComplete).mockClear()

    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(worktreeMarkComplete).not.toHaveBeenCalled()
  })

  it('sets worktreeTornDown: true when worktreeMarkComplete throws (warn-only)', async () => {
    const { worktreeMarkComplete } = await import('@repo/mcp-tools')
    vi.mocked(worktreeMarkComplete).mockRejectedValueOnce(new Error('Mark complete failed'))

    const gitRunner = makeSuccessGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
    })
    const result = await node(state)

    expect(result.worktreeTornDown).toBe(true)
    expect(result.warnings!.some(w => w.includes('worktreeMarkComplete threw'))).toBe(true)
  })

  it('NEVER modifies workflowSuccess — teardown errors are warn-only (AC-3)', async () => {
    const gitRunner = makeFailGitRunner()
    const node = createWorktreeTeardownNode({ gitRunner, repoRoot: '/repo' })
    const state = createTestState({
      worktreeSetup: true,
      worktreePath: '/tmp/worktrees/PIPE-3020',
      workflowSuccess: true,
    })
    const result = await node(state)

    // workflowSuccess must not appear in teardown result at all
    expect('workflowSuccess' in result).toBe(false)
  })
})

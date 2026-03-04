/**
 * Create Worktree Node Tests
 *
 * Unit tests for:
 * - git worktree add called with correct args via injected mock
 * - worktreePath recorded in returned state on success
 * - worktreeCreated = false on git failure
 * - Non-blocking cleanup (scheduleWorktreeCleanup) does not block caller
 * - Injectable gitRunner pattern
 *
 * APIP-1031 AC-3
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { GitRunner } from '../../nodes/create-worktree.js'
import type { ImplementationGraphState } from '../../graphs/implementation.js'

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

function createTestState(overrides: Partial<ImplementationGraphState> = {}): ImplementationGraphState {
  return {
    storyId: 'APIP-1031',
    attemptNumber: 1,
    featureDir: '/repo/plans/future/platform/autonomous-pipeline',
    startedAt: new Date().toISOString(),
    storyContent: '# Story content',
    changeSpecs: [],
    loadError: null,
    storyLoaded: true,
    worktreePath: null,
    worktreeCreated: false,
    currentChangeIndex: 0,
    completedChanges: [],
    changeLoopComplete: false,
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

function createMockGitRunner(exitCode = 0, stdout = '', stderr = ''): GitRunner {
  return vi.fn().mockResolvedValue({ exitCode, stdout, stderr })
}

// ============================================================================
// Tests
// ============================================================================

describe('createCreateWorktreeNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HP-1: calls git worktree add with correct args', async () => {
    const { createCreateWorktreeNode } = await import('../../nodes/create-worktree.js')

    const mockRunner = createMockGitRunner(0)
    const node = createCreateWorktreeNode({
      gitRunner: mockRunner,
      repoRoot: '/repo',
    })

    const state = createTestState()
    await node(state)

    expect(mockRunner).toHaveBeenCalledOnce()
    const [args] = (mockRunner as ReturnType<typeof vi.fn>).mock.calls[0] as [string[], unknown]
    expect(args).toContain('worktree')
    expect(args).toContain('add')
    expect(args).toContain('-b')
    expect(args).toContain('impl/APIP-1031')
    // Path should include worktrees/APIP-1031
    const worktreePath = args.find(a => a.includes('worktrees'))
    expect(worktreePath).toContain('APIP-1031')
  })

  it('HP-2: records worktreePath in state on success', async () => {
    const { createCreateWorktreeNode } = await import('../../nodes/create-worktree.js')

    const mockRunner = createMockGitRunner(0)
    const node = createCreateWorktreeNode({
      gitRunner: mockRunner,
      repoRoot: '/repo',
    })

    const state = createTestState()
    const result = await node(state)

    expect(result.worktreeCreated).toBe(true)
    expect(result.worktreePath).toBeDefined()
    expect(result.worktreePath).toContain('APIP-1031')
  })

  it('HP-3: sets worktreeCreated = false on git failure (non-zero exit)', async () => {
    const { createCreateWorktreeNode } = await import('../../nodes/create-worktree.js')

    const mockRunner = createMockGitRunner(1, '', 'fatal: already exists')
    const node = createCreateWorktreeNode({
      gitRunner: mockRunner,
      repoRoot: '/repo',
    })

    const state = createTestState()
    const result = await node(state)

    expect(result.worktreeCreated).toBe(false)
    expect(result.worktreePath).toBeNull()
    expect(result.errors).toBeDefined()
    expect(result.errors?.[0]).toContain('git worktree add failed')
  })

  it('HP-4: sets worktreeCreated = false when gitRunner throws', async () => {
    const { createCreateWorktreeNode } = await import('../../nodes/create-worktree.js')

    const mockRunner = vi.fn().mockRejectedValue(new Error('spawn ENOENT'))
    const node = createCreateWorktreeNode({
      gitRunner: mockRunner as GitRunner,
      repoRoot: '/repo',
    })

    const state = createTestState()
    const result = await node(state)

    expect(result.worktreeCreated).toBe(false)
    expect(result.errors?.[0]).toContain('git worktree add threw')
  })

  it('HP-5: logs worktree_created event with storyId, attemptNumber, durationMs', async () => {
    const { logger } = await import('@repo/logger')
    const { createCreateWorktreeNode } = await import('../../nodes/create-worktree.js')

    const mockRunner = createMockGitRunner(0)
    const node = createCreateWorktreeNode({ gitRunner: mockRunner, repoRoot: '/repo' })

    const state = createTestState()
    await node(state)

    const infoMock = vi.mocked(logger.info)
    const call = infoMock.mock.calls.find(c => c[0] === 'worktree_created')

    expect(call).toBeDefined()
    const logData = call?.[1] as Record<string, unknown>
    expect(logData?.storyId).toBe('APIP-1031')
    expect(logData?.attemptNumber).toBe(1)
    expect(typeof logData?.durationMs).toBe('number')
  })
})

describe('scheduleWorktreeCleanup (GAP-2 non-blocking)', () => {
  it('HP-6: fire-and-forget — does not block caller', async () => {
    const { scheduleWorktreeCleanup } = await import('../../nodes/create-worktree.js')

    const mockRunner = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })

    const start = Date.now()
    // scheduleWorktreeCleanup returns void immediately
    scheduleWorktreeCleanup(
      '/repo/worktrees/APIP-1031',
      '/repo',
      mockRunner as GitRunner,
      'APIP-1031',
    )
    const elapsed = Date.now() - start

    // Should complete synchronously (the void IIFE is fire-and-forget)
    expect(elapsed).toBeLessThan(50)

    // Give the micro-task queue a chance to run
    await new Promise(resolve => setTimeout(resolve, 10))

    // Git runner should have been called
    expect(mockRunner).toHaveBeenCalledWith(
      ['worktree', 'remove', '--force', '/repo/worktrees/APIP-1031'],
      expect.objectContaining({ cwd: '/repo' }),
    )
  })

  it('HP-7: logs warning on cleanup failure without throwing', async () => {
    const { logger } = await import('@repo/logger')
    const { scheduleWorktreeCleanup } = await import('../../nodes/create-worktree.js')

    const mockRunner = vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'not a worktree' })

    scheduleWorktreeCleanup(
      '/repo/worktrees/APIP-1031',
      '/repo',
      mockRunner as GitRunner,
      'APIP-1031',
    )

    // Wait for the async IIFE to run
    await new Promise(resolve => setTimeout(resolve, 20))

    const warnMock = vi.mocked(logger.warn)
    const call = warnMock.mock.calls.find(c => c[0] === 'worktree_cleanup_failed')
    expect(call).toBeDefined()
  })
})

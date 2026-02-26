/**
 * Unit tests for cleanup-worktree node
 * AC-8, AC-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCleanupWorktreeNode } from '../cleanup-worktree.js'
import type { MergeGraphState, MergeGraphConfig } from '../../../graphs/merge.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const makeConfig = (): MergeGraphConfig => ({
  worktreeDir: '/tmp/worktree',
  storyBranch: 'story/APIP-1070',
  storyId: 'APIP-1070',
  storyTitle: 'Test Story',
  mainBranch: 'main',
  ciTimeoutMs: 1800000,
  ciPollIntervalMs: 30000,
  ciPollMaxIntervalMs: 300000,
  kbWriteBackEnabled: true,
  nodeTimeoutMs: 60000,
  featureDir: 'plans/future/platform/autonomous-pipeline',
})

const makeState = (overrides: Partial<MergeGraphState> = {}): MergeGraphState => ({
  storyId: 'APIP-1070',
  config: null,
  qaVerify: null,
  prNumber: 42,
  prUrl: null,
  mergeCommitSha: 'abc123',
  ciStatus: 'pass',
  ciPollCount: 3,
  ciStartTime: null,
  rebaseSuccess: true,
  worktreeCleanedUp: false,
  learningsPersisted: false,
  mergeVerdict: 'MERGE_COMPLETE',
  mergeComplete: false,
  mergeArtifact: null,
  errors: [],
  warnings: [],
  ...overrides,
})

describe('createCleanupWorktreeNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets worktreeCleanedUp: true on full success', async () => {
    const gitRunner = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    const node = createCleanupWorktreeNode(makeConfig(), { gitRunner })
    const result = await node(makeState())

    expect(result.worktreeCleanedUp).toBe(true)
    expect(result.warnings).toHaveLength(0)
    // Should not change mergeVerdict
    expect(result.mergeVerdict).toBeUndefined()
    // Called: worktree remove, branch delete
    expect(gitRunner).toHaveBeenCalledTimes(2)
  })

  it('records warning and sets worktreeCleanedUp: false on git error (not MERGE_FAIL)', async () => {
    const gitRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'worktree error' }) // worktree remove fails
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // branch delete succeeds

    const node = createCleanupWorktreeNode(makeConfig(), { gitRunner })
    const result = await node(makeState())

    // worktree remove failed — worktreeCleanedUp false
    expect(result.worktreeCleanedUp).toBe(false)
    // Should have a warning, NOT an error that changes mergeVerdict
    expect(result.warnings!.length).toBeGreaterThan(0)
    expect(result.mergeVerdict).toBeUndefined() // Does NOT change verdict
  })

  it('uses git branch -D (force) on MERGE_FAIL path', async () => {
    const gitRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // worktree remove
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // branch delete

    const node = createCleanupWorktreeNode(makeConfig(), { gitRunner })
    await node(makeState({ mergeVerdict: 'MERGE_FAIL' }))

    // Second call should use -D flag
    expect(gitRunner).toHaveBeenNthCalledWith(
      2,
      ['branch', '-D', 'story/APIP-1070'],
      expect.any(Object),
    )
  })

  it('uses git branch -D (force) on MERGE_BLOCKED path', async () => {
    const gitRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // worktree remove
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // branch delete

    const node = createCleanupWorktreeNode(makeConfig(), { gitRunner })
    await node(makeState({ mergeVerdict: 'MERGE_BLOCKED' }))

    expect(gitRunner).toHaveBeenNthCalledWith(
      2,
      ['branch', '-D', 'story/APIP-1070'],
      expect.any(Object),
    )
  })

  it('falls back to -D when -d fails on non-fail path', async () => {
    const gitRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // worktree remove
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'not merged' }) // branch -d fails
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // branch -D succeeds

    const node = createCleanupWorktreeNode(makeConfig(), { gitRunner })
    const result = await node(makeState({ mergeVerdict: 'MERGE_COMPLETE' }))

    // -D fallback attempted
    expect(gitRunner).toHaveBeenCalledTimes(3)
    expect(gitRunner).toHaveBeenNthCalledWith(
      3,
      ['branch', '-D', 'story/APIP-1070'],
      expect.any(Object),
    )
    // Warning only, not an error state
    expect(result.mergeVerdict).toBeUndefined()
  })

  it('handles gitRunner throwing an exception gracefully', async () => {
    const gitRunner = vi.fn()
      .mockRejectedValueOnce(new Error('git not found'))
      .mockRejectedValueOnce(new Error('git not found'))

    const node = createCleanupWorktreeNode(makeConfig(), { gitRunner })
    const result = await node(makeState())

    // Should not throw — errors become warnings
    expect(result.worktreeCleanedUp).toBe(false)
    expect(result.warnings!.length).toBeGreaterThan(0)
    expect(result.mergeVerdict).toBeUndefined() // No change to verdict
  })
})

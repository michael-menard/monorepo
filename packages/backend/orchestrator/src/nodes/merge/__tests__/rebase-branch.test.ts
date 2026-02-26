/**
 * Unit tests for rebase-branch node
 * AC-4, AC-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRebaseBranchNode } from '../rebase-branch.js'
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

const makeState = (): MergeGraphState => ({
  storyId: 'APIP-1070',
  config: null,
  qaVerify: null,
  prNumber: null,
  prUrl: null,
  mergeCommitSha: null,
  ciStatus: null,
  ciPollCount: 0,
  ciStartTime: null,
  rebaseSuccess: null,
  worktreeCleanedUp: false,
  learningsPersisted: false,
  mergeVerdict: null,
  mergeComplete: false,
  mergeArtifact: null,
  errors: [],
  warnings: [],
})

describe('createRebaseBranchNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns rebaseSuccess: true on full success', async () => {
    const gitRunner = vi.fn().mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' })
    const node = createRebaseBranchNode(makeConfig(), { gitRunner })
    const result = await node(makeState())

    expect(result.rebaseSuccess).toBe(true)
    expect(result.mergeVerdict).toBeUndefined()
    // Should call: fetch, rebase, push
    expect(gitRunner).toHaveBeenCalledTimes(3)
    expect(gitRunner).toHaveBeenNthCalledWith(1, ['fetch', 'origin', 'main'], expect.any(Object))
    expect(gitRunner).toHaveBeenNthCalledWith(2, ['rebase', 'origin/main'], expect.any(Object))
    expect(gitRunner).toHaveBeenNthCalledWith(3, ['push', '--force-with-lease'], expect.any(Object))
  })

  it('returns MERGE_BLOCKED on git fetch failure', async () => {
    const gitRunner = vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'fetch failed' })
    const node = createRebaseBranchNode(makeConfig(), { gitRunner })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
    expect(result.rebaseSuccess).toBe(false)
    expect(result.errors![0]).toContain('git fetch failed')
  })

  it('runs git rebase --abort on conflict and returns MERGE_BLOCKED', async () => {
    const gitRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // fetch success
      .mockResolvedValueOnce({ exitCode: 1, stdout: 'CONFLICT', stderr: 'conflict in file.ts' }) // rebase conflict
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // rebase --abort

    const node = createRebaseBranchNode(makeConfig(), { gitRunner })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
    expect(result.rebaseSuccess).toBe(false)
    expect(result.errors![0]).toContain('Rebase conflict')
    // Should have called: fetch, rebase, rebase --abort
    expect(gitRunner).toHaveBeenCalledTimes(3)
    expect(gitRunner).toHaveBeenNthCalledWith(3, ['rebase', '--abort'], expect.any(Object))
  })

  it('returns MERGE_BLOCKED on push failure', async () => {
    const gitRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // fetch
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // rebase
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'push rejected' }) // push

    const node = createRebaseBranchNode(makeConfig(), { gitRunner })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
    expect(result.rebaseSuccess).toBe(false)
    expect(result.errors![0]).toContain('Push failed after rebase')
  })
})

/**
 * Unit tests for squash-merge node
 * AC-7, AC-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createSquashMergeNode } from '../squash-merge.js'
import type { MergeGraphState, MergeGraphConfig } from '../../../graphs/merge.js'
import type { QaVerify } from '../../../artifacts/qa-verify.js'

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
  prUrl: 'https://github.com/repo/pull/42',
  mergeCommitSha: null,
  ciStatus: 'pass',
  ciPollCount: 3,
  ciStartTime: null,
  rebaseSuccess: true,
  worktreeCleanedUp: false,
  learningsPersisted: false,
  mergeVerdict: null,
  mergeComplete: false,
  mergeArtifact: null,
  errors: [],
  warnings: [],
  ...overrides,
})

describe('createSquashMergeNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns MERGE_FAIL when no prNumber in state', async () => {
    const ghRunner = vi.fn()
    const node = createSquashMergeNode(makeConfig(), { ghRunner })
    const result = await node(makeState({ prNumber: null }))

    expect(result.mergeVerdict).toBe('MERGE_FAIL')
    expect(result.errors![0]).toContain('No PR number')
    expect(ghRunner).not.toHaveBeenCalled()
  })

  it('returns MERGE_COMPLETE with mergeCommitSha on success', async () => {
    const sha = 'abc123def456'
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // pr merge
      .mockResolvedValueOnce({
        exitCode: 0,
        stdout: JSON.stringify({ mergeCommit: { oid: sha } }),
        stderr: '',
      }) // pr view

    const node = createSquashMergeNode(makeConfig(), { ghRunner })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_COMPLETE')
    expect(result.mergeCommitSha).toBe(sha)
    expect(ghRunner).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining(['pr', 'merge', '42', '--squash']),
      expect.any(Object),
    )
  })

  it('returns MERGE_COMPLETE with null SHA if pr view fails', async () => {
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // merge success
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'view failed' }) // view fails

    const node = createSquashMergeNode(makeConfig(), { ghRunner })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_COMPLETE')
    expect(result.mergeCommitSha).toBeNull()
  })

  it('returns MERGE_FAIL on gh pr merge failure', async () => {
    const ghRunner = vi.fn().mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'merge conflict',
    })

    const node = createSquashMergeNode(makeConfig(), { ghRunner })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_FAIL')
    expect(result.errors![0]).toContain('gh pr merge failed')
  })
})

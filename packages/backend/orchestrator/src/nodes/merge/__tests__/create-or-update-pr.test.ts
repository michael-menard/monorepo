/**
 * Unit tests for create-or-update-pr node
 * AC-5, AC-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCreateOrUpdatePrNode } from '../create-or-update-pr.js'
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
  ...overrides,
})

const makeQaVerify = (): QaVerify => ({
  schema: 1,
  story_id: 'APIP-1070',
  timestamp: new Date().toISOString(),
  verdict: 'PASS',
  tests_executed: true,
  acs_verified: [{ ac_id: 'AC-1', status: 'PASS' }],
  architecture_compliant: true,
  issues: [],
  lessons_to_record: [],
})

describe('createCreateOrUpdatePrNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns MERGE_FAIL when no qaVerify in state', async () => {
    const ghRunner = vi.fn()
    const node = createCreateOrUpdatePrNode(makeConfig(), { ghRunner })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_FAIL')
    expect(result.errors![0]).toContain('No QA artifact')
    expect(ghRunner).not.toHaveBeenCalled()
  })

  it('creates new PR when none exists', async () => {
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '[]', stderr: '' }) // pr list: empty
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'https://github.com/repo/pull/42', stderr: '' }) // pr create
      .mockResolvedValueOnce({ exitCode: 0, stdout: JSON.stringify({ number: 42 }), stderr: '' }) // pr view

    const node = createCreateOrUpdatePrNode(makeConfig(), { ghRunner })
    const result = await node(makeState({ qaVerify: makeQaVerify() }))

    expect(result.mergeVerdict).toBeUndefined()
    expect(result.prNumber).toBe(42)
    expect(result.prUrl).toBe('https://github.com/repo/pull/42')
    expect(ghRunner).toHaveBeenCalledWith(
      expect.arrayContaining(['pr', 'create']),
      expect.any(Object),
    )
  })

  it('updates existing PR when one exists', async () => {
    const existingPr = [{ number: 99, url: 'https://github.com/repo/pull/99' }]
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: JSON.stringify(existingPr), stderr: '' }) // pr list
      .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // pr edit

    const node = createCreateOrUpdatePrNode(makeConfig(), { ghRunner })
    const result = await node(makeState({ qaVerify: makeQaVerify() }))

    expect(result.prNumber).toBe(99)
    expect(result.prUrl).toBe('https://github.com/repo/pull/99')
    expect(ghRunner).toHaveBeenCalledWith(
      expect.arrayContaining(['pr', 'edit', '99']),
      expect.any(Object),
    )
  })

  it('returns MERGE_FAIL on gh pr create failure', async () => {
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: '[]', stderr: '' }) // pr list: empty
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'gh error' }) // pr create fails

    const node = createCreateOrUpdatePrNode(makeConfig(), { ghRunner })
    const result = await node(makeState({ qaVerify: makeQaVerify() }))

    expect(result.mergeVerdict).toBe('MERGE_FAIL')
    expect(result.errors![0]).toContain('gh pr create failed')
  })

  it('returns MERGE_FAIL on gh pr edit failure', async () => {
    const existingPr = [{ number: 99, url: 'https://github.com/repo/pull/99' }]
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: JSON.stringify(existingPr), stderr: '' }) // pr list
      .mockResolvedValueOnce({ exitCode: 1, stdout: '', stderr: 'edit failed' }) // pr edit fails

    const node = createCreateOrUpdatePrNode(makeConfig(), { ghRunner })
    const result = await node(makeState({ qaVerify: makeQaVerify() }))

    expect(result.mergeVerdict).toBe('MERGE_FAIL')
    expect(result.errors![0]).toContain('gh pr edit failed')
  })
})

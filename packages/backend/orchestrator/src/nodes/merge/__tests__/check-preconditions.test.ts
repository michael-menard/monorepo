/**
 * Unit tests for check-preconditions node
 * AC-3, AC-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCheckPreconditionsNode } from '../check-preconditions.js'
import type { MergeGraphState, MergeGraphConfig } from '../../../graphs/merge.js'
import type { QaVerify } from '../../../artifacts/qa-verify.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock fs/promises, path, yaml for file loading
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}))

vi.mock('yaml', () => ({
  parse: vi.fn(),
}))

const makeConfig = (overrides: Partial<MergeGraphConfig> = {}): MergeGraphConfig => ({
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
  ...overrides,
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

const makeQaVerify = (verdict: 'PASS' | 'FAIL' | 'BLOCKED' = 'PASS'): QaVerify => ({
  schema: 1,
  story_id: 'APIP-1070',
  timestamp: new Date().toISOString(),
  verdict,
  tests_executed: true,
  acs_verified: [{ ac_id: 'AC-1', status: 'PASS' }],
  architecture_compliant: true,
  issues: [],
  lessons_to_record: [],
})

// Mock ghRunner helper
const mockGhRunner = (exitCode: number, stdout = '', stderr = '') =>
  vi.fn().mockResolvedValue({ exitCode, stdout, stderr })

describe('createCheckPreconditionsNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('QA artifact loading', () => {
    it('sets MERGE_BLOCKED when QA artifact file is missing', async () => {
      const { readFile } = await import('fs/promises')
      vi.mocked(readFile).mockRejectedValue(new Error('ENOENT: no such file or directory'))

      const ghRunner = mockGhRunner(0)
      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState())

      expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
      expect(result.errors![0]).toContain('QA artifact invalid or missing')
    })

    it('sets MERGE_BLOCKED when QA artifact fails Zod parse', async () => {
      const { readFile } = await import('fs/promises')
      const { parse } = await import('yaml')
      vi.mocked(readFile).mockResolvedValue('invalid yaml content')
      vi.mocked(parse).mockReturnValue({ invalid: 'data' })

      const ghRunner = mockGhRunner(0)
      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState())

      expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
      expect(result.errors![0]).toContain('QA artifact invalid or missing')
    })

    it('uses pre-loaded qaVerify from state if already set', async () => {
      const qaVerify = makeQaVerify('PASS')
      const ghRunner = mockGhRunner(0) // gh auth status success

      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState({ qaVerify }))

      // Should not try to read file — no readFile mock needed
      expect(result.mergeVerdict).toBeUndefined()
      expect(result.qaVerify).toEqual(qaVerify)
    })
  })

  describe('QA verdict check', () => {
    it('sets MERGE_BLOCKED when QA verdict is FAIL', async () => {
      const qaVerify = makeQaVerify('FAIL')
      const ghRunner = mockGhRunner(0)

      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState({ qaVerify }))

      expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
      expect(result.errors![0]).toContain('QA verdict is not PASS')
    })

    it('sets MERGE_BLOCKED when QA verdict is BLOCKED', async () => {
      const qaVerify = makeQaVerify('BLOCKED')
      const ghRunner = mockGhRunner(0)

      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState({ qaVerify }))

      expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
      expect(result.errors![0]).toContain('QA verdict is not PASS')
    })

    it('sets MERGE_BLOCKED when QA has high-severity issues', async () => {
      const qaVerify: QaVerify = {
        ...makeQaVerify('PASS'),
        issues: [{ id: 'I-1', severity: 'critical', description: 'Critical issue' }],
      }
      const ghRunner = mockGhRunner(0)

      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState({ qaVerify }))

      // qaPassedSuccessfully checks for critical/high issues
      expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
    })
  })

  describe('gh auth check', () => {
    it('sets MERGE_BLOCKED when gh auth status fails', async () => {
      const qaVerify = makeQaVerify('PASS')
      const ghRunner = mockGhRunner(1, '', 'not authenticated')

      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState({ qaVerify }))

      expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
      expect(result.errors![0]).toContain('GitHub CLI not authenticated')
    })

    it('sets MERGE_BLOCKED when gh runner throws', async () => {
      const qaVerify = makeQaVerify('PASS')
      const ghRunner = vi.fn().mockRejectedValue(new Error('spawn error'))

      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState({ qaVerify }))

      expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
      expect(result.errors![0]).toContain('GitHub CLI not authenticated')
    })

    it('passes all preconditions and returns qaVerify in state', async () => {
      const qaVerify = makeQaVerify('PASS')
      const ghRunner = mockGhRunner(0) // auth success

      const node = createCheckPreconditionsNode(makeConfig(), { ghRunner })
      const result = await node(makeState({ qaVerify }))

      expect(result.mergeVerdict).toBeUndefined()
      expect(result.qaVerify).toEqual(qaVerify)
    })
  })
})

/**
 * Unit tests for extract-learnings node
 * AC-9, AC-15, AC-19
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createExtractLearningsNode } from '../extract-learnings.js'
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

// Mock persist-learnings entirely (no importActual) to avoid the deep import chain:
// persist-learnings -> node-factory -> llm-provider -> @langchain/ollama
vi.mock('../../completion/persist-learnings.js', () => ({
  persistLearnings: vi.fn().mockResolvedValue({
    persisted: true,
    learningsCount: 1,
    persistedCount: 1,
    skippedDuplicates: 0,
    errors: [],
  }),
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
  ciStatus: 'pass',
  ciPollCount: 3,
  ciStartTime: Date.now() - 10000,
  rebaseSuccess: true,
  worktreeCleanedUp: true,
  learningsPersisted: false,
  mergeVerdict: 'MERGE_COMPLETE',
  mergeComplete: false,
  mergeArtifact: null,
  errors: [],
  warnings: [],
  ...overrides,
})

const makeQaVerify = (lessons: QaVerify['lessons_to_record'] = []): QaVerify => ({
  schema: 1,
  story_id: 'APIP-1070',
  timestamp: new Date().toISOString(),
  verdict: 'PASS',
  tests_executed: true,
  acs_verified: [{ ac_id: 'AC-1', status: 'PASS' }],
  architecture_compliant: true,
  issues: [],
  lessons_to_record: lessons,
})

describe('createExtractLearningsNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('extracts and category-maps QA lessons', async () => {
    const { persistLearnings } = await import('../../completion/persist-learnings.js')
    const qaVerify = makeQaVerify([
      { lesson: 'Time sink lesson', category: 'time_sink', tags: [] },
      { lesson: 'Anti-pattern lesson', category: 'anti_pattern', tags: [] },
      { lesson: 'Pattern lesson', category: 'pattern', tags: [] },
    ])

    const kbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn().mockResolvedValue({ results: [], metadata: { total: 0, fallback_mode: false } }),
      kbAddFn: vi.fn().mockResolvedValue({ id: 'kb-1', success: true }),
    }

    const node = createExtractLearningsNode(makeConfig(), { kbDeps })
    await node(makeState({ qaVerify }))

    // persistLearnings should be called with Learning[] including mapped categories
    expect(persistLearnings).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ category: 'time-sink', content: 'Time sink lesson' }),
        expect.objectContaining({ category: 'pattern', content: 'Anti-pattern lesson' }),
        expect.objectContaining({ category: 'pattern', content: 'Pattern lesson' }),
        // Operational learning appended
        expect.objectContaining({ category: 'pattern', storyId: 'APIP-1070' }),
      ]),
      expect.any(Function),
      expect.any(Function),
      expect.any(Object),
    )
  })

  it('skips KB write when kbWriteBackEnabled is false', async () => {
    const { persistLearnings } = await import('../../completion/persist-learnings.js')
    const config = makeConfig({ kbWriteBackEnabled: false })

    const node = createExtractLearningsNode(config)
    const result = await node(makeState({ qaVerify: makeQaVerify() }))

    expect(result.learningsPersisted).toBe(false)
    expect(persistLearnings).not.toHaveBeenCalled()
  })

  it('returns learningsPersisted: false when no kbDeps', async () => {
    const { persistLearnings } = await import('../../completion/persist-learnings.js')
    const config = makeConfig({ kbWriteBackEnabled: true })

    const node = createExtractLearningsNode(config) // No kbDeps
    const result = await node(makeState({ qaVerify: makeQaVerify() }))

    expect(result.learningsPersisted).toBe(false)
    expect(persistLearnings).not.toHaveBeenCalled()
  })

  it('runs on MERGE_BLOCKED path with operational learning', async () => {
    const { persistLearnings } = await import('../../completion/persist-learnings.js')
    const kbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn().mockResolvedValue({ results: [], metadata: { total: 0, fallback_mode: false } }),
      kbAddFn: vi.fn().mockResolvedValue({ id: 'kb-1', success: true }),
    }

    const node = createExtractLearningsNode(makeConfig(), { kbDeps })
    await node(makeState({ mergeVerdict: 'MERGE_BLOCKED' }))

    // Should still call persistLearnings — including operational learning
    expect(persistLearnings).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          content: expect.stringContaining('MERGE_BLOCKED'),
          category: 'pattern',
        }),
      ]),
      expect.any(Function),
      expect.any(Function),
      expect.any(Object),
    )
  })

  it('appends operational learning entry with merge verdict and CI info', async () => {
    const { persistLearnings } = await import('../../completion/persist-learnings.js')
    const kbDeps = {
      db: {},
      embeddingClient: {},
      kbSearchFn: vi.fn().mockResolvedValue({ results: [], metadata: { total: 0, fallback_mode: false } }),
      kbAddFn: vi.fn().mockResolvedValue({ id: 'kb-1', success: true }),
    }

    const node = createExtractLearningsNode(makeConfig(), { kbDeps })
    await node(makeState({ mergeVerdict: 'MERGE_COMPLETE', ciPollCount: 5 }))

    const calls = vi.mocked(persistLearnings).mock.calls
    const learnings = calls[0][0]
    const operationalLearning = learnings[learnings.length - 1]

    expect(operationalLearning.content).toContain('MERGE_COMPLETE')
    expect(operationalLearning.content).toContain('APIP-1070')
    expect(operationalLearning.content).toContain('5 polls')
    expect(operationalLearning.storyId).toBe('APIP-1070')
  })
})

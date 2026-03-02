/**
 * Tests for check-preconditions node (AC-14, AC-3, AC-16)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Evidence } from '../../../artifacts/evidence.js'
import type { Review } from '../../../artifacts/review.js'
import type { QAGraphState } from '../../../graphs/qa.js'

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => mockLogger),
  logger: mockLogger,
}))

const makeEvidence = (overrides: Partial<Evidence> = {}): Evidence => ({
  schema: 2,
  story_id: 'APIP-1060',
  version: 1,
  timestamp: new Date().toISOString(),
  acceptance_criteria: [{ ac_id: 'AC-1', status: 'PASS', evidence_items: [] }],
  touched_files: [],
  commands_run: [],
  endpoints_exercised: [],
  notable_decisions: [],
  known_deviations: [],
  ...overrides,
})

const makeReview = (overrides: Partial<Review> = {}): Review => ({
  schema: 1,
  story_id: 'APIP-1060',
  timestamp: new Date().toISOString(),
  iteration: 1,
  verdict: 'PASS',
  workers_run: ['lint'],
  workers_skipped: [],
  ranked_patches: [],
  findings: {},
  total_errors: 0,
  total_warnings: 0,
  auto_fixable_count: 0,
  ...overrides,
})

const makeState = (overrides: Partial<QAGraphState> = {}): QAGraphState => ({
  storyId: 'APIP-1060',
  evidence: makeEvidence(),
  review: makeReview(),
  config: {
    worktreeDir: '/tmp/worktree',
    storyId: 'APIP-1060',
    enableE2e: true,
    testFilter: '@repo/orchestrator',
    playwrightConfig: 'playwright.legacy.config.ts',
    playwrightProject: 'chromium-live',
    testTimeoutMs: 300000,
    testTimeoutRetries: 1,
    playwrightMaxRetries: 2,
    kbWriteBackEnabled: false,
    artifactBaseDir: 'plans/future/platform/autonomous-pipeline/in-progress',
    gateModel: 'claude-sonnet-4-5',
    nodeTimeoutMs: 60000,
  },
  preconditionsPassed: false,
  unitTestResult: null,
  unitTestVerdict: null,
  playwrightAttempts: [],
  e2eVerdict: null,
  acVerifications: [],
  qaVerdict: null,
  gateDecision: null,
  qaArtifact: null,
  qaComplete: false,
  errors: [],
  warnings: [],
  ...overrides,
})

describe('check-preconditions node', () => {
  let createCheckPreconditionsNode: () => ReturnType<typeof import('../check-preconditions.js').createCheckPreconditionsNode>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('../check-preconditions.js')
    createCheckPreconditionsNode = mod.createCheckPreconditionsNode
  })

  it('passes when review is PASS and evidence is valid', async () => {
    const node = createCheckPreconditionsNode()
    const state = makeState()
    const result = await node(state as any)
    expect(result.preconditionsPassed).toBe(true)
    expect(result.qaVerdict).toBeUndefined()
  })

  it('blocks when review verdict is FAIL (AC-3)', async () => {
    const node = createCheckPreconditionsNode()
    const state = makeState({ review: makeReview({ verdict: 'FAIL', total_errors: 3 }) })
    const result = await node(state as any)
    expect(result.preconditionsPassed).toBe(false)
    expect(result.qaVerdict).toBe('BLOCKED')
    expect(result.warnings).toBeDefined()
    expect(result.warnings![0]).toContain('BLOCKED')
  })

  it('blocks when review is null (AC-3)', async () => {
    const node = createCheckPreconditionsNode()
    const state = makeState({ review: null })
    const result = await node(state as any)
    expect(result.preconditionsPassed).toBe(false)
    expect(result.qaVerdict).toBe('BLOCKED')
  })

  it('blocks when evidence is null (AC-3)', async () => {
    const node = createCheckPreconditionsNode()
    const state = makeState({ evidence: null })
    const result = await node(state as any)
    expect(result.preconditionsPassed).toBe(false)
    expect(result.qaVerdict).toBe('BLOCKED')
    expect(result.warnings![0]).toContain('evidence is null')
  })

  it('blocks when evidence fails schema validation (AC-3)', async () => {
    const node = createCheckPreconditionsNode()
    const invalidEvidence = { schema: 99, story_id: 'APIP-1060' } as any
    const state = makeState({ evidence: invalidEvidence })
    const result = await node(state as any)
    expect(result.preconditionsPassed).toBe(false)
    expect(result.qaVerdict).toBe('BLOCKED')
    expect(result.warnings![0]).toContain('schema invalid')
  })

  it('logs qa_preconditions_check events (AC-16)', async () => {
    const { logger } = await import('@repo/logger')
    const node = createCheckPreconditionsNode()
    const state = makeState()
    await node(state as any)
    expect(logger.info).toHaveBeenCalledWith(
      'qa_preconditions_check',
      expect.objectContaining({ stage: 'qa', event: 'check_preconditions_started' }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'qa_preconditions_check',
      expect.objectContaining({ stage: 'qa', event: 'check_preconditions_complete', result: 'PASS' }),
    )
  })

  it('logs warning for BLOCKED state (AC-16)', async () => {
    const { logger } = await import('@repo/logger')
    const node = createCheckPreconditionsNode()
    const state = makeState({ review: makeReview({ verdict: 'FAIL' }) })
    await node(state as any)
    expect(logger.warn).toHaveBeenCalledWith(
      'qa_preconditions_check',
      expect.objectContaining({ stage: 'qa', result: 'BLOCKED' }),
    )
  })
})

/**
 * Tests for verify-acs node (AC-14, AC-6, AC-7, AC-16)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Evidence } from '../../../artifacts/evidence.js'
import type { ModelClient, QAGraphState } from '../../../graphs/qa.js'

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

const makeEvidence = (acCount = 2): Evidence => ({
  schema: 2,
  story_id: 'APIP-1060',
  version: 1,
  timestamp: new Date().toISOString(),
  acceptance_criteria: Array.from({ length: acCount }, (_, i) => ({
    ac_id: `AC-${i + 1}`,
    ac_text: `Acceptance criterion ${i + 1}`,
    status: 'PASS' as const,
    evidence_items: [],
  })),
  touched_files: [],
  commands_run: [],
  endpoints_exercised: [],
  notable_decisions: [],
  known_deviations: [],
})

const makeState = (overrides: Partial<QAGraphState> = {}): QAGraphState => ({
  storyId: 'APIP-1060',
  evidence: makeEvidence(2),
  review: null,
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
  preconditionsPassed: true,
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

describe('verify-acs node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns PASS for each AC when model confirms evidence (AC-6)', async () => {
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ status: 'PASS', cited_evidence: 'test output shows pass', reasoning: 'Evidence found' }),
      ),
    }

    const { createVerifyAcsNode } = await import('../verify-acs.js')
    const node = createVerifyAcsNode(mockClient)
    const state = makeState()

    const result = await node(state as any)
    expect(result.acVerifications).toHaveLength(2)
    expect(result.acVerifications![0].status).toBe('PASS')
    expect(result.acVerifications![1].status).toBe('PASS')
  })

  it('returns FAIL when model says FAIL (AC-6)', async () => {
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ status: 'FAIL', cited_evidence: null, reasoning: 'No evidence found' }),
      ),
    }

    const { createVerifyAcsNode } = await import('../verify-acs.js')
    const node = createVerifyAcsNode(mockClient)
    const state = makeState()

    const result = await node(state as any)
    expect(result.acVerifications![0].status).toBe('FAIL')
  })

  it('returns BLOCKED (not FAIL) on model failure per AC, continues remaining ACs (AC-6)', async () => {
    let callCount = 0
    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async () => {
        callCount++
        if (callCount === 1) throw new Error('Model API error')
        return JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'ok' })
      }),
    }

    const { createVerifyAcsNode } = await import('../verify-acs.js')
    const node = createVerifyAcsNode(mockClient)
    const state = makeState({ evidence: makeEvidence(3) })

    const result = await node(state as any)
    expect(result.acVerifications).toHaveLength(3)
    // First AC: BLOCKED (model failure)
    expect(result.acVerifications![0].status).toBe('BLOCKED')
    // Remaining ACs: continue and PASS
    expect(result.acVerifications![1].status).toBe('PASS')
    expect(result.acVerifications![2].status).toBe('PASS')
  })

  it('AC_VERIFICATION_PROMPT_V1 contains anti-hallucination instruction (AC-7)', async () => {
    const { AC_VERIFICATION_PROMPT_V1 } = await import('../verify-acs.js')
    expect(AC_VERIFICATION_PROMPT_V1).toContain('ANTI-HALLUCINATION')
    expect(AC_VERIFICATION_PROMPT_V1).toContain('EXPLICITLY present')
    expect(AC_VERIFICATION_PROMPT_V1).toContain('Do NOT infer')
    expect(AC_VERIFICATION_PROMPT_V1).toContain('fabricate')
  })

  it('logs qa_ac_verification_started and qa_ac_verified per AC (AC-16)', async () => {
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'ok' }),
      ),
    }
    const { logger } = await import('@repo/logger')

    const { createVerifyAcsNode } = await import('../verify-acs.js')
    const node = createVerifyAcsNode(mockClient)
    const state = makeState({ evidence: makeEvidence(2) })

    await node(state as any)

    expect(logger.info).toHaveBeenCalledWith(
      'qa_ac_verification_started',
      expect.objectContaining({ stage: 'qa', event: 'ac_verification_started', acId: 'AC-1' }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'qa_ac_verified',
      expect.objectContaining({ stage: 'qa', event: 'ac_verified', acId: 'AC-1', status: 'PASS' }),
    )
  })

  it('handles null evidence gracefully', async () => {
    const mockClient: ModelClient = { callModel: vi.fn() }
    const { createVerifyAcsNode } = await import('../verify-acs.js')
    const node = createVerifyAcsNode(mockClient)
    const state = makeState({ evidence: null })

    const result = await node(state as any)
    expect(result.acVerifications).toHaveLength(0)
    expect(mockClient.callModel).not.toHaveBeenCalled()
  })
})

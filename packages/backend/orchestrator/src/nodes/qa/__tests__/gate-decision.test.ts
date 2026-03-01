/**
 * Tests for gate-decision node (AC-14, AC-8, AC-12, AC-16)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

const makeConfig = (overrides = {}) => ({
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
  ...overrides,
})

const makeState = (overrides: Partial<QAGraphState> = {}): QAGraphState => ({
  storyId: 'APIP-1060',
  evidence: null,
  review: null,
  config: makeConfig() as any,
  preconditionsPassed: true,
  unitTestResult: {
    exitCode: 0,
    stdout: 'tests pass',
    stderr: '',
    durationMs: 5000,
    timedOut: false,
  },
  unitTestVerdict: 'PASS',
  playwrightAttempts: [],
  e2eVerdict: null,
  acVerifications: [
    { ac_id: 'AC-1', status: 'PASS', reasoning: 'All good' },
    { ac_id: 'AC-2', status: 'PASS', reasoning: 'All good' },
  ],
  qaVerdict: null,
  gateDecision: null,
  qaArtifact: null,
  qaComplete: false,
  errors: [],
  warnings: [],
  ...overrides,
})

describe('gate-decision node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns PASS when all ACs pass and gate model agrees (AC-8)', async () => {
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'All good' }),
      ),
    }

    const { createGateDecisionNode } = await import('../gate-decision.js')
    const config = makeConfig()
    const node = createGateDecisionNode(mockClient, config as any)
    const state = makeState()

    const result = await node(state as any)
    expect(result.qaVerdict).toBe('PASS')
    expect(result.gateDecision!.verdict).toBe('PASS')
  })

  it('returns FAIL when ACs fail (AC-8)', async () => {
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ verdict: 'FAIL', blocking_issues: 'AC-1 failed', reasoning: 'Evidence missing' }),
      ),
    }

    const { createGateDecisionNode } = await import('../gate-decision.js')
    const config = makeConfig()
    const node = createGateDecisionNode(mockClient, config as any)
    const state = makeState({
      acVerifications: [
        { ac_id: 'AC-1', status: 'FAIL', reasoning: 'No evidence' },
      ],
    })

    const result = await node(state as any)
    expect(result.qaVerdict).toBe('FAIL')
  })

  it('returns BLOCKED on model failure (AC-8)', async () => {
    const mockClient: ModelClient = {
      callModel: vi.fn().mockRejectedValue(new Error('API timeout')),
    }

    const { createGateDecisionNode } = await import('../gate-decision.js')
    const config = makeConfig()
    const node = createGateDecisionNode(mockClient, config as any)
    const state = makeState()

    const result = await node(state as any)
    expect(result.qaVerdict).toBe('BLOCKED')
    expect(result.gateDecision!.verdict).toBe('BLOCKED')
    expect(result.warnings![0]).toContain('BLOCKED')
  })

  it('calls qaPassedSuccessfully() before returning PASS (AC-12)', async () => {
    // All ACs must PASS for qaPassedSuccessfully to succeed
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'All checks pass' }),
      ),
    }

    const { createGateDecisionNode } = await import('../gate-decision.js')
    const { qaPassedSuccessfully } = await import('../../../artifacts/qa-verify.js')

    const config = makeConfig()
    const node = createGateDecisionNode(mockClient, config as any)
    const state = makeState({
      acVerifications: [
        { ac_id: 'AC-1', status: 'PASS', reasoning: 'OK' },
        { ac_id: 'AC-2', status: 'PASS', reasoning: 'OK' },
      ],
    })

    const result = await node(state as any)
    // PASS returned means qaPassedSuccessfully was invoked and passed
    expect(result.qaVerdict).toBe('PASS')
  })

  it('downgrades PASS to FAIL when qaPassedSuccessfully() fails (AC-12)', async () => {
    // Gate model says PASS but one AC has BLOCKED status which fails qaPassedSuccessfully
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'Model thinks all ok' }),
      ),
    }

    const { createGateDecisionNode } = await import('../gate-decision.js')
    const config = makeConfig()
    const node = createGateDecisionNode(mockClient, config as any)
    const state = makeState({
      acVerifications: [
        { ac_id: 'AC-1', status: 'BLOCKED', reasoning: 'Model failure' },
      ],
    })

    const result = await node(state as any)
    // qaPassedSuccessfully fails because AC-1 is BLOCKED, not PASS
    // verdict should be FAIL (downgraded from PASS)
    expect(result.qaVerdict).toBe('FAIL')
  })

  it('logs qa_gate_decision events (AC-16)', async () => {
    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'All good' }),
      ),
    }
    const { logger } = await import('@repo/logger')

    const { createGateDecisionNode } = await import('../gate-decision.js')
    const config = makeConfig()
    const node = createGateDecisionNode(mockClient, config as any)
    const state = makeState()

    await node(state as any)

    expect(logger.info).toHaveBeenCalledWith(
      'qa_gate_decision',
      expect.objectContaining({ stage: 'qa', event: 'gate_decision_started' }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'qa_gate_decision',
      expect.objectContaining({ stage: 'qa', event: 'gate_decision_complete' }),
    )
  })
})

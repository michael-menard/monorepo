/**
 * Tests for run-e2e-tests node (AC-14, AC-5, AC-16)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

vi.mock('child_process', () => ({
  spawn: vi.fn(),
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

function makeMockSpawn(exitCode: number, stdout = '', stderr = '', delayMs = 0) {
  const { EventEmitter } = require('events')
  return vi.fn(() => {
    const stdoutEmitter = new EventEmitter()
    const stderrEmitter = new EventEmitter()
    const childEmitter = new EventEmitter()
    const child = {
      stdout: stdoutEmitter,
      stderr: stderrEmitter,
      on: childEmitter.on.bind(childEmitter),
      kill: vi.fn(),
      killed: false,
    }
    setTimeout(() => {
      stdoutEmitter.emit('data', Buffer.from(stdout))
      stderrEmitter.emit('data', Buffer.from(stderr))
      childEmitter.emit('close', exitCode)
    }, delayMs)
    return child
  })
}

describe('run-e2e-tests node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns PASS when attempt 1 fails but attempt 2 succeeds (AC-5)', async () => {
    const { spawn } = await import('child_process')
    let callCount = 0
    vi.mocked(spawn).mockImplementation(() => {
      callCount++
      return makeMockSpawn(callCount === 1 ? 1 : 0)() as any
    })

    const { createRunE2ETestsNode } = await import('../run-e2e-tests.js')
    const config = makeConfig({ playwrightMaxRetries: 2 })
    const node = createRunE2ETestsNode(config as any)
    const state = makeState({ config: config as any })

    const resultPromise = node(state as any)
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.e2eVerdict).toBe('PASS')
    expect(result.playwrightAttempts).toHaveLength(2)
  })

  it('returns FAIL when all attempts fail (AC-5)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(1, '', 'E2E failed'))

    const { createRunE2ETestsNode } = await import('../run-e2e-tests.js')
    const config = makeConfig({ playwrightMaxRetries: 1 })
    const node = createRunE2ETestsNode(config as any)
    const state = makeState({ config: config as any })

    const resultPromise = node(state as any)
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.e2eVerdict).toBe('FAIL')
    expect(result.playwrightAttempts).toHaveLength(2) // 1 initial + 1 retry
  })

  it('returns PASS on first successful attempt', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0, 'All tests pass'))

    const { createRunE2ETestsNode } = await import('../run-e2e-tests.js')
    const config = makeConfig({ playwrightMaxRetries: 2 })
    const node = createRunE2ETestsNode(config as any)
    const state = makeState({ config: config as any })

    const resultPromise = node(state as any)
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.e2eVerdict).toBe('PASS')
    expect(result.playwrightAttempts).toHaveLength(1)
  })

  it('logs qa_e2e_started, qa_e2e_attempt, qa_e2e_complete events (AC-16)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0))
    const { logger } = await import('@repo/logger')

    const { createRunE2ETestsNode } = await import('../run-e2e-tests.js')
    const config = makeConfig()
    const node = createRunE2ETestsNode(config as any)
    const state = makeState({ config: config as any })

    const resultPromise = node(state as any)
    vi.runAllTimers()
    await resultPromise

    expect(logger.info).toHaveBeenCalledWith(
      'qa_e2e_started',
      expect.objectContaining({ stage: 'qa', event: 'e2e_started' }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'qa_e2e_attempt',
      expect.objectContaining({ stage: 'qa', event: 'e2e_attempt', attempt: 1 }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'qa_e2e_complete',
      expect.objectContaining({ stage: 'qa', event: 'e2e_complete', verdict: 'PASS' }),
    )
  })
})

/**
 * Tests for run-unit-tests node (AC-14, AC-4, AC-16)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

/**
 * Creates a mock spawn that emits stdout/stderr and closes with the given exit code.
 */
function makeMockSpawn(exitCode: number, stdout = 'test output', stderr = '', delayMs = 0) {
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

describe('run-unit-tests node', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns PASS when tests succeed (exit code 0, AC-4)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0, 'Tests passed'))

    const { createRunUnitTestsNode } = await import('../run-unit-tests.js')
    const config = makeConfig()
    const node = createRunUnitTestsNode(config as any)
    const state = makeState()

    const resultPromise = node(state as any)
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.unitTestVerdict).toBe('PASS')
    expect(result.unitTestResult).toBeDefined()
    expect(result.unitTestResult!.exitCode).toBe(0)
    expect(result.unitTestResult!.stdout).toContain('Tests passed')
  })

  it('returns FAIL when tests fail (exit code 1, AC-4)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(1, '', 'Test failed'))

    const { createRunUnitTestsNode } = await import('../run-unit-tests.js')
    const config = makeConfig()
    const node = createRunUnitTestsNode(config as any)
    const state = makeState()

    const resultPromise = node(state as any)
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.unitTestVerdict).toBe('FAIL')
    expect(result.unitTestResult!.exitCode).toBe(1)
  })

  it('logs qa_unit_tests_started and qa_unit_tests_complete events (AC-16)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0))
    const { logger } = await import('@repo/logger')

    const { createRunUnitTestsNode } = await import('../run-unit-tests.js')
    const config = makeConfig()
    const node = createRunUnitTestsNode(config as any)
    const state = makeState()

    const resultPromise = node(state as any)
    vi.runAllTimers()
    await resultPromise

    expect(logger.info).toHaveBeenCalledWith(
      'qa_unit_tests_started',
      expect.objectContaining({ stage: 'qa', event: 'unit_tests_started' }),
    )
    expect(logger.info).toHaveBeenCalledWith(
      'qa_unit_tests_complete',
      expect.objectContaining({ stage: 'qa', event: 'unit_tests_complete', verdict: 'PASS' }),
    )
  })

  it('sets timedOut flag on timeout (AC-4)', async () => {
    const { EventEmitter } = require('events')
    const { spawn } = await import('child_process')

    // Simulates hang: close event fires only after kill, with timedOut=true via timeout
    vi.mocked(spawn).mockImplementation(() => {
      const stdoutEm = new EventEmitter()
      const stderrEm = new EventEmitter()
      const childEm = new EventEmitter()
      const child = {
        stdout: stdoutEm,
        stderr: stderrEm,
        on: childEm.on.bind(childEm),
        kill: vi.fn().mockImplementation(() => {
          // When killed, emit close after a tick
          setTimeout(() => childEm.emit('close', null), 0)
        }),
        killed: false,
      }
      // Never emits close naturally - only when killed
      return child as any
    })

    const { createRunUnitTestsNode } = await import('../run-unit-tests.js')
    const config = makeConfig({ testTimeoutMs: 100, testTimeoutRetries: 0 })
    const node = createRunUnitTestsNode(config as any)
    const state = makeState({ config: config as any })

    const resultPromise = node(state as any)
    // Advance past timeout (100ms) to trigger kill, then another tick for close
    await vi.advanceTimersByTimeAsync(200)
    const result = await resultPromise

    expect(result.unitTestVerdict).toBe('FAIL')
    expect(result.unitTestResult!.timedOut).toBe(true)
  })
})

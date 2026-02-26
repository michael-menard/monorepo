/**
 * Unit tests for poll-ci node
 * AC-6, AC-15, AC-20
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPollCiNode } from '../poll-ci.js'
import type { MergeGraphState, MergeGraphConfig } from '../../../graphs/merge.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

const makeConfig = (overrides: Partial<MergeGraphConfig> = {}): MergeGraphConfig => ({
  worktreeDir: '/tmp/worktree',
  storyBranch: 'story/APIP-1070',
  storyId: 'APIP-1070',
  storyTitle: 'Test Story',
  mainBranch: 'main',
  ciTimeoutMs: 5000, // Short timeout for tests
  ciPollIntervalMs: 100, // Short interval for tests
  ciPollMaxIntervalMs: 500,
  kbWriteBackEnabled: true,
  nodeTimeoutMs: 60000,
  featureDir: 'plans/future/platform/autonomous-pipeline',
  ...overrides,
})

const makeState = (overrides: Partial<MergeGraphState> = {}): MergeGraphState => ({
  storyId: 'APIP-1070',
  config: null,
  qaVerify: null,
  prNumber: 42,
  prUrl: 'https://github.com/repo/pull/42',
  mergeCommitSha: null,
  ciStatus: null,
  ciPollCount: 0,
  ciStartTime: Date.now(),
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

const makeChecks = (state: string, conclusion: string) =>
  JSON.stringify([{ name: 'ci-test', state, conclusion }])

const makePassedChecks = () =>
  JSON.stringify([{ name: 'ci-test', state: 'COMPLETED', conclusion: 'success' }])

const makeFailedChecks = () =>
  JSON.stringify([{ name: 'ci-test', state: 'COMPLETED', conclusion: 'failure' }])

const makeRunningChecks = () =>
  JSON.stringify([{ name: 'ci-test', state: 'IN_PROGRESS', conclusion: '' }])

describe('createPollCiNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns MERGE_FAIL when no prNumber in state', async () => {
    const ghRunner = vi.fn()
    const sleepFn = vi.fn()
    const node = createPollCiNode(makeConfig(), { ghRunner, sleepFn })
    const result = await node(makeState({ prNumber: null }))

    expect(result.mergeVerdict).toBe('MERGE_FAIL')
    expect(result.ciStatus).toBe('fail')
    expect(ghRunner).not.toHaveBeenCalled()
  })

  it('returns ciStatus: pass on first poll when all checks pass', async () => {
    const ghRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: makePassedChecks(),
      stderr: '',
    })
    const sleepFn = vi.fn().mockResolvedValue(undefined)
    const node = createPollCiNode(makeConfig(), { ghRunner, sleepFn })
    const result = await node(makeState())

    expect(result.ciStatus).toBe('pass')
    expect(result.ciPollCount).toBe(1)
    expect(result.mergeVerdict).toBeUndefined()
    expect(sleepFn).not.toHaveBeenCalled() // Pass on first poll, no sleep needed
  })

  it('returns ciStatus: pass after 3 polls', async () => {
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: makeRunningChecks(), stderr: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: makeRunningChecks(), stderr: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: makePassedChecks(), stderr: '' })

    const sleepFn = vi.fn().mockResolvedValue(undefined)
    const node = createPollCiNode(makeConfig(), { ghRunner, sleepFn })
    const result = await node(makeState())

    expect(result.ciStatus).toBe('pass')
    expect(result.ciPollCount).toBe(3)
    expect(sleepFn).toHaveBeenCalledTimes(2) // Sleep after poll 1 and 2
  })

  it('returns MERGE_FAIL when CI check conclusion is failure', async () => {
    const ghRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: makeFailedChecks(),
      stderr: '',
    })
    const sleepFn = vi.fn().mockResolvedValue(undefined)
    const node = createPollCiNode(makeConfig(), { ghRunner, sleepFn })
    const result = await node(makeState())

    expect(result.mergeVerdict).toBe('MERGE_FAIL')
    expect(result.ciStatus).toBe('fail')
    expect(result.ciPollCount).toBe(1)
  })

  it('returns MERGE_BLOCKED when CI polling times out', async () => {
    // Use very short timeout to trigger immediately
    const config = makeConfig({
      ciTimeoutMs: 50,
      ciPollIntervalMs: 10,
    })

    const ghRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: makeRunningChecks(),
      stderr: '',
    })
    const sleepFn = vi.fn().mockImplementation((ms) => {
      // Simulate time passing by advancing manually
      return Promise.resolve()
    })

    const node = createPollCiNode(config, { ghRunner, sleepFn })

    // Advance time inside the test
    const startTime = Date.now()
    // Use fake timers approach — since we can't easily fake Date.now()
    // We test timeout by having timeout very small and sleep consuming time
    let callCount = 0
    const slowSleepFn = vi.fn().mockImplementation(async () => {
      callCount++
      // After 2 sleeps, we've exceeded timeout
      if (callCount >= 2) {
        await new Promise(resolve => setTimeout(resolve, 100)) // Real sleep > timeout
      }
    })

    const result = await node(makeState())
    // At some point the timeout is exceeded
    expect(result.ciStatus).toBe('timeout')
    expect(result.mergeVerdict).toBe('MERGE_BLOCKED')
  })

  it('verifies exponential back-off schedule via injectable sleepFn', async () => {
    // 3 polls: running, running, pass
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: makeRunningChecks(), stderr: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: makeRunningChecks(), stderr: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: makePassedChecks(), stderr: '' })

    const sleepCalls: number[] = []
    const sleepFn = vi.fn().mockImplementation((ms: number) => {
      sleepCalls.push(ms)
      return Promise.resolve()
    })

    const config = makeConfig({ ciPollIntervalMs: 100, ciPollMaxIntervalMs: 1000 })
    const node = createPollCiNode(config, { ghRunner, sleepFn })
    await node(makeState())

    // Two sleeps should have happened (after poll 1 and poll 2)
    expect(sleepCalls).toHaveLength(2)
    // Second sleep should be larger (exponential back-off, roughly doubled with jitter)
    // First interval: ~100 * 2 * jitter (jitter is 0.9-1.1)
    // Second interval: ~200 * 2 * jitter (but capped at ciPollMaxIntervalMs)
    expect(sleepCalls[1]).toBeGreaterThan(sleepCalls[0])
  })

  it('increments ciPollCount on each poll', async () => {
    const ghRunner = vi.fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: makeRunningChecks(), stderr: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: makeRunningChecks(), stderr: '' })
      .mockResolvedValueOnce({ exitCode: 0, stdout: makePassedChecks(), stderr: '' })

    const sleepFn = vi.fn().mockResolvedValue(undefined)
    const node = createPollCiNode(makeConfig(), { ghRunner, sleepFn })
    const result = await node(makeState())

    expect(result.ciPollCount).toBe(3)
  })
})

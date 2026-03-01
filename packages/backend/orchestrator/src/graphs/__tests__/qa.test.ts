/**
 * Graph-level tests for QA graph (AC-13, AC-10, AC-11)
 *
 * 10 scenarios:
 * (a) preconditions BLOCKED - review FAIL
 * (b) preconditions BLOCKED - evidence null
 * (c) happy path PASS
 * (d) unit test FAIL
 * (e) AC verify FAIL
 * (f) E2E retry success (attempt 1 fail, attempt 2 success)
 * (g) E2E all attempts fail
 * (h) gate model failure BLOCKED
 * (i) enableE2e:false skips E2E
 * (j) graph.compile() succeeds
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Evidence } from '../../artifacts/evidence.js'
import type { Review } from '../../artifacts/review.js'
import type { ModelClient } from '../qa.js'

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

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('yaml', () => ({
  stringify: vi.fn().mockReturnValue('schema: 1\nstory_id: APIP-1060\n'),
}))

const makeEvidence = (): Evidence => ({
  schema: 2,
  story_id: 'APIP-1060',
  version: 1,
  timestamp: new Date().toISOString(),
  acceptance_criteria: [
    { ac_id: 'AC-1', ac_text: 'Unit tests pass', status: 'PASS', evidence_items: [] },
    { ac_id: 'AC-2', ac_text: 'E2E tests pass', status: 'PASS', evidence_items: [] },
  ],
  touched_files: [],
  commands_run: [],
  endpoints_exercised: [],
  notable_decisions: [],
  known_deviations: [],
})

const makePassReview = (): Review => ({
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
})

const makeFailReview = (): Review => ({
  ...makePassReview(),
  verdict: 'FAIL',
  total_errors: 3,
})

const makeConfig = (overrides = {}) => ({
  worktreeDir: '/tmp/worktree',
  storyId: 'APIP-1060',
  enableE2e: true,
  testFilter: '@repo/orchestrator',
  playwrightConfig: 'playwright.legacy.config.ts',
  playwrightProject: 'chromium-live',
  testTimeoutMs: 300000,
  testTimeoutRetries: 0,
  playwrightMaxRetries: 1,
  kbWriteBackEnabled: false,
  artifactBaseDir: 'plans/future/platform/autonomous-pipeline/in-progress',
  gateModel: 'claude-sonnet-4-5',
  nodeTimeoutMs: 60000,
  ...overrides,
})

function makeMockSpawn(exitCode: number, stdout = '', stderr = '') {
  const { EventEmitter } = require('events')
  return vi.fn(() => {
    const stdoutEm = new EventEmitter()
    const stderrEm = new EventEmitter()
    const childEm = new EventEmitter()
    const child = {
      stdout: stdoutEm,
      stderr: stderrEm,
      on: childEm.on.bind(childEm),
      kill: vi.fn(),
      killed: false,
    }
    setTimeout(() => {
      stdoutEm.emit('data', Buffer.from(stdout))
      stderrEm.emit('data', Buffer.from(stderr))
      childEm.emit('close', exitCode)
    }, 0)
    return child
  })
}

describe('QA graph', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('(j) graph.compile() succeeds without throwing (AC-10)', async () => {
    const { createQAGraph } = await import('../qa.js')
    const mockClient: ModelClient = { callModel: vi.fn() }
    const config = makeConfig()

    expect(() => createQAGraph(config as any, { modelClient: mockClient })).not.toThrow()
  })

  it('(a) preconditions BLOCKED when review is FAIL (AC-13)', async () => {
    const { runQA } = await import('../qa.js')
    const mockClient: ModelClient = { callModel: vi.fn() }
    const config = makeConfig()

    const resultPromise = runQA(makeEvidence(), makeFailReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.verdict).toBe('BLOCKED')
    expect(mockClient.callModel).not.toHaveBeenCalled()
  })

  it('(b) preconditions BLOCKED when evidence is null (AC-13)', async () => {
    const { runQA } = await import('../qa.js')
    const mockClient: ModelClient = { callModel: vi.fn() }
    const config = makeConfig()

    // Pass null evidence by casting
    const resultPromise = runQA(null as any, makePassReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.verdict).toBe('BLOCKED')
    expect(mockClient.callModel).not.toHaveBeenCalled()
  })

  it('(c) happy path PASS (AC-13, AC-11)', async () => {
    // Use real timers for full happy-path PASS: spawn mock fires at setTimeout(0),
    // model mocks resolve as microtasks — completes in <100ms real time
    vi.useRealTimers()

    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0, 'all tests pass'))

    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async prompt => {
        if (prompt.includes('gate decision')) {
          return JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'All good' })
        }
        return JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'OK' })
      }),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: false })

    const result = await runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })

    expect(result.verdict).toBe('PASS')
    expect(result.qaArtifact).not.toBeNull()
    expect(result.storyId).toBe('APIP-1060')
  }, 10000)

  it('(d) unit test FAIL propagates to final verdict (AC-13)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(1, '', 'tests failed'))

    const mockClient: ModelClient = {
      callModel: vi.fn().mockResolvedValue(
        JSON.stringify({ verdict: 'FAIL', blocking_issues: 'unit tests failed', reasoning: 'Tests failed' }),
      ),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: false })

    const resultPromise = runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.verdict).toBe('FAIL')
  })

  it('(e) AC verify FAIL results in FAIL verdict (AC-13)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0))

    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async prompt => {
        // verify-acs returns FAIL for each AC
        if (prompt.includes('ANTI-HALLUCINATION')) {
          return JSON.stringify({ status: 'FAIL', cited_evidence: null, reasoning: 'No evidence found' })
        }
        // gate-decision returns FAIL
        return JSON.stringify({ verdict: 'FAIL', blocking_issues: 'AC-1, AC-2', reasoning: 'ACs failed' })
      }),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: false })

    const resultPromise = runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.verdict).toBe('FAIL')
  })

  it('(f) E2E retry success: attempt 1 fail, attempt 2 succeed (AC-13)', async () => {
    // Use real timers: multiple spawn calls each fire at setTimeout(0),
    // model mocks resolve as microtasks — completes in <100ms real time
    vi.useRealTimers()

    const { spawn } = await import('child_process')
    let spawnCallCount = 0
    vi.mocked(spawn).mockImplementation(() => {
      spawnCallCount++
      // First spawn: unit tests pass; subsequent: e2e tests
      if (spawnCallCount === 1) {
        return makeMockSpawn(0)() as any // unit tests pass
      } else if (spawnCallCount === 2) {
        return makeMockSpawn(1)() as any // e2e attempt 1 fails
      } else {
        return makeMockSpawn(0)() as any // e2e attempt 2 passes
      }
    })

    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async prompt => {
        if (prompt.includes('ANTI-HALLUCINATION')) {
          return JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'OK' })
        }
        return JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'All good' })
      }),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: true, playwrightMaxRetries: 1 })

    const result = await runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })

    expect(result.verdict).toBe('PASS')
  }, 10000)

  it('(g) E2E all attempts fail results in FAIL (AC-13)', async () => {
    const { spawn } = await import('child_process')
    let callCount = 0
    vi.mocked(spawn).mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        return makeMockSpawn(0)() as any // unit tests pass
      }
      return makeMockSpawn(1)() as any // all e2e fail
    })

    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async prompt => {
        if (prompt.includes('ANTI-HALLUCINATION')) {
          return JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'OK' })
        }
        return JSON.stringify({ verdict: 'FAIL', blocking_issues: 'e2e failed', reasoning: 'E2E all failed' })
      }),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: true, playwrightMaxRetries: 1 })

    const resultPromise = runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.verdict).toBe('FAIL')
  })

  it('(h) gate model failure results in BLOCKED (AC-13)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0))

    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async prompt => {
        if (prompt.includes('ANTI-HALLUCINATION')) {
          return JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'OK' })
        }
        // gate model throws
        throw new Error('Gate model unavailable')
      }),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: false })

    const resultPromise = runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    expect(result.verdict).toBe('BLOCKED')
  })

  it('(i) enableE2e:false skips E2E node (AC-13)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0, 'unit tests pass'))

    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async prompt => {
        if (prompt.includes('ANTI-HALLUCINATION')) {
          return JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'OK' })
        }
        return JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'All good' })
      }),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: false })

    const resultPromise = runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    // Only 1 spawn call (unit tests), not 2 (unit + e2e)
    const { spawn: spawnMock } = await import('child_process')
    const spawnCallCount = vi.mocked(spawnMock).mock.calls.length
    expect(spawnCallCount).toBe(1)
    expect(result.verdict).toBe('PASS')
  })

  it('runQA() returns QAGraphResult with verdict and qaArtifact (AC-11)', async () => {
    const { spawn } = await import('child_process')
    vi.mocked(spawn).mockImplementation(makeMockSpawn(0))

    const mockClient: ModelClient = {
      callModel: vi.fn().mockImplementation(async prompt => {
        if (prompt.includes('ANTI-HALLUCINATION')) {
          return JSON.stringify({ status: 'PASS', cited_evidence: 'found', reasoning: 'OK' })
        }
        return JSON.stringify({ verdict: 'PASS', blocking_issues: 'none', reasoning: 'All good' })
      }),
    }

    const { runQA } = await import('../qa.js')
    const config = makeConfig({ enableE2e: false })

    const resultPromise = runQA(makeEvidence(), makePassReview(), config as any, { modelClient: mockClient })
    await vi.advanceTimersByTimeAsync(100)
    const result = await resultPromise

    // AC-11: runQA() returns QAGraphResult
    expect(result).toHaveProperty('storyId', 'APIP-1060')
    expect(result).toHaveProperty('verdict')
    expect(result).toHaveProperty('qaArtifact')
    expect(result).toHaveProperty('durationMs')
    expect(result).toHaveProperty('completedAt')
    expect(result).toHaveProperty('errors')
    expect(result).toHaveProperty('warnings')
  })
})

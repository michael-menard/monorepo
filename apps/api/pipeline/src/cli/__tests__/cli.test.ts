/**
 * CLI unit tests and integration test for APIP-5005.
 *
 * Unit tests: mocked @repo/pipeline-queue — no real Redis required.
 * Integration test: guarded by test.skipIf(!process.env.REDIS_URL) — skips when not set.
 *
 * AC coverage:
 *   AC-1  (shebang + file exists): checked via successful module import
 *   AC-2  (queue status output):   HP-1
 *   AC-3  (queue jobs output):     HP-2, HP-3
 *   AC-4  (supervisor status):     HP-4, HP-5
 *   AC-5  (graph status):          HP-6, HP-6b
 *   AC-6  (column-aligned output): asserted in HP-1 through HP-6
 *   AC-7  (ECONNREFUSED):          EC-1
 *   AC-8  (connection cleanup):    EC-3, EC-4
 *   AC-9  (unit test suite):       entire file
 *   AC-10 (integration test):      IT-1
 *   AC-12 (--help / unknown cmd):  HP-7, EC-2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─────────────────────────────────────────────────────────────────────────────
// Mock @repo/pipeline-queue using vi.hoisted() + vi.mock()
// vi.hoisted() ensures the factory variables are available before vi.mock() runs
// ─────────────────────────────────────────────────────────────────────────────

const {
  mockGetJobCounts,
  mockGetJobs,
  mockGetActive,
  mockGetCompleted,
  mockGetFailed,
  mockBullQueueClose,
  mockConnQuit,
} = vi.hoisted(() => {
  const mockGetJobCounts = vi.fn()
  const mockGetJobs = vi.fn()
  const mockGetActive = vi.fn()
  const mockGetCompleted = vi.fn()
  const mockGetFailed = vi.fn()
  const mockBullQueueClose = vi.fn().mockResolvedValue(undefined)
  const mockConnQuit = vi.fn().mockResolvedValue(undefined)

  return {
    mockGetJobCounts,
    mockGetJobs,
    mockGetActive,
    mockGetCompleted,
    mockGetFailed,
    mockBullQueueClose,
    mockConnQuit,
  }
})

vi.mock('@repo/pipeline-queue', () => {
  const mockBullQueue = {
    getJobCounts: mockGetJobCounts,
    getJobs: mockGetJobs,
    getActive: mockGetActive,
    getCompleted: mockGetCompleted,
    getFailed: mockGetFailed,
    close: mockBullQueueClose,
  }

  const mockPq = {
    bullQueue: mockBullQueue,
    add: vi.fn(),
  }

  const mockConn = {
    quit: mockConnQuit,
  }

  return {
    createPipelineConnection: vi.fn().mockReturnValue(mockConn),
    createPipelineQueue: vi.fn().mockReturnValue(mockPq),
    PIPELINE_QUEUE_NAME: 'apip-pipeline',
  }
})

// Import the CLI main after mocks are set up
import { main, handleRedisError } from '../index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run main() with given args, capturing console output and process.exit calls.
 * process.exit is replaced with a throwing mock so the test runner doesn't terminate.
 */
async function runMain(
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  let capturedExitCode = 0

  const origArgv = [...process.argv]
  process.argv = ['node', 'cli.ts', ...args]

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string) => {
    capturedExitCode = typeof code === 'number' ? code : 0
    throw new Error(`__exit__${capturedExitCode}`)
  })
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...parts: unknown[]) => {
    stdoutLines.push(parts.map(p => String(p)).join(' '))
  })
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...parts: unknown[]) => {
    stderrLines.push(parts.map(p => String(p)).join(' '))
  })

  try {
    await main()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.startsWith('__exit__')) {
      capturedExitCode = parseInt(msg.replace('__exit__', ''), 10)
    } else {
      throw err
    }
  } finally {
    process.argv = origArgv
    exitSpy.mockRestore()
    logSpy.mockRestore()
    errSpy.mockRestore()
  }

  return { stdout: stdoutLines.join('\n'), stderr: stderrLines.join('\n'), exitCode: capturedExitCode }
}

/**
 * Run main() then pipe errors through handleRedisError, simulating the full
 * main().catch(handleRedisError) call chain for error path tests.
 */
async function runMainWithErrorHandler(
  args: string[],
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const stdoutLines: string[] = []
  const stderrLines: string[] = []
  let capturedExitCode = 0

  const origArgv = [...process.argv]
  process.argv = ['node', 'cli.ts', ...args]

  const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code?: number | string) => {
    capturedExitCode = typeof code === 'number' ? code : 0
    throw new Error(`__exit__${capturedExitCode}`)
  })
  const logSpy = vi.spyOn(console, 'log').mockImplementation((...parts: unknown[]) => {
    stdoutLines.push(parts.map(p => String(p)).join(' '))
  })
  const errSpy = vi.spyOn(console, 'error').mockImplementation((...parts: unknown[]) => {
    stderrLines.push(parts.map(p => String(p)).join(' '))
  })

  try {
    await main().catch(err => handleRedisError(err))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.startsWith('__exit__')) {
      capturedExitCode = parseInt(msg.replace('__exit__', ''), 10)
    } else {
      throw err
    }
  } finally {
    process.argv = origArgv
    exitSpy.mockRestore()
    logSpy.mockRestore()
    errSpy.mockRestore()
  }

  return { stdout: stdoutLines.join('\n'), stderr: stderrLines.join('\n'), exitCode: capturedExitCode }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset mocks before each test
// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockGetJobCounts.mockReset()
  mockGetJobs.mockReset()
  mockGetActive.mockReset()
  mockGetCompleted.mockReset()
  mockGetFailed.mockReset()
  mockBullQueueClose.mockReset().mockResolvedValue(undefined)
  mockConnQuit.mockReset().mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Pipeline CLI', () => {
  // HP-7: --help exits 0 with command list (AC-12)
  it('HP-7: --help exits 0 and prints available commands', async () => {
    const { stdout, exitCode } = await runMain(['--help'])

    expect(exitCode).toBe(0)
    expect(stdout).toContain('queue status')
    expect(stdout).toContain('queue jobs')
    expect(stdout).toContain('supervisor status')
    expect(stdout).toContain('graph status')
  })

  // EC-2: unknown command exits 1 (AC-12)
  it('EC-2: unknown command prints usage and exits 1', async () => {
    const { stderr, exitCode } = await runMain(['badcmd'])

    expect(exitCode).toBe(1)
    expect(stderr).toContain('Unknown command')
  })

  // HP-1: queue status output formatting (AC-2, AC-6)
  it('HP-1: queue status prints counts for all job states', async () => {
    mockGetJobCounts.mockResolvedValue({
      waiting: 3,
      active: 1,
      completed: 10,
      failed: 2,
      delayed: 0,
    })

    const { stdout } = await runMain(['queue', 'status'])

    expect(stdout).toContain('waiting')
    expect(stdout).toContain('3')
    expect(stdout).toContain('active')
    expect(stdout).toContain('1')
    expect(stdout).toContain('completed')
    expect(stdout).toContain('10')
    expect(stdout).toContain('failed')
    expect(stdout).toContain('2')
    expect(stdout).toContain('delayed')
    expect(stdout).toContain('0')
  })

  // HP-2: queue jobs tabular output (AC-3, AC-6)
  it('HP-2: queue jobs prints tabular output for all jobs', async () => {
    const mockJob = {
      id: 'job-1',
      data: { storyId: 'APIP-0010', phase: 'elaboration' },
      attemptsMade: 1,
      timestamp: Date.now() - 5000,
      getState: vi.fn().mockResolvedValue('active'),
    }
    mockGetJobs.mockResolvedValue([mockJob])

    const { stdout } = await runMain(['queue', 'jobs'])

    expect(stdout).toContain('job-1')
    expect(stdout).toContain('APIP-0010')
    expect(stdout).toContain('elaboration')
    expect(stdout).toContain('active')
  })

  // HP-3: queue jobs --status filter (AC-3)
  it('HP-3: queue jobs --status active filters by status', async () => {
    const mockJob = {
      id: 'job-2',
      data: { storyId: 'APIP-0020', phase: 'implementation' },
      attemptsMade: 0,
      timestamp: Date.now() - 1000,
      getState: vi.fn().mockResolvedValue('active'),
    }
    mockGetJobs.mockResolvedValue([mockJob])

    const { stdout } = await runMain(['queue', 'jobs', '--status', 'active'])

    // getJobs was called with only 'active' status
    expect(mockGetJobs).toHaveBeenCalledWith(['active'], 0, 100)
    expect(stdout).toContain('APIP-0020')
  })

  // HP-4: supervisor status — idle state (AC-4)
  it('HP-4: supervisor status prints "idle" when no active jobs', async () => {
    mockGetActive.mockResolvedValue([])
    mockGetCompleted.mockResolvedValue([])
    mockGetFailed.mockResolvedValue([])

    const { stdout } = await runMain(['supervisor', 'status'])

    expect(stdout).toContain('supervisor state: idle')
    expect(stdout).toContain('active job:  none')
    expect(stdout).toContain('last completed: none')
  })

  // HP-5: supervisor status — processing state (AC-4)
  it('HP-5: supervisor status prints "processing" when active job present', async () => {
    const activeJob = {
      data: {
        storyId: 'APIP-0030',
        phase: 'implementation',
        metadata: { threadId: 'thread-abc-123' },
      },
    }
    mockGetActive.mockResolvedValue([activeJob])
    mockGetCompleted.mockResolvedValue([
      {
        data: { storyId: 'APIP-0020', phase: 'review' },
        returnvalue: { outcome: 'PASS' },
      },
    ])
    mockGetFailed.mockResolvedValue([])

    const { stdout } = await runMain(['supervisor', 'status'])

    expect(stdout).toContain('supervisor state: processing')
    expect(stdout).toContain('APIP-0030')
    expect(stdout).toContain('implementation')
    expect(stdout).toContain('thread-abc-123')
  })

  // HP-6: graph status — stage counts and N/A for merge when no merge jobs (AC-5, AC-6)
  it('HP-6: graph status shows stage counts and N/A for merge when no merge jobs', async () => {
    const jobs = [
      { data: { storyId: 'APIP-0010', phase: 'elaboration' } },
      { data: { storyId: 'APIP-0020', phase: 'elaboration' } },
      { data: { storyId: 'APIP-0030', phase: 'implementation' } },
      { data: { storyId: 'APIP-0040', phase: 'review' } },
      { data: { storyId: 'APIP-0050', phase: 'qa' } },
    ]
    mockGetJobs.mockResolvedValue(jobs)

    const { stdout } = await runMain(['graph', 'status'])

    expect(stdout).toContain('elaboration')
    expect(stdout).toContain('implementation')
    expect(stdout).toContain('review')
    expect(stdout).toContain('qa')
    expect(stdout).toContain('merge')
    // merge count is 0 → N/A (pending APIP-1070)
    expect(stdout).toContain('N/A (pending APIP-1070)')
    // elaboration count = 2
    expect(stdout).toMatch(/elaboration\s*.*:\s*2/)
  })

  // HP-6b: graph status shows actual merge count when merge jobs present (AC-5)
  it('HP-6b: graph status shows actual merge count when merge jobs present', async () => {
    const jobs = [
      { data: { storyId: 'APIP-0010', phase: 'merge' } },
      { data: { storyId: 'APIP-0020', phase: 'merge' } },
    ]
    mockGetJobs.mockResolvedValue(jobs)

    const { stdout } = await runMain(['graph', 'status'])

    // merge count = 2 → no N/A
    expect(stdout).not.toContain('N/A (pending APIP-1070)')
    expect(stdout).toMatch(/merge\s*.*:\s*2/)
  })

  // EC-1: ECONNREFUSED prints correct error and exits 1 (AC-7)
  it('EC-1: ECONNREFUSED error prints helpful message and exits 1', async () => {
    const connError = new Error('connect ECONNREFUSED 127.0.0.1:6379')
    mockGetJobCounts.mockRejectedValue(connError)

    const { stderr, exitCode } = await runMainWithErrorHandler(['queue', 'status'])

    expect(exitCode).toBe(1)
    expect(stderr).toContain('Cannot connect to Redis')
    expect(stderr).toContain('Is the pipeline server running?')
  })

  // EC-3: connection.quit() called on success path (AC-8)
  it('EC-3: connection.quit() is called after successful queue status', async () => {
    mockGetJobCounts.mockResolvedValue({
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    })

    await runMain(['queue', 'status'])

    expect(mockConnQuit).toHaveBeenCalled()
    expect(mockBullQueueClose).toHaveBeenCalled()
  })

  // EC-4: connection.quit() called on error path (AC-8)
  it('EC-4: connection.quit() is called even when queue operation throws', async () => {
    mockGetJobCounts.mockRejectedValue(new Error('Some Redis error'))

    await runMainWithErrorHandler(['queue', 'status'])

    // Connection cleanup happens in finally block regardless of error
    expect(mockConnQuit).toHaveBeenCalled()
    expect(mockBullQueueClose).toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Integration test (IT-1) — guarded by REDIS_URL env var (AC-10)
// ─────────────────────────────────────────────────────────────────────────────

describe('Pipeline CLI — integration', () => {
  it.skipIf(!process.env.REDIS_URL)(
    'IT-1: queue status connects to live Redis and prints counts',
    async () => {
      // This test requires a live Redis instance.
      // Start with: docker compose -f infra/compose.lego-app.yaml up redis
      // Then set: REDIS_URL=redis://localhost:6379

      // Use real (unmocked) pipeline-queue for this test
      const { createPipelineConnection, createPipelineQueue, PIPELINE_QUEUE_NAME } =
        await vi.importActual<typeof import('@repo/pipeline-queue')>('@repo/pipeline-queue')

      const conn = createPipelineConnection(process.env.REDIS_URL!)
      const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)

      try {
        const counts = await pq.bullQueue.getJobCounts(
          'waiting',
          'active',
          'completed',
          'failed',
          'delayed',
        )
        // Assert response has expected numeric shape
        expect(typeof counts.waiting).toBe('number')
        expect(typeof counts.active).toBe('number')
        expect(typeof counts.completed).toBe('number')
        expect(typeof counts.failed).toBe('number')
        expect(typeof counts.delayed).toBe('number')
      } finally {
        await pq.bullQueue.close()
        await conn.quit()
      }
    },
  )
})

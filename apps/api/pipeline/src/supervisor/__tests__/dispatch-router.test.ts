/**
 * Unit tests for dispatch-router.ts
 *
 * Covers all AC-10 scenarios:
 * AC-10a: Dispatch routing to correct graph by stage (HP-1, HP-2, HP-3)
 * AC-10b: Wall clock timeout fires → failed + log event (EC-1)
 * AC-10c: PERMANENT error classification → immediate fail (EC-2)
 * AC-10d: TRANSIENT error → retry path (EC-3)
 * AC-10e: Circuit open → delayed re-queue (EC-4)
 *
 * Also covers:
 * ED-2: start() idempotency
 * ED-3: Structured log fields on all lifecycle events
 * EC-5: Unknown stage → Zod validation error → immediate fail (tested in supervisor)
 */

import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest'
import type { Job } from 'bullmq'
import { ZodError } from 'zod'
import { dispatchJob, resetDispatcherState, type GraphRunners } from '../dispatch-router.js'
import { WallClockTimeoutError } from '../wall-clock-timeout.js'
import { PipelineSupervisorConfigSchema, type PipelineJobData } from '../__types__/index.js'
import { logger } from '@repo/logger'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const MockElaborationResult = {
  storyId: 'TEST-001',
  phase: 'complete',
  success: true,
  deltaDetectionResult: null,
  deltaReviewResult: null,
  escapeHatchResult: null,
  aggregatedFindings: null,
  updatedReadinessResult: null,
  previousReadinessScore: null,
  newReadinessScore: null,
  warnings: [],
  errors: [],
  durationMs: 100,
  completedAt: new Date().toISOString(),
}

const MockStoryCreationResult = {
  storyId: 'TEST-002',
  phase: 'complete',
  success: true,
  synthesizedStory: null,
  readinessScore: 95,
  hitlRequired: false,
  hitlDecision: 'approve',
  commitmentGateResult: null,
  warnings: [],
  errors: [],
  durationMs: 200,
  completedAt: new Date().toISOString(),
}

const mockSynthesizedStoryPayload = {
  storyId: 'TEST-001',
  title: 'Test Story',
  description: 'A test story for elaboration',
  domain: 'backend',
  synthesizedAt: new Date().toISOString(),
  acceptanceCriteria: [],
  readinessScore: 80,
  isReady: true,
}

const mockStoryRequestPayload = {
  title: 'New Feature',
  description: 'A new feature request',
  domain: 'backend',
  tags: [],
}

const defaultConfig = PipelineSupervisorConfigSchema.parse({
  queueName: 'pipeline-test',
  stageTimeoutMs: 10_000,
  circuitBreakerFailureThreshold: 3,
  circuitBreakerRecoveryTimeoutMs: 30_000,
})

/**
 * Create a mock BullMQ Job object.
 */
function createMockJob(id = 'job-001'): Job {
  return {
    id,
    data: {},
    moveToDelayed: vi.fn().mockResolvedValue(undefined),
    moveToFailed: vi.fn().mockResolvedValue(undefined),
  } as unknown as Job
}

/**
 * Create a valid elaboration job payload.
 */
function createElaborationJobData(
  overrides: Partial<PipelineJobData> = {},
): PipelineJobData {
  return {
    storyId: 'TEST-001',
    stage: 'elaboration',
    attemptNumber: 1,
    payload: mockSynthesizedStoryPayload,
    ...overrides,
  } as PipelineJobData
}

/**
 * Create a valid story-creation job payload.
 */
function createStoryCreationJobData(
  overrides: Partial<PipelineJobData> = {},
): PipelineJobData {
  return {
    storyId: 'TEST-002',
    stage: 'story-creation',
    attemptNumber: 1,
    payload: mockStoryRequestPayload,
    ...overrides,
  } as PipelineJobData
}

/**
 * Create injectable graph runners with mocks.
 */
function createMockRunners(overrides: Partial<GraphRunners> = {}): GraphRunners & {
  elaborationSpy: MockInstance
  storyCreationSpy: MockInstance
} {
  const elaborationSpy = vi.fn().mockResolvedValue(MockElaborationResult)
  const storyCreationSpy = vi.fn().mockResolvedValue(MockStoryCreationResult)

  return {
    runElaboration: elaborationSpy,
    runStoryCreation: storyCreationSpy,
    elaborationSpy,
    storyCreationSpy,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock @repo/logger
// vi.mock() is hoisted to the top of the file, so the factory must not reference
// variables declared below. Use vi.fn() inline in the factory.
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@repo/logger', async importOriginal => {
  const actual = await importOriginal<typeof import('@repo/logger')>()
  return {
    ...actual,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      fatal: vi.fn(),
      trace: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('dispatchJob', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetDispatcherState()
  })

  afterEach(() => {
    resetDispatcherState()
  })

  // ─── HP-1, AC-10a: Elaboration routing ───────────────────────────────────

  describe('HP-1: elaboration job routes to runElaboration()', () => {
    it('calls runElaboration() with SynthesizedStory payload', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      expect(runners.elaborationSpy).toHaveBeenCalledOnce()
      expect(runners.elaborationSpy).toHaveBeenCalledWith(
        mockSynthesizedStoryPayload,
        null,
        {},
      )
    })

    it('does NOT call runStoryCreation() for elaboration jobs', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      expect(runners.storyCreationSpy).not.toHaveBeenCalled()
    })

    it('logs completed event after successful elaboration', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      const completedCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'completed',
      )
      expect(completedCall).toBeDefined()
      expect(completedCall![1]).toMatchObject({
        event: 'completed',
        storyId: 'TEST-001',
        stage: 'elaboration',
      })
    })
  })

  // ─── HP-2, AC-10a: Story-creation routing ────────────────────────────────

  describe('HP-2: story-creation job routes to runStoryCreation()', () => {
    it('calls runStoryCreation() with StoryRequest payload', async () => {
      const job = createMockJob()
      const data = createStoryCreationJobData()
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      expect(runners.storyCreationSpy).toHaveBeenCalledOnce()
      expect(runners.storyCreationSpy).toHaveBeenCalledWith(
        mockStoryRequestPayload,
        null,
        {},
      )
    })

    it('does NOT call runElaboration() for story-creation jobs', async () => {
      const job = createMockJob()
      const data = createStoryCreationJobData()
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      expect(runners.elaborationSpy).not.toHaveBeenCalled()
    })

    it('logs completed event after successful story-creation', async () => {
      const job = createMockJob()
      const data = createStoryCreationJobData()
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      const completedCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'completed',
      )
      expect(completedCall).toBeDefined()
      expect(completedCall![1]).toMatchObject({
        event: 'completed',
        storyId: 'TEST-002',
        stage: 'story-creation',
      })
    })
  })

  // ─── HP-3, AC-3: Thread ID convention ────────────────────────────────────

  describe('HP-3: Thread ID convention {storyId}:{stage}:{attemptNumber}', () => {
    it('derives threadId as {storyId}:{stage}:{attemptNumber} on job_received', async () => {
      const job = createMockJob()
      const data = createElaborationJobData({
        storyId: 'APIP-001',
        stage: 'elaboration',
        attemptNumber: 2,
      } as Partial<PipelineJobData>)
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      const receivedCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'job_received',
      )
      expect(receivedCall).toBeDefined()
      expect(receivedCall![1]).toMatchObject({
        threadId: 'APIP-001:elaboration:2',
      })
    })

    it('threadId is present on dispatching event', async () => {
      const job = createMockJob()
      const data = createElaborationJobData({
        storyId: 'APIP-001',
        stage: 'elaboration',
        attemptNumber: 1,
      } as Partial<PipelineJobData>)
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      const dispatchingCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'dispatching',
      )
      expect(dispatchingCall).toBeDefined()
      expect(dispatchingCall![1]).toMatchObject({
        threadId: 'APIP-001:elaboration:1',
      })
    })
  })

  // ─── EC-1, AC-10b: Wall clock timeout ────────────────────────────────────

  describe('EC-1: Wall clock timeout → wall_clock_timeout failure', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('throws with wall_clock_timeout reason when graph hangs', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const hangingRunner = vi.fn().mockImplementation(
        () => new Promise<never>(() => { /* hang forever */ }),
      )
      const runners: GraphRunners = {
        runElaboration: hangingRunner,
        runStoryCreation: vi.fn(),
      }

      const timeoutConfig = PipelineSupervisorConfigSchema.parse({
        ...defaultConfig,
        stageTimeoutMs: 100,
      })

      const dispatchPromise = dispatchJob(job, data, timeoutConfig, runners)
      vi.advanceTimersByTime(200)

      await expect(dispatchPromise).rejects.toThrow('wall_clock_timeout')
    })

    it('logs timeout event with threadId', async () => {
      const job = createMockJob()
      const data = createElaborationJobData({
        storyId: 'APIP-001',
        attemptNumber: 1,
      } as Partial<PipelineJobData>)
      const hangingRunner = vi.fn().mockImplementation(
        () => new Promise<never>(() => { /* hang */ }),
      )
      const runners: GraphRunners = {
        runElaboration: hangingRunner,
        runStoryCreation: vi.fn(),
      }

      const timeoutConfig = PipelineSupervisorConfigSchema.parse({
        ...defaultConfig,
        stageTimeoutMs: 100,
      })

      const dispatchPromise = dispatchJob(job, data, timeoutConfig, runners)
      vi.advanceTimersByTime(200)

      await expect(dispatchPromise).rejects.toThrow()

      const timeoutCall = vi.mocked(logger).error.mock.calls.find(
        call => call[0] === 'timeout',
      )
      expect(timeoutCall).toBeDefined()
      expect(timeoutCall![1]).toMatchObject({
        event: 'timeout',
        storyId: 'APIP-001',
        threadId: 'APIP-001:elaboration:1',
      })
    })
  })

  // ─── EC-2, AC-10c: PERMANENT error → immediate fail ──────────────────────

  describe('EC-2: PERMANENT error → immediate fail, no retry', () => {
    it('throws a TypeError (PERMANENT) without retry', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const permanentError = new TypeError('Invalid config — permanent')
      const runners: GraphRunners = {
        runElaboration: vi.fn().mockRejectedValue(permanentError),
        runStoryCreation: vi.fn(),
      }

      await expect(dispatchJob(job, data, defaultConfig, runners)).rejects.toThrow(
        'Invalid config — permanent',
      )
    })

    it('logs failed event with errorCategory for PERMANENT error', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const permanentError = new TypeError('Validation failed')
      const runners: GraphRunners = {
        runElaboration: vi.fn().mockRejectedValue(permanentError),
        runStoryCreation: vi.fn(),
      }

      await dispatchJob(job, data, defaultConfig, runners).catch(() => { /* expected */ })

      const failedCall = vi.mocked(logger).error.mock.calls.find(call => call[0] === 'failed')
      expect(failedCall).toBeDefined()
      expect(failedCall![1]).toMatchObject({
        event: 'failed',
        errorCategory: 'programming',
        retryable: false,
      })
    })

    it('logs failed event for ZodError (PERMANENT validation)', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'undefined',
          path: ['storyId'],
          message: 'Required',
        },
      ])
      const runners: GraphRunners = {
        runElaboration: vi.fn().mockRejectedValue(zodError),
        runStoryCreation: vi.fn(),
      }

      await dispatchJob(job, data, defaultConfig, runners).catch(() => { /* expected */ })

      const failedCall = vi.mocked(logger).error.mock.calls.find(call => call[0] === 'failed')
      expect(failedCall).toBeDefined()
      expect(failedCall![1]).toMatchObject({
        event: 'failed',
        errorCategory: 'validation',
        retryable: false,
      })
    })
  })

  // ─── EC-3, AC-10d: TRANSIENT error → retry ───────────────────────────────

  describe('EC-3: TRANSIENT error → propagates for BullMQ retry', () => {
    it('re-throws network error (TRANSIENT) for BullMQ retry', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const transientError = new Error('ECONNREFUSED: Redis connection refused')
      const runners: GraphRunners = {
        runElaboration: vi.fn().mockRejectedValue(transientError),
        runStoryCreation: vi.fn(),
      }

      await expect(dispatchJob(job, data, defaultConfig, runners)).rejects.toThrow(
        'ECONNREFUSED',
      )
    })

    it('logs failed event with retryable: true for TRANSIENT error', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const transientError = new Error('fetch failed: network error')
      const runners: GraphRunners = {
        runElaboration: vi.fn().mockRejectedValue(transientError),
        runStoryCreation: vi.fn(),
      }

      await dispatchJob(job, data, defaultConfig, runners).catch(() => { /* expected */ })

      const failedCall = vi.mocked(logger).error.mock.calls.find(call => call[0] === 'failed')
      expect(failedCall).toBeDefined()
      expect(failedCall![1]).toMatchObject({
        event: 'failed',
        retryable: true,
      })
    })
  })

  // ─── EC-4, AC-10e: Circuit open → delayed re-queue ───────────────────────

  describe('EC-4: Circuit open → re-queued as delayed', () => {
    it('calls job.moveToDelayed() when circuit is OPEN', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const runners = createMockRunners()

      // Use a config with failureThreshold: 1 so we can trip quickly
      const lowThresholdConfig = PipelineSupervisorConfigSchema.parse({
        ...defaultConfig,
        circuitBreakerFailureThreshold: 1,
      })

      // First dispatch — fail to trip the circuit
      const permanentError = new TypeError('Trip circuit')
      runners.elaborationSpy.mockRejectedValueOnce(permanentError)
      await dispatchJob(job, data, lowThresholdConfig, runners).catch(() => { /* trip */ })

      // Reset mocks for second dispatch
      vi.clearAllMocks()
      const job2 = createMockJob('job-002')

      // Circuit should now be OPEN — dispatch should NOT call graph
      await dispatchJob(job2, data, lowThresholdConfig, runners)

      expect(runners.elaborationSpy).not.toHaveBeenCalled()
      expect(job2.moveToDelayed).toHaveBeenCalledOnce()
    })

    it('logs circuit_open event when circuit is OPEN', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const runners = createMockRunners()

      const lowThresholdConfig = PipelineSupervisorConfigSchema.parse({
        ...defaultConfig,
        circuitBreakerFailureThreshold: 1,
      })

      // Trip circuit
      runners.elaborationSpy.mockRejectedValueOnce(new TypeError('Trip'))
      await dispatchJob(job, data, lowThresholdConfig, runners).catch(() => { /* trip */ })

      vi.clearAllMocks()
      const job2 = createMockJob('job-002')
      await dispatchJob(job2, data, lowThresholdConfig, runners)

      const circuitCall = vi.mocked(logger).warn.mock.calls.find(call => call[0] === 'circuit_open')
      expect(circuitCall).toBeDefined()
      expect(circuitCall![1]).toMatchObject({
        event: 'circuit_open',
        storyId: data.storyId,
        stage: 'elaboration',
      })
    })
  })

  // ─── AC-15: Two-catch pattern ─────────────────────────────────────────────

  describe('AC-15: WallClockTimeoutError caught before error classification', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('WallClockTimeoutError bypasses isRetryableNodeError() — throws wall_clock_timeout not network error', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const hangingRunner = vi.fn().mockImplementation(
        () => new Promise<never>(() => { /* hang */ }),
      )
      const runners: GraphRunners = {
        runElaboration: hangingRunner,
        runStoryCreation: vi.fn(),
      }

      const timeoutConfig = PipelineSupervisorConfigSchema.parse({
        ...defaultConfig,
        stageTimeoutMs: 100,
      })

      const dispatchPromise = dispatchJob(job, data, timeoutConfig, runners)
      vi.advanceTimersByTime(200)

      // Should throw wall_clock_timeout, NOT be retried as TRANSIENT
      const error = await dispatchPromise.catch(e => e)
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toContain('wall_clock_timeout')
      // Must NOT log 'failed' event (that's for classified errors)
      const failedCall = vi.mocked(logger).error.mock.calls.find(call => call[0] === 'failed')
      expect(failedCall).toBeUndefined()
      // Must log 'timeout' event
      const timeoutCall = vi.mocked(logger).error.mock.calls.find(call => call[0] === 'timeout')
      expect(timeoutCall).toBeDefined()
    })
  })

  // ─── ED-3: Structured log fields ─────────────────────────────────────────

  describe('ED-3: Structured log fields present on all lifecycle events', () => {
    it('all lifecycle log calls include storyId, stage, threadId, attemptNumber', async () => {
      const job = createMockJob()
      const data = createElaborationJobData({
        storyId: 'APIP-001',
        stage: 'elaboration',
        attemptNumber: 3,
      } as Partial<PipelineJobData>)
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      const requiredFields = ['storyId', 'stage', 'threadId', 'attemptNumber']

      // Check all info calls (job_received, dispatching, completed)
      for (const call of vi.mocked(logger).info.mock.calls) {
        if (call[1] && typeof call[1] === 'object' && 'event' in call[1]) {
          for (const field of requiredFields) {
            expect(call[1]).toHaveProperty(field)
          }
        }
      }
    })

    it('completed event includes durationMs', async () => {
      const job = createMockJob()
      const data = createElaborationJobData()
      const runners = createMockRunners()

      await dispatchJob(job, data, defaultConfig, runners)

      const completedCall = vi.mocked(logger).info.mock.calls.find(
        call => call[0] === 'completed',
      )
      expect(completedCall![1]).toHaveProperty('durationMs')
      expect(typeof completedCall![1].durationMs).toBe('number')
    })
  })
})

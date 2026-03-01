import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import { createMockBullMQJob } from '../__fixtures__/bullmq-job.js'
import { createSupervisorStateFixture } from '../__fixtures__/supervisor-state.js'
import { createMockBullMQWorker } from '../__mocks__/bullmq-worker.js'
import { createMockQueue } from '../__mocks__/bullmq-queue.js'
import {
  PipelineJobDataSchema,
  PipelinePhaseSchema,
} from '../__types__/pipeline-job.js'
import {
  PipelineSupervisorConfigSchema,
  SupervisorStateSchema,
} from '../__types__/supervisor-state.js'

// ---------------------------------------------------------------------------
// Minimal stub supervisor that mimics the PipelineSupervisor interface.
// No real Redis, no real LangGraph, no LLM calls.
// ---------------------------------------------------------------------------

type PipelineJobData = z.infer<typeof PipelineJobDataSchema>
type SupervisorState = z.infer<typeof SupervisorStateSchema>

const KNOWN_PHASES = new Set(PipelinePhaseSchema.options)

class StubPipelineSupervisor {
  private worker = createMockBullMQWorker()
  private queue = createMockQueue()
  private state: SupervisorState

  constructor(config?: Partial<z.infer<typeof PipelineSupervisorConfigSchema>>) {
    const parsedConfig = PipelineSupervisorConfigSchema.parse(config ?? {})
    this.state = createSupervisorStateFixture({ status: 'idle', config: parsedConfig })
  }

  /** Returns the underlying mock worker (for assertion). */
  getWorker() {
    return this.worker
  }

  /** Returns the underlying mock queue (for assertion). */
  getQueue() {
    return this.queue
  }

  /** Transitions supervisor to 'processing' and registers worker event handlers. */
  start(): void {
    this.state = { ...this.state, status: 'processing', startedAt: new Date().toISOString() }
    this.worker.on('completed', vi.fn())
    this.worker.on('failed', vi.fn())
    this.worker.on('progress', vi.fn())
  }

  /** Stops the supervisor and closes the worker/queue. */
  async stop(): Promise<void> {
    this.state = { ...this.state, status: 'stopped' }
    await this.worker.close()
    await this.queue.close()
  }

  /**
   * Processes a single pipeline job through the supervisor.
   *
   * Returns the terminal state after processing.
   * Unknown job phases are recorded as errors without throwing.
   */
  processJob(jobData: PipelineJobData): SupervisorState {
    this.state = { ...this.state, currentJobId: `job-${jobData.storyId}` }

    if (!KNOWN_PHASES.has(jobData.phase)) {
      this.state = {
        ...this.state,
        status: 'error',
        errorCount: this.state.errorCount + 1,
        currentJobId: null,
      }
      return this.state
    }

    this.state = {
      ...this.state,
      status: 'completed',
      processedCount: this.state.processedCount + 1,
      currentJobId: null,
      lastProcessedAt: new Date().toISOString(),
    }
    return this.state
  }

  /** Returns a snapshot of the current supervisor state. */
  getState(): SupervisorState {
    return { ...this.state }
  }
}

// ---------------------------------------------------------------------------
// Tests: fixture factories
// ---------------------------------------------------------------------------

describe('createMockBullMQJob', () => {
  it('returns a valid PipelineJobData with defaults', () => {
    const job = createMockBullMQJob()
    expect(job.storyId).toBe('APIP-0001')
    expect(job.phase).toBe('elaboration')
    expect(job.priority).toBe(1)
    expect(job.metadata).toEqual({})
  })

  it('applies partial overrides while preserving unchanged defaults', () => {
    const job = createMockBullMQJob({ storyId: 'APIP-9999', phase: 'review' })
    expect(job.storyId).toBe('APIP-9999')
    expect(job.phase).toBe('review')
    expect(job.priority).toBe(1)
  })

  it('validates the returned object against PipelineJobDataSchema', () => {
    const job = createMockBullMQJob()
    expect(() => PipelineJobDataSchema.parse(job)).not.toThrow()
  })

  it('throws when an invalid phase is supplied via overrides', () => {
    expect(() =>
      createMockBullMQJob({ phase: 'not-a-phase' as z.infer<typeof PipelinePhaseSchema> }),
    ).toThrow()
  })
})

describe('createSupervisorStateFixture', () => {
  it('returns a valid SupervisorState with defaults', () => {
    const state = createSupervisorStateFixture()
    expect(state.status).toBe('idle')
    expect(state.processedCount).toBe(0)
    expect(state.errorCount).toBe(0)
    expect(state.currentJobId).toBeNull()
  })

  it('applies partial overrides', () => {
    const state = createSupervisorStateFixture({ status: 'processing', processedCount: 5 })
    expect(state.status).toBe('processing')
    expect(state.processedCount).toBe(5)
  })

  it('validates the returned object against SupervisorStateSchema', () => {
    const state = createSupervisorStateFixture()
    expect(() => SupervisorStateSchema.parse(state)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Tests: mock factories
// ---------------------------------------------------------------------------

describe('createMockBullMQWorker', () => {
  it('returns an object with vi.fn() stubs for on and close', () => {
    const worker = createMockBullMQWorker()
    expect(typeof worker.on).toBe('function')
    expect(typeof worker.close).toBe('function')
  })

  it('records calls made to on()', () => {
    const worker = createMockBullMQWorker()
    const handler = vi.fn()
    worker.on('completed', handler)
    expect(worker.on).toHaveBeenCalledWith('completed', handler)
  })
})

describe('createMockQueue', () => {
  it('returns an object with vi.fn() stubs for all queue methods', () => {
    const queue = createMockQueue()
    expect(typeof queue.add).toBe('function')
    expect(typeof queue.getJob).toBe('function')
    expect(typeof queue.pause).toBe('function')
    expect(typeof queue.resume).toBe('function')
    expect(typeof queue.close).toBe('function')
  })

  it('records calls made to add()', () => {
    const queue = createMockQueue()
    queue.add('pipeline', { storyId: 'APIP-1', phase: 'elaboration' })
    expect(queue.add).toHaveBeenCalledWith('pipeline', {
      storyId: 'APIP-1',
      phase: 'elaboration',
    })
  })
})

// ---------------------------------------------------------------------------
// Tests: StubPipelineSupervisor integration
// ---------------------------------------------------------------------------

describe('StubPipelineSupervisor', () => {
  let supervisor: StubPipelineSupervisor

  beforeEach(() => {
    supervisor = new StubPipelineSupervisor({ queueName: 'test-pipeline' })
  })

  it('starts in idle state', () => {
    expect(supervisor.getState().status).toBe('idle')
  })

  it('transitions to processing after start()', () => {
    supervisor.start()
    expect(supervisor.getState().status).toBe('processing')
    expect(supervisor.getState().startedAt).not.toBeNull()
  })

  it('registers three event handlers on the worker during start()', () => {
    supervisor.start()
    const worker = supervisor.getWorker()
    expect(worker.on).toHaveBeenCalledTimes(3)
    expect(worker.on).toHaveBeenCalledWith('completed', expect.any(Function))
    expect(worker.on).toHaveBeenCalledWith('failed', expect.any(Function))
    expect(worker.on).toHaveBeenCalledWith('progress', expect.any(Function))
  })

  it('processes a valid job to completed state', () => {
    supervisor.start()
    const job = createMockBullMQJob({ storyId: 'APIP-1234', phase: 'implementation' })
    const finalState = supervisor.processJob(job)
    expect(finalState.status).toBe('completed')
    expect(finalState.processedCount).toBe(1)
    expect(finalState.currentJobId).toBeNull()
    expect(finalState.lastProcessedAt).not.toBeNull()
  })

  it('handles unknown job phase gracefully without throwing', () => {
    supervisor.start()
    const job = createMockBullMQJob()
    // Forcibly bypass Zod validation to simulate a corrupted job from the queue
    const corruptJob = { ...job, phase: 'unknown-phase' } as unknown as z.infer<
      typeof PipelineJobDataSchema
    >
    const finalState = supervisor.processJob(corruptJob)
    expect(finalState.status).toBe('error')
    expect(finalState.errorCount).toBe(1)
    expect(finalState.currentJobId).toBeNull()
  })

  it('increments processedCount for each successfully processed job', () => {
    supervisor.start()
    supervisor.processJob(createMockBullMQJob({ phase: 'elaboration' }))
    supervisor.processJob(createMockBullMQJob({ phase: 'review' }))
    expect(supervisor.getState().processedCount).toBe(2)
  })

  it('stops gracefully and closes worker and queue', async () => {
    supervisor.start()
    await supervisor.stop()
    expect(supervisor.getState().status).toBe('stopped')
    expect(supervisor.getWorker().close).toHaveBeenCalledTimes(1)
    expect(supervisor.getQueue().close).toHaveBeenCalledTimes(1)
  })

  it('processes jobs across all known phases without error', () => {
    supervisor.start()
    const phases = PipelinePhaseSchema.options
    for (const phase of phases) {
      supervisor.processJob(createMockBullMQJob({ phase }))
    }
    expect(supervisor.getState().processedCount).toBe(phases.length)
    expect(supervisor.getState().errorCount).toBe(0)
  })
})

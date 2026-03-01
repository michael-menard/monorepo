/**
 * PipelineSupervisor — orchestrates concurrent story execution via BullMQ.
 *
 * AC-2: BullMQ Worker initialized with concurrency: config.maxWorktrees.
 * AC-3: Each story runs in an isolated git worktree.
 * AC-4: ConcurrencyController manages slot accounting.
 * AC-5/AC-6: WorktreeConflictDetector enforces conflictPolicy: 'reject'.
 * AC-8: Per-worktree NodeCircuitBreaker isolation.
 * AC-9: Non-blocking worktree cleanup with slot release in finally.
 *
 * @module supervisor
 */

import { Worker, Queue } from 'bullmq'
import type { Job } from 'bullmq'
import { z } from 'zod'
import { logger } from '@repo/logger'
import {
  ConcurrencyConfigSchema,
  DEFAULT_CONCURRENCY_CONFIG,
  type ConcurrencyConfig,
  type ConcurrencyConfigInput,
} from './__types__/concurrency-config.js'
import { ConcurrencyController } from './concurrency/concurrency-controller.js'
import { generateWorktreePath } from './concurrency/worktree-path.js'
import { createWorktree, removeWorktree } from './worktree-lifecycle.js'
import {
  WorktreeConflictDetector,
  type StoryConflictDescriptor,
} from '../conflicts/worktree-conflict-detector.js'

// ============================================================================
// BullMQ Job Payload
// ============================================================================

/**
 * Schema for a pipeline job payload.
 * storyId: identifies the story being processed.
 * touchedPathPrefixes: file path prefixes touched by this story (for conflict detection).
 */
export const PipelineJobDataSchema = z.object({
  storyId: z.string().min(1),
  touchedPathPrefixes: z.array(z.string().min(1)).default([]),
})

export type PipelineJobData = z.infer<typeof PipelineJobDataSchema>

// ============================================================================
// Supervisor Configuration
// ============================================================================

/**
 * Schema for PipelineSupervisor configuration.
 */
export const PipelineSupervisorConfigSchema = z.object({
  /** BullMQ Redis connection options */
  redis: z.object({
    host: z.string().default('localhost'),
    port: z.number().int().default(6379),
    password: z.string().optional(),
  }),
  /** Absolute path to the git repository root for worktree creation */
  repoRoot: z.string().min(1),
  /** BullMQ queue name */
  queueName: z.string().default('pipeline'),
  /** Concurrency configuration */
  concurrency: ConcurrencyConfigSchema.default(DEFAULT_CONCURRENCY_CONFIG),
})

export type PipelineSupervisorConfig = z.infer<typeof PipelineSupervisorConfigSchema>
export type PipelineSupervisorConfigInput = z.input<typeof PipelineSupervisorConfigSchema>

// ============================================================================
// Types
// ============================================================================

/**
 * Callback type for story processing.
 * Receives storyId and worktreePath; returns when processing completes.
 */
export type StoryProcessor = (storyId: string, worktreePath: string) => Promise<void>

// ============================================================================
// PipelineSupervisor
// ============================================================================

/**
 * PipelineSupervisor manages BullMQ-based parallel story execution.
 *
 * - Creates a BullMQ Worker with concurrency: config.maxWorktrees
 * - Dispatches each job into an isolated git worktree
 * - Enforces slot limits and conflict detection
 * - Cleans up worktrees non-blocking after each story
 */
export class PipelineSupervisor {
  private readonly config: PipelineSupervisorConfig
  private readonly concurrencyController: ConcurrencyController
  private readonly conflictDetector: WorktreeConflictDetector
  /** Side map: storyId → touchedPathPrefixes for conflict detection of active slots */
  private readonly activePathPrefixes = new Map<string, string[]>()
  private worker: Worker | null = null
  private queue: Queue | null = null

  constructor(configInput: PipelineSupervisorConfigInput) {
    this.config = PipelineSupervisorConfigSchema.parse(configInput)
    this.concurrencyController = new ConcurrencyController(this.config.concurrency)
    this.conflictDetector = new WorktreeConflictDetector()
  }

  /**
   * Starts the supervisor, creating the BullMQ Worker.
   *
   * AC-2: Worker concurrency is set to config.maxWorktrees.
   *
   * @param storyProcessor - Callback invoked for each story job
   */
  start(storyProcessor: StoryProcessor): void {
    const connection = {
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
    }

    this.queue = new Queue(this.config.queueName, { connection })

    // AC-2: BullMQ Worker initialized with concurrency: config.maxWorktrees
    this.worker = new Worker(
      this.config.queueName,
      job => this.processJob(job, storyProcessor),
      {
        connection,
        concurrency: this.config.concurrency.maxWorktrees,
      },
    )

    this.worker.on('error', error => {
      logger.error('PipelineSupervisor worker error', { error })
    })

    logger.info('PipelineSupervisor started', {
      queueName: this.config.queueName,
      maxWorktrees: this.config.concurrency.maxWorktrees,
      conflictPolicy: this.config.concurrency.conflictPolicy,
    })
  }

  /**
   * Stops the supervisor gracefully.
   */
  async stop(): Promise<void> {
    if (this.worker) {
      await this.worker.close()
      this.worker = null
    }
    if (this.queue) {
      await this.queue.close()
      this.queue = null
    }
    logger.info('PipelineSupervisor stopped')
  }

  /**
   * Returns the underlying BullMQ Queue for enqueuing jobs.
   * Throws if the supervisor has not been started.
   */
  getQueue(): Queue {
    if (!this.queue) {
      throw new Error('PipelineSupervisor has not been started. Call start() first.')
    }
    return this.queue
  }

  /**
   * Returns the ConcurrencyController (for testing and observability).
   */
  getConcurrencyController(): ConcurrencyController {
    return this.concurrencyController
  }

  // ============================================================================
  // Internal: Job Processing
  // ============================================================================

  /**
   * Processes a single pipeline job.
   *
   * Enforces slot saturation (AC-4, gap-2: delayed 5s on saturation).
   * Enforces conflict detection (AC-5/AC-6, gap-2: delayed 30s on conflict).
   * Creates worktree, invokes storyProcessor, removes worktree non-blocking (AC-9).
   */
  private async processJob(
    job: Job<PipelineJobData>,
    storyProcessor: StoryProcessor,
  ): Promise<void> {
    const jobData = PipelineJobDataSchema.parse(job.data)
    const { storyId, touchedPathPrefixes } = jobData

    logger.info('Processing pipeline job', { storyId, jobId: job.id })

    // ---- Step 1: Slot saturation check (AC-4) ----
    // Pre-generate worktree path (timestamp suffix prevents stale collisions - ED-3)
    const worktreePath = generateWorktreePath(this.config.repoRoot, storyId)

    if (!this.concurrencyController.tryAcquireSlot(storyId, worktreePath)) {
      // gap-2: moveToDelayed(Date.now() + 5000) for slot saturation
      logger.info('Slot saturation: delaying job', {
        storyId,
        jobId: job.id,
        activeSlots: this.concurrencyController.activeSlots(),
        maxWorktrees: this.concurrencyController.getMaxWorktrees(),
        delayMs: 5000,
      })
      await job.moveToDelayed(Date.now() + 5000)
      return
    }

    // Register path prefixes for conflict detection of subsequent jobs
    this.activePathPrefixes.set(storyId, touchedPathPrefixes)

    // Slot acquired — must release in finally
    try {
      // ---- Step 2: Conflict detection (AC-5/AC-6) ----
      const incoming: StoryConflictDescriptor = { storyId, touchedPathPrefixes }
      const activeDescriptors = this.buildActiveConflictDescriptors(storyId)
      const conflictingIds = this.conflictDetector.checkConflict(incoming, activeDescriptors)

      if (conflictingIds.length > 0) {
        // AC-6: conflictPolicy 'reject' → nack + requeue with delay (gap-2: 30s)
        logger.warn('Conflict detected: delaying job', {
          storyId,
          jobId: job.id,
          conflictingIds,
          delayMs: 30000,
        })
        // Release the slot and path prefix registration before delaying
        this.concurrencyController.releaseSlot(storyId)
        this.activePathPrefixes.delete(storyId)
        await job.moveToDelayed(Date.now() + 30000)
        return
      }

      // ---- Step 3: Circuit breaker check (AC-8) ----
      const slot = this.concurrencyController.getSlot(storyId)
      if (!slot) {
        throw new Error(`Slot not found for storyId: ${storyId}`)
      }

      if (!slot.breaker.canExecute()) {
        logger.warn('Circuit breaker open: delaying job', {
          storyId,
          jobId: job.id,
          breakerStatus: slot.breaker.getStatus(),
          delayMs: 30000,
        })
        this.concurrencyController.releaseSlot(storyId)
        this.activePathPrefixes.delete(storyId)
        await job.moveToDelayed(Date.now() + 30000)
        return
      }

      // ---- Step 4: Create worktree (AC-3) ----
      await createWorktree(this.config.repoRoot, worktreePath, storyId)

      // ---- Step 5: Execute story processing ----
      try {
        await storyProcessor(storyId, worktreePath)
        slot.breaker.recordSuccess()
        logger.info('Story processing complete', { storyId, worktreePath })
      } catch (processingError) {
        slot.breaker.recordFailure()
        logger.error('Story processing failed', { storyId, worktreePath, error: processingError })
        throw processingError
      }
    } finally {
      // AC-9: Non-blocking cleanup — slot release always happens in finally (WINT-1150 pattern)
      const finalSlot = this.concurrencyController.getSlot(storyId)
      if (finalSlot) {
        // removeWorktree handles its own try/catch and never re-throws (AC-9)
        await removeWorktree(this.config.repoRoot, finalSlot.worktreePath, storyId)
        this.concurrencyController.releaseSlot(storyId)
      }
      this.activePathPrefixes.delete(storyId)
    }
  }

  /**
   * Builds StoryConflictDescriptor array from currently active slots.
   * Excludes the current storyId (which just acquired its slot).
   */
  private buildActiveConflictDescriptors(excludeStoryId: string): StoryConflictDescriptor[] {
    const activeSlots = this.concurrencyController.getActiveSlots()
    const descriptors: StoryConflictDescriptor[] = []

    for (const [storyId] of activeSlots) {
      if (storyId !== excludeStoryId) {
        descriptors.push({
          storyId,
          touchedPathPrefixes: this.activePathPrefixes.get(storyId) ?? [],
        })
      }
    }

    return descriptors
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates a new ConcurrencyConfig with provided overrides.
 * Useful for tests that need custom maxWorktrees settings.
 */
export function createConcurrencyConfig(input: ConcurrencyConfigInput = {}): ConcurrencyConfig {
  return ConcurrencyConfigSchema.parse(input)
}

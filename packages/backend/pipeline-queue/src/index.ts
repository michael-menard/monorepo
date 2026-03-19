/**
 * Pipeline Queue Package
 *
 * Provides BullMQ-based work queue infrastructure for the autonomous pipeline (APIP).
 * Exports: PIPELINE_QUEUE_NAME, createPipelineConnection, createPipelineQueue,
 * PipelineJobDataSchema, PipelineJobData
 */

import { Queue } from 'bullmq'
import type { ConnectionOptions, JobsOptions } from 'bullmq'
import { Redis } from 'ioredis'
import { logger } from '@repo/logger'
import { PipelineJobDataSchema } from './__types__/index.js'
import type { PipelineJobData } from './__types__/index.js'

export { PipelineJobDataSchema } from './__types__/index.js'
export type {
  PipelineJobData,
  PipelinePhase,
  StorySnapshotPayload,
  ReviewPayload,
  QaPayload,
  ElaborationJobData,
  StoryCreationJobData,
  ImplementationJobData,
  ReviewJobData,
  QaJobData,
} from './__types__/index.js'
export {
  StorySnapshotPayloadSchema,
  ReviewPayloadSchema,
  QaPayloadSchema,
  ElaborationJobDataSchema,
  StoryCreationJobDataSchema,
  ImplementationJobDataSchema,
  ReviewJobDataSchema,
  QaJobDataSchema,
} from './__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

/**
 * The canonical name for the autonomous pipeline BullMQ queue.
 *
 * This is a stable contract — downstream workers (APIP-0020+) reference this
 * constant to subscribe to the same queue. Do NOT change after first deployment.
 */
export const PIPELINE_QUEUE_NAME = 'apip-pipeline'

// ─────────────────────────────────────────────────────────────────────────
// Connection Factory
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create a dedicated IORedis connection for BullMQ.
 *
 * Design decisions (AC-4):
 * - No lazyConnect: connection is established eagerly for Lambda cold-start safety
 * - No singleton: callers own the connection lifecycle (BullMQ manages 2 connections
 *   per Queue instance internally — do not share connections between Queue/Worker)
 * - enableOfflineQueue: false — commands fail fast if Redis is unavailable rather
 *   than queuing indefinitely in memory
 *
 * @param redisUrl - Full Redis URL (e.g. redis://localhost:6379)
 * @returns Configured IORedis instance (cast as ConnectionOptions for BullMQ compatibility)
 */
export function createPipelineConnection(redisUrl: string): Redis {
  const connection = new Redis(redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: null, // Required by BullMQ — disables per-request retry cap
    connectTimeout: 5000,
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000)
      logger.info('Pipeline Redis connection retry', { attempt: times, delayMs: delay })
      return delay
    },
  })

  connection.on('connect', () => {
    logger.info('Pipeline Redis connected')
  })

  connection.on('ready', () => {
    logger.info('Pipeline Redis ready')
  })

  connection.on('error', (error: Error) => {
    logger.error('Pipeline Redis error', { error: error.message })
  })

  connection.on('close', () => {
    logger.info('Pipeline Redis connection closed')
  })

  connection.on('reconnecting', () => {
    logger.info('Pipeline Redis reconnecting')
  })

  return connection
}

// ─────────────────────────────────────────────────────────────────────────
// Queue Factory
// ─────────────────────────────────────────────────────────────────────────

/**
 * Queue wrapper that validates job data before enqueue.
 *
 * Wraps BullMQ Queue with a type-safe `add` method that Zod-parses
 * PipelineJobData at enqueue time, ensuring the queue never accepts
 * invalid payloads.
 */
export interface PipelineQueue {
  /** Enqueue a pipeline job. Throws ZodError if data is invalid. */
  add(name: string, data: PipelineJobData, opts?: JobsOptions): ReturnType<Queue['add']>
  /** Access the underlying BullMQ Queue for advanced operations. */
  readonly bullQueue: Queue
}

/**
 * Create a BullMQ Queue for the autonomous pipeline.
 *
 * Design decisions (AC-3, AC-5):
 * - defaultJobOptions: 3 attempts with exponential backoff (initial delay 1000ms)
 * - Zod-parses job data at enqueue time (AC-3)
 * - queueName defaults to PIPELINE_QUEUE_NAME for stable contract (AC-5)
 *
 * @param connection - IORedis connection (created via createPipelineConnection)
 * @param queueName  - Queue name; defaults to PIPELINE_QUEUE_NAME
 * @returns PipelineQueue wrapper with validated add method
 */
export function createPipelineQueue(
  connection: ConnectionOptions,
  queueName: string = PIPELINE_QUEUE_NAME,
): PipelineQueue {
  const bullQueue = new Queue(queueName, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  })

  return {
    bullQueue,
    add(name: string, data: PipelineJobData, opts?: JobsOptions) {
      // Validate payload before enqueue — ensures queue contract is never violated
      const parsed = PipelineJobDataSchema.parse(data)
      logger.info('Enqueuing pipeline job', {
        queueName,
        jobName: name,
        storyId: parsed.storyId,
        stage: parsed.stage,
      })
      return bullQueue.add(name, parsed, opts)
    },
  }
}

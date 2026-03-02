/**
 * Pipeline Test Fixtures
 *
 * Provides typed Playwright test fixtures for pipeline E2E tests:
 *   - queueClient: BullMQ Queue connected to local Redis (pipeline-e2e queue)
 *   - queueEvents: BullMQ QueueEvents for job completion signaling (separate Redis connection)
 *   - pipelineStateReader: Polls BullMQ job status + reads YAML artifacts
 *   - syntheticStory: Pre-built SyntheticTestStory fixture
 *
 * Teardown (after each test worker):
 *   - Closes both Redis connections
 *   - Removes synthetic story feature directory
 *   - Removes BullMQ test job if not cleanly completed
 *   - Teardown failures are @repo/logger warnings — never throw
 *
 * Usage:
 * ```typescript
 * import { test, expect } from '../fixtures/pipeline.fixture'
 *
 * test('pipeline test', async ({ queueClient, syntheticStory }) => {
 *   const job = await queueClient.add(syntheticStory.storyId, { storyId: syntheticStory.storyId })
 *   expect(job.id).toBeTruthy()
 * })
 * ```
 */

import { test as base, expect } from '@playwright/test'
import { Queue, QueueEvents } from 'bullmq'
import * as fs from 'fs/promises'
import * as path from 'path'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { syntheticTestStory } from './synthetic-story.ts'
import { pollJobCompletion } from '../helpers/job-poller.ts'
import type { SyntheticTestStory } from './synthetic-story.ts'
import type { JobTerminalState } from '../helpers/job-poller.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline State Reader Schema (Zod-first)
// ─────────────────────────────────────────────────────────────────────────────

export const PipelineStateReaderSchema = z.object({
  storyDir: z.string(),
  queueName: z.string(),
})

export type PipelineStateReaderConfig = z.infer<typeof PipelineStateReaderSchema>

/**
 * Utility for polling BullMQ job status and reading YAML artifacts
 * from the story feature directory.
 */
export type PipelineStateReader = {
  /** Poll BullMQ job until terminal state (completed or failed) */
  pollJobCompletion: (queue: Queue, jobId: string, maxWaitMs: number) => Promise<JobTerminalState>
  /** Get the absolute path to the story's implementation directory */
  storyDir: string
  /** Get the BullMQ job state */
  getJobState: (queue: Queue, jobId: string) => Promise<string | null>
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixture Types (Zod-first approach — type from schema below)
// ─────────────────────────────────────────────────────────────────────────────

export const PipelineTestFixturesSchema = z.object({
  /** Queue name for the pipeline E2E BullMQ queue */
  queueName: z.string().default('pipeline-e2e'),
  /** Redis URL from environment */
  redisUrl: z.string().default('redis://localhost:6379'),
  /** Base directory for synthetic story artifacts */
  testStoryFeatureDir: z.string().default('plans/future/platform/autonomous-pipeline/e2e-fixtures'),
})

export type PipelineTestFixturesConfig = z.infer<typeof PipelineTestFixturesSchema>

export type PipelineTestFixtures = {
  /** BullMQ Queue client connected to Redis — for enqueuing jobs and checking status */
  queueClient: Queue
  /** BullMQ QueueEvents client — separate Redis connection for completion signaling */
  queueEvents: QueueEvents
  /** Pipeline state reader utility */
  pipelineStateReader: PipelineStateReader
  /** Pre-built synthetic test story fixture */
  syntheticStory: SyntheticTestStory
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis Connection Configuration
// ─────────────────────────────────────────────────────────────────────────────

function getRedisConnection() {
  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  const url = new URL(redisUrl)
  return {
    host: url.hostname,
    port: parseInt(url.port || '6379', 10),
    password: url.password || undefined,
    db: parseInt(url.pathname.replace('/', '') || '0', 10),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Teardown helpers (failures must be warnings, never throws)
// ─────────────────────────────────────────────────────────────────────────────

async function safeCloseQueue(queue: Queue): Promise<void> {
  try {
    await queue.close()
    logger.info('[PipelineFixture] Queue client closed', { name: queue.name })
  } catch (err) {
    logger.warn('[PipelineFixture] Failed to close queue client', {
      name: queue.name,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function safeCloseQueueEvents(queueEvents: QueueEvents): Promise<void> {
  try {
    await queueEvents.close()
    logger.info('[PipelineFixture] QueueEvents client closed')
  } catch (err) {
    logger.warn('[PipelineFixture] Failed to close QueueEvents client', {
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function safeRemoveStoryDir(storyDir: string): Promise<void> {
  try {
    await fs.rm(storyDir, { recursive: true, force: true })
    logger.info('[PipelineFixture] Synthetic story directory removed', { storyDir })
  } catch (err) {
    logger.warn('[PipelineFixture] Failed to remove synthetic story directory', {
      storyDir,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

async function safeRemoveBullMQJob(queue: Queue, jobId: string | undefined): Promise<void> {
  if (!jobId) return
  try {
    const job = await queue.getJob(jobId)
    if (job) {
      const state = await job.getState()
      if (state !== 'completed') {
        await job.remove()
        logger.info('[PipelineFixture] Removed incomplete BullMQ job', { jobId, state })
      } else {
        logger.info('[PipelineFixture] BullMQ job completed cleanly — not removing', { jobId })
      }
    }
  } catch (err) {
    logger.warn('[PipelineFixture] Failed to remove BullMQ job', {
      jobId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures using test.extend<PipelineTestFixtures>()
// ─────────────────────────────────────────────────────────────────────────────

export const test = base.extend<PipelineTestFixtures>({
  queueClient: async (_unused, use) => {
    const connection = getRedisConnection()
    const queue = new Queue('pipeline-e2e', { connection })

    logger.info('[PipelineFixture] Queue client created', {
      name: 'pipeline-e2e',
      host: connection.host,
      port: connection.port,
    })

    await use(queue)

    await safeCloseQueue(queue)
  },

  queueEvents: async (_unused, use) => {
    // BullMQ requires a SEPARATE Redis connection for QueueEvents
    const connection = getRedisConnection()
    const queueEvents = new QueueEvents('pipeline-e2e', { connection })

    logger.info('[PipelineFixture] QueueEvents client created', {
      name: 'pipeline-e2e',
    })

    await use(queueEvents)

    await safeCloseQueueEvents(queueEvents)
  },

  pipelineStateReader: async (_unused, use) => {
    const baseDir = process.env.TEST_STORY_FEATURE_DIR ?? 'plans/future/platform/autonomous-pipeline/e2e-fixtures'
    const storyDir = path.join(baseDir, syntheticTestStory.storyId)

    const reader: PipelineStateReader = {
      pollJobCompletion,
      storyDir,
      getJobState: async (queue: Queue, jobId: string): Promise<string | null> => {
        const job = await queue.getJob(jobId)
        if (!job) return null
        return job.getState()
      },
    }

    await use(reader)
  },

  syntheticStory: async (_unused, use) => {
    const storyDir = path.join(
      process.env.TEST_STORY_FEATURE_DIR ?? 'plans/future/platform/autonomous-pipeline/e2e-fixtures',
      syntheticTestStory.storyId,
    )

    // Create story directory for test run
    try {
      await fs.mkdir(storyDir, { recursive: true })
      logger.info('[PipelineFixture] Synthetic story directory created', { storyDir })
    } catch (err) {
      logger.warn('[PipelineFixture] Failed to create synthetic story directory', {
        storyDir,
        error: err instanceof Error ? err.message : String(err),
      })
    }

    await use(syntheticTestStory)

    // Teardown: remove synthetic story feature directory
    await safeRemoveStoryDir(storyDir)
  },
})

export { expect }

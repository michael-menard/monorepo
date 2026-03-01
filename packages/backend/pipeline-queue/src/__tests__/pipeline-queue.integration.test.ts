/**
 * Pipeline Queue Integration Tests (AC-8)
 *
 * These tests require a live Redis instance. They are automatically skipped
 * when REDIS_URL is not set, so they never fail in CI environments without Redis.
 *
 * To run locally:
 *   REDIS_URL=redis://localhost:6379 pnpm test --filter @repo/pipeline-queue
 */

import { describe, it, expect, afterEach } from 'vitest'
import { Worker } from 'bullmq'
import {
  PIPELINE_QUEUE_NAME,
  createPipelineConnection,
  createPipelineQueue,
  PipelineJobDataSchema,
} from '../index.js'
import type { PipelineJobData } from '../index.js'

const skipIntegration = !process.env['REDIS_URL']
const redisUrl = process.env['REDIS_URL'] ?? 'redis://localhost:6379'

describe.skipIf(skipIntegration)('Pipeline Queue Integration (requires REDIS_URL)', () => {
  // Track connections for cleanup
  const connections: ReturnType<typeof createPipelineConnection>[] = []

  afterEach(async () => {
    for (const conn of connections) {
      await conn.quit().catch(() => {})
    }
    connections.length = 0
  })

  it('enqueues a job and worker dequeues it with valid PipelineJobData (AC-8)', async () => {
    const queueConnection = createPipelineConnection(redisUrl)
    const workerConnection = createPipelineConnection(redisUrl)
    connections.push(queueConnection, workerConnection)

    const pq = createPipelineQueue(queueConnection, `${PIPELINE_QUEUE_NAME}-integration-test`)
    const bull = pq.bullQueue

    // Drain any leftover jobs
    await bull.drain()

    const jobPayload: PipelineJobData = {
      storyId: 'APIP-0010-integration',
      phase: 'elaboration',
      metadata: { test: true },
    }

    // Enqueue job
    const job = await pq.add('run-phase', jobPayload)
    expect(job.id).toBeDefined()

    // Verify job is waiting
    const waitingCount = await bull.getWaitingCount()
    expect(waitingCount).toBeGreaterThanOrEqual(1)

    // Dequeue via Worker and validate payload
    await new Promise<void>((resolve, reject) => {
      const worker = new Worker<PipelineJobData>(
        `${PIPELINE_QUEUE_NAME}-integration-test`,
        async workerJob => {
          try {
            const parsed = PipelineJobDataSchema.parse(workerJob.data)
            expect(parsed.storyId).toBe('APIP-0010-integration')
            expect(parsed.phase).toBe('elaboration')
            expect(parsed.metadata).toEqual({ test: true })
            resolve()
          } catch (err) {
            reject(err)
          } finally {
            await worker.close()
          }
        },
        { connection: workerConnection },
      )

      worker.on('failed', (_job, err) => reject(err))

      // Timeout guard
      setTimeout(() => {
        worker.close().catch(() => {})
        reject(new Error('Worker did not process job within timeout'))
      }, 10000)
    })

    // Clean up
    await bull.close()
  })

  it('respects Zod validation — invalid payloads are rejected before enqueue', async () => {
    const queueConnection = createPipelineConnection(redisUrl)
    connections.push(queueConnection)

    const pq = createPipelineQueue(queueConnection, `${PIPELINE_QUEUE_NAME}-validation-test`)

    await expect(
      pq.add('run-phase', { storyId: '', phase: 'elaboration' }),
    ).rejects.toThrow()

    await pq.bullQueue.close()
  })
})

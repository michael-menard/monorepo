/**
 * Queue Integration Tests
 *
 * Requires Redis running at localhost:6379.
 * Tests job lifecycle: add → status transitions → completion/failure.
 * Uses a test-specific queue prefix to avoid colliding with real queues.
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { Queue, Worker, type Job } from 'bullmq'
import Redis from 'ioredis'

const TEST_PREFIX = 'test-scrape'
const QUEUE_NAME = `${TEST_PREFIX}-integration`

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}

let redis: Redis
let queue: Queue
let worker: Worker | null = null

beforeAll(async () => {
  redis = new Redis(redisConnection)
  // Verify Redis is reachable
  const pong = await redis.ping()
  if (pong !== 'PONG') throw new Error('Redis not available')

  queue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'fixed', delay: 100 },
      removeOnComplete: 10,
      removeOnFail: 10,
    },
  })
})

afterEach(async () => {
  if (worker) {
    await worker.close()
    worker = null
  }
  // Drain all jobs
  await queue.drain()
  await queue.clean(0, 0, 'completed')
  await queue.clean(0, 0, 'failed')
})

afterAll(async () => {
  await queue.close()
  // Clean up test keys
  const keys = await redis.keys(`bull:${TEST_PREFIX}:*`)
  if (keys.length > 0) {
    await redis.del(...keys)
  }
  await redis.quit()
})

describe('BullMQ Queue Integration', () => {
  it('adds a job and retrieves it', async () => {
    const job = await queue.add('scrape', { itemNumber: 'cas002', itemType: 'M' })

    expect(job.id).toBeTruthy()
    expect(job.data.itemNumber).toBe('cas002')

    const retrieved = await queue.getJob(job.id!)
    expect(retrieved).toBeTruthy()
    expect(retrieved!.data.itemNumber).toBe('cas002')
  })

  it('worker picks up job and completes it', async () => {
    const completed = new Promise<Job>((resolve) => {
      worker = new Worker(
        QUEUE_NAME,
        async job => {
          return { success: true, item: job.data.itemNumber }
        },
        { connection: redisConnection, concurrency: 1 },
      )
      worker.on('completed', job => resolve(job))
    })

    await queue.add('scrape', { itemNumber: 'sw0001' })

    const job = await completed
    expect(job.data.itemNumber).toBe('sw0001')
    expect(job.returnvalue).toEqual({ success: true, item: 'sw0001' })
  })

  it('failed job has error reason and correct attempt count', async () => {
    const failed = new Promise<{ job: Job; error: Error }>((resolve) => {
      worker = new Worker(
        QUEUE_NAME,
        async () => {
          throw new Error('Scrape failed: page not found')
        },
        { connection: redisConnection, concurrency: 1 },
      )
      worker.on('failed', (job, error) => {
        // Wait until max attempts exhausted
        if (job && job.attemptsMade >= 2) {
          resolve({ job, error })
        }
      })
    })

    await queue.add('scrape', { itemNumber: 'bad-item' })

    const { job, error } = await failed
    expect(error.message).toBe('Scrape failed: page not found')
    expect(job.attemptsMade).toBe(2)
  })

  it('paused queue does not process jobs', async () => {
    let processed = false

    worker = new Worker(
      QUEUE_NAME,
      async () => {
        processed = true
        return { success: true }
      },
      { connection: redisConnection, concurrency: 1 },
    )

    await queue.pause()
    await queue.add('scrape', { itemNumber: 'paused-item' })

    // Wait a bit to ensure worker would have picked it up if queue wasn't paused
    await new Promise(r => setTimeout(r, 500))
    expect(processed).toBe(false)

    // Resume and verify it processes
    const completed = new Promise<void>(resolve => {
      worker!.on('completed', () => resolve())
    })
    await queue.resume()
    await completed
    expect(processed).toBe(true)
  })

  it('job counts are accurate', async () => {
    await queue.add('scrape', { itemNumber: 'item-1' })
    await queue.add('scrape', { itemNumber: 'item-2' })
    await queue.add('scrape', { itemNumber: 'item-3' })

    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed')
    expect(counts.waiting).toBe(3)
    expect(counts.active).toBe(0)
  })

  it.skip('rate limiter throttles job processing — requires long-running test', { timeout: 30000 }, async () => {
    const rateLimitedQueue = new Queue(`${TEST_PREFIX}-rate-limited`, {
      connection: redisConnection,
    })

    const processedTimes: number[] = []

    const rateLimitedWorker = new Worker(
      `${TEST_PREFIX}-rate-limited`,
      async () => {
        processedTimes.push(Date.now())
        return { success: true }
      },
      {
        connection: redisConnection,
        concurrency: 1,
        limiter: { max: 2, duration: 1000 }, // 2 per second
      },
    )

    // Add 4 jobs
    await rateLimitedQueue.add('scrape', { n: 1 })
    await rateLimitedQueue.add('scrape', { n: 2 })
    await rateLimitedQueue.add('scrape', { n: 3 })
    await rateLimitedQueue.add('scrape', { n: 4 })

    // Wait for all to process
    await new Promise<void>(resolve => {
      let count = 0
      rateLimitedWorker.on('completed', () => {
        count++
        if (count >= 4) resolve()
      })
    })

    // Should have taken at least 1 second total (2 per second × 4 jobs = 2 seconds min)
    const elapsed = processedTimes[processedTimes.length - 1] - processedTimes[0]
    expect(elapsed).toBeGreaterThanOrEqual(800) // allow some tolerance

    await rateLimitedWorker.close()
    await rateLimitedQueue.drain()
    await rateLimitedQueue.close()
    const keys = await redis.keys(`bull:${TEST_PREFIX}:rate-limited:*`)
    if (keys.length > 0) await redis.del(...keys)
  })
})

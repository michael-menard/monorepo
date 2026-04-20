/**
 * Scrape Queue Worker — Entry Point
 *
 * Connects to Redis, creates BullMQ queues and workers,
 * and processes scrape jobs across all scraper types.
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { Worker } from 'bullmq'
import Redis from 'ioredis'
import { logger } from '@repo/logger'
import { createQueues, QUEUE_NAMES } from './queues.js'
import { CircuitBreaker } from './circuit-breaker.js'
import {
  processBricklinkMinifig,
  shutdownBrowser,
  type ScrapeResult,
} from './workers/bricklink-minifig.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '../../../..')
config({ path: resolve(rootDir, '.env.local') })
config({ path: resolve(rootDir, '.env') })

// ──────────��────────────────────────────��─────────────────────────────────
// Redis Connection
// ─────────────────────────────────────────────────────────────────────────

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}

const redis = new Redis(redisConnection)

redis.on('connect', () => logger.info('[worker] Connected to Redis'))
redis.on('error', err => logger.error('[worker] Redis error', err))

// ───��───────────────────────────────────────────────────��─────────────────
// Queues + Circuit Breaker
// ────────────────────��──────────────────────────────────���─────────────────

const queues = createQueues(redisConnection)
const circuitBreaker = new CircuitBreaker(redis)

// ────────────────────��────────────────────────────────���───────────────────
// Workers
// ───────────────────────────────────────────────────��─────────────────────

function createWorkers() {
  const workers: Worker[] = []

  // BrickLink Minifig Worker
  const bricklinkMinifigWorker = new Worker(
    QUEUE_NAMES.BRICKLINK_MINIFIG,
    async job => {
      logger.info(`[worker] Processing ${job.name} — ${job.data.itemNumber}`, {
        jobId: job.id,
        attempt: job.attemptsMade + 1,
      })

      const result: ScrapeResult = await processBricklinkMinifig(job.data)

      if (result.rateLimited) {
        // Parse cooldown from hint or use default (30 min)
        let cooldownMs = 30 * 60 * 1000
        if (result.resetHint) {
          const match = result.resetHint.match(/(\d+)\s*(minutes?|hours?)/)
          if (match) {
            const value = parseInt(match[1], 10)
            const unit = match[2].startsWith('hour') ? 60 : 1
            cooldownMs = value * unit * 60 * 1000
          }
        }

        await circuitBreaker.trip(
          queues.bricklinkMinifig,
          `Rate limited on ${result.itemNumber}: ${result.resetHint || 'unknown'}`,
          cooldownMs,
        )

        // Throw to trigger BullMQ retry after circuit breaker clears
        throw new Error(`Rate limited — circuit breaker tripped for ${cooldownMs / 60000} minutes`)
      }

      if (!result.success) {
        throw new Error(result.error || 'Unknown scrape error')
      }

      return result
    },
    {
      connection: redisConnection,
      concurrency: 1,
    },
  )

  bricklinkMinifigWorker.on('completed', job => {
    logger.info(`[worker] Completed ${job.data.itemNumber}`, { jobId: job.id })
  })

  bricklinkMinifigWorker.on('failed', (job, err) => {
    logger.error(`[worker] Failed ${job?.data?.itemNumber}`, {
      jobId: job?.id,
      error: err.message,
      attempt: job?.attemptsMade,
    })
  })

  workers.push(bricklinkMinifigWorker)

  // TODO: Phase 2 — add workers for remaining queue types

  return workers
}

// ──────────���─────────────────────────────────���────────────────────────────
// Startup
// ──���──────────────────────────────��──────────────────────��────────────────

const workers = createWorkers()

logger.info('[worker] Scrape queue worker started', {
  queues: Object.values(QUEUE_NAMES),
  activeWorkers: workers.map(w => w.name),
})

// ���──────────────────────────────────────────────────��─────────────────────
// Graceful Shutdown
// ───��───────────────────────────────────────────��─────────────────────────

async function shutdown(signal: string) {
  logger.info(`[worker] Received ${signal}, shutting down...`)

  // Close workers (waits for current job to finish)
  await Promise.all(workers.map(w => w.close()))

  // Close browser
  await shutdownBrowser()

  // Close circuit breaker timers
  circuitBreaker.destroy()

  // Close queues
  for (const queue of Object.values(queues)) {
    await queue.close()
  }

  // Close Redis
  await redis.quit()

  logger.info('[worker] Shutdown complete')
  process.exit(0)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

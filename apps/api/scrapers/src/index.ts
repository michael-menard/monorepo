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
import { scraperEvents } from './events.js'
import { processBricklinkMinifig, type ScrapeResult } from './workers/bricklink-minifig.js'
import { processBricklinkCatalog } from './workers/bricklink-catalog.js'
import { processBricklinkPrices } from './workers/bricklink-prices.js'
import { shutdownBrowser, setNavigationBlockHandler } from './workers/shared-browser.js'
import { processLegoSet } from './workers/lego-set.js'
import { processRebrickableSet } from './workers/rebrickable-set.js'
import { processRebrickableMocs } from './workers/rebrickable-mocs.js'
import { processRebrickableMocSingle } from './workers/rebrickable-moc-single.js'

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
const circuitBreaker = new CircuitBreaker(redis, {
  onReset: queueName => {
    scraperEvents.circuitBreakerReset(queueName)
  },
})

// ── Navigation block handler (ERR_ABORTED circuit breaker) ───────────────

const BRICKLINK_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

setNavigationBlockHandler(async () => {
  const reason = 'BrickLink blocking navigation (consecutive ERR_ABORTED errors)'
  const resumesAt = new Date(Date.now() + BRICKLINK_COOLDOWN_MS).toISOString()

  // Pause all BrickLink queues
  const blQueues = [queues.bricklinkMinifig, queues.bricklinkCatalog, queues.bricklinkPrices]
  for (const q of blQueues) {
    await circuitBreaker.trip(q, reason, BRICKLINK_COOLDOWN_MS)
    await scraperEvents.circuitBreakerTripped(q.name, reason, resumesAt)
  }
})

// ───────────────────────────────────────────────────────────────────────
// Workers
// ───────────────────────────────────────────────────────────────────────

/**
 * Handle rate-limited results from any scraper.
 * Trips the circuit breaker and throws to trigger BullMQ retry.
 */
async function handleRateLimit(
  queue: ReturnType<typeof createQueues>[keyof ReturnType<typeof createQueues>],
  result: { rateLimited?: boolean; resetHint?: string; itemNumber?: string },
  label: string,
) {
  if (!result.rateLimited) return

  let cooldownMs = 30 * 60 * 1000
  if (result.resetHint) {
    const match = result.resetHint.match(/(\d+)\s*(minutes?|hours?)/)
    if (match) {
      const value = parseInt(match[1], 10)
      const unit = match[2].startsWith('hour') ? 60 : 1
      cooldownMs = value * unit * 60 * 1000
    }
  }

  const reason = `Rate limited on ${label}: ${result.resetHint || 'unknown'}`
  const resumesAt = new Date(Date.now() + cooldownMs).toISOString()

  await circuitBreaker.trip(queue, reason, cooldownMs)
  await scraperEvents.circuitBreakerTripped(queue.name, reason, resumesAt)

  throw new Error(`Rate limited — circuit breaker tripped for ${cooldownMs / 60000} minutes`)
}

function createWorkers() {
  const workers: Worker[] = []

  // ── BrickLink Minifig ──────────────────────────────────────────────────

  const bricklinkMinifigWorker = new Worker(
    QUEUE_NAMES.BRICKLINK_MINIFIG,
    async job => {
      logger.info(`[worker:minifig] Processing ${job.data.itemNumber} (${job.data.itemType})`, {
        jobId: job.id,
      })
      const result = await processBricklinkMinifig(job.data)
      await handleRateLimit(queues.bricklinkMinifig, result, result.itemNumber)
      if (!result.success) throw new Error(result.error || 'Scrape failed')

      if (job.data.itemType === 'S' && result.minifigs?.length) {
        // Set scrape completed — enqueue minifig jobs for each discovered minifig
        let enqueued = 0
        for (const mf of result.minifigs) {
          await queues.bricklinkMinifig.add(
            'scrape',
            {
              itemNumber: mf.minifigNumber,
              itemType: 'M' as const,
              wishlist: false,
              parentJobId: job.id,
            },
            { jobId: `${job.id}-${mf.minifigNumber}` },
          )
          enqueued++
        }
        logger.info(
          `[worker:minifig] Set ${job.data.itemNumber}: enqueued ${enqueued} minifig jobs`,
        )

        // Cross-enqueue rebrickable set scrape if not already scraped
        // Skip non-numeric set numbers (e.g. col06-1, fig-*) — these are minifig IDs, not sets
        try {
          const setNumber = job.data.itemNumber
          if (/^\d+-\d+$/.test(setNumber) || /^\d+$/.test(setNumber)) {
            const rbSetNumber = /-\d+$/.test(setNumber) ? setNumber : `${setNumber}-1`
            const rbUrl = `https://rebrickable.com/sets/${rbSetNumber}/`
            await queues.rebrickableSet.add('scrape', { url: rbUrl, wishlist: false })
            logger.info(`[worker:minifig] Cross-enqueued Rebrickable scrape for ${rbSetNumber}`)
          } else {
            logger.info(
              `[worker:minifig] Skipping Rebrickable cross-enqueue for non-set ID: ${setNumber}`,
            )
          }
        } catch (e) {
          logger.warn(`[worker:minifig] Failed to cross-enqueue Rebrickable scrape`, { error: e })
        }
      } else if (result.variantId) {
        // Minifig scrape completed — auto-enqueue price job
        // Skip for CMF items (col* prefix) — CMF worker already scrapes prices inline
        const isCmf = job.data.itemType === 'S' && /^col/i.test(job.data.itemNumber)
        if (!isCmf) {
          await queues.bricklinkPrices.add('price', {
            itemNumber: job.data.itemNumber,
            itemType: job.data.itemType,
            variantId: result.variantId,
          })
          logger.info(`[worker:minifig] Enqueued price job for ${job.data.itemNumber}`)
        }
      }

      return result
    },
    {
      connection: redisConnection,
      concurrency: 1,
      limiter: { max: 20, duration: 60 * 60 * 1000 }, // 20 per hour
    },
  )
  workers.push(bricklinkMinifigWorker)

  // ── BrickLink Catalog ──────────────────────────────────────────────────

  const bricklinkCatalogWorker = new Worker(
    QUEUE_NAMES.BRICKLINK_CATALOG,
    async job => {
      logger.info(`[worker:catalog] Processing catalog`, {
        jobId: job.id,
        url: job.data.catalogUrl,
      })
      const result = await processBricklinkCatalog(job.data, queues.bricklinkMinifig, job.id!)
      await handleRateLimit(queues.bricklinkCatalog, result, job.data.catalogUrl)
      if (!result.success) throw new Error(result.error || 'Catalog scrape failed')
      return result
    },
    {
      connection: redisConnection,
      concurrency: 1,
      limiter: { max: 20, duration: 60 * 60 * 1000 }, // 20 per hour
    },
  )
  workers.push(bricklinkCatalogWorker)

  // ── BrickLink Prices ───────────────────────────────────────────────────

  const bricklinkPricesWorker = new Worker(
    QUEUE_NAMES.BRICKLINK_PRICES,
    async job => {
      logger.info(`[worker:prices] Processing ${job.data.itemNumber}`, { jobId: job.id })
      const result = await processBricklinkPrices(job.data)
      await handleRateLimit(queues.bricklinkPrices, result, result.itemNumber)
      if (!result.success && result.error) throw new Error(result.error)
      return result
    },
    {
      connection: redisConnection,
      concurrency: 1,
      limiter: { max: 15, duration: 60 * 60 * 1000 }, // 15 per hour
    },
  )
  workers.push(bricklinkPricesWorker)

  // ── LEGO.com Set ───────────────────────────────────────────────────────

  const legoSetWorker = new Worker(
    QUEUE_NAMES.LEGO_SET,
    async job => {
      logger.info(`[worker:lego-set] Processing ${job.data.url}`, { jobId: job.id })
      const result = await processLegoSet(job.data)
      if (result.rateLimited) {
        await handleRateLimit(queues.legoSet, result, job.data.url)
      }
      if (!result.success) throw new Error(result.error || 'Scrape failed')

      // Cross-enqueue BrickLink + Rebrickable set scrapes
      if (result.setNumber) {
        const blSetNumber = /-\d+$/.test(result.setNumber)
          ? result.setNumber
          : `${result.setNumber}-1`
        try {
          await queues.bricklinkMinifig.add('scrape', {
            itemNumber: result.setNumber,
            itemType: 'S' as const,
            wishlist: false,
            setId: result.setId,
          })
          logger.info(`[worker:lego-set] Cross-enqueued BrickLink scrape for ${result.setNumber}`)
        } catch (e) {
          logger.warn(`[worker:lego-set] Failed to cross-enqueue BrickLink`, { error: e })
        }
        try {
          await queues.rebrickableSet.add('scrape', {
            url: `https://rebrickable.com/sets/${blSetNumber}/`,
            wishlist: false,
          })
          logger.info(`[worker:lego-set] Cross-enqueued Rebrickable scrape for ${blSetNumber}`)
        } catch (e) {
          logger.warn(`[worker:lego-set] Failed to cross-enqueue Rebrickable`, { error: e })
        }
      }

      return result
    },
    { connection: redisConnection, concurrency: 1 },
  )
  workers.push(legoSetWorker)

  // ── Rebrickable Set ────────────────────────────────────────────────────

  const rebrickableSetWorker = new Worker(
    QUEUE_NAMES.REBRICKABLE_SET,
    async job => {
      logger.info(`[worker:rebrickable-set] Processing ${job.data.url}`, { jobId: job.id })
      const result = await processRebrickableSet(job.data)
      await handleRateLimit(queues.rebrickableSet, result, job.data.url)
      if (!result.success) throw new Error(result.error || 'Scrape failed')

      // Cross-enqueue BrickLink set scrape
      if (result.setNumber) {
        try {
          await queues.bricklinkMinifig.add('scrape', {
            itemNumber: result.setNumber,
            itemType: 'S' as const,
            wishlist: false,
            setId: result.setId,
          })
          logger.info(
            `[worker:rebrickable-set] Cross-enqueued BrickLink scrape for ${result.setNumber}`,
          )
        } catch (e) {
          logger.warn(`[worker:rebrickable-set] Failed to cross-enqueue BrickLink`, { error: e })
        }
      }

      return result
    },
    {
      connection: redisConnection,
      concurrency: 1,
      limiter: { max: 20, duration: 60 * 60 * 1000 }, // 20 per hour
    },
  )
  workers.push(rebrickableSetWorker)

  // ── Rebrickable MOCs (discovery) ────────────────────────────────────────

  const rebrickableMocsWorker = new Worker(
    QUEUE_NAMES.REBRICKABLE_MOCS,
    async job => {
      logger.info(`[worker:rebrickable-mocs] Starting pipeline`, {
        jobId: job.id,
        options: job.data,
      })
      await job.updateProgress({ stage: 'Starting discovery...' })
      const result = await processRebrickableMocs(
        job.data,
        queues.rebrickableMocSingle,
        job.id!,
        msg => job.updateProgress({ stage: msg }),
      )
      await handleRateLimit(queues.rebrickableMocs, result, 'moc-pipeline')
      if (!result.success) throw new Error(result.error || 'Pipeline failed')

      // Emit discovery expanded event if child jobs were enqueued
      if (result.jobsEnqueued) {
        scraperEvents.mocDiscoveryExpanded(job.id!, result.itemsFound ?? 0, result.jobsEnqueued)
      }

      return result
    },
    { connection: redisConnection, concurrency: 1 },
  )
  workers.push(rebrickableMocsWorker)

  // ── Rebrickable MOC Single ────────────────────────────────────────────

  const rebrickableMocSingleWorker = new Worker(
    QUEUE_NAMES.REBRICKABLE_MOC_SINGLE,
    async job => {
      const moc = job.data.mocNumber
      logger.info(`[worker:rebrickable-moc-single] Processing MOC-${moc}`, { jobId: job.id })
      await job.updateProgress({ stage: `Scraping MOC-${moc}...` })
      const result = await processRebrickableMocSingle(job.data)
      await handleRateLimit(queues.rebrickableMocSingle, result, result.mocNumber)
      if (!result.success) throw new Error(result.error || 'Scrape failed')
      return result
    },
    { connection: redisConnection, concurrency: 1 },
  )
  workers.push(rebrickableMocSingleWorker)

  // ── Event handlers for all workers ─────────────────────────────────────

  for (const worker of workers) {
    worker.on('active', job => {
      const type = worker.name.replace('scrape-', '')
      scraperEvents.jobStarted(job.id!, type, job.data)
    })
    worker.on('completed', job => {
      logger.info(`[worker:${worker.name}] Job completed`, { jobId: job.id })
      const type = worker.name.replace('scrape-', '')
      scraperEvents.jobCompleted(job.id!, type, job.returnvalue ?? {})

      // Emit catalog expanded event if applicable
      if (type === 'bricklink-catalog' && job.returnvalue?.jobsEnqueued) {
        scraperEvents.catalogExpanded(
          job.id!,
          job.returnvalue.itemsFound,
          job.returnvalue.jobsEnqueued,
        )
      }
    })
    worker.on('failed', (job, err) => {
      logger.error(`[worker:${worker.name}] Job failed`, {
        jobId: job?.id,
        error: err.message,
        attempt: job?.attemptsMade,
      })
      if (job) {
        const type = worker.name.replace('scrape-', '')
        scraperEvents.jobFailed(job.id!, type, err.message, job.attemptsMade)
      }
    })
  }

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

  // Close shared browser (single instance for all BrickLink workers)
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

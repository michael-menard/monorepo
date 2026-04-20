import { resolve } from 'path'
import { Hono } from 'hono'
import { Queue } from 'bullmq'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'
import {
  AddJobInputSchema,
  JobListQuerySchema,
  detectScraperType,
  detectBricklinkItemType,
  type JobResponse,
  type QueueHealth,
} from './types.js'

const scraper = new Hono()

scraper.use('*', auth)

// ─────────────────────────────────────────────────────────────────────────
// BullMQ Queue Connections
// ─────────────────────────────────────────────────────────────────────────

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
}

const QUEUE_NAMES = {
  'bricklink-minifig': 'scrape:bricklink-minifig',
  'bricklink-catalog': 'scrape:bricklink-catalog',
  'bricklink-prices': 'scrape:bricklink-prices',
  'lego-set': 'scrape:lego-set',
  'rebrickable-set': 'scrape:rebrickable-set',
  'rebrickable-mocs': 'scrape:rebrickable-mocs',
} as const

type ScraperType = keyof typeof QUEUE_NAMES

// Lazy-init queues (connection only needed when endpoints are called)
const queueCache = new Map<string, Queue>()

function getQueue(name: string): Queue {
  let queue = queueCache.get(name)
  if (!queue) {
    queue = new Queue(name, { connection: redisConnection })
    queueCache.set(name, queue)
  }
  return queue
}

function getAllQueueNames(): string[] {
  return Object.values(QUEUE_NAMES)
}

// ─────────────────────────────────────────────────────────────────────────
// Helper: map BullMQ job to response shape
// ─────────────────────────────────────────────────────────────────────────

function mapJob(job: any, queueName: string): JobResponse {
  // Derive type from queue name (e.g., "scrape:bricklink-minifig" → "bricklink-minifig")
  const type = queueName.replace('scrape:', '')
  return {
    id: job.id,
    type,
    status: job.failedReason
      ? 'failed'
      : job.finishedOn
        ? 'completed'
        : job.processedOn
          ? 'active'
          : 'waiting',
    data: job.data,
    progress: job.progress,
    attemptsMade: job.attemptsMade ?? 0,
    failedReason: job.failedReason ?? null,
    createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : new Date().toISOString(),
    finishedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null,
    parentJobId: job.data?.parentJobId ?? null,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /scraper/jobs — Add job(s) to queue
// ─────────────────────────────────────────────────────────────────────────

scraper.post('/jobs', async c => {
  const body = await c.req.json()
  const parseResult = AddJobInputSchema.safeParse(body)

  if (!parseResult.success) {
    return c.json({ error: 'VALIDATION_ERROR', details: parseResult.error.flatten() }, 400)
  }

  const input = parseResult.data
  const scraperType = input.type || detectScraperType(input.url)

  if (!scraperType) {
    return c.json({ error: 'UNKNOWN_TYPE', message: 'Could not detect scraper type from URL' }, 400)
  }

  const queueName = QUEUE_NAMES[scraperType as ScraperType]
  if (!queueName) {
    return c.json({ error: 'UNKNOWN_TYPE', message: `Unknown scraper type: ${scraperType}` }, 400)
  }

  const queue = getQueue(queueName)

  // Build job data based on type
  let jobData: Record<string, unknown> = {}

  switch (scraperType) {
    case 'bricklink-minifig': {
      // Extract item number from URL or use raw input
      const urlMatch = input.url.match(/[?&][MS]=([^&]+)/)
      const itemNumber = urlMatch ? urlMatch[1] : input.url
      const itemType = urlMatch
        ? input.url.includes('S=')
          ? 'S'
          : 'M'
        : detectBricklinkItemType(itemNumber)
      jobData = { itemNumber, itemType, wishlist: input.wishlist }
      break
    }
    case 'bricklink-catalog':
      jobData = { catalogUrl: input.url, wishlist: input.wishlist }
      break
    case 'bricklink-prices': {
      const urlMatch = input.url.match(/[?&][MS]=([^&]+)/)
      const itemNumber = urlMatch ? urlMatch[1] : input.url
      const itemType = urlMatch
        ? input.url.includes('S=')
          ? 'S'
          : 'M'
        : detectBricklinkItemType(itemNumber)
      jobData = { itemNumber, itemType }
      break
    }
    case 'lego-set':
      jobData = { url: input.url, wishlist: input.wishlist }
      break
    case 'rebrickable-set':
      jobData = { url: input.url, wishlist: input.wishlist }
      break
    case 'rebrickable-mocs':
      jobData = {
        resume: input.resume ?? false,
        force: input.force ?? false,
        retryFailed: input.retryFailed ?? false,
        retryMissing: input.retryMissing ?? false,
        likedMocs: input.likedMocs ?? false,
      }
      break
  }

  const job = await queue.add('scrape', jobData)

  logger.info('Scrape job enqueued', undefined, {
    jobId: job.id,
    type: scraperType,
    data: jobData,
  })

  return c.json(
    {
      id: job.id,
      type: scraperType,
      status: 'waiting',
      data: jobData,
    },
    201,
  )
})

// ─────────────────────────────────────────────────────────────────────────
// GET /scraper/jobs — List jobs across all queues
// ─────────────────────────────────────────────────────────────────────────

scraper.get('/jobs', async c => {
  const query = JobListQuerySchema.safeParse({
    status: c.req.query('status'),
    type: c.req.query('type'),
    limit: c.req.query('limit'),
  })

  const { status, type, limit } = query.success
    ? query.data
    : { status: undefined, type: undefined, limit: 50 }

  const targetQueues = type
    ? [QUEUE_NAMES[type as ScraperType]].filter(Boolean)
    : getAllQueueNames()

  const allJobs: JobResponse[] = []

  for (const queueName of targetQueues) {
    const queue = getQueue(queueName)
    const statuses = status ? [status] : ['waiting', 'active', 'completed', 'failed', 'delayed']
    const jobs = await queue.getJobs(statuses as any[], 0, limit)
    allJobs.push(...jobs.map(j => mapJob(j, queueName)))
  }

  // Sort by createdAt desc
  allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return c.json({ jobs: allJobs.slice(0, limit) })
})

// ─────────────────────────────────────────────────────────────────────────
// GET /scraper/jobs/:id — Get single job detail
// ─────────────────────────────────────────────────────────────────────────

scraper.get('/jobs/:id', async c => {
  const jobId = c.req.param('id')

  // Search across all queues
  for (const queueName of getAllQueueNames()) {
    const queue = getQueue(queueName)
    const job = await queue.getJob(jobId)
    if (job) {
      // Find children if this is a catalog job
      const children: JobResponse[] = []
      if (queueName === QUEUE_NAMES['bricklink-catalog']) {
        const minifigQueue = getQueue(QUEUE_NAMES['bricklink-minifig'])
        const allMinifigJobs = await minifigQueue.getJobs(
          ['waiting', 'active', 'completed', 'failed', 'delayed'],
          0,
          200,
        )
        for (const childJob of allMinifigJobs) {
          if (childJob.data?.parentJobId === jobId) {
            children.push(mapJob(childJob, QUEUE_NAMES['bricklink-minifig']))
          }
        }
      }

      return c.json({
        ...mapJob(job, queueName),
        children: children.length > 0 ? children : undefined,
      })
    }
  }

  return c.json({ error: 'NOT_FOUND' }, 404)
})

// ─────────────────────────────────────────────────────────────────────────
// DELETE /scraper/jobs/:id — Cancel/remove a job
// ─────────────────────────────────────────────────────────────────────────

scraper.delete('/jobs/:id', async c => {
  const jobId = c.req.param('id')

  for (const queueName of getAllQueueNames()) {
    const queue = getQueue(queueName)
    const job = await queue.getJob(jobId)
    if (job) {
      await job.remove()
      logger.info('Scrape job removed', undefined, { jobId, queueName })
      return c.json({ success: true })
    }
  }

  return c.json({ error: 'NOT_FOUND' }, 404)
})

// ─────────────────────────────────────────────────────────────────────────
// POST /scraper/jobs/:id/retry — Retry a failed job
// ─────────────────────────────────────────────────────────────────────────

scraper.post('/jobs/:id/retry', async c => {
  const jobId = c.req.param('id')

  for (const queueName of getAllQueueNames()) {
    const queue = getQueue(queueName)
    const job = await queue.getJob(jobId)
    if (job) {
      await job.retry()
      logger.info('Scrape job retried', undefined, { jobId, queueName })
      return c.json({ success: true, status: 'waiting' })
    }
  }

  return c.json({ error: 'NOT_FOUND' }, 404)
})

// ─────────────────────────────────────────────────────────────────────────
// GET /scraper/queues — Queue health + circuit breaker status
// ─────────────────────────────────────────────────────────────────────────

scraper.get('/queues', async c => {
  const Redis = (await import('ioredis')).default
  const redis = new Redis(redisConnection)

  const queues: QueueHealth[] = []

  for (const [type, queueName] of Object.entries(QUEUE_NAMES)) {
    const queue = getQueue(queueName)
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed')

    // Check circuit breaker state in Redis
    const cbRaw = await redis.get(`circuit-breaker:${queueName}`)
    const cb = cbRaw
      ? JSON.parse(cbRaw)
      : { isOpen: false, trippedAt: null, resumesAt: null, reason: null }

    queues.push({
      name: type,
      waiting: counts.waiting ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
      circuitBreaker: {
        isOpen: cb.isOpen,
        trippedAt: cb.trippedAt,
        resumesAt: cb.resumesAt,
        reason: cb.reason,
      },
    })
  }

  await redis.quit()

  return c.json({ queues })
})

// ─────────────────────────────────────────────────────────────────────────
// Legacy endpoints (preserved for backward compatibility)
// ─────────────────────────────────────────────────────────────────────────

let activeProcess: { proc: ReturnType<typeof Bun.spawn>; startedAt: Date } | null = null

scraper.post('/trigger', async c => {
  const userId = c.get('userId')

  if (activeProcess) {
    const exitCode = activeProcess.proc.exitCode
    if (exitCode === null) {
      return c.json(
        {
          error: 'SCRAPER_ALREADY_RUNNING',
          message: 'A scrape is already in progress',
          startedAt: activeProcess.startedAt.toISOString(),
        },
        409,
      )
    }
    activeProcess = null
  }

  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {
    // No body is fine
  }

  const args: string[] = []
  if (body.dryRun) args.push('--dry-run')
  if (body.retryFailed) args.push('--retry-failed')
  if (body.retryMissing) args.push('--retry-missing')
  if (body.likedMocs) args.push('--liked-mocs')
  if (typeof body.limit === 'number' && body.limit > 0) {
    args.push('--limit', String(body.limit))
  }

  const scraperDir = resolve(import.meta.dir, '../../../../scrapers/rebrickable')

  logger.info('Triggering rebrickable scraper', undefined, { userId, args, scraperDir })

  try {
    const proc = Bun.spawn(['pnpm', 'scrape', ...args], {
      cwd: scraperDir,
      stdout: 'ignore',
      stderr: 'ignore',
      stdin: null,
    })

    activeProcess = { proc, startedAt: new Date() }

    proc.exited.then(code => {
      logger.info('Rebrickable scraper finished', undefined, {
        exitCode: code,
        startedAt: activeProcess?.startedAt.toISOString(),
      })
      activeProcess = null
    })

    return c.json(
      {
        status: 'started',
        message: 'Scraper started in background',
        startedAt: activeProcess.startedAt.toISOString(),
        args,
      },
      202,
    )
  } catch (error) {
    logger.error('Failed to start rebrickable scraper', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to start scraper' }, 500)
  }
})

scraper.get('/status', async c => {
  if (!activeProcess) {
    return c.json({ status: 'idle' })
  }

  const exitCode = activeProcess.proc.exitCode
  if (exitCode === null) {
    return c.json({ status: 'running', startedAt: activeProcess.startedAt.toISOString() })
  }

  const result = {
    status: exitCode === 0 ? 'completed' : 'failed',
    exitCode,
    startedAt: activeProcess.startedAt.toISOString(),
  }
  activeProcess = null
  return c.json(result)
})

export default scraper

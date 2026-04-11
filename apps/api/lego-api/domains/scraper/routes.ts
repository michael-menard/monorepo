import { resolve } from 'path'
import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'

const scraper = new Hono()

// Auth required — only authenticated users can trigger scrapes
scraper.use('*', auth)

// Track the running scraper process so we can report status / prevent double-runs
let activeProcess: { proc: ReturnType<typeof Bun.spawn>; startedAt: Date } | null = null

/**
 * POST /scraper/trigger
 *
 * Spawns the rebrickable scraper as a detached background process.
 * Returns 202 immediately — the scrape runs asynchronously.
 *
 * Body (all optional):
 *   dryRun     - metadata only, skip file downloads
 *   limit      - process only first N MOCs
 *   retryFailed - retry MOCs where PDF downloads failed
 *   likedMocs  - scrape liked MOCs instead of purchases
 */
scraper.post('/trigger', async c => {
  const userId = c.get('userId')

  // Prevent concurrent runs
  if (activeProcess) {
    const exitCode = activeProcess.proc.exitCode
    if (exitCode === null) {
      // Still running
      return c.json(
        {
          error: 'SCRAPER_ALREADY_RUNNING',
          message: 'A scrape is already in progress',
          startedAt: activeProcess.startedAt.toISOString(),
        },
        409,
      )
    }
    // Previous run finished — clear it
    activeProcess = null
  }

  let body: Record<string, unknown> = {}
  try {
    body = await c.req.json()
  } catch {
    // No body is fine — all options are optional
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

  logger.info('Triggering rebrickable scraper', undefined, {
    userId,
    args,
    scraperDir,
  })

  try {
    const proc = Bun.spawn(['pnpm', 'scrape', ...args], {
      cwd: scraperDir,
      stdout: 'ignore',
      stderr: 'ignore',
      stdin: null,
    })

    activeProcess = { proc, startedAt: new Date() }

    // Auto-cleanup when the process exits
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

/**
 * GET /scraper/status
 *
 * Check whether a scrape is currently running.
 */
scraper.get('/status', async c => {
  if (!activeProcess) {
    return c.json({ status: 'idle' })
  }

  const exitCode = activeProcess.proc.exitCode
  if (exitCode === null) {
    return c.json({
      status: 'running',
      startedAt: activeProcess.startedAt.toISOString(),
    })
  }

  // Process finished but hasn't been cleaned up yet
  const result = {
    status: exitCode === 0 ? 'completed' : 'failed',
    exitCode,
    startedAt: activeProcess.startedAt.toISOString(),
  }
  activeProcess = null
  return c.json(result)
})

export default scraper

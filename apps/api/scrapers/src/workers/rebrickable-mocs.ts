/**
 * Rebrickable MOCs Discovery Worker
 *
 * Runs --list-only to discover MOCs, then enqueues each as a
 * rebrickable-moc-single child job for individual processing.
 *
 * Modes that use discovery → split:
 *   - Normal (no flags): discover new MOCs, each child skips if already completed
 *   - Force: discover all MOCs, each child re-scrapes via --force
 *   - Liked MOCs: same as above but scrapes liked list instead of purchases
 *   - Retry Missing: discover MOCs, each child runs backfill assessment via --retry-missing --single
 *   - Retry Failed: discover MOCs, each child re-scrapes (checkpoint skip handles already-done)
 *
 * Modes that fall back to monolithic pipeline:
 *   - Resume: continues a specific interrupted run (needs checkpoint state)
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { Queue } from 'bullmq'
import { logger } from '@repo/logger'
import type { RebrickableMocsJob, RebrickableMocSingleJob } from '../queues.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface MocsResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
  itemsFound?: number
  jobsEnqueued?: number
}

/**
 * Spawn the rebrickable CLI with given args and return { stdout, stderr }.
 */
async function spawnScraper(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)

  const scriptPath = resolve(__dirname, '../../../../scrapers/rebrickable/src/index.ts')

  return execFileAsync('npx', ['tsx', scriptPath, ...args], {
    cwd: resolve(__dirname, '../../../../scrapers/rebrickable'),
    timeout: 4 * 60 * 60 * 1000, // 4 hour timeout
    env: { ...process.env },
    maxBuffer: 50 * 1024 * 1024, // 50MB
  })
}

/**
 * Check stdout for rate limit indicators.
 */
function checkRateLimit(
  stdout: string,
): { rateLimited: true; resetHint?: string } | { rateLimited: false } {
  if (
    stdout.toLowerCase().includes('quota reached') ||
    stdout.toLowerCase().includes('rate limit')
  ) {
    const resetMatch = stdout.match(/try again in (\d+)\s*(minutes?|hours?)/i)
    return {
      rateLimited: true,
      resetHint: resetMatch ? `${resetMatch[1]} ${resetMatch[2]}` : undefined,
    }
  }
  return { rateLimited: false }
}

/**
 * Discovery mode: run --list-only, parse JSON output, enqueue child jobs.
 */
async function runDiscovery(
  job: RebrickableMocsJob,
  singleQueue: Queue<RebrickableMocSingleJob>,
  parentJobId: string,
  onProgress?: (msg: string) => void,
): Promise<MocsResult> {
  const args = ['--list-only']
  if (job.likedMocs) args.push('--liked-mocs')

  onProgress?.('Discovering MOCs...')
  logger.info('[rebrickable-mocs] Running discovery (--list-only)', { args })

  const { stdout, stderr } = await spawnScraper(args)

  if (stderr) {
    logger.warn('[rebrickable-mocs] Discovery stderr', { stderr: stderr.slice(0, 1000) })
  }

  const rl = checkRateLimit(stdout)
  if (rl.rateLimited) {
    return { success: false, rateLimited: true, resetHint: rl.resetHint }
  }

  // The --list-only CLI writes the MOC list to a temp file and prints
  // the path on stdout with a __MOC_LIST_FILE__ prefix.
  const FILE_MARKER = '__MOC_LIST_FILE__'
  const fileLine = stdout.split('\n').find(line => line.startsWith(FILE_MARKER))

  if (!fileLine) {
    logger.error('[rebrickable-mocs] No list file marker in --list-only output', {
      stdout: stdout.slice(0, 1000),
    })
    return { success: false, error: 'No list file from --list-only' }
  }

  const listFilePath = fileLine.slice(FILE_MARKER.length).trim()
  let mocList: Array<{ mocNumber: string; title: string; url: string; author: string }>
  try {
    const { readFile, unlink } = await import('fs/promises')
    const raw = await readFile(listFilePath, 'utf-8')
    mocList = JSON.parse(raw)
    await unlink(listFilePath).catch(() => {})
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    logger.error('[rebrickable-mocs] Failed to read list file', { path: listFilePath, error: msg })
    return { success: false, error: `Failed to read list file: ${msg}` }
  }

  logger.info(`[rebrickable-mocs] Discovery found ${mocList.length} MOCs`)
  onProgress?.(`Found ${mocList.length} MOCs, enqueueing...`)

  // Enqueue each MOC as a child job.
  // Skip-if-completed filtering is handled by --single itself (checkpoint check).
  // Pass flags through so each child runs the right mode.
  let enqueued = 0
  for (const moc of mocList) {
    await singleQueue.add('scrape', {
      mocNumber: moc.mocNumber,
      force: job.force,
      retryMissing: job.retryMissing,
      parentJobId,
    })
    enqueued++
  }

  logger.info(`[rebrickable-mocs] Enqueued ${enqueued} individual MOC jobs`)

  return { success: true, itemsFound: mocList.length, jobsEnqueued: enqueued }
}

/**
 * Fallback: run the monolithic pipeline for modes that need DB-level assessment
 * (retryMissing, retryFailed, resume).
 */
async function runMonolithicPipeline(job: RebrickableMocsJob): Promise<MocsResult> {
  const args: string[] = []
  if (job.resume) args.push('--resume')
  if (job.force) args.push('--force')
  if (job.retryFailed) args.push('--retry-failed')
  if (job.retryMissing) args.push('--retry-missing')
  if (job.likedMocs) args.push('--liked-mocs')

  logger.info('[rebrickable-mocs] Running monolithic pipeline (fallback)', { args })

  const { stdout, stderr } = await spawnScraper(args)

  if (stderr) {
    logger.warn('[rebrickable-mocs] Pipeline stderr', { stderr: stderr.slice(0, 1000) })
  }

  const rl = checkRateLimit(stdout)
  if (rl.rateLimited) {
    return { success: false, rateLimited: true, resetHint: rl.resetHint }
  }

  logger.info('[rebrickable-mocs] Monolithic pipeline completed')
  return { success: true }
}

/**
 * Process a Rebrickable MOC pipeline job.
 *
 * Discovery → split for all modes except resume (which needs checkpoint continuity).
 * Each child job gets the parent's flags (force, retryMissing) passed through.
 */
export async function processRebrickableMocs(
  job: RebrickableMocsJob,
  singleQueue?: Queue<RebrickableMocSingleJob>,
  parentJobId?: string,
  onProgress?: (msg: string) => void,
): Promise<MocsResult> {
  try {
    // Only resume truly needs monolithic (checkpoint continuity).
    // All other modes use discovery → split into individual jobs.
    const needsMonolithic = job.resume
    if (!needsMonolithic && singleQueue && parentJobId) {
      return await runDiscovery(job, singleQueue, parentJobId, onProgress)
    }

    onProgress?.('Running pipeline...')
    return await runMonolithicPipeline(job)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('[rebrickable-mocs] Pipeline failed', { error: msg })

    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      return { success: false, rateLimited: true, error: msg }
    }

    return { success: false, error: msg }
  }
}

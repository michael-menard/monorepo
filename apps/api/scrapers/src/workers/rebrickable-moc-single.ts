/**
 * Rebrickable MOC Single Worker
 *
 * Scrapes a single MOC by number via the rebrickable scraper CLI's --single flag.
 * Each job processes one MOC — enqueued by the discovery worker (rebrickable-mocs).
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'
import type { RebrickableMocSingleJob } from '../queues.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface MocSingleResult {
  success: boolean
  mocNumber: string
  rateLimited?: boolean
  resetHint?: string
  error?: string
}

/**
 * Process a single MOC scrape job.
 * Spawns the rebrickable CLI with --single <moc-number>.
 */
export async function processRebrickableMocSingle(
  job: RebrickableMocSingleJob,
): Promise<MocSingleResult> {
  const { mocNumber, force, retryMissing } = job

  const args = ['--single', mocNumber]
  if (force) args.push('--force')
  if (retryMissing) args.push('--retry-missing')

  logger.info(`[rebrickable-moc-single] Scraping MOC-${mocNumber}`, { args })

  const scriptPath = resolve(__dirname, '../../../../scrapers/rebrickable/src/index.ts')

  try {
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    const { stdout, stderr } = await execFileAsync('npx', ['tsx', scriptPath, ...args], {
      cwd: resolve(__dirname, '../../../../scrapers/rebrickable'),
      timeout: 30 * 60 * 1000, // 30 min timeout per single MOC
      env: { ...process.env },
      maxBuffer: 10 * 1024 * 1024, // 10MB
    })

    if (stderr) {
      logger.warn(`[rebrickable-moc-single] MOC-${mocNumber} stderr`, {
        stderr: stderr.slice(0, 500),
      })
    }

    // Check for quota/rate limit in output
    if (
      stdout.toLowerCase().includes('quota reached') ||
      stdout.toLowerCase().includes('rate limit')
    ) {
      const resetMatch = stdout.match(/try again in (\d+)\s*(minutes?|hours?)/i)
      return {
        success: false,
        mocNumber,
        rateLimited: true,
        resetHint: resetMatch ? `${resetMatch[1]} ${resetMatch[2]}` : undefined,
      }
    }

    logger.info(`[rebrickable-moc-single] MOC-${mocNumber} completed`)
    return { success: true, mocNumber }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error(`[rebrickable-moc-single] MOC-${mocNumber} failed`, { error: msg })

    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      return { success: false, mocNumber, rateLimited: true, error: msg }
    }

    return { success: false, mocNumber, error: msg }
  }
}

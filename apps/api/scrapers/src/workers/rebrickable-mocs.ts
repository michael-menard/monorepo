/**
 * Rebrickable MOCs Worker
 *
 * Wraps the existing rebrickable MOC pipeline as a single long-running job.
 * The pipeline manages its own checkpoints, resume, and retry internally.
 */

import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { logger } from '@repo/logger'
import type { RebrickableMocsJob } from '../queues.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface MocsResult {
  success: boolean
  rateLimited?: boolean
  resetHint?: string
  error?: string
}

/**
 * Process a Rebrickable MOC pipeline job.
 * Spawns the pipeline as a child process to isolate it from the worker.
 */
export async function processRebrickableMocs(job: RebrickableMocsJob): Promise<MocsResult> {
  const { resume, force, retryFailed, retryMissing, likedMocs } = job

  const args: string[] = []
  if (resume) args.push('--resume')
  if (force) args.push('--force')
  if (retryFailed) args.push('--retry-failed')
  if (retryMissing) args.push('--retry-missing')
  if (likedMocs) args.push('--liked-mocs')

  logger.info('[rebrickable-mocs] Starting MOC pipeline', { args })

  const scriptPath = resolve(__dirname, '../../../../scrapers/rebrickable/src/index.ts')

  try {
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    const { stdout, stderr } = await execFileAsync('npx', ['tsx', scriptPath, ...args], {
      cwd: resolve(__dirname, '../../../../scrapers/rebrickable'),
      timeout: 4 * 60 * 60 * 1000, // 4 hour timeout
      env: { ...process.env },
      maxBuffer: 50 * 1024 * 1024, // 50MB
    })

    if (stderr) {
      logger.warn('[rebrickable-mocs] Pipeline stderr', { stderr: stderr.slice(0, 1000) })
    }

    // Check for quota message in output
    if (
      stdout.toLowerCase().includes('quota reached') ||
      stdout.toLowerCase().includes('rate limit')
    ) {
      const resetMatch = stdout.match(/try again in (\d+)\s*(minutes?|hours?)/i)
      return {
        success: false,
        rateLimited: true,
        resetHint: resetMatch ? `${resetMatch[1]} ${resetMatch[2]}` : undefined,
      }
    }

    logger.info('[rebrickable-mocs] Pipeline completed')
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('[rebrickable-mocs] Pipeline failed', { error: msg })

    // Check if it's a quota issue from the error output
    if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('rate limit')) {
      return { success: false, rateLimited: true, error: msg }
    }

    return { success: false, error: msg }
  }
}

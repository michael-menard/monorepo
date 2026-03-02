/**
 * collectDeadExports
 *
 * Collects the count of dead exports using ts-prune.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04b)
 * AC: AC-4, AC-14
 */

import { logger } from '@repo/logger'
import type { ExecFn } from './collectLintWarnings.js'

/**
 * collectDeadExports
 *
 * Runs `pnpm exec ts-prune` and counts the number of unused export lines.
 * ts-prune outputs one line per dead export.
 *
 * Returns null on execution failure (partial capture allowed).
 * Returns 0 if ts-prune finds no dead exports.
 *
 * @param execFn - Injectable execution function
 * @returns Number of dead exports, or null if collection failed
 */
export async function collectDeadExports(execFn: ExecFn): Promise<number | null> {
  try {
    const stdout = await execFn('pnpm exec ts-prune 2>&1 || true')

    // ts-prune outputs one unused export per line in format:
    // "src/file.ts:10 - exportName (used in module)"
    // or "src/file.ts:10 - exportName"
    // Filter out empty lines and "used in module" entries to count truly dead exports
    const lines = stdout
      .split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => !/(used in module)/.test(line))
      // Filter lines that look like export entries (contain " - ")
      .filter(line => / - /.test(line))

    return lines.length
  } catch (err) {
    logger.warn('collectDeadExports: failed to collect dead exports', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

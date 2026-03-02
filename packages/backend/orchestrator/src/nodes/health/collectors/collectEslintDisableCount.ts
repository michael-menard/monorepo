/**
 * collectEslintDisableCount
 *
 * Collects the count of eslint-disable comments in the codebase by
 * using grep to search all TypeScript source files.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04a)
 * AC: AC-4, AC-14
 */

import { logger } from '@repo/logger'
import type { ExecFn } from './collectLintWarnings.js'

/**
 * collectEslintDisableCount
 *
 * Runs `grep -r "eslint-disable" --include="*.ts" --include="*.tsx" -l` and
 * counts the total number of eslint-disable occurrences.
 * Returns null on execution failure (partial capture allowed).
 *
 * @param execFn - Injectable execution function
 * @returns Number of eslint-disable occurrences, or null if collection failed
 */
export async function collectEslintDisableCount(execFn: ExecFn): Promise<number | null> {
  try {
    // grep -r counts total occurrences (including file names with -c would give per-file)
    // Use grep to count lines containing eslint-disable across all TS/TSX files
    const stdout = await execFn(
      'grep -r "eslint-disable" --include="*.ts" --include="*.tsx" . 2>/dev/null | wc -l || echo "0"',
    )
    const count = parseInt(stdout.trim(), 10)
    return isNaN(count) ? 0 : count
  } catch (err) {
    logger.warn('collectEslintDisableCount: failed to collect eslint-disable count', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

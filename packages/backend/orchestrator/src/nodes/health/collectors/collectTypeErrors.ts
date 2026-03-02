/**
 * collectTypeErrors
 *
 * Collects the count of TypeScript type errors by running pnpm check-types:all
 * and parsing the error count from stdout.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04a)
 * AC: AC-4, AC-14
 */

import { logger } from '@repo/logger'
import type { ExecFn } from './collectLintWarnings.js'

/**
 * collectTypeErrors
 *
 * Runs `pnpm check-types:all` and counts lines matching TypeScript error format
 * (e.g., "src/file.ts(10,5): error TS2345: ...").
 * Returns null on execution failure (partial capture allowed).
 *
 * @param execFn - Injectable execution function
 * @returns Number of type errors, or null if collection failed
 */
export async function collectTypeErrors(execFn: ExecFn): Promise<number | null> {
  try {
    const stdout = await execFn('pnpm check-types:all 2>&1 || true')
    const lines = stdout.split('\n')
    // TypeScript error lines contain ': error TS' pattern
    const errorLines = lines.filter(line => /: error TS\d+/.test(line))
    return errorLines.length
  } catch (err) {
    logger.warn('collectTypeErrors: failed to collect type errors', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

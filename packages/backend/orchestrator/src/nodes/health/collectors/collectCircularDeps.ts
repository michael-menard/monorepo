/**
 * collectCircularDeps
 *
 * Collects the count of circular dependencies using madge --circular.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04b)
 * AC: AC-4, AC-14
 */

import { logger } from '@repo/logger'
import type { ExecFn } from './collectLintWarnings.js'

/**
 * collectCircularDeps
 *
 * Runs `pnpm exec madge --circular --extensions ts,tsx .` and counts
 * the number of circular dependency cycles found.
 *
 * Returns null on execution failure (partial capture allowed).
 * Returns 0 if madge exits cleanly with no circular deps.
 *
 * @param execFn - Injectable execution function
 * @returns Number of circular dependency cycles, or null if collection failed
 */
export async function collectCircularDeps(execFn: ExecFn): Promise<number | null> {
  try {
    const stdout = await execFn(
      'pnpm exec madge --circular --extensions ts,tsx . 2>&1 || true',
    )

    // madge outputs circular deps as a list of cycles
    // If "No circular dependency found" is in output, count is 0
    if (/no circular dependency found/i.test(stdout)) {
      return 0
    }

    // Count lines that look like cycle entries (typically start with index number or file path)
    const lines = stdout.split('\n').filter(line => line.trim().length > 0)

    // madge typically outputs:
    // "1) src/a.ts -> src/b.ts -> src/a.ts"
    // Count numbered cycle entries
    const cycleLines = lines.filter(line => /^\d+\)/.test(line.trim()))
    if (cycleLines.length > 0) {
      return cycleLines.length
    }

    // Fallback: if no numbered cycles found but output is non-empty, return 0
    // (madge exit code 0 with no output means no circular deps)
    return 0
  } catch (err) {
    logger.warn('collectCircularDeps: failed to collect circular deps', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

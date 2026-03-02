/**
 * collectAnyCount
 *
 * Collects the count of @typescript-eslint/no-explicit-any violations by
 * running pnpm lint and filtering for 'no-explicit-any' rule violations.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04a)
 * AC: AC-4, AC-14
 */

import { logger } from '@repo/logger'
import type { ExecFn } from './collectLintWarnings.js'

/**
 * collectAnyCount
 *
 * Runs `pnpm lint` and counts lines containing '@typescript-eslint/no-explicit-any'.
 * Returns null on execution failure (partial capture allowed).
 *
 * @param execFn - Injectable execution function
 * @returns Number of no-explicit-any violations, or null if collection failed
 */
export async function collectAnyCount(execFn: ExecFn): Promise<number | null> {
  try {
    const stdout = await execFn('pnpm lint 2>&1 || true')
    const lines = stdout.split('\n')
    // Lines for no-explicit-any rule contain the rule name in the output
    const anyLines = lines.filter(line => /no-explicit-any/.test(line))
    return anyLines.length
  } catch (err) {
    logger.warn('collectAnyCount: failed to collect any count', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

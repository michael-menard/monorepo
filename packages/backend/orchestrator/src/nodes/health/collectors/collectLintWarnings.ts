/**
 * collectLintWarnings
 *
 * Collects the count of lint warnings by running pnpm lint and counting
 * warning lines in the stdout output.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04a)
 * AC: AC-4, AC-14
 */

import { logger } from '@repo/logger'

/**
 * ExecFn type — injectable CLI execution function.
 * Accepts a shell command string and returns stdout as a string.
 * On error, should reject (collectLintWarnings catches and returns null).
 */
export type ExecFn = (cmd: string) => Promise<string>

/**
 * collectLintWarnings
 *
 * Runs `pnpm lint` and counts lines containing ' warning ' in stdout.
 * Returns null on execution failure (partial capture allowed).
 *
 * @param execFn - Injectable execution function (default: uses real CLI)
 * @returns Number of lint warnings, or null if collection failed
 */
export async function collectLintWarnings(execFn: ExecFn): Promise<number | null> {
  try {
    const stdout = await execFn('pnpm lint 2>&1 || true')
    const lines = stdout.split('\n')
    // ESLint warning lines contain ' warning ' (with spaces)
    const warningLines = lines.filter(line => / warning /i.test(line))
    return warningLines.length
  } catch (err) {
    logger.warn('collectLintWarnings: failed to collect lint warnings', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

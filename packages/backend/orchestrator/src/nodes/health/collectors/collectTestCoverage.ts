/**
 * collectTestCoverage
 *
 * Collects test coverage percentage by running Vitest with JSON coverage reporter
 * and parsing the global coverage percentage from the output.
 *
 * Story: APIP-4010 - Codebase Health Gate (ST-04b)
 * AC: AC-4, AC-14
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ExecFn } from './collectLintWarnings.js'

// Schema for Vitest JSON coverage summary output
const VitestCoverageSummarySchema = z.object({
  total: z.object({
    lines: z.object({
      pct: z.number(),
    }),
  }),
})

/**
 * collectTestCoverage
 *
 * Runs `pnpm test:coverage -- --reporter=json` and parses the global line
 * coverage percentage from the JSON summary output.
 *
 * Note: The coverage JSON is typically in coverage/coverage-summary.json after a run.
 * This function runs the coverage command and reads stdout for the summary.
 *
 * Returns null on execution failure (partial capture allowed).
 *
 * @param execFn - Injectable execution function
 * @returns Global line coverage percentage (0-100), or null if collection failed
 */
export async function collectTestCoverage(execFn: ExecFn): Promise<number | null> {
  try {
    // Run coverage and capture the summary JSON from stdout
    // --reporter=json outputs the coverage summary as JSON to stdout
    const stdout = await execFn(
      'pnpm test:coverage -- --reporter=json --silent 2>/dev/null || true',
    )

    // Try to find and parse a JSON object in the output
    const jsonMatch = stdout.match(/\{[\s\S]*"total"[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback: try to parse entire stdout as JSON
      const parsed = VitestCoverageSummarySchema.safeParse(JSON.parse(stdout.trim()))
      if (parsed.success) {
        return Math.round(parsed.data.total.lines.pct * 100) / 100
      }
      logger.warn('collectTestCoverage: no JSON coverage summary found in output')
      return null
    }

    const parsed = VitestCoverageSummarySchema.safeParse(JSON.parse(jsonMatch[0]))
    if (!parsed.success) {
      logger.warn('collectTestCoverage: coverage summary did not match expected schema', {
        errors: parsed.error.issues,
      })
      return null
    }

    return Math.round(parsed.data.total.lines.pct * 100) / 100
  } catch (err) {
    logger.warn('collectTestCoverage: failed to collect test coverage', {
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

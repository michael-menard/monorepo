/**
 * cohesion_check MCP Tool Wrapper
 * WINT-4010: Create Cohesion Sidecar
 *
 * ARCH-001: Calls computeCheck directly (not via HTTP fetch to localhost:3092).
 * Direct import avoids requiring the sidecar HTTP server to be running.
 *
 * AC-9: MCP wrapper exported from src/index.ts, calls compute function directly.
 * AC-12: Only @repo/logger — no console.log.
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { computeCheck } from '../compute-check.js'
import type { CohesionCheckResult } from '../__types__/index.js'

/**
 * Check cohesion status for a specific feature.
 *
 * ARCH-001: Calls computeCheck directly (no HTTP call).
 *
 * @param input - featureId to check
 * @returns CohesionCheckResult or null on error
 *
 * @example
 * ```typescript
 * const result = await cohesion_check({ featureId: 'wish' })
 * if (result) {
 *   console.log(result.status) // 'complete' | 'incomplete' | 'unknown'
 * }
 * ```
 */
export async function cohesion_check(input: {
  featureId: string
}): Promise<CohesionCheckResult | null> {
  try {
    logger.info('[cohesion] cohesion_check called', { featureId: input.featureId })
    const result = await computeCheck(input.featureId, db as any)
    logger.info('[cohesion] cohesion_check succeeded', {
      featureId: input.featureId,
      status: result.status,
    })
    return result
  } catch (error) {
    logger.warn('[cohesion] cohesion_check failed', {
      featureId: input.featureId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

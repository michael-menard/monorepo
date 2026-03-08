/**
 * cohesion_check MCP Tool Wrapper
 * WINT-4010: Create Cohesion Sidecar
 *
 * Calls computeCheck directly (OPP-04: avoids hard runtime dependency on HTTP server).
 * Accepts same inputs as POST /cohesion/check endpoint.
 *
 * Uses @repo/logger for all logging (AC-12).
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { computeCheck } from '../compute-check.js'
import { CohesionCheckRequestSchema } from '../__types__/index.js'
import type { CohesionCheckResult } from '../__types__/index.js'
import type { DrizzleDb } from '../compute-audit.js'

/**
 * Check cohesion for a specific feature via MCP.
 *
 * Calls computeCheck directly (no HTTP call to localhost:3092).
 *
 * @param input - featureId required
 * @param dbOverride - Optional DB override for testing
 * @returns CohesionCheckResult or null on error
 *
 * @example
 * ```typescript
 * const result = await cohesion_check({ featureId: 'some-feature-uuid' })
 * // => { featureId: 'uuid', status: 'incomplete', violations: [...], capabilityCoverage: {...} }
 * ```
 */
export async function cohesion_check(
  input: { featureId: string },
  dbOverride?: DrizzleDb,
): Promise<CohesionCheckResult | null> {
  try {
    const validated = CohesionCheckRequestSchema.parse(input)

    logger.info('[cohesion] cohesion_check called', {
      featureId: validated.featureId,
    })

    const result = await computeCheck(
      dbOverride ?? (db as unknown as DrizzleDb),
      validated.featureId,
    )

    logger.info('[cohesion] cohesion_check succeeded', {
      featureId: validated.featureId,
      status: result.status,
    })

    return result
  } catch (error) {
    logger.warn('[cohesion] cohesion_check failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

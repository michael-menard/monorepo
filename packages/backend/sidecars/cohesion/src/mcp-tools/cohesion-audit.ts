/**
 * cohesion_audit MCP Tool Wrapper
 * WINT-4010: Create Cohesion Sidecar
 *
 * Calls computeAudit directly (OPP-04: avoids hard runtime dependency on HTTP server).
 * Accepts same inputs as POST /cohesion/audit endpoint.
 *
 * Uses @repo/logger for all logging (AC-12).
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { computeAudit } from '../compute-audit.js'
import { CohesionAuditRequestSchema } from '../__types__/index.js'
import type { CohesionAuditResult } from '../__types__/index.js'
import type { DrizzleDb } from '../compute-audit.js'

/**
 * Detect Franken-features in the graph via MCP.
 *
 * Calls computeAudit directly (no HTTP call to localhost:3092).
 *
 * @param input - Optional packageName filter
 * @param dbOverride - Optional DB override for testing
 * @returns CohesionAuditResult or null on error
 *
 * @example
 * ```typescript
 * const result = await cohesion_audit({})
 * // => { frankenFeatures: [...], coverageSummary: { totalFeatures: 10, ... } }
 *
 * const filtered = await cohesion_audit({ packageName: '@repo/ui' })
 * // => Only Franken-features from @repo/ui
 * ```
 */
export async function cohesion_audit(
  input: { packageName?: string },
  dbOverride?: DrizzleDb,
): Promise<CohesionAuditResult | null> {
  try {
    const validated = CohesionAuditRequestSchema.parse(input)

    logger.info('[cohesion] cohesion_audit called', {
      packageName: validated.packageName,
    })

    const result = await computeAudit(
      dbOverride ?? (db as unknown as DrizzleDb),
      validated.packageName,
    )

    logger.info('[cohesion] cohesion_audit succeeded', {
      frankenCount: result.frankenFeatures.length,
      totalFeatures: result.coverageSummary.totalFeatures,
    })

    return result
  } catch (error) {
    logger.warn('[cohesion] cohesion_audit failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

/**
 * cohesion_audit MCP Tool Wrapper
 * WINT-4010: Create Cohesion Sidecar
 *
 * ARCH-001: Calls computeAudit directly (not via HTTP fetch to localhost:3092).
 * Direct import avoids requiring the sidecar HTTP server to be running.
 *
 * AC-9: MCP wrapper exported from src/index.ts, calls compute function directly.
 * AC-12: Only @repo/logger — no console.log.
 */

import { logger } from '@repo/logger'
import { db } from '@repo/db'
import { computeAudit } from '../compute-audit.js'
import type { CohesionAuditRequest, CohesionAuditResult } from '../__types__/index.js'

/**
 * Retrieve full Franken-feature audit across the graph.
 *
 * ARCH-001: Calls computeAudit directly (no HTTP call).
 *
 * @param input - Optional packageName filter
 * @returns CohesionAuditResult or null on error
 *
 * @example
 * ```typescript
 * const result = await cohesion_audit({})
 * if (result) {
 *   console.log(result.frankenFeatures)
 * }
 * ```
 */
export async function cohesion_audit(
  input: CohesionAuditRequest = {},
): Promise<CohesionAuditResult | null> {
  try {
    logger.info('[cohesion] cohesion_audit called', { packageName: input.packageName })
    const result = await computeAudit(input, db as any)
    logger.info('[cohesion] cohesion_audit succeeded', {
      totalFeatures: result.coverageSummary.totalFeatures,
      incompleteCount: result.coverageSummary.incompleteCount,
    })
    return result
  } catch (error) {
    logger.warn('[cohesion] cohesion_audit failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

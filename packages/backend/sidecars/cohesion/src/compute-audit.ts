/**
 * Cohesion Audit Compute Function
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-3: Returns full Franken-feature list and coverage summary.
 * AC-6: Accepts db as injectable parameter — no global DB import.
 * AC-8: Returns graceful empty result when graph is empty (not an error).
 * ARCH-003: Direct Drizzle queries against features + capabilities tables
 *           (NOT pgViews — no Drizzle pgView definitions exist for these names).
 *           Pattern follows graph-get-franken-features.ts canonical reference.
 */

import { logger } from '@repo/logger'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { features, capabilities } from '@repo/knowledge-base/db'
import type {
  CohesionAuditRequest,
  CohesionAuditResult,
  FrankenFeatureItem,
} from './__types__/index.js'

const CRUD_STAGES = ['create', 'read', 'update', 'delete'] as const

/**
 * Re-export NodePgDatabase as DrizzleDb for backward compatibility with test files
 * that import this type for mock creation.
 *
 * NodePgDatabase is the established codebase pattern (see generateStoriesIndex.ts,
 * database seeds) for injectable Drizzle clients. Using it directly removes the need
 * for the narrow structural type alias and eliminates `as any` casts in route handlers.
 */
export type DrizzleDb = NodePgDatabase<any>

/**
 * Compute the full Franken-feature audit across the graph.
 *
 * AC-6: db is injected — not imported globally. Enables unit testing without a real DB.
 * AC-8: Returns graceful empty result when graph is empty.
 * ARCH-003: Uses direct Drizzle queries, not pgViews.
 *
 * @param request - Optional packageName filter
 * @param db - Injectable Drizzle client
 * @returns CohesionAuditResult with frankenFeatures and coverageSummary
 */
export async function computeAudit(
  request: CohesionAuditRequest,
  db: DrizzleDb,
): Promise<CohesionAuditResult> {
  try {
    // Query all features with their linked capabilities.
    // CR-1: leftJoin (not innerJoin) so features with zero capabilities are included —
    //       they appear as franken-features with all CRUD stages missing (AC-3, AC-8).
    // CR-2: packageName predicate pushed into the query so the DB can use indexes —
    //       no post-query in-memory filter needed (AC-3).
    // ARCH-003: Direct Drizzle ORM query, same pattern as graph-get-franken-features.ts.
    // Explicit column selection returns a flat row shape (not the namespaced join shape).
    // CR-2: packageName pushed into the DB query (not filtered in-memory).
    const baseQuery = db
      .select({
        featureId: features.id,
        featureName: features.featureName,
        packageName: features.packageName,
        lifecycleStage: capabilities.lifecycleStage,
      })
      .from(features)
      .leftJoin(capabilities, eq(capabilities.featureId, features.id))

    const rows = await (request.packageName != null
      ? baseQuery.where(eq(features.packageName, request.packageName))
      : baseQuery)

    // Group capabilities by featureId in TypeScript
    const featureMap = new Map<string, { featureName: string; stages: Set<string> }>()

    for (const row of rows) {
      const featureId = row.featureId
      if (!featureMap.has(featureId)) {
        featureMap.set(featureId, {
          featureName: row.featureName,
          stages: new Set(),
        })
      }
      if (row.lifecycleStage) {
        // Non-null safe: featureMap.has(featureId) was just asserted true on the branch above,
        // so get() is guaranteed to return the entry we just set.
        featureMap.get(featureId)!.stages.add(row.lifecycleStage)
      }
    }

    // Count all features (including those with all 4 CRUD stages)
    // We need to also count complete features for the coverage summary.
    // To get ALL features (not just franken-features), we do a separate pass.
    const allFeatureIds = new Set<string>(rows.map(r => r.featureId))
    const totalFeatures = allFeatureIds.size

    // Detect features with < 4 distinct CRUD lifecycle_stage values (Franken-features)
    const frankenFeatures: FrankenFeatureItem[] = []

    for (const [featureId, { featureName, stages }] of featureMap) {
      const missingCapabilities = CRUD_STAGES.filter(stage => !stages.has(stage))

      if (missingCapabilities.length > 0) {
        frankenFeatures.push({
          featureId,
          featureName,
          missingCapabilities,
        })
      }
    }

    const incompleteCount = frankenFeatures.length
    const completeCount = totalFeatures - incompleteCount

    logger.info('[cohesion] computeAudit complete', {
      totalFeatures,
      completeCount,
      incompleteCount,
      packageName: request.packageName ?? 'all',
    })

    return {
      frankenFeatures,
      coverageSummary: {
        totalFeatures,
        completeCount,
        incompleteCount,
      },
    }
  } catch (error) {
    // AC-5: Never throw uncaught exceptions; log and re-throw for route handler to catch
    logger.warn('[cohesion] computeAudit failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

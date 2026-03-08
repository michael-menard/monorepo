/**
 * computeAudit — Pure Cohesion Audit Function
 * WINT-4010: Create Cohesion Sidecar
 *
 * Queries features + capabilities tables using Drizzle ORM (same pattern as
 * graph-get-franken-features.ts). Applies optional packageName filter in TypeScript.
 * Returns CohesionAuditResult with frankenFeatures array and coverageSummary.
 *
 * GAP-01: Story refers to "graph.franken_features view" — there is no pgView.
 * Uses direct Drizzle ORM queries against features + capabilities tables instead.
 *
 * Security: Uses Drizzle ORM parameterized queries only (no raw SQL).
 * Dependency injection: accepts db as parameter for testability (AC-6).
 */

import { logger } from '@repo/logger'
import { features, capabilities } from '@repo/database-schema'
import { eq, isNotNull } from 'drizzle-orm'
import type { CohesionAuditResult } from './__types__/index.js'

const CRUD_STAGES = ['create', 'read', 'update', 'delete'] as const

/**
 * Minimal Drizzle DB type — accepts injectable db for testing (AC-6).
 * Matches the pattern from context-pack assemble-context-pack.ts.
 */
export type DrizzleDb = {
  select: () => {
    from: (table: any) => {
      innerJoin: (
        table: any,
        on: any,
      ) => {
        where: (cond: any) => Promise<any[]>
      }
    }
  }
}

/**
 * Compute cohesion audit — identifies Franken-features across the graph.
 *
 * Franken-feature definition: feature with < 4 distinct lifecycle_stage values
 * among linked capabilities (create, read, update, delete).
 *
 * @param db - Injectable Drizzle DB instance (enables unit testing with mock DB)
 * @param packageName - Optional filter: if provided, only audit features from this package
 * @returns CohesionAuditResult with frankenFeatures array and coverageSummary
 *
 * @example
 * ```typescript
 * const result = await computeAudit(db)
 * // => { frankenFeatures: [...], coverageSummary: { totalFeatures: 10, completeCount: 8, incompleteCount: 2 } }
 *
 * const filtered = await computeAudit(db, '@repo/ui')
 * // => Only features from @repo/ui
 * ```
 */
export async function computeAudit(
  db: DrizzleDb,
  packageName?: string,
): Promise<CohesionAuditResult> {
  try {
    // Query all features with their linked capabilities (Drizzle ORM — parameterized, no raw SQL)
    const rows = await db
      .select()
      .from(features)
      .innerJoin(capabilities, eq(capabilities.featureId, features.id))
      .where(isNotNull(capabilities.featureId))

    // Apply optional packageName filter in TypeScript (avoids additional DB round-trip)
    const filteredRows = packageName
      ? rows.filter(
          (row: { features: { packageName: string | null } }) =>
            row.features.packageName === packageName,
        )
      : rows

    // Group capabilities by featureId in TypeScript
    const featureMap = new Map<
      string,
      { featureName: string; packageName: string | null; stages: Set<string> }
    >()

    for (const row of filteredRows) {
      const featureId = row.features.id
      if (!featureMap.has(featureId)) {
        featureMap.set(featureId, {
          featureName: row.features.featureName,
          packageName: row.features.packageName,
          stages: new Set(),
        })
      }
      const lifecycleStage = row.capabilities.lifecycleStage
      if (lifecycleStage) {
        featureMap.get(featureId)!.stages.add(lifecycleStage)
      }
    }

    // Detect features with < 4 distinct CRUD lifecycle_stage values (Franken-features)
    const frankenFeatures: CohesionAuditResult['frankenFeatures'] = []
    let completeCount = 0
    let incompleteCount = 0

    for (const [featureId, { featureName, stages }] of featureMap) {
      const missingCapabilities = CRUD_STAGES.filter(stage => !stages.has(stage))

      if (missingCapabilities.length > 0) {
        frankenFeatures.push({
          featureId,
          featureName,
          missingCapabilities,
        })
        incompleteCount++
      } else {
        completeCount++
      }
    }

    const totalFeatures = featureMap.size

    return {
      frankenFeatures,
      coverageSummary: {
        totalFeatures,
        completeCount,
        incompleteCount,
      },
    }
  } catch (error) {
    logger.warn(
      '[cohesion] computeAudit failed:',
      error instanceof Error ? error.message : String(error),
    )
    // Return graceful empty result when graph is empty or DB fails (AC-8)
    return {
      frankenFeatures: [],
      coverageSummary: {
        totalFeatures: 0,
        completeCount: 0,
        incompleteCount: 0,
      },
    }
  }
}

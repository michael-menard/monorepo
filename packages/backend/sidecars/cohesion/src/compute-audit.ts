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

import { z } from 'zod'
import { logger } from '@repo/logger'
import { features, capabilities } from '@repo/database-schema'
import { eq } from 'drizzle-orm'
import { CRUD_STAGES } from './__types__/index.js'
import type { CohesionAuditResult } from './__types__/index.js'

/**
 * Minimal Drizzle DB schema — accepts injectable db for testing (AC-6).
 * Uses z.custom<T>() per CLAUDE.md Zod-first requirement.
 * The structural shape describes the chainable query API surface used by computeAudit.
 * Matches the pattern from context-pack assemble-context-pack.ts.
 */

// Structural type for Drizzle's chainable query builder (not a data payload — no z.object()).
// Covers both usage patterns in this sidecar:
//   - computeAudit: select().from(t).leftJoin(t2, on).where(cond)   [CR-1: leftJoin]
//   - computeCheck: select().from(t).where(cond)  (no join)
type DrizzleFromResult = {
  leftJoin: (table: unknown, on: unknown) => { where: (cond: unknown) => Promise<unknown[]> } & PromiseLike<unknown[]>
  where: (cond: unknown) => Promise<unknown[]>
}

type DrizzleQueryChain = {
  from: (table: unknown) => DrizzleFromResult
}

type DrizzleDbShape = {
  select: () => DrizzleQueryChain
}

export const DrizzleDbSchema = z.custom<DrizzleDbShape>(
  val => val !== null && typeof val === 'object' && 'select' in (val as object),
  { message: 'Expected a Drizzle DB instance with a select() method' },
)

export type DrizzleDb = z.infer<typeof DrizzleDbSchema>

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
  // Row shape returned by Drizzle ORM join query (features JOIN capabilities)
  type AuditRow = {
    features: { id: string; featureName: string; packageName: string | null }
    capabilities: { lifecycleStage: string | null }
  }

  try {
    // CR-1: leftJoin (not innerJoin) so features with zero capabilities are included —
    //       they appear as franken-features with all CRUD stages missing (AC-3, AC-8).
    // CR-2: packageName predicate pushed into the DB query so the DB can use indexes
    //       instead of filtering all rows in TypeScript memory (AC-3).
    // Cast to AuditRow[]: safe because the Drizzle ORM join on features+capabilities always
    // returns this shape per the database schema definitions in @repo/database-schema.
    const baseQuery = db
      .select()
      .from(features)
      .leftJoin(capabilities, eq(capabilities.featureId, features.id))

    const rows = (await (packageName
      ? baseQuery.where(eq(features.packageName, packageName))
      : baseQuery)) as AuditRow[]

    // Group capabilities by featureId in TypeScript
    const featureMap = new Map<
      string,
      { featureName: string; packageName: string | null; stages: Set<string> }
    >()

    for (const row of rows) {
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
        // Non-null assertion safe: featureId was just set in featureMap.set() above in this loop iteration
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

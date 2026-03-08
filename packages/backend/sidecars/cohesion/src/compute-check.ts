/**
 * computeCheck — Pure Cohesion Check Function
 * WINT-4010: Create Cohesion Sidecar
 *
 * Accepts featureId + injectable db parameter. Queries capabilities for the
 * given featureId via Drizzle ORM. Determines status:
 *   - complete: all 4 CRUD stages present
 *   - incomplete: some stages missing
 *   - unknown: feature not found
 *
 * Returns CohesionCheckResult with violations array and capabilityCoverage breakdown.
 *
 * GAP-01: No pgView for capability_coverage — uses direct Drizzle queries.
 * Dependency injection: accepts db as parameter for testability (AC-6).
 */

import { logger } from '@repo/logger'
import { features, capabilities } from '@repo/database-schema'
import { eq } from 'drizzle-orm'
import type { DrizzleDb } from './compute-audit.js'
import { CRUD_STAGES } from './__types__/index.js'
import type { CohesionCheckResult } from './__types__/index.js'

/**
 * Compute cohesion check for a specific feature.
 *
 * @param db - Injectable Drizzle DB instance (enables unit testing with mock DB)
 * @param featureId - UUID or name of the feature to check
 * @returns CohesionCheckResult with status, violations, and capabilityCoverage
 *
 * @example
 * ```typescript
 * const result = await computeCheck(db, 'some-feature-uuid')
 * // => { featureId: 'uuid', status: 'incomplete', violations: ['missing create capability'], capabilityCoverage: { create: false, read: true, update: true, delete: true } }
 *
 * const unknown = await computeCheck(db, 'nonexistent-feature')
 * // => { featureId: 'nonexistent-feature', status: 'unknown', violations: ['Feature not found'], capabilityCoverage: { create: false, read: false, update: false, delete: false } }
 * ```
 */
// Row shape returned by Drizzle ORM query on capabilities table
type CapabilityRow = { lifecycleStage: string | null }

export async function computeCheck(db: DrizzleDb, featureId: string): Promise<CohesionCheckResult> {
  try {
    // First check if the feature exists.
    // Cast to unknown[]: safe — Drizzle returns an array (possibly empty) for any select query.
    const featureRows = await db.select().from(features).where(eq(features.id, featureId))

    if (!featureRows || featureRows.length === 0) {
      // Feature not found — return graceful unknown result (AC-8)
      logger.warn('[cohesion] computeCheck: feature not found', { featureId })
      return {
        featureId,
        status: 'unknown',
        violations: ['Feature not found'],
        capabilityCoverage: {
          create: false,
          read: false,
          update: false,
          delete: false,
        },
      }
    }

    // Query capabilities for this feature.
    // Cast to CapabilityRow[]: safe because Drizzle ORM select() on capabilities always
    // returns this shape per the database schema definitions in @repo/database-schema.
    const capabilityRows = (await db
      .select()
      .from(capabilities)
      .where(eq(capabilities.featureId, featureId))) as CapabilityRow[]

    // Collect distinct CRUD stages present
    const stages = new Set<string>()
    for (const row of capabilityRows) {
      if (row.lifecycleStage) {
        stages.add(row.lifecycleStage)
      }
    }

    // Build capabilityCoverage (booleans per AC-4 HTTP contract, ARCH-002)
    const capabilityCoverage = {
      create: stages.has('create'),
      read: stages.has('read'),
      update: stages.has('update'),
      delete: stages.has('delete'),
    }

    // Determine missing stages and build violations
    const missingStages = CRUD_STAGES.filter(stage => !stages.has(stage))
    const violations = missingStages.map(stage => `Missing ${stage} capability`)

    // Determine status
    const status: CohesionCheckResult['status'] =
      missingStages.length === 0 ? 'complete' : 'incomplete'

    return {
      featureId,
      status,
      violations,
      capabilityCoverage,
    }
  } catch (error) {
    logger.warn(
      '[cohesion] computeCheck failed:',
      error instanceof Error ? error.message : String(error),
    )
    // Return graceful result on DB error (AC-8)
    return {
      featureId,
      status: 'unknown',
      violations: ['Internal error checking feature cohesion'],
      capabilityCoverage: {
        create: false,
        read: false,
        update: false,
        delete: false,
      },
    }
  }
}

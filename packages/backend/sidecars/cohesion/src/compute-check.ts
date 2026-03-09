/**
 * Cohesion Check Compute Function
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-4: Returns per-feature cohesion status (complete | incomplete | unknown),
 *       violations array, and capability coverage breakdown.
 * AC-6: Accepts db as injectable parameter — no global DB import.
 * AC-8: Returns {status: 'unknown'} when feature not found (not an error).
 * ARCH-003: Direct Drizzle queries against features + capabilities tables.
 */

import { logger } from '@repo/logger'
import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { capabilities } from '@repo/database-schema'
import type { CohesionCheckResult, CapabilityCoverage } from './__types__/index.js'

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
 * Compute cohesion check for a specific feature.
 *
 * AC-6: db is injected — not imported globally. Enables unit testing without a real DB.
 * AC-8: Returns {status: 'unknown'} when feature not found.
 *
 * @param featureId - Feature to check
 * @param db - Injectable Drizzle client
 * @returns CohesionCheckResult with status, violations, capabilityCoverage
 */
export async function computeCheck(featureId: string, db: DrizzleDb): Promise<CohesionCheckResult> {
  try {
    // Query all capabilities for the given featureId
    const rows = await db.select().from(capabilities).where(eq(capabilities.featureId, featureId))

    // AC-8: Feature not found (no capabilities) → unknown status (not an error)
    if (rows.length === 0) {
      logger.info('[cohesion] computeCheck — feature not found, returning unknown', { featureId })
      return {
        featureId,
        status: 'unknown',
        violations: [],
        capabilityCoverage: {},
      }
    }

    // Collect all lifecycle stages present for this feature
    const presentStages = new Set<string>()
    for (const row of rows) {
      if (row.lifecycleStage) {
        presentStages.add(row.lifecycleStage)
      }
    }

    // Determine CRUD capability coverage (boolean per stage)
    const capabilityCoverage: CapabilityCoverage = {
      create: presentStages.has('create'),
      read: presentStages.has('read'),
      update: presentStages.has('update'),
      delete: presentStages.has('delete'),
    }

    // Identify missing CRUD stages
    const missingStages = CRUD_STAGES.filter(stage => !presentStages.has(stage))

    // Determine status
    const status = missingStages.length === 0 ? 'complete' : 'incomplete'

    // Violations: one entry per missing capability
    const violations = missingStages.map(stage => `missing ${stage} capability`)

    logger.info('[cohesion] computeCheck complete', { featureId, status, violations })

    return {
      featureId,
      status,
      violations,
      capabilityCoverage,
    }
  } catch (error) {
    // AC-5: Never throw uncaught exceptions; log and re-throw for route handler to catch
    logger.warn('[cohesion] computeCheck failed', {
      featureId,
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

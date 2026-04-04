/**
 * affinity-seeder.ts
 *
 * importAffinitySeeds — standalone function for bootstrapping wint.model_affinity
 * with manual seed entries. Used during cold-start to provide initial affinity data
 * before telemetry-driven profiles accumulate.
 *
 * Key behaviors:
 * - Upserts to wint.model_affinity using ON CONFLICT pattern
 * - Derives confidence_level from sample_size when not explicitly provided
 * - Returns structured result: { seeded, skipped, errors }
 * - Structured logging via @repo/logger with domain 'affinity_seeder'
 *
 * @module pipeline/affinity-seeder
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { CONFIDENCE_THRESHOLDS } from './model-router.js'

// ============================================================================
// Schemas (AC-12, AC-13)
// ============================================================================

/**
 * AC-12: Schema for a single manual affinity seed entry.
 */
export const ManualAffinitySeedEntrySchema = z.object({
  model: z.string().min(1),
  change_type: z.string().min(1),
  file_type: z.string().min(1),
  success_rate: z.number().min(0).max(1),
  sample_size: z.number().int().min(0),
  confidence_level: z.enum(['none', 'low', 'medium', 'high']).optional(),
})

export type ManualAffinitySeedEntry = z.infer<typeof ManualAffinitySeedEntrySchema>

/**
 * AC-13: Schema for individual seed import errors.
 */
export const SeedImportErrorSchema = z.object({
  entry: ManualAffinitySeedEntrySchema,
  reason: z.string(),
})

export type SeedImportError = z.infer<typeof SeedImportErrorSchema>

/**
 * AC-13: Schema for the result of a seed import operation.
 */
export const SeedImportResultSchema = z.object({
  seeded: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(SeedImportErrorSchema),
})

export type SeedImportResult = z.infer<typeof SeedImportResultSchema>

// ============================================================================
// Db interface (minimal shape needed for upsert)
// ============================================================================

/**
 * Minimal DB interface needed for affinity upsert.
 * Compatible with Drizzle or any query executor that accepts raw SQL.
 */
export const DbSchema = z.object({
  execute: z.function().args(z.any()).returns(z.promise(z.any())),
})

export type Db = z.infer<typeof DbSchema>

// ============================================================================
// Helpers
// ============================================================================

/**
 * AC-6: Derive confidence_level from sample_size using CONFIDENCE_THRESHOLDS.
 * Rules:
 *   sample_size >= high threshold → 'high'
 *   sample_size >= medium threshold → 'medium'
 *   sample_size >= low threshold → 'low'
 *   otherwise → 'none'
 */
export function deriveConfidenceLevel(sampleSize: number): 'none' | 'low' | 'medium' | 'high' {
  if (sampleSize >= CONFIDENCE_THRESHOLDS.high) return 'high'
  if (sampleSize >= CONFIDENCE_THRESHOLDS.medium) return 'medium'
  if (sampleSize >= CONFIDENCE_THRESHOLDS.low) return 'low'
  return 'none'
}

// ============================================================================
// importAffinitySeeds (AC-5)
// ============================================================================

/**
 * AC-5: Import manual affinity seed entries into wint.model_affinity.
 *
 * Uses ON CONFLICT (change_type, file_type) DO UPDATE pattern.
 * Seeds are validated via Zod before upsert; invalid entries are counted as errors.
 *
 * AC-6: confidence_level is derived from sample_size when not explicitly provided.
 *
 * @param seeds - Array of seed entries to upsert
 * @param db - Database executor with execute(sql) method
 * @returns SeedImportResult with counts of seeded, skipped, and errored entries
 */
export async function importAffinitySeeds(
  seeds: ManualAffinitySeedEntry[],
  db: Db,
): Promise<SeedImportResult> {
  let seeded = 0
  let skipped = 0
  const errors: SeedImportError[] = []

  logger.info('affinity_seeder', {
    event: 'seed_import_started',
    total: seeds.length,
  })

  for (const rawEntry of seeds) {
    // Validate entry shape
    const parseResult = ManualAffinitySeedEntrySchema.safeParse(rawEntry)
    if (!parseResult.success) {
      errors.push({
        entry: rawEntry,
        reason: parseResult.error.message,
      })
      logger.warn('affinity_seeder', {
        event: 'seed_entry_invalid',
        entry: rawEntry,
        reason: parseResult.error.message,
      })
      continue
    }

    const entry = parseResult.data

    // AC-6: Derive confidence_level if not explicitly provided
    const confidenceLevel = entry.confidence_level ?? deriveConfidenceLevel(entry.sample_size)

    try {
      await db.execute({
        sql: `
          INSERT INTO analytics.model_affinity
            (model, change_type, file_type, success_rate, sample_size, confidence_level)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (model, change_type, file_type)
          DO UPDATE SET
            success_rate = EXCLUDED.success_rate,
            sample_size = EXCLUDED.sample_size,
            confidence_level = EXCLUDED.confidence_level,
            updated_at = NOW()
        `,
        params: [
          entry.model,
          entry.change_type,
          entry.file_type,
          entry.success_rate,
          entry.sample_size,
          confidenceLevel,
        ],
      })

      seeded++

      logger.info('affinity_seeder', {
        event: 'seed_entry_upserted',
        model: entry.model,
        change_type: entry.change_type,
        file_type: entry.file_type,
        confidence_level: confidenceLevel,
        sample_size: entry.sample_size,
      })
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      errors.push({ entry, reason })
      skipped++

      logger.warn('affinity_seeder', {
        event: 'seed_entry_failed',
        model: entry.model,
        change_type: entry.change_type,
        file_type: entry.file_type,
        reason,
      })
    }
  }

  logger.info('affinity_seeder', {
    event: 'seed_import_complete',
    seeded,
    skipped,
    errors: errors.length,
  })

  return { seeded, skipped, errors }
}

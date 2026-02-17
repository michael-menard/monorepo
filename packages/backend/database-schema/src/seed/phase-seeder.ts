import { logger } from '@repo/logger'
import { z } from 'zod'
import { phases, insertPhaseSchema } from '../schema/index.js'
import { parseStoriesIndex } from './parsers/index-parser.js'

export const SeedResultSchema = z.object({
  success: z.boolean(),
  rowCount: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
})

export type SeedResult = z.infer<typeof SeedResultSchema>

/**
 * Seeds wint.phases table with 8 workflow phases
 * @param tx - Database transaction
 * @param indexPath - Absolute path to stories.index.md
 * @returns Seed result with row count and warnings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedPhases(tx: any, indexPath: string): Promise<SeedResult> {
  const warnings: string[] = []

  try {
    // Parse phase data from stories.index.md
    const phaseData = await parseStoriesIndex(indexPath)

    // Validate each phase with Zod schema
    const validatedPhases: z.infer<typeof insertPhaseSchema>[] = []
    for (const phase of phaseData) {
      const result = insertPhaseSchema.safeParse(phase)
      if (!result.success) {
        const warning = `Phase ${phase.id} validation failed: ${result.error.message}`
        logger.warn(warning, { phase, errors: result.error.issues })
        warnings.push(warning)
        continue
      }
      validatedPhases.push(result.data)
    }

    if (validatedPhases.length === 0) {
      throw new Error('No valid phases to seed')
    }

    // Delete existing phases (idempotency: DELETE + INSERT)
    await tx.delete(phases)
    logger.info('Deleted existing phases')

    // Insert new phases
    const inserted = await tx.insert(phases).values(validatedPhases).returning()

    logger.info('Seeded phases', {
      rowCount: inserted.length,
      phases: inserted.map(p => `${p.id}: ${p.phaseName}`),
    })

    return {
      success: true,
      rowCount: inserted.length,
      warnings,
    }
  } catch (err) {
    const error = err as Error
    logger.error('Phase seeding failed', { error: error.message })
    throw error
  }
}

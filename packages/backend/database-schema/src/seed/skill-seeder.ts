import { glob } from 'glob'
import { logger } from '@repo/logger'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { skills, insertSkillSchema } from '../schema/index.js'
import { extractSkillMetadata } from './parsers/metadata-extractor.js'
import type { SeedResult } from './phase-seeder.js'

/**
 * Seeds wint.skills table with skill metadata from skill directories
 * @param tx - Database transaction
 * @param skillsDir - Absolute path to skills directory
 * @returns Seed result with row count and warnings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedSkills(tx: any, skillsDir: string): Promise<SeedResult> {
  const warnings: string[] = []

  try {
    // Find all subdirectories in skills directory
    const skillDirs = await glob('*/', { cwd: skillsDir, absolute: true })
    logger.info('Found skill directories', { count: skillDirs.length })

    if (skillDirs.length === 0) {
      const warning = 'No skill directories found'
      logger.warn(warning, { directory: skillsDir })
      warnings.push(warning)
      return { success: true, rowCount: 0, warnings }
    }

    // Extract metadata from skill directories
    const skillMetadata = await extractSkillMetadata(skillDirs)

    // Validate each skill with Zod schema
    const validatedSkills: z.infer<typeof insertSkillSchema>[] = []
    for (const skill of skillMetadata) {
      const result = insertSkillSchema.safeParse(skill)
      if (!result.success) {
        const warning = `Skill ${skill.name} validation failed: ${result.error.message}`
        logger.warn(warning, { skill, errors: result.error.issues })
        warnings.push(warning)
        continue
      }
      validatedSkills.push(result.data)
    }

    if (validatedSkills.length === 0) {
      const warning = 'No valid skills to seed'
      logger.warn(warning)
      warnings.push(warning)
      return { success: true, rowCount: 0, warnings }
    }

    // UPSERT skills (idempotency: ON CONFLICT DO UPDATE)
    const inserted = await tx
      .insert(skills)
      .values(validatedSkills)
      .onConflictDoUpdate({
        target: skills.name,
        set: {
          description: sql`EXCLUDED.description`,
          capabilities: sql`EXCLUDED.capabilities`,
          metadata: sql`EXCLUDED.metadata`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning()

    logger.info('Seeded skills', {
      rowCount: inserted.length,
      skills: inserted.map(s => s.name),
    })

    return {
      success: true,
      rowCount: inserted.length,
      warnings,
    }
  } catch (err) {
    const error = err as Error
    logger.error('Skill seeding failed', { error: error.message })
    throw error
  }
}

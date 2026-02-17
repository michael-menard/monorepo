import { glob } from 'glob'
import { logger } from '@repo/logger'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { commands, insertCommandSchema } from '../schema/index.js'
import { extractCommandMetadata } from './parsers/metadata-extractor.js'
import type { SeedResult } from './phase-seeder.js'

/**
 * Seeds wint.commands table with command metadata
 * @param tx - Database transaction
 * @param commandsDir - Absolute path to commands directory
 * @returns Seed result with row count and warnings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedCommands(tx: any, commandsDir: string): Promise<SeedResult> {
  const warnings: string[] = []

  try {
    // Find all .md files in commands directory
    const commandFiles = await glob('**/*.md', { cwd: commandsDir, absolute: true })
    logger.info('Found command files', { count: commandFiles.length })

    if (commandFiles.length === 0) {
      const warning = 'No command files found'
      logger.warn(warning, { directory: commandsDir })
      warnings.push(warning)
      return { success: true, rowCount: 0, warnings }
    }

    // Extract metadata from command files
    const commandMetadata = await extractCommandMetadata(commandFiles)

    // Validate each command with Zod schema
    const validatedCommands: z.infer<typeof insertCommandSchema>[] = []
    for (const command of commandMetadata) {
      const result = insertCommandSchema.safeParse(command)
      if (!result.success) {
        const warning = `Command ${command.name} validation failed: ${result.error.message}`
        logger.warn(warning, { command, errors: result.error.issues })
        warnings.push(warning)
        continue
      }
      validatedCommands.push(result.data)
    }

    if (validatedCommands.length === 0) {
      const warning = 'No valid commands to seed'
      logger.warn(warning)
      warnings.push(warning)
      return { success: true, rowCount: 0, warnings }
    }

    // UPSERT commands (idempotency: ON CONFLICT DO UPDATE)
    const inserted = await tx
      .insert(commands)
      .values(validatedCommands)
      .onConflictDoUpdate({
        target: commands.name,
        set: {
          description: sql`EXCLUDED.description`,
          triggers: sql`EXCLUDED.triggers`,
          metadata: sql`EXCLUDED.metadata`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning()

    logger.info('Seeded commands', {
      rowCount: inserted.length,
      commands: inserted.map(c => c.name),
    })

    return {
      success: true,
      rowCount: inserted.length,
      warnings,
    }
  } catch (err) {
    const error = err as Error
    logger.error('Command seeding failed', { error: error.message })
    throw error
  }
}

import { glob } from 'glob'
import { logger } from '@repo/logger'
import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { agents, insertAgentSchema } from '../schema/index.js'
import { extractAgentMetadata } from './parsers/metadata-extractor.js'
import type { SeedResult } from './phase-seeder.js'

/**
 * Seeds wint.agents table with agent metadata from .agent.md files
 * @param tx - Database transaction
 * @param agentsDir - Absolute path to agents directory
 * @returns Seed result with row count and warnings
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function seedAgents(tx: any, agentsDir: string): Promise<SeedResult> {
  const warnings: string[] = []

  try {
    // Find all .agent.md files
    const agentFiles = await glob('**/*.agent.md', { cwd: agentsDir, absolute: true })
    logger.info('Found agent files', { count: agentFiles.length })

    if (agentFiles.length === 0) {
      const warning = 'No agent files found'
      logger.warn(warning, { directory: agentsDir })
      warnings.push(warning)
      return { success: true, rowCount: 0, warnings }
    }

    // Extract metadata from agent files
    const agentMetadata = await extractAgentMetadata(agentFiles)

    // Validate each agent with Zod schema
    const validatedAgents: z.infer<typeof insertAgentSchema>[] = []
    for (const agent of agentMetadata) {
      const result = insertAgentSchema.safeParse(agent)
      if (!result.success) {
        const warning = `Agent ${agent.name} validation failed: ${result.error.message}`
        logger.warn(warning, { agent, errors: result.error.issues })
        warnings.push(warning)
        continue
      }
      validatedAgents.push(result.data)
    }

    if (validatedAgents.length === 0) {
      const warning = 'No valid agents to seed'
      logger.warn(warning)
      warnings.push(warning)
      return { success: true, rowCount: 0, warnings }
    }

    // UPSERT agents (idempotency: ON CONFLICT DO UPDATE)
    const inserted = await tx
      .insert(agents)
      .values(validatedAgents)
      .onConflictDoUpdate({
        target: agents.name,
        set: {
          agentType: sql`EXCLUDED.agent_type`,
          permissionLevel: sql`EXCLUDED.permission_level`,
          model: sql`EXCLUDED.model`,
          spawnedBy: sql`EXCLUDED.spawned_by`,
          triggers: sql`EXCLUDED.triggers`,
          skillsUsed: sql`EXCLUDED.skills_used`,
          metadata: sql`EXCLUDED.metadata`,
          updatedAt: sql`NOW()`,
        },
      })
      .returning()

    logger.info('Seeded agents', {
      rowCount: inserted.length,
      agents: inserted.map(a => a.name),
    })

    return {
      success: true,
      rowCount: inserted.length,
      warnings,
    }
  } catch (err) {
    const error = err as Error
    logger.error('Agent seeding failed', { error: error.message })
    throw error
  }
}

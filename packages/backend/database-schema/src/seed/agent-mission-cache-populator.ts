#!/usr/bin/env node

/**
 * Agent Mission Cache Populator
 * WINT-2040: Populate wint.context_packs with agent mission summaries
 *
 * Discovers all non-archived .agent.md files from .claude/agents/,
 * extracts mission/scope/signals from frontmatter and body content,
 * and upserts compact mission summaries into wint.context_packs.
 *
 * AC-1:  Discovers all non-archived .agent.md files
 * AC-2:  Extracts per-agent: name, type, permissionLevel, model, spawnedBy, triggers, skillsUsed, mission, scope
 * AC-3:  Stores in wint.context_packs with packType='agent_missions', deterministic packKey
 * AC-4:  Idempotent — onConflictDoUpdate on (packType, packKey)
 * AC-5:  Skips malformed files with warning, continues processing
 * AC-6:  Excludes _archive/ directory
 * AC-7:  All types are Zod-validated schemas
 * AC-8:  Returns { totalFound, cached, skipped, warnings }
 */

import { fileURLToPath } from 'url'
import path from 'path'
import { glob } from 'glob'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { z } from 'zod'
import { contextPacks } from '../schema/wint.js'
import { parseFrontmatter } from './parsers/frontmatter-parser.js'
import { extractAgentMetadata } from './parsers/metadata-extractor.js'
import { extractMissionSummary } from './parsers/mission-extractor.js'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Result schema for population run — AC-8
 */
export const PopulateResultSchema = z.object({
  totalFound: z.number().int().nonnegative(),
  cached: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
})

export type PopulateResult = z.infer<typeof PopulateResultSchema>

/**
 * Agent mission content JSONB schema — AC-12
 * Widened type to accommodate agent mission shape without TS compilation errors
 */
export const AgentMissionContentSchema = z.object({
  mission: z.string().max(200).nullable(),
  role: z.string().nullable(),
  scope: z.string().nullable(),
  triggers: z.array(z.string()).nullable(),
  model: z.string().nullable(),
  permissionLevel: z.string(),
  spawnedBy: z.array(z.string()).nullable(),
})

export type AgentMissionContent = z.infer<typeof AgentMissionContentSchema>

// ============================================================================
// Core function
// ============================================================================

/**
 * Populate wint.context_packs with agent mission summaries.
 *
 * @param agentsDir - Absolute path to .claude/agents/ directory
 * @param db - Drizzle database instance (for testability — dependency injection)
 * @returns PopulateResult with counts and warnings
 */

export async function populateAgentMissionCache(
  agentsDir: string,
  db: any,
): Promise<PopulateResult> {
  const warnings: string[] = []
  let cached = 0
  let skipped = 0

  // AC-1, AC-6: Discover all .agent.md files, excluding _archive/ directory
  const agentFiles = await glob('**/*.agent.md', {
    cwd: agentsDir,
    absolute: true,
    ignore: ['**/_archive/**'],
  })

  const totalFound = agentFiles.length
  logger.info('Agent mission cache: discovered files', { totalFound, agentsDir })

  if (totalFound === 0) {
    const warning = 'No .agent.md files found — check agentsDir path'
    logger.warn(warning, { agentsDir })
    warnings.push(warning)
    return PopulateResultSchema.parse({ totalFound: 0, cached: 0, skipped: 0, warnings })
  }

  // Process each agent file
  for (const filePath of agentFiles) {
    const packKey = path.basename(filePath, '.agent.md')

    try {
      // AC-2: Parse frontmatter and extract metadata
      const parseResult = await parseFrontmatter(filePath)
      if (!parseResult) {
        const warning = `${packKey}: frontmatter parse failed — skipping`
        logger.warn(warning, { file: filePath })
        warnings.push(warning)
        skipped++
        continue
      }

      const { data, content: body } = parseResult

      // Extract agent metadata from frontmatter
      const metadataResult = await extractAgentMetadata([filePath])
      if (metadataResult.length === 0) {
        const frontmatter = data as Record<string, unknown>
        const warning = `${packKey}: missing required frontmatter fields (type, permission_level) — skipping`
        logger.warn(warning, { file: filePath, frontmatter })
        warnings.push(warning)
        skipped++
        continue
      }

      const agentMeta = metadataResult[0]

      // AC-2: Extract mission summary from body content
      const missionSummary = extractMissionSummary(body)

      if (!missionSummary.mission && !missionSummary.role && !missionSummary.scope) {
        const warning = `${packKey}: no Mission/Role/Scope section found — writing with null mission`
        logger.warn(warning, { file: filePath })
        warnings.push(warning)
        // Still write the entry per EC-2: entry still written with null mission
      }

      // AC-3: Build content JSONB with compact mission summary
      const content: AgentMissionContent = AgentMissionContentSchema.parse({
        mission: missionSummary.mission,
        role: missionSummary.role,
        scope: missionSummary.scope,
        triggers: missionSummary.triggers ?? agentMeta.triggers,
        model: agentMeta.model,
        permissionLevel: agentMeta.permissionLevel,
        spawnedBy: agentMeta.spawnedBy,
      })

      // AC-3, AC-4: Upsert to wint.context_packs with onConflictDoUpdate
      await db
        .insert(contextPacks)
        .values({
          packType: 'agent_missions' as const,
          packKey,
          content,
          version: 1,
          hitCount: 0,
        })
        .onConflictDoUpdate({
          target: [contextPacks.packType, contextPacks.packKey],
          set: {
            content,
            version: 1,
            updatedAt: sql`NOW()`,
          },
        })

      cached++
      logger.info('Cached agent mission', { packKey, hasMission: !!missionSummary.mission })
    } catch (err) {
      // AC-5: Skip with warning, continue processing
      const error = err as Error
      const warning = `${packKey}: failed to process — ${error.message}`
      logger.warn(warning, { file: filePath, error: error.message })
      warnings.push(warning)
      skipped++
    }
  }

  const result = PopulateResultSchema.parse({ totalFound, cached, skipped, warnings })

  logger.info('Agent mission cache population complete', {
    totalFound: result.totalFound,
    cached: result.cached,
    skipped: result.skipped,
    warningCount: result.warnings.length,
    successRate:
      result.totalFound > 0 ? ((result.cached / result.totalFound) * 100).toFixed(1) + '%' : 'N/A',
  })

  return result
}

// ============================================================================
// CLI entry point (standalone execution)
// ============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.resolve(__dirname, '../../../../..')
const agentsDir = path.join(monorepoRoot, '.claude/agents')

/**
 * Create a database connection for standalone execution.
 * Uses environment variables or defaults to local KB PostgreSQL (port 5433).
 */
function createDb() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5433', 10),
    user: process.env.POSTGRES_USERNAME ?? process.env.POSTGRES_USER ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
    database: process.env.POSTGRES_DATABASE ?? process.env.POSTGRES_DB ?? 'wint',
  })
  return drizzle(pool)
}

// Run if executed directly (not imported)
const isMain =
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1]?.endsWith('agent-mission-cache-populator.ts') ||
  process.argv[1]?.endsWith('agent-mission-cache-populator.js')

if (isMain) {
  const db = createDb()

  populateAgentMissionCache(agentsDir, db)
    .then(result => {
      logger.info('Done', result)
      process.exit(0)
    })
    .catch(err => {
      logger.error('Population failed', { error: (err as Error).message })
      process.exit(1)
    })
}

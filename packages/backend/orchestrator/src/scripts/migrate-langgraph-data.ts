#!/usr/bin/env npx tsx
/**
 * LangGraph to WINT Data Migration Script
 *
 * Migrates existing data from LangGraph database (port 5433, public schema)
 * to the unified WINT schema (port 5432, wint schema).
 *
 * Tables migrated:
 * - public.stories       → wint.stories       (with enum normalization)
 * - public.features      → wint.features       (name → feature_name)
 * - public.workflow_events → wint.state_transitions (state_change_* events only)
 *
 * Usage:
 * ```bash
 * # Dry-run (default, no writes)
 * npx tsx migrate-langgraph-data.ts --dry-run
 * npx tsx migrate-langgraph-data.ts
 *
 * # Execute actual migration
 * npx tsx migrate-langgraph-data.ts --execute
 *
 * # Verbose output
 * npx tsx migrate-langgraph-data.ts --execute --verbose
 *
 * # Custom batch size
 * npx tsx migrate-langgraph-data.ts --execute --batch-size=100
 * ```
 *
 * Safety:
 * - Dry-run mode by default (requires --execute to write)
 * - UPSERT with ON CONFLICT DO NOTHING (idempotent)
 * - Fail-soft: individual record errors don't stop batch
 * - Writes migration-log.json with complete audit trail
 *
 * Story: WINT-1110
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import {
  type MigrationCliOptions,
  type Wint1110MigrationLog,
  type MigrationPhaseResult,
  type LangGraphStoryRow,
  type LangGraphFeatureRow,
  type LangGraphWorkflowEventRow,
  Wint1110MigrationLogSchema,
  LangGraphStoryRowSchema,
  LangGraphFeatureRowSchema,
  LangGraphWorkflowEventRowSchema,
  mapLangGraphStoryToWint,
  mapLangGraphFeatureToWint,
  mapWorkflowEventToStateTransition,
} from './__types__/migration.js'

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_BATCH_SIZE = 50

// ============================================================================
// CLI Argument Parsing
// ============================================================================

/**
 * Parse CLI arguments from process.argv
 */
export function parseArgs(): MigrationCliOptions {
  const args = process.argv.slice(2)

  const dryRun = !args.includes('--execute')
  const verbose = args.includes('--verbose')

  const batchSizeArg = args.find(a => a.startsWith('--batch-size='))
  const batchSize = batchSizeArg
    ? parseInt(batchSizeArg.split('=')[1] ?? String(DEFAULT_BATCH_SIZE), 10)
    : DEFAULT_BATCH_SIZE

  return {
    dryRun,
    verbose,
    batchSize: isNaN(batchSize) || batchSize < 1 ? DEFAULT_BATCH_SIZE : batchSize,
  }
}

// ============================================================================
// Database Connection Factories
// ============================================================================

/**
 * Create database pool for the WINT target database (port 5432)
 */
export function createWintPool(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  })
}

/**
 * Create database pool for the LangGraph source database (port 5433)
 */
export function createLangGraphPool(): Pool {
  return new Pool({
    host: process.env.LANGGRAPH_DB_HOST || 'localhost',
    port: parseInt(process.env.LANGGRAPH_DB_PORT || '5433'),
    database: process.env.LANGGRAPH_DB_NAME || 'postgres',
    user: process.env.LANGGRAPH_DB_USER || 'postgres',
    password: process.env.LANGGRAPH_DB_PASSWORD || 'postgres',
  })
}

/**
 * Test database connectivity before running migration.
 * Returns true if connection succeeds, false otherwise.
 */
export async function testConnection(pool: Pool, label: string): Promise<boolean> {
  try {
    const result = await pool.query<{ now: Date }>('SELECT NOW() as now')
    logger.info(`${label} connection successful`, { serverTime: result.rows[0].now })
    return true
  } catch (error) {
    logger.error(`${label} connection failed`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

// ============================================================================
// Phase 1: Migrate Stories
// ============================================================================

/**
 * Query all stories from LangGraph public.stories
 */
async function queryLangGraphStories(langGraphPool: Pool): Promise<LangGraphStoryRow[]> {
  const result = await langGraphPool.query<Record<string, unknown>>(`
    SELECT
      id::text, story_id, feature_id::text, state, type, title, goal,
      non_goals, packages, surfaces, blocked_by, depends_on, follow_up_from,
      priority, created_at, updated_at
    FROM public.stories
    ORDER BY created_at ASC
  `)

  return result.rows.map(row => LangGraphStoryRowSchema.parse(row))
}

/**
 * Insert a single story into wint.stories using UPSERT
 */
async function insertWintStory(
  wintPool: Pool,
  row: LangGraphStoryRow,
): Promise<'inserted' | 'skipped'> {
  const story = mapLangGraphStoryToWint(row)

  const sql = `
    INSERT INTO wint.stories (
      story_id, feature_id, type, state, title, goal, points, priority,
      blocked_by, depends_on, follow_up_from, packages, surfaces,
      non_goals, created_at, updated_at
    ) VALUES ($1, $2, $3, $4::wint.story_state, $5, $6, $7, $8::wint.priority_level, $9, $10, $11, $12, $13, $14, $15, $16)
    ON CONFLICT (story_id) DO NOTHING
  `

  const queryResult = await wintPool.query(sql, [
    story.story_id,
    story.feature_id,
    story.type,
    story.state,
    story.title,
    story.goal,
    story.points,
    story.priority,
    story.blocked_by,
    story.depends_on,
    story.follow_up_from,
    story.packages,
    story.surfaces,
    story.non_goals,
    story.created_at,
    story.updated_at,
  ])

  return queryResult.rowCount === 0 ? 'skipped' : 'inserted'
}

/**
 * Migrate all stories from LangGraph to WINT
 */
export async function migrateStories(
  wintPool: Pool,
  langGraphPool: Pool,
  options: MigrationCliOptions,
): Promise<MigrationPhaseResult & { migratedIds: string[] }> {
  logger.info('Starting story migration phase')

  let rows: LangGraphStoryRow[]
  try {
    rows = await queryLangGraphStories(langGraphPool)
  } catch (error) {
    logger.error('Failed to query LangGraph stories', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      total_queried: 0,
      inserted_count: 0,
      skipped_count: 0,
      error_count: 1,
      errors: [
        {
          id: 'query',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      ],
      migratedIds: [],
    }
  }

  logger.info('Queried LangGraph stories', { count: rows.length })

  if (options.dryRun) {
    logger.info('[DRY-RUN] Would migrate stories', { count: rows.length })
    return {
      total_queried: rows.length,
      inserted_count: 0,
      skipped_count: rows.length,
      error_count: 0,
      errors: [],
      migratedIds: [],
    }
  }

  let insertedCount = 0
  let skippedCount = 0
  const errors: Array<{ id: string; error: string; timestamp: string }> = []
  const migratedIds: string[] = []

  for (let i = 0; i < rows.length; i += options.batchSize) {
    const batch = rows.slice(i, i + options.batchSize)

    for (const row of batch) {
      try {
        const outcome = await insertWintStory(wintPool, row)
        if (outcome === 'inserted') {
          insertedCount++
          migratedIds.push(row.story_id)
          if (options.verbose) {
            logger.info('Story migrated', { storyId: row.story_id, state: row.state })
          }
        } else {
          skippedCount++
          if (options.verbose) {
            logger.info('Story skipped (already exists)', { storyId: row.story_id })
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push({
          id: row.story_id,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        })
        logger.warn('Failed to migrate story', { storyId: row.story_id, error: errorMsg })
      }
    }

    logger.info('Story batch complete', {
      batchStart: i,
      batchEnd: Math.min(i + options.batchSize, rows.length),
      total: rows.length,
    })
  }

  logger.info('Story migration phase complete', {
    total: rows.length,
    inserted: insertedCount,
    skipped: skippedCount,
    errors: errors.length,
  })

  return {
    total_queried: rows.length,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
    error_count: errors.length,
    errors,
    migratedIds,
  }
}

// ============================================================================
// Phase 2: Migrate Features
// ============================================================================

/**
 * Query all features from LangGraph public.features
 */
async function queryLangGraphFeatures(langGraphPool: Pool): Promise<LangGraphFeatureRow[]> {
  const result = await langGraphPool.query<Record<string, unknown>>(`
    SELECT id::text, name, description, created_at
    FROM public.features
    ORDER BY created_at ASC
  `)

  return result.rows.map(row => LangGraphFeatureRowSchema.parse(row))
}

/**
 * Insert a single feature into wint.features using UPSERT
 */
async function insertWintFeature(
  wintPool: Pool,
  row: LangGraphFeatureRow,
): Promise<'inserted' | 'skipped'> {
  const feature = mapLangGraphFeatureToWint(row)

  const sql = `
    INSERT INTO wint.features (
      feature_name, feature_type, description, is_active, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (feature_name) DO NOTHING
  `

  const queryResult = await wintPool.query(sql, [
    feature.feature_name,
    feature.feature_type,
    feature.description,
    feature.is_active,
    feature.created_at,
    feature.updated_at,
  ])

  return queryResult.rowCount === 0 ? 'skipped' : 'inserted'
}

/**
 * Migrate all features from LangGraph to WINT
 */
export async function migrateFeatures(
  wintPool: Pool,
  langGraphPool: Pool,
  options: MigrationCliOptions,
): Promise<MigrationPhaseResult & { migratedNames: string[] }> {
  logger.info('Starting feature migration phase')

  let rows: LangGraphFeatureRow[]
  try {
    rows = await queryLangGraphFeatures(langGraphPool)
  } catch (error) {
    logger.error('Failed to query LangGraph features', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      total_queried: 0,
      inserted_count: 0,
      skipped_count: 0,
      error_count: 1,
      errors: [
        {
          id: 'query',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      ],
      migratedNames: [],
    }
  }

  logger.info('Queried LangGraph features', { count: rows.length })

  if (options.dryRun) {
    logger.info('[DRY-RUN] Would migrate features', { count: rows.length })
    return {
      total_queried: rows.length,
      inserted_count: 0,
      skipped_count: rows.length,
      error_count: 0,
      errors: [],
      migratedNames: [],
    }
  }

  let insertedCount = 0
  let skippedCount = 0
  const errors: Array<{ id: string; error: string; timestamp: string }> = []
  const migratedNames: string[] = []

  for (let i = 0; i < rows.length; i += options.batchSize) {
    const batch = rows.slice(i, i + options.batchSize)

    for (const row of batch) {
      try {
        const outcome = await insertWintFeature(wintPool, row)
        if (outcome === 'inserted') {
          insertedCount++
          migratedNames.push(row.name)
          if (options.verbose) {
            logger.info('Feature migrated', { featureName: row.name })
          }
        } else {
          skippedCount++
          if (options.verbose) {
            logger.info('Feature skipped (already exists)', { featureName: row.name })
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push({
          id: row.name,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        })
        logger.warn('Failed to migrate feature', { featureName: row.name, error: errorMsg })
      }
    }
  }

  logger.info('Feature migration phase complete', {
    total: rows.length,
    inserted: insertedCount,
    skipped: skippedCount,
    errors: errors.length,
  })

  return {
    total_queried: rows.length,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
    error_count: errors.length,
    errors,
    migratedNames,
  }
}

// ============================================================================
// Phase 3: Migrate Workflow Events → State Transitions
// ============================================================================

/**
 * Query state_change workflow events from LangGraph public.workflow_events
 */
async function queryLangGraphStateChangeEvents(
  langGraphPool: Pool,
): Promise<LangGraphWorkflowEventRow[]> {
  const result = await langGraphPool.query<Record<string, unknown>>(`
    SELECT id::text, entity_type, entity_id::text, event_type,
           old_value, new_value, actor, created_at
    FROM public.workflow_events
    WHERE event_type LIKE 'state_change_%'
    ORDER BY created_at ASC
  `)

  return result.rows.map(row => LangGraphWorkflowEventRowSchema.parse(row))
}

/**
 * Insert a state transition into wint.state_transitions
 */
async function insertWintStateTransition(
  wintPool: Pool,
  row: LangGraphWorkflowEventRow,
): Promise<'inserted' | 'skipped'> {
  const transition = mapWorkflowEventToStateTransition(row)

  if (!transition) {
    return 'skipped'
  }

  const sql = `
    INSERT INTO wint.state_transitions (
      entity_type, entity_id, from_state, to_state, triggered_by,
      reason, metadata, transitioned_at, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  `

  await wintPool.query(sql, [
    transition.entity_type,
    transition.entity_id,
    transition.from_state,
    transition.to_state,
    transition.triggered_by,
    transition.reason,
    transition.metadata ? JSON.stringify(transition.metadata) : null,
    transition.transitioned_at,
  ])

  return 'inserted'
}

/**
 * Migrate state_change workflow events from LangGraph to WINT state_transitions
 */
export async function migrateStateTransitions(
  wintPool: Pool,
  langGraphPool: Pool,
  options: MigrationCliOptions,
): Promise<MigrationPhaseResult> {
  logger.info('Starting state transitions migration phase')

  let rows: LangGraphWorkflowEventRow[]
  try {
    rows = await queryLangGraphStateChangeEvents(langGraphPool)
  } catch (error) {
    logger.error('Failed to query LangGraph workflow events', {
      error: error instanceof Error ? error.message : String(error),
    })
    return {
      total_queried: 0,
      inserted_count: 0,
      skipped_count: 0,
      error_count: 1,
      errors: [
        {
          id: 'query',
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
        },
      ],
    }
  }

  logger.info('Queried LangGraph state_change events', { count: rows.length })

  if (options.dryRun) {
    logger.info('[DRY-RUN] Would migrate state transitions', { count: rows.length })
    return {
      total_queried: rows.length,
      inserted_count: 0,
      skipped_count: rows.length,
      error_count: 0,
      errors: [],
    }
  }

  let insertedCount = 0
  let skippedCount = 0
  const errors: Array<{ id: string; error: string; timestamp: string }> = []

  for (let i = 0; i < rows.length; i += options.batchSize) {
    const batch = rows.slice(i, i + options.batchSize)

    for (const row of batch) {
      try {
        const outcome = await insertWintStateTransition(wintPool, row)
        if (outcome === 'inserted') {
          insertedCount++
          if (options.verbose) {
            logger.info('State transition migrated', { eventId: row.id, eventType: row.event_type })
          }
        } else {
          skippedCount++
          if (options.verbose) {
            logger.info('State transition skipped (unmappable)', { eventId: row.id })
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        errors.push({
          id: row.id,
          error: errorMsg,
          timestamp: new Date().toISOString(),
        })
        logger.warn('Failed to migrate state transition', { eventId: row.id, error: errorMsg })
      }
    }
  }

  logger.info('State transitions migration phase complete', {
    total: rows.length,
    inserted: insertedCount,
    skipped: skippedCount,
    errors: errors.length,
  })

  return {
    total_queried: rows.length,
    inserted_count: insertedCount,
    skipped_count: skippedCount,
    error_count: errors.length,
    errors,
  }
}

// ============================================================================
// Main Migration Orchestration
// ============================================================================

/**
 * Write migration log to migration-log.json
 */
async function writeMigrationLog(log: Wint1110MigrationLog): Promise<void> {
  const logPath = path.join(process.cwd(), 'migration-log.json')
  const validated = Wint1110MigrationLogSchema.parse(log)
  await fs.writeFile(logPath, JSON.stringify(validated, null, 2))
  logger.info('Migration log written', { path: logPath })
}

/**
 * Log a summary of migration results to the console
 */
function logResults(log: Wint1110MigrationLog): void {
  logger.info('=== Migration Results ===', {
    dryRun: log.dry_run,
    startedAt: log.started_at,
    completedAt: log.completed_at,
  })

  logger.info('Stories', {
    total: log.stories.total_queried,
    inserted: log.stories.inserted_count,
    skipped: log.stories.skipped_count,
    errors: log.stories.error_count,
  })

  logger.info('Features', {
    total: log.features.total_queried,
    inserted: log.features.inserted_count,
    skipped: log.features.skipped_count,
    errors: log.features.error_count,
  })

  logger.info('State Transitions', {
    total: log.state_transitions.total_queried,
    inserted: log.state_transitions.inserted_count,
    skipped: log.state_transitions.skipped_count,
    errors: log.state_transitions.error_count,
  })

  const totalErrors =
    log.stories.error_count +
    log.features.error_count +
    log.state_transitions.error_count

  if (totalErrors > 0) {
    logger.warn('Migration completed with errors', { totalErrors })
  } else {
    logger.info('Migration completed successfully', { success: log.success })
  }
}

/**
 * Run the full migration: stories, features, state_transitions
 */
export async function runMigration(
  wintPool: Pool,
  langGraphPool: Pool,
  options: MigrationCliOptions,
): Promise<Wint1110MigrationLog> {
  const startedAt = new Date().toISOString()

  logger.info('Starting LangGraph → WINT migration', {
    dryRun: options.dryRun,
    batchSize: options.batchSize,
    startedAt,
  })

  // Phase 1: Stories
  const storiesResult = await migrateStories(wintPool, langGraphPool, options)

  // Phase 2: Features
  const featuresResult = await migrateFeatures(wintPool, langGraphPool, options)

  // Phase 3: State Transitions
  const stateTransitionsResult = await migrateStateTransitions(wintPool, langGraphPool, options)

  const completedAt = new Date().toISOString()
  const totalErrors =
    storiesResult.error_count + featuresResult.error_count + stateTransitionsResult.error_count

  const log: Wint1110MigrationLog = {
    story_id: 'WINT-1110',
    started_at: startedAt,
    completed_at: completedAt,
    dry_run: options.dryRun,
    stories: {
      total_queried: storiesResult.total_queried,
      inserted_count: storiesResult.inserted_count,
      skipped_count: storiesResult.skipped_count,
      error_count: storiesResult.error_count,
      errors: storiesResult.errors,
    },
    features: {
      total_queried: featuresResult.total_queried,
      inserted_count: featuresResult.inserted_count,
      skipped_count: featuresResult.skipped_count,
      error_count: featuresResult.error_count,
      errors: featuresResult.errors,
    },
    state_transitions: {
      total_queried: stateTransitionsResult.total_queried,
      inserted_count: stateTransitionsResult.inserted_count,
      skipped_count: stateTransitionsResult.skipped_count,
      error_count: stateTransitionsResult.error_count,
      errors: stateTransitionsResult.errors,
    },
    migrated_story_ids: storiesResult.migratedIds,
    migrated_feature_names: featuresResult.migratedNames,
    success: totalErrors === 0,
  }

  return log
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs()

  logger.info('LangGraph to WINT migration script', {
    mode: options.dryRun ? 'dry-run' : 'execute',
    batchSize: options.batchSize,
    verbose: options.verbose,
  })

  if (options.dryRun) {
    logger.info('Running in DRY-RUN mode. No data will be written. Use --execute to migrate.')
  }

  const wintPool = createWintPool()
  const langGraphPool = createLangGraphPool()

  try {
    // Test connectivity before starting
    logger.info('Testing database connections...')
    const wintOk = await testConnection(wintPool, 'WINT database (port 5432)')
    const langGraphOk = await testConnection(langGraphPool, 'LangGraph database (port 5433)')

    if (!wintOk) {
      logger.error('Cannot connect to WINT database. Aborting migration.')
      process.exit(1)
    }

    if (!langGraphOk) {
      logger.warn('Cannot connect to LangGraph database. Migration will produce 0 records.')
    }

    const log = await runMigration(wintPool, langGraphPool, options)

    await writeMigrationLog(log)
    logResults(log)

    if (!log.success) {
      logger.warn('Migration completed with errors. Review migration-log.json.')
      process.exit(1)
    }
  } catch (error) {
    logger.error('Migration failed unexpectedly', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  } finally {
    await wintPool.end()
    await langGraphPool.end()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

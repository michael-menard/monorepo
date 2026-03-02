#!/usr/bin/env npx tsx
/**
 * LangGraph to WINT Migration Rollback Script
 *
 * Provides guidance and safe rollback capability for WINT-1110 migration.
 *
 * Rollback approach:
 * - Reads migration-log.json to find which story_ids and feature_names were migrated
 * - Generates DELETE statements (dry-run mode shows what would be deleted)
 * - Execute mode removes only records that were inserted by the migration
 *
 * Safety:
 * - Requires migration-log.json to be present (identifies what was migrated)
 * - Dry-run by default - shows what would be deleted without executing
 * - Only deletes records present in migration-log.json (not pre-existing WINT data)
 * - Idempotent: safe to run multiple times
 *
 * Usage:
 * ```bash
 * # Preview what would be rolled back (dry-run, default)
 * npx tsx migrate-langgraph-data-rollback.ts --dry-run
 * npx tsx migrate-langgraph-data-rollback.ts
 *
 * # Execute rollback
 * npx tsx migrate-langgraph-data-rollback.ts --execute
 *
 * # Specify custom log file path
 * npx tsx migrate-langgraph-data-rollback.ts --execute --log-file=./custom-migration-log.json
 * ```
 *
 * Story: WINT-1110
 */

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import { z } from 'zod'
import { Wint1110MigrationLogSchema } from './__types__/migration.js'

// ============================================================================
// CLI Argument Parsing
// ============================================================================

const RollbackCliOptionsSchema = z.object({
  dryRun: z.boolean(),
  logFilePath: z.string(),
  verbose: z.boolean(),
})
type RollbackCliOptions = z.infer<typeof RollbackCliOptionsSchema>

function parseRollbackArgs(): RollbackCliOptions {
  const args = process.argv.slice(2)

  const dryRun = !args.includes('--execute')
  const verbose = args.includes('--verbose')

  const logFileArg = args.find(a => a.startsWith('--log-file='))
  const logFilePath = logFileArg
    ? (logFileArg.split('=')[1] ?? path.join(process.cwd(), 'migration-log.json'))
    : path.join(process.cwd(), 'migration-log.json')

  return { dryRun, logFilePath, verbose }
}

// ============================================================================
// Database Connection
// ============================================================================

function createWintPool(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  })
}

// ============================================================================
// Rollback Result Schemas
// ============================================================================

const RollbackResultSchema = z.object({
  started_at: z.string(),
  completed_at: z.string().nullable(),
  dry_run: z.boolean(),
  log_file_path: z.string(),
  state_transitions_deleted: z.number().int(),
  stories_deleted: z.number().int(),
  features_deleted: z.number().int(),
  errors: z.array(
    z.object({
      phase: z.string(),
      error: z.string(),
      timestamp: z.string(),
    }),
  ),
  success: z.boolean(),
})
type RollbackResult = z.infer<typeof RollbackResultSchema>

// ============================================================================
// Rollback Logic
// ============================================================================

/**
 * Read and validate the migration log from disk
 */
async function readMigrationLog(logFilePath: string) {
  try {
    const raw = await fs.readFile(logFilePath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown
    return Wint1110MigrationLogSchema.parse(parsed)
  } catch (error) {
    throw new Error(
      `Failed to read migration log at ${logFilePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Delete state transitions that were inserted from LangGraph
 * These are identified by the metadata.source = 'langgraph_migration' marker
 */
async function rollbackStateTransitions(
  pool: Pool,
  storyIds: string[],
  dryRun: boolean,
): Promise<number> {
  if (storyIds.length === 0) {
    logger.info('No story IDs to roll back state transitions for')
    return 0
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM wint.state_transitions
     WHERE (metadata->>'source') = 'langgraph_migration'
       AND entity_id = ANY($1)`,
    [storyIds],
  )
  const count = parseInt(countResult.rows[0].count)

  logger.info('State transitions to roll back', { count, entityIds: storyIds.length })

  if (dryRun) {
    logger.info('[DRY-RUN] Would delete state transitions', { count })
    return count
  }

  const deleteResult = await pool.query(
    `DELETE FROM wint.state_transitions
     WHERE (metadata->>'source') = 'langgraph_migration'
       AND entity_id = ANY($1)`,
    [storyIds],
  )

  logger.info('State transitions deleted', { count: deleteResult.rowCount })
  return deleteResult.rowCount ?? 0
}

/**
 * Delete stories that were inserted by the migration
 */
async function rollbackStories(pool: Pool, storyIds: string[], dryRun: boolean): Promise<number> {
  if (storyIds.length === 0) {
    logger.info('No stories to roll back')
    return 0
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM wint.stories WHERE story_id = ANY($1)`,
    [storyIds],
  )
  const count = parseInt(countResult.rows[0].count)

  logger.info('Stories to roll back', { count, storyIds: storyIds.length })

  if (dryRun) {
    logger.info('[DRY-RUN] Would delete stories', { count, storyIds })
    return count
  }

  const deleteResult = await pool.query(`DELETE FROM wint.stories WHERE story_id = ANY($1)`, [
    storyIds,
  ])

  logger.info('Stories deleted', { count: deleteResult.rowCount })
  return deleteResult.rowCount ?? 0
}

/**
 * Delete features that were inserted by the migration
 */
async function rollbackFeatures(
  pool: Pool,
  featureNames: string[],
  dryRun: boolean,
): Promise<number> {
  if (featureNames.length === 0) {
    logger.info('No features to roll back')
    return 0
  }

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM wint.features WHERE feature_name = ANY($1)`,
    [featureNames],
  )
  const count = parseInt(countResult.rows[0].count)

  logger.info('Features to roll back', { count, featureNames: featureNames.length })

  if (dryRun) {
    logger.info('[DRY-RUN] Would delete features', { count, featureNames })
    return count
  }

  const deleteResult = await pool.query(`DELETE FROM wint.features WHERE feature_name = ANY($1)`, [
    featureNames,
  ])

  logger.info('Features deleted', { count: deleteResult.rowCount })
  return deleteResult.rowCount ?? 0
}

/**
 * Verify rollback: confirm migrated records are no longer present
 */
export async function verifyRollback(
  pool: Pool,
  storyIds: string[],
  featureNames: string[],
): Promise<{ passed: boolean; remainingStories: number; remainingFeatures: number }> {
  logger.info('Verifying rollback completeness')

  const storyCheck = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM wint.stories WHERE story_id = ANY($1)`,
    [storyIds.length > 0 ? storyIds : ['__never__']],
  )
  const remainingStories = parseInt(storyCheck.rows[0].count)

  const featureCheck = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM wint.features WHERE feature_name = ANY($1)`,
    [featureNames.length > 0 ? featureNames : ['__never__']],
  )
  const remainingFeatures = parseInt(featureCheck.rows[0].count)

  const passed = remainingStories === 0 && remainingFeatures === 0

  logger.info('Rollback verification', {
    passed,
    remainingStories,
    remainingFeatures,
  })

  return { passed, remainingStories, remainingFeatures }
}

/**
 * Execute the full rollback sequence
 */
export async function runRollback(
  pool: Pool,
  options: RollbackCliOptions,
): Promise<RollbackResult> {
  const startedAt = new Date().toISOString()
  const errors: Array<{ phase: string; error: string; timestamp: string }> = []

  logger.info('Reading migration log', { logFilePath: options.logFilePath })

  let migrationLog
  try {
    migrationLog = await readMigrationLog(options.logFilePath)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Cannot read migration log', { error: msg })
    return {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      dry_run: options.dryRun,
      log_file_path: options.logFilePath,
      state_transitions_deleted: 0,
      stories_deleted: 0,
      features_deleted: 0,
      errors: [{ phase: 'read-log', error: msg, timestamp: new Date().toISOString() }],
      success: false,
    }
  }

  const storyIds = migrationLog.migrated_story_ids
  const featureNames = migrationLog.migrated_feature_names

  logger.info('Rollback scope from migration log', {
    storyIds: storyIds.length,
    featureNames: featureNames.length,
    dryRun: options.dryRun,
  })

  if (storyIds.length === 0 && featureNames.length === 0) {
    logger.info('No migrated records found in migration log. Nothing to roll back.')
    return {
      started_at: startedAt,
      completed_at: new Date().toISOString(),
      dry_run: options.dryRun,
      log_file_path: options.logFilePath,
      state_transitions_deleted: 0,
      stories_deleted: 0,
      features_deleted: 0,
      errors: [],
      success: true,
    }
  }

  // Step 1: Delete state transitions first (references story entity_ids)
  let stateTransitionsDeleted = 0
  try {
    stateTransitionsDeleted = await rollbackStateTransitions(pool, storyIds, options.dryRun)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Failed to roll back state transitions', { error: msg })
    errors.push({ phase: 'state_transitions', error: msg, timestamp: new Date().toISOString() })
  }

  // Step 2: Delete stories
  let storiesDeleted = 0
  try {
    storiesDeleted = await rollbackStories(pool, storyIds, options.dryRun)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Failed to roll back stories', { error: msg })
    errors.push({ phase: 'stories', error: msg, timestamp: new Date().toISOString() })
  }

  // Step 3: Delete features
  let featuresDeleted = 0
  try {
    featuresDeleted = await rollbackFeatures(pool, featureNames, options.dryRun)
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    logger.error('Failed to roll back features', { error: msg })
    errors.push({ phase: 'features', error: msg, timestamp: new Date().toISOString() })
  }

  // Verify rollback (only if not dry-run and no errors)
  if (!options.dryRun && errors.length === 0) {
    try {
      const verification = await verifyRollback(pool, storyIds, featureNames)
      if (!verification.passed) {
        logger.warn('Rollback verification failed - some records remain', verification)
        errors.push({
          phase: 'verification',
          error: `Remaining: ${verification.remainingStories} stories, ${verification.remainingFeatures} features`,
          timestamp: new Date().toISOString(),
        })
      } else {
        logger.info('Rollback verified successfully')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      logger.warn('Rollback verification check failed', { error: msg })
      errors.push({ phase: 'verification', error: msg, timestamp: new Date().toISOString() })
    }
  }

  return {
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    dry_run: options.dryRun,
    log_file_path: options.logFilePath,
    state_transitions_deleted: stateTransitionsDeleted,
    stories_deleted: storiesDeleted,
    features_deleted: featuresDeleted,
    errors,
    success: errors.length === 0,
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const options = parseRollbackArgs()

  logger.info('LangGraph migration rollback script', {
    mode: options.dryRun ? 'dry-run' : 'execute',
    logFilePath: options.logFilePath,
  })

  if (options.dryRun) {
    logger.info(
      'Running in DRY-RUN mode. No data will be deleted. Use --execute to perform rollback.',
    )
  }

  const pool = createWintPool()

  try {
    const result = await runRollback(pool, options)

    logger.info('=== Rollback Results ===', {
      dryRun: result.dry_run,
      stateTransitionsDeleted: result.state_transitions_deleted,
      storiesDeleted: result.stories_deleted,
      featuresDeleted: result.features_deleted,
      errors: result.errors.length,
      success: result.success,
    })

    // Write rollback log
    const rollbackLogPath = path.join(process.cwd(), 'rollback-log.json')
    await fs.writeFile(rollbackLogPath, JSON.stringify(result, null, 2))
    logger.info('Rollback log written', { path: rollbackLogPath })

    if (!result.success) {
      logger.error('Rollback completed with errors. Review rollback-log.json.')
      process.exit(1)
    }
  } catch (error) {
    logger.error('Rollback failed unexpectedly', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

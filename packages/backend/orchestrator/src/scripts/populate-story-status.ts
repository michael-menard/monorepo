#!/usr/bin/env npx tsx
/**
 * Story Status Population Script
 *
 * Populates the wint.stories database table with story status from filesystem.
 *
 * Purpose:
 * After WINT-1020 flattens story directories and adds status to frontmatter,
 * this script initializes the database with current story state to enable
 * database-driven workflows.
 *
 * Status Inference Priority:
 * 1. Frontmatter `status:` field (explicit, post-WINT-1020)
 * 2. Lifecycle directory location (implicit, pre-WINT-1020)
 * 3. Default to 'backlog' if neither available
 *
 * Usage:
 * ```bash
 * # Dry-run (required first step) - generates population plan
 * npx tsx populate-story-status.ts --dry-run
 *
 * # Execute population
 * npx tsx populate-story-status.ts --execute
 *
 * # Verify population
 * npx tsx populate-story-status.ts --verify
 *
 * # Verbose output
 * npx tsx populate-story-status.ts --dry-run --verbose
 * ```
 *
 * Features:
 * - Scans all epic directories under plans/future/
 * - Reads story frontmatter using StoryFileAdapter
 * - Infers status from frontmatter (priority) or directory (fallback)
 * - Handles duplicates using lifecycle priority ranking
 * - Fail-soft error handling (skip malformed, continue processing)
 * - Dry-run mode for preview
 * - Verification mode for validation
 * - Comprehensive logging to migration-log.json
 *
 * Safety:
 * - Read-only for filesystem
 * - Idempotent (unique constraint prevents duplicate inserts)
 * - Batch operations with transaction boundaries
 * - Comprehensive error logging
 *
 * Story: WINT-1030
 */

import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import { StoryFileAdapter } from '../adapters/story-file-adapter.js'
import { ValidationError, StoryNotFoundError } from '../adapters/__types__/index.js'
import type { DbClient } from '../db/story-repository.js'
import {
  type PopulationPlan,
  type PopulationLog,
  type VerificationReport,
  type StoryLocation,
  type StoryMetadata,
  type PlannedInsertion,
  type SkippedStory,
  type DuplicateStory,
  type InsertionResult,
  type StateDistribution,
  type VerificationCheck,
  type StoryState,
  type LifecycleDirectory,
  PopulationPlanSchema,
  PopulationLogSchema,
  VerificationReportSchema,
  StoryStateSchema,
  LifecycleDirectorySchema,
  LIFECYCLE_TO_STATE,
  LIFECYCLE_PRIORITY,
} from './__types__/population.js'

// ============================================================================
// Configuration
// ============================================================================

const BATCH_SIZE = 50 // Stories per transaction
const MONOREPO_ROOT = findMonorepoRoot()
const PLANS_DIR = path.join(MONOREPO_ROOT, 'plans/future')

/**
 * Create database connection pool
 */
function createDbPool(): Pool {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  })

  return pool
}

/**
 * Find monorepo root by looking for pnpm-workspace.yaml
 */
function findMonorepoRoot(): string {
  let current = process.cwd()
  while (current !== '/') {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current
    }
    current = path.dirname(current)
  }
  throw new Error('Could not find monorepo root (pnpm-workspace.yaml not found)')
}

// ============================================================================
// CLI Parsing
// ============================================================================

const CliOptionsSchema = z.object({
  mode: z.enum(['dry-run', 'execute', 'verify']),
  verbose: z.boolean(),
})
type CliOptions = z.infer<typeof CliOptionsSchema>

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const mode = args.includes('--execute')
    ? 'execute'
    : args.includes('--verify')
      ? 'verify'
      : 'dry-run'
  const verbose = args.includes('--verbose')

  return { mode, verbose }
}

// ============================================================================
// Step 1: Directory Scanning
// ============================================================================

/**
 * Discover all story files across epic directories
 */
async function discoverStories(verbose: boolean): Promise<StoryLocation[]> {
  logger.info('Discovering stories', { plansDir: PLANS_DIR })

  const locations: StoryLocation[] = []

  try {
    // Find all epic directories (platform/ subdirectory)
    const platformDir = path.join(PLANS_DIR, 'platform')
    const epicDirs = await fs.readdir(platformDir, { withFileTypes: true })

    for (const epicDir of epicDirs) {
      if (!epicDir.isDirectory()) continue

      const epicPath = path.join(platformDir, epicDir.name)
      const epic = epicDir.name

      if (verbose) {
        logger.debug(`Scanning epic: ${epic}`, { epicPath })
      }

      // Scan all subdirectories for stories
      await scanEpicForStories(epicPath, epic, locations, verbose)
    }
  } catch (error) {
    logger.error('Failed to discover stories', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  logger.info('Discovery complete', { totalStories: locations.length })
  return locations
}

/**
 * Scan an epic directory for all story directories
 */
async function scanEpicForStories(
  epicPath: string,
  epic: string,
  locations: StoryLocation[],
  verbose: boolean,
): Promise<void> {
  try {
    const entries = await fs.readdir(epicPath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const entryPath = path.join(epicPath, entry.name)

      // Check if this is a lifecycle directory
      const lifecycleResult = LifecycleDirectorySchema.safeParse(entry.name)
      if (lifecycleResult.success) {
        // Scan lifecycle directory for story directories
        await scanLifecycleDirectory(entryPath, epic, lifecycleResult.data, locations, verbose)
      } else {
        // Check if this is a story directory (has story file)
        await checkStoryDirectory(entryPath, epic, undefined, locations, verbose)
      }
    }
  } catch (error) {
    logger.warn('Failed to scan epic directory', {
      epic,
      epicPath,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Scan a lifecycle directory for story directories
 */
async function scanLifecycleDirectory(
  lifecyclePath: string,
  epic: string,
  lifecycle: LifecycleDirectory,
  locations: StoryLocation[],
  verbose: boolean,
): Promise<void> {
  try {
    const entries = await fs.readdir(lifecyclePath, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      const storyDirPath = path.join(lifecyclePath, entry.name)
      await checkStoryDirectory(storyDirPath, epic, lifecycle, locations, verbose)
    }
  } catch (error) {
    logger.warn('Failed to scan lifecycle directory', {
      lifecycle,
      lifecyclePath,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

/**
 * Check if a directory is a story directory and extract location info
 */
async function checkStoryDirectory(
  dirPath: string,
  epic: string,
  lifecycle: LifecycleDirectory | undefined,
  locations: StoryLocation[],
  verbose: boolean,
): Promise<void> {
  const storyId = path.basename(dirPath)

  // Story directories should match pattern: {EPIC}-{PHASE}{STORY}{VARIANT}
  // Examples: WINT-0010, KBAR-1020, LNGG-0070
  if (!/^[A-Z]+-\d{4}[A-Z]?$/.test(storyId)) {
    return // Not a story directory
  }

  // Look for story file: {STORY-ID}.md
  const storyFilePath = path.join(dirPath, `${storyId}.md`)

  try {
    await fs.access(storyFilePath)

    // Story file exists
    const location: StoryLocation = {
      story_id: storyId,
      directory_path: dirPath,
      file_path: storyFilePath,
      epic,
      lifecycle,
    }

    locations.push(location)

    if (verbose) {
      logger.debug(`Found story: ${storyId}`, { lifecycle, epic })
    }
  } catch {
    // Story file doesn't exist, skip
    if (verbose) {
      logger.debug(`Skipping directory (no story file): ${storyId}`, { dirPath })
    }
  }
}

// ============================================================================
// Step 2: Frontmatter Reading
// ============================================================================

/**
 * Read story frontmatter and extract metadata
 */
export async function readStoryMetadata(
  location: StoryLocation,
  adapter: StoryFileAdapter,
): Promise<StoryMetadata | null> {
  try {
    const story = await adapter.read(location.file_path)

    const metadata: StoryMetadata = {
      story_id: story.id,
      title: story.title,
      description: story.goal || undefined,
      epic: story.epic || location.epic,
      story_type: story.type || undefined,
      priority: story.priority || undefined,
      points: story.points || undefined,
      phase: story.phase || undefined,
      status: story.state || undefined, // status from frontmatter
    }

    return metadata
  } catch (error) {
    if (error instanceof StoryNotFoundError || error instanceof ValidationError) {
      logger.warn('Failed to read story frontmatter', {
        storyId: location.story_id,
        filePath: location.file_path,
        error: error.message,
      })
      return null
    }
    throw error
  }
}

// ============================================================================
// Step 3: Status Inference
// ============================================================================

/**
 * Infer story status using priority hierarchy
 */
export function inferStatus(
  location: StoryLocation,
  metadata: StoryMetadata | null,
): {
  state: StoryState
  method: 'frontmatter' | 'directory' | 'default'
} {
  // Priority 1: Frontmatter status field (explicit)
  if (metadata?.status) {
    const state = mapStatusToState(metadata.status)
    return { state, method: 'frontmatter' }
  }

  // Priority 2: Lifecycle directory (implicit)
  if (location.lifecycle) {
    const state = LIFECYCLE_TO_STATE[location.lifecycle]
    return { state, method: 'directory' }
  }

  // Priority 3: Default to backlog
  return { state: 'backlog', method: 'default' }
}

/**
 * Map status string to database enum value
 * Handles hyphen → underscore conversion
 */
export function mapStatusToState(status: string): StoryState {
  // Normalize hyphens to underscores
  const normalized = status.replace(/-/g, '_')

  // Validate against enum
  const result = StoryStateSchema.safeParse(normalized)
  if (result.success) {
    return result.data
  }

  // Fallback to backlog if invalid
  logger.warn('Invalid status value, defaulting to backlog', { status, normalized })
  return 'backlog'
}

// ============================================================================
// Step 4: Duplicate Resolution
// ============================================================================

/**
 * Resolve duplicate story IDs using lifecycle priority
 */
export function resolveDuplicates(locations: StoryLocation[]): {
  uniqueLocations: Map<string, StoryLocation>
  duplicates: DuplicateStory[]
} {
  const grouped = new Map<string, StoryLocation[]>()

  // Group by story_id
  for (const location of locations) {
    const existing = grouped.get(location.story_id) || []
    existing.push(location)
    grouped.set(location.story_id, existing)
  }

  const uniqueLocations = new Map<string, StoryLocation>()
  const duplicates: DuplicateStory[] = []

  // Resolve duplicates
  for (const [storyId, locs] of grouped.entries()) {
    if (locs.length === 1) {
      uniqueLocations.set(storyId, locs[0])
    } else {
      // Multiple locations - use lifecycle priority
      const sorted = locs.sort((a, b) => {
        const prioA = a.lifecycle ? LIFECYCLE_PRIORITY[a.lifecycle] : 0
        const prioB = b.lifecycle ? LIFECYCLE_PRIORITY[b.lifecycle] : 0
        return prioB - prioA // Descending (higher priority first)
      })

      const resolved = sorted[0]
      uniqueLocations.set(storyId, resolved)

      duplicates.push({
        story_id: storyId,
        locations: locs,
        resolved_location: resolved,
        resolution_reason: `Selected most advanced lifecycle: ${resolved.lifecycle || 'none'}`,
      })

      logger.info('Resolved duplicate story', {
        storyId,
        locations: locs.length,
        resolved: resolved.lifecycle || 'root',
      })
    }
  }

  return { uniqueLocations, duplicates }
}

// ============================================================================
// Step 5: Dry-Run Mode
// ============================================================================

/**
 * Generate population plan (dry-run mode)
 */
export async function generatePopulationPlan(verbose: boolean): Promise<PopulationPlan> {
  logger.info('Generating population plan (dry-run)')

  const adapter = new StoryFileAdapter()
  const locations = await discoverStories(verbose)

  // Resolve duplicates
  const { uniqueLocations, duplicates } = resolveDuplicates(locations)

  const plannedInsertions: PlannedInsertion[] = []
  const skippedStories: SkippedStory[] = []

  // Process each unique story
  for (const location of uniqueLocations.values()) {
    try {
      const metadata = await readStoryMetadata(location, adapter)

      if (!metadata) {
        skippedStories.push({
          identifier: location.story_id,
          reason: 'Failed to read frontmatter',
          file_path: location.file_path,
        })
        continue
      }

      // Validate required fields
      if (!metadata.title) {
        skippedStories.push({
          identifier: location.story_id,
          reason: 'Missing required field: title',
          file_path: location.file_path,
        })
        continue
      }

      const { state, method } = inferStatus(location, metadata)

      plannedInsertions.push({
        story_id: location.story_id,
        title: metadata.title,
        state,
        inference_method: method,
        source_file: location.file_path,
        epic: metadata.epic,
        metadata,
      })
    } catch (error) {
      skippedStories.push({
        identifier: location.story_id,
        reason: 'Error processing story',
        error: error instanceof Error ? error.message : String(error),
        file_path: location.file_path,
      })
    }
  }

  // Calculate distributions
  const stateDistribution: Record<StoryState, number> = {} as any
  const epicDistribution: Record<string, number> = {}

  for (const insertion of plannedInsertions) {
    stateDistribution[insertion.state] = (stateDistribution[insertion.state] || 0) + 1
    if (insertion.epic) {
      epicDistribution[insertion.epic] = (epicDistribution[insertion.epic] || 0) + 1
    }
  }

  const plan: PopulationPlan = {
    timestamp: new Date().toISOString(),
    discovered_count: locations.length,
    planned_insertions: plannedInsertions,
    skipped_stories: skippedStories,
    duplicates_resolved: duplicates,
    state_distribution: stateDistribution,
    epic_distribution: epicDistribution,
  }

  // Validate plan
  const validatedPlan = PopulationPlanSchema.parse(plan)

  // Write plan to file
  await fs.writeFile(
    path.join(process.cwd(), 'dry-run-plan.json'),
    JSON.stringify(validatedPlan, null, 2),
  )

  logger.info('Population plan generated', {
    discovered: locations.length,
    planned: plannedInsertions.length,
    skipped: skippedStories.length,
    duplicates: duplicates.length,
  })

  return validatedPlan
}

// ============================================================================
// Step 6: Database Population
// ============================================================================

/**
 * Execute population (insert stories into database)
 */
export async function executePopulation(verbose: boolean): Promise<PopulationLog> {
  logger.info('Executing population')

  const startTime = new Date().toISOString()
  const adapter = new StoryFileAdapter()
  const locations = await discoverStories(verbose)

  // Resolve duplicates
  const { uniqueLocations, duplicates } = resolveDuplicates(locations)

  const insertions: InsertionResult[] = []
  const skippedStories: SkippedStory[] = []
  const errors: Array<{ story_id?: string; error: string; timestamp: string }> = []

  // Create single pool for all database operations
  const pool = createDbPool()

  try {
    // Process stories in batches
    const storiesArray = Array.from(uniqueLocations.values())
    for (let i = 0; i < storiesArray.length; i += BATCH_SIZE) {
      const batch = storiesArray.slice(i, i + BATCH_SIZE)

      for (const location of batch) {
        try {
          const metadata = await readStoryMetadata(location, adapter)

          if (!metadata || !metadata.title) {
            skippedStories.push({
              identifier: location.story_id,
              reason: metadata ? 'Missing required field: title' : 'Failed to read frontmatter',
              file_path: location.file_path,
            })
            continue
          }

          const { state } = inferStatus(location, metadata)

          // Insert into database
          await insertStory(metadata, state, pool)

          insertions.push({
            story_id: location.story_id,
            success: true,
            state,
            timestamp: new Date().toISOString(),
          })

          if (verbose) {
            logger.debug(`Inserted story: ${location.story_id}`, { state })
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)

          insertions.push({
            story_id: location.story_id,
            success: false,
            error: errorMsg,
            timestamp: new Date().toISOString(),
          })

          errors.push({
            story_id: location.story_id,
            error: errorMsg,
            timestamp: new Date().toISOString(),
          })

          logger.warn('Failed to insert story', {
            storyId: location.story_id,
            error: errorMsg,
          })
        }
      }
    }
  } finally {
    // Always close pool
    await pool.end()
  }

  const endTime = new Date().toISOString()
  const insertedCount = insertions.filter(r => r.success).length
  const failedCount = insertions.filter(r => !r.success).length

  const log: PopulationLog = {
    started_at: startTime,
    completed_at: endTime,
    discovered_count: locations.length,
    inserted_count: insertedCount,
    skipped_count: skippedStories.length,
    failed_count: failedCount,
    insertions,
    skipped_stories: skippedStories,
    duplicates_resolved: duplicates,
    errors,
  }

  // Validate log
  const validatedLog = PopulationLogSchema.parse(log)

  // Write log to file
  await fs.writeFile(
    path.join(process.cwd(), 'migration-log.json'),
    JSON.stringify(validatedLog, null, 2),
  )

  logger.info('Population complete', {
    discovered: locations.length,
    inserted: insertedCount,
    skipped: skippedStories.length,
    failed: failedCount,
  })

  return validatedLog
}

/**
 * Insert a story into the database
 */
export async function insertStory(
  metadata: StoryMetadata,
  state: StoryState,
  client: DbClient,
): Promise<void> {
  const sql = `
    INSERT INTO wint.stories (
      story_id, title, description, epic, story_type, priority, story_points, state
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::wint.story_state)
    ON CONFLICT (story_id) DO NOTHING
  `

  await client.query(sql, [
    metadata.story_id,
    metadata.title,
    metadata.description || null,
    metadata.epic || null,
    metadata.story_type || null,
    metadata.priority || null,
    metadata.points || null,
    state,
  ])
}

// ============================================================================
// Step 7: Verification Mode
// ============================================================================

/**
 * Verify database population
 */
export async function verifyPopulation(): Promise<VerificationReport> {
  logger.info('Verifying population')

  const pool = createDbPool()
  const checks: VerificationCheck[] = []
  const errors: Array<{ check: string; error: string }> = []

  // Check 1: Total stories count
  try {
    const result = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM wint.stories')
    const totalStories = parseInt(result.rows[0].count)

    checks.push({
      check: 'Total stories in database',
      passed: totalStories > 0,
      actual: totalStories,
    })
  } catch (error) {
    errors.push({
      check: 'Total stories count',
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Check 2: State distribution
  const stateDistribution: StateDistribution[] = []
  try {
    const result = await pool.query<{ state: StoryState; count: string }>(
      'SELECT state, COUNT(*) as count FROM wint.stories GROUP BY state ORDER BY COUNT(*) DESC',
    )

    for (const row of result.rows) {
      stateDistribution.push({
        state: row.state,
        count: parseInt(row.count),
      })
    }

    checks.push({
      check: 'State distribution calculated',
      passed: stateDistribution.length > 0,
      actual: stateDistribution.length,
    })
  } catch (error) {
    errors.push({
      check: 'State distribution',
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Check 3: No NULL states
  try {
    const result = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM wint.stories WHERE state IS NULL',
    )
    const nullCount = parseInt(result.rows[0].count)

    checks.push({
      check: 'No NULL states',
      passed: nullCount === 0,
      expected: 0,
      actual: nullCount,
    })
  } catch (error) {
    errors.push({
      check: 'NULL states check',
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Check 4: No duplicate story_ids
  try {
    const result = await pool.query<{ count: string }>(
      'SELECT COUNT(*) as count FROM (SELECT story_id, COUNT(*) FROM wint.stories GROUP BY story_id HAVING COUNT(*) > 1) duplicates',
    )
    const duplicateCount = parseInt(result.rows[0].count)

    checks.push({
      check: 'No duplicate story_ids',
      passed: duplicateCount === 0,
      expected: 0,
      actual: duplicateCount,
    })
  } catch (error) {
    errors.push({
      check: 'Duplicate story_ids',
      error: error instanceof Error ? error.message : String(error),
    })
  }

  const totalStoriesResult = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM wint.stories',
  )
  const totalStories = parseInt(totalStoriesResult.rows[0].count)

  // Close pool
  await pool.end()

  const passed = checks.every(c => c.passed) && errors.length === 0

  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    passed,
    total_stories: totalStories,
    state_distribution: stateDistribution,
    checks,
    errors,
  }

  // Validate report
  const validatedReport = VerificationReportSchema.parse(report)

  // Write report to file
  await fs.writeFile(
    path.join(process.cwd(), 'verification-report.json'),
    JSON.stringify(validatedReport, null, 2),
  )

  logger.info('Verification complete', {
    passed,
    totalStories,
    checks: checks.length,
    errors: errors.length,
  })

  return validatedReport
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs()

  logger.info('Story status population script', { mode: options.mode })

  try {
    if (options.mode === 'dry-run') {
      const plan = await generatePopulationPlan(options.verbose)
      logger.info('Population Plan', {
        discovered: plan.discovered_count,
        planned_insertions: plan.planned_insertions.length,
        skipped: plan.skipped_stories.length,
        duplicates_resolved: plan.duplicates_resolved.length,
        state_distribution: plan.state_distribution,
        output_file: 'dry-run-plan.json',
      })
    } else if (options.mode === 'execute') {
      const log = await executePopulation(options.verbose)
      logger.info('Population Complete', {
        discovered: log.discovered_count,
        inserted: log.inserted_count,
        skipped: log.skipped_count,
        failed: log.failed_count,
        output_file: 'migration-log.json',
      })

      if (log.failed_count > 0) {
        logger.warn('Some insertions failed. Check migration-log.json for details.', {
          failed_count: log.failed_count,
        })
      }
    } else if (options.mode === 'verify') {
      const report = await verifyPopulation()
      logger.info('Verification Report', {
        status: report.passed ? 'PASSED' : 'FAILED',
        total_stories: report.total_stories,
        state_distribution: report.state_distribution,
        checks: report.checks.map(c => ({ check: c.check, passed: c.passed })),
        output_file: 'verification-report.json',
      })

      if (!report.passed) {
        process.exit(1)
      }
    }

    logger.info('Script complete', { mode: options.mode })
  } catch (error) {
    logger.error('Script failed', {
      mode: options.mode,
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

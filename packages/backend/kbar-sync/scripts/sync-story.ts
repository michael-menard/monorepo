#!/usr/bin/env npx tsx
/**
 * sync-story CLI Command
 * KBAR-0050: AC-1, AC-2, AC-3, AC-6, AC-9, AC-12
 *
 * Syncs a single story from filesystem to database (or vice versa).
 *
 * Usage:
 *   sync:story --story-id KBAR-0050 --story-dir /path/to/story
 *   sync:story --story-id KBAR-0050 --story-dir /path/to/story --dry-run
 *   sync:story --story-id KBAR-0050 --story-dir /path/to/story --artifacts
 *   sync:story --story-id KBAR-0050 --story-dir /path/to/story --artifact-file /path --artifact-type plan
 *   sync:story --story-id KBAR-0050 --story-dir /path/to/story --check-conflicts
 *   sync:story --story-id KBAR-0050 --story-dir /path/to/story --from-db
 *   sync:story --help
 *
 * Exit codes:
 *   0 - Success (or dry-run: no changes needed)
 *   1 - Conflict detected / validation error / sync failed
 *   2 - DB connection failure / fatal error
 */

import path from 'node:path'
import { readFile } from 'node:fs/promises'
import { SyncStoryCLIOptionsSchema } from './__types__/cli-options.js'

// ============================================================================
// Help Text
// ============================================================================

const HELP_TEXT = `
sync:story - Sync a single KBAR story between filesystem and database

USAGE:
  sync:story --story-id <id> --story-dir <path> [options]

REQUIRED FLAGS:
  --story-id <id>          Story identifier (e.g., "KBAR-0050")
  --story-dir <path>       Absolute path to story directory

OPTIONAL FLAGS:
  --dry-run                Compare checksums without writing to DB
                           Exit 0 = up-to-date, Exit 1 = would sync
  --verbose                Enable verbose logging
  --force                  Skip conflict check; proceed even if conflict detected
  --artifacts              Sync all artifacts for the story
  --artifact-file <path>   Path to a specific artifact file
  --artifact-type <type>   Artifact type for single artifact sync
                           (elaboration|plan|scope|evidence|review|
                            test_plan|decisions|checkpoint|knowledge_context)
  --check-conflicts        Detect conflicts; exit 1 if conflict found
  --from-db                Sync from database back to filesystem
  --help                   Show this help message

EXIT CODES:
  0 - Success
  1 - Conflict detected / validation error / story needs sync (dry-run)
  2 - DB connection failure / fatal error

EXAMPLES:
  # Basic story sync
  sync:story --story-id KBAR-0050 --story-dir /plans/future/platform/kbar/in-progress/KBAR-0050

  # Dry-run (no DB writes)
  sync:story --story-id KBAR-0050 --story-dir /path/to/story --dry-run

  # Sync all artifacts
  sync:story --story-id KBAR-0050 --story-dir /path/to/story --artifacts

  # Single artifact sync
  sync:story --story-id KBAR-0050 --story-dir /path/to/story \\
    --artifact-file /path/to/story/_implementation/PLAN.yaml --artifact-type plan

  # Check for conflicts
  sync:story --story-id KBAR-0050 --story-dir /path/to/story --check-conflicts

  # Sync from DB to filesystem
  sync:story --story-id KBAR-0050 --story-dir /path/to/story --from-db
`.trim()

// ============================================================================
// Arg Parsing
// ============================================================================

/**
 * Parse CLI args into raw options object.
 * Returns null if --help was requested.
 */
export function parseArgs(args: string[]): Record<string, unknown> | null {
  if (args.includes('--help') || args.includes('-h')) {
    return null
  }

  const opts: Record<string, unknown> = {}
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === '--story-id') {
      opts.storyId = args[++i]
    } else if (arg === '--story-dir') {
      opts.storyDir = args[++i]
    } else if (arg === '--dry-run') {
      opts.dryRun = true
    } else if (arg === '--verbose') {
      opts.verbose = true
    } else if (arg === '--force') {
      opts.force = true
    } else if (arg === '--artifacts') {
      opts.artifacts = true
    } else if (arg === '--artifact-file') {
      opts.artifactFile = args[++i]
    } else if (arg === '--artifact-type') {
      opts.artifactType = args[++i]
    } else if (arg === '--check-conflicts') {
      opts.checkConflicts = true
    } else if (arg === '--from-db') {
      opts.fromDb = true
    }

    i++
  }

  return opts
}

// ============================================================================
// Logging helpers
// ============================================================================

function log(message: string, verbose: boolean, data?: unknown): void {
  if (data !== undefined && verbose) {
    process.stdout.write(`[sync:story] ${message} ${JSON.stringify(data)}\n`)
  } else if (data === undefined) {
    process.stdout.write(`[sync:story] ${message}\n`)
  }
}

function logError(message: string, data?: unknown): void {
  if (data !== undefined) {
    process.stderr.write(`[sync:story] ERROR: ${message} ${JSON.stringify(data)}\n`)
  } else {
    process.stderr.write(`[sync:story] ERROR: ${message}\n`)
  }
}

// ============================================================================
// Re-throw helper for process.exit mock errors in tests
// ============================================================================

function rethrowExitError(error: unknown): void {
  if (error instanceof Error && /^(exit:|process\.exit\()\d+\)?$/.test(error.message)) {
    throw error
  }
}

// ============================================================================
// Dry-run DB query helper (AC-6, AC-12)
// ============================================================================

/**
 * Query DB for story checksum using a raw pg connection.
 * Returns null if story not found.
 */
async function queryDbChecksum(storyId: string): Promise<string | null> {
  const pg = await import('pg')
  // Use pg.Pool directly (works with both CommonJS default export and named export)
  const PoolCtor = (pg.Pool ?? (pg as any).default?.Pool) as typeof import('pg').Pool
  const pool = new PoolCtor({
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseInt(process.env.POSTGRES_PORT ?? '5432'),
    database: process.env.POSTGRES_DATABASE ?? 'postgres',
    user: process.env.POSTGRES_USER ?? process.env.POSTGRES_USERNAME ?? 'postgres',
    password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  })

  try {
    const result = await pool.query<{ checksum: string }>(
      `SELECT a.checksum
       FROM kbar.artifacts a
       JOIN kbar.stories s ON a.story_id = s.id
       WHERE s.story_id = $1 AND a.artifact_type = 'story_file'
       LIMIT 1`,
      [storyId],
    )
    if (result.rows.length === 0) return null
    return result.rows[0].checksum
  } finally {
    await pool.end()
  }
}

// ============================================================================
// Dry-run: CLI-layer checksum comparison (AC-6, AC-12)
// Approach 2: computeChecksum + direct DB read (no syncStoryToDatabase call)
// ============================================================================

/**
 * Perform dry-run by comparing current file checksum against DB.
 * Does NOT call syncStoryToDatabase (AC-12: zero-mutation guarantee).
 * Returns true if content is up-to-date (no sync needed).
 */
export async function dryRunStory(
  storyId: string,
  storyDir: string,
  verbose: boolean,
): Promise<boolean> {
  const { computeChecksum, validateFilePath, validateNotSymlink } =
    await import('../src/__types__/index.js')

  const storyFile = path.join(storyDir, `${storyId}.md`)

  log(`Dry-run: checking checksum for ${storyId}`, verbose)

  const baseDir = path.resolve(process.cwd(), 'plans')
  validateFilePath(storyFile, baseDir)
  await validateNotSymlink(storyFile)

  let fileContent: string
  try {
    fileContent = await readFile(storyFile, 'utf-8')
  } catch (error) {
    rethrowExitError(error)
    const msg = error instanceof Error ? error.message : String(error)
    logError(`Cannot read story file: ${storyFile}`, { error: msg })
    process.exit(1)
  }

  const currentChecksum = computeChecksum(fileContent!)
  log(`Computed checksum: ${currentChecksum}`, verbose)

  const dbChecksum = await queryDbChecksum(storyId)

  if (dbChecksum === null) {
    process.stdout.write(`[sync:story] DRY-RUN: Story ${storyId} not in DB — would sync\n`)
    return false
  }

  log(`DB checksum: ${dbChecksum}`, verbose)

  if (currentChecksum === dbChecksum) {
    process.stdout.write(`[sync:story] DRY-RUN: ${storyId} is up-to-date (checksum match)\n`)
    return true
  } else {
    process.stdout.write(`[sync:story] DRY-RUN: ${storyId} would be synced (checksum differs)\n`)
    return false
  }
}

// ============================================================================
// Main
// ============================================================================

export async function main(): Promise<void> {
  const args = process.argv.slice(2)

  // Handle --help BEFORE any imports that require DB env vars
  const rawOpts = parseArgs(args)
  if (rawOpts === null) {
    process.stdout.write(HELP_TEXT + '\n')
    process.exit(0)
  }

  // Validate options with Zod (AC-8)
  const parseResult = SyncStoryCLIOptionsSchema.safeParse(rawOpts)
  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map(e => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    process.stderr.write(`[sync:story] ERROR: Invalid options:\n${errors}\n`)
    process.stderr.write(`Run 'sync:story --help' for usage.\n`)
    process.exit(1)
  }

  const opts = parseResult.data
  const {
    storyId,
    storyDir,
    dryRun,
    verbose,
    force,
    artifacts,
    artifactFile,
    artifactType,
    checkConflicts,
    fromDb,
  } = opts

  log(`Starting sync for story ${storyId}`, verbose, {
    storyDir,
    dryRun,
    verbose,
    force,
    artifacts,
    checkConflicts,
    fromDb,
  })

  // =========================================================================
  // --dry-run mode (AC-6, AC-12)
  // Uses CLI-layer checksum comparison; does NOT call syncStoryToDatabase
  // =========================================================================
  if (dryRun) {
    try {
      const upToDate = await dryRunStory(storyId, storyDir, verbose)
      process.exit(upToDate ? 0 : 1)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        logError(`DB connection failed during dry-run`, { error: msg })
        process.exit(2)
      }
      logError(`Dry-run failed: ${msg}`)
      process.exit(1)
    }
  }

  // Lazy-load sync functions to avoid DB init on --help and validation failures
  const {
    syncStoryToDatabase,
    syncStoryFromDatabase,
    detectSyncConflicts,
    batchSyncArtifactsForStory,
    syncArtifactToDatabase,
    detectArtifactConflicts,
  } = await import('../src/index.js')

  // =========================================================================
  // --check-conflicts mode (AC-3)
  // =========================================================================
  if (checkConflicts) {
    try {
      const storyFile = path.join(storyDir, `${storyId}.md`)

      const conflictResult = await detectSyncConflicts({ storyId, filePath: storyFile })
      if (!conflictResult.success) {
        logError(`Conflict detection failed: ${conflictResult.error ?? 'unknown'}`)
        process.exit(1)
      }

      if (conflictResult.hasConflict) {
        process.stderr.write(
          `[sync:story] CONFLICT: ${storyId} has conflict (${conflictResult.conflictType})\n`,
        )
        if (conflictResult.conflictId) {
          process.stderr.write(`[sync:story] Conflict ID: ${conflictResult.conflictId}\n`)
        }
        if (!force) {
          process.exit(1)
        }
        process.stdout.write(`[sync:story] --force: proceeding despite conflict\n`)
      } else {
        process.stdout.write(`[sync:story] No conflicts detected for ${storyId}\n`)
      }

      if (artifactType && artifactFile) {
        const artConflictResult = await detectArtifactConflicts({
          storyId,
          artifactType,
          filePath: artifactFile,
        })
        if (artConflictResult.hasConflict && !force) {
          process.stderr.write(
            `[sync:story] ARTIFACT CONFLICT: ${artifactType} has conflict (${artConflictResult.conflictType})\n`,
          )
          process.exit(1)
        }
      }

      process.exit(0)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        logError(`DB connection failed during conflict check`, { error: msg })
        process.exit(2)
      }
      logError(`Conflict check failed: ${msg}`)
      process.exit(1)
    }
  }

  // =========================================================================
  // --from-db mode (AC-1)
  // =========================================================================
  if (fromDb) {
    const outputPath = path.join(storyDir, `${storyId}.md`)
    try {
      const result = await syncStoryFromDatabase({
        storyId,
        outputPath,
        triggeredBy: 'automation',
      })
      if (!result.success) {
        logError(`Sync from DB failed: ${result.error ?? result.message ?? 'unknown'}`)
        process.exit(1)
      }
      process.stdout.write(`[sync:story] SUCCESS: Synced ${storyId} from DB to ${outputPath}\n`)
      log('Result', verbose, result)
      process.exit(0)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        logError(`DB connection failed during from-db sync`, { error: msg })
        process.exit(2)
      }
      logError(`from-db sync failed: ${msg}`)
      process.exit(1)
    }
  }

  // =========================================================================
  // --artifact-file + --artifact-type: Single artifact sync (AC-2)
  // =========================================================================
  if (artifactFile && artifactType) {
    try {
      const { validateFilePath, validateNotSymlink } = await import('../src/__types__/index.js')
      const baseDir = path.resolve(process.cwd(), 'plans')
      validateFilePath(artifactFile, baseDir)
      await validateNotSymlink(artifactFile)

      log(`Syncing single artifact: ${artifactType}`, verbose, { artifactFile })

      const result = await syncArtifactToDatabase({
        storyId,
        artifactType,
        filePath: artifactFile,
        triggeredBy: 'automation',
      })

      if (!result.success && result.syncStatus === 'failed') {
        logError(`Artifact sync failed: ${result.error ?? 'unknown'}`)
        process.exit(1)
      }

      process.stdout.write(`[sync:story] Artifact ${artifactType}: ${result.syncStatus}\n`)
      log('Artifact result', verbose, result)
      process.exit(0)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('Path traversal') || msg.includes('Symlink')) {
        logError(`Security check failed: ${msg}`)
        process.exit(1)
      }
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        logError(`DB connection failed`, { error: msg })
        process.exit(2)
      }
      logError(`Artifact sync failed: ${msg}`)
      process.exit(1)
    }
  }

  // =========================================================================
  // --artifacts: Batch artifact sync for story (AC-2)
  // =========================================================================
  if (artifacts) {
    try {
      log(`Batch syncing all artifacts for ${storyId}`, verbose, { storyDir })

      const result = await batchSyncArtifactsForStory({
        storyId,
        storyDir,
        triggeredBy: 'automation',
      })

      process.stdout.write(
        `[sync:story] Artifacts: discovered=${result.totalDiscovered} synced=${result.totalSynced} skipped=${result.totalSkipped} failed=${result.totalFailed}\n`,
      )

      if (result.totalFailed > 0) {
        logError(`${result.totalFailed} artifact(s) failed to sync`)
        process.exit(1)
      }

      process.exit(0)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        logError(`DB connection failed during artifact batch sync`, { error: msg })
        process.exit(2)
      }
      logError(`Artifact batch sync failed: ${msg}`)
      process.exit(1)
    }
  }

  // =========================================================================
  // Default: Story file sync (AC-1)
  // =========================================================================
  const storyFile = path.join(storyDir, `${storyId}.md`)

  // Security checks (SEC-001, SEC-002)
  try {
    const { validateFilePath, validateNotSymlink } = await import('../src/__types__/index.js')
    const baseDir = path.resolve(process.cwd(), 'plans')
    validateFilePath(storyFile, baseDir)
    await validateNotSymlink(storyFile)
  } catch (error) {
    rethrowExitError(error)
    const msg = error instanceof Error ? error.message : String(error)
    logError(`Security check failed: ${msg}`)
    process.exit(1)
  }

  try {
    log(`Syncing story file: ${storyFile}`, verbose)

    const result = await syncStoryToDatabase({
      storyId,
      filePath: storyFile,
      triggeredBy: 'automation',
    })

    if (!result.success) {
      logError(`Story sync failed: ${result.error ?? result.message ?? 'unknown'}`)
      process.exit(1)
    }

    process.stdout.write(
      `[sync:story] SUCCESS: ${storyId} ${result.syncStatus} (checksum: ${result.checksum ?? 'n/a'})\n`,
    )
    log('Result', verbose, result)
    process.exit(0)
  } catch (error) {
    rethrowExitError(error)
    const msg = error instanceof Error ? error.message : String(error)
    if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
      logError(`DB connection failed`, { error: msg })
      process.exit(2)
    }
    logError(`Story sync failed: ${msg}`)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

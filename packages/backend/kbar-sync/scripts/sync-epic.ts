#!/usr/bin/env npx tsx
/**
 * sync-epic CLI Command
 * KBAR-0050: AC-4, AC-5, AC-6, AC-9
 *
 * Syncs all stories under a base directory (optionally filtered by epic prefix).
 *
 * Usage:
 *   sync:epic --base-dir /path/to/epic
 *   sync:epic --base-dir /path --epic KBAR --dry-run
 *   sync:epic --base-dir /path --artifact-type plan --checkpoint my-checkpoint
 *   sync:epic --help
 *
 * Exit codes:
 *   0 - All stories synced successfully
 *   1 - One or more stories failed (fail-soft: continues processing all)
 *   2 - DB connection failure / fatal error
 */

import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import type { NonStoryArtifactType } from '../src/__types__/index.js'
import { SyncEpicCLIOptionsSchema } from './__types__/cli-options.js'

// ============================================================================
// Help Text
// ============================================================================

const HELP_TEXT = `
sync:epic - Sync all KBAR stories in a directory

USAGE:
  sync:epic --base-dir <path> [options]

REQUIRED FLAGS:
  --base-dir <path>        Base directory to scan for story directories

OPTIONAL FLAGS:
  --epic <prefix>          Filter stories by epic prefix (e.g., "KBAR")
  --dry-run                Compare checksums without writing to DB
                           Uses single batch DB query (N+1 prevention)
  --verbose                Enable verbose logging
  --force                  Skip conflict checks; proceed even if conflicts detected
  --artifact-type <type>   Cross-story artifact sync by type (calls batchSyncByType)
                           (elaboration|plan|scope|evidence|review|
                            test_plan|decisions|checkpoint|knowledge_context)
  --checkpoint <name>      Checkpoint name for resumable batch operations
  --help                   Show this help message

EXIT CODES:
  0 - All stories synced successfully
  1 - One or more stories failed (does not abort; fail-soft)
  2 - DB connection failure / fatal error

EXAMPLES:
  # Sync all stories under base directory
  sync:epic --base-dir /plans/future/platform/kbar-artifact-migration

  # Filter to a specific epic
  sync:epic --base-dir /plans/future/platform --epic KBAR

  # Dry-run (no DB writes, single batch query)
  sync:epic --base-dir /plans/future/platform --epic KBAR --dry-run

  # Cross-story artifact sync with checkpoint
  sync:epic --base-dir /plans/future/platform --artifact-type plan \\
    --checkpoint kbar-plan-sync
`.trim()

// ============================================================================
// Re-throw helper for process.exit mock errors in tests
// ============================================================================

function rethrowExitError(error: unknown): void {
  if (error instanceof Error && /^(exit:|process\.exit\()\d+\)?$/.test(error.message)) {
    throw error
  }
}

// ============================================================================
// Story directory discovery (AC-4)
// ============================================================================

const STORY_DIR_PATTERN = /^[A-Z]+-\d{4}[A-Z]?$/

/**
 * Discover story directories under baseDir.
 * Searches 2 levels deep (lifecycle dirs like in-progress/, done/, etc.)
 * Returns directories with story file present.
 * Filters by epic prefix if provided.
 */
export async function discoverStoryDirs(
  baseDir: string,
  epicFilter: string | undefined,
  verbose: boolean,
): Promise<Array<{ storyId: string; storyDir: string; storyFile: string }>> {
  const discovered: Array<{ storyId: string; storyDir: string; storyFile: string }> = []

  let topEntries
  try {
    topEntries = await readdir(baseDir, { withFileTypes: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[sync:epic] ERROR: Cannot read base directory: ${msg}\n`)
    return discovered
  }

  for (const topEntry of topEntries) {
    if (!topEntry.isDirectory()) continue

    const topPath = path.join(baseDir, topEntry.name)

    // Check if this is a direct story dir
    if (STORY_DIR_PATTERN.test(topEntry.name)) {
      await checkAndAddStory(topPath, topEntry.name, epicFilter, discovered, verbose)
      continue
    }

    // Otherwise treat as lifecycle or feature subdirectory — scan one level deeper
    let subEntries
    try {
      subEntries = await readdir(topPath, { withFileTypes: true })
    } catch {
      continue
    }

    for (const subEntry of subEntries) {
      if (!subEntry.isDirectory()) continue
      if (!STORY_DIR_PATTERN.test(subEntry.name)) continue

      const storyPath = path.join(topPath, subEntry.name)
      await checkAndAddStory(storyPath, subEntry.name, epicFilter, discovered, verbose)
    }
  }

  return discovered
}

async function checkAndAddStory(
  storyDir: string,
  storyId: string,
  epicFilter: string | undefined,
  discovered: Array<{ storyId: string; storyDir: string; storyFile: string }>,
  verbose: boolean,
): Promise<void> {
  // Apply epic prefix filter (AC-4)
  if (epicFilter && !storyId.startsWith(epicFilter)) {
    if (verbose) {
      process.stdout.write(`[sync:epic] Skipping ${storyId} (epic filter: ${epicFilter})\n`)
    }
    return
  }

  const storyFile = path.join(storyDir, `${storyId}.md`)
  try {
    await readFile(storyFile, 'utf-8')
    discovered.push({ storyId, storyDir, storyFile })
    if (verbose) {
      process.stdout.write(`[sync:epic] Discovered: ${storyId}\n`)
    }
  } catch {
    // No story file — skip
  }
}

// ============================================================================
// Dry-run DB batch query helper
// ============================================================================

/** Query DB for multiple story checksums in a single query (N+1 prevention, AC-6) */
async function batchQueryDbChecksums(storyIds: string[]): Promise<Map<string, string>> {
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
    const placeholders = storyIds.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pool.query<{ story_id: string; checksum: string }>(
      `SELECT s.story_id, a.checksum
       FROM kbar.artifacts a
       JOIN kbar.stories s ON a.story_id = s.id
       WHERE s.story_id IN (${placeholders}) AND a.artifact_type = 'story_file'`,
      storyIds,
    )
    return new Map(result.rows.map(r => [r.story_id, r.checksum]))
  } finally {
    await pool.end()
  }
}

// ============================================================================
// Dry-run: single batch DB query (AC-6, N+1 prevention)
// ============================================================================

/**
 * Dry-run for epic: single batch DB query for all story checksums.
 * Does NOT call syncStoryToDatabase (zero-mutation).
 */
export async function dryRunEpic(
  storyDirs: Array<{ storyId: string; storyDir: string; storyFile: string }>,
  verbose: boolean,
): Promise<Map<string, { upToDate: boolean; currentChecksum: string; dbChecksum: string | null }>> {
  const results = new Map<
    string,
    { upToDate: boolean; currentChecksum: string; dbChecksum: string | null }
  >()

  if (storyDirs.length === 0) {
    return results
  }

  // Lazy-load types module (no DB init)
  const { computeChecksum, validateFilePath, validateNotSymlink } =
    await import('../src/__types__/index.js')

  // Compute all checksums in parallel
  const checksumEntries = await Promise.all(
    storyDirs.map(async ({ storyId, storyFile }) => {
      try {
        const baseDir = path.resolve(process.cwd(), 'plans')
        validateFilePath(storyFile, baseDir)
        await validateNotSymlink(storyFile)

        const content = await readFile(storyFile, 'utf-8')
        const checksum = computeChecksum(content)
        return { storyId, checksum, error: null } as {
          storyId: string
          checksum: string
          error: null
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        return { storyId, checksum: null, error: msg } as {
          storyId: string
          checksum: null
          error: string
        }
      }
    }),
  )

  const validEntries = checksumEntries.filter(
    (e): e is { storyId: string; checksum: string; error: null } => e.checksum !== null,
  )
  const storyIds = validEntries.map(e => e.storyId)

  for (const entry of checksumEntries) {
    if (entry.error !== null) {
      process.stderr.write(
        `[sync:epic] DRY-RUN: ${entry.storyId} checksum failed: ${entry.error}\n`,
      )
    }
  }

  if (storyIds.length === 0) {
    return results
  }

  // Single batch query for all story checksums (N+1 prevention, AC-6)
  const dbChecksums = await batchQueryDbChecksums(storyIds)

  for (const { storyId, checksum } of validEntries) {
    const dbChecksum = dbChecksums.get(storyId) ?? null
    const upToDate = dbChecksum !== null && checksum === dbChecksum
    results.set(storyId, { upToDate, currentChecksum: checksum, dbChecksum })

    const status = dbChecksum === null ? 'NOT IN DB' : upToDate ? 'UP-TO-DATE' : 'WOULD SYNC'
    process.stdout.write(`[sync:epic] DRY-RUN: ${storyId} — ${status}\n`)
    if (verbose && !upToDate) {
      process.stdout.write(`[sync:epic]   fs=${checksum} db=${dbChecksum ?? 'null'}\n`)
    }
  }

  return results
}

// ============================================================================
// Arg Parsing
// ============================================================================

export function parseArgs(args: string[]): Record<string, unknown> | null {
  if (args.includes('--help') || args.includes('-h')) {
    return null
  }

  const opts: Record<string, unknown> = {}
  let i = 0

  while (i < args.length) {
    const arg = args[i]

    if (arg === '--base-dir') {
      opts.baseDir = args[++i]
    } else if (arg === '--epic') {
      opts.epic = args[++i]
    } else if (arg === '--dry-run') {
      opts.dryRun = true
    } else if (arg === '--verbose') {
      opts.verbose = true
    } else if (arg === '--force') {
      opts.force = true
    } else if (arg === '--artifact-type') {
      opts.artifactType = args[++i]
    } else if (arg === '--checkpoint') {
      opts.checkpoint = args[++i]
    }

    i++
  }

  return opts
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
  const parseResult = SyncEpicCLIOptionsSchema.safeParse(rawOpts)
  if (!parseResult.success) {
    const errors = parseResult.error.errors
      .map(e => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n')
    process.stderr.write(`[sync:epic] ERROR: Invalid options:\n${errors}\n`)
    process.stderr.write(`Run 'sync:epic --help' for usage.\n`)
    process.exit(1)
  }

  const opts = parseResult.data
  const { baseDir, epic, dryRun, verbose, artifactType, checkpoint } = opts

  if (verbose) {
    process.stdout.write(
      `[sync:epic] Starting epic sync: baseDir=${baseDir} epic=${epic ?? 'all'} dryRun=${dryRun}\n`,
    )
  }

  // =========================================================================
  // --artifact-type: Cross-story artifact sync (AC-5)
  // =========================================================================
  if (artifactType) {
    const { batchSyncByType } = await import('../src/index.js')

    try {
      process.stdout.write(
        `[sync:epic] Syncing artifacts by type: ${artifactType}${checkpoint ? ` (checkpoint: ${checkpoint})` : ''}\n`,
      )

      const result = await batchSyncByType({
        artifactType: artifactType as NonStoryArtifactType,
        baseDir,
        triggeredBy: 'automation',
        checkpointName: checkpoint,
      })

      process.stdout.write(
        `[sync:epic] Artifact type ${artifactType}: discovered=${result.totalDiscovered} synced=${result.totalSynced} skipped=${result.totalSkipped} failed=${result.totalFailed}\n`,
      )

      if (checkpoint) {
        process.stdout.write(
          `[sync:epic] Checkpoint '${result.checkpointName}' updated. Last processed: ${result.lastProcessedPath ?? 'none'}\n`,
        )
      }

      if (result.totalFailed > 0) {
        process.exit(1)
      }
      process.exit(0)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        process.stderr.write(`[sync:epic] ERROR: DB connection failed: ${msg}\n`)
        process.exit(2)
      }
      process.stderr.write(`[sync:epic] ERROR: Artifact type sync failed: ${msg}\n`)
      process.exit(1)
    }
  }

  // =========================================================================
  // Discover story directories (AC-4)
  // =========================================================================
  let storyDirs: Array<{ storyId: string; storyDir: string; storyFile: string }>
  try {
    storyDirs = await discoverStoryDirs(baseDir, epic, verbose)
  } catch (error) {
    rethrowExitError(error)
    const msg = error instanceof Error ? error.message : String(error)
    process.stderr.write(`[sync:epic] ERROR: Story discovery failed: ${msg}\n`)
    process.exit(1)
  }

  process.stdout.write(`[sync:epic] Discovered ${storyDirs!.length} stories\n`)

  if (storyDirs!.length === 0) {
    process.stdout.write(`[sync:epic] No stories found under ${baseDir}\n`)
    process.exit(0)
  }

  // =========================================================================
  // --dry-run: Single batch query (AC-6, N+1 prevention)
  // =========================================================================
  if (dryRun) {
    try {
      const dryResults = await dryRunEpic(storyDirs!, verbose)
      const needsSync = [...dryResults.values()].filter(r => !r.upToDate).length
      const upToDate = [...dryResults.values()].filter(r => r.upToDate).length
      const notInDb = [...dryResults.values()].filter(r => r.dbChecksum === null).length

      process.stdout.write(
        `[sync:epic] DRY-RUN SUMMARY: ${storyDirs!.length} stories — up-to-date=${upToDate} would-sync=${needsSync} not-in-db=${notInDb}\n`,
      )

      process.exit(needsSync > 0 ? 1 : 0)
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        process.stderr.write(`[sync:epic] ERROR: DB connection failed during dry-run: ${msg}\n`)
        process.exit(2)
      }
      process.stderr.write(`[sync:epic] ERROR: Dry-run failed: ${msg}\n`)
      process.exit(1)
    }
  }

  // =========================================================================
  // Execute: Per-story sync loop with fail-soft (AC-4)
  // =========================================================================
  const { syncStoryToDatabase } = await import('../src/index.js')

  let successCount = 0
  let failCount = 0
  let skipCount = 0

  for (const { storyId, storyFile } of storyDirs!) {
    try {
      if (verbose) {
        process.stdout.write(`[sync:epic] Syncing: ${storyId}\n`)
      }

      const result = await syncStoryToDatabase({
        storyId,
        filePath: storyFile,
        triggeredBy: 'automation',
      })

      if (result.success) {
        if (result.syncStatus === 'skipped') {
          skipCount++
          if (verbose) {
            process.stdout.write(`[sync:epic] ${storyId}: skipped (no changes)\n`)
          }
        } else {
          successCount++
          if (verbose) {
            process.stdout.write(`[sync:epic] ${storyId}: ${result.syncStatus}\n`)
          }
        }
      } else {
        failCount++
        process.stderr.write(
          `[sync:epic] ${storyId}: FAILED — ${result.error ?? result.message ?? 'unknown'}\n`,
        )
        // Fail-soft: continue with next story (AC-4)
      }
    } catch (error) {
      rethrowExitError(error)
      const msg = error instanceof Error ? error.message : String(error)
      failCount++
      if (msg.includes('connection') || msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        process.stderr.write(`[sync:epic] ERROR: DB connection failed for ${storyId}: ${msg}\n`)
        process.stdout.write(
          `[sync:epic] SUMMARY: success=${successCount} skipped=${skipCount} failed=${failCount} (aborted on DB failure)\n`,
        )
        process.exit(2)
      }
      process.stderr.write(`[sync:epic] ${storyId}: ERROR — ${msg}\n`)
      // Fail-soft: continue with next story
    }
  }

  // Progress summary (AC-9)
  process.stdout.write(
    `[sync:epic] SUMMARY: total=${storyDirs!.length} success=${successCount} skipped=${skipCount} failed=${failCount}\n`,
  )

  process.exit(failCount > 0 ? 1 : 0)
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

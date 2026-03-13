/**
 * Cleanup Migrated Files Script
 *
 * Removes filesystem artifacts that have been successfully migrated to the database.
 *
 * Usage:
 *   pnpm tsx src/scripts/cleanup-migrated-files.ts --dry-run
 *   pnpm tsx src/scripts/cleanup-migrated-files.ts
 *   pnpm tsx src/scripts/cleanup-migrated-files.ts --stories-dir /path/to/plans
 *
 * WARNING: This script deletes files. Always run with --dry-run first!
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface CleanupStats {
  filesDeleted: number
  dirsDeleted: number
  skipped: number
  errors: string[]
}

// ============================================================================
// Database
// ============================================================================

function createPool(): Pool {
  return new Pool({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password: process.env.KB_DB_PASSWORD,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })
}

// ============================================================================
// Artifact Files to Check
// ============================================================================

const ARTIFACT_FILES = [
  'CHECKPOINT.yaml',
  'SCOPE.yaml',
  'PLAN.yaml',
  'plan.yaml',
  'EVIDENCE.yaml',
  'REVIEW.yaml',
  'QA-VERIFY.yaml',
  'VERIFICATION.yaml',
  'verification.yaml',
  'DECISIONS.yaml',
  'ELAB.yaml',
  'FIX-CONTEXT.yaml',
  'FIX-SUMMARY.yaml',
  'ANALYSIS.yaml',
  'KNOWLEDGE-CONTEXT.yaml',
  'COMPLETION-REPORT.yaml',
  'PROOF.yaml',
  'QA-GATE.yaml',
  'GATE-DECISION.yaml',
  'test-plan.yaml',
  'test-plan.md',
  'dev-feasibility.yaml',
  'uiux-notes.yaml',
  'STORY-SEED.yaml',
  'STORY-SEED.md',
]

// ============================================================================
// Cleanup
// ============================================================================

async function cleanupStoryArtifacts(
  storyDir: string,
  dryRun: boolean,
  verbose: boolean,
): Promise<{ deleted: number; errors: string[] }> {
  let deleted = 0
  const errors: string[] = []

  const implDir = path.join(storyDir, '_implementation')

  // Check each artifact file
  for (const filename of ARTIFACT_FILES) {
    const filePath = path.join(implDir, filename)

    try {
      await fs.access(filePath)
      // File exists - delete it
      if (!dryRun) {
        await fs.unlink(filePath)
      }
      deleted++
      if (verbose) {
        console.log(`  Deleted: ${filePath}`)
      }
    } catch {
      // File doesn't exist - skip
    }
  }

  // Try to delete the _implementation directory if empty
  try {
    const implExists = await fs
      .access(implDir)
      .then(() => true)
      .catch(() => false)
    if (implExists) {
      const entries = await fs.readdir(implDir)
      if (entries.length === 0) {
        if (!dryRun) {
          await fs.rmdir(implDir)
        }
        deleted++
        if (verbose) {
          console.log(`  Deleted empty dir: ${implDir}`)
        }
      }
    }
  } catch (error) {
    errors.push(`Error checking ${implDir}: ${error}`)
  }

  return { deleted, errors }
}

async function findStoryDirectories(
  storiesDir: string,
): Promise<{ storyId: string; dir: string }[]> {
  const results: { storyId: string; dir: string }[] = []
  const visited = new Set<string>()

  async function walk(dir: string, depth: number = 0) {
    if (depth > 6 || visited.has(dir)) return
    visited.add(dir)

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (entry.name.startsWith('.') || entry.name === 'node_modules') {
            continue
          }

          // Check if this is a story directory
          if (/^[A-Z]{2,6}-\d{4,5}$/.test(entry.name)) {
            results.push({ storyId: entry.name, dir: path.join(dir, entry.name) })
          } else {
            await walk(path.join(dir, entry.name), depth + 1)
          }
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  await walk(storiesDir)
  return results
}

async function checkStoryHasArtifacts(db: Pool, storyId: string): Promise<boolean> {
  const tables = [
    'artifacts.artifact_checkpoints',
    'artifacts.artifact_scopes',
    'artifacts.artifact_plans',
    'artifacts.artifact_evidence',
    'artifacts.artifact_reviews',
    'artifacts.artifact_verifications',
    'artifacts.artifact_elaborations',
    'artifacts.artifact_fix_summaries',
    'artifacts.artifact_analyses',
    'artifacts.artifact_contexts',
    'artifacts.artifact_completion_reports',
    'artifacts.artifact_proofs',
    'artifacts.artifact_qa_gates',
    'artifacts.artifact_test_plans',
    'artifacts.artifact_dev_feasibility',
    'artifacts.artifact_uiux_notes',
    'artifacts.artifact_story_seeds',
  ]

  for (const table of tables) {
    try {
      const result = await db.query(`SELECT 1 FROM ${table} WHERE target_id = $1 LIMIT 1`, [
        storyId,
      ])
      if (result.rows.length > 0) {
        return true
      }
    } catch {
      // Table might not exist or other error - skip
    }
  }

  return false
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')
  const checkDb = args.includes('--check-db')

  let storiesDir = path.resolve(process.cwd(), 'plans')
  const dirArg = args.find(a => a.startsWith('--stories-dir='))
  if (dirArg) {
    storiesDir = dirArg.replace('--stories-dir=', '')
  }

  console.log(`Cleanup Migrated Files Script`)
  console.log(`============================`)
  console.log(`Stories directory: ${storiesDir}`)
  console.log(`Dry run: ${dryRun}`)
  console.log(`Check DB for migration status: ${checkDb}`)
  console.log()

  if (!dryRun) {
    console.log(`⚠️  WARNING: This will delete files!`)
    console.log(`   Run with --dry-run first to see what would be deleted.`)
    console.log()
  }

  const db = createPool()

  try {
    await db.query('SELECT 1')
    console.log('Database connection: OK')
    console.log()

    // Find all story directories
    const storyDirs = await findStoryDirectories(storiesDir)
    console.log(`Found ${storyDirs.length} story directories`)
    console.log()

    const stats: CleanupStats = {
      filesDeleted: 0,
      dirsDeleted: 0,
      skipped: 0,
      errors: [],
    }

    for (const { storyId, dir } of storyDirs) {
      // Check if story has artifacts in DB (if checkDb is enabled)
      if (checkDb) {
        const hasArtifacts = await checkStoryHasArtifacts(db, storyId)
        if (!hasArtifacts) {
          stats.skipped++
          if (verbose) {
            console.log(`SKIPPED (no DB artifacts): ${storyId}`)
          }
          continue
        }
      }

      const implDir = path.join(dir, '_implementation')

      // Check if _implementation directory exists
      try {
        await fs.access(implDir)
      } catch {
        // Directory doesn't exist - skip
        stats.skipped++
        continue
      }

      // Count files before
      let fileCount = 0
      try {
        const files = await fs.readdir(implDir)
        fileCount = files.filter(f => f.endsWith('.yaml') || f.endsWith('.md')).length
      } catch {
        // Ignore
      }

      if (fileCount === 0) {
        stats.skipped++
        continue
      }

      const result = await cleanupStoryArtifacts(dir, dryRun, verbose)
      stats.filesDeleted += result.deleted
      stats.errors.push(...result.errors)

      if (verbose || result.deleted > 0) {
        console.log(`${storyId}: ${result.deleted} files`)
      }
    }

    console.log()
    console.log(`Cleanup Summary`)
    console.log(`===============`)
    console.log(`Files deleted: ${stats.filesDeleted}`)
    console.log(`Skipped: ${stats.skipped}`)
    if (stats.errors.length > 0) {
      console.log(`Errors: ${stats.errors.length}`)
      stats.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`))
    }

    if (dryRun) {
      console.log()
      console.log(`Run without --dry-run to actually delete files.`)
    }
  } finally {
    await db.end()
  }
}

main().catch(console.error)

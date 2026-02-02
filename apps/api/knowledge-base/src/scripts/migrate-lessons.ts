#!/usr/bin/env tsx
/**
 * Lessons Learned Migration Script
 *
 * Migrates LESSONS-LEARNED.md content to the Knowledge Base.
 *
 * Usage:
 *   pnpm --filter knowledge-base tsx src/scripts/migrate-lessons.ts [options]
 *
 * Options:
 *   --dry-run       Parse and report without importing
 *   --validate-only Parse and validate without importing
 *   --verbose       Show detailed output
 *   --source <path> Specify source files (can be repeated)
 *
 * @see KNOW-043 for migration requirements
 */

import { resolve, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync } from 'fs'
import { config } from 'dotenv'
import { glob } from 'glob'
import { v4 as uuidv4 } from 'uuid'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { smartParseLessonsFile } from '../migration/lessons-parser.js'
import {
  type MigrationOptions,
  type MigrationReport,
  type FileMigrationResult,
  lessonToKbEntry,
  generateContentHash,
} from '../migration/__types__/index.js'
import { kbBulkImport } from '../seed/kb-bulk-import.js'
import { createEmbeddingClient } from '../embedding-client/index.js'
import * as schema from '../db/schema.js'
import type { KnowledgeBaseDb } from '../db/client.js'
const { knowledgeEntries } = schema

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../../.env') })

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
}

function log(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logVerbose(message: string, options: MigrationOptions): void {
  if (options.verbose) {
    log(`  ${message}`, 'dim')
  }
}

/**
 * Parse CLI arguments.
 */
function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dry_run: false,
    validate_only: false,
    verbose: false,
    source_paths: [],
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--dry-run':
        options.dry_run = true
        break
      case '--validate-only':
        options.validate_only = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--source':
        if (args[i + 1]) {
          options.source_paths = options.source_paths || []
          options.source_paths.push(args[++i])
        }
        break
      case '--help':
      case '-h':
        console.log(`
Lessons Learned Migration Script

Usage:
  pnpm --filter knowledge-base tsx src/scripts/migrate-lessons.ts [options]

Options:
  --dry-run       Parse and report without importing
  --validate-only Parse and validate without importing
  --verbose, -v   Show detailed output
  --source <path> Specify source files (can be repeated)
  --help, -h      Show this help message
`)
        process.exit(0)
    }
  }

  return options
}

/**
 * Auto-discover LESSONS-LEARNED.md files in the monorepo.
 */
async function discoverLessonsFiles(monorepoRoot: string): Promise<string[]> {
  const pattern = '**/LESSONS-LEARNED.md'
  const ignore = ['**/node_modules/**', '**/dist/**', '**/.git/**']

  const files = await glob(pattern, {
    cwd: monorepoRoot,
    ignore,
    absolute: true,
  })

  return files.sort()
}

/**
 * Get KB entry count for verification.
 */
async function getKbEntryCount(db: ReturnType<typeof drizzle>): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(knowledgeEntries)
  return result[0]?.count ?? 0
}

/**
 * Check for duplicate content in KB.
 */
async function getExistingHashes(db: ReturnType<typeof drizzle>): Promise<Set<string>> {
  const entries = await db.select({ content: knowledgeEntries.content }).from(knowledgeEntries)

  const hashes = new Set<string>()
  for (const entry of entries) {
    hashes.add(generateContentHash(entry.content))
  }
  return hashes
}

/**
 * Run the migration.
 */
async function runMigration(options: MigrationOptions): Promise<MigrationReport> {
  const startTime = Date.now()
  const sessionId = uuidv4()

  const report: MigrationReport = {
    dry_run: options.dry_run,
    started_at: new Date().toISOString(),
    completed_at: '',
    duration_ms: 0,
    files_discovered: 0,
    files_processed: 0,
    total_lessons_found: 0,
    total_lessons_imported: 0,
    total_lessons_skipped: 0,
    total_lessons_failed: 0,
    file_results: [],
    session_id: sessionId,
  }

  // Find monorepo root
  const monorepoRoot = resolve(__dirname, '../../../../../..')
  log(`\n${'='.repeat(60)}`, 'cyan')
  log('  Lessons Learned Migration', 'cyan')
  log('='.repeat(60), 'cyan')
  log('')

  if (options.dry_run) {
    log('[DRY RUN] No data will be written', 'yellow')
    log('')
  }

  // Discover or use provided files
  let files: string[]
  if (options.source_paths && options.source_paths.length > 0) {
    files = options.source_paths.map(p => resolve(p))
    log(`Using ${files.length} specified source file(s)`, 'dim')
  } else {
    log('Discovering LESSONS-LEARNED.md files...', 'dim')
    files = await discoverLessonsFiles(monorepoRoot)
    log(`Found ${files.length} file(s)`, 'dim')
  }

  report.files_discovered = files.length

  if (files.length === 0) {
    log('\nNo LESSONS-LEARNED.md files found.', 'yellow')
    report.completed_at = new Date().toISOString()
    report.duration_ms = Date.now() - startTime
    return report
  }

  // Connect to database if not dry-run
  let db: KnowledgeBaseDb | null = null
  let pool: Pool | null = null
  let embeddingClient: ReturnType<typeof createEmbeddingClient> | null = null

  if (!options.dry_run && !options.validate_only) {
    const password = process.env.KB_DB_PASSWORD
    if (!password) {
      log('\n[ERROR] KB_DB_PASSWORD environment variable required', 'red')
      process.exit(1)
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      log('\n[ERROR] OPENAI_API_KEY environment variable required', 'red')
      process.exit(1)
    }

    pool = new Pool({
      host: process.env.KB_DB_HOST || 'localhost',
      port: parseInt(process.env.KB_DB_PORT || '5433', 10),
      database: process.env.KB_DB_NAME || 'knowledgebase',
      user: process.env.KB_DB_USER || 'kbuser',
      password,
    })

    db = drizzle(pool, { schema }) as KnowledgeBaseDb
    embeddingClient = createEmbeddingClient()

    // Get counts before migration
    report.kb_count_before = await getKbEntryCount(db)
    log(`KB entries before: ${report.kb_count_before}`, 'dim')
  }

  log('')
  log('Processing files:', 'bold')
  log('')

  // Get existing content hashes for deduplication
  const existingHashes = db ? await getExistingHashes(db) : new Set<string>()

  // Process each file
  for (const filePath of files) {
    const relativePath = relative(monorepoRoot, filePath)
    log(`  ${relativePath}`, 'cyan')

    const fileResult: FileMigrationResult = {
      source_file: relativePath,
      lessons_found: 0,
      lessons_imported: 0,
      lessons_skipped: 0,
      lessons_failed: 0,
      warnings: [],
      errors: [],
    }

    try {
      // Read and parse file
      if (!existsSync(filePath)) {
        fileResult.errors.push(`File not found: ${filePath}`)
        report.file_results.push(fileResult)
        continue
      }

      const content = readFileSync(filePath, 'utf-8')
      const parsed = smartParseLessonsFile(content, relativePath)

      fileResult.lessons_found = parsed.lessons.length
      fileResult.warnings = parsed.warnings
      report.total_lessons_found += parsed.lessons.length

      logVerbose(`Found ${parsed.lessons.length} lessons in ${parsed.story_count} stories`, options)

      if (parsed.warnings.length > 0) {
        for (const warning of parsed.warnings) {
          logVerbose(`Warning: ${warning}`, options)
        }
      }

      // Convert lessons to KB entries
      const kbEntries = parsed.lessons.map(lessonToKbEntry)

      // Filter out duplicates
      const newEntries = kbEntries.filter(entry => {
        const hash = generateContentHash(entry.content)
        if (existingHashes.has(hash)) {
          fileResult.lessons_skipped++
          return false
        }
        existingHashes.add(hash) // Track for intra-batch dedup
        return true
      })

      logVerbose(
        `${newEntries.length} new entries (${kbEntries.length - newEntries.length} duplicates skipped)`,
        options,
      )

      // Import if not dry-run
      if (!options.dry_run && !options.validate_only && db && embeddingClient) {
        if (newEntries.length > 0) {
          const importResult = await kbBulkImport(
            { entries: newEntries, dry_run: false, validate_only: false },
            { db, embeddingClient },
          )

          fileResult.lessons_imported = importResult.succeeded
          fileResult.lessons_failed = importResult.failed

          if (importResult.errors.length > 0) {
            fileResult.errors = importResult.errors.map(e => e.reason)
          }
        }
      } else {
        // In dry-run, count what would be imported
        fileResult.lessons_imported = newEntries.length
      }

      report.total_lessons_imported += fileResult.lessons_imported
      report.total_lessons_skipped += fileResult.lessons_skipped
      report.total_lessons_failed += fileResult.lessons_failed

      // Log file result
      const status = fileResult.lessons_imported > 0 ? 'green' : 'yellow'
      log(
        `    ${fileResult.lessons_found} found, ${fileResult.lessons_imported} imported, ${fileResult.lessons_skipped} skipped`,
        status,
      )
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      fileResult.errors.push(errorMessage)
      report.total_lessons_failed += fileResult.lessons_found
      log(`    [ERROR] ${errorMessage}`, 'red')
    }

    report.file_results.push(fileResult)
    report.files_processed++
  }

  // Get final count
  if (db && !options.dry_run) {
    report.kb_count_after = await getKbEntryCount(db)
  }

  // Cleanup
  if (pool) {
    await pool.end()
  }

  // Finalize report
  report.completed_at = new Date().toISOString()
  report.duration_ms = Date.now() - startTime

  return report
}

/**
 * Print migration summary.
 */
function printSummary(report: MigrationReport): void {
  log('')
  log('='.repeat(60), 'cyan')
  log('  Migration Summary', 'cyan')
  log('='.repeat(60), 'cyan')
  log('')

  if (report.dry_run) {
    log('[DRY RUN] No changes were made', 'yellow')
    log('')
  }

  log(`Files discovered:     ${report.files_discovered}`)
  log(`Files processed:      ${report.files_processed}`)
  log('')
  log(`Total lessons found:  ${report.total_lessons_found}`)
  log(
    `Lessons imported:     ${report.total_lessons_imported}`,
    report.total_lessons_imported > 0 ? 'green' : 'reset',
  )
  log(
    `Lessons skipped:      ${report.total_lessons_skipped}`,
    report.total_lessons_skipped > 0 ? 'yellow' : 'reset',
  )
  log(
    `Lessons failed:       ${report.total_lessons_failed}`,
    report.total_lessons_failed > 0 ? 'red' : 'reset',
  )
  log('')

  if (report.kb_count_before !== undefined && report.kb_count_after !== undefined) {
    log(`KB entries before:    ${report.kb_count_before}`)
    log(`KB entries after:     ${report.kb_count_after}`)
    log(`Net new entries:      ${report.kb_count_after - report.kb_count_before}`, 'green')
    log('')
  }

  log(`Duration:             ${(report.duration_ms / 1000).toFixed(2)}s`)
  log(`Session ID:           ${report.session_id}`)
  log('')

  // Show files with errors
  const filesWithErrors = report.file_results.filter(f => f.errors.length > 0)
  if (filesWithErrors.length > 0) {
    log('Files with errors:', 'red')
    for (const file of filesWithErrors) {
      log(`  ${file.source_file}:`, 'red')
      for (const error of file.errors) {
        log(`    - ${error}`, 'red')
      }
    }
    log('')
  }

  // Show files with warnings
  const filesWithWarnings = report.file_results.filter(f => f.warnings.length > 0)
  if (filesWithWarnings.length > 0) {
    log('Files with warnings:', 'yellow')
    for (const file of filesWithWarnings) {
      log(`  ${file.source_file}:`, 'yellow')
      for (const warning of file.warnings) {
        log(`    - ${warning}`, 'yellow')
      }
    }
    log('')
  }
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const options = parseArgs()

  try {
    const report = await runMigration(options)
    printSummary(report)

    // Exit with error if any failures
    if (report.total_lessons_failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    logger.error('Migration failed', { error })
    log(`\n[FATAL ERROR] ${error instanceof Error ? error.message : String(error)}`, 'red')
    process.exit(1)
  }
}

main()

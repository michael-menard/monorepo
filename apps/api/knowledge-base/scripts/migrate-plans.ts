#!/usr/bin/env tsx
/**
 * Plans Directory Migration Script
 *
 * Migrates documentation from /plans directory into the Knowledge Base system.
 *
 * Usage:
 *   pnpm --filter knowledge-base migrate:plans [options]
 *
 * Options:
 *   --source=lessons    Migrate LESSONS-LEARNED.md files
 *   --source=adrs       Migrate ADR-LOG.md
 *   --source=tech-stack Migrate tech stack documentation
 *   --source=decisions  Migrate DECISIONS.yaml files
 *   --all               Migrate all content types
 *   --dry-run           Parse and report without importing
 *   --verbose           Show detailed output
 *
 * @see Migration plan for requirements
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
import { smartParseLessonsFile } from '../src/migration/lessons-parser.js'
import { parseADRFile } from '../src/migration/adr-parser.js'
import { parseTechStackFile } from '../src/migration/tech-stack-parser.js'
import { parseDecisionsFile } from '../src/migration/decisions-parser.js'
import {
  lessonToKbEntry,
  adrToKbEntry,
  techStackToKbEntry,
  decisionsToKbEntries,
  generateContentHash,
} from '../src/migration/__types__/index.js'
import { kbBulkImport } from '../src/seed/kb-bulk-import.js'
import { createEmbeddingClient } from '../src/embedding-client/index.js'
import * as schema from '../src/db/schema.js'
import type { KnowledgeBaseDb } from '../src/db/client.js'
import type { ParsedEntry } from '../src/parsers/__types__/index.js'

const { knowledgeEntries } = schema
const __dirname = dirname(fileURLToPath(import.meta.url))

// Load .env from package root
config({ path: resolve(__dirname, '../.env') })

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

type SourceType = 'lessons' | 'adrs' | 'tech-stack' | 'decisions'

interface MigrationOptions {
  sources: SourceType[]
  dry_run: boolean
  verbose: boolean
}

interface MigrationStats {
  source: SourceType
  files_found: number
  entries_extracted: number
  entries_imported: number
  entries_skipped: number
  entries_failed: number
  warnings: string[]
  errors: string[]
}

interface MigrationReport {
  dry_run: boolean
  started_at: string
  completed_at: string
  duration_ms: number
  stats_by_source: MigrationStats[]
  total_entries_imported: number
  total_entries_skipped: number
  total_entries_failed: number
  kb_count_before?: number
  kb_count_after?: number
  session_id: string
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
    sources: [],
    dry_run: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--all') {
      options.sources = ['lessons', 'adrs', 'tech-stack', 'decisions']
    } else if (arg?.startsWith('--source=')) {
      const source = arg.split('=')[1] as SourceType
      if (['lessons', 'adrs', 'tech-stack', 'decisions'].includes(source)) {
        options.sources.push(source)
      }
    } else if (arg === '--dry-run') {
      options.dry_run = true
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Plans Directory Migration Script

Usage:
  pnpm --filter knowledge-base migrate:plans [options]

Options:
  --source=lessons    Migrate LESSONS-LEARNED.md files
  --source=adrs       Migrate ADR-LOG.md
  --source=tech-stack Migrate tech stack documentation
  --source=decisions  Migrate DECISIONS.yaml files
  --all               Migrate all content types
  --dry-run           Parse and report without importing
  --verbose, -v       Show detailed output
  --help, -h          Show this help message

Examples:
  pnpm --filter knowledge-base migrate:plans --all --dry-run
  pnpm --filter knowledge-base migrate:plans --source=lessons
  pnpm --filter knowledge-base migrate:plans --source=adrs --source=decisions
`)
      process.exit(0)
    }
  }

  if (options.sources.length === 0) {
    log('[ERROR] No source specified. Use --all or --source=<type>', 'red')
    log('Run with --help for usage information', 'dim')
    process.exit(1)
  }

  return options
}

/**
 * Get KB entry count for verification.
 */
async function getKbEntryCount(db: ReturnType<typeof drizzle>): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(knowledgeEntries)
  return result[0]?.count ?? 0
}

/**
 * Get existing content hashes for deduplication.
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
 * Find monorepo root.
 * Script is at: apps/api/knowledge-base/scripts/
 * Monorepo root is: 4 levels up
 */
function getMonorepoRoot(): string {
  return resolve(__dirname, '../../../..')
}

/**
 * Migrate lessons from LESSONS-LEARNED.md files.
 */
async function migrateLessons(
  monorepoRoot: string,
  options: MigrationOptions,
  existingHashes: Set<string>,
): Promise<{ entries: ParsedEntry[]; stats: MigrationStats }> {
  const stats: MigrationStats = {
    source: 'lessons',
    files_found: 0,
    entries_extracted: 0,
    entries_imported: 0,
    entries_skipped: 0,
    entries_failed: 0,
    warnings: [],
    errors: [],
  }

  // Find LESSONS-LEARNED.md files
  const pattern = '**/LESSONS-LEARNED.md'
  const ignore = ['**/node_modules/**', '**/dist/**', '**/.git/**']
  const files = await glob(pattern, { cwd: monorepoRoot, ignore, absolute: true })

  stats.files_found = files.length
  logVerbose(`Found ${files.length} LESSONS-LEARNED.md file(s)`, options)

  const entries: ParsedEntry[] = []

  for (const filePath of files) {
    const relativePath = relative(monorepoRoot, filePath)
    logVerbose(`Processing ${relativePath}`, options)

    if (!existsSync(filePath)) continue

    const content = readFileSync(filePath, 'utf-8')
    const parsed = smartParseLessonsFile(content, relativePath)

    stats.warnings.push(...parsed.warnings)
    stats.entries_extracted += parsed.lessons.length

    // Convert to KB entries and filter duplicates
    for (const lesson of parsed.lessons) {
      const kbEntry = lessonToKbEntry(lesson)
      const hash = generateContentHash(kbEntry.content)

      if (existingHashes.has(hash)) {
        stats.entries_skipped++
        continue
      }

      existingHashes.add(hash)
      entries.push(kbEntry)
    }
  }

  return { entries, stats }
}

/**
 * Migrate ADRs from ADR-LOG.md.
 */
async function migrateADRs(
  monorepoRoot: string,
  options: MigrationOptions,
  existingHashes: Set<string>,
): Promise<{ entries: ParsedEntry[]; stats: MigrationStats }> {
  const stats: MigrationStats = {
    source: 'adrs',
    files_found: 0,
    entries_extracted: 0,
    entries_imported: 0,
    entries_skipped: 0,
    entries_failed: 0,
    warnings: [],
    errors: [],
  }

  // Find ADR-LOG.md files
  const pattern = '**/ADR-LOG.md'
  const ignore = ['**/node_modules/**', '**/dist/**', '**/.git/**']
  const files = await glob(pattern, { cwd: monorepoRoot, ignore, absolute: true })

  stats.files_found = files.length
  logVerbose(`Found ${files.length} ADR-LOG.md file(s)`, options)

  const entries: ParsedEntry[] = []

  for (const filePath of files) {
    const relativePath = relative(monorepoRoot, filePath)
    logVerbose(`Processing ${relativePath}`, options)

    if (!existsSync(filePath)) continue

    const content = readFileSync(filePath, 'utf-8')
    const parsed = parseADRFile(content, relativePath)

    stats.warnings.push(...parsed.warnings)
    stats.entries_extracted += parsed.adrs.length

    // Convert to KB entries and filter duplicates
    for (const adr of parsed.adrs) {
      const kbEntry = adrToKbEntry(adr)
      const hash = generateContentHash(kbEntry.content)

      if (existingHashes.has(hash)) {
        stats.entries_skipped++
        continue
      }

      existingHashes.add(hash)
      entries.push(kbEntry)
    }
  }

  return { entries, stats }
}

/**
 * Migrate tech stack documentation.
 */
async function migrateTechStack(
  monorepoRoot: string,
  options: MigrationOptions,
  existingHashes: Set<string>,
): Promise<{ entries: ParsedEntry[]; stats: MigrationStats }> {
  const stats: MigrationStats = {
    source: 'tech-stack',
    files_found: 0,
    entries_extracted: 0,
    entries_imported: 0,
    entries_skipped: 0,
    entries_failed: 0,
    warnings: [],
    errors: [],
  }

  // Find tech stack docs
  const pattern = 'docs/tech-stack/*.md'
  const files = await glob(pattern, { cwd: monorepoRoot, absolute: true })

  stats.files_found = files.length
  logVerbose(`Found ${files.length} tech-stack doc(s)`, options)

  const entries: ParsedEntry[] = []

  for (const filePath of files) {
    const relativePath = relative(monorepoRoot, filePath)
    logVerbose(`Processing ${relativePath}`, options)

    if (!existsSync(filePath)) continue

    const content = readFileSync(filePath, 'utf-8')
    const parsed = parseTechStackFile(content, relativePath)

    if (!parsed) continue

    stats.entries_extracted++

    const kbEntry = techStackToKbEntry(parsed)
    const hash = generateContentHash(kbEntry.content)

    if (existingHashes.has(hash)) {
      stats.entries_skipped++
      continue
    }

    existingHashes.add(hash)
    entries.push(kbEntry)
  }

  return { entries, stats }
}

/**
 * Migrate epic DECISIONS.yaml files.
 */
async function migrateDecisions(
  monorepoRoot: string,
  options: MigrationOptions,
  existingHashes: Set<string>,
): Promise<{ entries: ParsedEntry[]; stats: MigrationStats }> {
  const stats: MigrationStats = {
    source: 'decisions',
    files_found: 0,
    entries_extracted: 0,
    entries_imported: 0,
    entries_skipped: 0,
    entries_failed: 0,
    warnings: [],
    errors: [],
  }

  // Find DECISIONS.yaml files
  const pattern = '**/DECISIONS.yaml'
  const ignore = ['**/node_modules/**', '**/dist/**', '**/.git/**']
  const files = await glob(pattern, { cwd: monorepoRoot, ignore, absolute: true })

  stats.files_found = files.length
  logVerbose(`Found ${files.length} DECISIONS.yaml file(s)`, options)

  const entries: ParsedEntry[] = []

  for (const filePath of files) {
    const relativePath = relative(monorepoRoot, filePath)
    logVerbose(`Processing ${relativePath}`, options)

    if (!existsSync(filePath)) continue

    const content = readFileSync(filePath, 'utf-8')
    const parsed = parseDecisionsFile(content, relativePath)

    stats.warnings.push(...parsed.warnings)

    // Convert to KB entries
    const kbEntries = decisionsToKbEntries(parsed)
    stats.entries_extracted += kbEntries.length

    // Filter duplicates
    for (const kbEntry of kbEntries) {
      const hash = generateContentHash(kbEntry.content)

      if (existingHashes.has(hash)) {
        stats.entries_skipped++
        continue
      }

      existingHashes.add(hash)
      entries.push(kbEntry)
    }
  }

  return { entries, stats }
}

/**
 * Run the migration.
 */
async function runMigration(options: MigrationOptions): Promise<MigrationReport> {
  const startTime = Date.now()
  const sessionId = uuidv4()
  const monorepoRoot = getMonorepoRoot()

  const report: MigrationReport = {
    dry_run: options.dry_run,
    started_at: new Date().toISOString(),
    completed_at: '',
    duration_ms: 0,
    stats_by_source: [],
    total_entries_imported: 0,
    total_entries_skipped: 0,
    total_entries_failed: 0,
    session_id: sessionId,
  }

  log('')
  log('='.repeat(60), 'cyan')
  log('  Plans Directory Migration', 'cyan')
  log('='.repeat(60), 'cyan')
  log('')

  if (options.dry_run) {
    log('[DRY RUN] No data will be written', 'yellow')
    log('')
  }

  log(`Sources to migrate: ${options.sources.join(', ')}`, 'dim')
  log(`Monorepo root: ${monorepoRoot}`, 'dim')
  log('')

  // Connect to database if not dry-run
  let db: KnowledgeBaseDb | null = null
  let pool: Pool | null = null
  let embeddingClient: ReturnType<typeof createEmbeddingClient> | null = null
  let existingHashes = new Set<string>()

  if (!options.dry_run) {
    const password = process.env.KB_DB_PASSWORD
    if (!password) {
      log('[ERROR] KB_DB_PASSWORD environment variable required', 'red')
      process.exit(1)
    }

    const openaiKey = process.env.OPENAI_API_KEY
    if (!openaiKey) {
      log('[ERROR] OPENAI_API_KEY environment variable required', 'red')
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

    report.kb_count_before = await getKbEntryCount(db)
    existingHashes = await getExistingHashes(db)
    log(`KB entries before: ${report.kb_count_before}`, 'dim')
    log(`Existing content hashes: ${existingHashes.size}`, 'dim')
    log('')
  }

  // Collect all entries
  const allEntries: ParsedEntry[] = []

  // Process each source
  for (const source of options.sources) {
    log(`Processing: ${source}`, 'cyan')

    let result: { entries: ParsedEntry[]; stats: MigrationStats }

    switch (source) {
      case 'lessons':
        result = await migrateLessons(monorepoRoot, options, existingHashes)
        break
      case 'adrs':
        result = await migrateADRs(monorepoRoot, options, existingHashes)
        break
      case 'tech-stack':
        result = await migrateTechStack(monorepoRoot, options, existingHashes)
        break
      case 'decisions':
        result = await migrateDecisions(monorepoRoot, options, existingHashes)
        break
    }

    report.stats_by_source.push(result.stats)
    allEntries.push(...result.entries)

    log(
      `  Files: ${result.stats.files_found}, Extracted: ${result.stats.entries_extracted}, New: ${result.entries.length}, Skipped: ${result.stats.entries_skipped}`,
      result.entries.length > 0 ? 'green' : 'yellow',
    )

    if (result.stats.warnings.length > 0 && options.verbose) {
      for (const warning of result.stats.warnings) {
        log(`  Warning: ${warning}`, 'yellow')
      }
    }
  }

  log('')

  // Import entries if not dry-run
  if (!options.dry_run && db && embeddingClient && allEntries.length > 0) {
    log(`Importing ${allEntries.length} entries...`, 'bold')

    const importResult = await kbBulkImport(
      { entries: allEntries, dry_run: false, validate_only: false },
      { db, embeddingClient },
    )

    report.total_entries_imported = importResult.succeeded
    report.total_entries_failed = importResult.failed

    // Update stats
    for (const stats of report.stats_by_source) {
      // Distribute based on proportion
      const proportion = allEntries.filter(e => e.source_file?.includes(stats.source)).length
      stats.entries_imported = Math.round((proportion / allEntries.length) * importResult.succeeded)
      stats.entries_failed = Math.round((proportion / allEntries.length) * importResult.failed)
    }

    if (importResult.errors.length > 0) {
      for (const error of importResult.errors.slice(0, 5)) {
        log(`  Error at index ${error.index}: ${error.reason}`, 'red')
      }
      if (importResult.errors.length > 5) {
        log(`  ... and ${importResult.errors.length - 5} more errors`, 'red')
      }
    }
  } else if (options.dry_run) {
    report.total_entries_imported = allEntries.length // Would be imported
    for (const stats of report.stats_by_source) {
      stats.entries_imported = allEntries.filter(e =>
        e.source_file?.toLowerCase().includes(stats.source),
      ).length
    }
  }

  // Calculate skipped totals
  for (const stats of report.stats_by_source) {
    report.total_entries_skipped += stats.entries_skipped
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

  // Per-source stats
  log('By Source:', 'bold')
  for (const stats of report.stats_by_source) {
    const color = stats.entries_imported > 0 ? 'green' : 'yellow'
    log(
      `  ${stats.source.padEnd(12)} Files: ${stats.files_found}, Extracted: ${stats.entries_extracted}, Imported: ${stats.entries_imported}, Skipped: ${stats.entries_skipped}`,
      color,
    )
  }
  log('')

  // Totals
  log('Totals:', 'bold')
  log(
    `  Imported:  ${report.total_entries_imported}`,
    report.total_entries_imported > 0 ? 'green' : 'reset',
  )
  log(
    `  Skipped:   ${report.total_entries_skipped}`,
    report.total_entries_skipped > 0 ? 'yellow' : 'reset',
  )
  log(
    `  Failed:    ${report.total_entries_failed}`,
    report.total_entries_failed > 0 ? 'red' : 'reset',
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
}

/**
 * Main entry point.
 */
async function main(): Promise<void> {
  const options = parseArgs()

  try {
    const report = await runMigration(options)
    printSummary(report)

    if (report.total_entries_failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    logger.error('Migration failed', { error })
    log(`\n[FATAL ERROR] ${error instanceof Error ? error.message : String(error)}`, 'red')
    process.exit(1)
  }
}

main()

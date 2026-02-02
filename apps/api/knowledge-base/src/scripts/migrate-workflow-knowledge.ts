#!/usr/bin/env tsx
/**
 * Workflow Knowledge Migration Script
 *
 * Migrates workflow knowledge entries from YAML schema files to the Knowledge Base.
 *
 * Usage:
 *   pnpm --filter knowledge-base tsx src/scripts/migrate-workflow-knowledge.ts [options]
 *
 * Options:
 *   --dry-run       Parse and report without importing
 *   --verbose       Show detailed output
 *   --source <path> Specify source YAML file (can be repeated)
 *
 * @see WRKF-E2E workflow integration
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
import { parse as parseYaml } from 'yaml'
import { z } from 'zod'
import { kbBulkImport } from '../seed/kb-bulk-import.js'
import { createEmbeddingClient } from '../embedding-client/index.js'
import * as schema from '../db/schema.js'
import type { KnowledgeBaseDb } from '../db/client.js'
const { knowledgeEntries } = schema
import { generateContentHash } from '../migration/__types__/index.js'

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

// -------------------------------------------------------------------
// Schemas for YAML parsing
// -------------------------------------------------------------------

const KnowledgeEntrySchema = z.object({
  id: z.string(),
  content: z.string().min(1).max(30000),
  role: z.enum(['pm', 'dev', 'qa', 'all']),
  tags: z.array(z.string()).optional(),
})

const WorkflowSchemaFileSchema = z.object({
  schema_version: z.number(),
  knowledge_entries: z.array(KnowledgeEntrySchema).optional(),
  adr: z
    .object({
      id: z.string(),
      title: z.string(),
      date: z.string(),
      status: z.string(),
      context: z.string(),
      problem: z.string(),
      decision: z.string(),
      consequences: z.object({
        positive: z.array(z.string()),
        negative: z.array(z.string()).optional(),
      }),
      related_files: z.array(z.string()).optional(),
    })
    .optional(),
})

type KnowledgeEntry = z.infer<typeof KnowledgeEntrySchema>
type WorkflowSchemaFile = z.infer<typeof WorkflowSchemaFileSchema>

interface MigrationOptions {
  dry_run: boolean
  verbose: boolean
  source_paths: string[]
}

interface MigrationReport {
  dry_run: boolean
  started_at: string
  completed_at: string
  duration_ms: number
  files_discovered: number
  files_processed: number
  total_entries_found: number
  total_entries_imported: number
  total_entries_skipped: number
  total_entries_failed: number
  kb_count_before?: number
  kb_count_after?: number
  session_id: string
  errors: string[]
}

// -------------------------------------------------------------------
// CLI Argument Parsing
// -------------------------------------------------------------------

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    dry_run: false,
    verbose: false,
    source_paths: [],
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--dry-run':
        options.dry_run = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--source':
        if (args[i + 1]) {
          options.source_paths.push(args[++i])
        }
        break
      case '--help':
      case '-h':
        console.log(`
Workflow Knowledge Migration Script

Usage:
  pnpm --filter knowledge-base tsx src/scripts/migrate-workflow-knowledge.ts [options]

Options:
  --dry-run       Parse and report without importing
  --verbose, -v   Show detailed output
  --source <path> Specify source YAML file (can be repeated)
  --help, -h      Show this help message

Example:
  pnpm --filter knowledge-base tsx src/scripts/migrate-workflow-knowledge.ts \\
    --source .claude/schemas/workflow-e2e-integration.yaml
`)
        process.exit(0)
    }
  }

  return options
}

// -------------------------------------------------------------------
// Discovery and Parsing
// -------------------------------------------------------------------

async function discoverWorkflowSchemas(monorepoRoot: string): Promise<string[]> {
  const pattern = '.claude/schemas/**/*.yaml'
  const ignore = ['**/node_modules/**', '**/dist/**']

  const files = await glob(pattern, {
    cwd: monorepoRoot,
    ignore,
    absolute: true,
  })

  return files.sort()
}

function parseWorkflowSchema(content: string): WorkflowSchemaFile {
  const parsed = parseYaml(content)
  return WorkflowSchemaFileSchema.parse(parsed)
}

function convertToKbEntry(entry: KnowledgeEntry): {
  content: string
  role: 'pm' | 'dev' | 'qa' | 'all'
  tags: string[]
} {
  return {
    content: entry.content.trim(),
    role: entry.role,
    tags: entry.tags || [],
  }
}

// -------------------------------------------------------------------
// Database Operations
// -------------------------------------------------------------------

async function getKbEntryCount(db: ReturnType<typeof drizzle>): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(knowledgeEntries)
  return result[0]?.count ?? 0
}

async function getExistingHashes(db: ReturnType<typeof drizzle>): Promise<Set<string>> {
  const entries = await db.select({ content: knowledgeEntries.content }).from(knowledgeEntries)

  const hashes = new Set<string>()
  for (const entry of entries) {
    hashes.add(generateContentHash(entry.content))
  }
  return hashes
}

// -------------------------------------------------------------------
// Migration Execution
// -------------------------------------------------------------------

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
    total_entries_found: 0,
    total_entries_imported: 0,
    total_entries_skipped: 0,
    total_entries_failed: 0,
    session_id: sessionId,
    errors: [],
  }

  const monorepoRoot = resolve(__dirname, '../../../../..')

  log(`\n${'='.repeat(60)}`, 'cyan')
  log('  Workflow Knowledge Migration', 'cyan')
  log('='.repeat(60), 'cyan')
  log('')

  if (options.dry_run) {
    log('[DRY RUN] No data will be written', 'yellow')
    log('')
  }

  // Discover or use provided files
  let files: string[]
  if (options.source_paths.length > 0) {
    files = options.source_paths.map(p => resolve(p))
    log(`Using ${files.length} specified source file(s)`, 'dim')
  } else {
    log('Discovering workflow schema files...', 'dim')
    files = await discoverWorkflowSchemas(monorepoRoot)
    log(`Found ${files.length} file(s)`, 'dim')
  }

  report.files_discovered = files.length

  if (files.length === 0) {
    log('\nNo workflow schema files found.', 'yellow')
    report.completed_at = new Date().toISOString()
    report.duration_ms = Date.now() - startTime
    return report
  }

  // Connect to database if not dry-run
  let db: KnowledgeBaseDb | null = null
  let pool: Pool | null = null
  let embeddingClient: ReturnType<typeof createEmbeddingClient> | null = null

  if (!options.dry_run) {
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

    try {
      if (!existsSync(filePath)) {
        report.errors.push(`File not found: ${filePath}`)
        continue
      }

      const content = readFileSync(filePath, 'utf-8')
      const schema = parseWorkflowSchema(content)

      const entries = schema.knowledge_entries || []
      report.total_entries_found += entries.length

      if (options.verbose) {
        log(`    Found ${entries.length} knowledge entries`, 'dim')
      }

      // Convert to KB format
      const kbEntries = entries.map(convertToKbEntry)

      // Filter duplicates
      const newEntries = kbEntries.filter(entry => {
        const hash = generateContentHash(entry.content)
        if (existingHashes.has(hash)) {
          report.total_entries_skipped++
          return false
        }
        existingHashes.add(hash)
        return true
      })

      if (options.verbose) {
        log(`    ${newEntries.length} new, ${kbEntries.length - newEntries.length} duplicates`, 'dim')
      }

      // Import if not dry-run
      if (!options.dry_run && db && embeddingClient && newEntries.length > 0) {
        const importResult = await kbBulkImport(
          { entries: newEntries, dry_run: false, validate_only: false },
          { db, embeddingClient },
        )
        report.total_entries_imported += importResult.succeeded
        report.total_entries_failed += importResult.failed

        if (importResult.errors.length > 0) {
          for (const err of importResult.errors) {
            report.errors.push(`Entry failed: ${err.reason}`)
          }
        }
      } else {
        report.total_entries_imported += newEntries.length
      }

      log(
        `    ${entries.length} found, ${newEntries.length} imported, ${kbEntries.length - newEntries.length} skipped`,
        newEntries.length > 0 ? 'green' : 'yellow',
      )

      report.files_processed++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      report.errors.push(`${relativePath}: ${errorMessage}`)
      log(`    [ERROR] ${errorMessage}`, 'red')
    }
  }

  // Get final count
  if (db && !options.dry_run) {
    report.kb_count_after = await getKbEntryCount(db)
  }

  // Cleanup
  if (pool) {
    await pool.end()
  }

  report.completed_at = new Date().toISOString()
  report.duration_ms = Date.now() - startTime

  return report
}

// -------------------------------------------------------------------
// Summary Output
// -------------------------------------------------------------------

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
  log(`Total entries found:  ${report.total_entries_found}`)
  log(`Entries imported:     ${report.total_entries_imported}`, report.total_entries_imported > 0 ? 'green' : 'reset')
  log(`Entries skipped:      ${report.total_entries_skipped}`, report.total_entries_skipped > 0 ? 'yellow' : 'reset')
  log(`Entries failed:       ${report.total_entries_failed}`, report.total_entries_failed > 0 ? 'red' : 'reset')
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

  if (report.errors.length > 0) {
    log('Errors:', 'red')
    for (const error of report.errors) {
      log(`  - ${error}`, 'red')
    }
    log('')
  }
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------

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

#!/usr/bin/env tsx
/**
 * Markdown Documentation Migration Script
 *
 * Migrates markdown documentation files to the Knowledge Base with:
 * - Automatic chunking on ## headers
 * - Source file tracking via tags for easy updates
 * - Version tracking from front matter
 * - Replace mode for updating existing docs
 *
 * Usage:
 *   pnpm --filter knowledge-base tsx src/scripts/migrate-docs-to-kb.ts [options]
 *
 * Options:
 *   --source <path>       Directory or file to import (required, can repeat)
 *   --entry-type <type>   Entry type: note, decision, constraint, runbook, lesson (default: runbook)
 *   --role <role>         Role: pm, dev, qa, all (default: all)
 *   --base-tag <tag>      Base tag to add to all entries (e.g., 'workflow')
 *   --replace             Delete existing entries with same source tag before import
 *   --max-tokens <n>      Max tokens per chunk (default: 500)
 *   --dry-run             Parse and report without importing
 *   --verbose             Show detailed output
 *
 * Example:
 *   pnpm --filter knowledge-base tsx src/scripts/migrate-docs-to-kb.ts \
 *     --source docs/workflow/ \
 *     --entry-type runbook \
 *     --base-tag workflow \
 *     --replace
 *
 * @see KNOW-048 for chunking requirements
 */

import { resolve, dirname, relative, basename } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync, existsSync, statSync, readdirSync } from 'fs'
import { config } from 'dotenv'
import { v4 as uuidv4 } from 'uuid'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { sql, arrayContains } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { chunkMarkdown, cleanupEncoder } from '../chunking/index.js'
import { kbBulkImport } from '../seed/kb-bulk-import.js'
import { createEmbeddingClient } from '../embedding-client/index.js'
import * as schema from '../db/schema.js'
import type { KnowledgeBaseDb } from '../db/client.js'
import type { ParsedEntry } from '../parsers/__types__/index.js'

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

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

type EntryType = 'note' | 'decision' | 'constraint' | 'runbook' | 'lesson'
type Role = 'pm' | 'dev' | 'qa' | 'all'

interface MigrationOptions {
  source_paths: string[]
  entry_type: EntryType
  role: Role
  base_tag: string | null
  replace: boolean
  max_tokens: number
  dry_run: boolean
  verbose: boolean
}

interface FileInfo {
  absolutePath: string
  relativePath: string
  content: string
  version?: string
}

interface MigrationReport {
  dry_run: boolean
  started_at: string
  completed_at: string
  duration_ms: number
  files_discovered: number
  files_processed: number
  total_chunks: number
  total_entries_imported: number
  total_entries_deleted: number
  total_entries_failed: number
  kb_count_before?: number
  kb_count_after?: number
  session_id: string
  errors: string[]
  warnings: string[]
}

// -------------------------------------------------------------------
// CLI Argument Parsing
// -------------------------------------------------------------------

function parseArgs(): MigrationOptions {
  const args = process.argv.slice(2)
  const options: MigrationOptions = {
    source_paths: [],
    entry_type: 'runbook',
    role: 'all',
    base_tag: null,
    replace: false,
    max_tokens: 500,
    dry_run: false,
    verbose: false,
  }

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--source':
        if (args[i + 1]) {
          options.source_paths.push(args[++i])
        }
        break
      case '--entry-type':
        if (args[i + 1]) {
          const type = args[++i] as EntryType
          if (['note', 'decision', 'constraint', 'runbook', 'lesson'].includes(type)) {
            options.entry_type = type
          } else {
            log(`[WARN] Invalid entry type "${type}", using "runbook"`, 'yellow')
          }
        }
        break
      case '--role':
        if (args[i + 1]) {
          const role = args[++i] as Role
          if (['pm', 'dev', 'qa', 'all'].includes(role)) {
            options.role = role
          } else {
            log(`[WARN] Invalid role "${role}", using "all"`, 'yellow')
          }
        }
        break
      case '--base-tag':
        if (args[i + 1]) {
          options.base_tag = args[++i]
        }
        break
      case '--max-tokens':
        if (args[i + 1]) {
          const n = parseInt(args[++i], 10)
          if (!isNaN(n) && n > 0) {
            options.max_tokens = n
          }
        }
        break
      case '--replace':
        options.replace = true
        break
      case '--dry-run':
        options.dry_run = true
        break
      case '--verbose':
      case '-v':
        options.verbose = true
        break
      case '--help':
      case '-h':
        printHelp()
        process.exit(0)
    }
  }

  return options
}

function printHelp(): void {
  console.log(`
Markdown Documentation Migration Script

Migrates markdown docs to the Knowledge Base with chunking and source tracking.

Usage:
  pnpm --filter knowledge-base tsx src/scripts/migrate-docs-to-kb.ts [options]

Required:
  --source <path>       Directory or file to import (can be repeated)

Options:
  --entry-type <type>   Entry type: note, decision, constraint, runbook, lesson
                        (default: runbook)
  --role <role>         Role: pm, dev, qa, all (default: all)
  --base-tag <tag>      Base tag to add to all entries (e.g., 'workflow')
  --max-tokens <n>      Max tokens per chunk (default: 500)
  --replace             Delete existing entries with same source before import
  --dry-run             Parse and report without importing
  --verbose, -v         Show detailed output
  --help, -h            Show this help message

Examples:
  # Import workflow docs with replace mode
  pnpm --filter knowledge-base tsx src/scripts/migrate-docs-to-kb.ts \\
    --source docs/workflow/ \\
    --entry-type runbook \\
    --base-tag workflow \\
    --replace

  # Dry run to preview changes
  pnpm --filter knowledge-base tsx src/scripts/migrate-docs-to-kb.ts \\
    --source docs/workflow/phases.md \\
    --dry-run --verbose

Tags Applied:
  Each chunk gets these tags:
  - source:<relative-path>     (e.g., source:docs/workflow/phases.md)
  - version:<version>          (if front matter has version field)
  - type:<entry-type>          (e.g., type:runbook)
  - chunk:<index>/<total>      (e.g., chunk:0/12)
  - <base-tag>                 (if --base-tag specified)

Update Strategy:
  With --replace, all entries matching source:<path> are deleted before import.
  This ensures clean updates even when chunk boundaries change.
`)
}

// -------------------------------------------------------------------
// File Discovery
// -------------------------------------------------------------------

function discoverMarkdownFiles(sourcePath: string, monorepoRoot: string): FileInfo[] {
  const absolutePath = resolve(monorepoRoot, sourcePath)
  const files: FileInfo[] = []

  if (!existsSync(absolutePath)) {
    throw new Error(`Path not found: ${absolutePath}`)
  }

  const stat = statSync(absolutePath)

  if (stat.isFile()) {
    if (absolutePath.endsWith('.md')) {
      files.push({
        absolutePath,
        relativePath: relative(monorepoRoot, absolutePath),
        content: readFileSync(absolutePath, 'utf-8'),
      })
    }
  } else if (stat.isDirectory()) {
    const entries = readdirSync(absolutePath, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.md')) {
        const filePath = resolve(absolutePath, entry.name)
        files.push({
          absolutePath: filePath,
          relativePath: relative(monorepoRoot, filePath),
          content: readFileSync(filePath, 'utf-8'),
        })
      }
    }
  }

  return files
}

// -------------------------------------------------------------------
// Tag Helpers
// -------------------------------------------------------------------

/**
 * Sanitize a string for use in a tag.
 * Only allows alphanumeric, hyphens, underscores, colons.
 */
function sanitizeForTag(str: string): string {
  return str
    .toLowerCase()
    .replace(/\//g, '-') // slashes to hyphens
    .replace(/\./g, '-') // dots to hyphens
    .replace(/[^a-z0-9_:-]/g, '-') // other invalid chars to hyphens
    .replace(/-+/g, '-') // collapse multiple hyphens
    .replace(/^-|-$/g, '') // trim leading/trailing hyphens
}

/**
 * Create source tag from relative path.
 * Format: source:docs-workflow-phases-md
 */
function createSourceTag(relativePath: string): string {
  // Normalize path separators and remove leading ./
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\.\//, '')
  const sanitized = sanitizeForTag(normalized)
  return `source:${sanitized}`
}

/**
 * Create version tag from front matter version.
 * Format: version:3-0-0 (dots replaced with hyphens)
 */
function createVersionTag(version: string): string {
  const sanitized = sanitizeForTag(version)
  return `version:${sanitized}`
}

/**
 * Create chunk position tag.
 * Format: chunk:0-of-12
 */
function createChunkTag(index: number, total: number): string {
  return `chunk:${index}-of-${total}`
}

/**
 * Create entry type tag.
 * Format: type:runbook
 */
function createTypeTag(entryType: EntryType): string {
  return `type:${entryType}`
}

// -------------------------------------------------------------------
// Database Operations
// -------------------------------------------------------------------

async function getKbEntryCount(db: ReturnType<typeof drizzle>): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)::int` }).from(knowledgeEntries)
  return result[0]?.count ?? 0
}

/**
 * Delete all entries with a specific source tag.
 * Returns count of deleted entries.
 */
async function deleteBySourceTag(
  db: ReturnType<typeof drizzle>,
  sourceTag: string,
): Promise<number> {
  const result = await db
    .delete(knowledgeEntries)
    .where(arrayContains(knowledgeEntries.tags, [sourceTag]))
    .returning({ id: knowledgeEntries.id })

  return result.length
}

/**
 * Get count of existing entries for a source tag.
 */
async function countBySourceTag(
  db: ReturnType<typeof drizzle>,
  sourceTag: string,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(knowledgeEntries)
    .where(arrayContains(knowledgeEntries.tags, [sourceTag]))

  return result[0]?.count ?? 0
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
    total_chunks: 0,
    total_entries_imported: 0,
    total_entries_deleted: 0,
    total_entries_failed: 0,
    session_id: sessionId,
    errors: [],
    warnings: [],
  }

  const monorepoRoot = resolve(__dirname, '../../../../..')

  log(`\n${'='.repeat(60)}`, 'cyan')
  log('  Markdown Documentation Migration', 'cyan')
  log('='.repeat(60), 'cyan')
  log('')

  if (options.dry_run) {
    log('[DRY RUN] No data will be written', 'yellow')
    log('')
  }

  // Validate source paths
  if (options.source_paths.length === 0) {
    log('[ERROR] No source paths specified. Use --source <path>', 'red')
    process.exit(1)
  }

  // Discover files
  log('Discovering markdown files...', 'dim')
  const allFiles: FileInfo[] = []

  for (const sourcePath of options.source_paths) {
    try {
      const files = discoverMarkdownFiles(sourcePath, monorepoRoot)
      allFiles.push(...files)
      if (options.verbose) {
        log(`  ${sourcePath}: ${files.length} file(s)`, 'dim')
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)
      report.errors.push(msg)
      log(`  [ERROR] ${msg}`, 'red')
    }
  }

  report.files_discovered = allFiles.length
  log(`Found ${allFiles.length} markdown file(s)`, 'dim')

  if (allFiles.length === 0) {
    log('\nNo files to process.', 'yellow')
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

  // Process each file
  for (const file of allFiles) {
    const fileName = basename(file.relativePath)
    log(`  ${file.relativePath}`, 'cyan')

    try {
      // Chunk the document
      const chunkResult = chunkMarkdown(file.content, file.relativePath, {
        maxTokens: options.max_tokens,
      })

      // Extract version from front matter
      const version = chunkResult.frontMatter?.version as string | undefined

      if (options.verbose) {
        log(`    Chunks: ${chunkResult.totalChunks}`, 'dim')
        if (version) {
          log(`    Version: ${version}`, 'dim')
        }
        if (chunkResult.warnings.length > 0) {
          for (const warning of chunkResult.warnings) {
            log(`    [WARN] ${warning}`, 'yellow')
            report.warnings.push(`${fileName}: ${warning}`)
          }
        }
      }

      report.total_chunks += chunkResult.totalChunks

      // Build source tag for this file
      const sourceTag = createSourceTag(file.relativePath)

      // Handle replace mode - delete existing entries for this source
      if (options.replace && db) {
        const existingCount = await countBySourceTag(db, sourceTag)
        if (existingCount > 0) {
          const deletedCount = await deleteBySourceTag(db, sourceTag)
          report.total_entries_deleted += deletedCount
          if (options.verbose) {
            log(`    Deleted ${deletedCount} existing entries`, 'yellow')
          }
        }
      } else if (options.replace && options.dry_run) {
        log(`    [DRY RUN] Would delete entries with tag: ${sourceTag}`, 'yellow')
      }

      // Convert chunks to ParsedEntry format
      const entries: ParsedEntry[] = chunkResult.chunks.map(chunk => {
        const tags: string[] = [
          sourceTag,
          createTypeTag(options.entry_type),
          createChunkTag(chunk.chunkIndex, chunk.totalChunks),
        ]

        if (version) {
          tags.push(createVersionTag(version))
        }

        if (options.base_tag) {
          tags.push(options.base_tag)
        }

        // Add header as tag if present (for filtering)
        if (chunk.headerPath) {
          let headerTag = chunk.headerPath
            .replace(/^##\s*/, '')
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
          // Truncate to fit within 50 char limit (section: = 8 chars)
          if (headerTag.length > 42) {
            headerTag = headerTag.slice(0, 42)
          }
          if (headerTag) {
            tags.push(`section:${headerTag}`)
          }
        }

        return {
          content: chunk.content,
          role: options.role,
          tags,
          source_file: file.relativePath,
        }
      })

      // Import if not dry-run
      if (!options.dry_run && db && embeddingClient && entries.length > 0) {
        const importResult = await kbBulkImport(
          { entries, dry_run: false, validate_only: false },
          { db, embeddingClient },
        )
        report.total_entries_imported += importResult.succeeded
        report.total_entries_failed += importResult.failed

        if (importResult.errors.length > 0) {
          for (const err of importResult.errors) {
            report.errors.push(`${fileName}: ${err.reason}`)
          }
        }

        log(
          `    Imported: ${importResult.succeeded}/${entries.length} chunks`,
          importResult.failed > 0 ? 'yellow' : 'green',
        )
      } else {
        log(`    [DRY RUN] Would import ${entries.length} chunks`, 'dim')
        report.total_entries_imported += entries.length
      }

      report.files_processed++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      report.errors.push(`${fileName}: ${errorMessage}`)
      log(`    [ERROR] ${errorMessage}`, 'red')
    }
  }

  // Cleanup tiktoken encoder
  cleanupEncoder()

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
  log(`Total chunks:         ${report.total_chunks}`)
  log('')

  if (report.total_entries_deleted > 0 || report.dry_run) {
    log(
      `Entries deleted:      ${report.total_entries_deleted}`,
      report.total_entries_deleted > 0 ? 'yellow' : 'reset',
    )
  }

  log(
    `Entries imported:     ${report.total_entries_imported}`,
    report.total_entries_imported > 0 ? 'green' : 'reset',
  )
  log(
    `Entries failed:       ${report.total_entries_failed}`,
    report.total_entries_failed > 0 ? 'red' : 'reset',
  )
  log('')

  if (report.kb_count_before !== undefined && report.kb_count_after !== undefined) {
    log(`KB entries before:    ${report.kb_count_before}`)
    log(`KB entries after:     ${report.kb_count_after}`)
    const netChange = report.kb_count_after - report.kb_count_before
    log(
      `Net change:           ${netChange >= 0 ? '+' : ''}${netChange}`,
      netChange > 0 ? 'green' : netChange < 0 ? 'yellow' : 'reset',
    )
    log('')
  }

  log(`Duration:             ${(report.duration_ms / 1000).toFixed(2)}s`)
  log(`Session ID:           ${report.session_id}`)
  log('')

  if (report.warnings.length > 0) {
    log('Warnings:', 'yellow')
    for (const warning of report.warnings.slice(0, 10)) {
      log(`  - ${warning}`, 'yellow')
    }
    if (report.warnings.length > 10) {
      log(`  ... and ${report.warnings.length - 10} more`, 'yellow')
    }
    log('')
  }

  if (report.errors.length > 0) {
    log('Errors:', 'red')
    for (const error of report.errors.slice(0, 10)) {
      log(`  - ${error}`, 'red')
    }
    if (report.errors.length > 10) {
      log(`  ... and ${report.errors.length - 10} more`, 'red')
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

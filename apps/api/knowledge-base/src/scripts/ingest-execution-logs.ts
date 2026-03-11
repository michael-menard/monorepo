/**
 * Plan Execution Log Ingestion Script
 *
 * Parses timestamped execution log files (*.plan.exec.md) into structured
 * plan_execution_log entries.
 *
 * Each file follows the format:
 *   ## YYYY-MM-DD HH:MM — Event Description
 *   Body text with details...
 *
 * Usage:
 *   pnpm tsx src/scripts/ingest-execution-logs.ts --dry-run
 *   pnpm tsx src/scripts/ingest-execution-logs.ts
 *   pnpm tsx src/scripts/ingest-execution-logs.ts --logs-dir /custom/path
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface ParsedLogEntry {
  timestamp: string
  entryType: string
  phase: string | null
  storyId: string | null
  message: string
  body: string
}

interface IngestionStats {
  filesProcessed: number
  entriesCreated: number
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
// Parsing
// ============================================================================

const ENTRY_TYPE_KEYWORDS: Record<string, string[]> = {
  status_change: ['status changed', 'moved to', 'transitioned', 'promoted'],
  phase_started: ['phase started', 'beginning phase', 'starting phase'],
  phase_completed: ['phase completed', 'finished phase', 'completed phase'],
  story_spawned: ['created story', 'spawned story', 'generated story'],
  story_completed: ['story completed', 'story done', 'finished story'],
  blocked: ['blocked', 'waiting on', 'dependency'],
  unblocked: ['unblocked', 'dependency resolved', 'resumed'],
  decision: ['decided', 'decision:', 'chose', 'selected'],
  error: ['error', 'failed', 'failure'],
}

function inferEntryType(text: string): string {
  const lower = text.toLowerCase()
  for (const [type, keywords] of Object.entries(ENTRY_TYPE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return type
  }
  return 'note'
}

function extractStoryId(text: string): string | null {
  const match = text.match(/\b([A-Z]{2,10}-\d+)\b/)
  return match ? match[1] : null
}

function extractPhase(text: string): string | null {
  const match = text.match(/Phase\s+(\d+)/i)
  return match ? `Phase ${match[1]}` : null
}

function parseExecutionLog(content: string): ParsedLogEntry[] {
  const entries: ParsedLogEntry[] = []
  // Match sections starting with ## YYYY-MM-DD HH:MM
  const sectionRegex = /^##\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*[—–-]\s*(.+)$/gm
  const allMatches = [...content.matchAll(sectionRegex)]

  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i]
    const timestamp = match[1]
    const headline = match[2].trim()

    // Extract body between this section and the next
    const startIdx = (match.index ?? 0) + match[0].length
    const endIdx = allMatches[i + 1]?.index ?? content.length
    const body = content.slice(startIdx, endIdx).trim()

    const fullText = `${headline}\n${body}`

    entries.push({
      timestamp,
      entryType: inferEntryType(fullText),
      phase: extractPhase(fullText),
      storyId: extractStoryId(fullText),
      message: headline,
      body,
    })
  }

  return entries
}

// ============================================================================
// Import Logic
// ============================================================================

async function ingestFile(
  pool: Pool,
  filePath: string,
  stats: IngestionStats,
  dryRun: boolean,
): Promise<void> {
  const filename = path.basename(filePath, '.plan.exec.md')
  // Plan slug is the filename without the .plan.exec.md extension
  const planSlug = filename

  const content = await fs.readFile(filePath, 'utf-8')
  const entries = parseExecutionLog(content)

  console.log(`  ${planSlug}: ${entries.length} entries`)

  if (dryRun) {
    for (const entry of entries) {
      console.log(`    [${entry.entryType}] ${entry.timestamp} — ${entry.message}`)
    }
    stats.entriesCreated += entries.length
    return
  }

  // Verify plan exists
  const planExists = await pool.query('SELECT 1 FROM plans WHERE plan_slug = $1', [planSlug])
  if (planExists.rows.length === 0) {
    console.log(`    [SKIP] Plan '${planSlug}' not found in DB`)
    return
  }

  for (const entry of entries) {
    try {
      await pool.query(
        `INSERT INTO plan_execution_log (plan_slug, entry_type, phase, story_id, message, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
         ON CONFLICT DO NOTHING`,
        [
          planSlug,
          entry.entryType,
          entry.phase,
          entry.storyId,
          entry.message,
          entry.body ? JSON.stringify({ body: entry.body }) : null,
          entry.timestamp,
        ],
      )
      stats.entriesCreated++
    } catch (e) {
      stats.errors.push(`${planSlug}/${entry.timestamp}: ${e}`)
    }
  }

  stats.filesProcessed++
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const logsDirArg = args.find(a => a.startsWith('--logs-dir='))?.split('=')[1]
  const logsDir = logsDirArg
    ? path.resolve(logsDirArg)
    : path.join(os.homedir(), '.claude', 'plans')

  console.log('\n' + '='.repeat(60))
  console.log('  Execution Logs → Knowledge Base Ingestion')
  console.log('='.repeat(60) + '\n')

  if (dryRun) console.log('[DRY RUN] No database writes will occur\n')

  console.log(`Logs directory: ${logsDir}\n`)

  // Discover execution log files
  let files: string[]
  try {
    const entries = await fs.readdir(logsDir)
    files = entries.filter(f => f.endsWith('.plan.exec.md')).map(f => path.join(logsDir, f))
  } catch (e) {
    console.error(`Cannot read logs directory: ${logsDir}`)
    console.error(e)
    process.exit(1)
  }

  console.log(`Found ${files.length} execution log files\n`)

  if (files.length === 0) {
    console.log('No execution log files found. Nothing to do.')
    return
  }

  let pool: Pool | null = null
  if (!dryRun) {
    pool = createPool()
    try {
      await pool.query('SELECT 1')
      console.log('Database connection successful\n')
    } catch (e) {
      console.error('Database connection failed:', e)
      process.exit(1)
    }
  }

  const stats: IngestionStats = { filesProcessed: 0, entriesCreated: 0, errors: [] }

  console.log('Processing files:\n')

  for (const filePath of files) {
    try {
      await ingestFile(pool!, filePath, stats, dryRun)
    } catch (e) {
      const msg = `${path.basename(filePath)}: ${e}`
      stats.errors.push(msg)
      console.log(`  [ERR] ${msg}`)
    }
  }

  if (pool) await pool.end()

  console.log('\n' + '='.repeat(60))
  console.log('  Ingestion Summary')
  console.log('='.repeat(60) + '\n')
  console.log(`Files processed: ${stats.filesProcessed}`)
  console.log(`Entries created: ${stats.entriesCreated}`)
  console.log(`Errors:          ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\nErrors:')
    for (const err of stats.errors) console.log(`  - ${err}`)
  }

  if (dryRun) console.log('\n[DRY RUN] No database writes occurred')
}

main().catch(console.error)

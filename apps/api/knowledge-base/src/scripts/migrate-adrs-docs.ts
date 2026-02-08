/**
 * ADR and Documentation Migration Script
 *
 * Imports ADR-LOG.md and architecture documentation into the knowledge base.
 *
 * Sources:
 * - plans/stories/ADR-LOG.md - Architecture Decision Records
 * - docs/architecture/*.md - Architecture documentation
 * - docs/tech-stack/*.md - Technology stack documentation
 * - __design__/PROPOSED_FEATURES.md - Feature proposals
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-adrs-docs.ts --dry-run
 *   pnpm tsx src/scripts/migrate-adrs-docs.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { Pool } from 'pg'
import { config } from 'dotenv'
import { parseADRFile } from '../migration/adr-parser.js'
import type { ADREntry } from '../migration/__types__/index.js'

// Load .env
config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface DocEntry {
  filePath: string
  relativePath: string
  title: string
  content: string
  docType: 'adr' | 'architecture' | 'tech_stack' | 'design' | 'guide'
  tags: string[]
}

interface MigrationStats {
  adrsImported: number
  adrsSkipped: number
  docsImported: number
  docsSkipped: number
  errors: string[]
}

// ============================================================================
// Database Connection
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
// Content Hash (for deduplication)
// ============================================================================

function hashContent(content: string): string {
  // Simple hash using string length and char codes
  let hash = 0
  const str = content.trim().toLowerCase().replace(/\s+/g, ' ')
  for (let i = 0; i < Math.min(str.length, 500); i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash = hash & hash
  }
  return `hash_${hash.toString(16)}_${str.length}`
}

// ============================================================================
// ADR Processing
// ============================================================================

async function processADRs(
  pool: Pool,
  basePath: string,
  stats: MigrationStats,
  dryRun: boolean,
): Promise<void> {
  const adrLogPath = path.join(basePath, 'plans/stories/ADR-LOG.md')

  try {
    const content = await fs.readFile(adrLogPath, 'utf-8')
    const parsed = parseADRFile(content, adrLogPath)

    console.log(`\nFound ${parsed.adrs.length} ADRs in ADR-LOG.md`)

    for (const adr of parsed.adrs) {
      await importADR(pool, adr, stats, dryRun)
    }
  } catch (e) {
    const err = `ADR-LOG.md: ${e}`
    stats.errors.push(err)
    console.log(`  [ERR] ${err}`)
  }
}

async function importADR(
  pool: Pool,
  adr: ADREntry,
  stats: MigrationStats,
  dryRun: boolean,
): Promise<void> {
  // Build content for KB entry
  const content = buildADRContent(adr)
  // Note: hashContent could be used for deduplication in future
  void hashContent(content)

  if (dryRun) {
    console.log(`  [DRY] Would import ADR: ${adr.id} - ${adr.title}`)
    stats.adrsImported++
    return
  }

  // Check for existing entry with same content
  const existing = await pool.query(
    `SELECT id FROM knowledge_entries WHERE content LIKE $1 LIMIT 1`,
    [`%${adr.id}%`],
  )

  if (existing.rows.length > 0) {
    console.log(`  [SKIP] ${adr.id} already exists`)
    stats.adrsSkipped++
    return
  }

  // Insert new entry
  await pool.query(
    `INSERT INTO knowledge_entries (
      content, role, entry_type, tags, verified
    ) VALUES ($1, $2, $3, $4, $5)`,
    [content, 'all', 'decision', ['adr', 'architecture', adr.status.toLowerCase()], false],
  )

  console.log(`  [NEW] ${adr.id}: ${adr.title}`)
  stats.adrsImported++
}

function buildADRContent(adr: ADREntry): string {
  const parts: string[] = [`**[${adr.id}] ${adr.title}**`, '', `**Status:** ${adr.status}`]

  if (adr.date) {
    parts.push(`**Date:** ${adr.date}`)
  }

  if (adr.context) {
    parts.push('', `**Context:** ${adr.context}`)
  }

  if (adr.problem) {
    parts.push('', `**Problem:** ${adr.problem}`)
  }

  if (adr.decision) {
    parts.push('', `**Decision:** ${adr.decision}`)
  }

  if (adr.consequences) {
    parts.push('', `**Consequences:** ${adr.consequences}`)
  }

  if (adr.related_files.length > 0) {
    parts.push('', `**Related Files:** ${adr.related_files.join(', ')}`)
  }

  return parts.join('\n')
}

// ============================================================================
// Documentation Processing
// ============================================================================

async function processDocumentation(
  pool: Pool,
  basePath: string,
  stats: MigrationStats,
  dryRun: boolean,
): Promise<void> {
  const docPaths = [
    { dir: 'docs/architecture', type: 'architecture' as const, tags: ['architecture'] },
    { dir: 'docs/tech-stack', type: 'tech_stack' as const, tags: ['tech-stack'] },
    { dir: '__design__', type: 'design' as const, tags: ['design', 'features'] },
    { dir: 'docs/guides', type: 'guide' as const, tags: ['guide'] },
    { dir: 'docs/testing', type: 'guide' as const, tags: ['testing', 'guide'] },
  ]

  for (const { dir, type, tags } of docPaths) {
    const fullPath = path.join(basePath, dir)

    try {
      const files = await fs.readdir(fullPath)
      const mdFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('_'))

      console.log(`\nProcessing ${mdFiles.length} docs from ${dir}/`)

      for (const file of mdFiles) {
        await processDocFile(pool, fullPath, file, type, tags, stats, dryRun)
      }
    } catch {
      // Directory doesn't exist
    }
  }
}

async function processDocFile(
  pool: Pool,
  dirPath: string,
  fileName: string,
  docType: DocEntry['docType'],
  baseTags: string[],
  stats: MigrationStats,
  dryRun: boolean,
): Promise<void> {
  const filePath = path.join(dirPath, fileName)

  try {
    const content = await fs.readFile(filePath, 'utf-8')

    // Extract title from first heading
    const titleMatch = content.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : fileName.replace('.md', '')

    // Build summary content (first 2000 chars for embedding)
    const summaryContent = buildDocSummary(title, fileName, docType, content)

    if (dryRun) {
      console.log(`  [DRY] Would import: ${fileName} (${docType})`)
      stats.docsImported++
      return
    }

    // Check for existing entry
    const existing = await pool.query(
      `SELECT id FROM knowledge_entries WHERE content LIKE $1 LIMIT 1`,
      [`%${title}%`],
    )

    if (existing.rows.length > 0) {
      console.log(`  [SKIP] ${fileName} already exists`)
      stats.docsSkipped++
      return
    }

    // Determine tags
    const tags = [...baseTags]
    if (content.includes('TypeScript') || content.includes('typescript')) tags.push('typescript')
    if (content.includes('React') || content.includes('react')) tags.push('react')
    if (content.includes('API') || content.includes('endpoint')) tags.push('api')
    if (content.includes('database') || content.includes('PostgreSQL')) tags.push('database')
    if (content.includes('test') || content.includes('testing')) tags.push('testing')

    // Insert new entry
    await pool.query(
      `INSERT INTO knowledge_entries (
        content, role, entry_type, tags, verified
      ) VALUES ($1, $2, $3, $4, $5)`,
      [summaryContent, 'all', 'note', [...new Set(tags)], false],
    )

    console.log(`  [NEW] ${fileName}: ${title}`)
    stats.docsImported++
  } catch (e) {
    const err = `${fileName}: ${e}`
    stats.errors.push(err)
    console.log(`  [ERR] ${err}`)
  }
}

function buildDocSummary(
  title: string,
  fileName: string,
  docType: string,
  content: string,
): string {
  // Extract first meaningful section (skip title, get intro + first section)
  const lines = content.split('\n')
  const summaryLines: string[] = []
  let inCodeBlock = false
  let charCount = 0
  const maxChars = 2000

  for (const line of lines) {
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock
      continue
    }
    if (inCodeBlock) continue

    // Skip table of contents
    if (line.includes('Table of Contents') || line.match(/^\d+\.\s*\[/)) continue

    // Skip empty lines at start
    if (summaryLines.length === 0 && !line.trim()) continue

    summaryLines.push(line)
    charCount += line.length

    if (charCount > maxChars) break
  }

  const summary = summaryLines.join('\n').trim()

  return `**[Doc: ${docType}] ${title}**\n\n**File:** ${fileName}\n\n${summary}`
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('\n' + '='.repeat(60))
  console.log('  ADR & Documentation Migration')
  console.log('='.repeat(60) + '\n')

  if (dryRun) {
    console.log('[DRY RUN] No database writes will occur\n')
  }

  const pool = createPool()

  // Test connection
  try {
    await pool.query('SELECT 1')
    console.log('Database connection successful\n')
  } catch (e) {
    console.error('Database connection failed:', e)
    process.exit(1)
  }

  const basePath = path.resolve(process.cwd(), '../../..')
  console.log(`Base path: ${basePath}\n`)

  const stats: MigrationStats = {
    adrsImported: 0,
    adrsSkipped: 0,
    docsImported: 0,
    docsSkipped: 0,
    errors: [],
  }

  // Process ADRs
  console.log('Processing ADRs:')
  await processADRs(pool, basePath, stats, dryRun)

  // Process documentation
  console.log('\nProcessing Documentation:')
  await processDocumentation(pool, basePath, stats, dryRun)

  // Cleanup
  await pool.end()

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('  Migration Summary')
  console.log('='.repeat(60) + '\n')

  console.log(`ADRs imported:        ${stats.adrsImported}`)
  console.log(`ADRs skipped:         ${stats.adrsSkipped}`)
  console.log(`Docs imported:        ${stats.docsImported}`)
  console.log(`Docs skipped:         ${stats.docsSkipped}`)
  console.log(`Errors:               ${stats.errors.length}`)

  if (stats.errors.length > 0 && verbose) {
    console.log('\nErrors:')
    for (const err of stats.errors) {
      console.log(`  - ${err}`)
    }
  }

  if (dryRun) {
    console.log('\n[DRY RUN] No database writes occurred')
  }
}

main().catch(console.error)

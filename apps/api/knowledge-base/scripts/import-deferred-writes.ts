/**
 * Import deferred KB write files from the filesystem into the database.
 *
 * Parses 4 YAML format variants found across ~250 deferred write files:
 *   Format A: kb_write_requests[] — findings/lessons from elab (→ knowledge_entries)
 *   Format B: pending_writes[] — structured story upserts (→ stories)
 *   Format C: writes[] — structured story upserts, older format (→ stories)
 *   Format D: Markdown-embedded SQL (→ stories, best-effort parse)
 *
 * Usage:
 *   cd apps/api/knowledge-base
 *   npx tsx scripts/import-deferred-writes.ts [--dry-run] [--verbose]
 *
 * Requires database to be running on port 5433.
 */

import { readFile } from 'node:fs/promises'
import { execSync } from 'node:child_process'
import { parse as parseYaml } from 'yaml'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { eq, sql } from 'drizzle-orm'
import * as schema from '../src/db/schema.js'
import { stories, knowledgeEntries } from '../src/db/schema.js'

const isDryRun = process.argv.includes('--dry-run')
const isVerbose = process.argv.includes('--verbose')

// ============================================================================
// Types
// ============================================================================

interface StoryUpsert {
  story_id: string
  feature?: string
  title?: string
  story_dir?: string
  story_file?: string
  story_type?: string
  points?: number
  priority?: string
  state?: string
  touches_backend?: boolean
  touches_frontend?: boolean
  touches_database?: boolean
  touches_infra?: boolean
}

interface KbWriteRequest {
  entry_id?: string
  entry_type: string
  source_stage?: string
  story_id?: string
  category?: string
  subcategory?: string
  severity?: string
  title: string
  content: string
  additional_tags?: string[]
}

interface ImportStats {
  filesScanned: number
  storyUpserts: number
  storyUpsertsSkipped: number
  kbEntries: number
  kbEntriesSkipped: number
  errors: number
  errorDetails: string[]
}

// ============================================================================
// File Discovery
// ============================================================================

function findDeferredFiles(): string[] {
  const result = execSync(
    'find /Users/michaelmenard/Development/monorepo/plans -name "DEFERRED*" -type f 2>/dev/null',
    { encoding: 'utf-8' },
  )
  return result
    .trim()
    .split('\n')
    .filter(f => f.length > 0)
}

// ============================================================================
// YAML Parsing (multi-format)
// ============================================================================

function parseFile(content: string, filePath: string): {
  storyUpserts: StoryUpsert[]
  kbWriteRequests: KbWriteRequest[]
  format: string
} {
  const storyUpserts: StoryUpsert[] = []
  const kbWriteRequests: KbWriteRequest[] = []
  let format = 'unknown'

  // Strip YAML frontmatter (--- delimited)
  let yamlContent = content
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (frontmatterMatch) {
    // Merge frontmatter with body
    yamlContent = frontmatterMatch[1] + '\n' + frontmatterMatch[2]
  }

  // Try to detect if this is a markdown file with embedded SQL (Format D)
  if (content.includes('```sql') && !content.includes('kb_write_requests:') && !content.includes('pending_writes:') && !content.includes('writes:')) {
    format = 'D-markdown-sql'
    // Extract story_id from embedded SQL
    const sqlMatch = content.match(/INSERT INTO stories[^']*'([A-Z]+-\d+)'/s)
    if (sqlMatch) {
      const storyId = sqlMatch[1]
      // Try to extract fields from the SQL
      const titleMatch = content.match(/title[^']*'([^']+)'/i)
      const featureMatch = content.match(/feature[^']*'([^']+)'/i)
      const storyTypeMatch = content.match(/story_type[^']*'([^']+)'/i)

      storyUpserts.push({
        story_id: storyId,
        title: titleMatch?.[1],
        feature: featureMatch?.[1],
        story_type: storyTypeMatch?.[1],
      })
    }
    return { storyUpserts, kbWriteRequests, format }
  }

  // Try YAML parse
  let parsed: unknown
  try {
    parsed = parseYaml(yamlContent)
  } catch {
    // If YAML fails, try just the non-markdown portion
    const lines = content.split('\n').filter(l => !l.startsWith('#') && !l.startsWith('**') && l.trim())
    try {
      parsed = parseYaml(lines.join('\n'))
    } catch {
      if (isVerbose) console.warn(`  YAML parse failed: ${filePath}`)
      return { storyUpserts, kbWriteRequests, format: 'parse-error' }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { storyUpserts, kbWriteRequests, format: 'empty' }
  }

  // Handle root-level array (Format F)
  if (Array.isArray(parsed)) {
    format = 'F-root-array'
    for (const item of parsed) {
      if (item && typeof item === 'object' && (item as Record<string, unknown>).data) {
        const data = (item as Record<string, unknown>).data as StoryUpsert
        if (data.story_id) storyUpserts.push(data)
      }
    }
    return { storyUpserts, kbWriteRequests, format }
  }

  // Cast to record for named-key access
  const doc = parsed as Record<string, unknown>

  // Format E: deferred_writes[] with inline retry_command SQL
  if (Array.isArray(doc.deferred_writes)) {
    format = 'E-deferred-writes'
    for (const dw of doc.deferred_writes) {
      if (dw && typeof dw === 'object' && (dw as Record<string, unknown>).story_id) {
        const dwRec = dw as Record<string, unknown>
        const storyId = dwRec.story_id as string
        const sqlStr = (dwRec.retry_command || '') as string
        const titleMatch = sqlStr.match(/title[^']*'([^']+)'/i)
        const featureMatch = sqlStr.match(/feature[^']*'([^']+)'/i)

        storyUpserts.push({
          story_id: storyId,
          title: titleMatch?.[1],
          feature: featureMatch?.[1],
        })
      }
    }
  }

  // Format G: kb_insert_sql — inline SQL with story_id in YAML metadata
  if (typeof doc.kb_insert_sql === 'string' && doc.story_id) {
    format = 'G-kb-insert-sql'
    const storyId = doc.story_id as string
    const sqlStr = doc.kb_insert_sql as string
    const titleMatch = sqlStr.match(/'([^']+)'[^,]*,\s*'[^']*'[^,]*,\s*'[^']*'[^,]*,\s*'(feature|tech_debt|bug)/s)
      || sqlStr.match(/title[^']*'([^']+)'/i)
    const featureMatch = sqlStr.match(/feature[^']*'([^']+)'/i)
      || sqlStr.match(/'[^']*',\s*'([^']+)'/s)

    storyUpserts.push({
      story_id: storyId,
      title: titleMatch?.[1],
      feature: featureMatch?.[1],
    })
  }

  // Format H: deferred_entries[] — similar to kb_write_requests but different key
  if (Array.isArray(doc.deferred_entries)) {
    format = format === 'unknown' ? 'H-deferred-entries' : format
    for (const req of doc.deferred_entries) {
      if (req && typeof req === 'object' && req.content && req.title) {
        kbWriteRequests.push({
          entry_id: String(req.entry_id),
          entry_type: req.entry_type || 'lesson',
          source_stage: req.source || req.source_stage,
          story_id: req.story_reference || req.story_id || (doc.story_id as string),
          category: req.category,
          title: req.title,
          content: req.content,
          additional_tags: Array.isArray(req.tags) ? req.tags : [],
        })
      }
    }
  }

  // Format A: kb_write_requests[]
  if (Array.isArray(doc.kb_write_requests)) {
    format = 'A-kb-write-requests'
    for (const req of doc.kb_write_requests) {
      if (req && typeof req === 'object' && req.content && req.title) {
        kbWriteRequests.push({
          entry_id: req.entry_id,
          entry_type: req.entry_type || 'lesson',
          source_stage: req.source_stage,
          story_id: req.story_id || (doc.story_id as string),
          category: req.category,
          subcategory: req.subcategory,
          severity: req.severity,
          title: req.title,
          content: req.content,
          additional_tags: Array.isArray(req.additional_tags) ? req.additional_tags : [],
        })
      }
    }
  }

  // Format B: pending_writes[]
  if (Array.isArray(doc.pending_writes)) {
    format = 'B-pending-writes'
    for (const pw of doc.pending_writes) {
      if (pw && typeof pw === 'object' && pw.data && pw.data.story_id) {
        storyUpserts.push(pw.data as StoryUpsert)
      }
    }
  }

  // Format C: writes[]
  if (Array.isArray(doc.writes)) {
    format = 'C-writes'
    for (const w of doc.writes) {
      if (w && typeof w === 'object' && w.data && w.data.story_id) {
        storyUpserts.push(w.data as StoryUpsert)
      }
    }
  }

  // Format 4 (retrospective): entries[]
  if (Array.isArray(doc.entries)) {
    format = 'retro-entries'
    for (const entry of doc.entries) {
      if (entry && typeof entry === 'object' && entry.title) {
        kbWriteRequests.push({
          entry_id: entry.id,
          entry_type: 'lesson',
          story_id: entry.story_id,
          category: entry.category || 'pattern',
          title: entry.title,
          content: [
            entry.what_happened ? `**What happened:** ${entry.what_happened}` : '',
            entry.recommendation ? `**Recommendation:** ${entry.recommendation}` : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          additional_tags: Array.isArray(entry.tags) ? entry.tags : [],
        })
      }
    }
  }

  return { storyUpserts, kbWriteRequests, format }
}

// ============================================================================
// Database Operations
// ============================================================================

async function upsertStory(
  db: ReturnType<typeof drizzle>,
  data: StoryUpsert,
  stats: ImportStats,
): Promise<void> {
  if (!data.story_id) return

  // Check if story already exists
  const existing = await db
    .select({ storyId: stories.storyId, updatedAt: stories.updatedAt })
    .from(stories)
    .where(eq(stories.storyId, data.story_id))
    .limit(1)

  if (existing.length > 0) {
    stats.storyUpsertsSkipped++
    if (isVerbose) console.log(`    SKIP story ${data.story_id} (already exists)`)
    return
  }

  // Insert new story
  await db.insert(stories).values({
    storyId: data.story_id,
    feature: data.feature || 'unknown',
    title: data.title || data.story_id,
    storyDir: data.story_dir,
    storyFile: data.story_file,
    storyType: data.story_type || 'feature',
    points: data.points,
    priority: data.priority || 'medium',
    state: data.state || 'backlog',
    touchesBackend: data.touches_backend ?? false,
    touchesFrontend: data.touches_frontend ?? false,
    touchesDatabase: data.touches_database ?? false,
    touchesInfra: data.touches_infra ?? false,
  }).onConflictDoNothing()

  stats.storyUpserts++
  if (isVerbose) console.log(`    INSERT story ${data.story_id}`)
}

async function insertKbEntry(
  db: ReturnType<typeof drizzle>,
  data: KbWriteRequest,
  stats: ImportStats,
): Promise<void> {
  if (!data.content || !data.title) return

  // Check for duplicate by content prefix + story_id
  const contentPrefix = data.content.slice(0, 200)
  const existingCheck = await db.execute(sql`
    SELECT id FROM public.knowledge_entries
    WHERE LEFT(content, 200) = ${contentPrefix}
      AND story_id = ${data.story_id || null}
      AND deleted_at IS NULL
    LIMIT 1
  `)

  if ((existingCheck.rows as unknown[]).length > 0) {
    stats.kbEntriesSkipped++
    if (isVerbose) console.log(`    SKIP kb entry "${data.title.slice(0, 40)}..." (duplicate)`)
    return
  }

  // Map entry_type to valid role
  const roleMap: Record<string, string> = {
    finding: 'elab',
    lesson: 'qa',
    constraint: 'engineer',
    decision: 'engineer',
    pattern: 'qa',
  }
  const role = roleMap[data.entry_type] || 'engineer'

  // Map entry_type to valid types
  const validEntryTypes = ['lesson', 'decision', 'constraint', 'runbook', 'task']
  const entryType = validEntryTypes.includes(data.entry_type) ? data.entry_type : 'lesson'

  // Build tags array
  const tags = [
    ...(data.additional_tags || []),
    data.category ? data.category : null,
    data.subcategory ? data.subcategory : null,
    data.source_stage ? `source:${data.source_stage}` : null,
    data.severity ? `severity:${data.severity}` : null,
    'imported-from-deferred',
  ].filter((t): t is string => t !== null && t !== undefined)

  // Build content with title
  const fullContent = `**${data.title}**\n\n${data.content}`

  await db.insert(knowledgeEntries).values({
    content: fullContent,
    role,
    entryType,
    storyId: data.story_id || null,
    tags,
    verified: false,
  })

  stats.kbEntries++
  if (isVerbose) console.log(`    INSERT kb entry "${data.title.slice(0, 40)}..."`)
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const pool = new Pool({
    host: process.env.PGHOST ?? '127.0.0.1',
    port: parseInt(process.env.PGPORT ?? '5433', 10),
    user: process.env.PGUSER ?? 'kbuser',
    password: process.env.PGPASSWORD ?? 'TestPassword123!',
    database: process.env.PGDATABASE ?? 'knowledgebase',
    max: 5,
  })

  const db = drizzle(pool, { schema })

  const stats: ImportStats = {
    filesScanned: 0,
    storyUpserts: 0,
    storyUpsertsSkipped: 0,
    kbEntries: 0,
    kbEntriesSkipped: 0,
    errors: 0,
    errorDetails: [],
  }

  console.log('Finding deferred write files...')
  const files = findDeferredFiles()
  console.log(`Found ${files.length} deferred write files`)

  if (isDryRun) {
    console.log('DRY RUN — analyzing files without writing to DB\n')
  }

  const formatCounts: Record<string, number> = {}

  for (const filePath of files) {
    stats.filesScanned++
    try {
      const content = await readFile(filePath, 'utf-8')
      const { storyUpserts, kbWriteRequests, format } = parseFile(content, filePath)

      formatCounts[format] = (formatCounts[format] || 0) + 1

      if (storyUpserts.length === 0 && kbWriteRequests.length === 0) {
        if (isVerbose) console.log(`  [${format}] ${filePath} — nothing to import`)
        continue
      }

      if (isVerbose || storyUpserts.length + kbWriteRequests.length > 0) {
        console.log(
          `  [${format}] ${filePath.replace('/Users/michaelmenard/Development/monorepo/', '')} — ${storyUpserts.length} stories, ${kbWriteRequests.length} kb entries`,
        )
      }

      if (!isDryRun) {
        for (const su of storyUpserts) {
          try {
            await upsertStory(db, su, stats)
          } catch (err) {
            stats.errors++
            const msg = `Story ${su.story_id}: ${err instanceof Error ? err.message : String(err)}`
            stats.errorDetails.push(msg)
            if (isVerbose) console.error(`    ERROR: ${msg}`)
          }
        }

        for (const kw of kbWriteRequests) {
          try {
            await insertKbEntry(db, kw, stats)
          } catch (err) {
            stats.errors++
            const msg = `KB entry "${kw.title?.slice(0, 40)}": ${err instanceof Error ? err.message : String(err)}`
            stats.errorDetails.push(msg)
            if (isVerbose) console.error(`    ERROR: ${msg}`)
          }
        }
      } else {
        // Dry run counts
        stats.storyUpserts += storyUpserts.length
        stats.kbEntries += kbWriteRequests.length
      }
    } catch (err) {
      stats.errors++
      const msg = `File ${filePath}: ${err instanceof Error ? err.message : String(err)}`
      stats.errorDetails.push(msg)
      if (isVerbose) console.error(`  ERROR: ${msg}`)
    }
  }

  // Report
  console.log('\n=== Import Summary ===')
  console.log(`Files scanned:       ${stats.filesScanned}`)
  console.log(`Format breakdown:    ${JSON.stringify(formatCounts, null, 2)}`)
  console.log(`Story upserts:       ${stats.storyUpserts}${isDryRun ? ' (would insert)' : ' inserted'}`)
  console.log(`Stories skipped:     ${stats.storyUpsertsSkipped} (already exist)`)
  console.log(`KB entries:          ${stats.kbEntries}${isDryRun ? ' (would insert)' : ' inserted'}`)
  console.log(`KB entries skipped:  ${stats.kbEntriesSkipped} (duplicates)`)
  console.log(`Errors:              ${stats.errors}`)
  if (stats.errorDetails.length > 0) {
    console.log('\nError details:')
    for (const e of stats.errorDetails.slice(0, 20)) {
      console.log(`  - ${e}`)
    }
    if (stats.errorDetails.length > 20) {
      console.log(`  ... and ${stats.errorDetails.length - 20} more`)
    }
  }

  await pool.end()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})

/**
 * Plans Migration Script
 *
 * Imports architecture/feature plan documents from ~/.claude/plans/ into the
 * `plans` and `plan_story_links` KB tables.
 *
 * Each plan is parsed to extract:
 *   - title         (first # heading)
 *   - summary       (first prose paragraph)
 *   - planType      (inferred from content keywords)
 *   - storyPrefix   (first UPPER-CASE prefix found, e.g. "WKFL", "DASH")
 *   - featureDir    (extracted from plans/future/platform/<dir> references)
 *   - estimatedStories (first "N stories" mention)
 *   - phases        (## Phase N sections)
 *   - tags          (inferred from keywords)
 *   - story links   (all WORD-NNN patterns → plan_story_links)
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-plans-to-kb.ts --dry-run
 *   pnpm tsx src/scripts/migrate-plans-to-kb.ts
 *   pnpm tsx src/scripts/migrate-plans-to-kb.ts --plans-dir /custom/path
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import * as os from 'os'
import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface Phase {
  number: number
  name: string
  description: string
  storyIds: string[]
}

interface Section {
  heading: string
  level: number
  startLine: number
}

interface ParsedPlan {
  planSlug: string
  title: string
  summary: string | null
  planType: string | null
  featureDir: string | null
  storyPrefix: string | null
  estimatedStories: number | null
  phases: Phase[]
  tags: string[]
  rawContent: string
  sourceFile: string
  contentHash: string
  mentionedStoryIds: string[]
  sections: Section[]
  formatVersion: string
}

interface MigrationStats {
  imported: number
  updated: number
  skipped: number
  linksCreated: number
  revisionsCreated: number
  eventsLogged: number
  embeddingsGenerated: number
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

const PLAN_TYPE_KEYWORDS: Record<string, string[]> = {
  feature: [
    'new feature',
    'product feature',
    'user-facing',
    'ui component',
    'gallery',
    'dashboard',
  ],
  refactor: ['refactor', 'restructur', 'clean up', 'rename', 'consolidat'],
  migration: ['migrat', 'import', 'move to', 'port to', 'convert'],
  infra: ['infrastructure', 'deployment', 'docker', 'aws', 'lambda', 'terraform', 'ci/cd'],
  tooling: ['tooling', 'developer experience', 'dx ', 'cli', 'script', 'automation'],
  workflow: ['workflow', 'agent', 'orchestrat', 'pipeline', 'scrum', 'story generation'],
  audit: ['audit', 'coverage', 'gap analysis', 'review all', 'assess'],
  spike: ['spike', 'investigation', 'experiment', 'explore', 'poc', 'proof of concept'],
}

function inferPlanType(content: string): string | null {
  const lower = content.toLowerCase()
  for (const [type, keywords] of Object.entries(PLAN_TYPE_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return type
  }
  return null
}

const TAG_KEYWORDS: Record<string, string[]> = {
  database: ['migration', 'schema', 'postgres', 'drizzle', 'sql'],
  frontend: ['react', 'component', 'ui', 'tailwind', 'shadcn', 'page'],
  backend: ['lambda', 'api', 'endpoint', 'handler', 'server'],
  testing: ['playwright', 'vitest', 'e2e', 'test coverage', 'cucumber'],
  'knowledge-base': ['knowledge base', 'kb_', 'mcp', 'embedding'],
  'story-generation': ['story generation', 'pm-story', 'pm-generate', 'elab'],
  performance: ['token usage', 'performance', 'bottleneck', 'caching', 'optimiz'],
  worktree: ['worktree', 'branch', 'git'],
}

function inferTags(content: string): string[] {
  const lower = content.toLowerCase()
  return Object.entries(TAG_KEYWORDS)
    .filter(([, keywords]) => keywords.some(kw => lower.includes(kw)))
    .map(([tag]) => tag)
}

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : 'Untitled Plan'
}

function extractSummary(content: string): string | null {
  // Find first non-heading, non-empty paragraph after any leading headings
  const lines = content.split('\n')
  let inParagraph = false
  const paragraphLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('#')) {
      if (paragraphLines.length > 0) break
      continue
    }
    if (trimmed === '') {
      if (paragraphLines.length > 0) break
      continue
    }
    paragraphLines.push(trimmed)
    inParagraph = true
  }

  if (!inParagraph || paragraphLines.length === 0) return null
  return paragraphLines.join(' ')
}

function extractFeatureDir(content: string): string | null {
  // Look for paths like plans/future/platform/<dir> or plans/future/<dir>
  const match = content.match(/plans\/future\/(?:platform\/)?([a-z][a-z0-9-]+)/)
  return match ? match[1] : null
}

function extractStoryPrefix(content: string): string | null {
  // Find the first ALL-CAPS prefix in a story ID pattern (e.g., WKFL-001, DASH-042)
  const match = content.match(/\b([A-Z]{2,10})-\d+\b/)
  return match ? match[1] : null
}

function extractEstimatedStories(content: string): number | null {
  // Match patterns like "21 stories", "60 stories", "~30 stories"
  const match = content.match(/[~≈]?\s*(\d+)\s+stories?\b/i)
  if (match) return parseInt(match[1], 10)
  return null
}

function extractPhases(content: string): Phase[] {
  const phases: Phase[] = []
  // Match ## Phase N or ## Phase N: Title
  const phaseRegex = /^##\s+Phase\s+(\d+)(?:[:\s]+(.+))?$/gim
  const allMatches = [...content.matchAll(phaseRegex)]

  for (let i = 0; i < allMatches.length; i++) {
    const match = allMatches[i]
    const number = parseInt(match[1], 10)
    const name = match[2]?.trim() ?? `Phase ${number}`

    // Extract content between this phase heading and the next
    const startIdx = (match.index ?? 0) + match[0].length
    const endIdx = allMatches[i + 1]?.index ?? content.length
    const section = content.slice(startIdx, endIdx)

    // First line of prose in the section = description
    const descMatch = section.match(/\n+([^#\n][^\n]+)/)
    const description = descMatch ? descMatch[1].trim() : ''

    // Extract story IDs mentioned in this section
    const storyIds = [...new Set(section.match(/\b[A-Z]{2,10}-\d+\b/g) ?? [])]

    phases.push({ number, name, description, storyIds })
  }

  return phases
}

function extractMentionedStoryIds(content: string): string[] {
  return [...new Set(content.match(/\b[A-Z]{2,10}-\d+\b/g) ?? [])]
}

function extractSections(content: string): Section[] {
  const sections: Section[] = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s+(.+)$/)
    if (match) {
      sections.push({
        heading: match[2].trim(),
        level: match[1].length,
        startLine: i + 1,
      })
    }
  }
  return sections
}

function detectFormatVersion(content: string): string {
  // Check for YAML frontmatter
  if (content.trimStart().startsWith('---')) {
    return 'yaml_frontmatter'
  }
  return 'inline_header'
}

function parsePlan(filePath: string, rawContent: string): ParsedPlan {
  const planSlug = path.basename(filePath, '.md')
  const contentHash = crypto.createHash('sha256').update(rawContent).digest('hex').slice(0, 16)

  return {
    planSlug,
    title: extractTitle(rawContent),
    summary: extractSummary(rawContent),
    planType: inferPlanType(rawContent),
    featureDir: extractFeatureDir(rawContent),
    storyPrefix: extractStoryPrefix(rawContent),
    estimatedStories: extractEstimatedStories(rawContent),
    phases: extractPhases(rawContent),
    tags: inferTags(rawContent),
    rawContent,
    sourceFile: filePath,
    contentHash,
    mentionedStoryIds: extractMentionedStoryIds(rawContent),
    sections: extractSections(rawContent),
    formatVersion: detectFormatVersion(rawContent),
  }
}

// ============================================================================
// Import Logic
// ============================================================================

async function importPlan(
  pool: Pool,
  parsed: ParsedPlan,
  stats: MigrationStats,
  dryRun: boolean,
): Promise<void> {
  const { planSlug, mentionedStoryIds, ...fields } = parsed

  if (dryRun) {
    console.log(`  [DRY] ${planSlug}: "${fields.title}"`)
    console.log(
      `        type=${fields.planType ?? 'unknown'} prefix=${fields.storyPrefix ?? '-'} stories=${fields.estimatedStories ?? '-'} links=${mentionedStoryIds.length}`,
    )
    stats.imported++
    stats.linksCreated += mentionedStoryIds.length
    return
  }

  // Check for existing record — content_hash is now in plan_details
  const existing = await pool.query(
    `SELECT p.id, pd.content_hash
     FROM plans p
     LEFT JOIN plan_details pd ON pd.plan_id = p.id
     WHERE p.plan_slug = $1`,
    [planSlug],
  )

  if (existing.rows.length > 0) {
    if (existing.rows[0].content_hash === fields.contentHash) {
      console.log(`  [SKIP] ${planSlug}: Unchanged`)
      stats.skipped++
      return
    }

    // Update plans header (no detail columns)
    await pool.query(
      `UPDATE plans SET
        title = $2, summary = $3, plan_type = $4, status = $5,
        feature_dir = $6, story_prefix = $7, estimated_stories = $8,
        tags = $9, updated_at = NOW()
       WHERE plan_slug = $1`,
      [
        planSlug,
        fields.title,
        fields.summary,
        fields.planType,
        'active',
        fields.featureDir,
        fields.storyPrefix,
        fields.estimatedStories,
        fields.tags,
      ],
    )

    // Upsert plan_details (detail columns moved here)
    await pool.query(
      `INSERT INTO plan_details (plan_id, raw_content, phases, source_file, content_hash, sections, format_version, imported_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       ON CONFLICT (plan_id) DO UPDATE SET
         raw_content = EXCLUDED.raw_content,
         phases = EXCLUDED.phases,
         source_file = EXCLUDED.source_file,
         content_hash = EXCLUDED.content_hash,
         sections = EXCLUDED.sections,
         format_version = EXCLUDED.format_version,
         updated_at = NOW()`,
      [
        existing.rows[0].id,
        fields.rawContent,
        JSON.stringify(fields.phases),
        fields.sourceFile,
        fields.contentHash,
        JSON.stringify(fields.sections),
        fields.formatVersion,
      ],
    )

    // Create revision history entry
    await createRevisionEntry(
      pool,
      existing.rows[0].id,
      fields,
      'Content update via migration',
      stats,
    )

    // Log status_change event
    await logExecutionEvent(pool, planSlug, 'status_change', 'Updated by migration script', stats)

    console.log(`  [UPD] ${planSlug}`)
    stats.updated++
  } else {
    // Insert plans header
    const inserted = await pool.query(
      `INSERT INTO plans
        (plan_slug, title, summary, plan_type, status, feature_dir, story_prefix,
         estimated_stories, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        planSlug,
        fields.title,
        fields.summary,
        fields.planType,
        'active',
        fields.featureDir,
        fields.storyPrefix,
        fields.estimatedStories,
        fields.tags,
      ],
    )

    // Insert plan_details
    await pool.query(
      `INSERT INTO plan_details (plan_id, raw_content, phases, source_file, content_hash, sections, format_version, imported_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [
        inserted.rows[0].id,
        fields.rawContent,
        JSON.stringify(fields.phases),
        fields.sourceFile,
        fields.contentHash,
        JSON.stringify(fields.sections),
        fields.formatVersion,
      ],
    )

    // Create initial revision history entry
    await createRevisionEntry(pool, inserted.rows[0].id, fields, 'Initial import', stats)

    // Log status_change event
    await logExecutionEvent(
      pool,
      planSlug,
      'status_change',
      'Initial import by migration script',
      stats,
    )

    console.log(`  [NEW] ${planSlug}`)
    stats.imported++
  }

  // Upsert story links
  for (const storyId of mentionedStoryIds) {
    await pool.query(
      `INSERT INTO plan_story_links (plan_slug, story_id, link_type)
       VALUES ($1, $2, 'mentioned')
       ON CONFLICT (plan_slug, story_id) DO NOTHING`,
      [planSlug, storyId],
    )
  }
  stats.linksCreated += mentionedStoryIds.length
}

// ============================================================================
// Revision History + Execution Log Helpers
// ============================================================================

async function createRevisionEntry(
  pool: Pool,
  planId: string,
  fields: Omit<ParsedPlan, 'planSlug' | 'mentionedStoryIds'>,
  changeReason: string,
  stats: MigrationStats,
): Promise<void> {
  try {
    // Get next revision number
    const maxRev = await pool.query(
      `SELECT COALESCE(MAX(revision_number), 0) as max_rev FROM plan_revision_history WHERE plan_id = $1`,
      [planId],
    )
    const nextRev = (maxRev.rows[0]?.max_rev ?? 0) + 1

    await pool.query(
      `INSERT INTO plan_revision_history (plan_id, revision_number, raw_content, content_hash, sections, change_reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        planId,
        nextRev,
        fields.rawContent,
        fields.contentHash,
        JSON.stringify(fields.sections),
        changeReason,
        'migration-script',
      ],
    )
    stats.revisionsCreated++
  } catch (e) {
    // Non-fatal: log but don't fail the import
    console.log(`    [WARN] Failed to create revision: ${e}`)
  }
}

async function logExecutionEvent(
  pool: Pool,
  planSlug: string,
  entryType: string,
  message: string,
  stats: MigrationStats,
): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO plan_execution_log (plan_slug, entry_type, message)
       VALUES ($1, $2, $3)`,
      [planSlug, entryType, message],
    )
    stats.eventsLogged++
  } catch (e) {
    // Non-fatal: log but don't fail the import
    console.log(`    [WARN] Failed to log event: ${e}`)
  }
}

async function generateAndStoreEmbedding(
  pool: Pool,
  planSlug: string,
  title: string,
  summary: string | null,
  tags: string[],
  planType: string | null,
  stats: MigrationStats,
): Promise<void> {
  try {
    // Build embedding text
    const parts = [title]
    if (planType) parts.push(`Type: ${planType}`)
    if (summary) parts.push(summary)
    if (tags.length > 0) parts.push(`Tags: ${tags.join(', ')}`)
    const text = parts.join('\n')

    // Use OpenAI API directly for embeddings
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.log(`    [SKIP-EMB] No OPENAI_API_KEY set`)
      return
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    })

    if (!response.ok) {
      console.log(`    [WARN] Embedding API error: ${response.status}`)
      return
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> }
    const embedding = data.data[0]?.embedding
    if (!embedding) return

    const embeddingStr = `[${embedding.join(',')}]`
    await pool.query(`UPDATE plans SET embedding = $1::vector WHERE plan_slug = $2`, [
      embeddingStr,
      planSlug,
    ])
    stats.embeddingsGenerated++
  } catch (e) {
    console.log(`    [WARN] Failed to generate embedding: ${e}`)
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')
  const withEmbeddings = args.includes('--with-embeddings')

  const plansDirArg = args.find(a => a.startsWith('--plans-dir='))?.split('=')[1]
  const plansDir = plansDirArg
    ? path.resolve(plansDirArg)
    : path.join(os.homedir(), '.claude', 'plans')

  console.log('\n' + '='.repeat(60))
  console.log('  Plans → Knowledge Base Migration')
  console.log('='.repeat(60) + '\n')

  if (dryRun) console.log('[DRY RUN] No database writes will occur\n')

  console.log(`Plans directory: ${plansDir}\n`)

  // Discover plan files
  let files: string[]
  try {
    const entries = await fs.readdir(plansDir)
    files = entries.filter(f => f.endsWith('.md')).map(f => path.join(plansDir, f))
  } catch (e) {
    console.error(`Cannot read plans directory: ${plansDir}`)
    console.error(e)
    process.exit(1)
  }

  console.log(`Found ${files.length} plan files\n`)

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

  if (withEmbeddings) console.log('[EMBEDDINGS] Will generate embeddings for each plan\n')

  const stats: MigrationStats = {
    imported: 0,
    updated: 0,
    skipped: 0,
    linksCreated: 0,
    revisionsCreated: 0,
    eventsLogged: 0,
    embeddingsGenerated: 0,
    errors: [],
  }

  console.log('Processing plans:\n')

  for (const filePath of files) {
    const slug = path.basename(filePath, '.md')
    try {
      const rawContent = await fs.readFile(filePath, 'utf-8')
      const parsed = parsePlan(filePath, rawContent)
      await importPlan(pool!, parsed, stats, dryRun)

      // Generate embedding if requested and not dry run
      if (withEmbeddings && !dryRun) {
        await generateAndStoreEmbedding(
          pool!,
          parsed.planSlug,
          parsed.title,
          parsed.summary,
          parsed.tags,
          parsed.planType,
          stats,
        )
      }
    } catch (e) {
      const msg = `${slug}: ${e}`
      stats.errors.push(msg)
      console.log(`  [ERR] ${msg}`)
      if (verbose) console.error(e)
    }
  }

  if (pool) await pool.end()

  console.log('\n' + '='.repeat(60))
  console.log('  Migration Summary')
  console.log('='.repeat(60) + '\n')
  console.log(`Plans imported:  ${stats.imported}`)
  console.log(`Plans updated:   ${stats.updated}`)
  console.log(`Plans skipped:   ${stats.skipped}`)
  console.log(`Story links:     ${stats.linksCreated}`)
  console.log(`Revisions:       ${stats.revisionsCreated}`)
  console.log(`Events logged:   ${stats.eventsLogged}`)
  console.log(`Embeddings:      ${stats.embeddingsGenerated}`)
  console.log(`Errors:          ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\nErrors:')
    for (const err of stats.errors) console.log(`  - ${err}`)
  }

  if (dryRun) console.log('\n[DRY RUN] No database writes occurred')
}

main().catch(console.error)

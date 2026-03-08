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
}

interface MigrationStats {
  imported: number
  updated: number
  skipped: number
  linksCreated: number
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
      `INSERT INTO plan_details (plan_id, raw_content, phases, source_file, content_hash, imported_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (plan_id) DO UPDATE SET
         raw_content = EXCLUDED.raw_content,
         phases = EXCLUDED.phases,
         source_file = EXCLUDED.source_file,
         content_hash = EXCLUDED.content_hash,
         updated_at = NOW()`,
      [
        existing.rows[0].id,
        fields.rawContent,
        JSON.stringify(fields.phases),
        fields.sourceFile,
        fields.contentHash,
      ],
    )

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
      `INSERT INTO plan_details (plan_id, raw_content, phases, source_file, content_hash, imported_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      [
        inserted.rows[0].id,
        fields.rawContent,
        JSON.stringify(fields.phases),
        fields.sourceFile,
        fields.contentHash,
      ],
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
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

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

  const stats: MigrationStats = { imported: 0, updated: 0, skipped: 0, linksCreated: 0, errors: [] }

  console.log('Processing plans:\n')

  for (const filePath of files) {
    const slug = path.basename(filePath, '.md')
    try {
      const rawContent = await fs.readFile(filePath, 'utf-8')
      const parsed = parsePlan(filePath, rawContent)
      await importPlan(pool!, parsed, stats, dryRun)
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
  console.log(`Errors:          ${stats.errors.length}`)

  if (stats.errors.length > 0) {
    console.log('\nErrors:')
    for (const err of stats.errors) console.log(`  - ${err}`)
  }

  if (dryRun) console.log('\n[DRY RUN] No database writes occurred')
}

main().catch(console.error)

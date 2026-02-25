/**
 * Artifact Content Migration Script
 *
 * Migrates story workflow artifacts from `_implementation/` files to the
 * `story_artifacts` table with full content via `kb_write_artifact()`.
 *
 * Unlike `migrate-artifacts-simple.ts` (which writes only metadata),
 * this script writes complete artifact content using the CRUD operations layer.
 *
 * Artifact types migrated:
 * - CHECKPOINT.yaml     → checkpoint
 * - SCOPE.yaml          → scope
 * - PLAN.yaml           → plan
 * - KNOWLEDGE-CONTEXT.yaml → context
 * - EVIDENCE.yaml       → evidence
 * - REVIEW.yaml         → review
 * - FIX-CONTEXT.yaml    → fix_summary
 * - QA-VERIFY.yaml / VERIFICATION.yaml → verification
 * - DECISIONS.yaml      → elaboration
 * - ANALYSIS.md + FUTURE-OPPORTUNITIES.md → analysis (merged)
 * - PROOF-*.md          → proof (content.markdown)
 *
 * Upsert behavior: artifacts with same story_id + artifact_type + iteration
 * are updated rather than duplicated.
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-artifacts-to-kb.ts --dry-run
 *   pnpm tsx src/scripts/migrate-artifacts-to-kb.ts
 *   pnpm tsx src/scripts/migrate-artifacts-to-kb.ts --story=WKFL-008
 *   pnpm tsx src/scripts/migrate-artifacts-to-kb.ts --verbose
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { config } from 'dotenv'
import { Pool } from 'pg'
import { getDbClient, closeDbClient, testConnection } from '../db/client.js'
import { kb_write_artifact } from '../crud-operations/artifact-operations.js'
import type { KbWriteArtifactInput } from '../crud-operations/artifact-operations.js'

// Load .env from package root
config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

type ArtifactType =
  | 'checkpoint'
  | 'scope'
  | 'plan'
  | 'context'
  | 'evidence'
  | 'review'
  | 'fix_summary'
  | 'verification'
  | 'elaboration'
  | 'analysis'
  | 'proof'

interface ArtifactCandidate {
  storyId: string
  artifactType: ArtifactType
  phase: KbWriteArtifactInput['phase']
  iteration: number
  content: Record<string, unknown>
  sourceFile: string
}

interface MigrationStats {
  written: number
  updated: number
  skipped: number
  storiesNotFound: number
  errors: string[]
}

// ============================================================================
// Artifact Type Map (YAML files only)
// ============================================================================

const YAML_TYPE_MAP: Record<string, { type: ArtifactType; phase: KbWriteArtifactInput['phase'] }> =
  {
    'CHECKPOINT.yaml': { type: 'checkpoint', phase: null },
    'SCOPE.yaml': { type: 'scope', phase: 'setup' },
    'PLAN.yaml': { type: 'plan', phase: 'planning' },
    'plan.yaml': { type: 'plan', phase: 'planning' },
    'KNOWLEDGE-CONTEXT.yaml': { type: 'context', phase: 'planning' },
    'context.yaml': { type: 'context', phase: 'planning' },
    'EVIDENCE.yaml': { type: 'evidence', phase: 'implementation' },
    'REVIEW.yaml': { type: 'review', phase: 'code_review' },
    'FIX-CONTEXT.yaml': { type: 'fix_summary', phase: 'implementation' },
    'QA-VERIFY.yaml': { type: 'verification', phase: 'qa_verification' },
    'VERIFICATION.yaml': { type: 'verification', phase: 'qa_verification' },
    'verification.yaml': { type: 'verification', phase: 'qa_verification' },
    'DECISIONS.yaml': { type: 'elaboration', phase: 'analysis' },
    'elaboration.yaml': { type: 'elaboration', phase: 'analysis' },
  }

// ============================================================================
// Content Parsers
// ============================================================================

/**
 * Parse a YAML file and return its content as a record.
 */
async function parseYamlFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    const parsed = yaml.parse(raw)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return { raw: parsed }
  } catch {
    return null
  }
}

/**
 * Parse a Markdown file and return content.markdown record.
 */
async function parseMarkdownFile(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return { markdown: raw }
  } catch {
    return null
  }
}

// ============================================================================
// File Discovery
// ============================================================================

async function findArtifactsInStory(
  storyDir: string,
  storyId: string,
): Promise<ArtifactCandidate[]> {
  const candidates: ArtifactCandidate[] = []

  const implDir = path.join(storyDir, '_implementation')

  // Check if _implementation directory exists
  try {
    await fs.access(implDir)
  } catch {
    return candidates
  }

  const files = await fs.readdir(implDir).catch(() => [] as string[])

  // Track ANALYSIS.md and FUTURE-OPPORTUNITIES.md for merging
  let analysisContent: Record<string, unknown> | null = null
  let futureOpportunitiesContent: Record<string, unknown> | null = null
  const analysisIteration = 0

  for (const file of files) {
    const filePath = path.join(implDir, file)

    // Handle YAML files
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const mapping = YAML_TYPE_MAP[file]
      if (!mapping) continue

      const content = await parseYamlFile(filePath)
      if (!content) continue

      const iteration = typeof content.iteration === 'number' ? content.iteration : 0

      candidates.push({
        storyId,
        artifactType: mapping.type,
        phase: mapping.phase,
        iteration,
        content,
        sourceFile: filePath,
      })
      continue
    }

    // Handle ANALYSIS.md
    if (file === 'ANALYSIS.md') {
      const content = await parseMarkdownFile(filePath)
      if (content) {
        analysisContent = content
      }
      continue
    }

    // Handle FUTURE-OPPORTUNITIES.md
    if (file === 'FUTURE-OPPORTUNITIES.md') {
      const content = await parseMarkdownFile(filePath)
      if (content) {
        futureOpportunitiesContent = content
      }
      continue
    }

    // Handle PROOF-{STORY_ID}.md or PROOF-*.md
    if (file.startsWith('PROOF-') && file.endsWith('.md')) {
      const content = await parseMarkdownFile(filePath)
      if (!content) continue

      candidates.push({
        storyId,
        artifactType: 'proof',
        phase: 'completion',
        iteration: 0,
        content,
        sourceFile: filePath,
      })
      continue
    }
  }

  // Merge ANALYSIS.md + FUTURE-OPPORTUNITIES.md into single 'analysis' artifact
  if (analysisContent || futureOpportunitiesContent) {
    const mergedContent: Record<string, unknown> = {
      ...(analysisContent ? { analysis: analysisContent } : {}),
      ...(futureOpportunitiesContent ? { future_opportunities: futureOpportunitiesContent } : {}),
    }
    candidates.push({
      storyId,
      artifactType: 'analysis',
      phase: 'analysis',
      iteration: analysisIteration,
      content: mergedContent,
      sourceFile: path.join(implDir, 'ANALYSIS.md'),
    })
  }

  return candidates
}

/**
 * Recursively find all `_implementation` directories under basePath.
 * Returns {storyDir, storyId} pairs for any dir whose parent matches STORY_ID pattern.
 */
async function findImplDirs(
  dir: string,
  filterStoryId: string | undefined,
  results: Array<{ storyDir: string; storyId: string }>,
  depth: number = 0,
): Promise<void> {
  if (depth > 6) return // Guard against very deep trees

  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry)

    // Skip non-directories and hidden dirs
    try {
      const stat = await fs.stat(entryPath)
      if (!stat.isDirectory()) continue
    } catch {
      continue
    }

    if (entry === '_implementation') {
      // Parent dir should be the story ID
      const storyId = path.basename(dir)
      if (storyId.match(/^[A-Z]+-\d+$/) && (!filterStoryId || storyId === filterStoryId)) {
        results.push({ storyDir: dir, storyId })
      }
      // Don't recurse into _implementation
      continue
    }

    // Skip other hidden/special dirs
    if (entry.startsWith('.') || entry.startsWith('_')) continue

    await findImplDirs(entryPath, filterStoryId, results, depth + 1)
  }
}

/**
 * Stage priority for deduplication. Higher = more authoritative.
 * When a story exists in multiple stage dirs, we take the highest-priority one.
 */
const STAGE_PRIORITY: Record<string, number> = {
  completed: 10,
  UAT: 9,
  uat: 9,
  'ready-for-qa': 8,
  'needs-code-review': 7,
  'in-progress': 6,
  'failed-qa': 5,
  'failed-code-review': 4,
  'ready-to-work': 3,
  elaboration: 2,
  backlog: 1,
}

async function findAllArtifacts(
  basePath: string,
  filterStoryId?: string,
): Promise<ArtifactCandidate[]> {
  const all: ArtifactCandidate[] = []

  const implDirs: Array<{ storyDir: string; storyId: string }> = []
  await findImplDirs(basePath, filterStoryId, implDirs)

  // Deduplicate: for each storyId, keep only the highest-priority stage directory
  const bestDir = new Map<string, { storyDir: string; priority: number }>()
  for (const { storyDir, storyId } of implDirs) {
    // Extract stage name from path (parent of storyId dir)
    const stage = path.basename(path.dirname(storyDir))
    const priority = STAGE_PRIORITY[stage] ?? 0

    const existing = bestDir.get(storyId)
    if (!existing || priority > existing.priority) {
      bestDir.set(storyId, { storyDir, priority })
    }
  }

  for (const [storyId, { storyDir }] of bestDir) {
    const candidates = await findArtifactsInStory(storyDir, storyId)
    all.push(...candidates)
  }

  return all
}

// ============================================================================
// Story Existence Check
// ============================================================================

/**
 * Check if a story exists in the DB using a direct pg query.
 * We bypass drizzle here to avoid needing the full schema setup.
 */
async function storyExistsInDb(pool: Pool, storyId: string): Promise<boolean> {
  try {
    const result = await pool.query('SELECT 1 FROM stories WHERE story_id = $1 LIMIT 1', [storyId])
    return result.rows.length > 0
  } catch {
    return false
  }
}

// ============================================================================
// Main Migration
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')
  const storyFilter = args.find(a => a.startsWith('--story='))?.split('=')[1]

  console.log('\n' + '='.repeat(60))
  console.log('  Artifact Content Migration → Knowledge Base')
  console.log('='.repeat(60) + '\n')

  if (dryRun) {
    console.log('[DRY RUN] No database writes will occur\n')
  }

  if (storyFilter) {
    console.log(`[FILTER] Only migrating story: ${storyFilter}\n`)
  }

  // Test connection
  const connectionResult = await testConnection()
  if (!connectionResult.success) {
    console.error('Database connection failed:', connectionResult.error)
    process.exit(1)
  }
  console.log('Database connection successful\n')

  const db = getDbClient()

  // Also create a raw pg pool for story existence check
  const pool = new Pool({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password: process.env.KB_DB_PASSWORD,
    max: 3,
  })

  const basePath = path.resolve(process.cwd(), '../../../plans/future')
  console.log(`Scanning: ${basePath}\n`)

  const artifacts = await findAllArtifacts(basePath, storyFilter)
  console.log(`Found ${artifacts.length} artifact candidates\n`)

  // Summary by type
  const byType = new Map<string, number>()
  for (const a of artifacts) {
    byType.set(a.artifactType, (byType.get(a.artifactType) || 0) + 1)
  }
  console.log('Artifacts by type:')
  for (const [type, count] of Array.from(byType.entries()).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`)
  }
  console.log('')

  const stats: MigrationStats = {
    written: 0,
    updated: 0,
    skipped: 0,
    storiesNotFound: 0,
    errors: [],
  }

  console.log('Migrating artifacts:\n')

  for (const artifact of artifacts) {
    try {
      // Check story exists
      const exists = await storyExistsInDb(pool, artifact.storyId)
      if (!exists) {
        if (verbose) {
          console.log(`  [SKIP] ${artifact.storyId}/${artifact.artifactType}: Story not in DB`)
        }
        stats.storiesNotFound++
        continue
      }

      if (dryRun) {
        console.log(
          `  [DRY]  ${artifact.storyId}/${artifact.artifactType} (iteration ${artifact.iteration})`,
        )
        stats.written++
        continue
      }

      // Write to KB via crud operation (upsert behavior)
      await kb_write_artifact(
        {
          story_id: artifact.storyId,
          artifact_type: artifact.artifactType,
          phase: artifact.phase,
          iteration: artifact.iteration,
          content: artifact.content,
        },
        { db },
      )

      console.log(
        `  [OK]   ${artifact.storyId}/${artifact.artifactType} (iteration ${artifact.iteration})`,
      )
      stats.written++
    } catch (e) {
      const errMsg = `${artifact.storyId}/${artifact.artifactType}: ${e instanceof Error ? e.message : String(e)}`
      stats.errors.push(errMsg)
      console.log(`  [ERR]  ${errMsg}`)
    }
  }

  // Cleanup
  await pool.end()
  await closeDbClient()

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('  Migration Summary')
  console.log('='.repeat(60) + '\n')

  if (dryRun) {
    console.log(`Would write:          ${stats.written}`)
  } else {
    console.log(`Artifacts written:    ${stats.written}`)
  }
  console.log(`Stories not in DB:    ${stats.storiesNotFound}`)
  console.log(`Errors:               ${stats.errors.length}`)

  if (stats.errors.length > 0) {
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

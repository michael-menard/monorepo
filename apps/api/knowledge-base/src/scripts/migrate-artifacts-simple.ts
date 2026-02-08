/**
 * Story Artifacts Migration Script
 *
 * Imports YAML artifact files from story directories into the story_artifacts table.
 * Links artifacts to stories and extracts summary JSONB for quick access.
 *
 * Artifact types supported:
 * - elaboration.yaml - Story elaboration and gaps
 * - plan.yaml - Implementation plan with chunks
 * - verification.yaml - QA verification results
 * - proof.yaml - Completion proof and deliverables
 * - tokens.yaml - Token usage tracking
 * - context.yaml - Story context
 * - CHECKPOINT.yaml - Workflow checkpoint
 * - SCOPE.yaml - Implementation scope
 * - EVIDENCE.yaml - Implementation evidence
 * - REVIEW.yaml - Code review results
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-artifacts-simple.ts --dry-run
 *   pnpm tsx src/scripts/migrate-artifacts-simple.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { Pool } from 'pg'
import { config } from 'dotenv'

// Load .env
config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface ArtifactFile {
  storyId: string
  storyDir: string
  artifactType: string
  fileName: string
  filePath: string
  phase: string | null
  content: Record<string, unknown>
}

interface MigrationStats {
  artifactsImported: number
  artifactsSkipped: number
  artifactsUpdated: number
  storiesNotFound: number
  errors: string[]
}

// Map file names to artifact types
// Allowed types per DB constraint: checkpoint, scope, plan, evidence, verification,
// analysis, context, fix_summary, proof, elaboration, review, qa_gate, completion_report
const ARTIFACT_TYPE_MAP: Record<string, { type: string; phase: string | null }> = {
  'story.yaml': { type: 'story', phase: null }, // Skip - already in stories table
  'elaboration.yaml': { type: 'elaboration', phase: 'analysis' },
  'plan.yaml': { type: 'plan', phase: 'planning' },
  'PLAN.yaml': { type: 'plan', phase: 'planning' },
  'verification.yaml': { type: 'verification', phase: 'qa_verification' },
  'VERIFICATION.yaml': { type: 'verification', phase: 'qa_verification' },
  'proof.yaml': { type: 'proof', phase: 'completion' },
  // 'tokens.yaml' - skipped, not in allowed types (cost tracking only)
  'context.yaml': { type: 'context', phase: 'setup' },
  'CHECKPOINT.yaml': { type: 'checkpoint', phase: null },
  'SCOPE.yaml': { type: 'scope', phase: 'setup' },
  'EVIDENCE.yaml': { type: 'evidence', phase: 'implementation' },
  'REVIEW.yaml': { type: 'review', phase: 'code_review' },
  'QA-VERIFY.yaml': { type: 'qa_gate', phase: 'qa_verification' },
  'FIX-CONTEXT.yaml': { type: 'fix_summary', phase: 'implementation' },
  'KNOWLEDGE-CONTEXT.yaml': { type: 'context', phase: null },
  'ANALYSIS.yaml': { type: 'analysis', phase: 'analysis' },
  // 'DECISIONS.yaml' - skipped, not in allowed types
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
// Summary Extractors
// ============================================================================

function extractSummary(
  artifactType: string,
  content: Record<string, unknown>,
): Record<string, unknown> {
  switch (artifactType) {
    case 'elaboration':
      return {
        verdict: content.verdict,
        split_required: content.split_required,
        gaps_count: Array.isArray(content.gaps) ? content.gaps.length : 0,
        follow_ups_count: Array.isArray(content.follow_ups) ? content.follow_ups.length : 0,
      }

    case 'plan':
      return {
        version: content.version,
        approved: content.approved,
        chunks_count: Array.isArray(content.chunks) ? content.chunks.length : 0,
        estimated_files: (content.estimates as Record<string, unknown>)?.files,
        estimated_tokens: (content.estimates as Record<string, unknown>)?.tokens,
      }

    case 'verification':
      return {
        code_review_verdict: (content.code_review as Record<string, unknown>)?.verdict,
        code_review_iterations: (content.code_review as Record<string, unknown>)?.iterations,
        qa_verdict: (content.qa as Record<string, unknown>)?.verdict,
        tests_passed: sumTests(content.tests as Record<string, unknown>, 'passed'),
        tests_failed: sumTests(content.tests as Record<string, unknown>, 'failed'),
        acs_count: Array.isArray(content.acs) ? content.acs.length : 0,
      }

    case 'proof':
      return {
        completed_at: content.completed_at,
        summary_points: Array.isArray(content.summary) ? content.summary.length : 0,
        deliverables_count: Array.isArray(content.deliverables) ? content.deliverables.length : 0,
        tests_passed: (content.verification as Record<string, unknown>)?.tests_passed,
        all_acs_verified: (content.verification as Record<string, unknown>)?.all_acs_verified,
      }

    case 'tokens':
      return {
        total_input: (content.total as Record<string, unknown>)?.input,
        total_output: (content.total as Record<string, unknown>)?.output,
        phases_count: Array.isArray(content.phases) ? content.phases.length : 0,
        high_cost_count: Array.isArray(content.high_cost) ? content.high_cost.length : 0,
      }

    case 'checkpoint':
      return {
        current_phase: content.current_phase,
        last_successful_phase: content.last_successful_phase,
        iteration: content.iteration,
        blocked: content.blocked,
      }

    case 'scope':
      return {
        touches: content.touches,
        risk_flags: content.risk_flags,
      }

    case 'evidence':
      return {
        version: content.version,
        story_id: content.story_id,
        touched_files_count: Array.isArray(content.touched_files)
          ? content.touched_files.length
          : 0,
        commands_run_count: Array.isArray(content.commands_run) ? content.commands_run.length : 0,
        acceptance_criteria_count: Array.isArray(content.acceptance_criteria)
          ? content.acceptance_criteria.length
          : 0,
      }

    case 'review':
      return {
        verdict: content.verdict,
        iteration: content.iteration,
        issues_count: Array.isArray(content.ranked_patches) ? content.ranked_patches.length : 0,
      }

    case 'context':
      return {
        story_id: content.story_id,
        feature_dir: content.feature_dir,
        phase: content.phase,
      }

    default:
      // Return first few keys as summary
      const keys = Object.keys(content).slice(0, 5)
      const summary: Record<string, unknown> = {}
      for (const key of keys) {
        const value = content[key]
        if (typeof value !== 'object' || value === null) {
          summary[key] = value
        }
      }
      return summary
  }
}

function sumTests(tests: Record<string, unknown> | undefined, field: string): number {
  if (!tests) return 0
  let sum = 0
  for (const category of ['unit', 'integration', 'e2e']) {
    const cat = tests[category] as Record<string, unknown> | undefined
    if (cat && typeof cat[field] === 'number') {
      sum += cat[field] as number
    }
  }
  return sum
}

// ============================================================================
// File Discovery
// ============================================================================

async function findArtifactFiles(basePath: string): Promise<ArtifactFile[]> {
  const artifacts: ArtifactFile[] = []

  let features: string[]
  try {
    features = await fs.readdir(basePath)
  } catch {
    console.error(`Cannot read directory: ${basePath}`)
    return []
  }

  for (const feature of features) {
    const featurePath = path.join(basePath, feature)
    try {
      const stat = await fs.stat(featurePath)
      if (!stat.isDirectory()) continue
    } catch {
      continue
    }

    const stages = [
      'backlog',
      'ready-to-work',
      'in-progress',
      'ready-for-qa',
      'uat',
      'UAT',
      'completed',
    ]

    for (const stage of stages) {
      const stagePath = path.join(featurePath, stage)
      try {
        const stories = await fs.readdir(stagePath)
        for (const storyId of stories) {
          if (!storyId.match(/^[A-Z]+-\d+$/)) continue

          const storyDir = path.join(stagePath, storyId)

          // Find artifacts in story root
          await findArtifactsInDir(storyDir, storyId, storyDir, artifacts)

          // Find artifacts in _implementation subdirectory
          const implDir = path.join(storyDir, '_implementation')
          await findArtifactsInDir(implDir, storyId, storyDir, artifacts)
        }
      } catch {
        // Stage doesn't exist
      }
    }
  }

  return artifacts
}

async function findArtifactsInDir(
  dir: string,
  storyId: string,
  storyDir: string,
  artifacts: ArtifactFile[],
): Promise<void> {
  try {
    const files = await fs.readdir(dir)
    for (const file of files) {
      if (!file.endsWith('.yaml')) continue

      const mapping = ARTIFACT_TYPE_MAP[file]
      if (!mapping) continue
      if (mapping.type === 'story') continue // Skip story.yaml - already in stories table

      const filePath = path.join(dir, file)
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const parsed = yaml.parse(content) as Record<string, unknown>

        artifacts.push({
          storyId,
          storyDir,
          artifactType: mapping.type,
          fileName: file,
          filePath,
          phase: mapping.phase,
          content: parsed,
        })
      } catch {
        // Skip unparseable files
      }
    }
  } catch {
    // Directory doesn't exist
  }
}

// ============================================================================
// Import Logic
// ============================================================================

async function importArtifact(
  pool: Pool,
  artifact: ArtifactFile,
  repoRoot: string,
  stats: MigrationStats,
  dryRun: boolean,
): Promise<void> {
  try {
    // Check if story exists in DB
    const storyResult = await pool.query('SELECT id FROM stories WHERE story_id = $1', [
      artifact.storyId,
    ])

    if (storyResult.rows.length === 0) {
      if (!dryRun) {
        console.log(`  [SKIP] ${artifact.storyId}/${artifact.fileName}: Story not in DB`)
        stats.storiesNotFound++
      }
      return
    }

    // Compute relative path
    const relativePath = path.relative(repoRoot, artifact.filePath)

    // Extract iteration from content if available
    const iteration =
      typeof artifact.content.iteration === 'number' ? artifact.content.iteration : null

    // Extract summary
    const summary = extractSummary(artifact.artifactType, artifact.content)

    if (dryRun) {
      console.log(
        `  [DRY] Would import: ${artifact.storyId}/${artifact.fileName} (${artifact.artifactType})`,
      )
      stats.artifactsImported++
      return
    }

    // Check if artifact already exists
    const existing = await pool.query(
      `SELECT id FROM story_artifacts
       WHERE story_id = $1 AND artifact_type = $2 AND file_path = $3`,
      [artifact.storyId, artifact.artifactType, relativePath],
    )

    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        `UPDATE story_artifacts SET
          artifact_name = $4,
          phase = $5,
          iteration = $6,
          summary = $7,
          updated_at = NOW()
        WHERE story_id = $1 AND artifact_type = $2 AND file_path = $3`,
        [
          artifact.storyId,
          artifact.artifactType,
          relativePath,
          artifact.fileName,
          artifact.phase,
          iteration,
          JSON.stringify(summary),
        ],
      )
      console.log(`  [UPD] ${artifact.storyId}/${artifact.fileName}`)
      stats.artifactsUpdated++
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO story_artifacts (
          story_id, artifact_type, artifact_name, file_path, phase, iteration, summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          artifact.storyId,
          artifact.artifactType,
          artifact.fileName,
          relativePath,
          artifact.phase,
          iteration,
          JSON.stringify(summary),
        ],
      )
      console.log(`  [NEW] ${artifact.storyId}/${artifact.fileName}`)
      stats.artifactsImported++
    }
  } catch (e) {
    const error = `${artifact.storyId}/${artifact.fileName}: ${e}`
    stats.errors.push(error)
    console.log(`  [ERR] ${error}`)
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('\n' + '='.repeat(60))
  console.log('  Story Artifacts Migration')
  console.log('='.repeat(60) + '\n')

  if (dryRun) {
    console.log('[DRY RUN] No database writes will occur\n')
  }

  let pool: Pool | null = null

  if (!dryRun) {
    pool = createPool()

    // Test connection
    try {
      await pool.query('SELECT 1')
      console.log('Database connection successful\n')
    } catch (e) {
      console.error('Database connection failed:', e)
      process.exit(1)
    }
  } else {
    // Create pool for story lookups even in dry run
    pool = createPool()
  }

  const basePath = path.resolve(process.cwd(), '../../../plans/future')
  const repoRoot = path.resolve(process.cwd(), '../../..')
  console.log(`Scanning: ${basePath}\n`)

  const artifacts = await findArtifactFiles(basePath)
  console.log(`Found ${artifacts.length} artifact files\n`)

  // Group by type for summary
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
    artifactsImported: 0,
    artifactsSkipped: 0,
    artifactsUpdated: 0,
    storiesNotFound: 0,
    errors: [],
  }

  console.log('Importing artifacts:\n')

  for (const artifact of artifacts) {
    await importArtifact(pool, artifact, repoRoot, stats, dryRun)
  }

  // Cleanup
  if (pool) {
    await pool.end()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('  Migration Summary')
  console.log('='.repeat(60) + '\n')

  console.log(`Artifacts imported:     ${stats.artifactsImported}`)
  console.log(`Artifacts updated:      ${stats.artifactsUpdated}`)
  console.log(`Stories not in DB:      ${stats.storiesNotFound}`)
  console.log(`Errors:                 ${stats.errors.length}`)

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

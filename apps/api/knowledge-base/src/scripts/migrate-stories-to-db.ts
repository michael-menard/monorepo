/**
 * Story Database Migration Script
 *
 * Imports YAML story files into PostgreSQL with pgvector embeddings.
 *
 * Prerequisites:
 *   1. Run migrate-stories-to-yaml.ts first to generate YAML files
 *   2. Run database migration 002_workflow_tables.sql
 *   3. Set OPENAI_API_KEY for embedding generation
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-stories-to-db.ts --dry-run
 *   pnpm tsx src/scripts/migrate-stories-to-db.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as yaml from 'yaml'
import { getDbClient } from '../db/client.js'
import { createEmbeddingClient, type EmbeddingClient } from '../embedding-client/index.js'

// ============================================================================
// Types (matching YAML schemas)
// ============================================================================

interface StoryYaml {
  schema: number
  id: string
  feature: string
  type: string
  state: string
  title: string
  points: number | null
  priority: string | null
  blocked_by: string | null
  depends_on: string[]
  follow_up_from: string | null
  scope: {
    packages: string[]
    surfaces: string[]
  }
  goal: string
  non_goals: string[]
  acs: Array<{ id: string; text: string; type: string }>
  risks: Array<{ risk: string; mitigation: string }>
  created_at: string
  updated_at: string
}

interface ElaborationYaml {
  schema: number
  story_id: string
  date: string
  verdict: string
  audit: Record<string, { status: string; note: string }>
  gaps: Array<{
    id: string
    category: string
    severity: string
    finding: string
    recommendation: string
  }>
  split_required: boolean
  follow_ups: Array<{ finding: string; story_id: string | null }>
  tokens: { input: number; output: number }
}

interface PlanYaml {
  schema: number
  story_id: string
  version: number
  approved: boolean
  estimates: { files: number; tokens: number }
  chunks: Array<{
    id: number
    name: string
    acs: string[]
    files: Array<{ path: string; action: string }>
    depends_on?: number[]
  }>
  reuse: string[]
}

interface VerificationYaml {
  schema: number
  story_id: string
  updated: string
  code_review: {
    verdict: string
    iterations: number
    final_issues: { errors: number; warnings: number; note: string }
  }
  tests: {
    unit: { passed: number; failed: number }
    integration: { passed: number; failed: number }
    e2e: { passed: number; failed: number }
  }
  acs: Array<{ id: string; verdict: string; evidence: string }>
  qa: {
    verdict: string
    verified_by: string
    verified_at: string
    blocking_issues: string[]
  }
}

interface ProofYaml {
  schema: number
  story_id: string
  completed_at: string
  summary: string[]
  deliverables: Array<{ path: string; type: string; count?: number }>
  verification: { tests_passed: number; all_acs_verified: boolean }
  limitations: string[]
}

interface TokensYaml {
  schema: number
  story_id: string
  total: { input: number; output: number }
  phases: Array<{ phase: string; input: number; output: number }>
  high_cost: Array<{ operation: string; tokens: number; avoidable: boolean }>
}

interface FeedbackYaml {
  schema: number
  story_id: string
  entries: Array<{
    id: string
    type: string
    title: string
    detail: string
    root_cause: string | null
    recommendation: string | null
  }>
  churn: { high_churn_files: number; total_changes: number }
  token_issues: Array<{ operation: string; tokens: number; avoidable: boolean }>
}

interface MigrationStats {
  features: number
  stories: number
  acs: number
  risks: number
  elaborations: number
  gaps: number
  follow_ups: number
  plans: number
  verifications: number
  proofs: number
  token_usage: number
  feedback: number
  errors: string[]
}

// ============================================================================
// Database Operations
// ============================================================================

async function ensureFeature(db: any, featureName: string): Promise<string> {
  // Check if exists
  const existing = await db.execute(
    `SELECT id FROM features WHERE name = $1`,
    [featureName]
  )

  if (existing.rows.length > 0) {
    return existing.rows[0].id
  }

  // Create new
  const result = await db.execute(
    `INSERT INTO features (name) VALUES ($1) RETURNING id`,
    [featureName]
  )

  return result.rows[0].id
}

async function importStory(
  db: any,
  embeddingClient: EmbeddingClient,
  story: StoryYaml,
  featureId: string
): Promise<string> {
  // Generate embedding for searchable content
  const searchableContent = `${story.title} ${story.goal} ${story.acs.map(ac => ac.text).join(' ')}`
  const embedding = await embeddingClient.generateEmbedding(searchableContent)

  // Insert story
  const result = await db.execute(
    `INSERT INTO stories (
      story_id, feature_id, type, state, title, points, priority,
      blocked_by, depends_on, follow_up_from,
      packages, surfaces, goal, non_goals,
      embedding, created_at, updated_at
    ) VALUES (
      $1, $2, $3::story_type, $4::story_state, $5, $6, $7::priority_level,
      $8, $9, $10,
      $11, $12::surface_type[], $13, $14,
      $15, $16, $17
    )
    ON CONFLICT (story_id) DO UPDATE SET
      type = EXCLUDED.type,
      state = EXCLUDED.state,
      title = EXCLUDED.title,
      points = EXCLUDED.points,
      priority = EXCLUDED.priority,
      blocked_by = EXCLUDED.blocked_by,
      depends_on = EXCLUDED.depends_on,
      packages = EXCLUDED.packages,
      surfaces = EXCLUDED.surfaces,
      goal = EXCLUDED.goal,
      non_goals = EXCLUDED.non_goals,
      embedding = EXCLUDED.embedding,
      updated_at = EXCLUDED.updated_at
    RETURNING id`,
    [
      story.id,
      featureId,
      story.type || 'feature',
      story.state || 'backlog',
      story.title,
      story.points,
      story.priority,
      story.blocked_by,
      story.depends_on || [],
      story.follow_up_from,
      story.scope?.packages || [],
      story.scope?.surfaces || ['backend'],
      story.goal,
      story.non_goals || [],
      JSON.stringify(embedding),
      story.created_at,
      story.updated_at,
    ]
  )

  return result.rows[0].id
}

async function importACs(db: any, storyUuid: string, acs: StoryYaml['acs']): Promise<number> {
  let count = 0
  for (const ac of acs) {
    await db.execute(
      `INSERT INTO acceptance_criteria (story_id, ac_id, text, type)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (story_id, ac_id) DO UPDATE SET
         text = EXCLUDED.text,
         type = EXCLUDED.type`,
      [storyUuid, ac.id, ac.text, ac.type || 'functional']
    )
    count++
  }
  return count
}

async function importRisks(db: any, storyUuid: string, risks: StoryYaml['risks']): Promise<number> {
  // Clear existing
  await db.execute(`DELETE FROM story_risks WHERE story_id = $1`, [storyUuid])

  let count = 0
  for (const risk of risks) {
    await db.execute(
      `INSERT INTO story_risks (story_id, risk, mitigation)
       VALUES ($1, $2, $3)`,
      [storyUuid, risk.risk, risk.mitigation]
    )
    count++
  }
  return count
}

async function importElaboration(
  db: any,
  storyUuid: string,
  elab: ElaborationYaml
): Promise<{ elaborationId: string; gapsCount: number; followUpsCount: number }> {
  // Insert elaboration
  const result = await db.execute(
    `INSERT INTO elaborations (
      story_id, date, verdict, audit, split_required, tokens_input, tokens_output
    ) VALUES ($1, $2, $3::verdict_type, $4, $5, $6, $7)
    ON CONFLICT DO NOTHING
    RETURNING id`,
    [
      storyUuid,
      elab.date,
      elab.verdict || 'pass',
      JSON.stringify(elab.audit || {}),
      elab.split_required || false,
      elab.tokens?.input || 0,
      elab.tokens?.output || 0,
    ]
  )

  if (result.rows.length === 0) {
    return { elaborationId: '', gapsCount: 0, followUpsCount: 0 }
  }

  const elaborationId = result.rows[0].id

  // Import gaps
  let gapsCount = 0
  for (const gap of elab.gaps || []) {
    await db.execute(
      `INSERT INTO gaps (story_id, elaboration_id, gap_id, category, severity, finding, recommendation)
       VALUES ($1, $2, $3, $4::gap_category, $5::gap_severity, $6, $7)`,
      [
        storyUuid,
        elaborationId,
        gap.id,
        gap.category || 'requirements',
        gap.severity || 'important',
        gap.finding,
        gap.recommendation,
      ]
    )
    gapsCount++
  }

  // Import follow-ups
  let followUpsCount = 0
  for (const followUp of elab.follow_ups || []) {
    await db.execute(
      `INSERT INTO follow_ups (source_story_id, finding)
       VALUES ($1, $2)`,
      [storyUuid, followUp.finding]
    )
    followUpsCount++
  }

  return { elaborationId, gapsCount, followUpsCount }
}

async function importPlan(db: any, storyUuid: string, plan: PlanYaml): Promise<void> {
  await db.execute(
    `INSERT INTO implementation_plans (
      story_id, version, approved, estimated_files, estimated_tokens, reuse, chunks
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT DO NOTHING`,
    [
      storyUuid,
      plan.version || 1,
      plan.approved || false,
      plan.estimates?.files || 0,
      plan.estimates?.tokens || 0,
      plan.reuse || [],
      JSON.stringify(plan.chunks || []),
    ]
  )
}

async function importVerification(db: any, storyUuid: string, verify: VerificationYaml): Promise<void> {
  await db.execute(
    `INSERT INTO verifications (
      story_id,
      code_review_verdict, code_review_iterations, code_review_errors, code_review_warnings,
      tests_unit_passed, tests_unit_failed,
      tests_integration_passed, tests_integration_failed,
      tests_e2e_passed, tests_e2e_failed,
      qa_verdict, qa_verified_by, qa_verified_at, qa_blocking_issues,
      acs_verified
    ) VALUES (
      $1,
      $2::verdict_type, $3, $4, $5,
      $6, $7, $8, $9, $10, $11,
      $12::verdict_type, $13, $14, $15,
      $16
    )
    ON CONFLICT DO NOTHING`,
    [
      storyUuid,
      verify.code_review?.verdict || 'pass',
      verify.code_review?.iterations || 1,
      verify.code_review?.final_issues?.errors || 0,
      verify.code_review?.final_issues?.warnings || 0,
      verify.tests?.unit?.passed || 0,
      verify.tests?.unit?.failed || 0,
      verify.tests?.integration?.passed || 0,
      verify.tests?.integration?.failed || 0,
      verify.tests?.e2e?.passed || 0,
      verify.tests?.e2e?.failed || 0,
      verify.qa?.verdict || 'pass',
      verify.qa?.verified_by,
      verify.qa?.verified_at,
      verify.qa?.blocking_issues || [],
      JSON.stringify(verify.acs || []),
    ]
  )
}

async function importProof(db: any, storyUuid: string, proof: ProofYaml): Promise<void> {
  await db.execute(
    `INSERT INTO proofs (
      story_id, completed_at, summary, limitations,
      tests_passed, all_acs_verified, deliverables
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT DO NOTHING`,
    [
      storyUuid,
      proof.completed_at,
      proof.summary || [],
      proof.limitations || [],
      proof.verification?.tests_passed || 0,
      proof.verification?.all_acs_verified || false,
      JSON.stringify(proof.deliverables || []),
    ]
  )
}

async function importTokenUsage(db: any, storyUuid: string, tokens: TokensYaml): Promise<number> {
  let count = 0
  for (const phase of tokens.phases || []) {
    await db.execute(
      `INSERT INTO token_usage (story_id, phase, tokens_input, tokens_output)
       VALUES ($1, $2, $3, $4)`,
      [storyUuid, phase.phase, phase.input || 0, phase.output || 0]
    )
    count++
  }

  for (const highCost of tokens.high_cost || []) {
    await db.execute(
      `INSERT INTO token_usage (story_id, phase, tokens_input, operation, avoidable)
       VALUES ($1, 'high-cost', $2, $3, $4)`,
      [storyUuid, highCost.tokens || 0, highCost.operation, highCost.avoidable || false]
    )
    count++
  }

  return count
}

async function importFeedback(
  db: any,
  embeddingClient: EmbeddingClient,
  storyUuid: string,
  feedback: FeedbackYaml
): Promise<number> {
  let count = 0
  for (const entry of feedback.entries || []) {
    // Generate embedding for searchable content
    const searchableContent = `${entry.title} ${entry.detail || ''}`
    const embedding = await embeddingClient.generateEmbedding(searchableContent)

    await db.execute(
      `INSERT INTO feedback (
        story_id, type, title, detail, root_cause, recommendation, embedding
      ) VALUES ($1, $2::feedback_type, $3, $4, $5, $6, $7)`,
      [
        storyUuid,
        entry.type || 'reuse',
        entry.title,
        entry.detail,
        entry.root_cause,
        entry.recommendation,
        JSON.stringify(embedding),
      ]
    )
    count++
  }
  return count
}

// ============================================================================
// File Discovery
// ============================================================================

async function findStoryDirectories(basePath: string): Promise<string[]> {
  const storyDirs: string[] = []
  const features = await fs.readdir(basePath)

  for (const feature of features) {
    const featurePath = path.join(basePath, feature)
    try {
      const stat = await fs.stat(featurePath)
      if (!stat.isDirectory()) continue
    } catch {
      continue
    }

    const stages = ['backlog', 'ready-to-work', 'in-progress', 'ready-for-qa', 'uat', 'UAT', 'completed']
    for (const stage of stages) {
      const stagePath = path.join(featurePath, stage)
      try {
        const stories = await fs.readdir(stagePath)
        for (const story of stories) {
          if (story.match(/^[A-Z]+-\d+$/)) {
            storyDirs.push(path.join(stagePath, story))
          }
        }
      } catch {
        // Stage doesn't exist
      }
    }
  }

  return storyDirs
}

async function loadYamlFile<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    return yaml.parse(content) as T
  } catch {
    return null
  }
}

// ============================================================================
// Main Migration
// ============================================================================

async function migrateStoryToDb(
  db: any,
  embeddingClient: EmbeddingClient,
  storyDir: string,
  stats: MigrationStats,
  dryRun: boolean
): Promise<void> {
  const storyId = path.basename(storyDir)
  const pathParts = storyDir.split(path.sep)
  const stageIndex = pathParts.findIndex(p =>
    ['backlog', 'ready-to-work', 'in-progress', 'ready-for-qa', 'uat', 'UAT', 'completed'].includes(p)
  )
  const featureName = pathParts[stageIndex - 1] || 'unknown'

  try {
    // Load story.yaml
    const story = await loadYamlFile<StoryYaml>(path.join(storyDir, 'story.yaml'))
    if (!story) {
      // Fallback: try to load markdown
      console.log(`  [SKIP] ${storyId}: No story.yaml found`)
      return
    }

    if (dryRun) {
      console.log(`  [DRY] Would import: ${storyId} (${story.title})`)
      stats.stories++
      return
    }

    // Ensure feature exists
    const featureId = await ensureFeature(db, featureName)
    stats.features++ // Will count duplicates, but that's ok

    // Import story
    const storyUuid = await importStory(db, embeddingClient, story, featureId)
    stats.stories++

    // Import ACs
    stats.acs += await importACs(db, storyUuid, story.acs || [])

    // Import risks
    stats.risks += await importRisks(db, storyUuid, story.risks || [])

    // Import elaboration
    const elab = await loadYamlFile<ElaborationYaml>(path.join(storyDir, 'elaboration.yaml'))
    if (elab) {
      const elabResult = await importElaboration(db, storyUuid, elab)
      if (elabResult.elaborationId) {
        stats.elaborations++
        stats.gaps += elabResult.gapsCount
        stats.follow_ups += elabResult.followUpsCount
      }
    }

    // Import plan
    const plan = await loadYamlFile<PlanYaml>(path.join(storyDir, 'plan.yaml'))
    if (plan) {
      await importPlan(db, storyUuid, plan)
      stats.plans++
    }

    // Import verification
    const verify = await loadYamlFile<VerificationYaml>(path.join(storyDir, 'verification.yaml'))
    if (verify) {
      await importVerification(db, storyUuid, verify)
      stats.verifications++
    }

    // Import proof
    const proof = await loadYamlFile<ProofYaml>(path.join(storyDir, 'proof.yaml'))
    if (proof) {
      await importProof(db, storyUuid, proof)
      stats.proofs++
    }

    // Import token usage
    const tokens = await loadYamlFile<TokensYaml>(path.join(storyDir, 'tokens.yaml'))
    if (tokens) {
      stats.token_usage += await importTokenUsage(db, storyUuid, tokens)
    }

    // Import feedback
    const feedback = await loadYamlFile<FeedbackYaml>(path.join(storyDir, 'feedback.yaml'))
    if (feedback) {
      stats.feedback += await importFeedback(db, embeddingClient, storyUuid, feedback)
    }

    console.log(`  [OK] ${storyId}`)
  } catch (e) {
    const error = `${storyId}: ${e}`
    stats.errors.push(error)
    console.log(`  [ERR] ${error}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  console.log('\n' + '='.repeat(60))
  console.log('  Story Database Migration')
  console.log('='.repeat(60) + '\n')

  if (dryRun) {
    console.log('[DRY RUN] No database writes will occur\n')
  }

  // Initialize clients
  let db: any
  let embeddingClient: EmbeddingClient

  if (!dryRun) {
    db = getDbClient()
    embeddingClient = createEmbeddingClient()
    console.log('Database and embedding client initialized\n')
  } else {
    // Mock for dry run
    embeddingClient = { generateEmbedding: async () => new Array(1536).fill(0) } as any
  }

  const basePath = path.resolve(process.cwd(), '../../../plans/future')
  console.log(`Scanning: ${basePath}\n`)

  const storyDirs = await findStoryDirectories(basePath)
  console.log(`Found ${storyDirs.length} story directories\n`)

  const stats: MigrationStats = {
    features: 0,
    stories: 0,
    acs: 0,
    risks: 0,
    elaborations: 0,
    gaps: 0,
    follow_ups: 0,
    plans: 0,
    verifications: 0,
    proofs: 0,
    token_usage: 0,
    feedback: 0,
    errors: [],
  }

  console.log('Importing stories:\n')

  for (const storyDir of storyDirs) {
    await migrateStoryToDb(db, embeddingClient, storyDir, stats, dryRun)
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('  Migration Summary')
  console.log('='.repeat(60) + '\n')

  console.log(`Stories imported:      ${stats.stories}`)
  console.log(`Acceptance criteria:   ${stats.acs}`)
  console.log(`Risks:                 ${stats.risks}`)
  console.log(`Elaborations:          ${stats.elaborations}`)
  console.log(`Gaps:                  ${stats.gaps}`)
  console.log(`Follow-ups:            ${stats.follow_ups}`)
  console.log(`Implementation plans:  ${stats.plans}`)
  console.log(`Verifications:         ${stats.verifications}`)
  console.log(`Proofs:                ${stats.proofs}`)
  console.log(`Token usage records:   ${stats.token_usage}`)
  console.log(`Feedback entries:      ${stats.feedback}`)
  console.log(`Errors:                ${stats.errors.length}`)

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

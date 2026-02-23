/**
 * One-time seed: KB-first transition + roadmap analysis stories
 *
 * Creates KNOW-050 and WKFL-024 through WKFL-029 directly in the stories
 * table as KB-native records (no story_dir, no story_file).
 *
 * Run once after confirming IDs are available:
 *   pnpm tsx src/scripts/seed-kb-first-stories.ts --dry-run
 *   pnpm tsx src/scripts/seed-kb-first-stories.ts
 */

import * as path from 'path'
import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Story definitions
// ============================================================================

const STORIES = [
  {
    story_id: 'KNOW-050',
    feature: 'knowledge-base',
    epic: 'kb-first-transition',
    title: 'Add plan_relationships table to KB schema',
    story_type: 'chore',
    priority: 'high',
    state: 'backlog',
    touches_backend: true,
    touches_frontend: false,
    touches_database: true,
    touches_infra: false,
    goal: 'Add a plan_relationships table to the KB schema (Drizzle + SQL migration) so the roadmap analysis command can persist cross-plan capability relationships. Each row captures a pairwise relationship between two plans with a type (similar_to, prerequisite_for, supersedes, shares_capability, conflicts_with) and optional similarity score and shared metadata.',
    depends_on: [],
  },
  {
    story_id: 'WKFL-024',
    feature: 'workflow-learning',
    epic: 'kb-first-transition',
    title: 'KB-native story creation — pm-story generate writes to stories table, no YAML',
    story_type: 'feature',
    priority: 'high',
    state: 'backlog',
    touches_backend: true,
    touches_frontend: false,
    touches_database: true,
    touches_infra: false,
    goal: 'Update pm-story generate (and any other story creation paths) to write new stories directly to the stories table in the KB instead of creating story.yaml files on disk. New stories have no story_dir and no story_file. This is the cutover point — all stories created after this story is implemented are KB-native. Existing file-based stories continue through the file-based pipeline until completion.',
    depends_on: ['WINT-9140', 'KBAR-0240'],
  },
  {
    story_id: 'WKFL-025',
    feature: 'workflow-learning',
    epic: 'kb-first-transition',
    title: 'KB-native artifact writes — all workflow artifacts written to story_artifacts.content',
    story_type: 'feature',
    priority: 'high',
    state: 'backlog',
    touches_backend: true,
    touches_frontend: false,
    touches_database: true,
    touches_infra: false,
    goal: 'Update all workflow commands that currently write artifact files (ELAB.yaml, CHECKPOINT.yaml, EVIDENCE.yaml, QA-GATE.yaml, RETRO-*.yaml) to instead write artifact content as JSONB to the story_artifacts.content column. The KB becomes the sole system of record for workflow state. No artifact files are created for KB-native stories.',
    depends_on: ['WKFL-024'],
  },
  {
    story_id: 'WKFL-026',
    feature: 'workflow-learning',
    epic: 'kb-first-transition',
    title: 'KB-native story reads — workflow commands handle story_dir = null',
    story_type: 'feature',
    priority: 'high',
    state: 'backlog',
    touches_backend: true,
    touches_frontend: false,
    touches_database: false,
    touches_infra: false,
    goal: 'Update all workflow commands that currently read story context from YAML files on disk to first check whether story_dir is null. When null (KB-native story), read story definition and artifacts from the KB via kb_get_story and kb_read_artifact instead of from the filesystem. This is the only dual-mode logic required — a single conditional per command.',
    depends_on: ['WKFL-024'],
  },
  {
    story_id: 'WKFL-027',
    feature: 'workflow-learning',
    epic: 'kb-first-transition',
    title: 'Work queue support for KB-native stories',
    story_type: 'feature',
    priority: 'high',
    state: 'backlog',
    touches_backend: true,
    touches_frontend: false,
    touches_database: false,
    touches_infra: false,
    goal: 'Update /next-work and /next-actions to correctly surface stories that have no story_dir. Currently these commands may assume a filesystem path exists for every story. KB-native stories (story_dir = null) should be surfaced and routed to the correct workflow command exactly like file-based stories. SHARED-* prefix stories must also be handled correctly.',
    depends_on: ['WKFL-024'],
  },
  {
    story_id: 'WKFL-028',
    feature: 'workflow-learning',
    epic: 'kb-first-transition',
    title: 'Retire file-based story pipeline',
    story_type: 'chore',
    priority: 'medium',
    state: 'backlog',
    touches_backend: true,
    touches_frontend: false,
    touches_database: false,
    touches_infra: false,
    goal: 'Once all active file-based stories have completed, retire the file-based story pipeline: delete migrate-stories-simple.ts, remove filesystem scanning logic from workflow commands, and write a KB decision record documenting the cutover date and rationale. The story_dir and story_file columns on the stories table are retained for historical rows but never written for new stories.',
    depends_on: ['WKFL-024', 'WKFL-025', 'WKFL-026', 'WKFL-027'],
  },
  {
    story_id: 'WKFL-029',
    feature: 'workflow-learning',
    epic: 'kb-first-transition',
    title: '/pm-roadmap-analyze command — four-agent cross-plan capability analysis',
    story_type: 'feature',
    priority: 'high',
    state: 'backlog',
    touches_backend: true,
    touches_frontend: false,
    touches_database: true,
    touches_infra: false,
    goal: 'Implement /pm-roadmap-analyze which reads all active plans from the plans table and spawns four agents in parallel: architect (shared data models, API contracts, infrastructure), developer (shared utilities, services, algorithms), ui-ux (shared components, interaction patterns), and scope-defender (challenges unnecessary abstractions). Each analysis agent produces a list of shared capability candidates. The scope-defender reviews the combined output and approves or rejects each. Approved capabilities are written as SHARED-* stories directly to the stories table (state: backlog, no story_dir). Plan relationships are written to plan_relationships. Nothing is written to disk.',
    depends_on: ['WKFL-024', 'KNOW-050'],
  },
]

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
// Main
// ============================================================================

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('\n' + '='.repeat(60))
  console.log('  Seed: KB-First Transition Stories')
  console.log('='.repeat(60) + '\n')

  if (dryRun) console.log('[DRY RUN] No database writes will occur\n')

  const pool = dryRun ? null : createPool()

  if (!dryRun && pool) {
    try {
      await pool.query('SELECT 1')
      console.log('Database connection successful\n')
    } catch (e) {
      console.error('Database connection failed:', e)
      process.exit(1)
    }
  }

  for (const story of STORIES) {
    const { depends_on, goal, ...fields } = story

    if (dryRun) {
      console.log(`  [DRY] ${fields.story_id}: ${fields.title}`)
      console.log(`        priority=${fields.priority} type=${fields.story_type}`)
      if (depends_on.length > 0) console.log(`        depends_on: ${depends_on.join(', ')}`)
      console.log()
      continue
    }

    // Check if already exists
    const existing = await pool!.query(
      'SELECT id FROM stories WHERE story_id = $1',
      [fields.story_id],
    )

    if (existing.rows.length > 0) {
      console.log(`  [SKIP] ${fields.story_id}: Already exists`)
      continue
    }

    // Insert story (no story_dir, no story_file — KB-native)
    await pool!.query(
      `INSERT INTO stories (
        story_id, feature, epic, title, story_type, priority, state,
        touches_backend, touches_frontend, touches_database, touches_infra
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        fields.story_id,
        fields.feature,
        fields.epic,
        fields.title,
        fields.story_type,
        fields.priority,
        fields.state,
        fields.touches_backend,
        fields.touches_frontend,
        fields.touches_database,
        fields.touches_infra,
      ],
    )

    console.log(`  [NEW] ${fields.story_id}: ${fields.title}`)

    // Insert goal as a knowledge_entries record and link via story_artifacts
    // (lightweight — just storing the goal text for now; full elaboration comes later)

    // Insert dependencies
    for (const depId of depends_on) {
      await pool!.query(
        `INSERT INTO story_dependencies (story_id, target_story_id, dependency_type)
         VALUES ($1, $2, 'depends_on')
         ON CONFLICT DO NOTHING`,
        [fields.story_id, depId],
      )
    }

    if (depends_on.length > 0) {
      console.log(`        → depends_on: ${depends_on.join(', ')}`)
    }
  }

  if (pool) await pool.end()

  console.log('\n' + '='.repeat(60))
  console.log(`  Done — ${STORIES.length} stories processed`)
  console.log('='.repeat(60) + '\n')

  if (dryRun) console.log('[DRY RUN] No database writes occurred\n')
}

main().catch(console.error)

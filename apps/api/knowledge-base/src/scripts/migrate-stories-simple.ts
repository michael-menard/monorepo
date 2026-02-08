/**
 * Simple Story Migration Script
 *
 * Imports YAML story files into the stories table with the current schema.
 * This script works with the actual schema in db/schema.ts.
 *
 * Usage:
 *   pnpm tsx src/scripts/migrate-stories-simple.ts --dry-run
 *   pnpm tsx src/scripts/migrate-stories-simple.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import * as yaml from 'yaml'
import { Pool } from 'pg'
import { config } from 'dotenv'

// Load .env
config({ path: path.resolve(process.cwd(), '.env') })

// ============================================================================
// Types
// ============================================================================

interface StoryYaml {
  schema?: number
  id: string
  feature?: string
  type?: string
  state?: string
  title: string
  points?: number | null
  priority?: string | null
  blocked_by?: string | null
  depends_on?: string[]
  follow_up_from?: string | null
  scope?: {
    packages?: string[]
    surfaces?: string[]
  }
  goal?: string
  non_goals?: string[]
  acs?: Array<{ id: string; text: string; type: string }>
  risks?: Array<{ risk: string; mitigation: string }>
  created_at?: string
  updated_at?: string
}

interface MigrationStats {
  storiesImported: number
  storiesSkipped: number
  storiesUpdated: number
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
// File Discovery
// ============================================================================

async function findStoryDirectories(basePath: string): Promise<string[]> {
  const storyDirs: string[] = []

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
// Import Logic
// ============================================================================

function detectScope(
  story: StoryYaml,
  _storyDir: string,
): { backend: boolean; frontend: boolean; database: boolean; infra: boolean } {
  const surfaces = story.scope?.surfaces || []
  const packages = story.scope?.packages || []
  const title = (story.title || '').toLowerCase()
  const goal = (story.goal || '').toLowerCase()

  // Combine text for keyword detection
  const allText = `${title} ${goal} ${surfaces.join(' ')} ${packages.join(' ')}`

  return {
    backend:
      surfaces.includes('backend') ||
      allText.includes('api') ||
      allText.includes('endpoint') ||
      allText.includes('lambda') ||
      allText.includes('handler'),
    frontend:
      surfaces.includes('frontend') ||
      allText.includes('ui') ||
      allText.includes('component') ||
      allText.includes('react') ||
      allText.includes('page'),
    database:
      surfaces.includes('database') ||
      allText.includes('migration') ||
      allText.includes('schema') ||
      allText.includes('postgres') ||
      allText.includes('database'),
    infra:
      surfaces.includes('infra') ||
      allText.includes('docker') ||
      allText.includes('aws') ||
      allText.includes('deployment') ||
      allText.includes('infrastructure'),
  }
}

function mapState(yamlState: string | undefined, stage: string): string {
  // Map YAML state or stage directory to DB state
  if (yamlState) {
    const stateMap: Record<string, string> = {
      backlog: 'backlog',
      'ready-to-work': 'ready',
      'in-progress': 'in_progress',
      'ready-for-qa': 'ready_for_qa',
      'in-qa': 'in_qa',
      uat: 'in_qa',
      UAT: 'in_qa',
      completed: 'completed',
      done: 'completed',
    }
    return stateMap[yamlState] || 'backlog'
  }

  // Fall back to stage directory
  const stageMap: Record<string, string> = {
    backlog: 'backlog',
    'ready-to-work': 'ready',
    'in-progress': 'in_progress',
    'ready-for-qa': 'ready_for_qa',
    uat: 'in_qa',
    UAT: 'in_qa',
    completed: 'completed',
  }
  return stageMap[stage] || 'backlog'
}

function mapType(yamlType: string | undefined): string {
  const typeMap: Record<string, string> = {
    feature: 'feature',
    bug: 'bug',
    spike: 'spike',
    chore: 'chore',
    tech_debt: 'tech_debt',
    'tech-debt': 'tech_debt',
    infrastructure: 'chore',
  }
  return typeMap[yamlType || 'feature'] || 'feature'
}

function mapPriority(yamlPriority: string | null | undefined): string | null {
  if (!yamlPriority) return null
  const priorityMap: Record<string, string> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    p0: 'critical',
    p1: 'high',
    p2: 'medium',
    p3: 'low',
  }
  return priorityMap[yamlPriority.toLowerCase()] || 'medium'
}

async function importStory(
  pool: Pool,
  storyDir: string,
  stats: MigrationStats,
  dryRun: boolean,
): Promise<void> {
  const storyId = path.basename(storyDir)
  const pathParts = storyDir.split(path.sep)
  const stageIndex = pathParts.findIndex(p =>
    ['backlog', 'ready-to-work', 'in-progress', 'ready-for-qa', 'uat', 'UAT', 'completed'].includes(
      p,
    ),
  )
  const stage = pathParts[stageIndex] || 'backlog'
  const featureName = pathParts[stageIndex - 1] || 'unknown'

  try {
    // Load story.yaml
    const story = await loadYamlFile<StoryYaml>(path.join(storyDir, 'story.yaml'))
    if (!story) {
      console.log(`  [SKIP] ${storyId}: No story.yaml found`)
      stats.storiesSkipped++
      return
    }

    // Detect scope from content
    const scope = detectScope(story, storyDir)

    // Compute file hash for change detection
    const storyYamlContent = await fs.readFile(path.join(storyDir, 'story.yaml'), 'utf-8')
    const fileHash = crypto.createHash('sha256').update(storyYamlContent).digest('hex').slice(0, 16)

    // Compute relative story_dir from monorepo root
    const repoRoot = path.resolve(process.cwd(), '../../..')
    const relativeStoryDir = path.relative(repoRoot, storyDir)

    if (dryRun) {
      console.log(`  [DRY] Would import: ${storyId} (${story.title})`)
      console.log(`         Feature: ${featureName}, State: ${mapState(story.state, stage)}`)
      console.log(
        `         Scope: backend=${scope.backend}, frontend=${scope.frontend}, db=${scope.database}`,
      )
      stats.storiesImported++
      return
    }

    // Check if story already exists
    const existing = await pool.query('SELECT id, file_hash FROM stories WHERE story_id = $1', [
      storyId,
    ])

    if (existing.rows.length > 0) {
      // Update existing
      if (existing.rows[0].file_hash === fileHash) {
        console.log(`  [SKIP] ${storyId}: Unchanged`)
        stats.storiesSkipped++
        return
      }

      await pool.query(
        `UPDATE stories SET
          feature = $2,
          title = $3,
          story_dir = $4,
          story_file = 'story.yaml',
          story_type = $5,
          points = $6,
          priority = $7,
          state = $8,
          touches_backend = $9,
          touches_frontend = $10,
          touches_database = $11,
          touches_infra = $12,
          updated_at = NOW(),
          file_synced_at = NOW(),
          file_hash = $13
        WHERE story_id = $1`,
        [
          storyId,
          featureName,
          story.title,
          relativeStoryDir,
          mapType(story.type),
          story.points || null,
          mapPriority(story.priority),
          mapState(story.state, stage),
          scope.backend,
          scope.frontend,
          scope.database,
          scope.infra,
          fileHash,
        ],
      )

      console.log(`  [UPD] ${storyId}`)
      stats.storiesUpdated++
    } else {
      // Insert new
      await pool.query(
        `INSERT INTO stories (
          story_id, feature, title, story_dir, story_file, story_type,
          points, priority, state,
          touches_backend, touches_frontend, touches_database, touches_infra,
          file_synced_at, file_hash
        ) VALUES ($1, $2, $3, $4, 'story.yaml', $5, $6, $7, $8, $9, $10, $11, $12, NOW(), $13)`,
        [
          storyId,
          featureName,
          story.title,
          relativeStoryDir,
          mapType(story.type),
          story.points || null,
          mapPriority(story.priority),
          mapState(story.state, stage),
          scope.backend,
          scope.frontend,
          scope.database,
          scope.infra,
          fileHash,
        ],
      )

      console.log(`  [NEW] ${storyId}`)
      stats.storiesImported++
    }
  } catch (e) {
    const error = `${storyId}: ${e}`
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
  console.log('  Story Database Migration (Simple)')
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
  }

  const basePath = path.resolve(process.cwd(), '../../../plans/future')
  console.log(`Scanning: ${basePath}\n`)

  const storyDirs = await findStoryDirectories(basePath)
  console.log(`Found ${storyDirs.length} story directories\n`)

  // Deduplicate by story ID (same story in multiple stages = take latest)
  const storyMap = new Map<string, string>()
  for (const dir of storyDirs) {
    const storyId = path.basename(dir)
    // Later directories (likely more progressed stages) overwrite earlier
    storyMap.set(storyId, dir)
  }

  const uniqueStoryDirs = Array.from(storyMap.values())
  console.log(`Unique stories to import: ${uniqueStoryDirs.length}\n`)

  const stats: MigrationStats = {
    storiesImported: 0,
    storiesSkipped: 0,
    storiesUpdated: 0,
    errors: [],
  }

  console.log('Importing stories:\n')

  for (const storyDir of uniqueStoryDirs) {
    await importStory(pool!, storyDir, stats, dryRun)
  }

  // Cleanup
  if (pool) {
    await pool.end()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('  Migration Summary')
  console.log('='.repeat(60) + '\n')

  console.log(`Stories imported:  ${stats.storiesImported}`)
  console.log(`Stories updated:   ${stats.storiesUpdated}`)
  console.log(`Stories skipped:   ${stats.storiesSkipped}`)
  console.log(`Errors:            ${stats.errors.length}`)

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

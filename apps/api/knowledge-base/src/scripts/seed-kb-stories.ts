/**
 * seed-kb-stories.ts
 *
 * One-time seed of all stories into the KB stories table.
 *
 * Sources (in priority order per story):
 *   1. story.yaml  — full fidelity, richest data
 *   2. Stage directory — accurate state from filesystem (no yaml)
 *   3. stories.index.md — title + rough status when no directory exists
 *
 * Rules:
 *   - INSERT only — never overwrites an existing KB record
 *   - Platform stories are processed first (constraint)
 *   - State comes from the most advanced stage directory found on disk,
 *     falling back to the index status for stories with no directory
 *   - After seeding, the KB owns state; don't re-run to "sync"
 *
 * Usage:
 *   pnpm tsx src/scripts/seed-kb-stories.ts --dry-run
 *   pnpm tsx src/scripts/seed-kb-stories.ts
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import * as crypto from 'crypto'
import * as yaml from 'yaml'
import { Pool } from 'pg'
import { config } from 'dotenv'

config({ path: path.resolve(process.cwd(), '.env') })

// ── Types ────────────────────────────────────────────────────────────────────

interface StoryRecord {
  storyId: string
  title: string
  state: string
  feature: string
  epic: string
  storyDir: string | null
  storyFile: string
  storyType: string
  points: number | null
  priority: string | null
  touchesBackend: boolean
  touchesFrontend: boolean
  touchesDatabase: boolean
  touchesInfra: boolean
}

// ── Stage / state helpers ─────────────────────────────────────────────────────

const STAGE_PRIORITY: Record<string, number> = {
  completed: 8,
  UAT: 7,
  uat: 7,
  'ready-for-qa': 6,
  'needs-code-review': 5,
  'failed-qa': 4,
  'in-progress': 3,
  'ready-to-work': 2,
  elaboration: 1,
  backlog: 0,
}

const ALL_STAGES = Object.keys(STAGE_PRIORITY)

function mapStageToState(stage: string): string {
  const map: Record<string, string> = {
    completed: 'completed',
    UAT: 'in_qa',
    uat: 'in_qa',
    'ready-for-qa': 'ready_for_qa',
    'needs-code-review': 'ready_for_review',
    'failed-qa': 'failed_qa',
    'in-progress': 'in_progress',
    'ready-to-work': 'ready',
    elaboration: 'backlog',
    backlog: 'backlog',
  }
  return map[stage] ?? 'backlog'
}

function mapIndexStatus(raw: string): string {
  const s = raw.toLowerCase().trim()
  const map: Record<string, string> = {
    pending: 'backlog',
    created: 'backlog',
    elaboration: 'backlog',
    blocked: 'backlog',
    backlog: 'backlog',
    deferred: 'deferred',
    deleted: 'cancelled',
    'ready-to-work': 'ready',
    'in-progress': 'in_progress',
    'ready-for-qa': 'ready_for_qa',
    'in-qa': 'in_qa',
    uat: 'in_qa',
    completed: 'completed',
    done: 'completed',
    approved: 'in_qa',
    'ready for review': 'ready_for_review',
  }
  return map[s] ?? 'backlog'
}

function mapPriority(raw: string | null | undefined): string | null {
  if (!raw) return null
  const map: Record<string, string> = {
    critical: 'critical',
    high: 'high',
    medium: 'medium',
    low: 'low',
    p0: 'critical',
    p1: 'high',
    p2: 'medium',
    p3: 'low',
  }
  return map[raw.toLowerCase()] ?? null
}

function mapType(raw: string | undefined): string {
  const map: Record<string, string> = {
    feature: 'feature',
    bug: 'bug',
    spike: 'spike',
    chore: 'chore',
    tech_debt: 'tech_debt',
    'tech-debt': 'tech_debt',
    infrastructure: 'chore',
  }
  return map[raw ?? 'feature'] ?? 'feature'
}

// ── Directory scanning ────────────────────────────────────────────────────────

/**
 * For a given story ID, search the provided roots for stage directories.
 * Returns the most advanced stage found.
 */
async function findBestStageDir(
  storyId: string,
  searchRoots: string[],
): Promise<{ stage: string; dir: string } | null> {
  let best: { stage: string; dir: string; priority: number } | null = null

  async function check(stagePath: string, stage: string) {
    const storyDir = path.join(stagePath, storyId)
    try {
      const stat = await fs.stat(storyDir)
      if (!stat.isDirectory()) return
      const p = STAGE_PRIORITY[stage] ?? -1
      if (!best || p > best.priority) best = { stage, dir: storyDir, priority: p }
    } catch {
      /* not found */
    }
  }

  async function scanRoot(rootPath: string) {
    let entries: string[]
    try {
      entries = await fs.readdir(rootPath)
    } catch {
      return
    }

    for (const entry of entries) {
      if (ALL_STAGES.includes(entry)) {
        await check(path.join(rootPath, entry), entry)
      } else {
        // One level deeper (feature subdirs)
        const sub = path.join(rootPath, entry)
        try {
          const stat = await fs.stat(sub)
          if (!stat.isDirectory()) continue
          let subEntries: string[]
          try {
            subEntries = await fs.readdir(sub)
          } catch {
            continue
          }
          for (const se of subEntries) {
            if (ALL_STAGES.includes(se)) await check(path.join(sub, se), se)
          }
        } catch {
          /* skip */
        }
      }
    }
  }

  for (const root of searchRoots) await scanRoot(root)
  const found = best as { stage: string; dir: string; priority: number } | null
  return found ? { stage: found.stage, dir: found.dir } : null
}

// ── Index file parsing ────────────────────────────────────────────────────────

const STATUS_WORDS = [
  'pending',
  'uat',
  'completed',
  'ready-to-work',
  'in-progress',
  'in-qa',
  'backlog',
  'deferred',
  'ready-for-qa',
  'elaboration',
  'created',
  'blocked',
  'done',
  'deleted',
  'approved',
]
const STATUS_REGEX = new RegExp(`\\b(${STATUS_WORDS.join('|')})\\b`, 'i')

interface IndexEntry {
  storyId: string
  title: string
  rawStatus: string
  epic: string
}

function parseIndexFile(content: string): IndexEntry[] {
  const entries = new Map<string, IndexEntry>()

  let epicFromFrontmatter: string | null = null
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const m = fmMatch[1].match(/story_prefix:\s*["']?([A-Z]+)["']?/)
    if (m) epicFromFrontmatter = m[1]
  }

  // Pattern 1: header format  ### STORY-ID: Title
  const headerPat = /^###\s+([A-Z]+-\d+):\s+(.+)/gm
  let m: RegExpExecArray | null
  while ((m = headerPat.exec(content)) !== null) {
    const storyId = m[1]
    const rawTitle = m[2]
      .replace(/\*\*[^*]+\*\*/g, '')
      .replace(/~~[^~]+~~/g, '')
      .trim()
    const section = content.slice(m.index, m.index + 800)
    const statusM = section.match(/\*\*Status:\*\*\s*([^\n\r]+)/)
    const rawStatus = statusM
      ? statusM[1]
          .trim()
          .split(/[\s,]/)[0]
          .toLowerCase()
          .replace(/[^a-z-]/g, '')
      : 'pending'
    entries.set(storyId, {
      storyId,
      title: rawTitle || storyId,
      rawStatus,
      epic: epicFromFrontmatter ?? storyId.split('-')[0],
    })
  }

  // Pattern 2: table rows  | ... | STORY-ID | Title | ... |
  for (const line of content.split('\n')) {
    if (!line.startsWith('|')) continue
    if (/^\|[-\s|:]+\|$/.test(line)) continue

    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(Boolean)
    for (let i = 0; i < cells.length; i++) {
      const idM = cells[i].match(/^([A-Z]+-\d{3,})$/)
      if (!idM) continue
      const storyId = idM[1]

      // Skip if already captured by header format
      if (entries.has(storyId) && entries.get(storyId)!.title !== storyId) continue

      const titleCell = i + 1 < cells.length ? cells[i + 1] : ''
      const title = titleCell
        .replace(/\*\*[^*]+\*\*/g, '')
        .replace(/~~[^~]+~~/g, '')
        .replace(/`[^`]+`/g, '')
        .trim()

      // Must have ≥2 words — single words are epic codes or symbols, not titles
      if (title.split(/\s+/).filter(Boolean).length < 2) continue

      let rawStatus = 'pending'
      for (const cell of cells) {
        const sm = cell.match(STATUS_REGEX)
        if (sm) {
          rawStatus = sm[1].toLowerCase()
          break
        }
      }

      entries.set(storyId, {
        storyId,
        title: title || storyId,
        rawStatus,
        epic: epicFromFrontmatter ?? storyId.split('-')[0],
      })
    }
  }

  return Array.from(entries.values())
}

// ── story.yaml loading ────────────────────────────────────────────────────────

interface StoryYaml {
  id: string
  title: string
  feature?: string
  type?: string
  state?: string
  points?: number | null
  priority?: string | null
  scope?: { packages?: string[]; surfaces?: string[] }
  goal?: string
}

async function loadYaml(filePath: string): Promise<StoryYaml | null> {
  try {
    return yaml.parse(await fs.readFile(filePath, 'utf-8')) as StoryYaml
  } catch {
    return null
  }
}

function detectScope(story: StoryYaml) {
  const all = [
    story.title,
    story.goal ?? '',
    ...(story.scope?.surfaces ?? []),
    ...(story.scope?.packages ?? []),
  ]
    .join(' ')
    .toLowerCase()
  return {
    backend: /api|endpoint|lambda|handler|backend/.test(all),
    frontend: /ui|component|react|page|frontend/.test(all),
    database: /migration|schema|postgres|database/.test(all),
    infra: /docker|aws|deployment|infrastructure|infra/.test(all),
  }
}

// ── DB helpers ───────────────────────────────────────────────────────────────

async function insertStory(
  pool: Pool,
  r: StoryRecord,
  fileHash: string,
): Promise<'inserted' | 'skipped'> {
  const existing = await pool.query('SELECT id FROM stories WHERE story_id = $1', [r.storyId])
  if (existing.rows.length > 0) return 'skipped'

  // Insert stories header (hot columns only — detail columns moved to story_details)
  await pool.query(
    `INSERT INTO stories (
      story_id, feature, epic, title, story_type, points, priority, state
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      r.storyId,
      r.feature,
      r.epic,
      r.title,
      r.storyType,
      r.points,
      r.priority,
      r.state,
    ],
  )

  // Insert story_details (story_dir, story_file, touches_*, file tracking — moved here)
  await pool.query(
    `INSERT INTO story_details (
      story_id, story_dir, story_file, touches_backend, touches_frontend,
      touches_database, touches_infra, file_synced_at, file_hash, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),$8,NOW())
    ON CONFLICT (story_id) DO NOTHING`,
    [
      r.storyId,
      r.storyDir,
      r.storyFile,
      r.touchesBackend,
      r.touchesFrontend,
      r.touchesDatabase,
      r.touchesInfra,
      fileHash,
    ],
  )

  return 'inserted'
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('\n' + '='.repeat(60))
  console.log('  KB Story Seed')
  console.log('='.repeat(60) + '\n')
  if (dryRun) console.log('[DRY RUN] No database writes will occur\n')

  const repoRoot = path.resolve(process.cwd(), '../../..')

  const pool = new Pool({
    host: process.env.KB_DB_HOST || 'localhost',
    port: parseInt(process.env.KB_DB_PORT || '5433', 10),
    database: process.env.KB_DB_NAME || 'knowledgebase',
    user: process.env.KB_DB_USER || 'kbuser',
    password: process.env.KB_DB_PASSWORD,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  })

  if (!dryRun) {
    try {
      await pool.query('SELECT 1')
      console.log('DB connected\n')
    } catch (e) {
      console.error('DB connection failed:', e)
      process.exit(1)
    }
  }

  // Load existing story IDs from KB so we can skip them
  const existingIds = new Set<string>()
  if (!dryRun) {
    const { rows } = await pool.query('SELECT story_id FROM stories')
    for (const r of rows) existingIds.add(r.story_id)
    console.log(`${existingIds.size} stories already in KB (will be skipped)\n`)
  }

  const stats = { inserted: 0, skipped: 0, errors: [] as string[] }

  // ── Seed function ──────────────────────────────────────────────────────────

  async function seedFromYaml(storyDir: string, feature: string, epic: string) {
    const storyId = path.basename(storyDir)
    if (existingIds.has(storyId)) {
      stats.skipped++
      return
    }

    const story = await loadYaml(path.join(storyDir, 'story.yaml'))
    if (!story) return

    const pathParts = storyDir.split(path.sep)
    const stageIdx = pathParts.findIndex(p => ALL_STAGES.includes(p))
    const stage = pathParts[stageIdx] ?? 'backlog'
    const state = mapStageToState(stage)
    const scope = detectScope(story)
    const relDir = path.relative(repoRoot, storyDir)
    const content = await fs.readFile(path.join(storyDir, 'story.yaml'), 'utf-8')
    const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)

    const record: StoryRecord = {
      storyId,
      title: story.title,
      state,
      feature: story.feature ?? feature,
      epic,
      storyDir: relDir,
      storyFile: 'story.yaml',
      storyType: mapType(story.type),
      points: story.points ?? null,
      priority: mapPriority(story.priority),
      touchesBackend: scope.backend,
      touchesFrontend: scope.frontend,
      touchesDatabase: scope.database,
      touchesInfra: scope.infra,
    }

    if (dryRun) {
      console.log(`  [DRY] ${storyId} (yaml) → ${state}`)
      stats.inserted++
      return
    }

    try {
      const result = await insertStory(pool, record, hash)
      if (result === 'inserted') {
        console.log(`  [NEW] ${storyId} (yaml) → ${state}`)
        stats.inserted++
      } else {
        stats.skipped++
      }
      existingIds.add(storyId)
    } catch (e) {
      stats.errors.push(`${storyId}: ${e}`)
    }
  }

  async function seedFromIndex(
    entry: IndexEntry,
    feature: string,
    searchRoots: string[],
    indexFile: string,
  ) {
    if (existingIds.has(entry.storyId)) {
      stats.skipped++
      return
    }

    const dirEntry = await findBestStageDir(entry.storyId, searchRoots)
    const state = dirEntry ? mapStageToState(dirEntry.stage) : mapIndexStatus(entry.rawStatus)
    const stateSource = dirEntry ? `dir:${dirEntry.stage}` : `index:${entry.rawStatus}`

    const storyDir = dirEntry
      ? path.relative(repoRoot, path.dirname(dirEntry.dir))
      : path.dirname(path.relative(repoRoot, indexFile))

    const hashSource = `${entry.storyId}:${entry.title}:${dirEntry?.stage ?? entry.rawStatus}`
    const hash = crypto.createHash('sha256').update(hashSource).digest('hex').slice(0, 16)

    const record: StoryRecord = {
      storyId: entry.storyId,
      title: entry.title,
      state,
      feature,
      epic: entry.epic,
      storyDir,
      storyFile: 'stories.index.md',
      storyType: 'feature',
      points: null,
      priority: null,
      touchesBackend: false,
      touchesFrontend: false,
      touchesDatabase: false,
      touchesInfra: false,
    }

    if (dryRun) {
      console.log(`  [DRY] ${entry.storyId} (index) → ${state}  (${stateSource})`)
      stats.inserted++
      return
    }

    try {
      const result = await insertStory(pool, record, hash)
      if (result === 'inserted') {
        console.log(`  [NEW] ${entry.storyId} (index) → ${state}  (${stateSource})`)
        stats.inserted++
      } else {
        stats.skipped++
      }
      existingIds.add(entry.storyId)
    } catch (e) {
      stats.errors.push(`${entry.storyId}: ${e}`)
    }
  }

  // ── PHASE 1: Platform stories (must complete before anything else) ──────────

  console.log('━'.repeat(60))
  console.log('PHASE 1 — Platform stories')
  console.log('━'.repeat(60) + '\n')

  const platformPath = path.resolve(repoRoot, 'plans/future/platform')
  const platformSearchRoots = [platformPath]

  // 1a: story.yaml files under platform
  async function findYamlDirs(basePath: string): Promise<string[]> {
    const results: string[] = []
    async function walk(dir: string, depth: number) {
      if (depth > 4) return
      let entries: string[]
      try {
        entries = await fs.readdir(dir)
      } catch {
        return
      }
      for (const e of entries) {
        const full = path.join(dir, e)
        try {
          const stat = await fs.stat(full)
          if (!stat.isDirectory()) continue
          if (e.match(/^[A-Z]+-\d+$/) && entries.includes('story.yaml')) {
            // check explicitly
          }
          const innerEntries = await fs.readdir(full).catch(() => [] as string[])
          if (innerEntries.includes('story.yaml')) results.push(full)
          else await walk(full, depth + 1)
        } catch {
          /* skip */
        }
      }
    }
    await walk(basePath, 0)
    return results
  }

  // Build a global yaml dedup map across ALL roots (platform + others)
  // so a story appearing in both places is only seeded once at its most advanced stage.
  const allYamlRoots = [
    platformPath,
    path.resolve(repoRoot, 'plans/future/wish'),
    path.resolve(repoRoot, 'plans/stories/backlog'),
    path.resolve(repoRoot, 'plans/_complete'),
  ]
  const globalYamlMap = new Map<string, { dir: string; priority: number }>()
  for (const root of allYamlRoots) {
    const dirs = await findYamlDirs(root)
    for (const dir of dirs) {
      const storyId = path.basename(dir)
      const parts = dir.split(path.sep)
      const stageIdx = parts.findIndex(p => ALL_STAGES.includes(p))
      const stage = parts[stageIdx] ?? 'backlog'
      const priority = STAGE_PRIORITY[stage] ?? 0
      const existing = globalYamlMap.get(storyId)
      if (!existing || priority > existing.priority) globalYamlMap.set(storyId, { dir, priority })
    }
  }

  // Seed platform yaml stories first
  const platformYamlMap = new Map(
    [...globalYamlMap].filter(([, { dir }]) => dir.includes('/platform/')),
  )
  console.log(`Found ${platformYamlMap.size} unique story.yaml stories under platform\n`)
  for (const [, { dir }] of platformYamlMap) {
    const parts = dir.split(path.sep)
    const stageIdx = parts.findIndex(p => ALL_STAGES.includes(p))
    const feature = parts[stageIdx - 1] ?? 'platform'
    const epic = parts[stageIdx - 2] ?? feature
    await seedFromYaml(dir, feature, epic === 'future' ? feature : epic)
  }

  // 1b: index-only platform stories
  const platformIndexFiles: { file: string; feature: string }[] = []
  const rollup = path.join(platformPath, 'platform.stories.index.md')
  if (
    await fs
      .access(rollup)
      .then(() => true)
      .catch(() => false)
  ) {
    platformIndexFiles.push({ file: rollup, feature: 'platform' })
  }
  let platformDirs: string[]
  try {
    platformDirs = await fs.readdir(platformPath)
  } catch {
    platformDirs = []
  }
  for (const d of platformDirs) {
    const idxPath = path.join(platformPath, d, 'stories.index.md')
    if (
      await fs
        .access(idxPath)
        .then(() => true)
        .catch(() => false)
    ) {
      platformIndexFiles.push({ file: idxPath, feature: d })
    }
  }

  // Collect all from indexes, deduplicate keeping sub-feature over rollup
  const platformIndexMap = new Map<string, { entry: IndexEntry; feature: string; file: string }>()
  for (const { file, feature } of platformIndexFiles) {
    const content = await fs.readFile(file, 'utf-8')
    for (const entry of parseIndexFile(content)) {
      const existing = platformIndexMap.get(entry.storyId)
      // Sub-feature index wins over rollup
      const isRollup = path.basename(file) === 'platform.stories.index.md'
      if (!existing || (existing.feature === 'platform' && !isRollup)) {
        platformIndexMap.set(entry.storyId, { entry, feature, file })
      }
    }
  }

  console.log(`\n${platformIndexMap.size} unique stories in platform indexes\n`)
  for (const { entry, feature, file } of platformIndexMap.values()) {
    await seedFromIndex(entry, feature, platformSearchRoots, file)
  }

  console.log(`\nPhase 1 complete — ${stats.inserted} inserted, ${stats.skipped} skipped\n`)

  // ── PHASE 2: All other stories ─────────────────────────────────────────────

  console.log('━'.repeat(60))
  console.log('PHASE 2 — All other stories')
  console.log('━'.repeat(60) + '\n')

  const otherIndexFiles = [
    { file: path.resolve(repoRoot, 'plans/future/wish/stories.index.md'), feature: 'wish' },
    { file: path.resolve(repoRoot, 'plans/future/bug-fix/stories.index.md'), feature: 'bug-fix' },
    {
      file: path.resolve(repoRoot, 'plans/future/instructions/stories.index.md'),
      feature: 'instructions',
    },
    {
      file: path.resolve(repoRoot, 'plans/future/admin-panel/stories.index.md'),
      feature: 'admin-panel',
    },
    {
      file: path.resolve(repoRoot, 'plans/future/inspiration-gallery/stories.index.md'),
      feature: 'inspiration-gallery',
    },
    {
      file: path.resolve(repoRoot, 'plans/future/repackag-app/stories.index.md'),
      feature: 'repackag-app',
    },
    { file: path.resolve(repoRoot, 'plans/future/sets/stories.index.md'), feature: 'sets' },
    { file: path.resolve(repoRoot, 'plans/stories/stories.index.md'), feature: 'stories' },
    { file: path.resolve(repoRoot, 'plans/stories/WISH.stories.index.md'), feature: 'wish' },
    {
      file: path.resolve(repoRoot, 'plans/stories/wrkf.stories.index.md'),
      feature: 'workflow-learning',
    },
    {
      file: path.resolve(repoRoot, 'plans/_complete/workflow-learning/stories.index.md'),
      feature: 'workflow-learning',
    },
    {
      file: path.resolve(repoRoot, 'plans/_complete/cognito-scopes/stories.index.md'),
      feature: 'cognito-scopes',
    },
    {
      file: path.resolve(repoRoot, 'plans/_complete/review-fixes/stories.index.md'),
      feature: 'review-fixes',
    },
  ]

  // Non-platform yaml stories from the global map
  const skipLabels = new Set(['future', 'stories', '_complete'])
  const otherYamlEntries = [...globalYamlMap].filter(([, { dir }]) => !dir.includes('/platform/'))
  for (const [, { dir }] of otherYamlEntries) {
    const parts = dir.split(path.sep)
    const stageIdx = parts.findIndex(p => ALL_STAGES.includes(p))
    const feature = parts[stageIdx - 1] ?? 'unknown'
    const epic = parts[stageIdx - 2] ?? feature
    await seedFromYaml(dir, feature, skipLabels.has(epic) ? feature : epic)
  }

  // Index-only for other epics
  for (const { file, feature } of otherIndexFiles) {
    if (
      !(await fs
        .access(file)
        .then(() => true)
        .catch(() => false))
    )
      continue
    const content = await fs.readFile(file, 'utf-8')
    const entries = parseIndexFile(content)
    console.log(`  ${path.relative(repoRoot, file)}: ${entries.length} stories`)
    const searchRoots = [
      path.resolve(repoRoot, `plans/future/${feature}`),
      path.resolve(repoRoot, 'plans/future'),
      path.resolve(repoRoot, 'plans/_complete'),
    ]
    for (const entry of entries) {
      await seedFromIndex(entry, feature, searchRoots, file)
    }
  }

  if (!dryRun) await pool.end()

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log('\n' + '='.repeat(60))
  console.log('  Seed Summary')
  console.log('='.repeat(60) + '\n')
  console.log(`Inserted: ${stats.inserted}`)
  console.log(`Skipped:  ${stats.skipped}`)
  console.log(`Errors:   ${stats.errors.length}`)
  if (stats.errors.length > 0) {
    console.log('\nErrors:')
    for (const e of stats.errors) console.log(`  - ${e}`)
  }
  if (dryRun) console.log('\n[DRY RUN] No database writes occurred')
}

main().catch(console.error)

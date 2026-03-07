import { createHash } from 'crypto'
import { eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'
import { logger } from '@repo/logger'
import { stories, indexMetadata, indexEntries } from '../../schema/kbar.js'
import { capitalise, toIsoUtc } from './utils/index.js'

// ============================================================================
// Zod Schemas
// ============================================================================

export const GenerateStoriesIndexOptionsSchema = z.object({
  /** Epic identifier (e.g., 'KBAR') */
  epic: z.string().min(1),
  /** Relative file path for the generated index (e.g., 'plans/future/platform/kb-artifact-migration/stories.index.md') */
  filePath: z.string().min(1),
  /** Optional index name — defaults to `{epic}.stories.index` */
  indexName: z.string().optional(),
})

export type GenerateStoriesIndexOptions = z.infer<typeof GenerateStoriesIndexOptionsSchema>

/** Mirrors the `metadata` JSONB shape defined in kbar.stories */
const StoryMetadataSchema = z
  .object({
    surfaces: z
      .object({
        backend: z.boolean().optional(),
        frontend: z.boolean().optional(),
        database: z.boolean().optional(),
        infra: z.boolean().optional(),
      })
      .optional(),
    tags: z.array(z.string()).optional(),
    wave: z.number().optional(),
    blocked_by: z.array(z.string()).optional(),
    blocks: z.array(z.string()).optional(),
    feature_dir: z.string().optional(),
  })
  .strict()

type StoryMetadata = z.infer<typeof StoryMetadataSchema>

/** A single story row enriched with resolved dependency labels */
const StoryRowSchema = z.object({
  id: z.string(),
  storyId: z.string(),
  epic: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  storyType: z.string(),
  priority: z.string(),
  complexity: z.string().nullable(),
  storyPoints: z.number().nullable(),
  currentPhase: z.string(),
  status: z.string(),
  metadata: StoryMetadataSchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

type StoryRow = z.infer<typeof StoryRowSchema>

const DependencyRowSchema = z.object({
  storyId: z.string(),
  dependsOnStoryId: z.string(),
  dependencyType: z.string(),
  resolved: z.boolean(),
  /** Human-readable story ID of the depended-upon story (resolved via JOIN) */
  dependsOnStoryLabel: z.string().nullable(),
  /** Status of the depended-upon story (resolved via JOIN for AC-4) */
  dependsOnStoryStatus: z.string().nullable(),
})

type DependencyRow = z.infer<typeof DependencyRowSchema>

export const GenerateStoriesIndexResultSchema = z.object({
  markdown: z.string(),
  storyCount: z.number().int().nonnegative(),
  checksum: z.string(),
})

export type GenerateStoriesIndexResult = z.infer<typeof GenerateStoriesIndexResultSchema>

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extracts the numeric portion of a story ID for sorting.
 * 'KBAR-0010' → 10, 'KBAR-001' → 1, 'KBAR-023' → 23
 */
function storyNumericId(storyId: string): number {
  const match = storyId.match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

// ============================================================================
// Renderer: YAML frontmatter block
// ============================================================================

function renderFrontmatter(
  epic: string,
  _statusCounts: Map<string, number>,
  updatedAt: Date,
  createdAt: Date,
): string {
  const lines: string[] = [
    '---',
    'doc_type: stories_index',
    `title: "${epic} Stories Index"`,
    'status: active',
    `story_prefix: "${epic}"`,
    `created_at: "${toIsoUtc(createdAt)}"`,
    `updated_at: "${toIsoUtc(updatedAt)}"`,
    '---',
  ]
  return lines.join('\n')
}

// ============================================================================
// Renderer: Progress Summary table
// ============================================================================

const STATUS_ORDER = [
  'completed',
  'uat',
  'failed-qa',
  'generated',
  'created',
  'ready-to-work',
  'elaboration',
  'in-progress',
  'needs-code-review',
  'ready-for-qa',
  'pending',
]

function renderProgressSummary(statusCounts: Map<string, number>): string {
  const lines: string[] = ['## Progress Summary', '', '| Status | Count |', '|--------|-------|']

  // Emit known statuses in canonical order
  for (const status of STATUS_ORDER) {
    const count = statusCounts.get(status) ?? 0
    lines.push(`| ${status} | ${count} |`)
  }

  // Emit any statuses not in the canonical list
  for (const [status, count] of statusCounts) {
    if (!STATUS_ORDER.includes(status)) {
      lines.push(`| ${status} | ${count} |`)
    }
  }

  return lines.join('\n')
}

// ============================================================================
// Renderer: Ready to Start section
// ============================================================================

/** Statuses that represent stories not yet being worked on */
const WORKABLE_STATUSES = new Set([
  'created',
  'ready-to-work',
  'elaboration',
  'pending',
  'generated',
])

/** Statuses where the target dependency is considered satisfied (AC-4) */
const SATISFIED_DEP_STATUSES = new Set(['completed', 'uat'])

function renderReadyToStart(
  storyRows: StoryRow[],
  depsByStory: Map<string, DependencyRow[]>,
): string {
  const lines: string[] = [
    '## Ready to Start',
    '',
    'Stories with all dependencies satisfied (can be worked in parallel):',
    '',
    '| Story | Title | Blocked By |',
    '|-------|-------|------------|',
  ]

  for (const story of storyRows) {
    // Only include stories that haven't started work yet
    if (!WORKABLE_STATUSES.has(story.status)) continue

    const deps = depsByStory.get(story.id) ?? []

    // AC-4: Check target story status, not just the resolved boolean
    const blockingDeps = deps.filter(d => {
      if (d.dependencyType !== 'blocks' && d.dependencyType !== 'requires') return false
      // Check the actual target story status (not just resolved boolean)
      const targetStatus = d.dependsOnStoryStatus
      if (targetStatus && SATISFIED_DEP_STATUSES.has(targetStatus)) return false
      return true
    })

    if (blockingDeps.length === 0) {
      lines.push(`| ${story.storyId} | ${story.title} | — |`)
    }
  }

  return lines.join('\n')
}

// ============================================================================
// Renderer: Per-story sections
// ============================================================================

function resolveDepLabels(story: StoryRow, depsByStory: Map<string, DependencyRow[]>): string {
  const deps = depsByStory.get(story.id) ?? []
  if (deps.length === 0) return 'none'
  const labels = deps.map(d => d.dependsOnStoryLabel ?? d.dependsOnStoryId)
  return labels.join(', ')
}

function renderStorySections(
  storyRows: StoryRow[],
  depsByStory: Map<string, DependencyRow[]>,
): string {
  const blocks: string[] = []

  for (const story of storyRows) {
    const meta: StoryMetadata = story.metadata ?? {}
    const phase = meta.wave ?? ''
    const depLabel = resolveDepLabels(story, depsByStory)

    const sectionLines: string[] = [
      `## ${story.storyId}: ${story.title}`,
      '',
      `**Status:** ${story.status}`,
      `**Story ID:** ${story.storyId}`,
      `**Depends On:** ${depLabel}`,
    ]

    if (phase !== '') {
      sectionLines.push(`**Phase:** ${phase}`)
    }

    if (story.description) {
      sectionLines.push('')
      sectionLines.push(`**Feature:** ${story.description}`)
    }

    const surfaces = meta.surfaces
    if (surfaces) {
      const infra: string[] = []
      if (surfaces.database) infra.push('PostgreSQL migration')
      if (surfaces.backend) infra.push('TypeScript utilities')
      if (surfaces.frontend) infra.push('React components')
      if (surfaces.infra) infra.push('Infrastructure')
      if (infra.length > 0) {
        sectionLines.push('')
        sectionLines.push('**Infrastructure:**')
        for (const item of infra) {
          sectionLines.push(`- ${item}`)
        }
      }
    }

    // Risk notes — no DB column, defaults to empty
    // (Architecture decision: Risk Notes defaults to empty when no DB column exists)

    sectionLines.push('')
    sectionLines.push('---')

    blocks.push(sectionLines.join('\n'))
  }

  return blocks.join('\n\n')
}

// ============================================================================
// DB write helpers
// ============================================================================

async function upsertIndexMetadata(
  db: NodePgDatabase,
  opts: {
    indexName: string
    indexType: string
    filePath: string
    checksum: string
    epic: string
    totalStories: number
  },
): Promise<string> {
  const rows = await db
    .insert(indexMetadata)
    .values({
      indexName: opts.indexName,
      indexType: opts.indexType,
      filePath: opts.filePath,
      checksum: opts.checksum,
      lastGeneratedAt: new Date(),
      metadata: {
        epic: opts.epic,
        totalStories: opts.totalStories,
      },
    })
    .onConflictDoUpdate({
      target: indexMetadata.indexName,
      set: {
        checksum: opts.checksum,
        lastGeneratedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          epic: opts.epic,
          totalStories: opts.totalStories,
        },
      },
    })
    .returning({ id: indexMetadata.id })

  const row = rows[0]
  if (!row) {
    throw new Error(`Failed to upsert index_metadata for ${opts.indexName}`)
  }
  return row.id
}

async function upsertIndexEntries(
  db: NodePgDatabase,
  indexId: string,
  storyRows: StoryRow[],
  depsByStory: Map<string, DependencyRow[]>,
): Promise<void> {
  if (storyRows.length === 0) return

  for (let i = 0; i < storyRows.length; i++) {
    const story = storyRows[i]
    const deps = depsByStory.get(story.id) ?? []
    const depLabels = deps.map(d => d.dependsOnStoryLabel ?? d.dependsOnStoryId)

    await db
      .insert(indexEntries)
      .values({
        indexId,
        storyId: story.id,
        sortOrder: i + 1,
        sectionName: capitalise(story.status),
        metadata: {
          lastUpdated: toIsoUtc(story.updatedAt),
          dependencies: depLabels,
        },
      })
      .onConflictDoUpdate({
        target: [indexEntries.indexId, indexEntries.storyId],
        set: {
          sortOrder: i + 1,
          sectionName: capitalise(story.status),
          updatedAt: new Date(),
          metadata: {
            lastUpdated: toIsoUtc(story.updatedAt),
            dependencies: depLabels,
          },
        },
      })
  }
}

// ============================================================================
// Main export
// ============================================================================

/**
 * Generates a stories.index.md-compatible markdown string for the given epic,
 * persists metadata to kbar.index_metadata and kbar.index_entries, then
 * returns the generated markdown.
 *
 * @param epic - Epic identifier (e.g., 'KBAR')
 * @param db   - Drizzle NodePgDatabase instance (kbar schema must be accessible)
 * @param opts - Additional options (filePath, indexName)
 */
export async function generateStoriesIndex(
  epic: string,
  db: NodePgDatabase,
  opts: Omit<GenerateStoriesIndexOptions, 'epic'>,
): Promise<GenerateStoriesIndexResult> {
  const validated = GenerateStoriesIndexOptionsSchema.parse({ epic, ...opts })

  logger.info('generateStoriesIndex: starting', {
    epic: validated.epic,
    filePath: validated.filePath,
  })

  // ----------------------------------------------------------------
  // Step 1: Query all stories for epic, sorted by numeric ID (AC-13)
  // ----------------------------------------------------------------
  const rawStories = await db.select().from(stories).where(eq(stories.epic, validated.epic))

  const storyRows: StoryRow[] = z
    .array(StoryRowSchema)
    .parse(rawStories)
    .sort((a, b) => storyNumericId(a.storyId) - storyNumericId(b.storyId))

  logger.info('generateStoriesIndex: fetched stories', { count: storyRows.length })

  // ----------------------------------------------------------------
  // Step 2: Resolve dependencies via JOIN (UUID → storyId label) (AC-6)
  // ----------------------------------------------------------------
  const depsResult = await db.execute(
    sql`
      SELECT
        sd.story_id        AS "storyId",
        sd.depends_on_story_id AS "dependsOnStoryId",
        sd.dependency_type AS "dependencyType",
        sd.resolved        AS "resolved",
        s2.story_id        AS "dependsOnStoryLabel",
        s2.status          AS "dependsOnStoryStatus"
      FROM kbar.story_dependencies sd
      JOIN kbar.stories s1 ON s1.id = sd.story_id
      JOIN kbar.stories s2 ON s2.id = sd.depends_on_story_id
      WHERE s1.epic = ${validated.epic}
    `,
  )

  const depRows: DependencyRow[] = z.array(DependencyRowSchema).parse(
    depsResult.rows.map(r => ({
      storyId: r['storyId'],
      dependsOnStoryId: r['dependsOnStoryId'],
      dependencyType: r['dependencyType'],
      resolved: r['resolved'],
      dependsOnStoryLabel: r['dependsOnStoryLabel'] ?? null,
      dependsOnStoryStatus: r['dependsOnStoryStatus'] ?? null,
    })),
  )

  // Build lookup: story UUID → dependency rows
  const depsByStory = new Map<string, DependencyRow[]>()
  for (const dep of depRows) {
    const existing = depsByStory.get(dep.storyId) ?? []
    existing.push(dep)
    depsByStory.set(dep.storyId, existing)
  }

  // ----------------------------------------------------------------
  // Step 3: Build status count map (AC-3)
  // ----------------------------------------------------------------
  const statusCounts = new Map<string, number>()
  for (const story of storyRows) {
    statusCounts.set(story.status, (statusCounts.get(story.status) ?? 0) + 1)
  }

  // ----------------------------------------------------------------
  // Step 4: Determine timestamps for frontmatter
  // ----------------------------------------------------------------
  const now = new Date()
  const firstCreated =
    storyRows.length > 0
      ? storyRows.reduce(
          (min, s) => (s.createdAt < min ? s.createdAt : min),
          storyRows[0].createdAt,
        )
      : now
  const lastUpdated =
    storyRows.length > 0
      ? storyRows.reduce(
          (max, s) => (s.updatedAt > max ? s.updatedAt : max),
          storyRows[0].updatedAt,
        )
      : now

  // ----------------------------------------------------------------
  // Step 5: Render markdown sections (ACs 2, 3, 4, 5)
  // ----------------------------------------------------------------
  const frontmatter = renderFrontmatter(validated.epic, statusCounts, lastUpdated, firstCreated)
  const title = `# ${validated.epic} Stories Index`
  const subtitle = `\nAll stories in this epic use the \`${validated.epic}-XXX\` naming convention (starting at 001).\n`
  const progressSummary = renderProgressSummary(statusCounts)
  const readyToStart = renderReadyToStart(storyRows, depsByStory)
  const storySections = renderStorySections(storyRows, depsByStory)

  const parts: string[] = [
    frontmatter,
    '',
    title,
    subtitle,
    progressSummary,
    '',
    '---',
    '',
    readyToStart,
    '',
    '---',
  ]
  if (storySections) {
    parts.push('')
    parts.push(storySections)
  }

  const markdown = parts.join('\n')

  // ----------------------------------------------------------------
  // Step 6: Compute checksum (AC-8)
  // ----------------------------------------------------------------
  const checksum = createHash('sha256').update(markdown, 'utf8').digest('hex')

  // ----------------------------------------------------------------
  // Step 7: DB writes — index_metadata + index_entries (ACs 8, 9)
  // ----------------------------------------------------------------
  const resolvedIndexName = validated.indexName ?? `${validated.epic.toLowerCase()}.stories.index`

  const indexId = await upsertIndexMetadata(db, {
    indexName: resolvedIndexName,
    indexType: 'epic',
    filePath: validated.filePath,
    checksum,
    epic: validated.epic,
    totalStories: storyRows.length,
  })

  await upsertIndexEntries(db, indexId, storyRows, depsByStory)

  logger.info('generateStoriesIndex: complete', {
    epic: validated.epic,
    storyCount: storyRows.length,
    checksum,
  })

  return GenerateStoriesIndexResultSchema.parse({
    markdown,
    storyCount: storyRows.length,
    checksum,
  })
}

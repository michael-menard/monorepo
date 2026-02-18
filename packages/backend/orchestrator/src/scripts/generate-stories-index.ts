#!/usr/bin/env npx tsx
/**
 * Generate Stories Index Script
 *
 * Reads story state from the `wint.stories` database, supplements with YAML
 * frontmatter for fields not stored in the DB, and writes a DO NOT EDIT
 * generated version of `stories.index.md`.
 *
 * ## CLI Usage
 *
 * ```bash
 * # Generate stories.index.md from database (writes file)
 * npx tsx generate-stories-index.ts --generate
 *
 * # Dry-run: output to stdout without overwriting stories.index.md
 * npx tsx generate-stories-index.ts --dry-run
 *
 * # Verify: compare current stories.index.md with what would be generated
 * # Exits 0 if identical, 1 if drift detected
 * npx tsx generate-stories-index.ts --verify
 * ```
 *
 * ## Required Environment Variables
 *
 * - `POSTGRES_HOST` (default: localhost)
 * - `POSTGRES_PORT` (default: 5432)
 * - `POSTGRES_DATABASE` (default: postgres)
 * - `POSTGRES_USER` (default: postgres)
 * - `POSTGRES_PASSWORD` (default: postgres)
 *
 * ## Data Strategy: DB-Primary, YAML-Fallback
 *
 * The `wint.stories` table is queried first and is the primary source of truth
 * for: `state`, `title`, `goal`, `depends_on`.
 *
 * Fields not stored in `wint.stories` use YAML frontmatter as fallback:
 * - `phase` — for section grouping
 * - `risk_notes` — freeform risk description
 * - `feature` — long narrative feature description
 * - `infrastructure` — list of infrastructure components
 *
 * YAML fallback is fail-soft: if StoryFileAdapter.read() throws, the story
 * is rendered with `—` for missing fields and a warning is logged.
 *
 * ## AC-13: STORY_STATE_ENUM
 *
 * Values confirmed from: SELECT unnest(enum_range(NULL::wint.story_state))
 * Source: apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql
 *
 * Story: WINT-1070
 */

import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { z } from 'zod'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import { StoryFileAdapter } from '../adapters/story-file-adapter.js'
import { ValidationError, StoryNotFoundError } from '../adapters/__types__/index.js'
import { createStoryRepository } from '../db/story-repository.js'
import { StoryRowSchema, type StoryRow } from '../__types__/index.js'
import {
  STORY_STATE_ENUM,
  STATE_TO_DISPLAY_LABEL,
  FIELD_SOURCE_MAP,
  IndexFrontmatterSchema,
  GenerationReportSchema,
  StorySectionSchema,
  type IndexFrontmatter,
  type StorySection,
  type YamlFallbackData,
  type GenerationReport,
  type StoryStateEnum,
} from './__types__/generation.js'

// ============================================================================
// AC-13: STORY_STATE_ENUM — authoritative DB enum values
// Confirmed from: SELECT unnest(enum_range(NULL::wint.story_state))
// Source: apps/api/knowledge-base/src/db/migrations/002_workflow_tables.sql
// ============================================================================
// Re-exported for documentation completeness; defined in generation.ts
export { STORY_STATE_ENUM, STATE_TO_DISPLAY_LABEL, FIELD_SOURCE_MAP }

// ============================================================================
// Configuration
// ============================================================================

const MONOREPO_ROOT = findMonorepoRoot()
const WINT_INDEX_PATH = path.join(MONOREPO_ROOT, 'plans/future/platform/wint/stories.index.md')
const WINT_STORIES_DIR = path.join(MONOREPO_ROOT, 'plans/future/platform/wint')

/**
 * Find monorepo root by looking for pnpm-workspace.yaml
 */
export function findMonorepoRoot(): string {
  let current = process.cwd()
  while (current !== '/') {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current
    }
    current = path.dirname(current)
  }
  throw new Error('Could not find monorepo root (pnpm-workspace.yaml not found)')
}

/**
 * Create database connection pool
 */
export function createDbPool(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  })
}

// ============================================================================
// CLI Parsing
// ============================================================================

const CliOptionsSchema = z.object({
  mode: z.enum(['dry-run', 'generate', 'verify']),
})
type CliOptions = z.infer<typeof CliOptionsSchema>

export function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const mode = args.includes('--generate')
    ? 'generate'
    : args.includes('--verify')
      ? 'verify'
      : 'dry-run'
  return { mode }
}

// ============================================================================
// Pure Rendering Functions (AC-3, AC-4, AC-5, AC-6)
// ============================================================================

/**
 * Group stories by phase (from YAML fallback data), sorted by story ID.
 * Stories without a phase are placed in a special "unphased" group.
 */
export function groupStoriesByPhase(sections: StorySection[]): Map<string, StorySection[]> {
  const groups = new Map<string, StorySection[]>()

  for (const section of sections) {
    const phaseKey =
      section.phase !== null && section.phase !== undefined ? String(section.phase) : 'unphased'

    const existing = groups.get(phaseKey) || []
    existing.push(section)
    groups.set(phaseKey, existing)
  }

  // Sort within each phase by story_id ascending
  for (const [, storiesInPhase] of groups) {
    storiesInPhase.sort((a, b) => a.story_id.localeCompare(b.story_id))
  }

  // Sort the map by phase number (numeric phases first, then "unphased")
  const sortedGroups = new Map<string, StorySection[]>()
  const phaseKeys = Array.from(groups.keys()).sort((a, b) => {
    if (a === 'unphased') return 1
    if (b === 'unphased') return -1
    const numA = parseFloat(a)
    const numB = parseFloat(b)
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB
    return a.localeCompare(b)
  })

  for (const key of phaseKeys) {
    sortedGroups.set(key, groups.get(key)!)
  }

  return sortedGroups
}

/**
 * Compute progress summary: count of stories per state (AC-4)
 * All enum values are included even if count is 0.
 */
export function computeProgressSummary(stories: StoryRow[]): Record<StoryStateEnum, number> {
  const counts: Record<string, number> = {}

  // Initialize all enum values to 0
  for (const state of STORY_STATE_ENUM) {
    counts[state] = 0
  }

  for (const story of stories) {
    const state = story.state as string
    if (state in counts) {
      counts[state]++
    } else {
      // Unknown state — still count it
      counts[state] = (counts[state] || 0) + 1
    }
  }

  return counts as Record<StoryStateEnum, number>
}

/**
 * Compute ready-to-start stories (AC-5):
 * Stories in 'ready-to-work' state where all depends_on entries are
 * in 'done' or 'uat' state. Partial dependency satisfaction does NOT trigger inclusion.
 */
export function computeReadyToStart(stories: StoryRow[]): StoryRow[] {
  // Build state map: story_id -> state
  const stateMap = new Map<string, string>()
  for (const story of stories) {
    stateMap.set(story.story_id, story.state as string)
  }

  return stories.filter(story => {
    // Must be in ready-to-work state
    if ((story.state as string) !== 'ready-to-work') return false

    // No dependencies → included (unblocked)
    const deps = story.depends_on
    if (!deps || deps.length === 0) return true

    // ALL dependencies must be done or uat
    return deps.every(depId => {
      const depState = stateMap.get(depId)
      return depState === 'done' || depState === 'uat'
    })
  })
}

/**
 * Render the YAML frontmatter block (AC-3)
 * created_at is preserved from original file, updated_at reflects generation time.
 */
export function renderFrontmatter(meta: {
  title: string
  story_prefix: string
  created_at: string
  updated_at: string
}): string {
  const frontmatter: IndexFrontmatter = {
    doc_type: 'stories_index',
    title: meta.title,
    status: 'generated',
    story_prefix: meta.story_prefix,
    created_at: meta.created_at,
    updated_at: meta.updated_at,
    generated_by: 'generate-stories-index.ts',
  }

  // Validate before rendering
  IndexFrontmatterSchema.parse(frontmatter)

  return [
    '---',
    `doc_type: ${frontmatter.doc_type}`,
    `title: "${frontmatter.title}"`,
    `status: ${frontmatter.status}`,
    `story_prefix: "${frontmatter.story_prefix}"`,
    `created_at: "${frontmatter.created_at}"`,
    `updated_at: "${frontmatter.updated_at}"`,
    `generated_by: ${frontmatter.generated_by}`,
    '---',
  ].join('\n')
}

/**
 * Render the Progress Summary table (AC-4)
 * Uses STATE_TO_DISPLAY_LABEL to convert DB enum values to display labels.
 */
export function renderProgressTable(summary: Record<string, number>): string {
  const lines: string[] = ['## Progress Summary', '', '| Status | Count |', '|--------|-------|']

  for (const state of STORY_STATE_ENUM) {
    const label = STATE_TO_DISPLAY_LABEL[state] || state
    const count = summary[state] ?? 0
    lines.push(`| ${label} | ${count} |`)
  }

  return lines.join('\n')
}

/**
 * Render the Ready to Start table (AC-5)
 */
export function renderReadyToStartTable(
  readyStories: StoryRow[],
  sections: StorySection[],
): string {
  const sectionMap = new Map(sections.map(s => [s.story_id, s]))

  const lines: string[] = [
    '## Ready to Start',
    '',
    'Stories with all dependencies satisfied (can be worked in parallel):',
    '',
    '| Story | Feature | Blocked By |',
    '|-------|---------|------------|',
  ]

  if (readyStories.length === 0) {
    lines.push('| — | — | — |')
  } else {
    for (const story of readyStories) {
      const section = sectionMap.get(story.story_id)
      const feature = section?.feature || story.title || '—'
      lines.push(`| ${story.story_id} | ${feature} | — |`)
    }
  }

  return lines.join('\n')
}

/**
 * Render a single story section (AC-6)
 * Fields absent from both DB and YAML render as `—`.
 */
export function renderStorySection(section: StorySection): string {
  const displayState = STATE_TO_DISPLAY_LABEL[section.state as StoryStateEnum] || section.state
  const dependsOnStr =
    section.depends_on && section.depends_on.length > 0 ? section.depends_on.join(', ') : 'none'
  const phaseStr =
    section.phase !== null && section.phase !== undefined ? String(section.phase) : '—'
  const featureStr = section.feature || '—'
  const goalStr = section.goal || '—'
  const riskNotesStr = section.risk_notes || '—'

  const lines: string[] = [
    `### ${section.story_id}: ${section.title}`,
    '',
    `**Status:** ${displayState}`,
    `**Depends On:** ${dependsOnStr}`,
    `**Phase:** ${phaseStr}`,
    `**Feature:** ${featureStr}`,
  ]

  // Infrastructure (list or dash)
  if (section.infrastructure && section.infrastructure.length > 0) {
    lines.push('**Infrastructure:**')
    for (const item of section.infrastructure) {
      lines.push(`- ${item}`)
    }
  } else {
    lines.push('**Infrastructure:** —')
  }

  lines.push('')
  lines.push(`**Goal:** ${goalStr}`)
  lines.push('')
  lines.push(`**Risk Notes:** ${riskNotesStr}`)

  return lines.join('\n')
}

// ============================================================================
// Phase Header Generation
// ============================================================================

export const PHASE_DESCRIPTIONS: Record<string, string> = {
  '0': 'Bootstrap phase - Manual setup of database schemas, MCP tools, and doc-sync infrastructure (untracked, prerequisite for all other phases)',
}

/**
 * Generate phase section header with optional description.
 * Used in renderFullIndex to label phase sections.
 */
export function getPhaseHeader(phase: string): string {
  if (phase === 'unphased') {
    return '## Unphased Stories\n\nStories without a phase assignment.'
  }
  const desc = PHASE_DESCRIPTIONS[phase]
  const header = `## Phase ${phase}:`
  return desc ? `${header} ${desc}` : header
}

// ============================================================================
// Full Index Rendering
// ============================================================================

/**
 * Render the complete stories.index.md content from sections.
 * Implements AC-10: DO NOT EDIT warning immediately after frontmatter.
 */
export function renderFullIndex(
  frontmatter: string,
  progressTable: string,
  readyToStartTable: string,
  groupedSections: Map<string, StorySection[]>,
  phaseDescriptions: Map<string, string>,
): string {
  const parts: string[] = []

  // Frontmatter
  parts.push(frontmatter)
  parts.push('')

  // DO NOT EDIT warning (AC-10)
  parts.push(
    '<!-- DO NOT EDIT: This file is generated by generate-stories-index.ts. Manual edits will be overwritten. -->',
  )
  parts.push('')

  // Title and intro
  parts.push('# WINT Stories Index')
  parts.push('')
  parts.push(
    'All stories use `WINT-{phase}{story}{variant}` format (e.g., `WINT-1010` for Phase 1, Story 01, original).',
  )
  parts.push('')

  // Progress Summary
  parts.push(progressTable)
  parts.push('')
  parts.push('---')
  parts.push('')

  // Ready to Start
  parts.push(readyToStartTable)
  parts.push('')
  parts.push('---')
  parts.push('')

  // Phase sections
  for (const [phase, stories] of groupedSections) {
    const phaseDesc = phaseDescriptions.get(phase)
    const phaseNum = phase === 'unphased' ? null : parseInt(phase, 10)
    const phaseLabel = phaseNum !== null && !isNaN(phaseNum) ? phaseNum : phase

    if (phase === 'unphased') {
      parts.push('## Unphased Stories')
      parts.push('')
      parts.push('Stories without a phase assignment.')
    } else {
      const phaseHeader = `## Phase ${phaseLabel}:`
      if (phaseDesc) {
        parts.push(`${phaseHeader} ${phaseDesc}`)
      } else {
        parts.push(phaseHeader)
      }
    }
    parts.push('')

    for (const section of stories) {
      parts.push(renderStorySection(section))
      parts.push('')
      parts.push('---')
      parts.push('')
    }
  }

  return parts.join('\n')
}

// ============================================================================
// Atomic File Write
// ============================================================================

/**
 * Write content to a file atomically using temp file + rename pattern.
 * Prevents partial writes on large files (143+ stories).
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  const tmpPath = path.join(os.tmpdir(), `stories-index-${Date.now()}.tmp`)

  try {
    await fs.writeFile(tmpPath, content, 'utf8')
    await fs.rename(tmpPath, filePath)
  } catch (error) {
    // Clean up temp file on error
    try {
      await fs.unlink(tmpPath)
    } catch {
      // Ignore cleanup errors
    }
    throw error
  }
}

// ============================================================================
// YAML Fallback Resolution
// ============================================================================

/**
 * Resolve a story file path from the monorepo wint stories directory.
 * Searches lifecycle subdirectories and root.
 */
export function resolveStoryFilePath(storyId: string, storiesDir: string): string | null {
  const lifecycleDirs = [
    'in-progress',
    'ready-to-work',
    'ready-for-qa',
    'UAT',
    'backlog',
    'elaboration',
    'needs-code-review',
    '',
  ]

  for (const subdir of lifecycleDirs) {
    const candidate = subdir
      ? path.join(storiesDir, subdir, storyId, `${storyId}.md`)
      : path.join(storiesDir, storyId, `${storyId}.md`)

    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

/**
 * Read YAML fallback data for a story.
 * Returns null if the story file cannot be found or parsed.
 * Fail-soft: logs warning and returns null on any error.
 */
export async function readYamlFallback(
  storyId: string,
  adapter: StoryFileAdapter,
  storiesDir: string,
  cache: Map<string, YamlFallbackData | null>,
): Promise<YamlFallbackData | null> {
  // Check cache first (no double-reads)
  if (cache.has(storyId)) {
    return cache.get(storyId) ?? null
  }

  const filePath = resolveStoryFilePath(storyId, storiesDir)

  if (!filePath) {
    logger.warn('Story YAML file not found for YAML fallback', { storyId })
    cache.set(storyId, null)
    return null
  }

  try {
    const story = await adapter.read(filePath)

    const fallback: YamlFallbackData = {
      phase: (story as any).phase ?? null,
      risk_notes: (story as any).risk_notes ?? null,
      feature: (story as any).feature ?? null,
      infrastructure: (story as any).infrastructure ?? null,
    }

    cache.set(storyId, fallback)
    return fallback
  } catch (error) {
    if (error instanceof StoryNotFoundError || error instanceof ValidationError) {
      logger.warn('Failed to read story YAML for fallback', {
        storyId,
        filePath,
        error: (error as Error).message,
      })
    } else {
      logger.warn('Unexpected error reading story YAML', {
        storyId,
        filePath,
        error: error instanceof Error ? error.message : String(error),
      })
    }
    cache.set(storyId, null)
    return null
  }
}

// ============================================================================
// Section Building
// ============================================================================

/**
 * Build a StorySection from a DB row and optional YAML fallback data.
 */
export function buildStorySection(row: StoryRow, yaml: YamlFallbackData | null): StorySection {
  const fieldSources: Record<string, 'db' | 'yaml_fallback' | 'computed' | 'missing'> = {
    state: 'db',
    title: 'db',
    goal: row.goal ? 'db' : 'missing',
    depends_on: 'db',
    phase: yaml?.phase !== undefined && yaml?.phase !== null ? 'yaml_fallback' : 'missing',
    risk_notes: yaml?.risk_notes ? 'yaml_fallback' : 'missing',
    feature: yaml?.feature ? 'yaml_fallback' : 'missing',
    infrastructure:
      yaml?.infrastructure && yaml.infrastructure.length > 0 ? 'yaml_fallback' : 'missing',
  }

  return {
    story_id: row.story_id,
    title: row.title,
    state: row.state as string,
    depends_on: row.depends_on ?? null,
    phase: yaml?.phase ?? null,
    feature: yaml?.feature ?? null,
    infrastructure: yaml?.infrastructure ?? null,
    goal: row.goal ?? null,
    risk_notes: yaml?.risk_notes ?? null,
    field_sources: fieldSources,
  }
}

// ============================================================================
// Preserved created_at extraction
// ============================================================================

/**
 * Extract created_at from existing stories.index.md frontmatter.
 * Returns null if file doesn't exist or created_at is not found.
 */
export async function extractCreatedAt(indexPath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(indexPath, 'utf8')
    const match = content.match(/^created_at:\s*"?([^"\n]+)"?/m)
    if (match) {
      return match[1].trim()
    }
    return null
  } catch {
    return null
  }
}

// ============================================================================
// Verify Mode (AC-8)
// ============================================================================

/**
 * Compare two strings line by line and return a diff summary.
 * Uses inline implementation — no external 'diff' npm package.
 */
export function compareLineByLine(
  actual: string,
  expected: string,
): { identical: boolean; diffLines: string[]; addedCount: number; removedCount: number } {
  const actualLines = actual.split('\n')
  const expectedLines = expected.split('\n')

  const diffLines: string[] = []
  let addedCount = 0
  let removedCount = 0

  const maxLen = Math.max(actualLines.length, expectedLines.length)

  for (let i = 0; i < maxLen; i++) {
    const actualLine = actualLines[i]
    const expectedLine = expectedLines[i]

    if (actualLine === undefined) {
      diffLines.push(`+ [line ${i + 1}] ${expectedLine}`)
      addedCount++
    } else if (expectedLine === undefined) {
      diffLines.push(`- [line ${i + 1}] ${actualLine}`)
      removedCount++
    } else if (actualLine !== expectedLine) {
      diffLines.push(`- [line ${i + 1}] ${actualLine}`)
      diffLines.push(`+ [line ${i + 1}] ${expectedLine}`)
      addedCount++
      removedCount++
    }
  }

  return {
    identical: diffLines.length === 0,
    diffLines,
    addedCount,
    removedCount,
  }
}

// ============================================================================
// Core Generation Pipeline
// ============================================================================

export const GenerationResultSchema = z.object({
  content: z.string(),
  sections: z.array(StorySectionSchema),
  stories: z.array(StoryRowSchema),
  report: GenerationReportSchema.omit({ output_path: true }),
})

export type GenerationResult = z.infer<typeof GenerationResultSchema>

/**
 * Run the full generation pipeline: fetch from DB, YAML fallback, render.
 */
export async function runGenerationPipeline(
  pool: Pool,
  adapter: StoryFileAdapter,
  storiesDir: string,
  createdAt: string,
): Promise<GenerationResult> {
  const startTime = Date.now()

  // Fetch all stories from DB
  const repo = createStoryRepository(pool)
  const stories = await repo.getAllStories()

  logger.info('Fetched stories from DB', { count: stories.length })

  // Build sections with YAML fallback (AC-2)
  const yamlCache = new Map<string, YamlFallbackData | null>()
  const sections: StorySection[] = []
  const skippedStories: GenerationReport['skipped_stories'] = []

  let storiesWithYamlFallback = 0
  let storiesDbOnly = 0

  for (const row of stories) {
    try {
      const yaml = await readYamlFallback(row.story_id, adapter, storiesDir, yamlCache)

      if (yaml !== null) {
        storiesWithYamlFallback++
      } else {
        storiesDbOnly++
      }

      const section = buildStorySection(row, yaml)
      sections.push(section)
    } catch (error) {
      logger.warn('Failed to build section for story', {
        storyId: row.story_id,
        error: error instanceof Error ? error.message : String(error),
      })
      skippedStories.push({
        story_id: row.story_id,
        reason: 'Failed to build section',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Compute summaries
  const progressSummary = computeProgressSummary(stories)
  const readyToStart = computeReadyToStart(stories)

  // Group by phase
  const groupedSections = groupStoriesByPhase(sections)

  // Build phase descriptions from YAML
  const phaseDescriptions = new Map<string, string>()
  // Extract phase descriptions from sections (use first story's YAML if available)
  // Default descriptions for known phases
  phaseDescriptions.set(
    '0',
    'Bootstrap phase - Manual setup of database schemas, MCP tools, and doc-sync infrastructure (untracked, prerequisite for all other phases)',
  )

  // Render components
  const updatedAt = new Date().toISOString()
  const frontmatterStr = renderFrontmatter({
    title: 'WINT Stories Index',
    story_prefix: 'WINT',
    created_at: createdAt,
    updated_at: updatedAt,
  })

  const progressTableStr = renderProgressTable(progressSummary)
  const readyToStartTableStr = renderReadyToStartTable(readyToStart, sections)
  const fullContent = renderFullIndex(
    frontmatterStr,
    progressTableStr,
    readyToStartTableStr,
    groupedSections,
    phaseDescriptions,
  )

  // Build report data
  const storyCountByPhase: Record<string, number> = {}
  for (const [phase, phaseStories] of groupedSections) {
    storyCountByPhase[phase] = phaseStories.length
  }

  const storyCountByStatus: Record<string, number> = {}
  for (const [state, count] of Object.entries(progressSummary)) {
    storyCountByStatus[state] = count
  }

  const fieldSourceBreakdown = {
    db_fields: Object.keys(FIELD_SOURCE_MAP).filter(
      k => FIELD_SOURCE_MAP[k as keyof typeof FIELD_SOURCE_MAP] === 'db',
    ),
    yaml_fallback_fields: Object.keys(FIELD_SOURCE_MAP).filter(
      k => FIELD_SOURCE_MAP[k as keyof typeof FIELD_SOURCE_MAP] === 'yaml_fallback',
    ),
    computed_fields: Object.keys(FIELD_SOURCE_MAP).filter(
      k => FIELD_SOURCE_MAP[k as keyof typeof FIELD_SOURCE_MAP] === 'computed',
    ),
    stories_with_yaml_fallback: storiesWithYamlFallback,
    stories_db_only: storiesDbOnly,
  }

  const durationMs = Date.now() - startTime

  const reportData: Omit<GenerationReport, 'output_path'> = {
    timestamp: new Date().toISOString(),
    story_count: stories.length,
    story_count_by_phase: storyCountByPhase,
    story_count_by_status: storyCountByStatus,
    field_source_breakdown: fieldSourceBreakdown,
    skipped_stories: skippedStories,
    duration_ms: durationMs,
  }

  return {
    content: fullContent,
    sections,
    stories,
    report: reportData,
  }
}

// ============================================================================
// Main Operation Modes
// ============================================================================

/**
 * --generate mode: write stories.index.md and generation-report.json (AC-1, AC-7, AC-9)
 */
export async function runGenerate(): Promise<void> {
  logger.info('Running in --generate mode')

  const pool = createDbPool()
  const adapter = new StoryFileAdapter()

  try {
    // Preserve created_at from existing file (AC-3)
    const existingCreatedAt = await extractCreatedAt(WINT_INDEX_PATH)
    const createdAt = existingCreatedAt || new Date().toISOString()

    const result = await runGenerationPipeline(pool, adapter, WINT_STORIES_DIR, createdAt)

    // Atomic write (AC design requirement)
    await writeFileAtomic(WINT_INDEX_PATH, result.content)
    logger.info('Generated stories.index.md', { path: WINT_INDEX_PATH })

    // Write generation report (AC-9)
    const report: GenerationReport = {
      ...result.report,
      output_path: WINT_INDEX_PATH,
    }

    const validatedReport = GenerationReportSchema.parse(report)
    const reportPath = path.join(process.cwd(), 'generation-report.json')
    await fs.writeFile(reportPath, JSON.stringify(validatedReport, null, 2), 'utf8')
    logger.info('Generation report written', { path: reportPath })
  } finally {
    await pool.end()
  }
}

/**
 * --dry-run mode: output generated content to stdout (AC-7)
 * Does NOT overwrite stories.index.md.
 */
export async function runDryRun(): Promise<void> {
  logger.info('Running in --dry-run mode')

  const pool = createDbPool()
  const adapter = new StoryFileAdapter()

  try {
    const existingCreatedAt = await extractCreatedAt(WINT_INDEX_PATH)
    const createdAt = existingCreatedAt || new Date().toISOString()

    const result = await runGenerationPipeline(pool, adapter, WINT_STORIES_DIR, createdAt)

    // Output to stdout (dry-run: no file write)
    process.stdout.write(result.content)
    process.stdout.write('\n')

    logger.info('Dry-run complete — no files written', {
      storyCount: result.stories.length,
    })
  } finally {
    await pool.end()
  }
}

/**
 * --verify mode: compare current file with what would be generated (AC-8)
 * Exits 0 if identical, 1 if drift detected.
 */
export async function runVerify(): Promise<void> {
  logger.info('Running in --verify mode')

  const pool = createDbPool()
  const adapter = new StoryFileAdapter()

  try {
    // Read current file on disk
    let currentContent: string
    try {
      currentContent = await fs.readFile(WINT_INDEX_PATH, 'utf8')
    } catch (error) {
      logger.error('Could not read stories.index.md for verify', {
        path: WINT_INDEX_PATH,
        error: error instanceof Error ? error.message : String(error),
      })
      process.exit(1)
      return
    }

    // Generate expected content
    const existingCreatedAt = await extractCreatedAt(WINT_INDEX_PATH)
    const createdAt = existingCreatedAt || new Date().toISOString()
    const result = await runGenerationPipeline(pool, adapter, WINT_STORIES_DIR, createdAt)

    // Line-by-line comparison (no external diff npm package — AC-8)
    const diff = compareLineByLine(currentContent, result.content)

    if (diff.identical) {
      logger.info('Verify PASSED: stories.index.md matches generated output')
      process.stdout.write('PASS: stories.index.md is up to date.\n')
      process.exit(0)
    } else {
      logger.warn('Verify FAILED: stories.index.md has drifted', {
        addedCount: diff.addedCount,
        removedCount: diff.removedCount,
      })

      process.stdout.write('FAIL: stories.index.md has drifted from generated output.\n\n')
      process.stdout.write(
        `Lines changed: ${diff.addedCount} added, ${diff.removedCount} removed\n\n`,
      )

      // Print first 50 diff lines as summary
      const preview = diff.diffLines.slice(0, 50)
      for (const line of preview) {
        process.stdout.write(`${line}\n`)
      }

      if (diff.diffLines.length > 50) {
        process.stdout.write(`\n... and ${diff.diffLines.length - 50} more differences\n`)
      }

      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const options = parseArgs()

  logger.info('Generate stories index script', { mode: options.mode })

  try {
    if (options.mode === 'generate') {
      await runGenerate()
    } else if (options.mode === 'dry-run') {
      await runDryRun()
    } else if (options.mode === 'verify') {
      await runVerify()
    }

    logger.info('Script complete', { mode: options.mode })
  } catch (error) {
    logger.error('Script failed', {
      mode: options.mode,
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

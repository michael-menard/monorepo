#!/usr/bin/env npx tsx
/**
 * Stories Index Generator Script
 *
 * Generates the `stories.index.md` file from the `wint.stories` PostgreSQL database.
 * Implements a DB-primary / YAML-fallback hybrid pipeline: core fields come from
 * the database, while supplemental fields (phase, feature, infrastructure, risk_notes)
 * fall back to the story's `.md` frontmatter when absent from the DB.
 *
 * ## CLI Usage
 *
 * ```bash
 * # Preview generated content without writing to disk
 * npx tsx generate-stories-index.ts --dry-run
 *
 * # Generate and write stories.index.md (atomically)
 * npx tsx generate-stories-index.ts --generate
 *
 * # Verify current stories.index.md matches what would be generated
 * # Exits 0 if identical, 1 if there are differences
 * npx tsx generate-stories-index.ts --verify
 * ```
 *
 * ## Required Environment Variables
 *
 * - `POSTGRES_HOST`     — DB hostname (default: localhost)
 * - `POSTGRES_PORT`     — DB port (default: 5432)
 * - `POSTGRES_DATABASE` — DB name (default: postgres)
 * - `POSTGRES_USER`     — DB user (default: postgres)
 * - `POSTGRES_PASSWORD` — DB password (default: postgres)
 *
 * ## Data Strategy
 *
 * - **DB-primary**: story_id, title, state, depends_on, goal come from `wint.stories`
 * - **YAML-fallback**: phase, feature, infrastructure, risk_notes are read from the
 *   story's `.md` frontmatter when the DB field is null/absent
 * - **Computed**: ready_to_start and progress_summary are derived from DB data
 *
 * ## Performance
 *
 * All stories are fetched in a single `SELECT * FROM wint.stories ORDER BY story_id ASC`.
 * YAML files are read on-demand and cached in memory to avoid redundant I/O.
 *
 * Story: WINT-1070
 */

import { promises as fs, existsSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
import { Pool } from 'pg'
import { logger } from '@repo/logger'
import { StoryFileAdapter } from '../adapters/story-file-adapter.js'
import { writeFileAtomic } from '../adapters/utils/file-utils.js'
import { StoryRepository } from '../db/story-repository.js'
import type { StoryRow } from '../__types__/index.js'
import {
  STATE_TO_DISPLAY_LABEL,
  FIELD_SOURCE_MAP,
  IndexFrontmatterSchema,
  StorySectionSchema,
  SkippedStorySchema,
  FieldSourceBreakdownSchema,
  GenerationReportSchema,
  type StoryStateEnum,
  type StorySection,
  type SkippedStory,
  type FieldSourceBreakdown,
  type GenerationReport,
  type IndexFrontmatter,
} from './__types__/generation.js'

// ============================================================================
// Configuration
// ============================================================================

/**
 * Find monorepo root by walking up directory tree looking for pnpm-workspace.yaml.
 */
function findMonorepoRoot(): string {
  let current = process.cwd()
  while (current !== '/') {
    if (existsSync(path.join(current, 'pnpm-workspace.yaml'))) {
      return current
    }
    current = path.dirname(current)
  }
  throw new Error('Could not find monorepo root (pnpm-workspace.yaml not found)')
}

const MONOREPO_ROOT = findMonorepoRoot()
const WINT_PLANS_DIR = path.join(MONOREPO_ROOT, 'plans/future/platform/wint')
const STORIES_INDEX_PATH = path.join(WINT_PLANS_DIR, 'stories.index.md')
const STORIES_INDEX_PREVIEW_PATH = path.join(WINT_PLANS_DIR, 'stories-index-preview.md')
const GENERATION_REPORT_PATH = path.join(WINT_PLANS_DIR, 'generation-report.json')

/**
 * Phase ranges for grouping stories by phase number extracted from story ID.
 * Phase is encoded in the story ID: WINT-{phase}{story}{variant}
 * e.g., WINT-1070 → phase 1 (first digit of 4-digit suffix)
 */
const PHASE_LABELS: Record<string, string> = {
  '0': 'Phase 0: Bootstrap',
  '1': 'Phase 1: Foundation',
  '2': 'Phase 2: Core Features',
  '3': 'Phase 3: Advanced Features',
  '4': 'Phase 4: Agents',
  '5': 'Phase 5: Monitoring',
  '6': 'Phase 6: Scaling',
  '7': 'Phase 7: Ops & Tooling',
  '8': 'Phase 8: Advanced ML',
  '9': 'Phase 9: Future',
}

// ============================================================================
// CLI Parsing
// ============================================================================

const CliOptionsSchema = z.object({
  mode: z.enum(['dry-run', 'generate', 'verify']),
})
type CliOptions = z.infer<typeof CliOptionsSchema>

/**
 * Parse CLI arguments into CliOptions.
 */
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
// Database Connection
// ============================================================================

/**
 * Create a PostgreSQL connection pool.
 */
function createDbPool(): Pool {
  return new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DATABASE || 'postgres',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
  })
}

// ============================================================================
// Pure Rendering Functions (exported for testing)
// ============================================================================

/**
 * Extract the phase digit from a story ID.
 * WINT-1070 → "1" (first digit of the 4-digit suffix)
 * WINT-0010 → "0"
 *
 * Returns null if the story ID does not match the expected pattern.
 */
export function extractPhaseFromStoryId(storyId: string): string | null {
  const match = storyId.match(/^[A-Z]+-(\d)\d{3}[A-Z]?$/)
  return match ? match[1] : null
}

/**
 * Group StorySection[] by phase (extracted from story_id).
 * Stories with unrecognized phase are grouped under "unknown".
 *
 * Returns a Map<phaseKey, StorySection[]> ordered by phase key.
 */
export function groupStoriesByPhase(sections: StorySection[]): Map<string, StorySection[]> {
  const groups = new Map<string, StorySection[]>()

  for (const section of sections) {
    const phase = extractPhaseFromStoryId(section.story_id) ?? 'unknown'
    const existing = groups.get(phase) ?? []
    existing.push(section)
    groups.set(phase, existing)
  }

  // Sort by phase key
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * Compute the progress summary: count of stories per display label.
 * Only includes states that have at least one story.
 *
 * Returns an array of [displayLabel, count] pairs ordered by count desc.
 */
export function computeProgressSummary(rows: StoryRow[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>()

  for (const row of rows) {
    const label = STATE_TO_DISPLAY_LABEL[row.state as StoryStateEnum] ?? row.state
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Determine which stories are "ready to start":
 * stories whose ALL depends_on are in 'done' or 'in_qa' (UAT) states,
 * AND whose own state is 'ready_to_work'.
 *
 * Returns story_ids that are ready to start.
 */
export function computeReadyToStart(rows: StoryRow[]): StoryRow[] {
  // DB stores underscore format (ready_to_work, in_qa, done)
  // StoryRow.state is typed with hyphenated enum but actual DB values use underscores
  const doneStates = new Set<string>(['done', 'in_qa'])
  const stateMap = new Map<string, string>()

  for (const row of rows) {
    stateMap.set(row.story_id, row.state as string)
  }

  return rows.filter(row => {
    // Cast to string for comparison since DB uses underscore format
    const rowState = row.state as string
    if (rowState !== 'ready_to_work') return false
    const deps = row.depends_on ?? []
    if (deps.length === 0) return true
    return deps.every(depId => {
      const depState = stateMap.get(depId)
      return depState !== undefined && doneStates.has(depState)
    })
  })
}

/**
 * Render a single story section as a Markdown string.
 * Missing optional fields render as "—".
 *
 * AC-6: All section headers rendered: Status, Depends On, Phase, Feature,
 * Infrastructure, Goal, Risk Notes.
 */
export function renderStorySection(section: StorySection): string {
  const dependsOn = section.depends_on.length > 0 ? section.depends_on.join(', ') : 'none'
  const phase =
    section.phase !== null && section.phase !== undefined ? String(section.phase) : '—'
  const feature = section.feature ?? '—'
  const infrastructure = section.infrastructure ?? '—'
  const goal = section.goal ?? '—'
  const riskNotes = section.risk_notes ?? '—'

  const lines: string[] = [
    `### ${section.story_id}: ${section.title}`,
    '',
    `**Status:** ${section.status}`,
    `**Depends On:** ${dependsOn}`,
    `**Phase:** ${phase}`,
    `**Feature:** ${feature}`,
    '**Infrastructure:**',
    `- ${infrastructure}`,
    '',
    `**Goal:** ${goal}`,
    '',
    `**Risk Notes:** ${riskNotes}`,
    '',
    '---',
  ]

  return lines.join('\n')
}

/**
 * Render the YAML frontmatter block for the generated stories.index.md.
 *
 * AC-3: Generated frontmatter passes z.parse(IndexFrontmatterSchema).
 * AC-10: generated_by field present; DO NOT EDIT warning follows closing ---.
 */
export function renderFrontmatter(frontmatter: IndexFrontmatter): string {
  // Validate before rendering
  IndexFrontmatterSchema.parse(frontmatter)

  return [
    '---',
    `doc_type: ${frontmatter.doc_type}`,
    `title: "${frontmatter.title}"`,
    `status: ${frontmatter.status}`,
    `story_prefix: "${frontmatter.story_prefix}"`,
    `generated_at: "${frontmatter.generated_at}"`,
    `generated_by: "${frontmatter.generated_by}"`,
    `story_count: ${frontmatter.story_count}`,
    '---',
    '<!-- DO NOT EDIT: This file is auto-generated by generate-stories-index.ts -->',
    '<!-- Run `npx tsx generate-stories-index.ts --generate` to regenerate -->',
  ].join('\n')
}

/**
 * Render the Progress Summary table as a Markdown string.
 *
 * AC-4: Table counts match DB state distribution.
 */
export function renderProgressTable(summary: Array<{ label: string; count: number }>): string {
  const rows = summary.map(({ label, count }) => `| ${label} | ${count} |`).join('\n')
  return ['## Progress Summary', '', '| Status | Count |', '|--------|-------|', rows].join('\n')
}

/**
 * Render the "Ready to Start" table as a Markdown string.
 *
 * AC-5: Only stories with all deps in done/in_qa and own state ready_to_work.
 */
export function renderReadyToStartTable(readyRows: StoryRow[]): string {
  if (readyRows.length === 0) {
    return [
      '## Ready to Start',
      '',
      'Stories with all dependencies satisfied (can be worked in parallel):',
      '',
      '_No stories are currently ready to start._',
    ].join('\n')
  }

  const tableRows = readyRows.map(row => `| ${row.story_id} | ${row.title} | — |`).join('\n')

  return [
    '## Ready to Start',
    '',
    'Stories with all dependencies satisfied (can be worked in parallel):',
    '',
    '| Story | Feature | Blocked By |',
    '|-------|---------|------------|',
    tableRows,
  ].join('\n')
}

// ============================================================================
// YAML Fallback Reading
// ============================================================================

/**
 * Read YAML fallback fields (phase, feature, infrastructure, risk_notes) from a story file.
 * Returns null for any field that cannot be read.
 *
 * Fail-soft: if the file cannot be read, returns all-null fallback.
 */
async function readYamlFallback(
  storyId: string,
  adapter: StoryFileAdapter,
  cache: Map<string, Record<string, unknown>>,
): Promise<{ phase: unknown; feature: unknown; infrastructure: unknown; risk_notes: unknown }> {
  const empty = { phase: null, feature: null, infrastructure: null, risk_notes: null }

  if (cache.has(storyId)) {
    const cached = cache.get(storyId)!
    return {
      phase: cached['phase'] ?? null,
      feature: cached['feature'] ?? null,
      infrastructure: cached['infrastructure'] ?? null,
      risk_notes: cached['risk_notes'] ?? null,
    }
  }

  // Search for story file in the wint plans directory
  const storyFilePath = findStoryFilePath(storyId)
  if (!storyFilePath) {
    logger.warn('YAML fallback: story file not found', { storyId })
    cache.set(storyId, {})
    return empty
  }

  try {
    const story = await adapter.read(storyFilePath)
    const storyData = story as Record<string, unknown>
    const data: Record<string, unknown> = {
      phase: storyData['phase'] ?? null,
      feature: storyData['feature'] ?? null,
      infrastructure: storyData['infrastructure'] ?? null,
      risk_notes: storyData['risk_notes'] ?? null,
    }
    cache.set(storyId, data)
    return {
      phase: data['phase'] ?? null,
      feature: data['feature'] ?? null,
      infrastructure: data['infrastructure'] ?? null,
      risk_notes: data['risk_notes'] ?? null,
    }
  } catch (error) {
    logger.warn('YAML fallback: failed to read story file', {
      storyId,
      storyFilePath,
      error: error instanceof Error ? error.message : String(error),
    })
    cache.set(storyId, {})
    return empty
  }
}

/**
 * Search for a story file path by story ID under the wint plans directory.
 * Looks in common locations without recursive scan for performance.
 */
function findStoryFilePath(storyId: string): string | null {
  // Common directory patterns post-WINT-1020 flatten
  const candidates = [
    path.join(WINT_PLANS_DIR, 'in-progress', storyId, `${storyId}.md`),
    path.join(WINT_PLANS_DIR, 'ready-to-work', storyId, `${storyId}.md`),
    path.join(WINT_PLANS_DIR, 'ready-for-qa', storyId, `${storyId}.md`),
    path.join(WINT_PLANS_DIR, 'UAT', storyId, `${storyId}.md`),
    path.join(WINT_PLANS_DIR, 'done', storyId, `${storyId}.md`),
    path.join(WINT_PLANS_DIR, 'backlog', storyId, `${storyId}.md`),
    path.join(WINT_PLANS_DIR, storyId, `${storyId}.md`),
    // New flat structure (post WINT-1020)
    path.join(WINT_PLANS_DIR, 'in-progress', storyId, `${storyId}.md`),
  ]

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

// ============================================================================
// Story Section Building (DB + YAML hybrid)
// ============================================================================

/**
 * Build a StorySection from a DB row with YAML fallback for supplemental fields.
 */
async function buildStorySection(
  row: StoryRow,
  adapter: StoryFileAdapter,
  yamlCache: Map<string, Record<string, unknown>>,
  skipped: SkippedStory[],
): Promise<StorySection | null> {
  try {
    const displayLabel = STATE_TO_DISPLAY_LABEL[row.state as StoryStateEnum] ?? row.state

    // Fetch YAML fallback for supplemental fields
    const yamlFallback = await readYamlFallback(row.story_id, adapter, yamlCache)

    const section = StorySectionSchema.parse({
      story_id: row.story_id,
      title: row.title,
      status: displayLabel,
      state: row.state,
      depends_on: row.depends_on ?? [],
      phase: yamlFallback.phase ?? null,
      feature: typeof yamlFallback.feature === 'string' ? yamlFallback.feature : null,
      infrastructure:
        typeof yamlFallback.infrastructure === 'string' ? yamlFallback.infrastructure : null,
      goal: row.goal ?? null,
      risk_notes: typeof yamlFallback.risk_notes === 'string' ? yamlFallback.risk_notes : null,
    })

    return section
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    logger.warn('Failed to build story section, skipping', { storyId: row.story_id, reason })
    skipped.push(
      SkippedStorySchema.parse({
        story_id: row.story_id,
        reason: 'Failed to build story section',
        error: reason,
      }),
    )
    return null
  }
}

// ============================================================================
// Index Document Generation
// ============================================================================

/**
 * Generate the full stories.index.md content as a string.
 */
async function generateIndexContent(
  rows: StoryRow[],
  adapter: StoryFileAdapter,
): Promise<{ content: string; report: GenerationReport; skipped: SkippedStory[] }> {
  const startTime = Date.now()
  const skipped: SkippedStory[] = []
  const yamlCache = new Map<string, Record<string, unknown>>()

  // Build all story sections
  const sectionResults = await Promise.all(
    rows.map(row => buildStorySection(row, adapter, yamlCache, skipped)),
  )
  const sections = sectionResults.filter((s): s is StorySection => s !== null)

  // Compute progress summary
  const progressSummary = computeProgressSummary(rows)

  // Compute ready-to-start stories
  const readyRows = computeReadyToStart(rows)

  // Group sections by phase
  const phaseGroups = groupStoriesByPhase(sections)

  // Build frontmatter
  const frontmatter: IndexFrontmatter = IndexFrontmatterSchema.parse({
    doc_type: 'stories_index',
    title: 'WINT Stories Index',
    status: 'generated',
    story_prefix: 'WINT',
    generated_at: new Date().toISOString(),
    generated_by: 'generate-stories-index.ts',
    story_count: sections.length,
  })

  // Render document parts
  const parts: string[] = []

  // Frontmatter block
  parts.push(renderFrontmatter(frontmatter))
  parts.push('')

  // Document title
  parts.push('# WINT Stories Index')
  parts.push('')
  parts.push(
    'All stories use `WINT-{phase}{story}{variant}` format ' +
      '(e.g., `WINT-1010` for Phase 1, Story 01, original).',
  )
  parts.push('')

  // Progress Summary
  parts.push(renderProgressTable(progressSummary))
  parts.push('')
  parts.push('---')
  parts.push('')

  // Ready to Start
  parts.push(renderReadyToStartTable(readyRows))
  parts.push('')
  parts.push('---')
  parts.push('')

  // Phase sections
  for (const [phaseKey, phaseSections] of phaseGroups) {
    const phaseLabel = PHASE_LABELS[phaseKey] ?? `Phase ${phaseKey}`
    const phaseDescription = getPhaseDescription(phaseKey)

    parts.push(`## ${phaseLabel}`)
    parts.push('')
    if (phaseDescription) {
      parts.push(phaseDescription)
      parts.push('')
    }

    for (const section of phaseSections) {
      parts.push(renderStorySection(section))
      parts.push('')
    }
  }

  const content = parts.join('\n')
  const durationMs = Date.now() - startTime

  // Compute field source breakdown
  const fieldSourceBreakdown = computeFieldSourceBreakdown(sections, yamlCache)

  // Compute story count by phase
  const storyCountByPhase: Record<string, number> = {}
  for (const [phase, phaseSections] of phaseGroups) {
    storyCountByPhase[phase] = phaseSections.length
  }

  // Compute story count by status
  const storyCountByStatus: Record<string, number> = {}
  for (const { label, count } of progressSummary) {
    storyCountByStatus[label] = count
  }

  const reportData = GenerationReportSchema.parse({
    timestamp: new Date().toISOString(),
    total_stories: sections.length,
    story_count_by_phase: storyCountByPhase,
    story_count_by_status: storyCountByStatus,
    field_source_breakdown: fieldSourceBreakdown,
    skipped_stories: skipped,
    duration_ms: durationMs,
    output_file: STORIES_INDEX_PATH,
    mode: 'generate',
  })

  return { content, report: reportData, skipped }
}

/**
 * Get a description for a phase key.
 */
function getPhaseDescription(phaseKey: string): string {
  const descriptions: Record<string, string> = {
    '0':
      'Bootstrap phase - Manual setup of database schemas, MCP tools, and doc-sync infrastructure' +
      ' (untracked, prerequisite for all other phases)',
    '1': 'Foundation phase - Core platform infrastructure and developer experience',
    '2': 'Core Features phase - Primary platform capabilities',
    '3': 'Advanced Features phase - Enhanced platform capabilities',
    '4': 'Agents phase - AI agent development and tooling',
    '5': 'Monitoring phase - Observability and telemetry',
    '6': 'Scaling phase - Performance and scale improvements',
    '7': 'Ops & Tooling phase - Operational tooling and automation',
    '8': 'Advanced ML phase - Machine learning integration',
    '9': 'Future phase - Exploratory and experimental features',
  }
  return descriptions[phaseKey] ?? ''
}

/**
 * Compute field source breakdown for the generation report.
 */
function computeFieldSourceBreakdown(
  sections: StorySection[],
  yamlCache: Map<string, Record<string, unknown>>,
): FieldSourceBreakdown[] {
  const yamlFields = ['phase', 'feature', 'infrastructure', 'risk_notes']
  const breakdown: FieldSourceBreakdown[] = []

  for (const [field, source] of Object.entries(FIELD_SOURCE_MAP)) {
    if (source === 'computed') {
      breakdown.push(
        FieldSourceBreakdownSchema.parse({
          field,
          source: 'computed',
          count: sections.length,
        }),
      )
      continue
    }

    if (source === 'db') {
      breakdown.push(
        FieldSourceBreakdownSchema.parse({
          field,
          source: 'db',
          count: sections.length,
        }),
      )
      continue
    }

    if (source === 'yaml_fallback' && yamlFields.includes(field)) {
      let yamlCount = 0
      for (const section of sections) {
        const cached = yamlCache.get(section.story_id)
        if (cached && cached[field] !== null && cached[field] !== undefined) {
          yamlCount++
        }
      }
      breakdown.push(
        FieldSourceBreakdownSchema.parse({
          field,
          source: 'yaml_fallback',
          count: yamlCount,
        }),
      )
    }
  }

  return breakdown
}

// ============================================================================
// Verify Mode: Inline Line-by-Line Diff
// ============================================================================

/**
 * Compare two strings line-by-line and return a diff summary.
 * Returns null if the strings are identical.
 *
 * AC-8: No diff package dependency — uses inline comparison.
 */
export function computeLineDiff(
  expected: string,
  actual: string,
): { identical: boolean; diffLines: Array<{ lineNum: number; expected: string; actual: string }> } {
  const expectedLines = expected.split('\n')
  const actualLines = actual.split('\n')
  const maxLen = Math.max(expectedLines.length, actualLines.length)
  const diffLines: Array<{ lineNum: number; expected: string; actual: string }> = []

  for (let i = 0; i < maxLen; i++) {
    const exp = expectedLines[i] ?? '<missing>'
    const act = actualLines[i] ?? '<missing>'
    if (exp !== act) {
      diffLines.push({ lineNum: i + 1, expected: exp, actual: act })
    }
  }

  return { identical: diffLines.length === 0, diffLines }
}

/**
 * Format a diff summary for display.
 */
export function formatDiffSummary(
  diffLines: Array<{ lineNum: number; expected: string; actual: string }>,
): string {
  if (diffLines.length === 0) return 'No differences found.'
  const preview = diffLines.slice(0, 10)
  const lines = preview.map(
    d =>
      `  Line ${d.lineNum}:\n` +
        `    expected: ${d.expected.substring(0, 120)}\n` +
        `    actual:   ${d.actual.substring(0, 120)}`,
  )
  const suffix =
    diffLines.length > 10 ? `\n  ... and ${diffLines.length - 10} more differences` : ''
  return lines.join('\n') + suffix
}

// ============================================================================
// Mode Handlers
// ============================================================================

/**
 * Run --dry-run mode: generate index content and write to preview file (not stories.index.md).
 */
async function runDryRun(repo: StoryRepository, adapter: StoryFileAdapter): Promise<void> {
  logger.info('Running in dry-run mode')

  const rows = await repo.getAllStories()
  logger.info('Fetched stories from DB', { count: rows.length })

  const { content, skipped } = await generateIndexContent(rows, adapter)

  // Write preview file instead of overwriting stories.index.md
  await writeFileAtomic(STORIES_INDEX_PREVIEW_PATH, content)

  logger.info('Dry-run complete', {
    storiesProcessed: rows.length,
    skipped: skipped.length,
    previewFile: STORIES_INDEX_PREVIEW_PATH,
  })

  // Also output to stdout for CI/verification pipelines
  logger.info('Generated content preview (first 2000 chars)', {
    preview: content.substring(0, 2000),
  })
}

/**
 * Run --generate mode: generate index content and atomically write to stories.index.md.
 * Also writes generation-report.json.
 */
async function runGenerate(repo: StoryRepository, adapter: StoryFileAdapter): Promise<void> {
  logger.info('Running in generate mode')

  const rows = await repo.getAllStories()
  logger.info('Fetched stories from DB', { count: rows.length })

  const { content, report, skipped } = await generateIndexContent(rows, adapter)

  // Atomic write to stories.index.md
  await writeFileAtomic(STORIES_INDEX_PATH, content)
  logger.info('Wrote stories.index.md', { path: STORIES_INDEX_PATH })

  // Write generation report
  await writeFileAtomic(GENERATION_REPORT_PATH, JSON.stringify(report, null, 2))
  logger.info('Wrote generation-report.json', { path: GENERATION_REPORT_PATH })

  logger.info('Generation complete', {
    storiesProcessed: rows.length,
    skipped: skipped.length,
    durationMs: report.duration_ms,
  })
}

/**
 * Run --verify mode: compare current stories.index.md to freshly generated content.
 * Exits 0 if identical, 1 if different.
 *
 * AC-8: Uses inline line-by-line comparison, no external diff package.
 */
async function runVerify(repo: StoryRepository, adapter: StoryFileAdapter): Promise<void> {
  logger.info('Running in verify mode')

  // Read current stories.index.md
  let currentContent: string
  try {
    currentContent = await fs.readFile(STORIES_INDEX_PATH, 'utf-8')
  } catch {
    logger.error('stories.index.md not found — run --generate first', {
      path: STORIES_INDEX_PATH,
    })
    process.exit(1)
  }

  const rows = await repo.getAllStories()
  const { content: freshContent } = await generateIndexContent(rows, adapter)

  const { identical, diffLines } = computeLineDiff(freshContent, currentContent)

  if (identical) {
    logger.info('Verification PASSED: stories.index.md is up to date')
    process.exit(0)
  } else {
    logger.error('Verification FAILED: stories.index.md is out of date', {
      differences: diffLines.length,
      diffSummary: formatDiffSummary(diffLines),
    })
    process.exit(1)
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs()
  logger.info('Stories index generator', { mode: options.mode })

  const pool = createDbPool()
  const repo = new StoryRepository(pool)
  const adapter = new StoryFileAdapter()

  try {
    if (options.mode === 'dry-run') {
      await runDryRun(repo, adapter)
    } else if (options.mode === 'generate') {
      await runGenerate(repo, adapter)
    } else if (options.mode === 'verify') {
      await runVerify(repo, adapter)
    }

    logger.info('Script complete', { mode: options.mode })
  } catch (error) {
    logger.error('Script failed', {
      mode: options.mode,
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}

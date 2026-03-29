/**
 * Infer Capabilities from Story History
 *
 * Scans existing story YAML files under plans/future/platform/, applies keyword-to-lifecycle-stage
 * heuristics, and populates graph.capabilities with feature-linked CRUD capability rows.
 *
 * Story: WINT-4040
 *
 * @example Run from monorepo root
 * ```bash
 * pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts --dry-run
 * pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts --validate
 * ```
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  LifecycleStage,
  InferredCapability,
  StoryEntry,
  CapabilityInferenceResult,
  InferCapabilitiesOptions,
  InsertFn,
  FeatureRow,
  DbFeatureQueryFn,
} from './__types__/index.js'
import {
  CapabilityInferenceResultSchema,
  InferCapabilitiesOptionsSchema,
  FeatureRowSchema,
} from './__types__/index.js'

// Resolve from monorepo root (packages/backend/mcp-tools/src/scripts -> ../../../../..)
const MONOREPO_ROOT = resolve(import.meta.dirname ?? __dirname, '../../../../../')

// ============================================================================
// Keyword Map (AC-3)
// ============================================================================

/**
 * Maps CRUD lifecycle keywords to lifecycle stages.
 * Keys are lowercase keyword strings; values are LifecycleStage literals.
 * Zod-validated as a Record for extensibility.
 */
const KeywordMapSchema = z.record(z.enum(['create', 'read', 'update', 'delete']))

const KEYWORD_MAP: z.infer<typeof KeywordMapSchema> = KeywordMapSchema.parse({
  // create
  create: 'create',
  add: 'create',
  new: 'create',
  upload: 'create',
  insert: 'create',
  post: 'create',
  generate: 'create',
  build: 'create',
  register: 'create',
  // read
  view: 'read',
  read: 'read',
  get: 'read',
  list: 'read',
  query: 'read',
  download: 'read',
  fetch: 'read',
  search: 'read',
  display: 'read',
  show: 'read',
  browse: 'read',
  find: 'read',
  // update
  edit: 'update',
  update: 'update',
  modify: 'update',
  replace: 'update',
  change: 'update',
  patch: 'update',
  // delete
  delete: 'delete',
  remove: 'delete',
  archive: 'delete',
  purge: 'delete',
  clear: 'delete',
})

// ============================================================================
// Keyword mapping function (AC-3)
// ============================================================================

/**
 * Maps keywords in text to lifecycle stages.
 * Case-insensitive. Returns deduplicated Set of matched stages.
 *
 * @param text - Story title, feature description, or AC text to scan
 * @returns Set of matched lifecycle stages
 */
export function mapKeywordsToStages(text: string): Set<LifecycleStage> {
  const stages = new Set<LifecycleStage>()
  if (!text) return stages

  const words = text.toLowerCase().split(/\W+/).filter(Boolean)
  for (const word of words) {
    const stage = KEYWORD_MAP[word]
    if (stage !== undefined) {
      stages.add(stage)
    }
  }
  return stages
}

// ============================================================================
// Story file discovery helpers (AC-2)
// ============================================================================

/**
 * Recursively find story files (story.yaml or {STORY_ID}.md with frontmatter).
 * Returns absolute file paths.
 */
export function findStoryFiles(dir: string): string[] {
  const results: string[] = []

  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return results
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    let stat
    try {
      stat = statSync(fullPath)
    } catch {
      continue
    }

    if (stat.isDirectory()) {
      // Recurse into subdirectory
      results.push(...findStoryFiles(fullPath))
    } else if (entry === 'story.yaml' || /^[A-Z]+-\d+\.md$/.test(entry)) {
      results.push(fullPath)
    }
  }

  return results
}

/**
 * Extract epic prefix from a story ID.
 * e.g. "WINT-4040" -> "WINT", "WISH-001" -> "WISH"
 */
export function extractEpic(storyId: string): string {
  const match = storyId.match(/^([A-Z]+)-\d+$/)
  return match ? match[1]! : ''
}

/**
 * Extract story ID from file path.
 * Tries the filename first (for .md files), then reads YAML frontmatter.
 */
export function extractStoryIdFromPath(filePath: string): string {
  // For .md files: filename is the story ID
  const mdMatch = filePath.match(/\/([A-Z]+-\d+)\.md$/)
  if (mdMatch) return mdMatch[1]!

  // For story.yaml: parent directory name is usually the story ID
  const dirMatch = filePath.match(/\/([A-Z]+-\d+)\/story\.yaml$/)
  if (dirMatch) return dirMatch[1]!

  return ''
}

/**
 * Read and parse a story file to extract relevant text for keyword analysis.
 * Returns null if the file cannot be read or has no usable content.
 */
export function readStoryFile(filePath: string): { storyId: string; text: string } | null {
  let raw: string
  try {
    raw = readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }

  const storyId = extractStoryIdFromPath(filePath)
  if (!storyId) return null

  // Collect all text for keyword analysis (title, ac_text, description, feature fields)
  const textParts: string[] = [raw]
  return { storyId, text: textParts.join(' ') }
}

// ============================================================================
// Story scanner (AC-2)
// ============================================================================

/**
 * Scan plans/ for story files and extract StoryEntry objects.
 * Handles missing files gracefully (returns empty array).
 *
 * @param rootDir - Root directory to scan (defaults to monorepo plans/future/platform/)
 * @returns Array of story entries with extracted fields
 */
export function scanStories(rootDir?: string): StoryEntry[] {
  const plansRoot = rootDir ?? resolve(MONOREPO_ROOT, 'plans/future/platform')

  const files = findStoryFiles(plansRoot)
  const entries: StoryEntry[] = []

  for (const filePath of files) {
    const parsed = readStoryFile(filePath)
    if (!parsed) continue

    const { storyId, text } = parsed
    const epic = extractEpic(storyId)
    if (!epic) continue

    // Extract title from YAML frontmatter if available
    const titleMatch = text.match(/^title:\s*["']?(.+?)["']?\s*$/m)
    const title = titleMatch ? titleMatch[1]!.trim() : storyId

    entries.push({
      storyId,
      epic,
      title,
      text,
    })
  }

  return entries
}

// ============================================================================
// Feature resolver (AC-4, AC-9)
// ============================================================================

/**
 * Default DB feature query function.
 * Queries graph.features table via Drizzle ORM.
 */
export async function defaultDbFeatureQueryFn(): Promise<FeatureRow[]> {
  // Dynamic import to avoid circular dependencies at module load time
  const { db } = await import('@repo/db')
  const { features } = await import('@repo/database-schema')

  const rows = await db
    .select({ id: features.id, featureName: features.featureName })
    .from(features)

  return rows.map(row => FeatureRowSchema.parse({ id: row.id, featureName: row.featureName }))
}

/**
 * Resolve a feature UUID from an epic prefix.
 * Looks up graph.features by featureName (case-insensitive partial match on prefix).
 * Returns null if no match found.
 *
 * @param epicPrefix - e.g. "WINT", "WISH"
 * @param featureRows - Array of feature rows from graph.features
 * @returns Feature UUID or null
 */
export function resolveFeatureId(epicPrefix: string, featureRows: FeatureRow[]): string | null {
  const prefix = epicPrefix.toLowerCase()

  // Exact match preferred (featureName equals prefix exactly)
  const exactMatch = featureRows.find(r => r.featureName.toLowerCase() === prefix)
  if (exactMatch) return exactMatch.id

  // Partial match: featureName starts with or contains the prefix
  const partialMatch = featureRows.find(r => r.featureName.toLowerCase().includes(prefix))
  if (partialMatch) return partialMatch.id

  return null
}

// ============================================================================
// Default insert function (AC-5, AC-6, AC-7)
// ============================================================================

/**
 * Default insert function that writes to graph.capabilities via Drizzle ORM.
 * Uses .onConflictDoNothing() for AC-6 deduplication semantics.
 * Dry-run: logs rows without writing to DB (AC-7).
 *
 * @param rows - Capability rows to insert
 * @param dryRun - If true, log only; do not write to DB
 */
export async function defaultInsertFn(rows: InferredCapability[], dryRun: boolean): Promise<void> {
  if (rows.length === 0) return

  if (dryRun) {
    logger.info('[infer-capabilities] DRY RUN — would insert capabilities', {
      count: rows.length,
      rows: rows.map(r => ({
        capabilityName: r.capabilityName,
        lifecycleStage: r.lifecycleStage,
        featureId: r.featureId,
        wouldInsert: true,
      })),
    })
    return
  }

  // Dynamic import to avoid circular dependencies at module load time
  const { db } = await import('@repo/db')
  const { capabilities } = await import('@repo/database-schema')

  await db
    .insert(capabilities)
    .values(
      rows.map(r => ({
        capabilityName: r.capabilityName,
        capabilityType: r.capabilityType,
        maturityLevel: r.maturityLevel,
        lifecycleStage: r.lifecycleStage,
        featureId: r.featureId,
      })),
    )
    .onConflictDoNothing()
}

// ============================================================================
// Main orchestrator (AC-5, AC-6, AC-7, AC-8, AC-9)
// ============================================================================

/**
 * Infer capabilities from story history and populate graph.capabilities.
 *
 * Orchestration:
 * 1. Load feature rows from graph.features (AC-9: early exit if empty)
 * 2. Scan story files from plans/ (AC-2)
 * 3. Map story text to lifecycle stages (AC-3)
 * 4. Resolve feature UUIDs from epic prefixes (AC-4)
 * 5. Deduplicate in-memory (AC-6)
 * 6. Insert via injectable insertFn (AC-5, AC-7, AC-10)
 * 7. Emit summary result (AC-8)
 *
 * @param options - Inference options (dryRun, validate, rootDir)
 * @param insertFn - Injectable insert function (defaults to defaultInsertFn)
 * @param dbFn - Injectable DB feature query function (defaults to defaultDbFeatureQueryFn)
 * @returns Summary result { attempted, succeeded, failed, skipped }
 */
export async function inferCapabilities(
  options: InferCapabilitiesOptions = {},
  insertFn: InsertFn = defaultInsertFn,
  dbFn: DbFeatureQueryFn = defaultDbFeatureQueryFn,
): Promise<CapabilityInferenceResult> {
  const parsedOpts = InferCapabilitiesOptionsSchema.parse(options)
  const opts = {
    dryRun: parsedOpts.dryRun ?? false,
    validate: parsedOpts.validate ?? false,
    rootDir: parsedOpts.rootDir,
  }

  const result: CapabilityInferenceResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  }

  // Step 1: Load features (AC-9: early exit if zero features)
  let featureRows: FeatureRow[]
  try {
    featureRows = await dbFn()
  } catch (err) {
    logger.error('[infer-capabilities] Failed to query graph.features', {
      error: err instanceof Error ? err.message : String(err),
    })
    result.failed++
    return CapabilityInferenceResultSchema.parse(result)
  }

  if (featureRows.length === 0) {
    logger.warn('[infer-capabilities] No features found — run WINT-4030 script first')
    return CapabilityInferenceResultSchema.parse(result)
  }

  logger.info('[infer-capabilities] Features loaded', { count: featureRows.length })

  // Step 2: Scan story files (AC-2)
  const stories = scanStories(opts.rootDir)
  logger.info('[infer-capabilities] Stories scanned', { count: stories.length })

  if (stories.length === 0) {
    logger.warn('[infer-capabilities] No story files found in plans/future/platform/')
    return CapabilityInferenceResultSchema.parse(result)
  }

  // Step 3-5: Map keywords, resolve features, deduplicate in-memory (AC-3, AC-4, AC-6)
  // Use capabilityName as deduplication key within this run
  const capabilityMap = new Map<string, InferredCapability>()

  // Group stories by epic prefix and resolve feature IDs in parallel (Promise.allSettled pattern)
  const epicPrefixes = [...new Set(stories.map(s => s.epic))]

  const epicToFeatureId = new Map<string, string | null>()
  for (const epic of epicPrefixes) {
    const featureId = resolveFeatureId(epic, featureRows)
    if (featureId === null) {
      logger.warn('[infer-capabilities] Feature not found for prefix — skipping', { epic })
    }
    epicToFeatureId.set(epic, featureId)
  }

  // Process each story
  for (const story of stories) {
    const featureId = epicToFeatureId.get(story.epic)
    if (!featureId) {
      // Epic not found in features — skipped (EC-4)
      continue
    }

    const stages = mapKeywordsToStages(story.text)
    if (stages.size === 0) {
      // No keywords found in this story (EC-3)
      continue
    }

    // Find featureName for this featureId to build capability name
    const featureRow = featureRows.find(r => r.id === featureId)
    const featureName = featureRow?.featureName ?? story.epic.toLowerCase()

    for (const stage of stages) {
      const capabilityName = `${featureName}-${stage}-inferred`

      if (capabilityMap.has(capabilityName)) {
        // Already seen in this run — deduplicate in-memory (AC-6)
        result.skipped++
        continue
      }

      const capability: InferredCapability = {
        capabilityName,
        capabilityType: 'business',
        maturityLevel: 'beta',
        lifecycleStage: stage,
        featureId,
      }

      capabilityMap.set(capabilityName, capability)
    }
  }

  // Step 6: Insert (AC-5, AC-7)
  const capabilitiesToInsert = [...capabilityMap.values()]
  result.attempted = capabilitiesToInsert.length

  logger.info('[infer-capabilities] Capabilities to insert', {
    count: capabilitiesToInsert.length,
    dryRun: opts.dryRun,
  })

  if (capabilitiesToInsert.length > 0) {
    try {
      await insertFn(capabilitiesToInsert, opts.dryRun ?? false)
      result.succeeded = capabilitiesToInsert.length
      logger.info('[infer-capabilities] Insert complete', {
        succeeded: result.succeeded,
        dryRun: opts.dryRun,
      })
    } catch (err) {
      logger.error('[infer-capabilities] Insert failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      result.failed = capabilitiesToInsert.length
    }
  }

  // Step 7: --validate flag: call coverage tool per feature (AC-11)
  if (opts.validate && !opts.dryRun) {
    await printValidationReport(featureRows)
  }

  return CapabilityInferenceResultSchema.parse(result)
}

// ============================================================================
// Validation report (AC-11)
// ============================================================================

/**
 * Print capability coverage report per feature using graph_get_capability_coverage.
 * Called when --validate flag is set after successful insertion.
 */
async function printValidationReport(featureRows: FeatureRow[]): Promise<void> {
  logger.info('[infer-capabilities] Running validation coverage report...')

  // Dynamic import to avoid circular dependency at module load time
  const { graph_get_capability_coverage } =
    await import('../graph-query/graph-get-capability-coverage.js')

  const CRUD_STAGES: LifecycleStage[] = ['create', 'read', 'update', 'delete']

  const rows: Array<{
    feature: string
    create: number
    read: number
    update: number
    delete: number
    total: number
    missing: string[]
  }> = []

  for (const featureRow of featureRows) {
    const coverage = await graph_get_capability_coverage({
      featureId: featureRow.featureName,
    }).catch(() => null)

    if (!coverage) {
      rows.push({
        feature: featureRow.featureName,
        create: 0,
        read: 0,
        update: 0,
        delete: 0,
        total: 0,
        missing: CRUD_STAGES,
      })
      continue
    }

    const caps = coverage.capabilities ?? {}
    const create = (caps as Record<string, number>)['create'] ?? 0
    const read = (caps as Record<string, number>)['read'] ?? 0
    const update = (caps as Record<string, number>)['update'] ?? 0
    const del = (caps as Record<string, number>)['delete'] ?? 0
    const total = coverage.totalCount ?? 0

    const missing: LifecycleStage[] = []
    if (create === 0) missing.push('create')
    if (read === 0) missing.push('read')
    if (update === 0) missing.push('update')
    if (del === 0) missing.push('delete')

    rows.push({
      feature: featureRow.featureName,
      create,
      read,
      update,
      delete: del,
      total,
      missing,
    })
  }

  // Print table
  logger.info('[infer-capabilities] CRUD coverage report', { features: rows.length })
  for (const row of rows) {
    const status =
      row.missing.length === 0 ? 'COMPLETE' : `INCOMPLETE (missing: ${row.missing.join(', ')})`
    logger.info(
      `  ${row.feature}: create=${row.create} read=${row.read} update=${row.update} delete=${row.delete} total=${row.total} [${status}]`,
    )
  }
}

// ============================================================================
// Script entry point (AC-1)
// ============================================================================

const isMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.endsWith('infer-capabilities.ts') ||
    process.argv[1]?.endsWith('infer-capabilities.js'))

if (isMain) {
  const args = process.argv.slice(2)

  if (args.includes('--help')) {
    logger.info(
      'infer-capabilities.ts — Infer capabilities from story history (WINT-4040)\n' +
        '\n' +
        'Usage:\n' +
        '  pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts [options]\n' +
        '\n' +
        'Options:\n' +
        '  --dry-run    Log would-be inserts without writing to DB\n' +
        '  --validate   Print capability coverage report per feature after insertion\n' +
        '  --help       Show this help message\n' +
        '\n' +
        'Requires: DATABASE_URL env var pointing at lego_dev (port 5432)',
    )
    process.exit(0)
  }

  const dryRun = args.includes('--dry-run')
  const validate = args.includes('--validate')

  inferCapabilities({ dryRun, validate })
    .then(summary => {
      logger.info('[infer-capabilities] Done', summary)
      process.exit(summary.failed > 0 ? 1 : 0)
    })
    .catch(err => {
      logger.error('[infer-capabilities] Fatal error', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    })
}

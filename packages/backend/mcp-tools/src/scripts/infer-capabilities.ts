/**
 * Infer Existing Capabilities from Story History
 * WINT-4040: Scans story YAML files and populates graph.capabilities
 *
 * Reads story YAML files from plans/future/platform/*\/,
 * applies keyword heuristics to infer CRUD lifecycle stages,
 * looks up feature UUIDs from graph.features by epic prefix,
 * and inserts rows into graph.capabilities via Drizzle ORM.
 *
 * @example Run from monorepo root
 * ```bash
 * pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts --dry-run
 * pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts --validate
 * ```
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { logger } from '@repo/logger'
import type {
  LifecycleStage,
  InferredCapability,
  StoryEntry,
  CapabilityInferenceResult,
  InsertFn,
  DbFeatureQueryFn,
  FeatureRow,
} from './__types__/index.js'
import {
  InferCapabilitiesOptionsSchema,
  CapabilityInferenceResultSchema,
  InferredCapabilitySchema,
} from './__types__/index.js'

// Resolve from monorepo root
const MONOREPO_ROOT = resolve(import.meta.dirname ?? __dirname, '../../../../../')

// ============================================================================
// ST-2: Keyword-to-lifecycle-stage mapping
// ============================================================================

/**
 * Keyword → lifecycle stage mapping (CRUD).
 * Keys are lowercase keywords; values are CRUD stages.
 * AC-3 requirement.
 */
const KEYWORD_MAP: Record<string, LifecycleStage> = {
  // create
  create: 'create',
  add: 'create',
  new: 'create',
  upload: 'create',
  insert: 'create',
  submit: 'create',
  post: 'create',
  generate: 'create',
  publish: 'create',
  register: 'create',
  // read
  read: 'read',
  view: 'read',
  get: 'read',
  list: 'read',
  query: 'read',
  download: 'read',
  fetch: 'read',
  search: 'read',
  browse: 'read',
  show: 'read',
  display: 'read',
  // update
  update: 'update',
  edit: 'update',
  modify: 'update',
  replace: 'update',
  change: 'update',
  patch: 'update',
  rename: 'update',
  move: 'update',
  // delete
  delete: 'delete',
  remove: 'delete',
  archive: 'delete',
  purge: 'delete',
  destroy: 'delete',
  revoke: 'delete',
}

/**
 * Maps keywords found in text to CRUD lifecycle stages.
 * Case-insensitive. Returns a Set for automatic deduplication.
 *
 * @param text - Combined text from story title, description, and AC text
 * @returns Set of matched lifecycle stages
 */
export function mapKeywordsToStages(text: string): Set<LifecycleStage> {
  const stages = new Set<LifecycleStage>()
  const lower = text.toLowerCase()

  // Split on word boundaries: spaces, punctuation, newlines
  const words = lower.split(/[\s,.:;!?()\[\]{}"'`\-_/\\|@#$%^&*+=~<>]+/)

  for (const word of words) {
    const trimmed = word.trim()
    if (trimmed && trimmed in KEYWORD_MAP) {
      const stage = KEYWORD_MAP[trimmed]
      if (stage !== undefined) {
        stages.add(stage)
      }
    }
  }

  return stages
}

// ============================================================================
// ST-3: Story scanner
// ============================================================================

/**
 * Recursively find all story.yaml and {STORY_ID}.md files under a directory.
 */
function findStoryFiles(dir: string, results: string[] = []): string[] {
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          findStoryFiles(fullPath, results)
        } else if (stat.isFile()) {
          // Match story.yaml files and {STORY_ID}.md files (e.g. WINT-4040.md)
          if (entry === 'story.yaml' || /^[A-Z]+-\d+\.md$/.test(entry)) {
            results.push(fullPath)
          }
        }
      } catch {
        // Ignore stat errors (broken symlinks, permission issues)
      }
    }
  } catch {
    // Ignore readdir errors
  }
  return results
}

/**
 * Extract epic prefix from story ID (e.g., 'WINT' from 'WINT-4040').
 */
function extractEpic(storyId: string): string {
  const match = storyId.match(/^([A-Z]+)-/)
  return match ? (match[1] ?? storyId) : storyId
}

/**
 * Extract story ID from file path.
 * For story.yaml: uses parent directory name if it looks like a story ID.
 * For {STORY_ID}.md: uses filename without extension.
 */
function extractStoryIdFromPath(filePath: string): string | null {
  const parts = filePath.split('/')
  const filename = parts[parts.length - 1] ?? ''

  // {STORY_ID}.md pattern
  if (filename !== 'story.yaml') {
    const match = filename.match(/^([A-Z]+-\d+)\.md$/)
    return match ? (match[1] ?? null) : null
  }

  // story.yaml: use parent directory name
  const parentDir = parts[parts.length - 2] ?? ''
  if (/^[A-Z]+-\d+$/.test(parentDir)) {
    return parentDir
  }

  return null
}

/**
 * Read and extract text from a story file.
 * Returns null if the file cannot be read.
 */
function readStoryFile(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch {
    return null
  }
}

/**
 * Scan plans/future/platform/*\/ for story YAML and MD files.
 * Extracts storyId, epic, title, and text (title + AC text) for keyword analysis.
 *
 * @param rootDir - Monorepo root directory (defaults to auto-resolved)
 * @returns Array of StoryEntry objects
 */
export function scanStories(rootDir: string = MONOREPO_ROOT): StoryEntry[] {
  const plansDir = join(rootDir, 'plans', 'future', 'platform')
  const storyFiles = findStoryFiles(plansDir)

  logger.info('[infer-capabilities] Scanning story files', {
    plansDir,
    fileCount: storyFiles.length,
  })

  const entries: StoryEntry[] = []
  const seenIds = new Set<string>()

  for (const filePath of storyFiles) {
    const storyId = extractStoryIdFromPath(filePath)
    if (!storyId) continue

    // Deduplicate by story ID (prefer first found)
    if (seenIds.has(storyId)) continue
    seenIds.add(storyId)

    const content = readStoryFile(filePath)
    if (!content) {
      logger.warn('[infer-capabilities] Could not read story file', { filePath })
      continue
    }

    const epic = extractEpic(storyId)

    // Extract title from YAML (title: "...") or first markdown heading
    let title = ''
    const yamlTitleMatch = content.match(/^title:\s*["']?(.+?)["']?\s*$/m)
    if (yamlTitleMatch) {
      title = yamlTitleMatch[1]?.trim() ?? ''
    } else {
      const mdHeadingMatch = content.match(/^#\s+(.+)$/m)
      if (mdHeadingMatch) {
        title = mdHeadingMatch[1]?.trim() ?? ''
      }
    }

    // Combine all text for keyword analysis: title + full content
    const text = [title, content].filter(Boolean).join(' ')

    entries.push({ storyId, epic, title, text })
  }

  logger.info('[infer-capabilities] Story scan complete', { entriesFound: entries.length })
  return entries
}

// ============================================================================
// ST-4: Feature resolver
// ============================================================================

/**
 * Default DB query function for features table.
 * Uses dynamic import to avoid DB connection at module load time.
 * Injectable for testability (AC-4).
 */
async function defaultDbFeatureQueryFn(): Promise<FeatureRow[]> {
  const { db } = await import('@repo/db')
  const { features } = await import('@repo/database-schema')
  const rows = await db.select({ id: features.id, featureName: features.featureName }).from(features)
  return rows.map(r => ({ id: r.id, featureName: r.featureName }))
}

/**
 * Resolve a feature UUID from graph.features by epic prefix.
 * Looks for a feature whose featureName contains the epic prefix (case-insensitive).
 *
 * @param epicPrefix - Story epic prefix (e.g., 'WINT', 'WISH')
 * @param allFeatures - All feature rows from DB (injectable for testability)
 * @returns Feature UUID or null if not found
 */
export function resolveFeatureId(
  epicPrefix: string,
  allFeatures: FeatureRow[],
): string | null {
  const lower = epicPrefix.toLowerCase()

  // Try exact match first (feature name equals epic prefix)
  const exactMatch = allFeatures.find(f => f.featureName.toLowerCase() === lower)
  if (exactMatch) return exactMatch.id

  // Try partial match (feature name contains epic prefix)
  const partialMatch = allFeatures.find(f => f.featureName.toLowerCase().includes(lower))
  if (partialMatch) return partialMatch.id

  return null
}

// ============================================================================
// ST-5: Default insert function (Drizzle with onConflictDoNothing)
// ============================================================================

/**
 * Default insert function using Drizzle ORM.
 * Uses .onConflictDoNothing() for AC-6 deduplication.
 * In dry-run mode, logs without writing to DB.
 * Uses dynamic import to avoid DB connection at module load time.
 */
export async function defaultInsertFn(rows: InferredCapability[], dryRun: boolean): Promise<void> {
  if (dryRun) {
    logger.info('[infer-capabilities] [dry-run] Would insert capabilities', {
      count: rows.length,
      rows,
    })
    return
  }

  if (rows.length === 0) return

  const { db } = await import('@repo/db')
  const { capabilities } = await import('@repo/database-schema')

  await db
    .insert(capabilities)
    .values(
      rows.map(row => ({
        capabilityName: row.capabilityName,
        capabilityType: row.capabilityType,
        lifecycleStage: row.lifecycleStage,
        maturityLevel: row.maturityLevel,
        featureId: row.featureId,
      })),
    )
    .onConflictDoNothing()
}

// ============================================================================
// ST-5: Main orchestrator
// ============================================================================

/**
 * Main capability inference orchestrator.
 *
 * Orchestrates:
 * 1. scanStories() — find and parse story files
 * 2. mapKeywordsToStages() — extract CRUD stages from text
 * 3. resolveFeatureId() — look up feature UUID by epic prefix
 * 4. insertFn — insert inferred capabilities with dedup
 *
 * @param opts - Options including dryRun, validate, rootDir, insertFn, dbFn
 * @returns PopulateResultSchema-compatible summary
 */
export async function inferCapabilities(opts: {
  dryRun?: boolean
  validate?: boolean
  rootDir?: string
  insertFn?: InsertFn
  dbFn?: DbFeatureQueryFn
}): Promise<CapabilityInferenceResult> {
  const { dryRun = false, validate = false, rootDir = MONOREPO_ROOT } = opts
  const insertFn = opts.insertFn ?? defaultInsertFn
  const dbFn = opts.dbFn ?? defaultDbFeatureQueryFn

  const result: CapabilityInferenceResult = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0,
  }

  // AC-9: If graph.features has zero rows, exit early
  let allFeatures: FeatureRow[]
  try {
    allFeatures = await dbFn()
  } catch (error) {
    logger.error('[infer-capabilities] Failed to query graph.features', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }

  if (allFeatures.length === 0) {
    logger.warn('[infer-capabilities] No features found — run WINT-4030 script first')
    return result
  }

  logger.info('[infer-capabilities] Features loaded', { count: allFeatures.length })

  // Scan story files
  const stories = scanStories(rootDir)

  // Build inferred capabilities — deduplicate by capabilityName
  const capabilityMap = new Map<string, InferredCapability>()

  for (const story of stories) {
    const featureId = resolveFeatureId(story.epic, allFeatures)
    if (!featureId) {
      logger.warn('[infer-capabilities] No feature found for epic', {
        storyId: story.storyId,
        epic: story.epic,
      })
      continue
    }

    // Find the feature name for building capability name
    const featureRow = allFeatures.find(f => f.id === featureId)
    const featureName = featureRow?.featureName ?? story.epic.toLowerCase()

    const stages = mapKeywordsToStages(story.text)

    for (const stage of stages) {
      const capabilityName = `${featureName}-${stage}-inferred`

      // Skip duplicates (first one wins)
      if (capabilityMap.has(capabilityName)) {
        result.skipped++
        continue
      }

      const capability: InferredCapability = {
        capabilityName,
        capabilityType: 'business',
        lifecycleStage: stage,
        maturityLevel: 'beta',
        featureId,
      }

      // Validate with Zod before accepting
      const parsed = InferredCapabilitySchema.safeParse(capability)
      if (!parsed.success) {
        logger.warn('[infer-capabilities] Invalid capability shape, skipping', {
          capabilityName,
          error: parsed.error.message,
        })
        result.skipped++
        continue
      }

      capabilityMap.set(capabilityName, parsed.data)
    }
  }

  const toInsert = Array.from(capabilityMap.values())
  result.attempted = toInsert.length

  if (toInsert.length === 0) {
    logger.info('[infer-capabilities] No capabilities to insert')
    return CapabilityInferenceResultSchema.parse(result)
  }

  // Insert in batches of 50
  const BATCH_SIZE = 50
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE)
    try {
      await insertFn(batch, dryRun)
      result.succeeded += batch.length
      logger.info('[infer-capabilities] Batch inserted', {
        batchStart: i,
        batchSize: batch.length,
        dryRun,
      })
    } catch (error) {
      result.failed += batch.length
      logger.error('[infer-capabilities] Batch insert failed', {
        batchStart: i,
        batchSize: batch.length,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  logger.info('[infer-capabilities] Run complete', result)

  // AC-11: --validate flag triggers coverage report
  if (validate && !dryRun) {
    await printValidationReport(allFeatures)
  }

  return CapabilityInferenceResultSchema.parse(result)
}

// ============================================================================
// ST-6: Validation report
// ============================================================================

/**
 * Print coverage report per feature using graph_get_capability_coverage.
 * Called when --validate flag is set.
 */
async function printValidationReport(allFeatures: FeatureRow[]): Promise<void> {
  const { graph_get_capability_coverage } = await import(
    '../graph-query/graph-get-capability-coverage.js'
  )

  logger.info('[infer-capabilities] Generating validation coverage report...')

  const rows: string[] = []
  rows.push('Feature Coverage Report')
  rows.push('='.repeat(80))
  rows.push(
    [
      'Feature'.padEnd(30),
      'create'.padEnd(8),
      'read'.padEnd(8),
      'update'.padEnd(8),
      'delete'.padEnd(8),
      'total'.padEnd(8),
      'missing',
    ].join(' | '),
  )
  rows.push('-'.repeat(80))

  for (const feature of allFeatures) {
    try {
      const coverage = await graph_get_capability_coverage({ featureId: feature.featureName })
      if (!coverage) {
        rows.push(`${feature.featureName.padEnd(30)} | (no data)`)
        continue
      }

      const caps = coverage.capabilities
      const missing: string[] = []
      if (caps.create === 0) missing.push('create')
      if (caps.read === 0) missing.push('read')
      if (caps.update === 0) missing.push('update')
      if (caps.delete === 0) missing.push('delete')

      rows.push(
        [
          feature.featureName.padEnd(30),
          String(caps.create).padEnd(8),
          String(caps.read).padEnd(8),
          String(caps.update).padEnd(8),
          String(caps.delete).padEnd(8),
          String(coverage.totalCount).padEnd(8),
          missing.length > 0 ? missing.join(', ') : 'complete',
        ].join(' | '),
      )
    } catch (error) {
      rows.push(`${feature.featureName.padEnd(30)} | ERROR: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const report = rows.join('\n')
  logger.info('[infer-capabilities] Coverage report:\n' + report)
  process.stdout.write(report + '\n')
}

// ============================================================================
// ST-6: CLI entrypoint
// ============================================================================

const isMain =
  typeof process !== 'undefined' &&
  (process.argv[1]?.includes('infer-capabilities.ts') ||
    process.argv[1]?.includes('infer-capabilities.js'))

if (isMain) {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`
infer-capabilities.ts — Infer capabilities from story history (WINT-4040)

Usage:
  pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts [options]

Options:
  --dry-run    Log would-be inserts without writing to DB
  --validate   After population, print CRUD coverage report per feature
  --help, -h   Show this help

Environment:
  DATABASE_URL   PostgreSQL connection string (port 5432, lego_dev)

Examples:
  pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts --dry-run
  pnpm tsx packages/backend/mcp-tools/src/scripts/infer-capabilities.ts --validate
`)
    process.exit(0)
  }

  const dryRun = args.includes('--dry-run')
  const validate = args.includes('--validate')

  const parsed = InferCapabilitiesOptionsSchema.safeParse({ dryRun, validate })
  if (!parsed.success) {
    logger.error('[infer-capabilities] Invalid options', { error: parsed.error.message })
    process.exit(1)
  }

  inferCapabilities({ dryRun, validate })
    .then(summary => {
      logger.info('[infer-capabilities] Done', summary)
      process.stdout.write(JSON.stringify(summary) + '\n')
      process.exit(summary.failed > 0 ? 1 : 0)
    })
    .catch(err => {
      logger.error('[infer-capabilities] Fatal error', {
        error: err instanceof Error ? err.message : String(err),
      })
      process.exit(1)
    })
}

/**
 * Backlog Curator LangGraph Node
 *
 * Collects deferred items from KB and optional filesystem sources,
 * deduplicates and ranks them, and emits a bounded PM review batch
 * for PM grooming decisions.
 *
 * Implements the 4-phase execution contract from backlog-curator.agent.md:
 *   Phase 1: Load Deferred Items
 *   Phase 2: Deduplicate and Rank
 *   Phase 3: Generate PM Review Batch
 *   Phase 4: Produce Output
 *
 * AC-1: Implements the 4-phase contract as a LangGraph node.
 * AC-2: Deferred-item collection (not ML scoring) — separate from mlScoringNode.
 * AC-3: Phase functions exported for unit testability.
 * AC-4: Graceful KB fallback to filesystem scan on unavailability.
 *
 * WINT-9070
 */

import { createHash } from 'node:crypto'
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { parse as parseYaml } from 'yaml'
import { logger } from '@repo/logger'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Configuration schema for the Backlog Curator node.
 * AC-1: BacklogCuratorConfigSchema.
 */
export const BacklogCuratorConfigSchema = z.object({
  /** Maximum items in PM review batch (default: 10) */
  batchLimit: z.number().int().positive().default(10),
  /**
   * Injectable KB search function. When absent or failing, node falls back
   * to filesystem scan (AC-4).
   */
  kbSearch: z
    .function()
    .args(z.object({ query: z.string(), tags: z.array(z.string()), limit: z.number() }))
    .returns(z.promise(z.array(z.unknown())))
    .optional(),
})

export type BacklogCuratorConfig = z.infer<typeof BacklogCuratorConfigSchema>

/**
 * Injectable KB search function type.
 * AC-4: When unavailable, node falls back to filesystem scan.
 */
export type KbSearchFn = (params: {
  query: string
  tags: string[]
  limit: number
}) => Promise<KbRawItem[]>

/**
 * Raw item from the KB, as returned by kb_search.
 */
export const KbRawItemSchema = z.object({
  story_id: z.string().optional(),
  description: z.string().optional(),
  deferral_reason: z.string().optional(),
  deferred_at: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export type KbRawItem = z.infer<typeof KbRawItemSchema>

/**
 * A single deferred item from any source before deduplication.
 */
export const RawDeferredItemSchema = z.object({
  /** Source of this item */
  source: z.enum(['kb', 'scope-challenges', 'deferred-writes']),
  /** Story ID the deferral originated from */
  story_id: z.string(),
  /** One-line description of what was deferred */
  description: z.string(),
  /** Why it was deferred */
  deferral_reason: z.string(),
  /** ISO 8601 timestamp when deferred */
  deferred_at: z.string(),
})

export type RawDeferredItem = z.infer<typeof RawDeferredItemSchema>

/**
 * Deduplication key: story_id + SHA-256 of description.
 */
export const DeduplicatedItemSchema = RawDeferredItemSchema.extend({
  /** Combined sources if item appeared in multiple places, e.g. "kb+scope-challenges" */
  source: z.string(),
  /** SHA-256 hash of description for deduplication */
  descriptionHash: z.string(),
})

export type DeduplicatedItem = z.infer<typeof DeduplicatedItemSchema>

/**
 * A single item in the PM review batch.
 */
export const BatchItemSchema = z.object({
  /** Sequential ID: BC-001, BC-002, ... */
  id: z.string(),
  /** Origin(s) of the item */
  source: z.string(),
  /** Story the deferral originated from */
  story_id: z.string(),
  /** One-line summary of what was deferred */
  description: z.string(),
  /** Why it was deferred */
  deferral_reason: z.string(),
  /** When it was deferred */
  deferred_at: z.string(),
  /** Risk assessment */
  risk_signal: z.enum(['low', 'medium', 'high']),
  /** Suggested PM action */
  recommended_action: z.enum(['promote-to-story', 'close', 'defer-again']),
})

export type BatchItem = z.infer<typeof BatchItemSchema>

/**
 * Full pm-review-batch.json schema.
 */
export const PMReviewBatchSchema = z.object({
  generated_at: z.string(),
  total_items_found: z.number().int().min(0),
  items_in_batch: z.number().int().min(0),
  truncated: z.boolean(),
  items: z.array(BatchItemSchema),
})

export type PMReviewBatch = z.infer<typeof PMReviewBatchSchema>

/**
 * Node result written to state.
 */
export const BacklogCuratorResultSchema = z.object({
  outputDir: z.string().nullable(),
  totalItemsFound: z.number().int().min(0),
  itemsInBatch: z.number().int().min(0),
  truncated: z.boolean(),
  warnings: z.array(z.string()),
  completedAt: z.string(),
})

export type BacklogCuratorResult = z.infer<typeof BacklogCuratorResultSchema>

/**
 * State fields read by the Backlog Curator node via safe parse.
 * These fields are populated by the enclosing graph's state annotation.
 */
const BacklogCuratorStateSchema = z.object({
  storyId: z.string().optional(),
  /** Story ID, epic prefix, or "all" — filters which deferred items to collect */
  scope: z.string().default('all'),
  /** Directory path where output files are written */
  outputDir: z.string().nullable().optional(),
  /** Path to scan for scope-challenges.json files (optional) */
  scopeChallengesDir: z.string().nullable().optional(),
  /** Path to scan for DEFERRED-KB-WRITES.yaml files (optional) */
  deferredWritesDir: z.string().nullable().optional(),
  /** Max items in batch (default: 10) */
  batchLimit: z.number().nullable().optional(),
  /** Accumulated warnings */
  warnings: z.array(z.string()).optional(),
})

type BacklogCuratorState = z.infer<typeof BacklogCuratorStateSchema>

/**
 * Casts curator-specific state updates to LangGraph's Partial<GraphState>.
 * Single cast point: curator node writes to extended state fields that are
 * registered as LangGraph Annotations but not on the base GraphState type.
 */
function toStateUpdate(
  updates: Partial<BacklogCuratorState> & Record<string, unknown>,
): Partial<GraphState> {
  return updates as unknown as Partial<GraphState>
}

// ============================================================================
// Phase 1: Load Deferred Items
// ============================================================================

/**
 * Loads deferred items from KB (primary) and optional filesystem sources.
 * AC-4: Falls back to filesystem when kbSearch unavailable/fails.
 *
 * @param kbSearch - Injectable KB search function (optional)
 * @param scope - "all", epic prefix, or story ID
 * @param scopeChallengesDir - Optional path to scan scope-challenges.json files
 * @param deferredWritesDir - Optional path to scan DEFERRED-KB-WRITES.yaml files
 * @returns Raw items and warning list
 */
export async function loadDeferredItems(
  kbSearch: KbSearchFn | undefined,
  scope: string,
  scopeChallengesDir: string | null | undefined,
  deferredWritesDir: string | null | undefined,
): Promise<{ items: RawDeferredItem[]; warnings: string[] }> {
  const items: RawDeferredItem[] = []
  const warnings: string[] = []

  // --- KB query (primary source) ---
  let kbAvailable = true
  if (kbSearch) {
    try {
      const raw = await kbSearch({ query: 'deferred moonshot', tags: ['deferred'], limit: 50 })
      const filtered = filterByScope(raw, scope)
      for (const entry of filtered) {
        const parsed = KbRawItemSchema.safeParse(entry)
        if (!parsed.success) continue
        const item = parsed.data
        if (!item.story_id || !item.description) continue
        items.push({
          source: 'kb',
          story_id: item.story_id,
          description: item.description,
          deferral_reason: item.deferral_reason ?? 'No reason provided',
          deferred_at: item.deferred_at ?? new Date().toISOString(),
        })
      }
    } catch (err) {
      kbAvailable = false
      const msg = err instanceof Error ? err.message : String(err)
      warnings.push(
        `backlog-curator: KB search unavailable — ${msg} — falling back to filesystem scan`,
      )
    }
  } else {
    kbAvailable = false
    warnings.push('backlog-curator: kbSearch not injected — falling back to filesystem scan')
  }

  // --- Filesystem scan: scope-challenges.json (optional) ---
  if (scopeChallengesDir) {
    const scopeItems = await scanScopeChallenges(scopeChallengesDir, scope)
    items.push(...scopeItems)
  }

  // --- Filesystem scan: DEFERRED-KB-WRITES.yaml (optional) ---
  if (deferredWritesDir) {
    const deferredItems = await scanDeferredKbWrites(deferredWritesDir, scope)
    items.push(...deferredItems)
  }

  // AC-4: If KB unavailable and no filesystem items found, emit warning (no throw)
  if (!kbAvailable && items.length === 0 && !scopeChallengesDir && !deferredWritesDir) {
    warnings.push(
      'backlog-curator: both KB and filesystem sources unavailable — returning empty batch',
    )
  }

  return { items, warnings }
}

/**
 * Filters KB raw items by scope.
 */
function filterByScope(items: unknown[], scope: string): unknown[] {
  if (scope === 'all') return items
  return items.filter(item => {
    const parsed = KbRawItemSchema.safeParse(item)
    if (!parsed.success || !parsed.data.story_id) return false
    const storyId = parsed.data.story_id
    // Epic prefix: filter stories whose ID starts with the prefix
    if (!storyId.match(/^[A-Z]+-\d+$/)) return storyId.startsWith(scope)
    // Story ID exact match
    if (storyId === scope) return true
    // Epic prefix match (e.g., "WINT" matches "WINT-1234")
    const prefix = storyId.replace(/-\d+$/, '')
    return prefix === scope || storyId.startsWith(scope)
  })
}

/**
 * Scans a directory for scope-challenges.json files with defer-to-backlog recommendations.
 */
async function scanScopeChallenges(dir: string, scope: string): Promise<RawDeferredItem[]> {
  const results: RawDeferredItem[] = []
  try {
    const absDir = resolve(dir)
    const allFiles = await readdir(absDir, { recursive: true })
    const challengeFiles = (allFiles as string[]).filter(f => f.endsWith('scope-challenges.json'))

    for (const file of challengeFiles) {
      try {
        const content = await readFile(join(absDir, file), 'utf-8')
        const data = JSON.parse(content) as unknown

        // Extract entries where recommendation == "defer-to-backlog"
        const entries = Array.isArray(data) ? data : [data]
        for (const entry of entries) {
          if (!entry || typeof entry !== 'object') continue
          const e = entry as Record<string, unknown>
          if (e['recommendation'] !== 'defer-to-backlog') continue

          const storyId = String(e['story_id'] ?? '')
          if (!storyId) continue
          if (scope !== 'all' && !storyId.startsWith(scope) && storyId !== scope) continue

          results.push({
            source: 'scope-challenges',
            story_id: storyId,
            description: String(e['target'] ?? e['description'] ?? 'Deferred scope challenge'),
            deferral_reason: String(e['deferral_note'] ?? 'Deferred to backlog'),
            deferred_at: String(e['generated_at'] ?? new Date().toISOString()),
          })
        }
      } catch {
        // Skip unparseable files silently
      }
    }
  } catch {
    // Directory not accessible — skip silently (AC-4)
  }
  return results
}

/**
 * Scans a directory for DEFERRED-KB-WRITES.yaml files with pending writes.
 */
async function scanDeferredKbWrites(dir: string, scope: string): Promise<RawDeferredItem[]> {
  const results: RawDeferredItem[] = []
  try {
    const absDir = resolve(dir)
    const allFiles = await readdir(absDir, { recursive: true })
    const yamlFiles = (allFiles as string[]).filter(f => f.endsWith('DEFERRED-KB-WRITES.yaml'))

    for (const file of yamlFiles) {
      try {
        const content = await readFile(join(absDir, file), 'utf-8')
        const data = parseYaml(content) as unknown

        if (!data || typeof data !== 'object') continue
        const d = data as Record<string, unknown>
        const pendingWrites = Array.isArray(d['pending_writes']) ? d['pending_writes'] : []

        for (const write of pendingWrites) {
          if (!write || typeof write !== 'object') continue
          const w = write as Record<string, unknown>

          const storyId = String(w['story_id'] ?? '')
          if (!storyId) continue
          if (scope !== 'all' && !storyId.startsWith(scope) && storyId !== scope) continue

          results.push({
            source: 'deferred-writes',
            story_id: storyId,
            description: String(w['description'] ?? w['content'] ?? 'Deferred KB write'),
            deferral_reason: String(w['reason'] ?? 'Deferred write not processed'),
            deferred_at: String(w['deferred_at'] ?? w['created_at'] ?? new Date().toISOString()),
          })
        }
      } catch {
        // Skip unparseable files silently
      }
    }
  } catch {
    // Directory not accessible — skip silently (AC-4)
  }
  return results
}

// ============================================================================
// Phase 2: Deduplicate and Rank
// ============================================================================

/**
 * Computes a SHA-256 hash of a string, truncated to 16 hex chars.
 */
function descriptionHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 16)
}

/**
 * Deduplicates raw items by (story_id + description hash) and sorts by recency.
 * AC-3: Exported for unit testing.
 *
 * @param items - Raw deferred items from all sources
 * @returns Deduplicated, recency-sorted items
 */
export function deduplicateAndRank(items: RawDeferredItem[]): DeduplicatedItem[] {
  const seen = new Map<string, DeduplicatedItem>()

  for (const item of items) {
    const hash = descriptionHash(item.description)
    const key = `${item.story_id}::${hash}`

    if (seen.has(key)) {
      // Merge sources
      const existing = seen.get(key)!
      const sources = new Set(existing.source.split('+'))
      sources.add(item.source)
      seen.set(key, { ...existing, source: [...sources].join('+') })
    } else {
      seen.set(key, { ...item, descriptionHash: hash })
    }
  }

  // Sort by recency descending (most recent first)
  const deduped = [...seen.values()]
  deduped.sort((a, b) => {
    const aTime = new Date(a.deferred_at).getTime()
    const bTime = new Date(b.deferred_at).getTime()
    if (isNaN(aTime) && isNaN(bTime)) return 0
    if (isNaN(aTime)) return 1
    if (isNaN(bTime)) return -1
    return bTime - aTime
  })

  return deduped
}

// ============================================================================
// Phase 3: Generate PM Review Batch
// ============================================================================

/**
 * Assigns risk_signal based on item characteristics.
 */
function assessRisk(item: DeduplicatedItem): 'low' | 'medium' | 'high' {
  const desc = item.description.toLowerCase()
  const reason = item.deferral_reason.toLowerCase()

  // High risk: security, data loss, critical path
  if (/security|vulnerability|data.loss|critical|breaking/.test(desc + reason)) return 'high'
  // Medium risk: performance, scalability, user-facing
  if (/performance|scale|user|ux|blocking|dependency/.test(desc + reason)) return 'medium'
  return 'low'
}

/**
 * Recommends a PM action based on item characteristics.
 */
function recommendAction(item: DeduplicatedItem): 'promote-to-story' | 'close' | 'defer-again' {
  const risk = assessRisk(item)
  const reason = item.deferral_reason.toLowerCase()

  if (risk === 'high') return 'promote-to-story'
  if (/won't fix|obsolete|no longer|not needed|closed/.test(reason)) return 'close'
  if (risk === 'medium') return 'promote-to-story'
  return 'defer-again'
}

/**
 * Generates the PM review batch from a ranked, deduplicated item list.
 * AC-3: Exported for unit testing.
 *
 * @param items - Ranked deduplicated items
 * @param batchLimit - Maximum items in batch (default: 10)
 * @returns Batch metadata and capped item list
 */
export function generatePMReviewBatch(
  items: DeduplicatedItem[],
  batchLimit = 10,
): { batch: BatchItem[]; totalItemsFound: number; truncated: boolean } {
  const totalItemsFound = items.length
  const sliced = items.slice(0, batchLimit)
  const truncated = totalItemsFound > batchLimit

  const batch: BatchItem[] = sliced.map((item, idx) => ({
    id: `BC-${String(idx + 1).padStart(3, '0')}`,
    source: item.source,
    story_id: item.story_id,
    description: item.description,
    deferral_reason: item.deferral_reason,
    deferred_at: item.deferred_at,
    risk_signal: assessRisk(item),
    recommended_action: recommendAction(item),
  }))

  return { batch, totalItemsFound, truncated }
}

// ============================================================================
// Phase 4: Produce Output
// ============================================================================

/**
 * Assembles and writes pm-review-batch.json and PM-REVIEW-REPORT.md.
 * AC-3: Exported for unit testing.
 *
 * @param batch - Batch items
 * @param totalItemsFound - Total items before cap
 * @param truncated - Whether batch was truncated
 * @param outputDir - Directory to write output files into
 */
export async function produceOutput(
  batch: BatchItem[],
  totalItemsFound: number,
  truncated: boolean,
  outputDir: string,
): Promise<void> {
  await mkdir(outputDir, { recursive: true })

  const generatedAt = new Date().toISOString()
  const pmBatch: PMReviewBatch = {
    generated_at: generatedAt,
    total_items_found: totalItemsFound,
    items_in_batch: batch.length,
    truncated,
    items: batch,
  }

  await writeFile(
    join(outputDir, 'pm-review-batch.json'),
    JSON.stringify(pmBatch, null, 2),
    'utf-8',
  )

  const report = buildMarkdownReport(pmBatch)
  await writeFile(join(outputDir, 'PM-REVIEW-REPORT.md'), report, 'utf-8')
}

/**
 * Builds the PM-REVIEW-REPORT.md content.
 */
function buildMarkdownReport(batch: PMReviewBatch): string {
  const lines: string[] = []

  lines.push('# Backlog Curator — PM Review Report')
  lines.push('')
  lines.push(`Generated: ${batch.generated_at}`)
  lines.push(
    `Items reviewed: ${batch.total_items_found} | Showing: ${batch.items_in_batch} | Truncated: ${batch.truncated}`,
  )

  if (batch.truncated) {
    const skipped = batch.total_items_found - batch.items_in_batch
    lines.push('')
    lines.push(
      `> **Note:** ${skipped} additional item${skipped === 1 ? '' : 's'} were found but not included in this batch. Re-run with a higher \`batch_limit\` to see all items.`,
    )
  }

  for (const item of batch.items) {
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push(`## ${item.id}: ${item.description}`)
    lines.push('')
    lines.push(`- **Story:** ${item.story_id}`)
    lines.push(`- **Deferred:** ${item.deferred_at} | **Source:** ${item.source}`)
    lines.push(`- **Reason:** ${item.deferral_reason}`)
    lines.push(`- **Risk if ignored:** ${item.risk_signal}`)
    lines.push(`- **Recommended action:** ${item.recommended_action}`)
  }

  lines.push('')
  return lines.join('\n')
}

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates a Backlog Curator node with the given configuration.
 *
 * AC-1: createBacklogCuratorNode factory using createToolNode.
 * AC-2: Implements deferred-item collection (not ML scoring).
 * AC-4: Falls back to filesystem when kbSearch unavailable.
 *
 * @param config - Node configuration (partial — defaults applied)
 * @returns Configured LangGraph node function
 */
export function createBacklogCuratorNode(
  config: {
    batchLimit?: number
    kbSearch?: KbSearchFn
  } = {},
) {
  const fullConfig = BacklogCuratorConfigSchema.parse(config)

  return createToolNode(
    'backlog-curator',
    async (state: GraphState): Promise<Partial<GraphState>> => {
      // Extract relevant state fields via Zod safe parse (AC-3: structurer pattern)
      const parsed = BacklogCuratorStateSchema.safeParse(state)
      const s: BacklogCuratorState = parsed.success ? parsed.data : { scope: 'all' }
      const storyId = s.storyId ?? 'unknown'

      logger.info('Backlog Curator node starting', { storyId, scope: s.scope })

      const batchLimit = s.batchLimit ?? fullConfig.batchLimit
      const outputDir = s.outputDir ?? null
      const allWarnings: string[] = []

      try {
        // Phase 1: Load Deferred Items
        const { items: rawItems, warnings: loadWarnings } = await loadDeferredItems(
          fullConfig.kbSearch,
          s.scope,
          s.scopeChallengesDir,
          s.deferredWritesDir,
        )
        allWarnings.push(...loadWarnings)

        logger.info('Backlog Curator: items loaded', {
          storyId,
          rawCount: rawItems.length,
        })

        // Phase 2: Deduplicate and Rank
        const deduped = deduplicateAndRank(rawItems)

        logger.info('Backlog Curator: deduplicated', {
          storyId,
          dedupCount: deduped.length,
        })

        // Phase 3: Generate PM Review Batch
        const { batch, totalItemsFound, truncated } = generatePMReviewBatch(deduped, batchLimit)

        logger.info('Backlog Curator: batch generated', {
          storyId,
          totalItemsFound,
          batchSize: batch.length,
          truncated,
        })

        // Phase 4: Produce Output
        if (outputDir) {
          await produceOutput(batch, totalItemsFound, truncated, outputDir)
          logger.info('Backlog Curator: output written', { storyId, outputDir })
        } else {
          allWarnings.push('backlog-curator: outputDir not set — skipping file output')
          logger.warn('Backlog Curator: outputDir not set — skipping file output', { storyId })
        }

        const result: BacklogCuratorResult = {
          outputDir,
          totalItemsFound,
          itemsInBatch: batch.length,
          truncated,
          warnings: allWarnings,
          completedAt: new Date().toISOString(),
        }

        logger.info('Backlog Curator node complete', {
          storyId,
          totalItemsFound,
          batchSize: batch.length,
        })

        return toStateUpdate({
          baclogCuratorResult: result,
          warnings: allWarnings,
          baclogCuratorComplete: true,
        } as Partial<BacklogCuratorState> & Record<string, unknown>)
      } catch (err) {
        // AC-4: Never throw — return error in warnings
        const msg = err instanceof Error ? err.message : String(err)
        allWarnings.push(`backlog-curator: unexpected error — ${msg}`)

        logger.error('Backlog Curator: unexpected error', { storyId, error: msg })

        return toStateUpdate({
          baclogCuratorResult: {
            outputDir,
            totalItemsFound: 0,
            itemsInBatch: 0,
            truncated: false,
            warnings: allWarnings,
            completedAt: new Date().toISOString(),
          } satisfies BacklogCuratorResult,
          warnings: allWarnings,
          baclogCuratorComplete: true,
        } as Partial<BacklogCuratorState> & Record<string, unknown>)
      }
    },
  )
}

/**
 * Default backlog curator node instance with default configuration.
 * For use when no custom config is required.
 */
export const backlogCuratorNode = createBacklogCuratorNode()

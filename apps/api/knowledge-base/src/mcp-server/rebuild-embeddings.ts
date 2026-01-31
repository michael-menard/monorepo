/**
 * Rebuild Embeddings Implementation
 *
 * Core logic for rebuilding embedding cache (model upgrades, corruption recovery).
 * Supports both full rebuild (force: true) and incremental rebuild (force: false).
 *
 * @see KNOW-007 AC1-AC4 for requirements
 */

import { z } from 'zod'
import { eq, sql, inArray } from 'drizzle-orm'
import { knowledgeEntries, embeddingCache } from '../db/schema.js'
import { computeContentHash } from '../embedding-client/cache-manager.js'
import { createMcpLogger } from './logger.js'
import type { ToolHandlerDeps } from './tool-handlers.js'

const logger = createMcpLogger('rebuild-embeddings')

/**
 * Input schema for rebuild embeddings.
 *
 * @see KNOW-007 AC4 for validation requirements
 */
export const RebuildEmbeddingsInputSchema = z.object({
  /** Force full rebuild (default: false for incremental) */
  force: z.boolean().optional().default(false),

  /** Batch size for processing (default: 50, min: 1, max: 1000) */
  batch_size: z
    .number()
    .int()
    .min(1, 'batch_size must be at least 1')
    .max(1000, 'batch_size cannot exceed 1000')
    .optional()
    .default(50),

  /** Optional: Only rebuild specific entry IDs */
  entry_ids: z.array(z.string().uuid()).optional(),

  /** Dry run mode - estimate cost without actually rebuilding */
  dry_run: z.boolean().optional().default(false),
})

export type RebuildEmbeddingsInput = z.infer<typeof RebuildEmbeddingsInputSchema>

/**
 * Error detail for a single failed entry.
 */
export const RebuildErrorSchema = z.object({
  entry_id: z.string(),
  reason: z.string(),
})
export type RebuildError = z.infer<typeof RebuildErrorSchema>

/**
 * Summary of rebuild operation.
 *
 * @see KNOW-007 AC1 for return schema
 */
export const RebuildSummarySchema = z.object({
  total_entries: z.number(),
  rebuilt: z.number(),
  skipped: z.number(),
  failed: z.number(),
  errors: z.array(RebuildErrorSchema),
  duration_ms: z.number(),
  estimated_cost_usd: z.number(),
  entries_per_second: z.number(),
  dry_run: z.boolean(),
})
export type RebuildSummary = z.infer<typeof RebuildSummarySchema>

/**
 * Dependencies for rebuild embeddings function.
 */
export type RebuildEmbeddingsDeps = ToolHandlerDeps

/**
 * Average characters per knowledge entry (for cost estimation).
 * Based on typical content length of 100-500 characters.
 */
const AVG_CHARS_PER_ENTRY = 300

/**
 * OpenAI pricing: $0.00002 per 1000 tokens for text-embedding-3-small.
 * Token estimate: ~4 characters per token.
 */
const COST_PER_1K_TOKENS = 0.00002
const CHARS_PER_TOKEN = 4

/**
 * Estimate API cost for rebuilding embeddings.
 *
 * @param entryCount - Number of entries to rebuild
 * @param avgChars - Average characters per entry
 * @returns Estimated cost in USD
 */
function estimateCost(entryCount: number, avgChars: number = AVG_CHARS_PER_ENTRY): number {
  const totalChars = entryCount * avgChars
  const totalTokens = totalChars / CHARS_PER_TOKEN
  const costUsd = (totalTokens / 1000) * COST_PER_1K_TOKENS
  return Math.round(costUsd * 100000) / 100000 // Round to 5 decimal places
}

/**
 * Get entries that need embedding rebuild.
 *
 * For force=true: Returns all entries
 * For force=false: Returns only entries without valid cache
 *
 * @param deps - Database dependencies
 * @param force - Whether to force full rebuild
 * @param entryIds - Optional specific entry IDs to filter
 * @returns Array of entries to rebuild
 */
async function getEntriesToRebuild(
  deps: RebuildEmbeddingsDeps,
  force: boolean,
  entryIds?: string[],
): Promise<Array<{ id: string; content: string }>> {
  const { db } = deps

  // If specific entry IDs provided, filter by them
  if (entryIds && entryIds.length > 0) {
    const entries = await db
      .select({
        id: knowledgeEntries.id,
        content: knowledgeEntries.content,
      })
      .from(knowledgeEntries)
      .where(inArray(knowledgeEntries.id, entryIds))

    if (force) {
      return entries
    }

    // For incremental, filter out entries that already have cache
    const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'
    const contentHashes = entries.map(e => computeContentHash(e.content))

    const cachedHashes = await db
      .select({ contentHash: embeddingCache.contentHash })
      .from(embeddingCache)
      .where(
        sql`${embeddingCache.contentHash} IN (${sql.join(
          contentHashes.map(h => sql`${h}`),
          sql`, `,
        )}) AND ${embeddingCache.model} = ${model}`,
      )

    const cachedSet = new Set(cachedHashes.map(c => c.contentHash))
    return entries.filter(e => !cachedSet.has(computeContentHash(e.content)))
  }

  // Full rebuild - get all entries
  if (force) {
    return db
      .select({
        id: knowledgeEntries.id,
        content: knowledgeEntries.content,
      })
      .from(knowledgeEntries)
  }

  // Incremental - get entries without cache
  const model = process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small'

  // Get all content hashes that have cache for this model
  const cachedContentHashes = await db
    .select({ contentHash: embeddingCache.contentHash })
    .from(embeddingCache)
    .where(eq(embeddingCache.model, model))

  const cachedHashSet = new Set(cachedContentHashes.map(c => c.contentHash))

  // Get all entries
  const allEntries = await db
    .select({
      id: knowledgeEntries.id,
      content: knowledgeEntries.content,
    })
    .from(knowledgeEntries)

  // Filter to entries without cache
  return allEntries.filter(entry => {
    const hash = computeContentHash(entry.content)
    return !cachedHashSet.has(hash)
  })
}

/**
 * Rebuild embeddings for knowledge entries.
 *
 * @see KNOW-007 AC1-AC4 for requirements
 *
 * @param input - Validated input parameters
 * @param deps - Database and embedding client dependencies
 * @returns Rebuild summary with statistics
 */
export async function rebuildEmbeddings(
  input: RebuildEmbeddingsInput,
  deps: RebuildEmbeddingsDeps,
): Promise<RebuildSummary> {
  const startTime = Date.now()

  // Get total entries count
  const { db, embeddingClient } = deps
  const totalResult = await db.select({ count: sql<number>`count(*)::int` }).from(knowledgeEntries)
  const totalEntries = totalResult[0]?.count ?? 0

  // Get entries to rebuild
  const entriesToRebuild = await getEntriesToRebuild(deps, input.force, input.entry_ids)
  const toRebuildCount = entriesToRebuild.length
  const skippedCount = input.entry_ids
    ? Math.max(0, input.entry_ids.length - toRebuildCount)
    : totalEntries - toRebuildCount

  // Log cache hit rate for incremental
  if (!input.force) {
    logger.info('Cache analysis complete', {
      total_entries: totalEntries,
      cache_hit: totalEntries - toRebuildCount,
      to_rebuild: toRebuildCount,
      cache_hit_rate: totalEntries > 0 ? ((totalEntries - toRebuildCount) / totalEntries) * 100 : 0,
    })
  }

  // Estimate cost before starting
  const estimatedCost = estimateCost(toRebuildCount)
  logger.info('Estimated rebuild cost', {
    entries_to_rebuild: toRebuildCount,
    estimated_cost_usd: estimatedCost,
    batch_size: input.batch_size,
    force: input.force,
    dry_run: input.dry_run,
  })

  // If dry run, return estimate without actually rebuilding
  if (input.dry_run) {
    const durationMs = Date.now() - startTime
    return {
      total_entries: totalEntries,
      rebuilt: 0,
      skipped: totalEntries,
      failed: 0,
      errors: [],
      duration_ms: durationMs,
      estimated_cost_usd: estimatedCost,
      entries_per_second: 0,
      dry_run: true,
    }
  }

  // If nothing to rebuild, return early
  if (toRebuildCount === 0) {
    const durationMs = Date.now() - startTime
    logger.info('No entries to rebuild', {
      total_entries: totalEntries,
      duration_ms: durationMs,
    })
    return {
      total_entries: totalEntries,
      rebuilt: 0,
      skipped: totalEntries,
      failed: 0,
      errors: [],
      duration_ms: durationMs,
      estimated_cost_usd: 0,
      entries_per_second: 0,
      dry_run: false,
    }
  }

  // Process in batches
  const batchSize = input.batch_size
  let rebuilt = 0
  let failed = 0
  const errors: RebuildError[] = []

  for (let i = 0; i < entriesToRebuild.length; i += batchSize) {
    const batch = entriesToRebuild.slice(i, i + batchSize)
    const batchNumber = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(entriesToRebuild.length / batchSize)

    logger.info('Processing batch', {
      batch_number: batchNumber,
      total_batches: totalBatches,
      batch_size: batch.length,
      progress: `${Math.min(i + batchSize, entriesToRebuild.length)}/${entriesToRebuild.length}`,
    })

    // Process each entry in the batch
    for (const entry of batch) {
      try {
        // Generate embedding
        const embedding = await embeddingClient.generateEmbedding(entry.content)

        // Update knowledge_entries table with new embedding
        await db
          .update(knowledgeEntries)
          .set({
            embedding,
            updatedAt: new Date(),
          })
          .where(eq(knowledgeEntries.id, entry.id))

        rebuilt++
      } catch (error) {
        failed++
        const errorMessage = error instanceof Error ? error.message : String(error)
        errors.push({
          entry_id: entry.id,
          reason: errorMessage,
        })

        logger.error('Failed to rebuild embedding for entry', {
          entry_id: entry.id,
          error: errorMessage,
        })
      }
    }

    // Log batch progress
    logger.info('Batch complete', {
      batch_number: batchNumber,
      rebuilt_so_far: rebuilt,
      failed_so_far: failed,
      progress_percent: Math.round(((i + batch.length) / entriesToRebuild.length) * 100),
    })
  }

  const durationMs = Date.now() - startTime
  const entriesPerSecond =
    durationMs > 0 ? Math.round((rebuilt / durationMs) * 1000 * 100) / 100 : 0

  // Log completion
  logger.info('Rebuild complete', {
    total_entries: totalEntries,
    rebuilt,
    skipped: skippedCount,
    failed,
    duration_ms: durationMs,
    entries_per_second: entriesPerSecond,
    estimated_cost_usd: estimatedCost,
  })

  return {
    total_entries: totalEntries,
    rebuilt,
    skipped: skippedCount,
    failed,
    errors,
    duration_ms: durationMs,
    estimated_cost_usd: estimatedCost,
    entries_per_second: entriesPerSecond,
    dry_run: false,
  }
}

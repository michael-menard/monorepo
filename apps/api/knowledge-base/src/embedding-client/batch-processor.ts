/**
 * Batch Processor for Embedding Client
 *
 * Handles batch embedding requests with:
 * - Order preservation
 * - Cache coordination via prefetch
 * - In-memory deduplication for concurrent identical requests
 * - Batch splitting for large arrays (>2048 items)
 *
 * @see KNOW-002 AC3, AC4, AC10, AC13 for batch processing requirements
 */

import { logger } from '@repo/logger'
import type { Embedding } from './__types__/index.js'
import { computeContentHash, prefetchCache } from './cache-manager.js'

/**
 * In-memory promise cache for deduplicating concurrent identical requests.
 * Maps content hash → Promise<Embedding>
 */
const pendingRequests = new Map<string, Promise<Embedding>>()

/**
 * Process batch of texts with order preservation.
 *
 * Algorithm:
 * 1. Compute content hashes for all texts
 * 2. Prefetch cache entries in single query
 * 3. For cache misses, generate embeddings (with deduplication)
 * 4. Assemble results in original input order
 *
 * @param texts - Array of input texts
 * @param model - Embedding model
 * @param generateFn - Function to generate embedding for a single text
 * @returns Array of embeddings in same order as input texts
 */
export async function processBatch(
  texts: string[],
  model: string,
  generateFn: (text: string) => Promise<Embedding>,
): Promise<Embedding[]> {
  const startTime = Date.now()

  // Step 1: Compute content hashes for all texts
  const hashMap = new Map<number, string>() // index → content hash
  const hashes: string[] = []

  for (let i = 0; i < texts.length; i++) {
    const hash = computeContentHash(texts[i])
    hashMap.set(i, hash)
    hashes.push(hash)
  }

  // Step 2: Prefetch cache entries in single query
  const cacheMap = await prefetchCache(hashes, model)

  // Step 3: Track cache hits/misses
  const cacheHits = cacheMap.size
  const cacheMisses = texts.length - cacheHits

  // Step 4: Generate embeddings for cache misses (with deduplication)
  const embeddingPromises: Promise<Embedding>[] = []

  for (let i = 0; i < texts.length; i++) {
    const hash = hashMap.get(i)!
    const cachedEmbedding = cacheMap.get(hash)

    if (cachedEmbedding) {
      // Cache hit - use cached embedding
      embeddingPromises.push(Promise.resolve(cachedEmbedding))
    } else {
      // Cache miss - generate embedding with deduplication
      const text = texts[i]

      // Check if there's already a pending request for this hash
      const existingPromise = pendingRequests.get(hash)

      if (existingPromise) {
        // Reuse existing promise (in-memory deduplication)
        embeddingPromises.push(existingPromise)
      } else {
        // Create new promise and cache it
        const promise = generateFn(text)
        pendingRequests.set(hash, promise)

        // Clean up after promise resolves
        promise.then(() => pendingRequests.delete(hash)).catch(() => pendingRequests.delete(hash))

        embeddingPromises.push(promise)
      }
    }
  }

  // Step 5: Wait for all embeddings (preserves order)
  const embeddings = await Promise.all(embeddingPromises)

  const duration = Date.now() - startTime

  logger.info('Batch processing complete', {
    totalTexts: texts.length,
    cacheHits,
    cacheMisses,
    cacheHitRate: cacheHits / texts.length,
    apiCalls: cacheMisses - (texts.length - new Set(hashes).size), // Deduplicated count
    durationMs: duration,
    model,
  })

  return embeddings
}

/**
 * Split large batch into chunks for OpenAI API limit compliance.
 *
 * OpenAI API batch limit: 2048 texts per request.
 * This function splits larger batches and processes each chunk.
 *
 * @param texts - Array of input texts (may exceed 2048)
 * @param model - Embedding model
 * @param generateFn - Function to generate embedding for a single text
 * @returns Array of embeddings in same order as input texts
 */
export async function processBatchWithSplitting(
  texts: string[],
  model: string,
  generateFn: (text: string) => Promise<Embedding>,
): Promise<Embedding[]> {
  const BATCH_SIZE_LIMIT = 2048

  if (texts.length <= BATCH_SIZE_LIMIT) {
    // No splitting needed
    return processBatch(texts, model, generateFn)
  }

  logger.info('Splitting large batch', {
    totalTexts: texts.length,
    batchSizeLimit: BATCH_SIZE_LIMIT,
    chunks: Math.ceil(texts.length / BATCH_SIZE_LIMIT),
  })

  // Split into chunks
  const chunks: string[][] = []
  for (let i = 0; i < texts.length; i += BATCH_SIZE_LIMIT) {
    chunks.push(texts.slice(i, i + BATCH_SIZE_LIMIT))
  }

  // Process each chunk
  const chunkResults = await Promise.all(
    chunks.map(chunk => processBatch(chunk, model, generateFn)),
  )

  // Flatten results (preserves order)
  return chunkResults.flat()
}

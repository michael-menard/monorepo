/**
 * Cache Manager for Embedding Client
 *
 * Handles PostgreSQL cache operations for embeddings using content-hash deduplication.
 * Implements graceful degradation when database is unavailable.
 *
 * @see KNOW-002 AC3, AC7, AC9 for caching requirements
 */

import { createHash } from 'node:crypto'
import { eq, and, inArray } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { getDbClient } from '../db/client.js'
import { embeddingCache } from '../db/schema.js'
import type { Embedding } from './__types__/index.js'

/**
 * Preprocess text for consistent hashing.
 *
 * Steps:
 * 1. Trim leading/trailing whitespace
 * 2. Normalize internal whitespace (multiple spaces → single space)
 * 3. Preserve case (no automatic lowercasing)
 *
 * @param text - Raw input text
 * @returns Preprocessed text ready for hashing
 */
export function preprocessText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

/**
 * Compute SHA-256 content hash for deduplication.
 *
 * @param text - Preprocessed text
 * @returns SHA-256 hash as hex string (64 characters)
 */
export function computeContentHash(text: string): string {
  const preprocessed = preprocessText(text)
  const hash = createHash('sha256').update(preprocessed).digest('hex')
  return hash
}

/**
 * Get embedding from cache.
 *
 * @param contentHash - SHA-256 hash of content
 * @param model - Embedding model name
 * @returns Cached embedding or null if not found
 */
export async function getFromCache(contentHash: string, model: string): Promise<Embedding | null> {
  try {
    const db = getDbClient()

    const result = await db
      .select()
      .from(embeddingCache)
      .where(and(eq(embeddingCache.contentHash, contentHash), eq(embeddingCache.model, model)))
      .limit(1)

    if (result.length > 0) {
      logger.debug('Cache hit', { contentHash, model })
      return result[0].embedding as Embedding
    }

    logger.debug('Cache miss', { contentHash, model })
    return null
  } catch (error) {
    // Graceful degradation: log warning but don't throw
    logger.warn('Cache read failed, proceeding without cache', {
      error: error instanceof Error ? error.message : String(error),
      contentHash,
      model,
    })
    return null
  }
}

/**
 * Save embedding to cache.
 *
 * @param contentHash - SHA-256 hash of content
 * @param model - Embedding model name
 * @param embedding - 1536-dimensional embedding vector
 */
export async function saveToCache(
  contentHash: string,
  model: string,
  embedding: Embedding,
): Promise<void> {
  try {
    const db = getDbClient()

    await db
      .insert(embeddingCache)
      .values({
        contentHash,
        model,
        embedding,
      })
      .onConflictDoNothing() // Handle race conditions gracefully

    logger.debug('Cache saved', { contentHash, model })
  } catch (error) {
    // Graceful degradation: log warning but don't throw
    logger.warn('Cache write failed', {
      error: error instanceof Error ? error.message : String(error),
      contentHash,
      model,
    })
  }
}

/**
 * Prefetch multiple cache entries in a single query (batch optimization).
 *
 * This is more efficient than N individual lookups.
 * Uses WHERE (content_hash, model) IN (...) pattern.
 *
 * @param contentHashes - Array of SHA-256 content hashes
 * @param model - Embedding model name (same for all in batch)
 * @returns Map of content hash → embedding (only for cache hits)
 */
export async function prefetchCache(
  contentHashes: string[],
  model: string,
): Promise<Map<string, Embedding>> {
  const cacheMap = new Map<string, Embedding>()

  if (contentHashes.length === 0) {
    return cacheMap
  }

  try {
    const db = getDbClient()

    // Drizzle doesn't support tuple IN clauses directly, so we filter in memory
    // Fetch all entries for the given model where content_hash is in the list
    const results = await db
      .select()
      .from(embeddingCache)
      .where(
        and(inArray(embeddingCache.contentHash, contentHashes), eq(embeddingCache.model, model)),
      )

    for (const result of results) {
      cacheMap.set(result.contentHash, result.embedding as Embedding)
    }

    logger.debug('Cache prefetch complete', {
      requested: contentHashes.length,
      hits: cacheMap.size,
      misses: contentHashes.length - cacheMap.size,
      model,
    })
  } catch (error) {
    // Graceful degradation: log warning and return empty map
    logger.warn('Cache prefetch failed, proceeding without cache', {
      error: error instanceof Error ? error.message : String(error),
      contentHashCount: contentHashes.length,
      model,
    })
  }

  return cacheMap
}

/**
 * Tests for Cache Manager
 *
 * Coverage:
 * - AC2: Cache Hit Performance
 * - AC4: Mixed Cache Hits and Misses in Batch
 * - AC7: Graceful Degradation on Cache Failure
 * - AC8: Text Preprocessing and Validation
 * - AC9: Content Hash Deduplication
 * - AC11: Cache Key Includes Model Version
 *
 * @see KNOW-002 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import {
  preprocessText,
  computeContentHash,
  getFromCache,
  saveToCache,
  prefetchCache,
} from '../cache-manager.js'
import {
  clearEmbeddingCache,
  closeTestPool,
  insertTestCacheEntry,
  generateMockEmbedding,
  getTestPool,
} from './setup.js'

describe('Cache Manager', () => {
  describe('Unit Tests (No Database Required)', () => {
    describe('AC8: Text Preprocessing and Validation', () => {
      it('should trim leading and trailing whitespace', () => {
      const text = '  hello world  '
      const result = preprocessText(text)
      expect(result).toBe('hello world')
    })

    it('should normalize multiple spaces to single space', () => {
      const text = 'hello    world    test'
      const result = preprocessText(text)
      expect(result).toBe('hello world test')
    })

    it('should handle mixed whitespace characters', () => {
      const text = '  hello\t\tworld\n\ntest  '
      const result = preprocessText(text)
      expect(result).toBe('hello world test')
    })

    it('should preserve case (no automatic lowercasing)', () => {
      const text = 'Hello World TEST'
      const result = preprocessText(text)
      expect(result).toBe('Hello World TEST')
    })

    it('should handle empty string after trimming', () => {
      const text = '   '
      const result = preprocessText(text)
      expect(result).toBe('')
    })
  })

  describe('AC9: Content Hash Deduplication', () => {
    it('should generate SHA-256 hash (64 hex characters)', () => {
      const text = 'test content'
      const hash = computeContentHash(text)

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate identical hash for identical text', () => {
      const text = 'consistent content'
      const hash1 = computeContentHash(text)
      const hash2 = computeContentHash(text)

      expect(hash1).toBe(hash2)
    })

    it('should generate different hash for different text', () => {
      const hash1 = computeContentHash('content A')
      const hash2 = computeContentHash('content B')

      expect(hash1).not.toBe(hash2)
    })

    it('should normalize whitespace before hashing', () => {
      const text1 = '  hello   world  '
      const text2 = 'hello world'
      const hash1 = computeContentHash(text1)
      const hash2 = computeContentHash(text2)

      expect(hash1).toBe(hash2)
    })

    it('should be case-sensitive when hashing', () => {
      const hash1 = computeContentHash('Hello World')
      const hash2 = computeContentHash('hello world')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('Cache Operations', () => {
    it('should save and retrieve embedding from cache', async () => {
      const text = 'test cache entry'
      const contentHash = computeContentHash(text)
      const embedding = generateMockEmbedding(0.7)
      const model = 'text-embedding-3-small'

      // Save to cache
      await saveToCache(contentHash, model, embedding)

      // Retrieve from cache
      const cached = await getFromCache(contentHash, model)

      expect(cached).not.toBeNull()
      expect(cached).toEqual(embedding)
    })

    it('should return null for cache miss', async () => {
      const contentHash = computeContentHash('nonexistent content')
      const model = 'text-embedding-3-small'

      const cached = await getFromCache(contentHash, model)

      expect(cached).toBeNull()
    })

    it('should handle concurrent saves with onConflictDoNothing', async () => {
      const contentHash = computeContentHash('concurrent test')
      const embedding1 = generateMockEmbedding(0.1)
      const embedding2 = generateMockEmbedding(0.2)
      const model = 'text-embedding-3-small'

      // Concurrent saves
      await Promise.all([
        saveToCache(contentHash, model, embedding1),
        saveToCache(contentHash, model, embedding2),
      ])

      // Should have one entry (first or second, doesn't matter)
      const cached = await getFromCache(contentHash, model)
      expect(cached).not.toBeNull()
      expect(cached).toHaveLength(1536)
    })
  })

  describe.skipIf(!isDbAvailable)('AC11: Cache Key Includes Model Version', () => {
    it('should store separate entries for same content with different models', async () => {
      const text = 'model version test'
      const contentHash = computeContentHash(text)
      const embeddingSmall = generateMockEmbedding(0.1)
      const embeddingLarge = generateMockEmbedding(0.9)

      // Save with different models
      await saveToCache(contentHash, 'text-embedding-3-small', embeddingSmall)
      await saveToCache(contentHash, 'text-embedding-3-large', embeddingLarge)

      // Retrieve both
      const cachedSmall = await getFromCache(contentHash, 'text-embedding-3-small')
      const cachedLarge = await getFromCache(contentHash, 'text-embedding-3-large')

      expect(cachedSmall).toEqual(embeddingSmall)
      expect(cachedLarge).toEqual(embeddingLarge)
      expect(cachedSmall).not.toEqual(cachedLarge)
    })

    it('should miss cache when model changes', async () => {
      const text = 'model change test'
      const contentHash = computeContentHash(text)
      const embedding = generateMockEmbedding(0.5)

      // Save with model A
      await saveToCache(contentHash, 'model-a', embedding)

      // Try to retrieve with model B - should miss
      const cached = await getFromCache(contentHash, 'model-b')
      expect(cached).toBeNull()
    })
  })

  describe.skipIf(!isDbAvailable)('AC4: Batch Cache Prefetch (Mixed Hits and Misses)', () => {
    it('should prefetch multiple cache entries in single query', async () => {
      const texts = ['text 1', 'text 2', 'text 3']
      const hashes = texts.map(computeContentHash)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))
      const model = 'text-embedding-3-small'

      // Populate cache with 2 out of 3 entries
      await insertTestCacheEntry(hashes[0], embeddings[0], model)
      await insertTestCacheEntry(hashes[1], embeddings[1], model)
      // hashes[2] is intentionally missing

      // Prefetch all 3
      const cacheMap = await prefetchCache(hashes, model)

      // Should have 2 hits
      expect(cacheMap.size).toBe(2)
      expect(cacheMap.get(hashes[0])).toEqual(embeddings[0])
      expect(cacheMap.get(hashes[1])).toEqual(embeddings[1])
      expect(cacheMap.has(hashes[2])).toBe(false)
    })

    it('should return empty map for empty input', async () => {
      const cacheMap = await prefetchCache([], 'text-embedding-3-small')
      expect(cacheMap.size).toBe(0)
    })

    it('should return empty map when no entries match', async () => {
      const hashes = ['hash1', 'hash2', 'hash3']
      const cacheMap = await prefetchCache(hashes, 'text-embedding-3-small')
      expect(cacheMap.size).toBe(0)
    })

    it('should filter by model in batch prefetch', async () => {
      const text = 'multi-model batch test'
      const hash = computeContentHash(text)
      const embeddingA = generateMockEmbedding(0.1)
      const embeddingB = generateMockEmbedding(0.9)

      // Insert with two different models
      await insertTestCacheEntry(hash, embeddingA, 'model-a')
      await insertTestCacheEntry(hash, embeddingB, 'model-b')

      // Prefetch for model-a only
      const cacheMapA = await prefetchCache([hash], 'model-a')
      expect(cacheMapA.size).toBe(1)
      expect(cacheMapA.get(hash)).toEqual(embeddingA)

      // Prefetch for model-b only
      const cacheMapB = await prefetchCache([hash], 'model-b')
      expect(cacheMapB.size).toBe(1)
      expect(cacheMapB.get(hash)).toEqual(embeddingB)
    })
  })

  describe.skipIf(!isDbAvailable)('AC7: Graceful Degradation on Cache Failure', () => {
    it('should return null on database connection error during read', async () => {
      // Close the pool to simulate database unavailability
      await closeTestPool()

      const contentHash = computeContentHash('test')
      const model = 'text-embedding-3-small'

      // Should not throw, returns null gracefully
      const result = await getFromCache(contentHash, model)
      expect(result).toBeNull()

      // Recreate pool for subsequent tests
      getTestPool()
    })

    it('should not throw on database error during write', async () => {
      const contentHash = computeContentHash('write test')
      const embedding = generateMockEmbedding(0.5)
      const model = 'text-embedding-3-small'

      // Close pool to simulate unavailable database
      await closeTestPool()

      // Should not throw - graceful degradation
      await expect(saveToCache(contentHash, model, embedding)).resolves.toBeUndefined()

      // Recreate pool for subsequent tests
      getTestPool()
    })

    it('should return empty map on prefetch failure', async () => {
      const hashes = ['hash1', 'hash2']

      // Close pool to simulate failure
      await closeTestPool()

      // Should return empty map, not throw
      const cacheMap = await prefetchCache(hashes, 'text-embedding-3-small')
      expect(cacheMap.size).toBe(0)

      // Recreate pool
      getTestPool()
    })
  })

  describe.skipIf(!isDbAvailable)('Cache Performance', () => {
    it('should retrieve from cache in <50ms', async () => {
      const text = 'performance test'
      const contentHash = computeContentHash(text)
      const embedding = generateMockEmbedding(0.5)
      const model = 'text-embedding-3-small'

      // Pre-populate cache
      await insertTestCacheEntry(contentHash, embedding, model)

      // Measure cache retrieval time
      const start = Date.now()
      const result = await getFromCache(contentHash, model)
      const duration = Date.now() - start

      expect(result).toEqual(embedding)
      expect(duration).toBeLessThan(50)
    })

    it('should handle large batch prefetch efficiently', async () => {
      const count = 100
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const hashes = texts.map(computeContentHash)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.01 * i))
      const model = 'text-embedding-3-small'

      // Populate cache with all entries
      for (let i = 0; i < count; i++) {
        await insertTestCacheEntry(hashes[i], embeddings[i], model)
      }

      // Prefetch all in single query
      const start = Date.now()
      const cacheMap = await prefetchCache(hashes, model)
      const duration = Date.now() - start

      expect(cacheMap.size).toBe(count)
      expect(duration).toBeLessThan(100) // Should be fast even for 100 entries
    })
  })

  describe('Edge Cases', () => {
    it('should handle Unicode text in content hash', () => {
      const unicodeText = '你好世界 🚀 émojis'
      const hash = computeContentHash(unicodeText)

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should handle very long text in hash computation', () => {
      const longText = 'a'.repeat(10000)
      const hash = computeContentHash(longText)

      expect(hash).toHaveLength(64)
    })

    it('should handle special characters in preprocessing', () => {
      const text = '  special!@#$%^&*()  chars  '
      const result = preprocessText(text)
      expect(result).toBe('special!@#$%^&*() chars')
    })
  })
})

describe('Cache Manager - Integration Tests (Database Required)', () => {
  const isDbAvailable = !!process.env.KB_DB_PASSWORD

  beforeEach(async () => {
    if (isDbAvailable) {
      await clearEmbeddingCache()
    }
  })

  afterAll(async () => {
    if (isDbAvailable) {
      await closeTestPool()
    }
  })

  describe.skipIf(!isDbAvailable)('Cache Operations', () => {

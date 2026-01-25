/**
 * Tests for Batch Processor
 *
 * Coverage:
 * - AC3: Batch Embedding Generation
 * - AC4: Mixed Cache Hits and Misses in Batch
 * - AC10: Concurrent Request Deduplication
 * - AC13: Batch Size Handling
 *
 * @see KNOW-002 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { processBatch, processBatchWithSplitting } from '../batch-processor.js'
import type { Embedding } from '../__types__/index.js'
import {
  clearEmbeddingCache,
  closeTestPool,
  insertTestCacheEntry,
  generateMockEmbedding,
} from './setup.js'
import { computeContentHash } from '../cache-manager.js'

describe('Batch Processor - Unit Tests (No Database Required)', () => {
  describe('AC3: Batch Embedding Generation', () => {
    it('should process batch and preserve input order', async () => {
      const texts = ['alpha', 'beta', 'gamma', 'delta']
      const expectedEmbeddings = texts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))

      let callCount = 0
      const generateFn = async (text: string): Promise<Embedding> => {
        const index = texts.indexOf(text)
        return expectedEmbeddings[index]
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      // Assert: Results in same order as input
      expect(results).toHaveLength(texts.length)
      results.forEach((result, index) => {
        expect(result).toEqual(expectedEmbeddings[index])
      })
    })

    it('should handle single-item batch', async () => {
      const texts = ['single text']
      const expectedEmbedding = generateMockEmbedding(0.5)

      const generateFn = async (): Promise<Embedding> => expectedEmbedding

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(1)
      expect(results[0]).toEqual(expectedEmbedding)
    })

    it('should handle large batch (100+ items)', async () => {
      const count = 100
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.01 * i))

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        return embeddings[index]
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(count)
      results.forEach((result, index) => {
        expect(result).toEqual(embeddings[index])
      })
    })
  })

  describe('AC10: Concurrent Request Deduplication', () => {
    it('should deduplicate identical texts in batch', async () => {
      // 10 identical texts in same batch
      const texts = Array(10).fill('identical text')
      const embedding = generateMockEmbedding(0.7)

      let apiCallCount = 0
      const generateFn = async (): Promise<Embedding> => {
        apiCallCount++
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 10))
        return embedding
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      // Assert: All 10 requests receive same embedding
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toEqual(embedding)
      })

      // Assert: Only 1 API call (deduplication worked)
      expect(apiCallCount).toBe(1)
    })

    it('should deduplicate concurrent identical requests', async () => {
      const texts = ['dup-a', 'dup-b', 'dup-a', 'dup-c', 'dup-b', 'dup-a']
      const uniqueTexts = ['dup-a', 'dup-b', 'dup-c']
      const embeddings = uniqueTexts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))

      let callCounts: Record<string, number> = {}
      const generateFn = async (text: string): Promise<Embedding> => {
        callCounts[text] = (callCounts[text] || 0) + 1
        const index = uniqueTexts.indexOf(text)
        await new Promise(resolve => setTimeout(resolve, 5))
        return embeddings[index]
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      // Assert: 6 results returned
      expect(results).toHaveLength(6)

      // Assert: Only 3 unique API calls (one per unique text)
      expect(Object.keys(callCounts)).toHaveLength(3)
      expect(callCounts['dup-a']).toBe(1)
      expect(callCounts['dup-b']).toBe(1)
      expect(callCounts['dup-c']).toBe(1)

      // Assert: Correct embeddings returned in order
      expect(results[0]).toEqual(embeddings[0]) // dup-a
      expect(results[1]).toEqual(embeddings[1]) // dup-b
      expect(results[2]).toEqual(embeddings[0]) // dup-a
      expect(results[3]).toEqual(embeddings[2]) // dup-c
      expect(results[4]).toEqual(embeddings[1]) // dup-b
      expect(results[5]).toEqual(embeddings[0]) // dup-a
    })

    it('should handle deduplication with <50ms overhead', async () => {
      const texts = Array(100).fill('same text')
      const embedding = generateMockEmbedding(0.5)

      const generateFn = async (): Promise<Embedding> => embedding

      const start = Date.now()
      await processBatch(texts, 'text-embedding-3-small', generateFn)
      const duration = Date.now() - start

      // Deduplication overhead should be minimal
      expect(duration).toBeLessThan(50)
    })
  })

  describe('AC13: Batch Size Handling (Large Batches)', () => {
    it('should split batch exceeding 2048 texts', async () => {
      const count = 3000 // Exceeds 2048 limit
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.001 * i))

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        return embeddings[index]
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      // Assert: All 3000 embeddings returned
      expect(results).toHaveLength(count)

      // Assert: Results in original order
      results.forEach((result, index) => {
        expect(result).toEqual(embeddings[index])
      })
    })

    it('should not split batch under 2048 texts', async () => {
      const count = 2000 // Under limit
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.001 * i))

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        return embeddings[index]
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(count)
      results.forEach((result, index) => {
        expect(result).toEqual(embeddings[index])
      })
    })

    it('should handle exactly 2048 texts without splitting', async () => {
      const count = 2048
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.001 * i))

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        return embeddings[index]
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(count)
    })

    it('should handle very large batch (5000+ texts)', async () => {
      const count = 5000
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)

      let callCount = 0
      const generateFn = async (): Promise<Embedding> => {
        callCount++
        return generateMockEmbedding(0.5)
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(count)
      expect(callCount).toBe(count) // All generated (no cache)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty batch', async () => {
      const generateFn = async (): Promise<Embedding> => generateMockEmbedding(0.5)

      const results = await processBatch([], 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(0)
    })

    it('should handle batch with all identical texts', async () => {
      const texts = Array(50).fill('same')
      const embedding = generateMockEmbedding(0.8)

      let callCount = 0
      const generateFn = async (): Promise<Embedding> => {
        callCount++
        return embedding
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(50)
      expect(callCount).toBe(1) // Deduplication
      results.forEach(result => expect(result).toEqual(embedding))
    })

    it('should handle errors in generate function', async () => {
      const texts = ['text 1', 'text 2']

      const generateFn = async (): Promise<Embedding> => {
        throw new Error('API failure')
      }

      await expect(
        processBatch(texts, 'text-embedding-3-small', generateFn),
      ).rejects.toThrow('API failure')
    })

    it('should clean up pending requests after errors', async () => {
      const texts = ['error-text']

      const generateFn = async (): Promise<Embedding> => {
        throw new Error('Test error')
      }

      try {
        await processBatch(texts, 'text-embedding-3-small', generateFn)
      } catch {
        // Expected error
      }

      // Second attempt with same text should not reuse failed promise
      const successFn = async (): Promise<Embedding> => generateMockEmbedding(0.5)

      const results = await processBatch(texts, 'text-embedding-3-small', successFn)
      expect(results).toHaveLength(1)
    })
  })
})

describe('Batch Processor - Integration Tests (Database Required)', () => {
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

  describe.skipIf(!isDbAvailable)('AC4: Mixed Cache Hits and Misses in Batch', () => {
    it('should only generate embeddings for cache misses', async () => {
      const texts = ['cached-1', 'uncached-1', 'cached-2', 'uncached-2']
      const model = 'text-embedding-3-small'

      // Pre-populate cache with 2 entries
      const cachedEmbedding1 = generateMockEmbedding(0.1)
      const cachedEmbedding2 = generateMockEmbedding(0.2)
      await insertTestCacheEntry(computeContentHash(texts[0]), cachedEmbedding1, model)
      await insertTestCacheEntry(computeContentHash(texts[2]), cachedEmbedding2, model)

      let apiCallCount = 0
      const generateFn = async (text: string): Promise<Embedding> => {
        apiCallCount++
        // Return different embeddings for uncached texts
        return generateMockEmbedding(0.5 + apiCallCount * 0.1)
      }

      const results = await processBatch(texts, model, generateFn)

      // Assert: 4 results returned
      expect(results).toHaveLength(4)

      // Assert: Only 2 API calls (for uncached texts)
      expect(apiCallCount).toBe(2)

      // Assert: Cached embeddings returned correctly
      expect(results[0]).toEqual(cachedEmbedding1)
      expect(results[2]).toEqual(cachedEmbedding2)

      // Assert: New embeddings generated for uncached
      expect(results[1]).toHaveLength(1536)
      expect(results[3]).toHaveLength(1536)
    })

    it('should handle all cache hits', async () => {
      const texts = ['text-a', 'text-b', 'text-c']
      const model = 'text-embedding-3-small'
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))

      // Pre-populate all entries
      for (let i = 0; i < texts.length; i++) {
        await insertTestCacheEntry(computeContentHash(texts[i]), embeddings[i], model)
      }

      let apiCallCount = 0
      const generateFn = async (): Promise<Embedding> => {
        apiCallCount++
        return generateMockEmbedding(0.9)
      }

      const results = await processBatch(texts, model, generateFn)

      // Assert: All from cache, no API calls
      expect(apiCallCount).toBe(0)
      expect(results).toEqual(embeddings)
    })

    it('should handle all cache misses', async () => {
      const texts = ['new-1', 'new-2', 'new-3']
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))

      let callIndex = 0
      const generateFn = async (): Promise<Embedding> => {
        return embeddings[callIndex++]
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      expect(results).toEqual(embeddings)
      expect(callIndex).toBe(3) // All 3 generated
    })
  })

  describe('AC10: Concurrent Request Deduplication', () => {
    it('should deduplicate identical texts in batch', async () => {
      // 10 identical texts in same batch
      const texts = Array(10).fill('identical text')
      const embedding = generateMockEmbedding(0.7)

      let apiCallCount = 0
      const generateFn = async (): Promise<Embedding> => {
        apiCallCount++
        // Simulate async delay
        await new Promise(resolve => setTimeout(resolve, 10))
        return embedding
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      // Assert: All 10 requests receive same embedding
      expect(results).toHaveLength(10)
      results.forEach(result => {
        expect(result).toEqual(embedding)
      })

      // Assert: Only 1 API call (deduplication worked)
      expect(apiCallCount).toBe(1)
    })

    it('should deduplicate concurrent identical requests', async () => {
      const texts = ['dup-a', 'dup-b', 'dup-a', 'dup-c', 'dup-b', 'dup-a']
      const uniqueTexts = ['dup-a', 'dup-b', 'dup-c']
      const embeddings = uniqueTexts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))

      let callCounts: Record<string, number> = {}
      const generateFn = async (text: string): Promise<Embedding> => {
        callCounts[text] = (callCounts[text] || 0) + 1
        const index = uniqueTexts.indexOf(text)
        await new Promise(resolve => setTimeout(resolve, 5))
        return embeddings[index]
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      // Assert: 6 results returned
      expect(results).toHaveLength(6)

      // Assert: Only 3 unique API calls (one per unique text)
      expect(Object.keys(callCounts)).toHaveLength(3)
      expect(callCounts['dup-a']).toBe(1)
      expect(callCounts['dup-b']).toBe(1)
      expect(callCounts['dup-c']).toBe(1)

      // Assert: Correct embeddings returned in order
      expect(results[0]).toEqual(embeddings[0]) // dup-a
      expect(results[1]).toEqual(embeddings[1]) // dup-b
      expect(results[2]).toEqual(embeddings[0]) // dup-a
      expect(results[3]).toEqual(embeddings[2]) // dup-c
      expect(results[4]).toEqual(embeddings[1]) // dup-b
      expect(results[5]).toEqual(embeddings[0]) // dup-a
    })

    it('should handle deduplication with <50ms overhead', async () => {
      const texts = Array(100).fill('same text')
      const embedding = generateMockEmbedding(0.5)

      const generateFn = async (): Promise<Embedding> => embedding

      const start = Date.now()
      await processBatch(texts, 'text-embedding-3-small', generateFn)
      const duration = Date.now() - start

      // Deduplication overhead should be minimal
      expect(duration).toBeLessThan(50)
    })
  })

  describe('AC13: Batch Size Handling (Large Batches)', () => {
    it('should split batch exceeding 2048 texts', async () => {
      const count = 3000 // Exceeds 2048 limit
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.001 * i))

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        return embeddings[index]
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      // Assert: All 3000 embeddings returned
      expect(results).toHaveLength(count)

      // Assert: Results in original order
      results.forEach((result, index) => {
        expect(result).toEqual(embeddings[index])
      })
    })

    it('should not split batch under 2048 texts', async () => {
      const count = 2000 // Under limit
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.001 * i))

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        return embeddings[index]
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(count)
      results.forEach((result, index) => {
        expect(result).toEqual(embeddings[index])
      })
    })

    it('should handle exactly 2048 texts without splitting', async () => {
      const count = 2048
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.001 * i))

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        return embeddings[index]
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(count)
    })

    it('should handle very large batch (5000+ texts)', async () => {
      const count = 5000
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)

      let callCount = 0
      const generateFn = async (): Promise<Embedding> => {
        callCount++
        return generateMockEmbedding(0.5)
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(count)
      expect(callCount).toBe(count) // All generated (no cache)
    })
  })

  describe('Order Preservation', () => {
    it('should maintain order across cache hits and misses', async () => {
      const texts = ['a', 'b', 'c', 'd', 'e']
      const model = 'text-embedding-3-small'
      const embeddings = texts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))

      // Cache b and d
      await insertTestCacheEntry(computeContentHash(texts[1]), embeddings[1], model)
      await insertTestCacheEntry(computeContentHash(texts[3]), embeddings[3], model)

      let apiIndex = 0
      const generateFn = async (text: string): Promise<Embedding> => {
        const index = texts.indexOf(text)
        return embeddings[index]
      }

      const results = await processBatch(texts, model, generateFn)

      // Order must match input exactly
      expect(results[0]).toEqual(embeddings[0]) // a - generated
      expect(results[1]).toEqual(embeddings[1]) // b - cached
      expect(results[2]).toEqual(embeddings[2]) // c - generated
      expect(results[3]).toEqual(embeddings[3]) // d - cached
      expect(results[4]).toEqual(embeddings[4]) // e - generated
    })

    it('should maintain order when splitting large batches', async () => {
      const count = 3000
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)

      const generateFn = async (text: string): Promise<Embedding> => {
        const index = parseInt(text.split(' ')[1])
        // Use index as embedding seed for verification
        return generateMockEmbedding(index / count)
      }

      const results = await processBatchWithSplitting(texts, 'text-embedding-3-small', generateFn)

      // Verify order is preserved
      for (let i = 0; i < count; i++) {
        const expectedSeed = i / count
        const expectedEmbedding = generateMockEmbedding(expectedSeed)
        expect(results[i]).toEqual(expectedEmbedding)
      }
    })
  })

  describe('Performance', () => {
    it('should process large batch efficiently', async () => {
      const count = 1000
      const texts = Array.from({ length: count }, (_, i) => `text ${i}`)
      const embedding = generateMockEmbedding(0.5)

      const generateFn = async (): Promise<Embedding> => embedding

      const start = Date.now()
      await processBatch(texts, 'text-embedding-3-small', generateFn)
      const duration = Date.now() - start

      // Should be fast with parallel processing
      expect(duration).toBeLessThan(1000) // Less than 1 second for 1000 items
    })

    it('should handle prefetch efficiently for large batch', async () => {
      const count = 500
      const texts = Array.from({ length: count }, (_, i) => `cached ${i}`)
      const model = 'text-embedding-3-small'

      // Pre-populate all in cache
      for (let i = 0; i < count; i++) {
        await insertTestCacheEntry(
          computeContentHash(texts[i]),
          generateMockEmbedding(0.01 * i),
          model,
        )
      }

      const generateFn = async (): Promise<Embedding> => {
        throw new Error('Should not be called - all cached')
      }

      const start = Date.now()
      const results = await processBatch(texts, model, generateFn)
      const duration = Date.now() - start

      expect(results).toHaveLength(count)
      // Prefetch should be fast even for 500 items
      expect(duration).toBeLessThan(200)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty batch', async () => {
      const generateFn = async (): Promise<Embedding> => generateMockEmbedding(0.5)

      const results = await processBatch([], 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(0)
    })

    it('should handle batch with all identical texts', async () => {
      const texts = Array(50).fill('same')
      const embedding = generateMockEmbedding(0.8)

      let callCount = 0
      const generateFn = async (): Promise<Embedding> => {
        callCount++
        return embedding
      }

      const results = await processBatch(texts, 'text-embedding-3-small', generateFn)

      expect(results).toHaveLength(50)
      expect(callCount).toBe(1) // Deduplication
      results.forEach(result => expect(result).toEqual(embedding))
    })

    it('should handle errors in generate function', async () => {
      const texts = ['text 1', 'text 2']

      const generateFn = async (): Promise<Embedding> => {
        throw new Error('API failure')
      }

      await expect(
        processBatch(texts, 'text-embedding-3-small', generateFn),
      ).rejects.toThrow('API failure')
    })

    it('should clean up pending requests after errors', async () => {
      const texts = ['error-text']

      const generateFn = async (): Promise<Embedding> => {
        throw new Error('Test error')
      }

      try {
        await processBatch(texts, 'text-embedding-3-small', generateFn)
      } catch {
        // Expected error
      }

      // Second attempt with same text should not reuse failed promise
      const successFn = async (): Promise<Embedding> => generateMockEmbedding(0.5)

      const results = await processBatch(texts, 'text-embedding-3-small', successFn)
      expect(results).toHaveLength(1)
    })
  })
})

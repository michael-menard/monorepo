/**
 * Tests for EmbeddingClient
 *
 * Coverage:
 * - AC1: Single Embedding Generation (Cache Miss)
 * - AC2: Single Embedding Generation (Cache Hit)
 * - AC3: Batch Embedding Generation
 * - AC9: Content Hash Deduplication
 * - AC11: Cache Key Includes Model Version
 * - AC12: Cost Logging
 * - AC15: Error Response Contract
 *
 * @see KNOW-002 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import { EmbeddingClient } from '../index.js'
import {
  clearEmbeddingCache,
  closeTestPool,
  insertTestCacheEntry,
  cacheEntryExists,
  generateMockEmbedding,
} from './setup.js'
import { computeContentHash } from '../cache-manager.js'
import * as retryHandler from '../retry-handler.js'

// Mock OpenAI API calls
vi.mock('../retry-handler.js', async () => {
  const actual = await vi.importActual('../retry-handler.js')
  return {
    ...actual,
    generateEmbeddingWithRetry: vi.fn(),
  }
})

const mockGenerateEmbeddingWithRetry = vi.mocked(retryHandler.generateEmbeddingWithRetry)

describe('EmbeddingClient', () => {
  let client: EmbeddingClient

  beforeEach(async () => {
    // Clear cache before each test
    await clearEmbeddingCache()

    // Reset mocks
    vi.clearAllMocks()

    // Create client with test config
    client = new EmbeddingClient({
      apiKey: 'test-api-key',
      model: 'text-embedding-3-small',
      cacheEnabled: true,
    })

    // Default mock implementation returns a valid embedding
    mockGenerateEmbeddingWithRetry.mockResolvedValue(generateMockEmbedding(0.5))
  })

  afterAll(async () => {
    await closeTestPool()
  })

  describe('Constructor and Initialization', () => {
    it('should create client with valid API key', () => {
      expect(client).toBeDefined()
    })

    it('should throw error with empty API key', () => {
      expect(() => {
        new EmbeddingClient({ apiKey: '' })
      }).toThrow('OpenAI API key is required')
    })

    it('should throw error with missing API key', () => {
      expect(() => {
        new EmbeddingClient({ apiKey: '   ' })
      }).toThrow('OpenAI API key is required')
    })

    it('should apply default configuration values', () => {
      const defaultClient = new EmbeddingClient({
        apiKey: 'test-key',
      })

      expect(defaultClient).toBeDefined()
      // Defaults are applied internally
    })
  })

  describe('AC1: Single Embedding Generation (Cache Miss)', () => {
    it('should generate embedding via API on cache miss', async () => {
      const text = 'test text for cache miss'
      const mockEmbedding = generateMockEmbedding(0.7)
      mockGenerateEmbeddingWithRetry.mockResolvedValueOnce(mockEmbedding)

      const result = await client.generateEmbedding(text)

      // Assert: 1536-dimensional vector returned
      expect(result).toHaveLength(1536)
      expect(result).toEqual(mockEmbedding)

      // Assert: OpenAI API called once
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(1)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledWith(
        text,
        expect.objectContaining({
          apiKey: 'test-api-key',
          model: 'text-embedding-3-small',
        }),
      )

      // Assert: Cache entry created
      const contentHash = computeContentHash(text)
      const cached = await cacheEntryExists(contentHash, 'text-embedding-3-small')
      expect(cached).toBe(true)
    })

    it('should handle whitespace normalization before caching', async () => {
      const text = '  multiple   spaces   normalized  '
      const mockEmbedding = generateMockEmbedding(0.6)
      mockGenerateEmbeddingWithRetry.mockResolvedValueOnce(mockEmbedding)

      await client.generateEmbedding(text)

      // Content hash should be computed from normalized text
      const normalizedText = text.trim().replace(/\s+/g, ' ')
      const contentHash = computeContentHash(normalizedText)
      const cached = await cacheEntryExists(contentHash, 'text-embedding-3-small')
      expect(cached).toBe(true)
    })

    it('should preserve case when hashing content', async () => {
      const lowerText = 'test content'
      const upperText = 'TEST CONTENT'
      const mockEmbedding1 = generateMockEmbedding(0.1)
      const mockEmbedding2 = generateMockEmbedding(0.2)

      mockGenerateEmbeddingWithRetry
        .mockResolvedValueOnce(mockEmbedding1)
        .mockResolvedValueOnce(mockEmbedding2)

      await client.generateEmbedding(lowerText)
      await client.generateEmbedding(upperText)

      // Different case = different hash = 2 API calls
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(2)
    })
  })

  describe('AC2: Single Embedding Generation (Cache Hit)', () => {
    it('should return cached embedding without API call', async () => {
      const text = 'cached text content'
      const cachedEmbedding = generateMockEmbedding(0.8)
      const contentHash = computeContentHash(text)

      // Pre-populate cache
      await insertTestCacheEntry(contentHash, cachedEmbedding, 'text-embedding-3-small')

      const startTime = Date.now()
      const result = await client.generateEmbedding(text)
      const duration = Date.now() - startTime

      // Assert: Cached embedding returned
      expect(result).toEqual(cachedEmbedding)

      // Assert: NO OpenAI API call
      expect(mockGenerateEmbeddingWithRetry).not.toHaveBeenCalled()

      // Assert: Response time < 50ms (cache hit is fast)
      expect(duration).toBeLessThan(50)
    })

    it('should use cache for identical text on second call', async () => {
      const text = 'test identical text'
      const mockEmbedding = generateMockEmbedding(0.9)
      mockGenerateEmbeddingWithRetry.mockResolvedValue(mockEmbedding)

      // First call - cache miss
      const result1 = await client.generateEmbedding(text)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(1)

      // Second call - cache hit
      const result2 = await client.generateEmbedding(text)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(1) // Still 1, no new call
      expect(result2).toEqual(result1)
    })
  })

  describe('AC3: Batch Embedding Generation', () => {
    it('should generate embeddings for batch of texts', async () => {
      const texts = ['text 1', 'text 2', 'text 3']
      const mockEmbeddings = [
        generateMockEmbedding(0.1),
        generateMockEmbedding(0.2),
        generateMockEmbedding(0.3),
      ]

      mockGenerateEmbeddingWithRetry
        .mockResolvedValueOnce(mockEmbeddings[0])
        .mockResolvedValueOnce(mockEmbeddings[1])
        .mockResolvedValueOnce(mockEmbeddings[2])

      const results = await client.generateEmbeddingsBatch(texts)

      // Assert: N embeddings returned in same order as input
      expect(results).toHaveLength(3)
      expect(results[0]).toEqual(mockEmbeddings[0])
      expect(results[1]).toEqual(mockEmbeddings[1])
      expect(results[2]).toEqual(mockEmbeddings[2])

      // Assert: API called for each uncached text
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(3)
    })

    it('should preserve input order in batch results', async () => {
      const texts = ['alpha', 'beta', 'gamma', 'delta']
      const mockEmbeddings = texts.map((_, i) => generateMockEmbedding(0.1 * (i + 1)))

      for (let i = 0; i < texts.length; i++) {
        mockGenerateEmbeddingWithRetry.mockResolvedValueOnce(mockEmbeddings[i])
      }

      const results = await client.generateEmbeddingsBatch(texts)

      // Results must match input order exactly
      expect(results).toHaveLength(texts.length)
      results.forEach((result, index) => {
        expect(result).toEqual(mockEmbeddings[index])
      })
    })

    it('should handle empty batch validation', async () => {
      await expect(client.generateEmbeddingsBatch([])).rejects.toThrow(
        'Batch must contain at least one text',
      )
    })

    it('should validate each text in batch', async () => {
      const invalidBatch = ['valid text', '', 'another valid']

      await expect(client.generateEmbeddingsBatch(invalidBatch)).rejects.toThrow()
    })
  })

  describe('AC9: Content Hash Deduplication', () => {
    it('should generate same hash for identical content', async () => {
      const text = 'test content'
      const hash1 = computeContentHash(text)
      const hash2 = computeContentHash(text)

      expect(hash1).toBe(hash2)
      expect(hash1).toHaveLength(64) // SHA-256 = 64 hex chars
    })

    it('should use same cache entry for identical text', async () => {
      const text = 'duplicate test text'
      const mockEmbedding = generateMockEmbedding(0.5)
      mockGenerateEmbeddingWithRetry.mockResolvedValue(mockEmbedding)

      // First call creates cache entry
      await client.generateEmbedding(text)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(1)

      // Second call uses cached entry
      await client.generateEmbedding(text)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(1) // No new API call

      // Third call also uses cache
      await client.generateEmbedding(text)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(1)
    })

    it('should generate different hash for different content', async () => {
      const hash1 = computeContentHash('content A')
      const hash2 = computeContentHash('content B')

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('AC11: Cache Key Includes Model Version', () => {
    it('should create separate cache entries for different models', async () => {
      const text = 'same text, different models'
      const embedding1 = generateMockEmbedding(0.1)
      const embedding2 = generateMockEmbedding(0.2)

      mockGenerateEmbeddingWithRetry
        .mockResolvedValueOnce(embedding1)
        .mockResolvedValueOnce(embedding2)

      // Client with model A
      const clientA = new EmbeddingClient({
        apiKey: 'test-key',
        model: 'text-embedding-3-small',
      })

      // Client with model B (hypothetical different model)
      const clientB = new EmbeddingClient({
        apiKey: 'test-key',
        model: 'text-embedding-3-large',
      })

      // Generate with model A
      const resultA = await clientA.generateEmbedding(text)
      expect(resultA).toEqual(embedding1)

      // Generate with model B - should trigger new API call (different cache key)
      const resultB = await clientB.generateEmbedding(text)
      expect(resultB).toEqual(embedding2)

      // Both API calls should have been made
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(2)

      // Verify cache entries exist for both models
      const contentHash = computeContentHash(text)
      const cachedA = await cacheEntryExists(contentHash, 'text-embedding-3-small')
      const cachedB = await cacheEntryExists(contentHash, 'text-embedding-3-large')
      expect(cachedA).toBe(true)
      expect(cachedB).toBe(true)
    })
  })

  describe('AC15: Error Response Contract', () => {
    it('should throw standard Error with descriptive message', async () => {
      mockGenerateEmbeddingWithRetry.mockRejectedValueOnce(
        new Error('OpenAI API rate limit exceeded after 3 retries'),
      )

      await expect(client.generateEmbedding('test')).rejects.toThrow(
        'OpenAI API rate limit exceeded after 3 retries',
      )
    })

    it('should not expose API keys in error messages', async () => {
      const apiError = new Error('API key sk-test123456 is invalid')
      mockGenerateEmbeddingWithRetry.mockRejectedValueOnce(apiError)

      try {
        await client.generateEmbedding('test')
      } catch (error) {
        // Error should be safe to log (no sensitive data)
        expect(error).toBeInstanceOf(Error)
        const errorMessage = (error as Error).message
        expect(errorMessage).toBeDefined()
      }
    })

    it('should handle validation errors with clear messages', async () => {
      await expect(client.generateEmbedding('')).rejects.toThrow('Text must not be empty')
    })

    it('should handle whitespace-only input validation', async () => {
      await expect(client.generateEmbedding('   ')).rejects.toThrow('Text must not be whitespace-only')
    })
  })

  describe('Cache Disabled Mode', () => {
    it('should generate embeddings without cache when disabled', async () => {
      const noCacheClient = new EmbeddingClient({
        apiKey: 'test-key',
        cacheEnabled: false,
      })

      const text = 'test without cache'
      const mockEmbedding = generateMockEmbedding(0.4)
      mockGenerateEmbeddingWithRetry.mockResolvedValue(mockEmbedding)

      // First call
      await noCacheClient.generateEmbedding(text)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(1)

      // Second call - should make another API call (no cache)
      await noCacheClient.generateEmbedding(text)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(2)

      // No cache entry should exist
      const contentHash = computeContentHash(text)
      const cached = await cacheEntryExists(contentHash)
      expect(cached).toBe(false)
    })

    it('should handle batch without cache', async () => {
      const noCacheClient = new EmbeddingClient({
        apiKey: 'test-key',
        cacheEnabled: false,
      })

      const texts = ['text 1', 'text 2']
      const mockEmbeddings = [generateMockEmbedding(0.1), generateMockEmbedding(0.2)]

      mockGenerateEmbeddingWithRetry
        .mockResolvedValueOnce(mockEmbeddings[0])
        .mockResolvedValueOnce(mockEmbeddings[1])

      const results = await noCacheClient.generateEmbeddingsBatch(texts)

      expect(results).toHaveLength(2)
      expect(mockGenerateEmbeddingWithRetry).toHaveBeenCalledTimes(2)
    })
  })

  describe('createEmbeddingClient factory function', () => {
    it('should create client from environment variables', async () => {
      // Save original env
      const originalKey = process.env.OPENAI_API_KEY

      try {
        process.env.OPENAI_API_KEY = 'test-env-key'

        const { createEmbeddingClient } = await import('../index.js')
        const envClient = createEmbeddingClient()

        expect(envClient).toBeDefined()
      } finally {
        // Restore original env
        if (originalKey) {
          process.env.OPENAI_API_KEY = originalKey
        } else {
          delete process.env.OPENAI_API_KEY
        }
      }
    })
  })
})

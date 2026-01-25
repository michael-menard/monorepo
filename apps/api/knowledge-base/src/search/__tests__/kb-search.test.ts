/**
 * kb_search Integration Tests
 *
 * Tests for the main search function including hybrid search flow,
 * fallback behavior, and input validation.
 *
 * @see KNOW-004 AC1, AC2, AC3 for acceptance criteria
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'
import { kb_search } from '../kb-search.js'
import { createMockEmbeddingClient, createMockEmbedding } from './test-helpers.js'

// Mock dependencies
vi.mock('../semantic.js', () => ({
  semanticSearch: vi.fn(),
}))

vi.mock('../keyword.js', () => ({
  keywordSearch: vi.fn(),
}))

import { semanticSearch } from '../semantic.js'
import { keywordSearch } from '../keyword.js'

const mockSemanticSearch = vi.mocked(semanticSearch)
const mockKeywordSearch = vi.mocked(keywordSearch)

describe('kb_search', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('input validation', () => {
    it('should reject empty query string', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      await expect(
        kb_search({ query: '' }, { db: mockDb, embeddingClient: mockClient as any }),
      ).rejects.toThrow(ZodError)
    })

    it('should reject invalid role', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      await expect(
        kb_search(
          { query: 'test', role: 'invalid' as any },
          { db: mockDb, embeddingClient: mockClient as any },
        ),
      ).rejects.toThrow(ZodError)
    })

    it('should reject limit greater than max', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      await expect(
        kb_search(
          { query: 'test', limit: 100 },
          { db: mockDb, embeddingClient: mockClient as any },
        ),
      ).rejects.toThrow(ZodError)
    })

    it('should apply default limit when not specified', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([])
      mockKeywordSearch.mockResolvedValue([])

      const result = await kb_search(
        { query: 'test' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      expect(result.results).toHaveLength(0)
      // Default limit is 10, but since no results, we just verify no error
    })
  })

  describe('hybrid search flow', () => {
    it('should execute both semantic and keyword search', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([
        {
          id: 'semantic-1',
          content: 'Semantic result',
          role: 'dev',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 0.9,
        },
      ])

      mockKeywordSearch.mockResolvedValue([
        {
          id: 'keyword-1',
          content: 'Keyword result',
          role: 'dev',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 0.5,
        },
      ])

      const result = await kb_search(
        { query: 'test query' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      // Should have called both search functions
      expect(mockClient.generateEmbedding).toHaveBeenCalledWith('test query')
      expect(mockSemanticSearch).toHaveBeenCalled()
      expect(mockKeywordSearch).toHaveBeenCalled()

      // Should return merged results
      expect(result.results.length).toBeGreaterThan(0)
      expect(result.metadata.fallback_mode).toBe(false)
      expect(result.metadata.search_modes_used).toContain('semantic')
      expect(result.metadata.search_modes_used).toContain('keyword')
    })

    it('should merge and rank results correctly', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      const now = new Date()

      // Entry A appears in both, should rank highest
      mockSemanticSearch.mockResolvedValue([
        {
          id: 'A',
          content: 'Entry A',
          role: 'dev',
          tags: [],
          createdAt: now,
          updatedAt: now,
          score: 0.9,
        },
        {
          id: 'B',
          content: 'Entry B',
          role: 'dev',
          tags: [],
          createdAt: now,
          updatedAt: now,
          score: 0.8,
        },
      ])

      mockKeywordSearch.mockResolvedValue([
        {
          id: 'A',
          content: 'Entry A',
          role: 'dev',
          tags: [],
          createdAt: now,
          updatedAt: now,
          score: 0.5,
        },
        {
          id: 'C',
          content: 'Entry C',
          role: 'dev',
          tags: [],
          createdAt: now,
          updatedAt: now,
          score: 0.4,
        },
      ])

      const result = await kb_search(
        { query: 'test' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      // A should be first (in both)
      expect(result.results[0].id).toBe('A')

      // Should have 3 unique entries
      expect(result.results).toHaveLength(3)
    })
  })

  describe('fallback behavior', () => {
    it('should fallback to keyword-only when embedding fails', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient({ shouldFail: true })

      mockKeywordSearch.mockResolvedValue([
        {
          id: 'keyword-1',
          content: 'Keyword result',
          role: 'dev',
          tags: ['test'],
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 0.5,
        },
      ])

      const result = await kb_search(
        { query: 'test query' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      // Should not call semantic search
      expect(mockSemanticSearch).not.toHaveBeenCalled()

      // Should have fallback mode set
      expect(result.metadata.fallback_mode).toBe(true)
      expect(result.metadata.search_modes_used).toEqual(['keyword'])

      // Should still return keyword results
      expect(result.results).toHaveLength(1)
      expect(result.results[0].id).toBe('keyword-1')
    })

    it('should include keyword_score only in fallback mode', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient({ shouldFail: true })

      mockKeywordSearch.mockResolvedValue([
        {
          id: 'keyword-1',
          content: 'Keyword result',
          role: 'dev',
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          score: 0.5,
        },
      ])

      const result = await kb_search(
        { query: 'test' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      // In fallback mode, only keyword_score should be set
      expect(result.results[0].keyword_score).toBe(0.5)
      expect(result.results[0].semantic_score).toBeUndefined()
    })
  })

  describe('metadata', () => {
    it('should include query_time_ms in metadata', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([])
      mockKeywordSearch.mockResolvedValue([])

      const result = await kb_search(
        { query: 'test' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      expect(result.metadata.query_time_ms).toBeGreaterThanOrEqual(0)
    })

    it('should include total count before limit', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      // Return more results than the limit
      const manyResults = Array.from({ length: 20 }, (_, i) => ({
        id: `entry-${i}`,
        content: `Entry ${i}`,
        role: 'dev' as const,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        score: 0.9 - i * 0.01,
      }))

      mockSemanticSearch.mockResolvedValue(manyResults)
      mockKeywordSearch.mockResolvedValue([])

      const result = await kb_search(
        { query: 'test', limit: 5 },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      expect(result.results).toHaveLength(5)
      expect(result.metadata.total).toBe(20)
    })

    it('should include debug_info when explain=true', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([])
      mockKeywordSearch.mockResolvedValue([])

      const result = await kb_search(
        { query: 'test', explain: true },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      expect(result.metadata.debug_info).toBeDefined()
      expect(result.metadata.debug_info!.embedding_ms).toBeDefined()
      expect(result.metadata.debug_info!.semantic_ms).toBeDefined()
      expect(result.metadata.debug_info!.keyword_ms).toBeDefined()
      expect(result.metadata.debug_info!.rrf_ms).toBeDefined()
    })

    it('should not include debug_info when explain is not set', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([])
      mockKeywordSearch.mockResolvedValue([])

      const result = await kb_search(
        { query: 'test' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      expect(result.metadata.debug_info).toBeUndefined()
    })
  })

  describe('filter passing', () => {
    it('should pass filters to search functions', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([])
      mockKeywordSearch.mockResolvedValue([])

      await kb_search(
        {
          query: 'test',
          role: 'dev',
          tags: ['typescript', 'best-practice'],
          min_confidence: 0.5,
        },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      // Verify filters were passed to semantic search
      expect(mockSemanticSearch).toHaveBeenCalledWith(
        mockDb,
        expect.any(Array),
        expect.objectContaining({
          role: 'dev',
          tags: ['typescript', 'best-practice'],
          min_confidence: 0.5,
        }),
        expect.any(Number),
      )

      // Verify filters were passed to keyword search
      expect(mockKeywordSearch).toHaveBeenCalledWith(
        mockDb,
        'test',
        expect.objectContaining({
          role: 'dev',
          tags: ['typescript', 'best-practice'],
          min_confidence: 0.5,
        }),
        expect.any(Number),
      )
    })
  })

  describe('edge cases', () => {
    it('should handle empty results from both searches', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([])
      mockKeywordSearch.mockResolvedValue([])

      const result = await kb_search(
        { query: 'no matches' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      expect(result.results).toHaveLength(0)
      expect(result.metadata.total).toBe(0)
      expect(result.metadata.fallback_mode).toBe(false)
    })

    it('should handle special characters in query', async () => {
      const mockDb = {} as Parameters<typeof kb_search>[1]['db']
      const mockClient = createMockEmbeddingClient()

      mockSemanticSearch.mockResolvedValue([])
      mockKeywordSearch.mockResolvedValue([])

      // Should not throw
      const result = await kb_search(
        { query: 'How to use $regex like .*test.* in [brackets]?' },
        { db: mockDb, embeddingClient: mockClient as any },
      )

      expect(result).toBeDefined()
    })
  })
})

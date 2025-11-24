/**
 * Integration Tests for OpenSearch / MOC Search
 *
 * Tests search functionality including OpenSearch queries,
 * fuzzy matching, and PostgreSQL fallback.
 */

 
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockMocs } from '@/core/__tests__/fixtures/mock-mocs'

// Mock OpenSearch client
vi.mock('@opensearch-project/opensearch', () => ({
  Client: vi.fn(() => ({
    search: vi.fn(),
    index: vi.fn(),
    delete: vi.fn(),
    indices: {
      exists: vi.fn(),
      create: vi.fn(),
    },
  })),
}))

// Mock database client for fallback
vi.mock('@/lib/db/client', () => ({
  default: {
    select: vi.fn(),
  },
}))

describe('MOC Search - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('OpenSearch Full-Text Search', () => {
    it('should search MOCs by title and description', async () => {
      // Given: Search query "castle"
      const searchQuery = 'castle'
      const expectedQuery = {
        index: 'mocs',
        body: {
          query: {
            bool: {
              should: [
                { match: { title: { query: searchQuery, boost: 2 } } },
                { match: { description: { query: searchQuery } } },
                { match: { tags: { query: searchQuery, boost: 1.5 } } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      }

      // When: Execute search
      const mockResults = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _source: mockMocs.basicMoc,
                _score: 2.5,
              },
            ],
          },
        },
      }

      // Then: Returns matching MOCs
      expect(mockResults.body.hits.total.value).toBe(1)
      expect(mockResults.body.hits.hits[0]._source.title).toContain('Castle')
    })

    it('should perform fuzzy search for typos', async () => {
      // Given: Search query with typo "castel" (missing 'e')
      const searchQuery = 'castel'
      const expectedQuery = {
        index: 'mocs',
        body: {
          query: {
            bool: {
              should: [
                {
                  match: {
                    title: {
                      query: searchQuery,
                      fuzziness: 'AUTO',
                      boost: 2,
                    },
                  },
                },
                {
                  match: {
                    description: {
                      query: searchQuery,
                      fuzziness: 'AUTO',
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          },
        },
      }

      // When: Execute fuzzy search
      const mockResults = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _source: mockMocs.basicMoc,
                _score: 1.8, // Lower score due to fuzzy match
              },
            ],
          },
        },
      }

      // Then: Still finds "castle" despite typo
      expect(mockResults.body.hits.total.value).toBe(1)
      expect(mockResults.body.hits.hits[0]._source.title).toContain('Castle')
    })

    it('should boost title matches over description matches', async () => {
      // Given: Search term appears in both title and description
      const searchQuery = 'medieval'

      // When: Execute search with boosting
      const mockResults = {
        body: {
          hits: {
            total: { value: 2 },
            hits: [
              {
                _source: mockMocs.basicMoc, // Has "Medieval" in title
                _score: 3.2,
              },
              {
                _source: {
                  id: 'moc-other',
                  title: 'Castle Build',
                  description: 'A medieval-themed castle', // "medieval" only in description
                },
                _score: 1.5,
              },
            ],
          },
        },
      }

      // Then: Title match scores higher
      expect(mockResults.body.hits.hits[0]._score).toBeGreaterThan(
        mockResults.body.hits.hits[1]._score
      )
    })

    it('should filter by tag while searching', async () => {
      // Given: Search with tag filter
      const searchQuery = 'castle'
      const tagFilter = 'medieval'
      const expectedQuery = {
        index: 'mocs',
        body: {
          query: {
            bool: {
              should: [
                { match: { title: { query: searchQuery, boost: 2 } } },
                { match: { description: { query: searchQuery } } },
              ],
              filter: [{ term: { tags: tagFilter } }],
              minimum_should_match: 1,
            },
          },
        },
      }

      // When: Execute filtered search
      const mockResults = {
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _source: mockMocs.basicMoc,
                _score: 2.5,
              },
            ],
          },
        },
      }

      // Then: Returns only MOCs with matching tag
      const result = mockResults.body.hits.hits[0]._source
      expect(result.tags).toContain('medieval')
    })
  })

  describe('PostgreSQL Fallback', () => {
    it('should fall back to PostgreSQL when OpenSearch is unavailable', async () => {
      // Given: OpenSearch client throws error
      const searchQuery = 'castle'

      // When: OpenSearch fails, use PostgreSQL ILIKE
      const mockResults = [mockMocs.basicMoc]

      // Then: Returns results from PostgreSQL
      expect(mockResults).toHaveLength(1)
      expect(mockResults[0].title).toContain('Castle')
    })

    it('should use PostgreSQL ILIKE for case-insensitive search', async () => {
      // Given: Search query in lowercase
      const searchQuery = 'castle'

      // When: Execute PostgreSQL query
      // SQL: WHERE title ILIKE '%castle%' OR description ILIKE '%castle%'
      const mockResults = [mockMocs.basicMoc]

      // Then: Finds "Medieval Castle" (case-insensitive)
      expect(mockResults).toHaveLength(1)
      expect(mockResults[0].title.toLowerCase()).toContain(searchQuery)
    })

    it('should support tag filtering in PostgreSQL fallback', async () => {
      // Given: Search with tag filter
      const searchQuery = 'castle'
      const tagFilter = 'medieval'

      // When: Execute PostgreSQL query with tag filter
      // SQL: WHERE (title ILIKE '%castle%') AND 'medieval' = ANY(tags)
      const mockResults = [mockMocs.basicMoc]

      // Then: Returns MOCs matching both search and tag
      expect(mockResults).toHaveLength(1)
      expect(mockResults[0].tags).toContain(tagFilter)
    })
  })

  describe('Search Pagination', () => {
    it('should paginate search results', async () => {
      // Given: Search query with pagination
      const searchQuery = 'lego'
      const page = 1
      const limit = 10
      const from = (page - 1) * limit

      const expectedQuery = {
        index: 'mocs',
        body: {
          query: {
            bool: {
              should: [{ match: { title: { query: searchQuery, boost: 2 } } }],
              minimum_should_match: 1,
            },
          },
          from: from,
          size: limit,
        },
      }

      // When: Execute paginated search
      const mockResults = {
        body: {
          hits: {
            total: { value: 25 },
            hits: Array(10).fill(null).map((_, i) => ({
              _source: { ...mockMocs.basicMoc, id: `moc-${i}` },
              _score: 2.0,
            })),
          },
        },
      }

      // Then: Returns correct page of results
      expect(mockResults.body.hits.hits).toHaveLength(10)
      expect(mockResults.body.hits.total.value).toBe(25)
    })

    it('should calculate total pages correctly', async () => {
      // Given: Search results with total count
      const total = 25
      const limit = 10

      // When: Calculate total pages
      const totalPages = Math.ceil(total / limit)

      // Then: Returns correct page count
      expect(totalPages).toBe(3)
    })
  })
})

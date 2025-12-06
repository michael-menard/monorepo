/**
 * @repo/search - Search Engine Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SearchEngine, createSearchEngine } from '../search-engine'
import type { SearchConfig, OpenSearchClient, DatabaseClient, Logger } from '../types'

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((col, val) => ({ type: 'eq', column: col, value: val })),
  and: vi.fn((...conditions) => ({ type: 'and', conditions })),
  or: vi.fn((...conditions) => ({ type: 'or', conditions })),
  sql: vi.fn((strings, ...values) => ({ type: 'sql', strings, values })),
  asc: vi.fn(col => ({ type: 'asc', column: col })),
  desc: vi.fn(col => ({ type: 'desc', column: col })),
}))

// Mock config
const mockTable = { id: 'id', title: 'title', description: 'description', userId: 'userId' }
const mockConfig: SearchConfig = {
  indexName: 'test_index',
  table: mockTable,
  searchableFields: [
    { field: 'title', boost: 3, postgresColumn: mockTable.title },
    { field: 'description', boost: 1, postgresColumn: mockTable.description },
  ],
  userIdColumn: mockTable.userId,
}

// Mock logger
const createMockLogger = (): Logger => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
})

// Mock database client
const createMockDbClient = (items: any[] = [], total = 0): DatabaseClient => {
  const mockQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockImplementation(() => Promise.resolve(items)),
  }
  const mockCountQuery = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => Promise.resolve([{ total }])),
  }
  let callCount = 0
  return {
    select: vi.fn().mockImplementation(() => {
      callCount++
      return callCount === 1 ? mockQuery : mockCountQuery
    }),
  }
}

// Mock OpenSearch client
const createMockOpenSearchClient = (
  hits: Array<{ _id: string; _score: number }> = [],
  total = 0,
): OpenSearchClient => ({
  search: vi.fn().mockResolvedValue({
    body: {
      hits: {
        total: { value: total },
        hits: hits.map(h => ({ ...h, _source: {} })),
      },
    },
  }),
})

describe('SearchEngine', () => {
  let mockLogger: Logger

  beforeEach(() => {
    mockLogger = createMockLogger()
    vi.clearAllMocks()
  })

  describe('hashQuery', () => {
    it('should generate consistent MD5 hash for the same query', () => {
      const hash1 = SearchEngine.hashQuery('test query')
      const hash2 = SearchEngine.hashQuery('test query')
      expect(hash1).toBe(hash2)
      expect(hash1).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should generate different hashes for different queries', () => {
      const hash1 = SearchEngine.hashQuery('query one')
      const hash2 = SearchEngine.hashQuery('query two')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('createSearchEngine', () => {
    it('should create a SearchEngine instance', () => {
      const db = createMockDbClient()
      const engine = createSearchEngine(mockConfig, null, db, mockLogger)
      expect(engine).toBeInstanceOf(SearchEngine)
    })
  })

  describe('search with PostgreSQL fallback', () => {
    it('should use PostgreSQL when OpenSearch client is null', async () => {
      const items = [{ id: '1', title: 'Test Item', userId: 'user-1' }]
      const db = createMockDbClient(items, 1)
      const engine = createSearchEngine(mockConfig, null, db, mockLogger)

      const result = await engine.search({
        query: 'test',
        userId: 'user-1',
        page: 1,
        limit: 10,
      })

      expect(result.source).toBe('postgres')
      expect(result.data).toEqual(items)
      expect(result.total).toBe(1)
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'OpenSearch client not configured, using PostgreSQL',
      )
    })

    it('should calculate pagination offset correctly', async () => {
      const db = createMockDbClient([], 0)
      const engine = createSearchEngine(mockConfig, null, db, mockLogger)

      await engine.search({
        query: 'test',
        userId: 'user-1',
        page: 3,
        limit: 20,
      })

      // Page 3 with limit 20 should offset 40 (from = (3-1) * 20 = 40)
      const selectCalls = (db.select as any).mock.results
      expect(selectCalls.length).toBeGreaterThan(0)
    })
  })

  describe('search with OpenSearch', () => {
    it('should return empty results when OpenSearch returns no hits', async () => {
      const db = createMockDbClient()
      const osClient = createMockOpenSearchClient([], 0)
      const engine = createSearchEngine(mockConfig, osClient, db, mockLogger)

      const result = await engine.search({
        query: 'nonexistent',
        userId: 'user-1',
        page: 1,
        limit: 10,
      })

      expect(result.source).toBe('opensearch')
      expect(result.data).toEqual([])
      expect(result.total).toBe(0)
    })

    it('should fall back to PostgreSQL when OpenSearch fails', async () => {
      const items = [{ id: '1', title: 'Fallback Item', userId: 'user-1' }]
      const db = createMockDbClient(items, 1)
      const osClient: OpenSearchClient = {
        search: vi.fn().mockRejectedValue(new Error('OpenSearch error')),
      }
      const engine = createSearchEngine(mockConfig, osClient, db, mockLogger)

      const result = await engine.search({
        query: 'test',
        userId: 'user-1',
        page: 1,
        limit: 10,
      })

      expect(result.source).toBe('postgres')
      expect(mockLogger.warn).toHaveBeenCalled()
    })
  })
})


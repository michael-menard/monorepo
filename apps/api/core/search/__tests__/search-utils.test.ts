/**
 * Unit Tests for Search Utility Functions
 * Story 3.8: Gallery and Wishlist Search
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { searchGalleryImages, searchWishlistItems, hashQuery } from '../search-utils'
import * as opensearchClient from '../opensearch-client'
import * as dbClient from '@/core/database/client'

// Mock dependencies
vi.mock('../opensearch-client')
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  },
}))
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

describe('searchGalleryImages', () => {
  const mockUserId = 'user-123'
  const mockQuery = 'lego castle'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should search via OpenSearch and return results with scores', async () => {
    // Mock OpenSearch client
    const mockOpenSearchClient = {
      search: vi.fn().mockResolvedValue({
        body: {
          hits: {
            total: { value: 2 },
            hits: [
              {
                _id: 'image-1',
                _score: 2.5,
                _source: {
                  userId: mockUserId,
                  title: 'LEGO Castle',
                  description: 'Medieval castle',
                  tags: ['castle', 'medieval'],
                  albumId: null,
                  createdAt: '2025-01-01T00:00:00Z',
                },
              },
              {
                _id: 'image-2',
                _score: 1.8,
                _source: {
                  userId: mockUserId,
                  title: 'Castle Tower',
                  description: 'Tower piece',
                  tags: ['tower'],
                  albumId: null,
                  createdAt: '2025-01-02T00:00:00Z',
                },
              },
            ],
          },
        },
      }),
    }

    vi.mocked(opensearchClient.getOpenSearchClient).mockResolvedValue(
      mockOpenSearchClient as never,
    )

    // Mock database query - return images in same order as OpenSearch
    const mockImages = [
      {
        id: 'image-1',
        userId: mockUserId,
        title: 'LEGO Castle',
        description: 'Medieval castle',
        tags: ['castle', 'medieval'],
        imageUrl: 'https://example.com/image-1.webp',
        thumbnailUrl: 'https://example.com/thumb-1.webp',
        albumId: null,
        flagged: false,
        createdAt: new Date('2025-01-01'),
        lastUpdatedAt: new Date('2025-01-01'),
      },
      {
        id: 'image-2',
        userId: mockUserId,
        title: 'Castle Tower',
        description: 'Tower piece',
        tags: ['tower'],
        imageUrl: 'https://example.com/image-2.webp',
        thumbnailUrl: 'https://example.com/thumb-2.webp',
        albumId: null,
        flagged: false,
        createdAt: new Date('2025-01-02'),
        lastUpdatedAt: new Date('2025-01-02'),
      },
    ]

    // Mock db.select().from().where() chain
    vi.mocked(dbClient.db).select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockImages),
    } as never)

    // Execute search
    const result = await searchGalleryImages({
      query: mockQuery,
      userId: mockUserId,
      page: 1,
      limit: 20,
    })

    // Assertions
    expect(result.source).toBe('opensearch')
    expect(result.total).toBe(2)
    expect(result.data).toHaveLength(2)
    expect(result.data[0].score).toBe(2.5)
    expect(result.data[0].title).toBe('LEGO Castle')
    expect(result.data[1].score).toBe(1.8)
    expect(result.duration).toBeGreaterThan(0)

    // Verify OpenSearch query structure
    expect(mockOpenSearchClient.search).toHaveBeenCalledWith({
      index: 'gallery_images',
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: mockQuery,
                  fields: ['title^3', 'description^2', 'tags'],
                  fuzziness: 'AUTO',
                  operator: 'or',
                },
              },
              {
                term: { userId: mockUserId },
              },
            ],
          },
        },
        from: 0,
        size: 20,
        sort: [{ _score: 'desc' }],
      },
    })
  })

  it('should fallback to PostgreSQL when OpenSearch fails', async () => {
    // Mock OpenSearch failure
    vi.mocked(opensearchClient.getOpenSearchClient).mockRejectedValue(
      new Error('OpenSearch unavailable'),
    )

    // Mock PostgreSQL fallback
    const mockImages = [
      {
        id: 'image-1',
        userId: mockUserId,
        title: 'LEGO Castle',
        description: 'Medieval castle',
        tags: ['castle'],
        imageUrl: 'https://example.com/image-1.webp',
        thumbnailUrl: 'https://example.com/thumb-1.webp',
        albumId: null,
        flagged: false,
        createdAt: new Date('2025-01-01'),
        lastUpdatedAt: new Date('2025-01-01'),
      },
    ]

    // Mock first select() call for data query
    vi.mocked(dbClient.db).select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockImages),
    } as never)

    // Mock second select() call for count query
    vi.mocked(dbClient.db).select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: 1 }]),
    } as never)

    // Execute search
    const result = await searchGalleryImages({
      query: mockQuery,
      userId: mockUserId,
      page: 1,
      limit: 20,
    })

    // Assertions
    expect(result.source).toBe('postgres')
    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].title).toBe('LEGO Castle')
    expect(result.duration).toBeGreaterThanOrEqual(0) // Duration may be 0 in fast tests
  })

  it('should enforce pagination parameters', async () => {
    const mockOpenSearchClient = {
      search: vi.fn().mockResolvedValue({
        body: {
          hits: {
            total: { value: 100 },
            hits: [],
          },
        },
      }),
    }

    vi.mocked(opensearchClient.getOpenSearchClient).mockResolvedValue(
      mockOpenSearchClient as never,
    )

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    }

    vi.mocked(dbClient.db, { partial: true }).select = mockDb.select

    // Test page 2 with limit 50
    await searchGalleryImages({
      query: mockQuery,
      userId: mockUserId,
      page: 2,
      limit: 50,
    })

    expect(mockOpenSearchClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          from: 50, // (page-1) * limit = (2-1) * 50
          size: 50,
        }),
      }),
    )
  })

  it('should throw error when both OpenSearch and PostgreSQL fail', async () => {
    // Mock OpenSearch failure
    vi.mocked(opensearchClient.getOpenSearchClient).mockRejectedValue(
      new Error('OpenSearch unavailable'),
    )

    // Mock PostgreSQL failure
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        throw new Error('Database connection failed')
      }),
    }

    vi.mocked(dbClient.db, { partial: true }).select = mockDb.select

    // Expect search to throw database error (generic package propagates errors)
    await expect(
      searchGalleryImages({
        query: mockQuery,
        userId: mockUserId,
        page: 1,
        limit: 20,
      }),
    ).rejects.toThrow('Database connection failed')
  })
})

describe('searchWishlistItems', () => {
  const mockUserId = 'user-456'
  const mockQuery = 'millennium falcon'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should search via OpenSearch and return wishlist results with scores', async () => {
    // Mock OpenSearch client
    const mockOpenSearchClient = {
      search: vi.fn().mockResolvedValue({
        body: {
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'item-1',
                _score: 3.2,
                _source: {
                  userId: mockUserId,
                  title: 'Millennium Falcon',
                  description: 'Star Wars set',
                  category: 'Star Wars',
                  sortOrder: '2025-01-01T00:00:00Z',
                  createdAt: '2025-01-01T00:00:00Z',
                },
              },
            ],
          },
        },
      }),
    }

    vi.mocked(opensearchClient.getOpenSearchClient).mockResolvedValue(
      mockOpenSearchClient as never,
    )

    // Mock database query
    const mockItems = [
      {
        id: 'item-1',
        userId: mockUserId,
        title: 'Millennium Falcon',
        description: 'Star Wars set',
        productLink: 'https://lego.com/falcon',
        imageUrl: 'https://example.com/falcon.webp',
        imageWidth: 800,
        imageHeight: 600,
        category: 'Star Wars',
        sortOrder: '2025-01-01T00:00:00Z',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    ]

    // Mock db.select().from().where() chain
    vi.mocked(dbClient.db).select.mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(mockItems),
    } as never)

    // Execute search
    const result = await searchWishlistItems({
      query: mockQuery,
      userId: mockUserId,
      page: 1,
      limit: 20,
    })

    // Assertions
    expect(result.source).toBe('opensearch')
    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].score).toBe(3.2)
    expect(result.data[0].title).toBe('Millennium Falcon')
    expect(result.duration).toBeGreaterThanOrEqual(0) // Duration may be 0 in fast tests

    // Verify OpenSearch query structure
    expect(mockOpenSearchClient.search).toHaveBeenCalledWith({
      index: 'wishlist_items',
      body: {
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: mockQuery,
                  fields: ['title^3', 'description^2', 'category'],
                  fuzziness: 'AUTO',
                  operator: 'or',
                },
              },
              {
                term: { userId: mockUserId },
              },
            ],
          },
        },
        from: 0,
        size: 20,
        sort: [{ _score: 'desc' }],
      },
    })
  })

  it('should fallback to PostgreSQL when OpenSearch fails', async () => {
    // Mock OpenSearch failure
    vi.mocked(opensearchClient.getOpenSearchClient).mockRejectedValue(
      new Error('OpenSearch unavailable'),
    )

    // Mock PostgreSQL fallback
    const mockItems = [
      {
        id: 'item-1',
        userId: mockUserId,
        title: 'Millennium Falcon',
        description: 'Star Wars set',
        productLink: null,
        imageUrl: null,
        imageWidth: null,
        imageHeight: null,
        category: 'Star Wars',
        sortOrder: '2025-01-01T00:00:00Z',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
    ]

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue(mockItems),
    }

    vi.mocked(dbClient.db, { partial: true }).select = mockDb.select

    // Also mock count query
    mockDb.select.mockReturnValueOnce(mockDb).mockReturnValueOnce({
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ total: 1 }]),
    } as never)

    // Execute search
    const result = await searchWishlistItems({
      query: mockQuery,
      userId: mockUserId,
      page: 1,
      limit: 20,
    })

    // Assertions
    expect(result.source).toBe('postgres')
    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].title).toBe('Millennium Falcon')
  })
})

describe('hashQuery', () => {
  it('should generate consistent MD5 hash for same query', () => {
    const query = 'lego castle'
    const hash1 = hashQuery(query)
    const hash2 = hashQuery(query)

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(32) // MD5 hash length
  })

  it('should generate different hashes for different queries', () => {
    const hash1 = hashQuery('lego castle')
    const hash2 = hashQuery('lego tower')

    expect(hash1).not.toBe(hash2)
  })

  it('should handle special characters in query', () => {
    const query = 'lego & pirates! (2024)'
    const hash = hashQuery(query)

    expect(hash).toBeDefined()
    expect(hash).toHaveLength(32)
  })
})

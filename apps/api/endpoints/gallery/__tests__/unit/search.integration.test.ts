/**
 * Search Lambda Integration Tests
 * Story 3.8: Gallery and Wishlist Search
 *
 * Tests search endpoints with mocked OpenSearch, PostgreSQL fallback, and Redis caching.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { APIGatewayProxyEventV2 } from 'aws-lambda'

// Mock all external dependencies BEFORE importing handlers
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
  },
}))

vi.mock('@/lib/cache/redis-client', () => ({
  getRedisClient: vi.fn(),
}))

vi.mock('@/lib/search/opensearch-client', () => ({
  getOpenSearchClient: vi.fn(),
}))

vi.mock('@/lib/search/search-utils', () => ({
  searchGalleryImages: vi.fn(),
  searchWishlistItems: vi.fn(),
  hashQuery: vi.fn(),
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

// Import handlers AFTER mocks are set up
import { handler as galleryHandler } from '../../../../gallery/index'
import { handler as wishlistHandler } from '../../../../wishlist/index'
import * as searchUtils from '@/core/search/utils'
import * as redisClient from '@/core/cache/redis'

describe('Gallery Search Integration', () => {
  let mockRedis: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup mock Redis client
    mockRedis = {
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/images/search', () => {
    it('should search gallery images via OpenSearch and return results', async () => {
      // Mock search results
      const mockSearchResult = {
        data: [
          {
            id: 'image-1',
            userId: 'user-123',
            title: 'LEGO Castle',
            description: 'Medieval castle build',
            tags: ['castle', 'medieval'],
            imageUrl: 'https://example.com/image-1.webp',
            thumbnailUrl: 'https://example.com/thumb-1.webp',
            albumId: null,
            flagged: false,
            createdAt: new Date('2025-01-01'),
            lastUpdatedAt: new Date('2025-01-01'),
            score: 2.5,
          },
          {
            id: 'image-2',
            userId: 'user-123',
            title: 'Castle Tower',
            description: 'Tower piece',
            tags: ['tower'],
            imageUrl: 'https://example.com/image-2.webp',
            thumbnailUrl: 'https://example.com/thumb-2.webp',
            albumId: null,
            flagged: false,
            createdAt: new Date('2025-01-02'),
            lastUpdatedAt: new Date('2025-01-02'),
            score: 1.8,
          },
        ],
        total: 2,
        source: 'opensearch' as const,
        duration: 45,
      }

      vi.mocked(searchUtils.searchGalleryImages).mockResolvedValue(mockSearchResult)
      vi.mocked(searchUtils.hashQuery).mockReturnValue('abc123')

      // Create test event
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: 'lego castle',
          page: '1',
          limit: '20',
        },
      }

      // Execute handler
      const response = await galleryHandler(event as APIGatewayProxyEventV2)

      // Assertions
      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.total).toBe(2)
      expect(body.pagination).toEqual({
        page: 1,
        limit: 20,
        totalPages: 1,
      })
      expect(body.data[0].title).toBe('LEGO Castle')
      expect(body.data[0].score).toBe(2.5)
      expect(body.timestamp).toBeDefined()

      // Verify search was called with correct params
      expect(searchUtils.searchGalleryImages).toHaveBeenCalledWith({
        query: 'lego castle',
        userId: 'user-123',
        page: 1,
        limit: 20,
      })

      // Verify Redis caching (2-minute TTL)
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'gallery:search:user-123:query:abc123:page:1:limit:20',
        120, // 2 minutes
        expect.any(String),
      )
    })

    it('should return cached results on cache hit', async () => {
      // Mock cached response
      const cachedResponse = {
        success: true,
        data: [
          {
            id: 'image-1',
            userId: 'user-123',
            title: 'LEGO Castle',
            description: 'Medieval castle build',
            tags: ['castle'],
            imageUrl: 'https://example.com/image-1.webp',
            thumbnailUrl: 'https://example.com/thumb-1.webp',
            albumId: null,
            flagged: false,
            createdAt: '2025-01-01T00:00:00.000Z',
            lastUpdatedAt: '2025-01-01T00:00:00.000Z',
            score: 2.5,
          },
        ],
        total: 1,
        pagination: {
          page: 1,
          limit: 20,
          totalPages: 1,
        },
        timestamp: '2025-01-01T00:00:00.000Z',
      }

      mockRedis.get.mockResolvedValue(JSON.stringify(cachedResponse))
      vi.mocked(searchUtils.hashQuery).mockReturnValue('abc123')

      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: 'lego castle',
        },
      }

      const response = await galleryHandler(event as APIGatewayProxyEventV2)

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)

      // Search function should NOT be called (cache hit)
      expect(searchUtils.searchGalleryImages).not.toHaveBeenCalled()
    })

    it('should enforce pagination parameters correctly', async () => {
      const mockSearchResult = {
        data: [],
        total: 100,
        source: 'opensearch' as const,
        duration: 30,
      }

      vi.mocked(searchUtils.searchGalleryImages).mockResolvedValue(mockSearchResult)
      vi.mocked(searchUtils.hashQuery).mockReturnValue('xyz789')

      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: 'tower',
          page: '3',
          limit: '50',
        },
      }

      const response = await galleryHandler(event as APIGatewayProxyEventV2)

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.pagination).toEqual({
        page: 3,
        limit: 50,
        totalPages: 2, // Math.ceil(100 / 50)
      })

      // Verify search called with correct pagination
      expect(searchUtils.searchGalleryImages).toHaveBeenCalledWith({
        query: 'tower',
        userId: 'user-123',
        page: 3,
        limit: 50,
      })
    })

    it('should return 400 for missing search query', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {
          // Missing search parameter
        },
      }

      const response = await galleryHandler(event as APIGatewayProxyEventV2)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 500 when search service is unavailable', async () => {
      vi.mocked(searchUtils.searchGalleryImages).mockRejectedValue(
        new Error('Search service unavailable'),
      )

      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: 'castle',
        },
      }

      const response = await galleryHandler(event as APIGatewayProxyEventV2)

      expect(response.statusCode).toBe(500)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('SEARCH_ERROR')
    })

    it('should enforce user isolation in search results', async () => {
      const mockSearchResult = {
        data: [
          {
            id: 'image-1',
            userId: 'user-456', // Different user
            title: 'LEGO Castle',
            description: 'Medieval castle build',
            tags: ['castle'],
            imageUrl: 'https://example.com/image-1.webp',
            thumbnailUrl: 'https://example.com/thumb-1.webp',
            albumId: null,
            flagged: false,
            createdAt: new Date('2025-01-01'),
            lastUpdatedAt: new Date('2025-01-01'),
            score: 2.5,
          },
        ],
        total: 1,
        source: 'opensearch' as const,
        duration: 25,
      }

      vi.mocked(searchUtils.searchGalleryImages).mockResolvedValue(mockSearchResult)
      vi.mocked(searchUtils.hashQuery).mockReturnValue('def456')

      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123', // Authenticated as user-123
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: 'castle',
        },
      }

      await galleryHandler(event as APIGatewayProxyEventV2)

      // Verify search was called with correct userId
      expect(searchUtils.searchGalleryImages).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123', // Should only search user's own images
        }),
      )
    })
  })
})

describe('Wishlist Search Integration', () => {
  let mockRedis: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup mock Redis client
    mockRedis = {
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/wishlist/search', () => {
    it('should search wishlist items and return results', async () => {
      const mockSearchResult = {
        data: [
          {
            id: 'item-1',
            userId: 'user-789',
            title: 'Millennium Falcon',
            description: 'Star Wars LEGO set',
            productLink: 'https://lego.com/falcon',
            imageUrl: 'https://example.com/falcon.webp',
            imageWidth: 800,
            imageHeight: 600,
            category: 'Star Wars',
            sortOrder: '2025-01-01T00:00:00Z',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
            score: 3.2,
          },
        ],
        total: 1,
        source: 'opensearch' as const,
        duration: 38,
      }

      vi.mocked(searchUtils.searchWishlistItems).mockResolvedValue(mockSearchResult)
      vi.mocked(searchUtils.hashQuery).mockReturnValue('ghi789')

      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-789',
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: 'millennium falcon',
        },
      }

      const response = await wishlistHandler(event as APIGatewayProxyEventV2)

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.total).toBe(1)
      expect(body.data[0].title).toBe('Millennium Falcon')
      expect(body.data[0].score).toBe(3.2)

      // Verify search was called with correct params
      expect(searchUtils.searchWishlistItems).toHaveBeenCalledWith({
        query: 'millennium falcon',
        userId: 'user-789',
        page: 1,
        limit: 20,
      })

      // Verify Redis caching (2-minute TTL)
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'wishlist:search:user-789:query:ghi789:page:1:limit:20',
        120, // 2 minutes
        expect.any(String),
      )
    })

    it('should return 400 for empty search query', async () => {
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-789',
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: '', // Empty search
        },
      }

      const response = await wishlistHandler(event as APIGatewayProxyEventV2)

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should handle PostgreSQL fallback gracefully', async () => {
      const mockSearchResult = {
        data: [
          {
            id: 'item-1',
            userId: 'user-789',
            title: 'Death Star',
            description: 'Ultimate Star Wars set',
            productLink: null,
            imageUrl: null,
            imageWidth: null,
            imageHeight: null,
            category: 'Star Wars',
            sortOrder: '2025-01-01T00:00:00Z',
            createdAt: new Date('2025-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
        ],
        total: 1,
        source: 'postgres' as const, // Fallback source
        duration: 85,
      }

      vi.mocked(searchUtils.searchWishlistItems).mockResolvedValue(mockSearchResult)
      vi.mocked(searchUtils.hashQuery).mockReturnValue('jkl012')

      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist/search',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-789',
              },
            },
          },
        } as any,
        queryStringParameters: {
          search: 'death star',
        },
      }

      const response = await wishlistHandler(event as APIGatewayProxyEventV2)

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].title).toBe('Death Star')
    })
  })
})

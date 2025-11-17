/**
 * Gallery Lambda Integration Tests
 *
 * Tests the gallery Lambda handler with mocked dependencies.
 * Verifies proper integration between handler, database, S3, Redis, and response builders.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { APIGatewayProxyEventV2 } from 'aws-lambda'

// Mock all external dependencies
vi.mock('@monorepo/db/client', () => {
  // Create chainable mock as a singleton
  const mockDbInstance: any = {}
  const chainMethods = ['select', 'insert', 'from', 'where', 'orderBy', 'limit', 'offset', 'update', 'set', 'returning', 'delete', 'values']

  chainMethods.forEach(method => {
    // Create vi.fn() that returns the mockDbInstance for chaining
    mockDbInstance[method] = vi.fn(() => mockDbInstance)
  })

  return {
    db: mockDbInstance,
    __mockDbInstance: mockDbInstance, // Export for test access
  }
})

vi.mock('@monorepo/db/schema', () => ({
  galleryImages: {},
  galleryAlbums: {},
  galleryFlags: {},
  wishlistImages: {},
  mocInstructions: {},
  mocInstructionFiles: {},
}))
vi.mock('@/lib/storage/s3-client')
vi.mock('@/lib/cache/redis-client')
vi.mock('@/lib/search/opensearch-client')
vi.mock('@/lib/utils/env')
vi.mock('@aws-sdk/client-s3')
vi.mock('@/lib/utils/multipart-parser', () => ({
  parseMultipartForm: vi.fn(),
  getFile: vi.fn(),
  getField: vi.fn(),
}))
vi.mock('@monorepo/file-validator')
vi.mock('sharp')

/**
 * Reset the chainable database mock implementations
 * Re-establishes chaining after vi.clearAllMocks() clears implementations
 */
function resetChainableDbMock(dbMock: any) {
  const chainMethods = ['select', 'insert', 'from', 'where', 'orderBy', 'limit', 'offset', 'update', 'set', 'returning', 'delete', 'values']
  // Re-establish the chaining implementation
  chainMethods.forEach(method => {
    if (dbMock[method] && typeof dbMock[method].mockImplementation === 'function') {
      // vi.clearAllMocks() cleared the implementation, so restore it
      dbMock[method].mockImplementation(() => dbMock)
    }
  })
}

describe('Gallery Lambda Integration', () => {
  let mockDb: any
  let mockRedis: any
  let mockS3: any
  let mockEnv: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup mock environment
    mockEnv = await import('@/lib/utils/env')
    vi.mocked(mockEnv.getEnv).mockReturnValue({
      S3_BUCKET: 'test-bucket',
      AWS_REGION: 'us-east-1',
    } as any)

    // Setup mock database - reset chainable implementations after clearAllMocks
    mockDb = await import('@monorepo/db/client')
    resetChainableDbMock(mockDb.db)

    // Setup mock Redis client
    mockRedis = await import('@/lib/cache/redis-client')
    vi.mocked(mockRedis.getRedisClient).mockResolvedValue({
      get: vi.fn().mockResolvedValue(null),
      setEx: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    } as any)

    // Setup mock S3 client
    mockS3 = await import('@/lib/storage/s3-client')
    vi.mocked(mockS3.getS3Client).mockResolvedValue({
      send: vi.fn().mockResolvedValue({}),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/images - List Images', () => {
    // TODO: Fix chainable mock persistence issue - mock implementations are cleared by vi.clearAllMocks()
    it.skip('should return paginated images list', async () => {
      // Given: User is authenticated and has images
      const mockImages = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          userId: 'user-123',
          title: 'Castle',
          imageUrl: 'https://example.com/castle.jpg',
          tags: ['castle'],
          albumId: null,
          flagged: false,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          userId: 'user-123',
          title: 'Spaceship',
          imageUrl: 'https://example.com/spaceship.jpg',
          tags: ['space'],
          albumId: null,
          flagged: false,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      ]

      // Mock database response - need to mock the full chain
      const queryMock = mockDb.db
      // First query: .select().from().where().orderBy().limit().offset() - mock the last method
      queryMock.offset.mockResolvedValueOnce(mockImages)
      // Second query: .select().from().where() - mock where for count
      queryMock.where.mockResolvedValueOnce([{ total: 10 }])

      // Mock Redis cache miss
      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/images is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {},
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with paginated response
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.data).toHaveLength(2)
      expect(body.data.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 10,
        totalPages: 1,
      })

      // And: Result is cached in Redis
      expect(redisClient.setEx).toHaveBeenCalledWith(
        expect.stringContaining('gallery:images:user:user-123'),
        300,
        expect.any(String),
      )
    })

    it('should return cached images when available', async () => {
      // Given: Redis cache contains images
      const cachedResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId: 'user-123',
            title: 'Cached Castle',
            imageUrl: 'https://example.com/castle.jpg',
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(cachedResponse))

      // When: GET /api/images is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {},
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns cached response without querying database
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.data[0].title).toBe('Cached Castle')

      // And: Database was not queried
      expect(mockDb.db.select).not.toHaveBeenCalled()
    })

    it.skip('should filter images by albumId', async () => {
      // Given: User requests images from specific album
      const mockImages = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          userId: 'user-123',
          title: 'Castle in Album',
          albumId: '660e8400-e29b-41d4-a716-446655440123',
          imageUrl: 'https://example.com/castle.jpg',
          tags: [],
          flagged: false,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      ]

      // Setup mock returns: first query returns images, second query returns count
      mockDb.db.offset.mockResolvedValueOnce(mockImages)
      mockDb.db.where.mockResolvedValueOnce([{ total: 1 }])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/images?albumId=album-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images',
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
          albumId: '660e8400-e29b-41d4-a716-446655440123',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns filtered images
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.data[0].albumId).toBe('660e8400-e29b-41d4-a716-446655440123')
    })

    it.skip('should support pagination', async () => {
      // Given: User requests page 2 with limit 5
      const mockImages = Array(5).fill(null).map((_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544${i}`,
        userId: 'user-123',
        title: `Image ${i}`,
        imageUrl: `https://example.com/image-${i}.jpg`,
        tags: [],
        albumId: null,
        flagged: false,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      }))

      // Setup mock returns: first query returns images, second query returns count
      mockDb.db.offset.mockResolvedValueOnce(mockImages)
      mockDb.db.where.mockResolvedValueOnce([{ total: 25 }])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/images?page=2&limit=5 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images',
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
          page: '2',
          limit: '5',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns correct pagination metadata
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 25,
        totalPages: 5,
      })
    })

    it('should return 401 when not authenticated', async () => {
      // Given: No JWT authorizer in event
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images',
          },
        } as any,
        queryStringParameters: {},
      }

      // When: GET /api/images is called
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 401 Unauthorized
      expect(result.statusCode).toBe(401)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('UNAUTHORIZED')
    })
  })

  describe('GET /api/images/:id - Get Single Image', () => {
    it('should return single image by ID', async () => {
      // Given: Image exists in database
      const mockImage = {
        id: '550e8400-e29b-41d4-a716-446655440123',
        userId: 'user-123',
        title: 'My Castle',
        description: 'A medieval castle',
        imageUrl: 'https://example.com/castle.jpg',
        tags: ['castle'],
        albumId: null,
        flagged: false,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      }

      mockDb.db.where.mockResolvedValue([mockImage])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/images/image-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/image-123',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-446655440123',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with image
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('550e8400-e29b-41d4-a716-446655440123')
      expect(body.data.title).toBe('My Castle')

      // And: Image is cached
      expect(redisClient.setEx).toHaveBeenCalledWith(
        'gallery:image:detail:550e8400-e29b-41d4-a716-446655440123',
        600,
        expect.any(String),
      )
    })

    it('should return cached image when available', async () => {
      // Given: Redis cache contains image
      const cachedImage = {
        id: '550e8400-e29b-41d4-a716-446655440123',
        userId: 'user-123',
        title: 'Cached Castle',
        imageUrl: 'https://example.com/castle.jpg',
      }

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(cachedImage))

      // When: GET /api/images/image-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/image-123',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-446655440123',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns cached image without querying database
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.title).toBe('Cached Castle')

      // And: Database was not queried
      expect(mockDb.db.select).not.toHaveBeenCalled()
    })

    it('should return 404 when image not found', async () => {
      // Given: Image does not exist
      mockDb.db.where.mockResolvedValue([])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/images/nonexistent is called
      const { handler } = await import('../../../../gallery/index')
      const nonExistentId = '550e8400-e29b-41d4-a716-000000000000'
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: `/api/images/${nonExistentId}`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: nonExistentId,
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 404
      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('NOT_FOUND')
    })

    it('should return 403 when accessing another user image', async () => {
      // Given: Image belongs to different user
      const mockImage = {
        id: '550e8400-e29b-41d4-a716-446655440123',
        userId: 'other-user',
        title: 'Other User Castle',
        imageUrl: 'https://example.com/castle.jpg',
      }

      mockDb.db.where.mockResolvedValue([mockImage])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/images/image-123 is called by different user
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/images/image-123',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-446655440123',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('FORBIDDEN')
    })
  })

  describe('PATCH /api/images/:id - Update Image', () => {
    it('should update image metadata', async () => {
      // Given: Image exists and belongs to user
      const existingImage = {
        id: '550e8400-e29b-41d4-a716-446655440123',
        userId: 'user-123',
        title: 'Old Title',
        imageUrl: 'https://example.com/castle.jpg',
        tags: ['old'],
        albumId: null,
        createdAt: new Date('2024-01-01'),
      }

      const updatedImage = {
        ...existingImage,
        title: 'New Title',
        description: 'New description',
        tags: ['new'],
        lastUpdatedAt: new Date(),
      }

      mockDb.db.where.mockResolvedValueOnce([existingImage])
      mockDb.db.returning.mockResolvedValue([updatedImage])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue([
        'gallery:images:user:user-123:page:1:limit:20:search:none:album:none',
      ])

      // Mock OpenSearch indexDocument
      const mockOpenSearch = await import('@/lib/search/opensearch-client')
      vi.mocked(mockOpenSearch.indexDocument).mockResolvedValue(undefined)

      // When: PATCH /api/images/image-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'PATCH',
            path: '/api/images/image-123',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-446655440123',
        },
        body: JSON.stringify({
          title: 'New Title',
          description: 'New description',
          tags: ['new'],
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with updated image
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.title).toBe('New Title')
      expect(body.data.description).toBe('New description')

      // And: OpenSearch index is updated
      expect(mockOpenSearch.indexDocument).toHaveBeenCalledWith({
        index: 'gallery_images',
        id: '550e8400-e29b-41d4-a716-446655440123',
        body: expect.objectContaining({
          userId: 'user-123',
          title: 'New Title',
          description: 'New description',
          tags: ['new'],
        }),
      })

      // And: Detail cache is invalidated
      expect(redisClient.del).toHaveBeenCalledWith('gallery:image:detail:550e8400-e29b-41d4-a716-446655440123')

      // And: List caches are invalidated
      expect(redisClient.keys).toHaveBeenCalledWith('gallery:images:user:user-123:*')
      expect(redisClient.del).toHaveBeenCalledWith([
        'gallery:images:user:user-123:page:1:limit:20:search:none:album:none',
      ])
    })

    it('should return 404 when updating nonexistent image', async () => {
      // Given: Image does not exist
      mockDb.db.where.mockResolvedValue([])

      // When: PATCH /api/images/nonexistent is called
      const { handler } = await import('../../../../gallery/index')
      const nonExistentId = '550e8400-e29b-41d4-a716-000000000000'
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'PATCH',
            path: `/api/images/${nonExistentId}`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: nonExistentId,
        },
        body: JSON.stringify({
          title: 'New Title',
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 404
      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('NOT_FOUND')
    })

    it('should return 403 when updating another user image', async () => {
      // Given: Image belongs to different user
      const existingImage = {
        id: '550e8400-e29b-41d4-a716-446655440123',
        userId: 'other-user',
        title: 'Old Title',
      }

      mockDb.db.where.mockResolvedValue([existingImage])

      // When: PATCH /api/images/image-123 is called by different user
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'PATCH',
            path: '/api/images/image-123',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-446655440123',
        },
        body: JSON.stringify({
          title: 'New Title',
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/images/:id - Delete Image', () => {
    it('should delete image and S3 objects', async () => {
      // Given: Image exists and belongs to user
      const existingImage = {
        id: '550e8400-e29b-41d4-a716-446655440123',
        userId: 'user-123',
        title: 'Castle',
        imageUrl: 'https://test-bucket.s3.amazonaws.com/users/user-123/images/castle.jpg',
        thumbnailUrl: 'https://test-bucket.s3.amazonaws.com/users/user-123/images/thumbnails/castle.jpg',
      }

      mockDb.db.where.mockResolvedValue([existingImage])

      const s3Client = await mockS3.getS3Client()
      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue([
        'gallery:images:user:user-123:page:1:limit:20:search:none:album:none',
      ])

      // Mock OpenSearch deleteDocument
      const mockOpenSearch = await import('@/lib/search/opensearch-client')
      vi.mocked(mockOpenSearch.deleteDocument).mockResolvedValue(undefined)

      // When: DELETE /api/images/image-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: '/api/images/image-123',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-446655440123',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 204 No Content
      expect(result.statusCode).toBe(204)

      // And: S3 objects are deleted
      expect(s3Client.send).toHaveBeenCalledTimes(2) // Image and thumbnail

      // And: Database record is deleted
      expect(mockDb.db.delete).toHaveBeenCalled()

      // And: OpenSearch document is deleted
      expect(mockOpenSearch.deleteDocument).toHaveBeenCalledWith({
        index: 'gallery_images',
        id: '550e8400-e29b-41d4-a716-446655440123',
      })

      // And: Detail cache is invalidated
      expect(redisClient.del).toHaveBeenCalledWith('gallery:image:detail:550e8400-e29b-41d4-a716-446655440123')

      // And: List caches are invalidated
      expect(redisClient.keys).toHaveBeenCalledWith('gallery:images:user:user-123:*')
      expect(redisClient.del).toHaveBeenCalledWith([
        'gallery:images:user:user-123:page:1:limit:20:search:none:album:none',
      ])
    })

    it('should return 404 when deleting nonexistent image', async () => {
      // Given: Image does not exist
      mockDb.db.where.mockResolvedValue([])

      // When: DELETE /api/images/nonexistent is called
      const { handler } = await import('../../../../gallery/index')
      const nonExistentId = '550e8400-e29b-41d4-a716-000000000000'
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: `/api/images/${nonExistentId}`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: nonExistentId,
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 404
      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('NOT_FOUND')
    })

    it('should return 403 when deleting another user image', async () => {
      // Given: Image belongs to different user
      const existingImage = {
        id: '550e8400-e29b-41d4-a716-446655440123',
        userId: 'other-user',
        title: 'Castle',
        imageUrl: 'https://test-bucket.s3.amazonaws.com/users/other-user/images/castle.jpg',
      }

      mockDb.db.where.mockResolvedValue([existingImage])

      // When: DELETE /api/images/image-123 is called by different user
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: '/api/images/image-123',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '550e8400-e29b-41d4-a716-446655440123',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })
  })

  describe('POST /api/images - Upload Image', () => {
    beforeEach(async () => {
      // Mock multipart parser
      const mockMultipartParser = await import('@/lib/utils/multipart-parser')
      const mockFormData = {
        fields: {
          title: 'Test Image',
          description: 'Test description',
          tags: '["lego","castle"]',
        },
        files: [
          {
            fieldname: 'file',
            filename: 'test.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('fake-image-data'),
          },
        ],
      }
      vi.mocked(mockMultipartParser.parseMultipartForm).mockResolvedValue(mockFormData as any)
      vi.mocked(mockMultipartParser.getFile).mockReturnValue(mockFormData.files[0] as any)
      vi.mocked(mockMultipartParser.getField).mockImplementation((formData: any, field: string) => {
        return mockFormData.fields[field as keyof typeof mockFormData.fields]
      })

      // Mock file validator
      const mockValidator = await import('@monorepo/file-validator')
      vi.mocked(mockValidator.validateFile).mockReturnValue({
        isValid: true,
        errors: [],
      })

      // Mock Sharp image processing
      const mockSharp = await import('sharp')
      const mockSharpInstance = {
        resize: vi.fn().mockReturnThis(),
        webp: vi.fn().mockReturnThis(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image')),
        metadata: vi.fn().mockResolvedValue({ width: 1024, height: 768, format: 'webp' }),
      }
      vi.mocked(mockSharp.default as any).mockReturnValue(mockSharpInstance)

      // Mock S3 upload
      const mockS3Upload = await import('@/lib/storage/s3-client')
      vi.mocked(mockS3Upload.uploadToS3).mockResolvedValue('https://test-bucket.s3.amazonaws.com/images/user-123/test-id.webp')

      // Mock database insert
      mockDb.db.returning.mockResolvedValue([
        {
          id: '550e8400-e29b-41d4-a716-446655999999',
          userId: 'user-123',
          title: 'Test Image',
          description: 'Test description',
          tags: ['lego', 'castle'],
          imageUrl: 'https://test-bucket.s3.amazonaws.com/images/user-123/test-id.webp',
          thumbnailUrl: 'https://test-bucket.s3.amazonaws.com/images/user-123/thumbnails/test-id.webp',
          albumId: null,
          flagged: false,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      ])

      // Mock Redis for cache invalidation (already set up in parent beforeEach)
      const redisClient = await mockRedis.getRedisClient()
      redisClient.keys = vi.fn().mockResolvedValue([])
      redisClient.del = vi.fn().mockResolvedValue(1)
    })

    it('should upload image with all metadata', async () => {
      // Given: Valid image upload request
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      }

      // When: Upload handler is called
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 201 with image details
      expect(result.statusCode).toBe(201)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.id).toBe('550e8400-e29b-41d4-a716-446655999999')
      expect(body.data.title).toBe('Test Image')
      expect(body.data.imageUrl).toContain('test-id.webp')
      expect(body.data.thumbnailUrl).toContain('thumbnails/test-id.webp')
      expect(body.data.tags).toEqual(['lego', 'castle'])

      // And: S3 upload was called twice (image + thumbnail)
      const mockS3Upload = await import('@/lib/storage/s3-client')
      expect(mockS3Upload.uploadToS3).toHaveBeenCalledTimes(2)

      // And: Database insert was called
      expect(mockDb.db.insert).toHaveBeenCalled()
    })

    it('should reject file larger than 10MB', async () => {
      // Given: File validation fails due to size
      const mockValidator = await import('@monorepo/file-validator')
      vi.mocked(mockValidator.validateFile).mockReturnValue({
        isValid: false,
        errors: ['File size exceeds maximum allowed size of 10MB'],
      })

      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
      }

      // When: Upload handler is called
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 400 validation error
      expect(result.statusCode).toBe(400)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('VALIDATION_ERROR')
      expect(body.error.message).toContain('10MB')
    })

    it('should reject invalid file types', async () => {
      // Given: File validation fails due to type
      const mockValidator = await import('@monorepo/file-validator')
      vi.mocked(mockValidator.validateFile).mockReturnValue({
        isValid: false,
        errors: ['File type application/pdf is not allowed'],
      })

      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
      }

      // When: Upload handler is called
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 400 validation error
      expect(result.statusCode).toBe(400)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('VALIDATION_ERROR')
      expect(body.error.message).toContain('not allowed')
    })

    it('should handle malformed JSON in tags field', async () => {
      // Given: Invalid JSON in tags field
      const mockMultipartParser = await import('@/lib/utils/multipart-parser')
      const badFormData = {
        fields: {
          title: 'Test Image',
          tags: 'not-valid-json',
        },
        files: [
          {
            fieldname: 'file',
            filename: 'test.jpg',
            encoding: '7bit',
            mimetype: 'image/jpeg',
            buffer: Buffer.from('fake-image-data'),
          },
        ],
      }
      vi.mocked(mockMultipartParser.parseMultipartForm).mockResolvedValue(badFormData as any)
      vi.mocked(mockMultipartParser.getFile).mockReturnValue(badFormData.files[0] as any)
      vi.mocked(mockMultipartParser.getField).mockImplementation((formData: any, field: string) => {
        return badFormData.fields[field as keyof typeof badFormData.fields]
      })

      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
      }

      // When: Upload handler is called
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 400 validation error
      expect(result.statusCode).toBe(400)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('VALIDATION_ERROR')
      expect(body.error.message).toContain('Invalid JSON format for tags')
    })

    it('should return 400 when no file uploaded', async () => {
      // Given: No file in multipart data
      const mockMultipartParser = await import('@/lib/utils/multipart-parser')
      const noFileFormData = {
        fields: {
          title: 'Test Image',
        },
        files: [],
      }
      vi.mocked(mockMultipartParser.parseMultipartForm).mockResolvedValue(noFileFormData as any)
      vi.mocked(mockMultipartParser.getFile).mockReturnValue(undefined)
      vi.mocked(mockMultipartParser.getField).mockImplementation((formData: any, field: string) => {
        return noFileFormData.fields[field as keyof typeof noFileFormData.fields]
      })

      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
      }

      // When: Upload handler is called
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 400 bad request
      expect(result.statusCode).toBe(400)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('BAD_REQUEST')
      expect(body.error.message).toBe('No file uploaded')
    })

    it('should invalidate Redis cache after upload', async () => {
      // Given: Valid upload request with cached data
      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue([
        'gallery:images:user:user-123:page:1:limit:20:search:none:album:none',
        'gallery:images:user:user-123:page:2:limit:20:search:none:album:none',
      ])

      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/images',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
      }

      // When: Upload handler is called
      await handler(event as APIGatewayProxyEventV2)

      // Then: Redis cache keys are invalidated
      expect(redisClient.keys).toHaveBeenCalledWith('gallery:images:user:user-123:*')
      expect(redisClient.del).toHaveBeenCalledWith([
        'gallery:images:user:user-123:page:1:limit:20:search:none:album:none',
        'gallery:images:user:user-123:page:2:limit:20:search:none:album:none',
      ])
    })
  })

  describe('Route Not Found', () => {
    it('should return 404 for unknown routes', async () => {
      // Given: Unknown route
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/unknown',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
      }

      // When: Handler is invoked
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 404
      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('NOT_FOUND')
      expect(body.error.message).toContain('Route not found')
    })
  })

  describe('CORS Headers', () => {
    it('should include CORS headers in all responses', async () => {
      // Given: Any valid request
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/unknown',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
      }

      // When: Handler is invoked
      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: CORS headers are present
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)
    })
  })

  describe('POST /api/albums - Create Album', () => {
    it('should create album with title and description', async () => {
      // Given: Valid album data
      mockDb.db.where.mockResolvedValueOnce([]) // No existing cover image check
      mockDb.db.returning.mockResolvedValue([
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          userId: 'user-123',
          title: 'My LEGO Collection',
          description: 'All my LEGO builds',
          coverImageId: null,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      ])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue([])

      // When: POST /api/albums is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/albums',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        body: JSON.stringify({
          title: 'My LEGO Collection',
          description: 'All my LEGO builds',
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 201 with album
      expect(result.statusCode).toBe(201)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.title).toBe('My LEGO Collection')
      expect(body.data.imageCount).toBe(0)
      expect(body.data.coverImageUrl).toBeNull()
    })

    it('should validate coverImageId ownership', async () => {
      // Given: Cover image belongs to different user
      const coverImageId = '550e8400-e29b-41d4-a716-446655440999'
      mockDb.db.where.mockResolvedValue([
        {
          id: coverImageId,
          userId: 'other-user',
        },
      ])

      // When: POST /api/albums with another user's image
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/albums',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        body: JSON.stringify({
          title: 'Test Album',
          coverImageId,
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/albums - List Albums', () => {
    it.skip('should return paginated albums with image count', async () => {
      // Given: User has albums
      const mockAlbums = [
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          userId: 'user-123',
          title: 'Album 1',
          description: 'First album',
          coverImageId: null,
          createdAt: new Date(),
          lastUpdatedAt: new Date(),
          imageCount: 5,
          coverImageUrl: null,
        },
      ]

      // Mock offset to return albums (last in chain)
      mockDb.db.offset.mockResolvedValueOnce(mockAlbums)
      // Mock where for count query
      mockDb.db.where.mockResolvedValueOnce([{ total: 1 }])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/albums is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/albums',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {},
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with albums
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.data).toHaveLength(1)
      expect(body.data.data[0].imageCount).toBe(5)
    })

    it('should return cached albums when available', async () => {
      // Given: Redis cache contains albums
      const cachedResponse = {
        data: [
          {
            id: '770e8400-e29b-41d4-a716-446655440001',
            userId: 'user-123',
            title: 'Cached Album',
            imageCount: 3,
          },
        ],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      }

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(cachedResponse))

      // When: GET /api/albums is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/albums',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        queryStringParameters: {},
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns cached response
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.data[0].title).toBe('Cached Album')

      // And: Database was not queried
      expect(mockDb.db.select).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/albums/:id - Get Album Detail', () => {
    it.skip('should return album with all images', async () => {
      // Given: Album exists with images
      const mockAlbum = {
        id: '770e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Test Album',
        description: 'Album with images',
        coverImageId: null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      }

      const mockImages = [
        {
          id: 'image-1',
          userId: 'user-123',
          title: 'Image 1',
          albumId: '770e8400-e29b-41d4-a716-446655440001',
          imageUrl: 'https://example.com/image1.jpg',
          createdAt: new Date(),
        },
        {
          id: 'image-2',
          userId: 'user-123',
          title: 'Image 2',
          albumId: '770e8400-e29b-41d4-a716-446655440001',
          imageUrl: 'https://example.com/image2.jpg',
          createdAt: new Date(),
        },
      ]

      // First where() call returns album
      mockDb.db.where.mockResolvedValueOnce([mockAlbum])
      // Second where() call returns images (with orderBy chain)
      mockDb.db.where.mockResolvedValueOnce({
        orderBy: vi.fn().mockResolvedValue(mockImages),
      } as any)

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/albums/album-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/albums/770e8400-e29b-41d4-a716-446655440001',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '770e8400-e29b-41d4-a716-446655440001',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with album and images
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.title).toBe('Test Album')
      expect(body.data.images).toHaveLength(2)
      expect(body.data.imageCount).toBe(2)
    })

    it('should return 403 when accessing another user album', async () => {
      // Given: Album belongs to different user
      mockDb.db.where.mockResolvedValue([
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          userId: 'other-user',
          title: 'Other Album',
        },
      ])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/albums/album-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/albums/770e8400-e29b-41d4-a716-446655440001',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '770e8400-e29b-41d4-a716-446655440001',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 404 when album not found', async () => {
      // Given: Album does not exist
      mockDb.db.where.mockResolvedValue([])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/albums/nonexistent is called
      const { handler } = await import('../../../../gallery/index')
      const nonExistentId = '770e8400-e29b-41d4-a716-000000000000'
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: `/api/albums/${nonExistentId}`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: nonExistentId,
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 404
      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('NOT_FOUND')
    })
  })

  describe('PATCH /api/albums/:id - Update Album', () => {
    it('should update album metadata', async () => {
      // Given: Album exists
      const existingAlbum = {
        id: '770e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Old Title',
        createdAt: new Date(),
      }

      const updatedAlbum = {
        ...existingAlbum,
        title: 'New Title',
        description: 'New description',
        lastUpdatedAt: new Date(),
      }

      mockDb.db.where.mockResolvedValueOnce([existingAlbum])
      mockDb.db.returning.mockResolvedValue([updatedAlbum])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue([])

      // When: PATCH /api/albums/album-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'PATCH',
            path: '/api/albums/770e8400-e29b-41d4-a716-446655440001',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '770e8400-e29b-41d4-a716-446655440001',
        },
        body: JSON.stringify({
          title: 'New Title',
          description: 'New description',
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with updated album
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.title).toBe('New Title')
      expect(body.data.description).toBe('New description')
    })

    it('should return 403 when updating another user album', async () => {
      // Given: Album belongs to different user
      mockDb.db.where.mockResolvedValue([
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          userId: 'other-user',
          title: 'Other Album',
        },
      ])

      // When: PATCH /api/albums/album-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'PATCH',
            path: '/api/albums/770e8400-e29b-41d4-a716-446655440001',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '770e8400-e29b-41d4-a716-446655440001',
        },
        body: JSON.stringify({
          title: 'New Title',
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/albums/:id - Delete Album', () => {
    it('should delete album and set images albumId to null', async () => {
      // Given: Album exists
      const existingAlbum = {
        id: '770e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Test Album',
      }

      mockDb.db.where.mockResolvedValue([existingAlbum])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue([])

      // When: DELETE /api/albums/album-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: '/api/albums/770e8400-e29b-41d4-a716-446655440001',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '770e8400-e29b-41d4-a716-446655440001',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 204 No Content
      expect(result.statusCode).toBe(204)

      // And: Images were updated (albumId set to null)
      expect(mockDb.db.update).toHaveBeenCalled()

      // And: Album was deleted
      expect(mockDb.db.delete).toHaveBeenCalled()
    })

    it('should return 403 when deleting another user album', async () => {
      // Given: Album belongs to different user
      mockDb.db.where.mockResolvedValue([
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          userId: 'other-user',
          title: 'Other Album',
        },
      ])

      // When: DELETE /api/albums/album-123 is called
      const { handler } = await import('../../../../gallery/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: '/api/albums/770e8400-e29b-41d4-a716-446655440001',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: '770e8400-e29b-41d4-a716-446655440001',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('should return 404 when album not found', async () => {
      // Given: Album does not exist
      mockDb.db.where.mockResolvedValue([])

      // When: DELETE /api/albums/nonexistent is called
      const { handler } = await import('../../../../gallery/index')
      const nonExistentId = '770e8400-e29b-41d4-a716-000000000000'
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: `/api/albums/${nonExistentId}`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        pathParameters: {
          id: nonExistentId,
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 404
      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('NOT_FOUND')
    })
  })
})

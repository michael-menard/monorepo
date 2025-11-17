/**
 * Wishlist Lambda Integration Tests
 *
 * Tests the wishlist Lambda handler with mocked dependencies.
 * Verifies proper integration between handler, database, S3, Redis, OpenSearch, and response builders.
 *
 * Story: 3.6 - Wishlist CRUD Operations
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { APIGatewayProxyEventV2 } from 'aws-lambda'

// Mock all external dependencies
vi.mock('@/lib/db/client', () => {
  // Create chainable mock as a singleton
  const mockDbInstance: any = {}
  const chainMethods = ['select', 'insert', 'from', 'where', 'orderBy', 'limit', 'offset', 'update', 'set', 'returning', 'delete', 'values', 'transaction']

  chainMethods.forEach(method => {
    // Create vi.fn() that returns the mockDbInstance for chaining
    mockDbInstance[method] = vi.fn(() => mockDbInstance)
  })

  return {
    db: mockDbInstance,
    __mockDbInstance: mockDbInstance, // Export for test access
  }
})
vi.mock('@/lib/storage/s3-client')
vi.mock('@/lib/cache/redis-client')
vi.mock('@/lib/search/opensearch-client')
vi.mock('@/lib/utils/env')
vi.mock('@aws-sdk/client-s3')

/**
 * Reset the chainable database mock implementations
 * Re-establishes chaining after vi.clearAllMocks() clears implementations
 */
function resetChainableDbMock(dbMock: any) {
  const chainMethods = ['select', 'insert', 'from', 'where', 'orderBy', 'limit', 'offset', 'update', 'set', 'returning', 'delete', 'values', 'transaction']
  // Re-establish the chaining implementation
  chainMethods.forEach(method => {
    if (dbMock[method] && typeof dbMock[method].mockImplementation === 'function') {
      // vi.clearAllMocks() cleared the implementation, so restore it
      dbMock[method].mockImplementation(() => dbMock)
    }
  })
}

describe('Wishlist Lambda Integration', () => {
  let mockDb: any
  let mockRedis: any
  let mockS3: any
  let mockEnv: any
  let mockOpenSearch: any

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup mock environment
    mockEnv = await import('@/lib/utils/env')
    vi.mocked(mockEnv.getEnv).mockReturnValue({
      S3_BUCKET: 'test-bucket',
      AWS_REGION: 'us-east-1',
    } as any)

    // Set process.env for S3 bucket name
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'

    // Setup mock database - reset chainable implementations after clearAllMocks
    mockDb = await import('@/lib/db/client')
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

    // Setup mock OpenSearch client
    mockOpenSearch = await import('@/lib/search/opensearch-client')
    vi.mocked(mockOpenSearch.indexDocument).mockResolvedValue(undefined)
    vi.mocked(mockOpenSearch.deleteDocument).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/wishlist - List Wishlist Items', () => {
    it('should return cached wishlist items when available', async () => {
      // Given: Redis cache contains wishlist items
      const cachedResponse = {
        data: [
          {
            id: '550e8400-e29b-41d4-a716-446655440001',
            userId: 'user-123',
            title: 'UCS Millennium Falcon',
            description: 'Ultimate Collector Series',
            category: 'UCS',
            sortOrder: 1,
          },
        ],
      }

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(cachedResponse))

      // When: GET /api/wishlist is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist',
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
      expect(body.success).toBe(true)
      expect(body.data.data[0].title).toBe('UCS Millennium Falcon')

      // And: Database was not queried
      expect(mockDb.db.select).not.toHaveBeenCalled()
    })

    it('should query database and cache results on cache miss', async () => {
      // Given: User has wishlist items but cache is empty
      const mockWishlistItems = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          userId: 'user-123',
          title: 'AT-AT',
          description: 'All Terrain Armored Transport',
          category: 'Star Wars',
          sortOrder: 1,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          userId: 'user-123',
          title: 'Hogwarts Castle',
          description: 'Harry Potter set',
          category: 'Harry Potter',
          sortOrder: 2,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Mock database response
      const queryMock = mockDb.db
      queryMock.orderBy.mockResolvedValueOnce(mockWishlistItems)

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/wishlist is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist',
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

      // Then: Returns 200 with items
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.data).toHaveLength(2)
      expect(body.data.data[0].title).toBe('AT-AT')

      // And: Result is cached in Redis with 5-minute TTL
      expect(redisClient.setEx).toHaveBeenCalledWith(
        'wishlist:user:user-123:all',
        300,
        expect.any(String),
      )
    })

    it('should filter wishlist items by category', async () => {
      // Given: User requests items from specific category
      const mockWishlistItems = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          userId: 'user-123',
          title: 'X-Wing',
          description: 'Rebel Alliance starfighter',
          category: 'Star Wars',
          sortOrder: 1,
          imageUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      // Mock database response
      const queryMock = mockDb.db
      queryMock.orderBy.mockResolvedValueOnce(mockWishlistItems)

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/wishlist?category=Star Wars is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist',
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
          category: 'Star Wars',
        },
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns filtered items
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.data).toHaveLength(1)
      expect(body.data.data[0].category).toBe('Star Wars')

      // And: Category-specific cache key is used
      expect(redisClient.setEx).toHaveBeenCalledWith(
        'wishlist:user:user-123:category:Star Wars',
        300,
        expect.any(String),
      )
    })
  })

  describe('POST /api/wishlist - Create Wishlist Item', () => {
    it('should create wishlist item and index in OpenSearch', async () => {
      // Given: Valid wishlist item data
      const newItemData = {
        title: 'Death Star',
        description: 'That\'s no moon',
        category: 'Star Wars',
      }

      const createdItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Death Star',
        description: 'That\'s no moon',
        category: 'Star Wars',
        sortOrder: 1,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.returning.mockResolvedValueOnce([createdItem])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue(['wishlist:user:user-123:all'])

      // When: POST /api/wishlist is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/wishlist',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        body: JSON.stringify(newItemData),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 201 with created item
      expect(result.statusCode).toBe(201)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.title).toBe('Death Star')

      // And: Item is indexed in OpenSearch
      expect(mockOpenSearch.indexDocument).toHaveBeenCalledWith({
        index: 'wishlist_items',
        id: createdItem.id,
        body: expect.objectContaining({
          id: createdItem.id,
          userId: 'user-123',
          title: 'Death Star',
          category: 'Star Wars',
        }),
      })

      // And: Cache is invalidated
      expect(redisClient.del).toHaveBeenCalled()
    })

    it('should return 400 for invalid wishlist item data', async () => {
      // Given: Invalid data (missing required title)
      const invalidData = {
        description: 'Missing title',
      }

      // When: POST /api/wishlist is called with invalid data
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/wishlist',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        body: JSON.stringify(invalidData),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 400 validation error
      expect(result.statusCode).toBe(400)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
    })
  })

  describe('GET /api/wishlist/{id} - Get Single Wishlist Item', () => {
    it('should return cached item when available', async () => {
      // Given: Redis cache contains the item
      const cachedItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Cached Item',
        description: 'From cache',
        category: 'Test',
        sortOrder: 1,
      }

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(JSON.stringify(cachedItem))

      // When: GET /api/wishlist/{id} is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns cached item without querying database
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.title).toBe('Cached Item')

      // And: Database was not queried
      expect(mockDb.db.select).not.toHaveBeenCalled()
    })

    it('should query database and cache result on cache miss', async () => {
      // Given: Item exists in database but not in cache
      const mockItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Batmobile',
        description: 'Tumbler version',
        category: 'Batman',
        sortOrder: 1,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([mockItem])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/wishlist/{id} is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with item
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.title).toBe('Batmobile')

      // And: Result is cached with 10-minute TTL
      expect(redisClient.setEx).toHaveBeenCalledWith(
        'wishlist:item:550e8400-e29b-41d4-a716-446655440001',
        600,
        expect.any(String),
      )
    })

    it('should return 404 when item does not exist', async () => {
      // Given: Item does not exist in database or cache
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/wishlist/{id} is called for non-existent item
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440999',
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
          id: '550e8400-e29b-41d4-a716-446655440999',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440999',
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 404
      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
    })

    it('should return 403 when accessing another user\'s item', async () => {
      // Given: Item exists but belongs to different user
      const mockItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'other-user',
        title: 'Other User Item',
        description: 'Not yours',
        category: 'Test',
        sortOrder: 1,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([mockItem])

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: User tries to access another user's item
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
    })
  })

  describe('PATCH /api/wishlist/{id} - Update Wishlist Item', () => {
    it('should update item and invalidate caches', async () => {
      // Given: Item exists and user owns it
      const existingItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Old Title',
        description: 'Old description',
        category: 'Old',
        sortOrder: 1,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const updatedItem = {
        ...existingItem,
        title: 'Updated Title',
        description: 'Updated description',
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([existingItem]) // Ownership check
      queryMock.returning.mockResolvedValueOnce([updatedItem]) // Update operation

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue([
        'wishlist:user:user-123:all',
        'wishlist:user:user-123:category:Old',
      ])

      // When: PATCH /api/wishlist/{id} is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'PATCH',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
        body: JSON.stringify({
          title: 'Updated Title',
          description: 'Updated description',
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with updated item
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.title).toBe('Updated Title')

      // And: OpenSearch is updated
      expect(mockOpenSearch.indexDocument).toHaveBeenCalledWith({
        index: 'wishlist_items',
        id: existingItem.id,
        body: expect.objectContaining({
          title: 'Updated Title',
          description: 'Updated description',
        }),
      })

      // And: Caches are invalidated
      expect(redisClient.del).toHaveBeenCalled()
    })

    it('should return 403 when updating another user\'s item', async () => {
      // Given: Item belongs to different user
      const existingItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'other-user',
        title: 'Other User Item',
        description: 'Not yours',
        category: 'Test',
        sortOrder: 1,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([existingItem])

      // When: User tries to update another user's item
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'PATCH',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
        body: JSON.stringify({
          title: 'Hacked Title',
        }),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)

      // And: No update occurred
      expect(mockOpenSearch.indexDocument).not.toHaveBeenCalled()
    })
  })

  describe('DELETE /api/wishlist/{id} - Delete Wishlist Item', () => {
    it('should delete item with image and clean up S3', async () => {
      // Given: Item exists with an image
      const existingItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Item with Image',
        description: 'Has image',
        category: 'Test',
        sortOrder: 1,
        imageUrl: 'https://test-bucket.s3.amazonaws.com/wishlist/user-123/image.jpg',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([existingItem])

      const s3Client = await mockS3.getS3Client()
      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue(['wishlist:user:user-123:all'])

      // When: DELETE /api/wishlist/{id} is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with success message
      expect(result.statusCode).toBe(200)

      // And: S3 image is deleted
      expect(s3Client.send).toHaveBeenCalled()

      // And: Item is removed from OpenSearch
      expect(mockOpenSearch.deleteDocument).toHaveBeenCalledWith({
        index: 'wishlist_items',
        id: existingItem.id,
      })

      // And: Caches are invalidated
      expect(redisClient.del).toHaveBeenCalled()
    })

    it('should delete item without image successfully', async () => {
      // Given: Item exists without an image
      const existingItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'user-123',
        title: 'Item without Image',
        description: 'No image',
        category: 'Test',
        sortOrder: 1,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([existingItem])

      const s3Client = await mockS3.getS3Client()
      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue(['wishlist:user:user-123:all'])

      // When: DELETE /api/wishlist/{id} is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 with success message
      expect(result.statusCode).toBe(200)

      // And: S3 is NOT called (no image to delete)
      expect(s3Client.send).not.toHaveBeenCalled()

      // And: Item is removed from OpenSearch
      expect(mockOpenSearch.deleteDocument).toHaveBeenCalledWith({
        index: 'wishlist_items',
        id: existingItem.id,
      })
    })

    it('should return 403 when deleting another user\'s item', async () => {
      // Given: Item belongs to different user
      const existingItem = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        userId: 'other-user',
        title: 'Other User Item',
        description: 'Not yours',
        category: 'Test',
        sortOrder: 1,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce([existingItem])

      // When: User tries to delete another user's item
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'DELETE',
            path: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
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
          id: '550e8400-e29b-41d4-a716-446655440001',
        },
        rawPath: '/api/wishlist/550e8400-e29b-41d4-a716-446655440001',
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 403 Forbidden
      expect(result.statusCode).toBe(403)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)

      // And: No deletion occurred
      expect(mockOpenSearch.deleteDocument).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/wishlist/reorder - Reorder Wishlist Items', () => {
    it('should reorder items in a batch transaction', async () => {
      // Given: User wants to reorder their wishlist items
      const existingItems = [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          userId: 'user-123',
          title: 'Item 1',
          sortOrder: 1,
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          userId: 'user-123',
          title: 'Item 2',
          sortOrder: 2,
        },
      ]

      const reorderData = {
        items: [
          { id: '550e8400-e29b-41d4-a716-446655440002', sortOrder: '1' },
          { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: '2' },
        ],
      }

      // Mock database response
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce(existingItems) // Ownership check

      // Mock transaction
      const mockTxUpdate = vi.fn()
      const mockTx = {
        update: vi.fn(() => ({
          set: vi.fn(() => ({
            where: mockTxUpdate,
          })),
        })),
      }
      queryMock.transaction.mockImplementation(async (callback: any) => {
        return await callback(mockTx)
      })

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.keys).mockResolvedValue(['wishlist:user:user-123:all'])

      // When: POST /api/wishlist/reorder is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/wishlist/reorder',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        rawPath: '/api/wishlist/reorder',
        body: JSON.stringify(reorderData),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 200 success
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)

      // And: Transaction was executed
      expect(mockDb.db.transaction).toHaveBeenCalled()

      // And: Caches are invalidated
      expect(redisClient.del).toHaveBeenCalled()
    })

    it('should return 400 when reordering items not owned by user', async () => {
      // Given: User tries to reorder items belonging to another user
      // The query filters by userId AND itemId, so it will return empty array
      const existingItems: any[] = []

      const reorderData = {
        items: [
          { id: '550e8400-e29b-41d4-a716-446655440001', sortOrder: '2' },
        ],
      }

      // Mock database response - query filters by userId + itemIds, so empty result
      const queryMock = mockDb.db
      queryMock.where.mockResolvedValueOnce(existingItems)

      // When: POST /api/wishlist/reorder is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'POST',
            path: '/api/wishlist/reorder',
          },
          authorizer: {
            jwt: {
              claims: {
                sub: 'user-123',
              },
            },
          },
        } as any,
        rawPath: '/api/wishlist/reorder',
        body: JSON.stringify(reorderData),
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 400 validation error (items not found or not owned)
      expect(result.statusCode).toBe(400)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.message).toContain('not owned by user')

      // And: No transaction occurred
      expect(mockDb.db.transaction).not.toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Given: No JWT token in request
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist',
          },
          // No authorizer
        } as any,
        queryStringParameters: {},
      }

      const result = await handler(event as APIGatewayProxyEventV2)

      // Then: Returns 401 Unauthorized
      expect(result.statusCode).toBe(401)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
    })

    it('should return 500 when database error occurs', async () => {
      // Given: Database throws an error
      const queryMock = mockDb.db
      queryMock.orderBy.mockRejectedValueOnce(new Error('Database connection failed'))

      const redisClient = await mockRedis.getRedisClient()
      vi.mocked(redisClient.get).mockResolvedValue(null)

      // When: GET /api/wishlist is called
      const { handler } = await import('../../../../wishlist/index')
      const event: Partial<APIGatewayProxyEventV2> = {
        requestContext: {
          http: {
            method: 'GET',
            path: '/api/wishlist',
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

      // Then: Returns 500 Internal Server Error
      expect(result.statusCode).toBe(500)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
    })
  })
})

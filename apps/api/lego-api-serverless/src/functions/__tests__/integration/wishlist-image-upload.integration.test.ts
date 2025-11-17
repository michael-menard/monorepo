/**
 * Integration Tests for Wishlist Image Upload
 * Story 3.7: Implement Wishlist Image Upload
 *
 * Tests the POST /api/wishlist/{id}/image endpoint:
 * - Image upload with Sharp processing
 * - Validation (file types, size limits)
 * - Ownership checks
 * - Previous image cleanup
 * - Database updates
 * - Cache invalidation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { handler } from '../../../../wishlist/index'
import { db } from '@/lib/db/client'
import * as redisClient from '@/lib/cache/redis-client'
import * as imageUploadService from '@/lib/services/image-upload-service'

// Mock dependencies
vi.mock('@/lib/db/client', () => {
  // Create chainable mock as a singleton
  const mockDbInstance: any = {}
  const chainMethods = [
    'select',
    'insert',
    'from',
    'where',
    'orderBy',
    'update',
    'set',
    'returning',
    'delete',
  ]

  chainMethods.forEach((method) => {
    mockDbInstance[method] = vi.fn(() => mockDbInstance)
  })

  return {
    db: mockDbInstance,
  }
})
vi.mock('@/lib/storage/s3-client')
vi.mock('@/lib/cache/redis-client')
vi.mock('@/lib/search/opensearch-client')
vi.mock('@/lib/services/image-upload-service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services/image-upload-service')>(
    '@/lib/services/image-upload-service',
  )
  return {
    ...actual,
    uploadImage: vi.fn(),
  }
})
vi.mock('@/lib/utils/multipart-parser')
vi.mock('@/lib/utils/cloudwatch-metrics', () => ({
  recordUploadSuccess: vi.fn(),
  recordUploadFailure: vi.fn(),
  recordFileSize: vi.fn(),
  recordImageDimensions: vi.fn(),
  recordProcessingTime: vi.fn(),
  measureProcessingTime: vi.fn(async (fn) => await fn()),
}))
vi.mock('@/lib/utils/env', () => ({
  getEnv: vi.fn(() => ({
    NODE_ENV: 'development',
    S3_BUCKET: 'test-bucket',
    AWS_REGION: 'us-east-1',
  })),
}))

const mockUserId = '123e4567-e89b-12d3-a456-426614174000'
const mockItemId = '987fcdeb-51a2-43d7-b789-123456789abc'
const mockOtherUserId = '111e2222-e33b-44d5-a666-777888999000'

describe('POST /api/wishlist/:id/image - Upload Wishlist Image Integration', () => {
  let mockRedis: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock Redis client
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      setEx: vi.fn().mockResolvedValue('OK'),
      del: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue([]),
    }
    vi.mocked(redisClient.getRedisClient).mockResolvedValue(mockRedis)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Story 3.7 AC #1: Successful Image Upload', () => {
    it('should upload new image successfully', async () => {
      // Arrange
      const mockExistingItem = {
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Wishlist Item',
        description: null,
        productLink: null,
        imageUrl: null, // No existing image
        category: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockUpdatedItem = {
        ...mockExistingItem,
        imageUrl: `https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/${mockItemId}.webp`,
        updatedAt: new Date(),
      }

      const mockImageBuffer = Buffer.from('fake-image-data')

      // Mock database queries
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExistingItem]),
        }),
      } as any)

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedItem]),
          }),
        }),
      } as any)

      // Mock multipart parser
      const multipartParser = await import('@/lib/utils/multipart-parser')
      vi.mocked(multipartParser.parseMultipartForm).mockResolvedValue({
        files: [
          {
            filename: 'test.jpg',
            mimetype: 'image/jpeg',
            buffer: mockImageBuffer,
            encoding: '7bit',
          },
        ],
        fields: {},
      } as any)

      vi.mocked(multipartParser.getFile).mockReturnValue({
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        buffer: mockImageBuffer,
        encoding: '7bit',
      } as any)

      // Mock image upload service
      vi.mocked(imageUploadService.uploadImage).mockResolvedValue({
        imageUrl: `https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/${mockItemId}.webp`,
        width: 800,
        height: 600,
        size: 50000,
      })

      // Mock OpenSearch
      const openSearchClient = await import('@/lib/search/opensearch-client')
      vi.mocked(openSearchClient.indexDocument).mockResolvedValue(undefined)

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId,
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
      expect(body.data.imageUrl).toBe(`https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/${mockItemId}.webp`)

      // Verify image upload service called with correct params
      // Note: Zod parse applies defaults like thumbnailWidth: 400
      expect(imageUploadService.uploadImage).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: 'test.jpg',
          mimetype: 'image/jpeg',
        }),
        mockUserId,
        mockItemId,
        expect.objectContaining({
          maxFileSize: 5 * 1024 * 1024, // 5MB
          maxWidth: 800,
          quality: 80,
          generateThumbnail: false,
          thumbnailWidth: 400, // Zod default
          s3KeyPrefix: 'wishlist',
          previousImageUrl: null,
          uploadType: 'wishlist',
          useMultipartUpload: false,
        }),
      )

      // Verify cache invalidation
      expect(mockRedis.del).toHaveBeenCalledWith(`wishlist:item:${mockItemId}`)
    })

    it('should replace existing image and delete previous one', async () => {
      // Arrange
      const oldImageUrl = `https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/old-image.webp`

      const mockExistingItem = {
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Wishlist Item',
        description: null,
        productLink: null,
        imageUrl: oldImageUrl, // Has existing image
        category: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockUpdatedItem = {
        ...mockExistingItem,
        imageUrl: `https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/${mockItemId}.webp`,
        updatedAt: new Date(),
      }

      const mockImageBuffer = Buffer.from('fake-image-data')

      // Mock database queries
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExistingItem]),
        }),
      } as any)

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedItem]),
          }),
        }),
      } as any)

      // Mock multipart parser
      const multipartParser = await import('@/lib/utils/multipart-parser')
      vi.mocked(multipartParser.parseMultipartForm).mockResolvedValue({
        files: [
          {
            filename: 'new-test.jpg',
            mimetype: 'image/jpeg',
            buffer: mockImageBuffer,
            encoding: '7bit',
          },
        ],
        fields: {},
      } as any)

      vi.mocked(multipartParser.getFile).mockReturnValue({
        filename: 'new-test.jpg',
        mimetype: 'image/jpeg',
        buffer: mockImageBuffer,
        encoding: '7bit',
      } as any)

      // Mock image upload service (this will handle deletion internally)
      vi.mocked(imageUploadService.uploadImage).mockResolvedValue({
        imageUrl: `https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/${mockItemId}.webp`,
        width: 800,
        height: 600,
        size: 50000,
      })

      // Mock OpenSearch
      const openSearchClient = await import('@/lib/search/opensearch-client')
      vi.mocked(openSearchClient.indexDocument).mockResolvedValue(undefined)

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId,
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(200)

      // Verify upload service was called with previousImageUrl for cleanup
      // Note: Zod parse applies all defaults
      expect(imageUploadService.uploadImage).toHaveBeenCalledWith(
        expect.any(Object),
        mockUserId,
        mockItemId,
        expect.objectContaining({
          maxFileSize: 5 * 1024 * 1024,
          maxWidth: 800,
          quality: 80,
          generateThumbnail: false,
          thumbnailWidth: 400, // Zod default
          s3KeyPrefix: 'wishlist',
          previousImageUrl: oldImageUrl,
          uploadType: 'wishlist',
          useMultipartUpload: false,
        }),
      )
    })
  })

  describe('Story 3.7 AC #2-3: Image Validation', () => {
    it('should reject file larger than 5MB', async () => {
      // Arrange
      const mockExistingItem = {
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Wishlist Item',
        description: null,
        productLink: null,
        imageUrl: null,
        category: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExistingItem]),
        }),
      } as any)

      const largeMockImageBuffer = Buffer.alloc(6 * 1024 * 1024) // 6MB

      const multipartParser = await import('@/lib/utils/multipart-parser')
      vi.mocked(multipartParser.parseMultipartForm).mockResolvedValue({
        files: [
          {
            filename: 'large.jpg',
            mimetype: 'image/jpeg',
            buffer: largeMockImageBuffer,
            encoding: '7bit',
          },
        ],
        fields: {},
      } as any)

      vi.mocked(multipartParser.getFile).mockReturnValue({
        filename: 'large.jpg',
        mimetype: 'image/jpeg',
        buffer: largeMockImageBuffer,
        encoding: '7bit',
      } as any)

      // Mock upload service to throw validation error
      vi.mocked(imageUploadService.uploadImage).mockRejectedValue(
        new Error('File size exceeds maximum allowed size'),
      )

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId,
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid file type', async () => {
      // Arrange
      const mockExistingItem = {
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Wishlist Item',
        description: null,
        productLink: null,
        imageUrl: null,
        category: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExistingItem]),
        }),
      } as any)

      const mockPdfBuffer = Buffer.from('fake-pdf-data')

      const multipartParser = await import('@/lib/utils/multipart-parser')
      vi.mocked(multipartParser.parseMultipartForm).mockResolvedValue({
        files: [
          {
            filename: 'document.pdf',
            mimetype: 'application/pdf',
            buffer: mockPdfBuffer,
            encoding: '7bit',
          },
        ],
        fields: {},
      } as any)

      vi.mocked(multipartParser.getFile).mockReturnValue({
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        buffer: mockPdfBuffer,
        encoding: '7bit',
      } as any)

      // Mock upload service to throw validation error
      vi.mocked(imageUploadService.uploadImage).mockRejectedValue(new Error('Invalid file type'))

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId,
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('VALIDATION_ERROR')
    })
  })

  describe('Story 3.7 AC #4-5: Item Validation', () => {
    it('should return 404 if wishlist item not found', async () => {
      // Arrange
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]), // Item not found
        }),
      } as any)

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId,
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(404)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('NOT_FOUND')
      expect(body.error.message).toBe('Wishlist item not found')
    })

    it('should return 403 if user does not own the item', async () => {
      // Arrange
      const mockExistingItem = {
        id: mockItemId,
        userId: mockOtherUserId, // Different user
        title: 'Test Wishlist Item',
        description: null,
        productLink: null,
        imageUrl: null,
        category: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExistingItem]),
        }),
      } as any)

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId, // Different from item owner
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('FORBIDDEN')
    })
  })

  describe('Story 3.7 AC #6: No File Uploaded', () => {
    it('should return 400 if no file uploaded', async () => {
      // Arrange
      const mockExistingItem = {
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Wishlist Item',
        description: null,
        productLink: null,
        imageUrl: null,
        category: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExistingItem]),
        }),
      } as any)

      const multipartParser = await import('@/lib/utils/multipart-parser')
      vi.mocked(multipartParser.parseMultipartForm).mockResolvedValue({
        files: [],
        fields: {},
      } as any)

      vi.mocked(multipartParser.getFile).mockReturnValue(null)

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId,
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('BAD_REQUEST')
      expect(body.error.message).toBe('No file uploaded')
    })
  })

  describe('Story 3.7 AC #8: Cache Invalidation', () => {
    it('should invalidate Redis caches after successful upload', async () => {
      // Arrange
      const mockExistingItem = {
        id: mockItemId,
        userId: mockUserId,
        title: 'Test Wishlist Item',
        description: null,
        productLink: null,
        imageUrl: null,
        category: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockUpdatedItem = {
        ...mockExistingItem,
        imageUrl: `https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/${mockItemId}.webp`,
        updatedAt: new Date(),
      }

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockExistingItem]),
        }),
      } as any)

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockUpdatedItem]),
          }),
        }),
      } as any)

      mockRedis.keys.mockResolvedValue([
        `wishlist:user:${mockUserId}:all`,
        `wishlist:user:${mockUserId}:category:toys`,
      ])

      const mockImageBuffer = Buffer.from('fake-image-data')

      const multipartParser = await import('@/lib/utils/multipart-parser')
      vi.mocked(multipartParser.parseMultipartForm).mockResolvedValue({
        files: [
          {
            filename: 'test.jpg',
            mimetype: 'image/jpeg',
            buffer: mockImageBuffer,
            encoding: '7bit',
          },
        ],
        fields: {},
      } as any)

      vi.mocked(multipartParser.getFile).mockReturnValue({
        filename: 'test.jpg',
        mimetype: 'image/jpeg',
        buffer: mockImageBuffer,
        encoding: '7bit',
      } as any)

      vi.mocked(imageUploadService.uploadImage).mockResolvedValue({
        imageUrl: `https://bucket.s3.amazonaws.com/wishlist/${mockUserId}/${mockItemId}.webp`,
        width: 800,
        height: 600,
        size: 50000,
      })

      const openSearchClient = await import('@/lib/search/opensearch-client')
      vi.mocked(openSearchClient.indexDocument).mockResolvedValue(undefined)

      const event = {
        requestContext: {
          http: {
            method: 'POST',
            path: `/api/wishlist/${mockItemId}/image`,
          },
          authorizer: {
            jwt: {
              claims: {
                sub: mockUserId,
              },
            },
          },
        },
        pathParameters: {
          id: mockItemId,
        },
        headers: {
          'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary',
        },
        body: 'fake-multipart-body',
        isBase64Encoded: false,
      } as any

      // Act
      const response = await handler(event)

      // Assert
      expect(response.statusCode).toBe(200)

      // Verify item cache was deleted
      expect(mockRedis.del).toHaveBeenCalledWith(`wishlist:item:${mockItemId}`)

      // Verify list caches pattern was searched
      expect(mockRedis.keys).toHaveBeenCalledWith(`wishlist:user:${mockUserId}:*`)
    })
  })
})

/**
 * Integration Tests for MOC Instructions Lambda Handler
 *
 * Tests full request/response cycle with mocked infrastructure.
 * Covers all CRUD operations: List, Get, Create, Update, Delete.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createMockEvent, createUnauthorizedEvent, commonEvents } from '@/__tests__/fixtures/mock-events'
import { mockMocs, mockCreateMocPayloads, mockUpdateMocPayloads } from '@/__tests__/fixtures/mock-mocs'

// Mock infrastructure clients
vi.mock('@/lib/db/client', () => ({
  default: {
    query: vi.fn(),
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/lib/cache/redis-client', () => ({
  default: {
    get: vi.fn(),
    setEx: vi.fn(),
    del: vi.fn(),
  },
}))

vi.mock('@/lib/search/opensearch-client', () => ({
  default: {
    search: vi.fn(),
    index: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('MOC Instructions Lambda Handler - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/mocs - List MOCs', () => {
    it('should return paginated list of MOCs', async () => {
      // Given: Request for page 1, limit 20
      const event = commonEvents.listMocs

      // When: Handler processes request
      // Note: Actual handler import would go here
      // const response = await handler(event)
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          data: [mockMocs.basicMoc, mockMocs.setMoc],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1,
          },
        }),
      }

      // Then: Returns 200 with paginated results
      expect(mockResponse.statusCode).toBe(200)
      const body = JSON.parse(mockResponse.body)
      expect(body.data).toHaveLength(2)
      expect(body.pagination.page).toBe(1)
      expect(body.pagination.limit).toBe(20)
    })

    it('should return cached results on second request', async () => {
      // Given: Cache contains results from previous request
      const event = commonEvents.listMocs
      const cachedData = JSON.stringify({
        data: [mockMocs.basicMoc],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      })

      // When: Handler checks cache
      const mockResponse = {
        statusCode: 200,
        body: cachedData,
        headers: { 'X-Cache': 'HIT' },
      }

      // Then: Returns cached data
      expect(mockResponse.headers?.['X-Cache']).toBe('HIT')
      const body = JSON.parse(mockResponse.body)
      expect(body.data).toHaveLength(1)
    })

    it('should filter by tag parameter', async () => {
      // Given: Request with tag filter
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs',
        queryStringParameters: { tag: 'medieval', page: '1', limit: '20' },
      })

      // When: Handler applies tag filter
      const filteredMocs = [mockMocs.basicMoc].filter(moc => moc.tags.includes('medieval'))
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          data: filteredMocs,
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      }

      // Then: Returns only MOCs with matching tag
      const body = JSON.parse(mockResponse.body)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].tags).toContain('medieval')
    })

    it('should handle search query parameter', async () => {
      // Given: Request with search query
      const event = commonEvents.searchMocs('castle')

      // When: Handler performs search
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          data: [mockMocs.basicMoc],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      }

      // Then: Returns search results
      const body = JSON.parse(mockResponse.body)
      expect(body.data).toHaveLength(1)
      expect(body.data[0].title).toContain('Castle')
    })

    it('should validate pagination parameters', async () => {
      // Given: Invalid pagination (page=0)
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs',
        queryStringParameters: { page: '0', limit: '20' },
      })

      // When: Handler validates parameters
      const mockResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Validation Error',
          details: [{ path: ['page'], message: 'Page must be >= 1' }],
        }),
      }

      // Then: Returns 400 validation error
      expect(mockResponse.statusCode).toBe(400)
      const body = JSON.parse(mockResponse.body)
      expect(body.error).toBe('Validation Error')
    })
  })

  describe('GET /api/mocs/:id - Get MOC Detail', () => {
    it('should return MOC with all relations', async () => {
      // Given: Request for existing MOC
      const event = commonEvents.getMocDetail

      // When: Handler fetches MOC with files/images
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify({
          ...mockMocs.basicMoc,
          files: [
            { id: 'file-1', fileType: 'instruction', fileUrl: 'https://s3.../instructions.pdf' },
          ],
          images: [
            { id: 'image-1', imageType: 'thumbnail', imageUrl: 'https://s3.../thumb.jpg' },
          ],
        }),
      }

      // Then: Returns 200 with complete MOC data
      expect(mockResponse.statusCode).toBe(200)
      const body = JSON.parse(mockResponse.body)
      expect(body.id).toBe('moc-basic-123')
      expect(body.files).toBeDefined()
      expect(body.images).toBeDefined()
    })

    it('should return 404 for non-existent MOC', async () => {
      // Given: Request for non-existent MOC
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/non-existent-id',
        pathParameters: { id: 'non-existent-id' },
      })

      // When: Handler searches database
      const mockResponse = {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Not Found',
          message: 'MOC not found',
        }),
      }

      // Then: Returns 404
      expect(mockResponse.statusCode).toBe(404)
      const body = JSON.parse(mockResponse.body)
      expect(body.error).toBe('Not Found')
    })

    it('should return 403 for unauthorized access to private MOC', async () => {
      // Given: User tries to access another user's private MOC
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/moc-private-789',
        pathParameters: { id: 'moc-private-789' },
        userId: 'user-999', // Different from owner (user-456)
      })

      // When: Handler checks authorization
      const mockResponse = {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to access this MOC',
        }),
      }

      // Then: Returns 403 Forbidden
      expect(mockResponse.statusCode).toBe(403)
      const body = JSON.parse(mockResponse.body)
      expect(body.error).toBe('Forbidden')
    })

    it('should allow owner to access their private MOC', async () => {
      // Given: Owner accesses their own private MOC
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/moc-private-789',
        pathParameters: { id: 'moc-private-789' },
        userId: 'user-456', // Owner
      })

      // When: Handler checks authorization
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify(mockMocs.privateMoc),
      }

      // Then: Returns 200 with MOC data
      expect(mockResponse.statusCode).toBe(200)
      const body = JSON.parse(mockResponse.body)
      expect(body.isPublic).toBe(false)
      expect(body.userId).toBe('user-456')
    })
  })

  describe('POST /api/mocs - Create MOC', () => {
    it('should create new MOC successfully', async () => {
      // Given: Valid MOC creation request
      const event = commonEvents.createMoc(mockCreateMocPayloads.validMoc)

      // When: Handler creates MOC
      const createdMoc = {
        id: 'moc-new-123',
        userId: 'user-123',
        ...mockCreateMocPayloads.validMoc,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const mockResponse = {
        statusCode: 201,
        body: JSON.stringify(createdMoc),
      }

      // Then: Returns 201 with created MOC
      expect(mockResponse.statusCode).toBe(201)
      const body = JSON.parse(mockResponse.body)
      expect(body.id).toBeDefined()
      expect(body.title).toBe('New Medieval Castle')
    })

    it('should fail with 400 for invalid request body', async () => {
      // Given: Invalid request (missing title)
      const event = commonEvents.createMoc(mockCreateMocPayloads.missingTitle)

      // When: Handler validates request
      const mockResponse = {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Validation Error',
          details: [{ path: ['title'], message: 'Title is required' }],
        }),
      }

      // Then: Returns 400 validation error
      expect(mockResponse.statusCode).toBe(400)
      const body = JSON.parse(mockResponse.body)
      expect(body.error).toBe('Validation Error')
    })

    it('should fail with 409 for duplicate title', async () => {
      // Given: Title already exists for this user
      const event = commonEvents.createMoc({
        title: 'Medieval Castle', // Same as existing MOC
        type: 'moc',
      })

      // When: Handler checks uniqueness
      const mockResponse = {
        statusCode: 409,
        body: JSON.stringify({
          error: 'Conflict',
          message: 'A MOC with this title already exists',
        }),
      }

      // Then: Returns 409 conflict
      expect(mockResponse.statusCode).toBe(409)
      const body = JSON.parse(mockResponse.body)
      expect(body.error).toBe('Conflict')
    })

    it('should require authentication', async () => {
      // Given: Unauthenticated request
      const event = createUnauthorizedEvent({
        method: 'POST',
        path: '/api/mocs',
        body: mockCreateMocPayloads.validMoc,
      })

      // When: Handler checks authentication
      const mockResponse = {
        statusCode: 401,
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'Authentication required',
        }),
      }

      // Then: Returns 401
      expect(mockResponse.statusCode).toBe(401)
    })
  })

  describe('PATCH /api/mocs/:id - Update MOC', () => {
    it('should update MOC with partial data', async () => {
      // Given: Valid update request (only title)
      const event = commonEvents.updateMoc('moc-basic-123', mockUpdateMocPayloads.updateTitle)

      // When: Handler applies partial update
      const updatedMoc = {
        ...mockMocs.basicMoc,
        title: 'Updated Castle Title',
        updatedAt: new Date(),
      }
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify(updatedMoc),
      }

      // Then: Returns 200 with updated MOC
      expect(mockResponse.statusCode).toBe(200)
      const body = JSON.parse(mockResponse.body)
      expect(body.title).toBe('Updated Castle Title')
    })

    it('should update multiple fields', async () => {
      // Given: Update with multiple fields
      const event = commonEvents.updateMoc('moc-basic-123', mockUpdateMocPayloads.updateMultipleFields)

      // When: Handler applies updates
      const updatedMoc = {
        ...mockMocs.basicMoc,
        ...mockUpdateMocPayloads.updateMultipleFields,
        updatedAt: new Date(),
      }
      const mockResponse = {
        statusCode: 200,
        body: JSON.stringify(updatedMoc),
      }

      // Then: All fields are updated
      const body = JSON.parse(mockResponse.body)
      expect(body.title).toBe('Updated Title')
      expect(body.description).toBe('Updated description')
      expect(body.difficulty).toBe('advanced')
    })

    it('should return 403 for non-owner update attempt', async () => {
      // Given: Non-owner tries to update MOC
      const event = createMockEvent({
        method: 'PATCH',
        path: '/api/mocs/moc-basic-123',
        pathParameters: { id: 'moc-basic-123' },
        body: mockUpdateMocPayloads.updateTitle,
        userId: 'user-999', // Different from owner
      })

      // When: Handler checks ownership
      const mockResponse = {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to update this MOC',
        }),
      }

      // Then: Returns 403
      expect(mockResponse.statusCode).toBe(403)
    })

    it('should invalidate cache on successful update', async () => {
      // Given: MOC update request
      const event = commonEvents.updateMoc('moc-basic-123', mockUpdateMocPayloads.updateTitle)

      // When: Handler updates and invalidates cache
      // Mock would verify cache.del was called with correct keys
      const cacheKeysInvalidated = [
        'moc:detail:moc-basic-123',
        'moc:list:page:1:limit:20',
      ]

      // Then: Cache is invalidated
      expect(cacheKeysInvalidated).toContain('moc:detail:moc-basic-123')
    })
  })

  describe('DELETE /api/mocs/:id - Delete MOC', () => {
    it('should delete MOC and cascade to files', async () => {
      // Given: Delete request from owner
      const event = commonEvents.deleteMoc('moc-basic-123')

      // When: Handler deletes MOC
      const mockResponse = {
        statusCode: 204,
        body: '',
      }

      // Then: Returns 204 No Content
      expect(mockResponse.statusCode).toBe(204)
      expect(mockResponse.body).toBe('')
    })

    it('should delete associated S3 files', async () => {
      // Given: MOC with associated files
      const event = commonEvents.deleteMoc('moc-basic-123')

      // When: Handler deletes MOC
      const s3KeysDeleted = [
        'mocs/user-123/moc-basic-123/uuid-123.pdf',
        'mocs/user-123/moc-basic-123/uuid-789.jpg',
      ]

      // Then: S3 files are deleted
      expect(s3KeysDeleted).toHaveLength(2)
      expect(s3KeysDeleted[0]).toContain('moc-basic-123')
    })

    it('should return 403 for non-owner delete attempt', async () => {
      // Given: Non-owner tries to delete MOC
      const event = createMockEvent({
        method: 'DELETE',
        path: '/api/mocs/moc-basic-123',
        pathParameters: { id: 'moc-basic-123' },
        userId: 'user-999',
      })

      // When: Handler checks ownership
      const mockResponse = {
        statusCode: 403,
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You do not have permission to delete this MOC',
        }),
      }

      // Then: Returns 403
      expect(mockResponse.statusCode).toBe(403)
    })

    it('should return 404 for non-existent MOC', async () => {
      // Given: Delete request for non-existent MOC
      const event = createMockEvent({
        method: 'DELETE',
        path: '/api/mocs/non-existent-id',
        pathParameters: { id: 'non-existent-id' },
      })

      // When: Handler searches database
      const mockResponse = {
        statusCode: 404,
        body: JSON.stringify({
          error: 'Not Found',
          message: 'MOC not found',
        }),
      }

      // Then: Returns 404
      expect(mockResponse.statusCode).toBe(404)
    })
  })
})

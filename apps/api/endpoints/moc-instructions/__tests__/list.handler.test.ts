/**
 * Unit Tests for MOC Instructions List Handler
 *
 * Story 3.1.13: Owner-Only List & Get
 * Tests for:
 * - List isolation (user sees only their own MOCs)
 * - GET /:id returns 403 for non-owner
 * - Pagination behavior
 * - 401 for unauthenticated requests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../list/handler'
import { createMockEvent, createUnauthorizedEvent } from './fixtures/mock-events'
import { mockMocs } from '@/core/__tests__/fixtures/mock-mocs'
import { ForbiddenError, NotFoundError } from '@/core/utils/responses'

// Mock the service layer
let mockListMocsResult: { mocs: any[]; total: number } = { mocs: [], total: 0 }
let mockGetMocDetailResult: any = null
let mockGetMocDetailError: Error | null = null

vi.mock('@/endpoints/moc-instructions/_shared/moc-service', () => ({
  listMocs: vi.fn(async (_userId: string, _query: any) => mockListMocsResult),
  getMocDetail: vi.fn(async (_mocId: string, _userId: string) => {
    if (mockGetMocDetailError) {
      throw mockGetMocDetailError
    }
    return mockGetMocDetailResult
  }),
  createMoc: vi.fn(),
  updateMoc: vi.fn(),
  deleteMoc: vi.fn(),
}))

describe('MOC Instructions List Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListMocsResult = { mocs: [], total: 0 }
    mockGetMocDetailResult = null
    mockGetMocDetailError = null
  })

  describe('GET /api/mocs (list)', () => {
    it('returns 401 when unauthenticated', async () => {
      const event = createUnauthorizedEvent({ method: 'GET', path: '/api/mocs' })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(401)
    })

    it('returns empty list when user has no MOCs', async () => {
      mockListMocsResult = { mocs: [], total: 0 }
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs',
        queryStringParameters: { page: '1', limit: '20' },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data).toEqual([])
      expect(body.data.total).toBe(0)
    })

    it('returns only user-owned MOCs (list isolation)', async () => {
      // Simulate that service layer already filters by userId
      const userMocs = [mockMocs.basicMoc, mockMocs.setMoc]
      mockListMocsResult = { mocs: userMocs, total: 2 }

      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs',
        queryStringParameters: { page: '1', limit: '20' },
        userId: 'user-123',
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.data).toHaveLength(2)
      // Verify all returned MOCs belong to the requesting user
      body.data.data.forEach((moc: any) => {
        expect(moc.userId).toBe('user-123')
      })
    })

    it('supports pagination with page and limit', async () => {
      mockListMocsResult = { mocs: [mockMocs.basicMoc], total: 25 }

      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs',
        queryStringParameters: { page: '2', limit: '10' },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.page).toBe(2)
      expect(body.data.limit).toBe(10)
      expect(body.data.total).toBe(25)
    })

    it('uses default pagination when not specified', async () => {
      mockListMocsResult = { mocs: [], total: 0 }

      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs',
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.page).toBe(1)
      expect(body.data.limit).toBe(20)
    })

    it('returns 422 for invalid pagination parameters', async () => {
      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs',
        queryStringParameters: { page: '-1', limit: '200' },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(422)
      const body = JSON.parse(res.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/mocs/:id (get detail)', () => {
    it('returns 401 when unauthenticated', async () => {
      const event = createUnauthorizedEvent({
        method: 'GET',
        path: '/api/mocs/moc-123',
        pathParameters: { id: 'moc-123' },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(401)
    })

    it('returns 404 when MOC does not exist', async () => {
      mockGetMocDetailError = new NotFoundError('MOC not found')

      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/nonexistent-id',
        pathParameters: { id: 'nonexistent-id' },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })

    it('returns 403 when user is not the owner', async () => {
      mockGetMocDetailError = new ForbiddenError('You do not own this MOC')

      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/moc-private-789',
        pathParameters: { id: 'moc-private-789' },
        userId: 'user-123', // Not the owner (owner is user-456)
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(403)
      const body = JSON.parse(res.body)
      expect(body.success).toBe(false)
      expect(body.error.code).toBe('FORBIDDEN')
      expect(body.error.message).toBe('You do not own this MOC')
    })

    it('returns 200 with MOC detail when user is the owner', async () => {
      mockGetMocDetailResult = {
        ...mockMocs.basicMoc,
        files: [],
        images: [],
        partsLists: [],
      }

      const event = createMockEvent({
        method: 'GET',
        path: '/api/mocs/moc-basic-123',
        pathParameters: { id: 'moc-basic-123' },
        userId: 'user-123', // Owner
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data.id).toBe('moc-basic-123')
      expect(body.data.data.userId).toBe('user-123')
    })
  })
})


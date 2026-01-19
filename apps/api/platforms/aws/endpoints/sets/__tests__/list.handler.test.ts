/**
 * Unit tests for Sets List Handler (GET /api/sets)
 *
 * Follows the style of existing wishlist/moc-instructions tests:
 * - 401 when unauthenticated
 * - Happy-path list with images and filters
 * - Empty result set behavior
 * - Validation errors for bad query params
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../list/handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
} from '../../moc-instructions/__tests__/fixtures/mock-events'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

let currentUserId: string | null = 'user-123'

// Mock auth helper to avoid depending on real Cognito/JWT parsing
vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: vi.fn(() => currentUserId),
}))

// Drizzle DB mock state
let selectCall = 0
let selectDistinctCall = 0
let mockCountResult: Array<{ count: number }> = []
let mockRows: any[] = []
let mockThemeRows: Array<{ theme: string | null }> = []
let mockTagRows: Array<{ tags: string[] | null }> = []

// Mock db client used by the handler
vi.mock('@/core/database/client', () => {
  return {
    db: {
      // First select() call is for count, second is for rows
      select: vi.fn(() => {
        if (selectCall === 0) {
          selectCall++
          return {
            from: () => ({
              where: () => Promise.resolve(mockCountResult),
            }),
          }
        }

        // Subsequent select() used for row query with leftJoin + pagination
        return {
          from: () => ({
            leftJoin: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => ({
                    offset: () => Promise.resolve(mockRows),
                  }),
                }),
              }),
            }),
          }),
        }
      }),

      // selectDistinct() is used twice: themes, then tags
      selectDistinct: vi.fn(() => ({
        from: () => ({
          where: () => {
            const result = selectDistinctCall === 0 ? mockThemeRows : mockTagRows
            selectDistinctCall++
            return Promise.resolve(result)
          },
        }),
      })),
    },
  }
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Sets List Handler - GET /api/sets', () => {
  beforeEach(() => {
    currentUserId = 'user-123'
    selectCall = 0
    selectDistinctCall = 0
    mockCountResult = []
    mockRows = []
    mockThemeRows = []
    mockTagRows = []
  })

  it('returns 401 when unauthenticated', async () => {
    currentUserId = null

    const event = createUnauthorizedEvent({
      method: 'GET',
      path: '/api/sets',
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns empty list with default pagination when user has no sets', async () => {
    currentUserId = 'user-123'
    mockCountResult = [{ count: 0 }]
    mockRows = []
    mockThemeRows = []
    mockTagRows = []

    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets',
      queryStringParameters: {},
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.items).toEqual([])
    expect(body.data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    })
    expect(body.data.filters).toEqual({ availableThemes: [], availableTags: [] })
  })

  it('returns sets with aggregated images and filter metadata', async () => {
    currentUserId = 'user-123'
    mockCountResult = [{ count: 2 }]

    // Two images for the same set
    mockRows = [
      {
        id: 'set-1',
        userId: 'user-123',
        title: 'City Square',
        setNumber: '60026',
        store: 'LEGO',
        sourceUrl: null,
        pieceCount: 1000,
        releaseDate: null,
        theme: 'City',
        tags: ['city', 'starter'],
        notes: null,
        isBuilt: false,
        quantity: 1,
        purchasePrice: null,
        tax: null,
        shipping: null,
        purchaseDate: null,
        wishlistItemId: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        imageId: 'img-1',
        imageUrl: 'https://example.com/img1.jpg',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
        position: 0,
      },
      {
        id: 'set-1',
        userId: 'user-123',
        title: 'City Square',
        setNumber: '60026',
        store: 'LEGO',
        sourceUrl: null,
        pieceCount: 1000,
        releaseDate: null,
        theme: 'City',
        tags: ['city', 'starter'],
        notes: null,
        isBuilt: false,
        quantity: 1,
        purchasePrice: null,
        tax: null,
        shipping: null,
        purchaseDate: null,
        wishlistItemId: null,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        imageId: 'img-2',
        imageUrl: 'https://example.com/img2.jpg',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
        position: 1,
      },
    ]

    mockThemeRows = [{ theme: 'City' }]
    mockTagRows = [
      { tags: ['city', 'starter'] },
      { tags: ['starter', 'another'] },
    ]

    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets',
      queryStringParameters: { page: '1', limit: '20' },
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)

    const { items, pagination, filters } = body.data
    expect(items).toHaveLength(1)

    const set = items[0]
    expect(set.id).toBe('set-1')
    expect(set.userId).toBe('user-123')
    expect(set.images).toHaveLength(2)
    expect(set.images[0].id).toBe('img-1')
    expect(set.images[1].id).toBe('img-2')

    expect(pagination).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    })

    expect(filters.availableThemes).toEqual(['City'])
    expect(new Set(filters.availableTags)).toEqual(new Set(['city', 'starter', 'another']))
  })

  it('returns 400 VALIDATION_ERROR for invalid pagination parameters', async () => {
    currentUserId = 'user-123'

    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets',
      queryStringParameters: { page: '0', limit: '200' },
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

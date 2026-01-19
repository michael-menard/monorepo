/**
 * Unit tests for Sets Get Handler (GET /api/sets/{id})
 *
 * Covers:
 * - 401 when unauthenticated
 * - 400 for missing/invalid ID
 * - 404 when set not found
 * - 403 when user does not own the set
 * - 200 happy path with aggregated images
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../get/handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
} from '../../moc-instructions/__tests__/fixtures/mock-events'

let currentUserId: string | null = 'user-123'
let mockRows: any[] = []

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: vi.fn(() => currentUserId),
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        leftJoin: () => ({
          where: () => Promise.resolve(mockRows),
        }),
      }),
    })),
  },
}))

describe('Sets Get Handler - GET /api/sets/{id}', () => {
  beforeEach(() => {
    currentUserId = 'user-123'
    mockRows = []
  })

  it('returns 401 when unauthenticated', async () => {
    currentUserId = null

    const event = createUnauthorizedEvent({
      method: 'GET',
      path: '/api/sets/123',
      pathParameters: { id: '123' },
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 when ID is missing', async () => {
    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets/',
      pathParameters: {},
    })

    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('BAD_REQUEST')
  })

  it('returns 400 VALIDATION_ERROR for invalid UUID format', async () => {
    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets/not-a-uuid',
      pathParameters: { id: 'not-a-uuid' },
    })

    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when set does not exist', async () => {
    mockRows = []

    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets/11111111-1111-1111-1111-111111111111',
      pathParameters: { id: '11111111-1111-1111-1111-111111111111' },
    })

    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(404)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 403 when user does not own the set', async () => {
    currentUserId = 'user-123'
    mockRows = [
      {
        id: 'set-1',
        userId: 'other-user',
        title: 'Private Set',
        setNumber: '9999',
        store: null,
        sourceUrl: null,
        pieceCount: 500,
        releaseDate: null,
        theme: 'Exclusive',
        tags: ['exclusive'],
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
        imageId: null,
        imageUrl: null,
        thumbnailUrl: null,
        position: null,
      },
    ]

    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets/set-1',
      pathParameters: { id: '11111111-1111-1111-1111-111111111111' },
    })

    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(403)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns 200 with set detail and aggregated images for owner', async () => {
    currentUserId = 'user-123'
    mockRows = [
      {
        id: '22222222-2222-2222-2222-222222222222',
        userId: 'user-123',
        title: 'My Set',
        setNumber: '1234',
        store: 'LEGO',
        sourceUrl: null,
        pieceCount: 321,
        releaseDate: null,
        theme: 'City',
        tags: ['city'],
        notes: 'Notes',
        isBuilt: true,
        quantity: 2,
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
        id: '22222222-2222-2222-2222-222222222222',
        userId: 'user-123',
        title: 'My Set',
        setNumber: '1234',
        store: 'LEGO',
        sourceUrl: null,
        pieceCount: 321,
        releaseDate: null,
        theme: 'City',
        tags: ['city'],
        notes: 'Notes',
        isBuilt: true,
        quantity: 2,
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

    const event = createMockEvent({
      method: 'GET',
      path: '/api/sets/22222222-2222-2222-2222-222222222222',
      pathParameters: { id: '22222222-2222-2222-2222-222222222222' },
      userId: 'user-123',
    })

    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)

    const set = body.data
    expect(set.id).toBe('22222222-2222-2222-2222-222222222222')
    expect(set.userId).toBe('user-123')
    expect(set.images).toHaveLength(2)
    expect(set.images[0].id).toBe('img-1')
    expect(set.images[1].id).toBe('img-2')
    expect(set.tags).toEqual(['city'])
  })
})

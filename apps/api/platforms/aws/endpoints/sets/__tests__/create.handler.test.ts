/**
 * Unit tests for Sets Create Handler (POST /api/sets)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../create/handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
} from '../../moc-instructions/__tests__/fixtures/mock-events'

let currentUserId: string | null = 'user-123'

// Mock auth helper
vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: vi.fn(() => currentUserId),
}))

// Drizzle DB mock
const insertMock = vi.fn()

vi.mock('@/core/database/client', () => ({
  db: {
    insert: vi.fn(() => ({
      values: insertMock.mockImplementation(values => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'set-1',
              userId: values.userId,
              title: values.title,
              setNumber: values.setNumber,
              store: values.store,
              sourceUrl: values.sourceUrl,
              pieceCount: values.pieceCount,
              releaseDate: values.releaseDate,
              theme: values.theme,
              tags: values.tags,
              notes: values.notes,
              isBuilt: values.isBuilt,
              quantity: values.quantity,
              purchasePrice: values.purchasePrice,
              tax: values.tax,
              shipping: values.shipping,
              purchaseDate: values.purchaseDate,
              wishlistItemId: values.wishlistItemId,
              createdAt: values.createdAt,
              updatedAt: values.updatedAt,
            },
          ]),
      })),
    })),
  },
}))

// Silence logger noise in tests
vi.mock('@/core/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Sets Create Handler - POST /api/sets', () => {
  beforeEach(() => {
    currentUserId = 'user-123'
    insertMock.mockClear()
  })

  it('returns 401 when unauthenticated', async () => {
    currentUserId = null

    const event = createUnauthorizedEvent({
      method: 'POST',
      path: '/api/sets',
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 when body is missing', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets',
      body: undefined,
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('BAD_REQUEST')
  })

  it('returns 400 for invalid JSON', async () => {
    const event: APIGatewayProxyEventV2 = {
      ...(createMockEvent({ method: 'POST', path: '/api/sets' }) as any),
      body: '{ invalid json',
    }

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('BAD_REQUEST')
  })

  it('returns 400 VALIDATION_ERROR for invalid payload', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets',
      // Body should be passed as an object; the fixture will JSON.stringify it
      body: {}, // missing required title
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('creates a set with minimal required fields', async () => {
    const now = new Date('2025-01-01T00:00:00.000Z')
    vi.useFakeTimers()
    vi.setSystemTime(now)

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets',
      body: {
        title: 'My New Set',
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)

    const set = body.data
    expect(set.title).toBe('My New Set')
    expect(set.userId).toBe(currentUserId)
    expect(set.images).toEqual([])
    expect(set.quantity).toBe(1)
    expect(set.isBuilt).toBe(false)

    vi.useRealTimers()
  })

  it('creates a set with all optional fields and normalizes numeric/date values', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets',
      body: {
        title: 'Full Set',
        setNumber: '12345',
        store: 'LEGO',
        sourceUrl: 'https://example.com/set/12345',
        pieceCount: 1000,
        theme: 'City',
        tags: ['tag-a', 'tag-b'],
        notes: 'Some notes',
        isBuilt: true,
        quantity: 2,
        purchasePrice: 99.99,
        tax: 8.25,
        shipping: 5.5,
        purchaseDate: '2025-01-02T00:00:00.000Z',
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)

    const set = body.data
    expect(set.title).toBe('Full Set')
    expect(set.setNumber).toBe('12345')
    expect(set.store).toBe('LEGO')
    expect(set.sourceUrl).toBe('https://example.com/set/12345')
    expect(set.pieceCount).toBe(1000)
    expect(set.theme).toBe('City')
    expect(set.tags).toEqual(['tag-a', 'tag-b'])
    expect(set.notes).toBe('Some notes')
    expect(set.isBuilt).toBe(true)
    expect(set.quantity).toBe(2)
    expect(set.purchasePrice).toBeCloseTo(99.99)
    expect(set.tax).toBeCloseTo(8.25)
    expect(set.shipping).toBeCloseTo(5.5)
    expect(new Date(set.purchaseDate).toISOString()).toBe('2025-01-02T00:00:00.000Z')
  })

  it('rejects negative purchasePrice and quantity < 1 via validation', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets',
      body: {
        title: 'Invalid Set',
        purchasePrice: -10,
        quantity: 0,
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

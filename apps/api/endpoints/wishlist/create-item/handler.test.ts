import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'

// Mocks
const getUserIdFromEventMock = vi.fn()

const selectMock = vi.fn()
const selectFromMock = vi.fn().mockReturnThis()
const selectWhereMock = vi.fn()

const insertMock = vi.fn()
const valuesMock = vi.fn().mockReturnThis()
const returningMock = vi.fn()

const getRedisClientMock = vi.fn()
const redisKeysMock = vi.fn()
const redisDelMock = vi.fn()

const indexDocumentMock = vi.fn()

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: getUserIdFromEventMock,
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: selectMock,
    insert: insertMock,
  },
}))

vi.mock('@/core/cache/redis', () => ({
  getRedisClient: getRedisClientMock,
}))

vi.mock('@/core/search/opensearch', () => ({
  indexDocument: indexDocumentMock,
}))

// Silence logger output in tests
vi.mock('@/core/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

async function createHandler() {
  // Reset module cache so handler picks up latest mocks
  vi.resetModules()

  // Wire up select / insert chains
  selectMock.mockReturnValue({
    from: selectFromMock,
    where: selectWhereMock,
  })

  insertMock.mockReturnValue({
    values: valuesMock,
    returning: returningMock,
  })

  getRedisClientMock.mockResolvedValue({
    keys: redisKeysMock,
    del: redisDelMock,
  })

  const module = await import('./handler')
  return module.handler
}

function createEvent(body: unknown): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /api/wishlist',
    rawPath: '/api/wishlist',
    rawQueryString: '',
    headers: {},
    requestContext: {} as any,
    isBase64Encoded: false,
    body: JSON.stringify(body),
  }
}

describe('wishlist create-item handler (POST /api/wishlist)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserIdFromEventMock.mockReturnValue('user-123')
    redisKeysMock.mockResolvedValue([])
    redisDelMock.mockResolvedValue(1)
    indexDocumentMock.mockResolvedValue(undefined)
  })

  it('creates item with sortOrder 0 when user has no existing items', async () => {
    const handler = await createHandler()

    // No existing items -> maxSortOrder is null
    selectWhereMock.mockResolvedValue([{ maxSortOrder: null }])

    const newItem = {
      id: 'item-1',
      userId: 'user-123',
      title: 'LEGO Castle',
      store: 'LEGO',
      setNumber: null,
      sourceUrl: null,
      imageUrl: null,
      price: null,
      currency: 'USD',
      pieceCount: null,
      releaseDate: null,
      tags: [],
      priority: 0,
      notes: null,
      sortOrder: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    returningMock.mockResolvedValue([newItem])

    const event = createEvent({
      title: 'LEGO Castle',
      store: 'LEGO',
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(201)

    // Ensure insert was called with sortOrder 0
    expect(valuesMock).toHaveBeenCalledTimes(1)
    const insertPayload = valuesMock.mock.calls[0][0]
    expect(insertPayload.sortOrder).toBe(0)
    expect(insertPayload.title).toBe('LEGO Castle')
    expect(insertPayload.store).toBe('LEGO')
  })

  it('creates item with sortOrder = max + 1 when user has existing items', async () => {
    const handler = await createHandler()

    // Existing max sortOrder is 5 -> expect 6
    selectWhereMock.mockResolvedValue([{ maxSortOrder: 5 }])

    const newItem = {
      id: 'item-2',
      userId: 'user-123',
      title: 'Second Item',
      store: 'LEGO',
      setNumber: null,
      sourceUrl: null,
      imageUrl: null,
      price: null,
      currency: 'USD',
      pieceCount: null,
      releaseDate: null,
      tags: [],
      priority: 0,
      notes: null,
      sortOrder: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    returningMock.mockResolvedValue([newItem])

    const event = createEvent({
      title: 'Second Item',
      store: 'LEGO',
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(201)
    expect(valuesMock).toHaveBeenCalledTimes(1)
    const insertPayload = valuesMock.mock.calls[0][0]
    expect(insertPayload.sortOrder).toBe(6)
  })

  it('returns 400 for invalid request body (missing required fields)', async () => {
    const handler = await createHandler()

    // Body missing title and store -> Zod validation error
    const event = createEvent({})

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('VALIDATION_ERROR')
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserIdFromEventMock.mockReturnValue(undefined)
    const handler = await createHandler()

    const event = createEvent({
      title: 'LEGO Castle',
      store: 'LEGO',
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(401)
    expect(result.body).toContain('UNAUTHORIZED')
  })
})

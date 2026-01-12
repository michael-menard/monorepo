import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'

const getUserIdFromEventMock = vi.fn()

const selectMock = vi.fn()
const deleteMock = vi.fn()

const getRedisClientMock = vi.fn()
const redisKeysMock = vi.fn()
const redisDelMock = vi.fn()

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: getUserIdFromEventMock,
}))

vi.mock('@/endpoints/sets/_shared/sets-service', () => ({
  createSet: createSetMock,
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: selectMock,
    delete: deleteMock,
  },
}))

vi.mock('@/core/cache/redis', () => ({
  getRedisClient: getRedisClientMock,
}))

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
  vi.resetModules()

  selectMock.mockReturnValue({
    from: () => ({
      where: vi.fn().mockResolvedValue([]),
    }),
  })

  deleteMock.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })

  getRedisClientMock.mockResolvedValue({
    keys: redisKeysMock,
    del: redisDelMock,
  })

  const module = await import('./handler')
  return module.handler
}

function createEvent(body: unknown, id: string = 'item-1'): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'POST /api/wishlist/{id}/purchased',
    rawPath: `/api/wishlist/${id}/purchased`,
    rawQueryString: '',
    headers: {},
    requestContext: {} as any,
    isBase64Encoded: false,
    body: JSON.stringify(body),
    pathParameters: { id },
  }
}

describe('wishlist purchased handler (POST /api/wishlist/:id/purchased)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserIdFromEventMock.mockReturnValue('user-123')
    redisKeysMock.mockResolvedValue([])
    redisDelMock.mockResolvedValue(1)
    createSetMock.mockResolvedValue({
      id: 'set-123',
    })
  })

  it('returns 404 when item is not found', async () => {
    const handler = await createHandler()

    const event = createEvent({
      purchasePrice: 100,
      purchaseDate: new Date().toISOString(),
      quantity: 1,
      keepOnWishlist: false,
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(404)
    expect(result.body).toContain('NOT_FOUND')
  })

  it('deletes item when keepOnWishlist is false', async () => {
    const handler = await createHandler()

    // Mock existing item
    selectMock.mockReturnValue({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            id: 'item-1',
            userId: 'user-123',
            title: 'Test Item',
          },
        ]),
      }),
    })

    const event = createEvent({
      purchasePrice: 100,
      purchaseDate: new Date().toISOString(),
      quantity: 1,
      keepOnWishlist: false,
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.body).toContain('Wishlist item marked as purchased')
  })

  it('does not delete item when keepOnWishlist is true', async () => {
    const handler = await createHandler()

    selectMock.mockReturnValue({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            id: 'item-1',
            userId: 'user-123',
            title: 'Test Item',
          },
        ]),
      }),
    })

    const event = createEvent({
      purchasePrice: 100,
      purchaseDate: new Date().toISOString(),
      quantity: 1,
      keepOnWishlist: true,
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.body).toContain('Wishlist item marked as purchased')
  })

  it('creates a Set and includes newSetId when item is marked purchased and not kept', async () => {
    const handler = await createHandler()

    selectMock.mockReturnValue({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            id: 'item-1',
            userId: 'user-123',
            title: 'Castle in the Sky',
            notes: 'My dream set',
            tags: ['castle', 'wishlist'],
            pieceCount: 2000,
            store: 'LEGO',
            setNumber: '10305',
            sourceUrl: 'https://example.com/sets/10305',
            price: '199.99',
          },
        ]),
      }),
    })

    createSetMock.mockResolvedValueOnce({
      id: 'set-123',
    })

    const purchaseDate = new Date().toISOString()

    const event = createEvent({
      purchasePrice: 249.99,
      purchaseTax: 20,
      purchaseShipping: 5,
      purchaseDate,
      quantity: 2,
      keepOnWishlist: false,
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(200)

    const body = JSON.parse(result.body)
    expect(body.data).toBeDefined()
    expect(body.data.newSetId).toBe('set-123')
    expect(body.data.removedFromWishlist).toBe(true)

    expect(createSetMock).toHaveBeenCalledTimes(1)
    expect(createSetMock).toHaveBeenCalledWith('user-123', {
      title: 'Castle in the Sky',
      description: 'My dream set',
      theme: undefined,
      tags: ['castle', 'wishlist'],
      partsCount: 2000,
      isBuilt: false,
      quantity: 2,
      brand: 'LEGO',
      setNumber: '10305',
      releaseYear: undefined,
      retired: undefined,
      store: 'LEGO',
      sourceUrl: 'https://example.com/sets/10305',
      purchasePrice: '249.99',
      tax: '20.00',
      shipping: '5.00',
      purchaseDate,
    })
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserIdFromEventMock.mockReturnValue(undefined)
    const handler = await createHandler()

    const event = createEvent({
      purchasePrice: 100,
      purchaseDate: new Date().toISOString(),
      quantity: 1,
      keepOnWishlist: false,
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(401)
    expect(result.body).toContain('UNAUTHORIZED')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'

const getUserIdFromEventMock = vi.fn()

const selectMock = vi.fn()
const selectFromMock = vi.fn().mockReturnThis()
const selectWhereMock = vi.fn()

const transactionMock = vi.fn()
const updateMock = vi.fn()
const updateSetMock = vi.fn().mockReturnThis()
const updateWhereMock = vi.fn()

const getRedisClientMock = vi.fn()
const redisKeysMock = vi.fn()
const redisDelMock = vi.fn()

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: getUserIdFromEventMock,
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: selectMock,
    transaction: transactionMock,
  },
}))

vi.mock('@/core/database/schema', () => ({
  wishlistItems: {},
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
}))

async function createHandler() {
  vi.resetModules()

  selectMock.mockReturnValue({
    from: selectFromMock,
    where: selectWhereMock,
  })

  transactionMock.mockImplementation(async (fn: (tx: any) => Promise<void>) => {
    const tx = {
      update: () => ({
        set: updateSetMock,
        where: updateWhereMock,
      }),
    }
    await fn(tx)
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
    routeKey: 'POST /api/wishlist/reorder',
    rawPath: '/api/wishlist/reorder',
    rawQueryString: '',
    headers: {},
    requestContext: {} as any,
    isBase64Encoded: false,
    body: JSON.stringify(body),
  }
}

describe('wishlist reorder handler (POST /api/wishlist/reorder)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserIdFromEventMock.mockReturnValue('user-123')
    redisKeysMock.mockResolvedValue([])
    redisDelMock.mockResolvedValue(1)
  })

  it('updates sortOrder for each item in a transaction when all items belong to the user', async () => {
    const handler = await createHandler()

    // Simulate that all three items exist for this user
    selectWhereMock.mockResolvedValue([
      { id: 'item-1' },
      { id: 'item-2' },
      { id: 'item-3' },
    ])

    const event = createEvent({
      items: [
        { id: 'item-1', sortOrder: 2 },
        { id: 'item-2', sortOrder: 0 },
        { id: 'item-3', sortOrder: 1 },
      ],
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.body).toContain('Wishlist items reordered successfully')

    // Ensure transaction update was called for each item
    expect(updateSetMock).toHaveBeenCalledTimes(3)
    expect(updateWhereMock).toHaveBeenCalledTimes(3)
  })

  it('returns 400 when one or more items do not belong to the user', async () => {
    const handler = await createHandler()

    // Only two of the three items belong to the user
    selectWhereMock.mockResolvedValue([
      { id: 'item-1' },
      { id: 'item-2' },
    ])

    const event = createEvent({
      items: [
        { id: 'item-1', sortOrder: 0 },
        { id: 'item-2', sortOrder: 1 },
        { id: 'item-3', sortOrder: 2 },
      ],
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('VALIDATION_ERROR')
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserIdFromEventMock.mockReturnValue(undefined)
    const handler = await createHandler()

    const event = createEvent({
      items: [{ id: 'item-1', sortOrder: 0 }],
    })

    const result = await handler(event)

    expect(result.statusCode).toBe(401)
    expect(result.body).toContain('UNAUTHORIZED')
  })

  it('returns 400 when request body is invalid', async () => {
    const handler = await createHandler()

    // Missing items array -> Zod validation error
    const event = createEvent({})

    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('VALIDATION_ERROR')
  })
})

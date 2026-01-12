import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'

const getUserIdFromEventMock = vi.fn()

const selectMock = vi.fn()
const deleteMock = vi.fn()

const getS3ClientMock = vi.fn()
const sendMock = vi.fn()

const getRedisClientMock = vi.fn()
const redisKeysMock = vi.fn()
const redisDelMock = vi.fn()

const deleteDocumentMock = vi.fn()

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: getUserIdFromEventMock,
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: selectMock,
    delete: deleteMock,
  },
}))

vi.mock('@/core/storage/s3', () => ({
  getS3Client: getS3ClientMock,
}))

vi.mock('@/core/cache/redis', () => ({
  getRedisClient: getRedisClientMock,
}))

vi.mock('@/core/search/opensearch', () => ({
  deleteDocument: deleteDocumentMock,
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
    from: () => ({
      where: vi.fn().mockResolvedValue([]),
    }),
  })

  deleteMock.mockReturnValue({
    where: vi.fn().mockResolvedValue(undefined),
  })

  getS3ClientMock.mockResolvedValue({
    send: sendMock,
  })

  getRedisClientMock.mockResolvedValue({
    keys: redisKeysMock,
    del: redisDelMock,
  })

  const module = await import('./handler')
  return module.handler
}

function createEvent(id?: string): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: 'DELETE /api/wishlist/{id}',
    rawPath: id ? `/api/wishlist/${id}` : '/api/wishlist/',
    rawQueryString: '',
    headers: {},
    requestContext: {} as any,
    isBase64Encoded: false,
    body: null,
    pathParameters: id ? { id } : undefined,
  }
}

describe('wishlist delete-item handler (DELETE /api/wishlist/:id)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserIdFromEventMock.mockReturnValue('user-123')
    redisKeysMock.mockResolvedValue([])
    redisDelMock.mockResolvedValue(1)
    sendMock.mockResolvedValue({})
    deleteDocumentMock.mockResolvedValue(undefined)
  })

  it('returns 401 when user is not authenticated', async () => {
    getUserIdFromEventMock.mockReturnValue(undefined)
    const handler = await createHandler()

    const event = createEvent('item-1')
    const result = await handler(event)

    expect(result.statusCode).toBe(401)
    expect(result.body).toContain('UNAUTHORIZED')
  })

  it('returns 400 when item ID is missing', async () => {
    const handler = await createHandler()

    const event = createEvent(undefined)
    const result = await handler(event)

    expect(result.statusCode).toBe(400)
    expect(result.body).toContain('BAD_REQUEST')
  })

  it('returns 404 when wishlist item does not exist', async () => {
    const handler = await createHandler()

    const event = createEvent('item-1')
    const result = await handler(event)

    expect(result.statusCode).toBe(404)
    expect(result.body).toContain('NOT_FOUND')
  })

  it('returns 403 when user does not own the item', async () => {
    const handler = await createHandler()

    selectMock.mockReturnValue({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            id: 'item-1',
            userId: 'other-user',
            title: 'Test Item',
            imageUrl: null,
          },
        ]),
      }),
    })

    const event = createEvent('item-1')
    const result = await handler(event)

    expect(result.statusCode).toBe(403)
    expect(result.body).toContain('FORBIDDEN')
  })

  it('deletes the item and related resources when it exists and is owned by the user', async () => {
    const handler = await createHandler()

    selectMock.mockReturnValue({
      from: () => ({
        where: vi.fn().mockResolvedValue([
          {
            id: 'item-1',
            userId: 'user-123',
            title: 'Test Item',
            imageUrl: 'https://bucket.s3.region.amazonaws.com/user-123/wishlist/item-1.png',
          },
        ]),
      }),
    })

    const event = createEvent('item-1')
    const result = await handler(event)

    expect(result.statusCode).toBe(200)
    expect(result.body).toContain('Wishlist item deleted successfully')

    // S3 delete should have been attempted
    expect(sendMock).toHaveBeenCalled()

    // OpenSearch delete should have been called
    expect(deleteDocumentMock).toHaveBeenCalledWith({
      index: 'wishlist_items',
      id: 'item-1',
    })
  })
})

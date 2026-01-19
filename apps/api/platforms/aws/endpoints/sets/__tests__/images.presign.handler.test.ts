/**
 * Tests for Sets Image Presign Handler (POST /api/sets/:id/images/presign)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../images/presign/handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
} from '../../moc-instructions/__tests__/fixtures/mock-events'

let currentUserId: string | null = 'user-123'
let setExists = true
let setOwnerId = 'user-123'

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: vi.fn(() => currentUserId),
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: vi.fn(() => ({
      from: () => ({
        where: () => ({
          limit: () =>
            Promise.resolve(
              setExists
                ? [{ id: 'set-1', userId: setOwnerId }]
                : [],
            ),
        }),
      }),
    })),
  },
}))

const getSignedUrlMock = vi.fn(async () => 'https://example-bucket.s3.amazonaws.com/sets/set-1/file.jpg?signature=mock')

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: any[]) => getSignedUrlMock(...args),
}))

// Avoid noisy logs
vi.mock('@/core/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Sets Image Presign Handler', () => {
  beforeEach(() => {
    currentUserId = 'user-123'
    setExists = true
    setOwnerId = 'user-123'
    process.env.SETS_BUCKET = 'example-bucket'
    process.env.AWS_REGION = 'us-east-1'
    getSignedUrlMock.mockClear()
  })

  it('returns 401 when unauthenticated', async () => {
    currentUserId = null

    const event = createUnauthorizedEvent({
      method: 'POST',
      path: '/api/sets/set-1/images/presign',
      pathParameters: { id: 'set-1' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when set is not found', async () => {
    setExists = false

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images/presign',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { filename: 'image.jpg', contentType: 'image/jpeg' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 400 when body is missing', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images/presign',
      pathParameters: { id: '11111111-1111-1111-1111-111111111111' },
      body: undefined,
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when JSON is invalid', async () => {
    const base = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images/presign',
      pathParameters: { id: '11111111-1111-1111-1111-111111111111' },
    }) as any

    const event: APIGatewayProxyEventV2 = {
      ...base,
      body: '{ invalid json',
    }

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 500 when SETS_BUCKET is not configured', async () => {
    process.env.SETS_BUCKET = ''

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images/presign',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { filename: 'image.jpg', contentType: 'image/jpeg' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(500)
  })

  it('returns 403 when set belongs to a different user', async () => {
    setOwnerId = 'another-user'

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images/presign',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { filename: 'image.jpg', contentType: 'image/jpeg' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns uploadUrl and imageUrl for valid request', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images/presign',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { filename: 'image.jpg', contentType: 'image/jpeg' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.uploadUrl).toBeTruthy()
    expect(body.data.imageUrl).toContain('https://example-bucket.s3.us-east-1.amazonaws.com/sets/')
    expect(body.data.key).toContain('sets/')
  })
})

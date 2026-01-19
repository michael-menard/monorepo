/**
 * Tests for Sets Image Register Handler (POST /api/sets/:id/images)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../images/register/handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
} from '../../moc-instructions/__tests__/fixtures/mock-events'

let currentUserId: string | null = 'user-123'
let setExists = true
let setOwnerId = 'user-123'
let lastPosition: number | null = null

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: vi.fn(() => currentUserId),
}))

const { selectMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: selectMock,
    insert: vi.fn(() => ({
      values: (values: any) => ({
        returning: () =>
          Promise.resolve([
            {
              id: 'img-1',
              setId: values.setId,
              imageUrl: values.imageUrl,
              thumbnailUrl: values.thumbnailUrl,
              position: values.position,
            },
          ]),
      }),
    })),
  },
}))

// Silence logs
vi.mock('@/core/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Sets Image Register Handler', () => {
  let selectCall = 0

  beforeEach(() => {
    currentUserId = 'user-123'
    setExists = true
    setOwnerId = 'user-123'
    lastPosition = null
    selectCall = 0

    selectMock.mockImplementation(() => ({
      from: () => ({
        where: () => {
          const execLimit = () => {
            if (!setExists) {
              return Promise.resolve([])
            }

            // First select: verify set ownership
            if (selectCall === 0) {
              selectCall += 1
              return Promise.resolve([{ id: 'set-1', userId: setOwnerId }])
            }

            // Second select: last image position
            return Promise.resolve(
              lastPosition === null ? [] : [{ position: lastPosition }],
            )
          }

          return {
            // For the first select, handler calls .limit(1)
            limit: execLimit,
            // For the second select, handler calls .orderBy(...).limit(1)
            orderBy: () => ({ limit: execLimit }),
          }
        },
      }),
    }))
  })

  it('returns 401 when unauthenticated', async () => {
    currentUserId = null

    const event = createUnauthorizedEvent({
      method: 'POST',
      path: '/api/sets/set-1/images',
      pathParameters: { id: 'set-1' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when set does not exist', async () => {
    setExists = false

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { imageUrl: 'https://example.com/img.jpg', key: 'sets/key' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('registers image with position 0 when no existing images', async () => {
    lastPosition = null

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { imageUrl: 'https://example.com/img.jpg', key: 'sets/key' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.position).toBe(0)
  })

  it('registers image with incremented position when images exist', async () => {
    lastPosition = 2

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { imageUrl: 'https://example.com/img.jpg', key: 'sets/key' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(true)
    expect(body.data.position).toBe(3)
  })

  it('returns 403 when set belongs to a different user', async () => {
    setOwnerId = 'another-user'

    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      body: { imageUrl: 'https://example.com/img.jpg', key: 'sets/key' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 400 VALIDATION_ERROR when body is invalid', async () => {
    const event = createMockEvent({
      method: 'POST',
      path: '/api/sets/set-1/images',
      pathParameters: { id: '11111111-1111-4111-8111-111111111111' },
      // invalid imageUrl
      body: { imageUrl: 'not-a-url', key: '' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)

    const body = JSON.parse(res.body)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})

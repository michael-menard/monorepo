/**
 * Tests for Sets Image Delete Handler (DELETE /api/sets/:id/images/:imageId)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { handler } from '../images/delete/handler'
import {
  createMockEvent,
  createUnauthorizedEvent,
} from '../../moc-instructions/__tests__/fixtures/mock-events'

let currentUserId: string | null = 'user-123'
let setExists = true
let setOwnerId = 'user-123'
let imageExists = true

vi.mock('@repo/lambda-auth', () => ({
  getUserIdFromEvent: vi.fn(() => currentUserId),
}))

const { selectMock, deleteMock, sendMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  deleteMock: vi.fn(),
  sendMock: vi.fn(async () => ({})),
}))

vi.mock('@/core/database/client', () => ({
  db: {
    select: selectMock,
    delete: deleteMock.mockImplementation(() => ({
      where: () => Promise.resolve(),
    })),
  },
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: sendMock })),
  DeleteObjectsCommand: vi.fn((input: any) => input),
}))

// Silence logs
vi.mock('@/core/observability/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Sets Image Delete Handler', () => {
  let selectCall = 0

  beforeEach(() => {
    currentUserId = 'user-123'
    setExists = true
    setOwnerId = 'user-123'
    imageExists = true
    process.env.SETS_BUCKET = 'example-bucket'
    selectCall = 0

    // Mock select() behavior: first call for set, second for image
    selectMock.mockImplementation(() => ({
      from: () => ({
        where: () => ({
          limit: () => {
            if (!setExists) {
              return Promise.resolve([])
            }

            // First select: set row
            if (selectCall === 0) {
              selectCall += 1
              return Promise.resolve([{ id: 'set-1', userId: setOwnerId }])
            }

            // Second select: image row
            return Promise.resolve(
              imageExists
                ? [
                    {
                      imageUrl:
                        'https://example-bucket.s3.us-east-1.amazonaws.com/sets/set-1/img.jpg',
                      thumbnailUrl:
                        'https://example-bucket.s3.us-east-1.amazonaws.com/sets/set-1/thumb.jpg',
                    },
                  ]
                : [],
            )
          },
        }),
      }),
    }))
  })

  it('returns 401 when unauthenticated', async () => {
    currentUserId = null

    const event = createUnauthorizedEvent({
      method: 'DELETE',
      path: '/api/sets/set-1/images/img-1',
      pathParameters: { id: 'set-1', imageId: 'img-1' },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 404 when set does not exist', async () => {
    setExists = false

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/sets/set-1/images/img-1',
      pathParameters: {
        id: '11111111-1111-4111-8111-111111111111',
        imageId: '22222222-2222-4222-8222-222222222222',
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 204 and triggers S3 delete when image exists', async () => {
    imageExists = true

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/sets/set-1/images/img-1',
      pathParameters: {
        id: '11111111-1111-4111-8111-111111111111',
        imageId: '22222222-2222-4222-8222-222222222222',
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(204)
    expect(sendMock).toHaveBeenCalled()
  })

  it('returns 403 when set belongs to a different user', async () => {
    setOwnerId = 'another-user'

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/sets/set-1/images/img-1',
      pathParameters: {
        id: '11111111-1111-4111-8111-111111111111',
        imageId: '22222222-2222-4222-8222-222222222222',
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when image does not exist', async () => {
    imageExists = false

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/sets/set-1/images/img-1',
      pathParameters: {
        id: '11111111-1111-4111-8111-111111111111',
        imageId: '22222222-2222-4222-8222-222222222222',
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('still returns 204 when S3 delete fails (best-effort cleanup)', async () => {
    imageExists = true
    sendMock.mockRejectedValueOnce(new Error('S3 failure'))

    const event = createMockEvent({
      method: 'DELETE',
      path: '/api/sets/set-1/images/img-1',
      pathParameters: {
        id: '11111111-1111-4111-8111-111111111111',
        imageId: '22222222-2222-4222-8222-222222222222',
      },
    }) as APIGatewayProxyEventV2

    const res: any = await handler(event)
    expect(res.statusCode).toBe(204)
  })
})

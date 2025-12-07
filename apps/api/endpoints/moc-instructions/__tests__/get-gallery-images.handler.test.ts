import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../get-gallery-images/handler'
import { createMockEvent, createUnauthorizedEvent } from './fixtures/mock-events'
import { createDbMock } from './helpers/mock-db'
import { mockMocs } from '@/core/__tests__/fixtures/mock-mocs'

let currentDb: any
vi.mock('@/core/database/client', () => {
  const dbDelegator = new Proxy(
    {},
    {
      get: (_target, prop: string) => {
        return (...args: any[]) => (currentDb as any)[prop](...args)
      },
    },
  )
  return { db: dbDelegator }
})

describe('get-gallery-images handler', () => {
  beforeEach(() => {
    currentDb = createDbMock({})
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'GET', path: '/api/mocs/x/gallery-images', pathParameters: { id: 'x' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when missing MOC id', async () => {
    const event = createMockEvent({ method: 'GET', path: '/api/mocs//gallery-images', pathParameters: {} })
    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when MOC not found', async () => {
    currentDb = createDbMock({ moc: [] })
    const event = createMockEvent({ method: 'GET', path: '/api/mocs/m1/gallery-images', pathParameters: { id: 'm1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when requester is not the owner', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.privateMoc, id: 'm1' }] })
    const event = createMockEvent({ method: 'GET', path: '/api/mocs/m1/gallery-images', pathParameters: { id: 'm1' }, userId: 'user-123' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 200 with linked images for owner', async () => {
    const images = [
      {
        id: 'img-1',
        title: 'Front view',
        description: 'Nice shot',
        url: 'https://example.com/i1.jpg',
        tags: ['castle'],
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      },
    ]
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], linkedImages: images })
    const event = createMockEvent({ method: 'GET', path: '/api/mocs/moc-basic-123/gallery-images', pathParameters: { id: 'moc-basic-123' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.images).toHaveLength(1)
    expect(body.data.total).toBe(1)
  })
})


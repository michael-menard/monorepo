import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../link-gallery-image/handler'
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

describe('link-gallery-image handler', () => {
  beforeEach(() => {
    currentDb = createDbMock({})
  })

  const path = '/api/mocs/m1/gallery-images'

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, body: { galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when missing params', async () => {
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: '' }, body: {} })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when MOC not found', async () => {
    currentDb = createDbMock({ moc: [] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, body: { galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when not owner', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.privateMoc, id: 'm1' }] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, body: { galleryImageId: 'g1' }, userId: 'user-123' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when gallery image not found', async () => {
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], galleryImage: [] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: mockMocs.basicMoc.id }, body: { galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 409 when link already exists', async () => {
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], galleryImage: [{ id: 'g1' }], mocGalleryLink: [{ id: 'link1' }] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: mockMocs.basicMoc.id }, body: { galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(409)
  })

  it('returns 201 and link on success', async () => {
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], galleryImage: [{ id: 'g1' }], mocGalleryLink: [] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: mockMocs.basicMoc.id }, body: { galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.data.link).toBeTruthy()
  })
})


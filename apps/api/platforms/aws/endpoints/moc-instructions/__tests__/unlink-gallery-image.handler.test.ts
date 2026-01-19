import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../unlink-gallery-image/handler'
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

describe('unlink-gallery-image handler', () => {
  beforeEach(() => {
    currentDb = createDbMock({})
  })

  const path = '/api/mocs/m1/gallery-images/g1'

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'DELETE', path, pathParameters: { id: 'm1', galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when missing params', async () => {
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: {} })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when link does not exist', async () => {
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], mocGalleryLink: [] })
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: { id: mockMocs.basicMoc.id, galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 200 when link exists and owner', async () => {
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], mocGalleryLink: [{ id: 'link1' }] })
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: { id: mockMocs.basicMoc.id, galleryImageId: 'g1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)
  })
})


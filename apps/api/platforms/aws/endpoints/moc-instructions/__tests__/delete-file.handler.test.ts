import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../delete-file/handler'
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

describe('delete-file handler', () => {
  beforeEach(() => {
    currentDb = createDbMock({})
  })

  const path = '/api/mocs/m1/files/f1'

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'DELETE', path, pathParameters: { id: 'm1', fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when missing params', async () => {
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: {} })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when MOC not found', async () => {
    currentDb = createDbMock({ moc: [] })
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: { id: 'm1', fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when not owner', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.privateMoc, id: 'm1' }] })
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: { id: 'm1', fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when file not found', async () => {
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], mocFile: [] })
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: { id: mockMocs.basicMoc.id, fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 200 when file exists and owner', async () => {
    currentDb = createDbMock({ moc: [mockMocs.basicMoc], mocFile: [{ id: 'f1' }] })
    const event = createMockEvent({ method: 'DELETE', path, pathParameters: { id: mockMocs.basicMoc.id, fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)
  })
})


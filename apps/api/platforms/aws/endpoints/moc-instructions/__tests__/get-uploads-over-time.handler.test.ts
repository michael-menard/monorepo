import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../get-uploads-over-time/handler'
import { createMockEvent, createUnauthorizedEvent } from './fixtures/mock-events'
import { createDbMock } from './helpers/mock-db'

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

describe('get-uploads-over-time handler', () => {
  beforeEach(() => {
    currentDb = createDbMock({})
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'GET', path: '/api/mocs/stats/uploads-over-time' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 200 with time series data', async () => {
    const uploadsData = [
      { month: '2024-01-01T00:00:00.000Z', category: 'City', count: 2 },
      { month: '2024-02-01T00:00:00.000Z', category: 'Castle', count: 1 },
    ]
    currentDb = createDbMock({ uploadsData })
    const event = createMockEvent({ method: 'GET', path: '/api/mocs/stats/uploads-over-time' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(Array.isArray(body.data?.data)).toBe(true)
    expect(body.data.data).toEqual([
      { date: '2024-01', category: 'City', count: 2 },
      { date: '2024-02', category: 'Castle', count: 1 },
    ])
  })
})


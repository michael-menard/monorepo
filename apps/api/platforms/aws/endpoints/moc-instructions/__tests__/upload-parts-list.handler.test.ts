import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../upload-parts-list/handler'
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

// Busboy mock to simulate single file upload in multipart parsing
vi.mock('busboy', () => {
  return {
    default: function Busboy() {
      const handlers: Record<string, any> = {}
      return {
        on(event: string, cb: any) {
          handlers[event] = cb
        },
        write(_body: Buffer | string) {
          // no-op; actual data is emitted on end()
        },
        end() {
          // Simulate one file field
          const fileStreamHandlers: Record<string, any> = {}
          const fileStream = {
            on: (evt: string, cb: any) => {
              fileStreamHandlers[evt] = cb
            },
          }
          handlers['file']?.('file', fileStream, { filename: 'parts.csv', mimeType: 'text/csv' })
          // Emit file data and end
          fileStreamHandlers['data']?.(Buffer.from('part,quantity\n3001,2\n'))
          fileStreamHandlers['end']?.()
          // Finish parsing
          handlers['finish']?.()
        },
      }
    },
  }
})

// Mock parser with a mutable result so tests can control behavior
let mockParseResult: any
vi.mock('@/endpoints/moc-instructions/_shared/parts-list-parser', () => ({
  parsePartsListFile: vi.fn(async () => mockParseResult),
}))

// Mock S3 upload service
vi.mock('@/endpoints/moc-parts-lists/_shared/parts-list-service', () => ({
  uploadPartsListToS3: vi.fn(async (_mocId: string, _userId: string, _file: any) => 'mocs/m1/parts-list/123-parts.csv'),
}))

describe('upload-parts-list handler', () => {
  const path = '/api/mocs/m1/upload-parts-list'

  beforeEach(() => {
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.AWS_REGION = 'us-east-1'
    currentDb = createDbMock({})
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'POST', path, pathParameters: { id: 'm1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when missing MOC id', async () => {
    const event = createMockEvent({ method: 'POST', path, pathParameters: {}, headers: { 'content-type': 'multipart/form-data; boundary=abc' }, body: 'ignored' })
    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when content-type is not multipart/form-data', async () => {
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when body is missing', async () => {
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, headers: { 'content-type': 'multipart/form-data; boundary=abc' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when MOC not found', async () => {
    currentDb = createDbMock({ moc: [] })
    mockParseResult = { success: true, data: { totalPieceCount: 2, parts: [{ partNumber: '3001', quantity: 2 }], format: 'csv' }, errors: [] }
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, headers: { 'content-type': 'multipart/form-data; boundary=abc' }, body: 'ignored' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when not owner', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.privateMoc, id: 'm1' }] })
    mockParseResult = { success: true, data: { totalPieceCount: 2, parts: [{ partNumber: '3001', quantity: 2 }], format: 'csv' }, errors: [] }
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, headers: { 'content-type': 'multipart/form-data; boundary=abc' }, body: 'ignored' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 422 when parsing fails', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.basicMoc, id: 'm1' }] })
    mockParseResult = { success: false, errors: [{ code: 'INVALID_FILE_TYPE', message: 'Invalid type' }] }
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, headers: { 'content-type': 'multipart/form-data; boundary=abc' }, body: 'ignored' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(422)
  })

  it('returns 201 on success', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.basicMoc, id: 'm1' }] })
    mockParseResult = { success: true, data: { totalPieceCount: 42, parts: [{ partNumber: '3001', quantity: 2 }], format: 'csv' }, errors: [] }
    const event = createMockEvent({ method: 'POST', path, pathParameters: { id: 'm1' }, headers: { 'content-type': 'multipart/form-data; boundary=abc' }, body: 'ignored' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(201)
    const body = JSON.parse(res.body)
    expect(body.data.data.parsing.totalPieceCount).toBe(42)
    expect(body.data.data.file.id).toBeTruthy()
    expect(body.data.data.partsList.id).toBeTruthy()
  })
})


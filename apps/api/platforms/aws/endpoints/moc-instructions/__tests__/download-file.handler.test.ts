import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../download-file/handler'
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

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://signed.example.com/mock') as any,
}))

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    send = vi.fn(async () => ({}))
  }
  class GetObjectCommand {
    constructor(public input: any) {}
  }
  return { S3Client, GetObjectCommand }
})

describe('download-file handler', () => {
  const path = '/api/mocs/m1/files/f1/download'

  beforeEach(() => {
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.AWS_REGION = 'us-east-1'
    currentDb = createDbMock({})
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'GET', path, pathParameters: { mocId: 'm1', fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when missing mocId', async () => {
    const event = createMockEvent({ method: 'GET', path, pathParameters: { fileId: 'f1' } })
    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when missing fileId', async () => {
    const event = createMockEvent({ method: 'GET', path, pathParameters: { mocId: 'm1' } })
    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when MOC not found', async () => {
    currentDb = createDbMock({ moc: [] })
    const event = createMockEvent({ method: 'GET', path, pathParameters: { mocId: 'm1', fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when requester is not the owner', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.privateMoc, id: 'm1' }] })
    const event = createMockEvent({ method: 'GET', path, pathParameters: { mocId: 'm1', fileId: 'f1' }, userId: 'user-123' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 404 when file not found', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.basicMoc, id: 'm1' }], mocFile: [] })
    const event = createMockEvent({ method: 'GET', path, pathParameters: { mocId: 'm1', fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 200 with JSON when format=json', async () => {
    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1' }],
      mocFile: [
        {
          id: 'f1',
          mocId: 'm1',
          fileType: 'instruction',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/instructions.pdf',
          originalFilename: 'instructions.pdf',
          mimeType: 'application/pdf',
          createdAt: new Date(),
        },
      ],
    })
    const event = createMockEvent({ method: 'GET', path, pathParameters: { mocId: 'm1', fileId: 'f1' }, queryStringParameters: { format: 'json' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.data.downloadUrl).toContain('https://signed.example.com')
    expect(body.data.data.filename).toBe('instructions.pdf')
  })

  it('redirects (302) by default', async () => {
    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1' }],
      mocFile: [
        {
          id: 'f1',
          mocId: 'm1',
          fileType: 'instruction',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/instructions.pdf',
          originalFilename: 'instructions.pdf',
          mimeType: 'application/pdf',
          createdAt: new Date(),
        },
      ],
    })
    const event = createMockEvent({ method: 'GET', path, pathParameters: { mocId: 'm1', fileId: 'f1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(302)
    expect(res.headers.Location).toContain('https://signed.example.com')
  })
})


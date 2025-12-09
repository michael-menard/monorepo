import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handler } from '../finalize-with-files/handler'
import { handler as initializeHandler } from '../initialize-with-files/handler'
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

vi.mock('@aws-sdk/client-s3', () => {
  class S3Client {
    async send() {
      return {}
    }
  }
  class HeadObjectCommand {
    constructor(public input: any) {}
  }
  class GetObjectCommand {
    constructor(public input: any) {}
  }
  return { S3Client, HeadObjectCommand, GetObjectCommand }
})

vi.mock('@/core/search/opensearch', () => ({
  indexDocument: vi.fn(async () => undefined),
}))

// Mock rate limit service - allow by default
vi.mock('@/core/rate-limit/upload-rate-limit', () => ({
  checkAndIncrementDailyLimit: vi.fn(async () => ({
    allowed: true,
    remaining: 99,
    currentCount: 1,
    nextAllowedAt: new Date(),
    retryAfterSeconds: 0,
  })),
}))

describe('finalize-with-files handler', () => {
  const path = '/api/mocs/m1/finalize'

  beforeEach(() => {
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.AWS_REGION = 'us-east-1'
    currentDb = createDbMock({})
  })

  it('returns 401 when unauthenticated', async () => {
    const event = createUnauthorizedEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(401)
  })

  it('returns 400 when missing mocId', async () => {
    const event = createMockEvent({ method: 'POST', path, pathParameters: {}, body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] } })
    const res: any = await handler(event as any)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when body missing', async () => {
    const event = createMockEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 422 when body invalid', async () => {
    const event = createMockEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' }, body: { uploadedFiles: [] } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(422)
  })

  it('returns 404 when MOC not found', async () => {
    currentDb = createDbMock({ moc: [] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' }, body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(404)
  })

  it('returns 403 when not owner', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.privateMoc, id: 'm1' }] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' }, body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] }, userId: 'user-123' })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(403)
  })

  it('returns 400 when no files were uploaded successfully', async () => {
    currentDb = createDbMock({ moc: [{ ...mockMocs.basicMoc, id: 'm1' }] })
    const event = createMockEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' }, body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: false }] } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 400 when S3 verification fails for a file', async () => {
    // Make S3 head-object throw
    const { S3Client } = await import('@aws-sdk/client-s3')
    ;(S3Client as any).prototype.send = vi.fn(async () => { throw new Error('Not found') })

    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1' }],
      mocFile: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          mocId: 'm1',
          fileType: 'gallery-image',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/img1.jpg',
          originalFilename: 'img1.jpg',
          createdAt: new Date(),
        },
      ],
    })

    const event = createMockEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' }, body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(400)
  })

  it('returns 200 on success and indexes the MOC', async () => {
    // Make S3 head-object succeed
    const { S3Client } = await import('@aws-sdk/client-s3')
    ;(S3Client as any).prototype.send = vi.fn(async () => ({}))

    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1' }],
      mocFile: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          mocId: 'm1',
          fileType: 'gallery-image',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/img1.jpg',
          originalFilename: 'img1.jpg',
          createdAt: new Date(),
        },
      ],
    })

    const event = createMockEvent({ method: 'POST', path, pathParameters: { mocId: 'm1' }, body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] } })
    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)
    const body = JSON.parse(res.body)
    expect(body.data.data.moc.images).toHaveLength(1)
  })

  // Story 3.1.7: Idempotency tests
  describe('idempotency (Story 3.1.7)', () => {
    it('returns 200 with idempotent=true when MOC already finalized', async () => {
      const finalizedAt = new Date()
      currentDb = createDbMock({
        moc: [{ ...mockMocs.basicMoc, id: 'm1', finalizedAt }],
        mocFile: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            mocId: 'm1',
            fileType: 'gallery-image',
            fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/img1.jpg',
            originalFilename: 'img1.jpg',
            createdAt: new Date(),
          },
        ],
      })

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: 'm1' },
        body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.idempotent).toBe(true)
      expect(body.data.message).toBe('MOC already finalized')
    })

    it('returns 200 with status=finalizing when another process holds the lock', async () => {
      // finalizingAt is recent (within TTL), so lock is held
      const finalizingAt = new Date()

      // First select returns MOC without finalizedAt but with recent finalizingAt
      // Lock acquisition UPDATE returns empty (no row updated)
      // Second select returns the same MOC (still finalizing)
      let selectCallCount = 0
      currentDb = {
        select: vi.fn(() => ({
          from: () => ({
            where: () => ({
              limit: () => {
                selectCallCount++
                // Both selects return the same MOC with finalizingAt set
                return Promise.resolve([{ ...mockMocs.basicMoc, id: 'm1', finalizingAt, finalizedAt: null }])
              },
            }),
          }),
        })),
        update: vi.fn(() => ({
          set: () => ({
            where: () => ({
              returning: () => Promise.resolve([]), // Lock not acquired
            }),
          }),
        })),
        insert: vi.fn(() => ({
          values: () => ({ returning: () => Promise.resolve([{ id: 'link-id' }]) }),
        })),
        delete: vi.fn(() => ({ where: () => Promise.resolve() })),
      }

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: 'm1' },
        body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] },
      })
      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      const body = JSON.parse(res.body)
      expect(body.data.idempotent).toBe(true)
      expect(body.data.status).toBe('finalizing')
    })

    it('clears finalizingAt lock on S3 verification failure', async () => {
      // Make S3 head-object throw to simulate failure
      const { S3Client } = await import('@aws-sdk/client-s3')
      ;(S3Client as any).prototype.send = vi.fn(async () => { throw new Error('S3 error') })

      // Track update calls to verify lock is cleared
      const updateCalls: any[] = []

      // Use createDbMock as base and override update to track calls
      const baseMock = createDbMock({
        moc: [{ ...mockMocs.basicMoc, id: 'm1', finalizedAt: null, finalizingAt: null }],
        mocFile: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            mocId: 'm1',
            fileType: 'gallery-image',
            fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/img1.jpg',
            originalFilename: 'img1.jpg',
            createdAt: new Date(),
          },
        ],
      })

      // Override update to track calls and return proper lock acquisition
      baseMock.update = vi.fn(() => ({
        set: (data: any) => {
          updateCalls.push(data)
          return {
            where: () => ({
              returning: () => {
                // First update acquires lock, subsequent updates clear it
                if (updateCalls.length === 1) {
                  return Promise.resolve([{ ...mockMocs.basicMoc, id: 'm1', finalizingAt: new Date() }])
                }
                return Promise.resolve([{ ...mockMocs.basicMoc, id: 'm1', finalizingAt: null }])
              },
            }),
          }
        },
      }))

      currentDb = baseMock

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: 'm1' },
        body: { uploadedFiles: [{ fileId: '11111111-1111-4111-8111-111111111111', success: true }] },
      })
      const res: any = await handler(event)

      // Should return 400 due to S3 verification failure
      expect(res.statusCode).toBe(400)

      // Verify that finalizingAt was cleared (second update call sets it to null)
      expect(updateCalls.length).toBeGreaterThanOrEqual(2)
      expect(updateCalls[updateCalls.length - 1].finalizingAt).toBeNull()
    })
  })
})

// Story 3.1.7: Initialize handler duplicate title conflict test
describe('initialize-with-files handler - duplicate title (Story 3.1.7)', () => {
  const initPath = '/api/mocs/with-files/initialize'

  beforeEach(() => {
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.AWS_REGION = 'us-east-1'
  })

  it('returns 409 when MOC with same title already exists for user', async () => {
    // Mock DB to return existing MOC with same title
    const existingMoc = { ...mockMocs.basicMoc, id: 'existing-moc-id', title: 'My Duplicate Title' }

    currentDb = {
      select: vi.fn(() => ({
        from: () => ({
          where: () => ({
            limit: () => Promise.resolve([existingMoc]),
          }),
        }),
      })),
      insert: vi.fn(() => ({
        values: () => ({ returning: () => Promise.resolve([{ id: 'new-id' }]) }),
      })),
      update: vi.fn(() => ({
        set: () => ({
          where: () => ({ returning: () => Promise.resolve([]) }),
        }),
      })),
      delete: vi.fn(() => ({ where: () => Promise.resolve() })),
    }

    // Body structure matches InitializeMocWithFilesSchema (flat, not nested under 'moc')
    const event = createMockEvent({
      method: 'POST',
      path: initPath,
      body: {
        title: 'My Duplicate Title',
        type: 'moc',
        files: [
          {
            filename: 'instructions.pdf',
            fileType: 'instruction',
            mimeType: 'application/pdf',
            size: 1024,
          },
        ],
      },
    })

    const res: any = await initializeHandler(event)
    expect(res.statusCode).toBe(409)
    const body = JSON.parse(res.body)
    expect(body.error.code).toBe('CONFLICT')
    expect(body.error.message).toContain('title already exists')
  })
})

// Story 3.1.23: Parts list validation integration tests
describe('finalize-with-files handler - parts validation (Story 3.1.23)', () => {
  const path = '/api/mocs/m1/finalize'

  beforeEach(() => {
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.AWS_REGION = 'us-east-1'
    process.env.PARTS_VALIDATION_MODE = 'relaxed'
  })

  afterEach(() => {
    delete process.env.PARTS_VALIDATION_MODE
  })

  it('returns 422 with per-file errors when parts list validation fails', async () => {
    const invalidCsv = 'partNumber,quantity\n3001,invalid\n3002,also-invalid'

    // Mock S3 to return the CSV content for parts-list files
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    ;(S3Client as any).prototype.send = vi.fn(async (command: any) => {
      if (command instanceof GetObjectCommand) {
        return {
          Body: {
            transformToByteArray: async () => Buffer.from(invalidCsv),
          },
        }
      }
      // HeadObjectCommand returns size info
      return { ContentLength: invalidCsv.length }
    })

    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1', finalizedAt: null, finalizingAt: null }],
      mocFile: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          mocId: 'm1',
          fileType: 'parts-list',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/parts.csv',
          originalFilename: 'parts.csv',
          mimeType: 'text/csv',
          createdAt: new Date(),
        },
      ],
    })

    const event = createMockEvent({
      method: 'POST',
      path,
      pathParameters: { mocId: 'm1' },
      body: { uploadedFiles: [{ fileId: '22222222-2222-4222-8222-222222222222', success: true }] },
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(422)

    const body = JSON.parse(res.body)
    expect(body.error.code).toBe('PARTS_VALIDATION_ERROR')
    expect(body.error.details.failedFiles).toHaveLength(1)
    expect(body.error.details.failedFiles[0].filename).toBe('parts.csv')
  })

  it('returns 200 with piece count when parts list validation succeeds', async () => {
    const validCsv = 'partNumber,quantity\n3001,4\n3002,6'

    // Mock S3 to return the CSV content for parts-list files
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    ;(S3Client as any).prototype.send = vi.fn(async (command: any) => {
      if (command instanceof GetObjectCommand) {
        return {
          Body: {
            transformToByteArray: async () => Buffer.from(validCsv),
          },
        }
      }
      // HeadObjectCommand returns size info
      return { ContentLength: validCsv.length }
    })

    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1', finalizedAt: null, finalizingAt: null }],
      mocFile: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          mocId: 'm1',
          fileType: 'parts-list',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/parts.csv',
          originalFilename: 'parts.csv',
          mimeType: 'text/csv',
          createdAt: new Date(),
        },
      ],
    })

    const event = createMockEvent({
      method: 'POST',
      path,
      pathParameters: { mocId: 'm1' },
      body: { uploadedFiles: [{ fileId: '22222222-2222-4222-8222-222222222222', success: true }] },
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.data.data.moc.totalPieceCount).toBe(10) // 4 + 6
    expect(body.data.data.fileValidation).toHaveLength(1)
    expect(body.data.data.fileValidation[0].pieceCount).toBe(10)
  })

  it('validates XML parts lists (Bricklink format)', async () => {
    const validXml = '<INVENTORY><ITEM><ITEMID>3001</ITEMID><MINQTY>4</MINQTY></ITEM><ITEM><ITEMID>3002</ITEMID><MINQTY>6</MINQTY></ITEM></INVENTORY>'

    // Mock S3 to return the XML content
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    ;(S3Client as any).prototype.send = vi.fn(async (command: any) => {
      if (command instanceof GetObjectCommand) {
        return {
          Body: {
            transformToByteArray: async () => Buffer.from(validXml),
          },
        }
      }
      return { ContentLength: validXml.length }
    })

    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1', finalizedAt: null, finalizingAt: null }],
      mocFile: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          mocId: 'm1',
          fileType: 'parts-list',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/parts.xml',
          originalFilename: 'parts.xml',
          mimeType: 'application/xml',
          createdAt: new Date(),
        },
      ],
    })

    const event = createMockEvent({
      method: 'POST',
      path,
      pathParameters: { mocId: 'm1' },
      body: { uploadedFiles: [{ fileId: '33333333-3333-4333-8333-333333333333', success: true }] },
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.data.data.moc.totalPieceCount).toBe(10) // 4 + 6
  })

  it('allows mixed files - only validates parts-list files', async () => {
    const validCsv = 'partNumber,quantity\n3001,4'

    // Mock S3 to handle both image (magic bytes) and parts list
    const { S3Client, GetObjectCommand, HeadObjectCommand } = await import('@aws-sdk/client-s3')
    ;(S3Client as any).prototype.send = vi.fn(async (command: any) => {
      if (command instanceof GetObjectCommand) {
        // Return CSV for parts list, mock image bytes for gallery-image
        const key = command.input?.Key || ''
        if (key.includes('parts')) {
          return {
            Body: {
              transformToByteArray: async () => Buffer.from(validCsv),
            },
          }
        }
        // Mock JPEG magic bytes for image
        return {
          Body: {
            transformToByteArray: async () => Buffer.from([0xFF, 0xD8, 0xFF]),
          },
        }
      }
      return { ContentLength: 1000 }
    })

    currentDb = createDbMock({
      moc: [{ ...mockMocs.basicMoc, id: 'm1', finalizedAt: null, finalizingAt: null }],
      mocFile: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          mocId: 'm1',
          fileType: 'gallery-image',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/img1.jpg',
          originalFilename: 'img1.jpg',
          mimeType: 'image/jpeg',
          createdAt: new Date(),
        },
        {
          id: '22222222-2222-4222-8222-222222222222',
          mocId: 'm1',
          fileType: 'parts-list',
          fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/m1/parts.csv',
          originalFilename: 'parts.csv',
          mimeType: 'text/csv',
          createdAt: new Date(),
        },
      ],
    })

    const event = createMockEvent({
      method: 'POST',
      path,
      pathParameters: { mocId: 'm1' },
      body: {
        uploadedFiles: [
          { fileId: '11111111-1111-4111-8111-111111111111', success: true },
          { fileId: '22222222-2222-4222-8222-222222222222', success: true },
        ],
      },
    })

    const res: any = await handler(event)
    expect(res.statusCode).toBe(200)

    const body = JSON.parse(res.body)
    expect(body.data.data.moc.totalPieceCount).toBe(4)
    expect(body.data.data.fileValidation).toHaveLength(2)
  })
})

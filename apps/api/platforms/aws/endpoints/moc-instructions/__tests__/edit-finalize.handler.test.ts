import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../edit-finalize/handler'
import { createMockEvent, createUnauthorizedEvent } from './fixtures/mock-events'

// Valid UUIDs for testing (RFC 4122 compliant - v4 format)
const OWNER_USER_ID = 'user-123'
const OTHER_USER_ID = 'user-other'
const MOC_ID = 'a1b2c3d4-e5f6-7890-abcd-111111111111'
const FILE_ID_1 = 'f1f1f1f1-f1f1-4f1f-af1f-f1f1f1f1f1f1' // v4 UUID: position 13 = 4, position 17 = 8/9/a/b
const FILE_ID_2 = 'f2f2f2f2-f2f2-4f2f-bf2f-f2f2f2f2f2f2'

const mockUpdatedAt = new Date('2024-01-01T12:00:00.000Z')

const mockMoc = {
  id: MOC_ID,
  userId: OWNER_USER_ID,
  title: 'Original Title',
  description: 'Original description',
  slug: 'original-slug',
  tags: ['castle', 'medieval'],
  theme: 'Castle',
  status: 'draft',
  type: 'moc',
  createdAt: new Date('2024-01-01'),
  updatedAt: mockUpdatedAt,
  publishedAt: null,
}

const mockFile = {
  id: FILE_ID_1,
  mocId: MOC_ID,
  fileType: 'instruction',
  fileUrl: 'https://test-bucket.s3.amazonaws.com/mocs/test-file.pdf',
  originalFilename: 'instructions.pdf',
  mimeType: 'application/pdf',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
}

// Track mock state
let mockSelectResults: any[] = []
let mockUpdateResult: any = null
let mockInsertCalled = false
let mockTransactionFn: any = null
let selectCallCount = 0

vi.mock('@/core/database/client', () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => {
            const result = mockSelectResults[selectCallCount] ?? []
            selectCallCount++
            // Return a Promise that also has a limit() method
            // This handles both direct await and .limit().await patterns
            const resultPromise = Promise.resolve(result)
            return Object.assign(resultPromise, {
              limit: vi.fn(() => Promise.resolve(result)),
            })
          }),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => Promise.resolve(mockUpdateResult ? [mockUpdateResult] : [])),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => {
          mockInsertCalled = true
          return Promise.resolve()
        }),
      })),
      transaction: vi.fn(async (fn: any) => {
        mockTransactionFn = fn
        // Create a mock transaction context
        const tx = {
          update: vi.fn(() => ({
            set: vi.fn(() => ({
              where: vi.fn(() => ({
                returning: vi.fn(() =>
                  Promise.resolve(mockUpdateResult ? [mockUpdateResult] : []),
                ),
              })),
            })),
          })),
          insert: vi.fn(() => ({
            values: vi.fn(() => {
              mockInsertCalled = true
              return Promise.resolve()
            }),
          })),
        }
        return fn(tx)
      }),
    },
  }
})

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(async (command: any) => {
      if (command.constructor.name === 'HeadObjectCommand') {
        return { ContentLength: 1024 }
      }
      if (command.constructor.name === 'GetObjectCommand') {
        // Return valid PDF magic bytes
        const pdfMagicBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-
        return {
          Body: {
            transformToByteArray: () => Promise.resolve(pdfMagicBytes),
          },
        }
      }
      return {}
    }),
  })),
  HeadObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://presigned-url.example.com/file')),
}))

vi.mock('@repo/file-validator', () => ({
  validateMagicBytes: vi.fn(() => true),
}))

vi.mock('@/endpoints/moc-instructions/_shared/opensearch-moc', () => ({
  updateMocIndex: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/core/observability/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Story 3.1.37: Rate limiting mocks
vi.mock('@/core/rate-limit/postgres-store', () => ({
  createPostgresRateLimitStore: vi.fn(() => ({
    checkAndIncrement: vi.fn(),
    getCount: vi.fn(),
  })),
}))

vi.mock('@repo/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    checkLimit: vi.fn(() => Promise.resolve({
      allowed: true,
      remaining: 99,
      currentCount: 1,
      resetAt: new Date(),
      nextAllowedAt: new Date(),
      retryAfterSeconds: 0,
    })),
    getCount: vi.fn(() => Promise.resolve(0)),
  })),
  generateDailyKey: vi.fn((feature: string, userId: string) => `${feature}:${userId}:2024-01-01`),
  RATE_LIMIT_WINDOWS: { DAY: 86400000 },
}))

vi.mock('@/core/config/upload', () => ({
  getUploadConfig: vi.fn(() => ({
    rateLimitPerDay: 100,
    presignTtlSeconds: 3600,
    sessionTtlSeconds: 7200,
  })),
}))

describe('Edit Finalize MOC handler', () => {
  const path = `/api/mocs/${MOC_ID}/edit/finalize`

  beforeEach(() => {
    vi.clearAllMocks()
    selectCallCount = 0
    mockSelectResults = []
    mockUpdateResult = null
    mockInsertCalled = false
    mockTransactionFn = null
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
  })

  describe('authentication', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const event = createUnauthorizedEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { expectedUpdatedAt: mockUpdatedAt.toISOString() },
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(401)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('authorization', () => {
    it('returns 403 for non-owner', async () => {
      mockSelectResults = [[mockMoc]]

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'New Title',
        },
        userId: OTHER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(403)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent MOC', async () => {
      mockSelectResults = [[]]

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'New Title',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('validation', () => {
    it('returns 400 for missing expectedUpdatedAt', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { title: 'New Title' },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('expectedUpdatedAt')
    })

    it('returns 400 for invalid expectedUpdatedAt format', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: 'not-a-date',
          title: 'New Title',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('datetime')
    })

    it('returns 400 for title exceeding max length', async () => {
      mockSelectResults = [[mockMoc]]

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'a'.repeat(101),
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('Title too long')
    })

    it('returns 400 for invalid newFile schema', async () => {
      mockSelectResults = [[mockMoc]]

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          newFiles: [{ s3Key: 'test-key' }], // Missing required fields
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for invalid removedFileIds format', async () => {
      mockSelectResults = [[mockMoc]]

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          removedFileIds: ['not-a-uuid'],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)
    })
  })

  describe('idempotency / concurrent edit detection', () => {
    it('returns 409 when updatedAt does not match', async () => {
      const staleUpdatedAt = new Date('2023-12-01T00:00:00.000Z')
      mockSelectResults = [[mockMoc]]

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: staleUpdatedAt.toISOString(),
          title: 'New Title',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(409)

      const body = JSON.parse(res.body)
      expect(body.code).toBe('CONCURRENT_EDIT')
      expect(body.currentUpdatedAt).toBe(mockUpdatedAt.toISOString())
    })
  })

  describe('successful metadata updates', () => {
    it('returns 200 with updated MOC data', async () => {
      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc], // MOC exists
        [], // No removed files to verify
        [], // No active files
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'New Title',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.success).toBe(true)
      expect(body.data.data.moc.title).toBe('New Title')
    })

    it('updates multiple metadata fields at once', async () => {
      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        description: 'New description',
        tags: ['new-tag'],
        theme: 'Space',
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc],
        [],
        [],
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'New Title',
          description: 'New description',
          tags: ['new-tag'],
          theme: 'Space',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.data.moc.title).toBe('New Title')
      expect(body.data.data.moc.description).toBe('New description')
      expect(body.data.data.moc.theme).toBe('Space')
    })
  })

  describe('file operations', () => {
    it('verifies new files exist in S3', async () => {
      const updatedMoc = {
        ...mockMoc,
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc],
        [],
        [],
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          newFiles: [
            {
              s3Key: 'mocs/new-file.pdf',
              category: 'instruction',
              filename: 'new-instructions.pdf',
              size: 1024,
              mimeType: 'application/pdf',
            },
          ],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
      expect(mockInsertCalled).toBe(true)
    })

    it('soft-deletes removed files', async () => {
      const updatedMoc = {
        ...mockMoc,
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc],
        [mockFile], // Files to remove
        [], // Active files after deletion
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          removedFileIds: [FILE_ID_1],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
    })
  })

  describe('OpenSearch integration', () => {
    it('continues successfully even if OpenSearch update fails', async () => {
      const { updateMocIndex } = await import(
        '@/endpoints/moc-instructions/_shared/opensearch-moc'
      )
      vi.mocked(updateMocIndex).mockRejectedValueOnce(new Error('OpenSearch unavailable'))

      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc],
        [],
        [],
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'New Title',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)
    })
  })

  describe('response structure', () => {
    it('includes moc and files in response', async () => {
      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        updatedAt: new Date(),
      }

      mockSelectResults = [
        [mockMoc],
        [],
        [mockFile], // Active files
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'New Title',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.data).toHaveProperty('moc')
      expect(body.data.data).toHaveProperty('files')
      expect(body.data.data.moc).toHaveProperty('id')
      expect(body.data.data.moc).toHaveProperty('title')
      expect(body.data.data.moc).toHaveProperty('updatedAt')
    })

    it('includes presigned URLs for files', async () => {
      const updatedMoc = {
        ...mockMoc,
        title: 'New Title',
        updatedAt: new Date(),
      }

      // When no removedFileIds, only 2 selects happen:
      // 1. MOC exists check
      // 2. Active files after transaction
      mockSelectResults = [
        [mockMoc],
        [mockFile],
      ]
      mockUpdateResult = updatedMoc

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          expectedUpdatedAt: mockUpdatedAt.toISOString(),
          title: 'New Title',
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.data.files[0]).toHaveProperty('presignedUrl')
    })
  })
})

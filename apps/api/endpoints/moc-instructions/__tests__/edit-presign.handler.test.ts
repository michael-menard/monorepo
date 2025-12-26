import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handler } from '../edit-presign/handler'
import { createMockEvent, createUnauthorizedEvent } from './fixtures/mock-events'

// Valid UUIDs for testing
const OWNER_USER_ID = 'user-123'
const OTHER_USER_ID = 'user-other'
const MOC_ID = 'a1b2c3d4-e5f6-7890-abcd-111111111111'

const mockMoc = {
  id: MOC_ID,
  userId: OWNER_USER_ID,
}

// Track mock state
let mockSelectResult: any = null
let mockRateLimitResult: any = { allowed: true, remaining: 99, retryAfterSeconds: 0 }

vi.mock('@/core/database/client', () => {
  return {
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve(mockSelectResult ? [mockSelectResult] : [])),
          })),
        })),
      })),
    },
  }
})

vi.mock('@/core/rate-limit/postgres-store', () => ({
  createPostgresRateLimitStore: vi.fn(() => ({
    checkAndIncrement: vi.fn(),
  })),
}))

vi.mock('@repo/rate-limit', () => ({
  createRateLimiter: vi.fn(() => ({
    checkLimit: vi.fn(() => Promise.resolve(mockRateLimitResult)),
  })),
  generateDailyKey: vi.fn((feature: string, userId: string) => `${feature}:${userId}:2024-01-01`),
  RATE_LIMIT_WINDOWS: { DAY: 86400000 },
}))

vi.mock('@/core/config/upload', () => ({
  getUploadConfig: vi.fn(() => ({
    rateLimitPerDay: 100,
    presignTtlSeconds: 3600,
    sessionTtlSeconds: 7200,
    pdfMaxBytes: 104857600, // 100MB
    imageMaxBytes: 10485760, // 10MB
    partsListMaxBytes: 5242880, // 5MB
  })),
  isMimeTypeAllowed: vi.fn((fileType: string, mimeType: string) => {
    const allowed: Record<string, string[]> = {
      instruction: ['application/pdf'],
      'gallery-image': ['image/jpeg', 'image/png', 'image/webp'],
      thumbnail: ['image/jpeg', 'image/png', 'image/webp'],
      'parts-list': ['text/csv', 'application/json', 'text/plain'],
    }
    return allowed[fileType]?.includes(mimeType) ?? false
  }),
  getAllowedMimeTypes: vi.fn((fileType: string) => {
    const allowed: Record<string, string[]> = {
      instruction: ['application/pdf'],
      'gallery-image': ['image/jpeg', 'image/png', 'image/webp'],
      thumbnail: ['image/jpeg', 'image/png', 'image/webp'],
      'parts-list': ['text/csv', 'application/json', 'text/plain'],
    }
    return allowed[fileType] ?? []
  }),
  getFileSizeLimit: vi.fn((fileType: string) => {
    const limits: Record<string, number> = {
      instruction: 104857600, // 100MB
      'gallery-image': 10485760, // 10MB
      thumbnail: 10485760, // 10MB
      'parts-list': 5242880, // 5MB
    }
    return limits[fileType] ?? 0
  }),
  getFileCountLimit: vi.fn((fileType: string) => {
    const limits: Record<string, number> = {
      instruction: 10,
      'gallery-image': 20,
      thumbnail: 1,
      'parts-list': 5,
    }
    return limits[fileType] ?? 0
  }),
}))

vi.mock('@aws-sdk/client-s3', () => ({
  PutObjectCommand: vi.fn().mockImplementation(params => ({ ...params })),
  S3Client: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://s3.amazonaws.com/bucket/key?signed=true')),
}))

vi.mock('@/core/utils/filename-sanitizer', () => ({
  sanitizeFilenameForS3: vi.fn((filename: string) => filename.toLowerCase().replace(/\s/g, '_')),
}))

vi.mock('@/core/observability/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Edit Presign Handler', () => {
  const path = `/api/mocs/${MOC_ID}/edit/presign`

  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectResult = null
    mockRateLimitResult = {
      allowed: true,
      remaining: 99,
      currentCount: 1,
      resetAt: new Date(),
      nextAllowedAt: new Date(),
      retryAfterSeconds: 0,
    }
    process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
    process.env.STAGE = 'dev'
  })

  describe('authentication', () => {
    it('returns 401 for unauthenticated requests', async () => {
      const event = createUnauthorizedEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { files: [{ category: 'instruction', filename: 'test.pdf', size: 1000, mimeType: 'application/pdf' }] },
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(401)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('UNAUTHORIZED')
    })
  })

  describe('authorization', () => {
    it('returns 403 for non-owner', async () => {
      mockSelectResult = mockMoc // MOC exists but owned by different user

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { files: [{ category: 'instruction', filename: 'test.pdf', size: 1000, mimeType: 'application/pdf' }] },
        userId: OTHER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(403)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('FORBIDDEN')
    })

    it('returns 404 for non-existent MOC', async () => {
      mockSelectResult = null // MOC doesn't exist

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { files: [{ category: 'instruction', filename: 'test.pdf', size: 1000, mimeType: 'application/pdf' }] },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)

      const body = JSON.parse(res.body)
      expect(body.error.code).toBe('NOT_FOUND')
    })

    it('returns 404 for invalid UUID format', async () => {
      const event = createMockEvent({
        method: 'POST',
        path: '/api/mocs/invalid-id/edit/presign',
        pathParameters: { mocId: 'invalid-id' },
        body: { files: [{ category: 'instruction', filename: 'test.pdf', size: 1000, mimeType: 'application/pdf' }] },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(404)
    })
  })

  describe('validation', () => {
    it('returns 400 for empty request body', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: null,
        userId: OWNER_USER_ID,
      })

      // Override the body to be null (createMockEvent stringifies)
      event.body = null

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('Request body is required')
    })

    it('returns 400 for empty files array', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { files: [] },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('At least one file is required')
    })

    it('returns 400 for too many files', async () => {
      const files = Array(21).fill({
        category: 'instruction',
        filename: 'test.pdf',
        size: 1000,
        mimeType: 'application/pdf',
      })

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { files },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)

      const body = JSON.parse(res.body)
      expect(body.error.message).toContain('Maximum 20 files')
    })

    it('returns 400 for invalid category', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { files: [{ category: 'invalid', filename: 'test.pdf', size: 1000, mimeType: 'application/pdf' }] },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)
    })

    it('returns 400 for missing filename', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: { files: [{ category: 'instruction', size: 1000, mimeType: 'application/pdf' }] },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(400)
    })
  })

  describe('file size validation', () => {
    beforeEach(() => {
      mockSelectResult = mockMoc
    })

    it('returns 413 for file exceeding size limit', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          files: [{
            category: 'instruction',
            filename: 'huge.pdf',
            size: 200000000, // 200MB - exceeds 100MB limit
            mimeType: 'application/pdf',
          }],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(413)

      const body = JSON.parse(res.body)
      expect(body.code).toBe('FILE_TOO_LARGE')
      expect(body.filename).toBe('huge.pdf')
      expect(body.category).toBe('instruction')
    })
  })

  describe('MIME type validation', () => {
    beforeEach(() => {
      mockSelectResult = mockMoc
    })

    it('returns 415 for invalid MIME type', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          files: [{
            category: 'instruction',
            filename: 'malicious.exe',
            size: 1000,
            mimeType: 'application/x-executable',
          }],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(415)

      const body = JSON.parse(res.body)
      expect(body.code).toBe('INVALID_MIME_TYPE')
      expect(body.filename).toBe('malicious.exe')
      expect(body.providedType).toBe('application/x-executable')
      expect(body.allowedTypes).toContain('application/pdf')
    })
  })

  describe('rate limiting', () => {
    beforeEach(() => {
      mockSelectResult = mockMoc
    })

    it('returns 429 when rate limit exceeded', async () => {
      mockRateLimitResult = {
        allowed: false,
        remaining: 0,
        currentCount: 100,
        resetAt: new Date(Date.now() + 86400000),
        nextAllowedAt: new Date(Date.now() + 86400000),
        retryAfterSeconds: 3600,
      }

      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          files: [{
            category: 'instruction',
            filename: 'test.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          }],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(429)

      const body = JSON.parse(res.body)
      expect(body.code).toBe('TOO_MANY_REQUESTS')
      expect(body.retryAfterSeconds).toBe(3600)
      expect(res.headers['Retry-After']).toBe('3600')
    })
  })

  describe('successful presign', () => {
    beforeEach(() => {
      mockSelectResult = mockMoc
    })

    it('returns 200 with presigned URLs for valid request', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          files: [{
            category: 'instruction',
            filename: 'instructions.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          }],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.files).toHaveLength(1)
      expect(body.data.files[0]).toHaveProperty('id')
      expect(body.data.files[0]).toHaveProperty('uploadUrl')
      expect(body.data.files[0]).toHaveProperty('s3Key')
      expect(body.data.files[0]).toHaveProperty('expiresAt')
      expect(body.data.files[0].category).toBe('instruction')
      expect(body.data.files[0].filename).toBe('instructions.pdf')
      expect(body.data.sessionExpiresAt).toBeDefined()
    })

    it('returns presigned URLs for multiple files', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          files: [
            { category: 'instruction', filename: 'instructions.pdf', size: 1000, mimeType: 'application/pdf' },
            { category: 'image', filename: 'photo.jpg', size: 500, mimeType: 'image/jpeg' },
            { category: 'thumbnail', filename: 'thumb.png', size: 200, mimeType: 'image/png' },
          ],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      expect(body.data.files).toHaveLength(3)
      expect(body.data.files.map((f: any) => f.category)).toEqual(['instruction', 'image', 'thumbnail'])
    })

    it('generates S3 key with edit context in path', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          files: [{
            category: 'instruction',
            filename: 'test.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          }],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      const s3Key = body.data.files[0].s3Key

      // Verify S3 key format: {env}/moc-instructions/{ownerId}/{mocId}/edit/{category}/{uuid}.{ext}
      expect(s3Key).toMatch(/^dev\/moc-instructions\/user-123\/.*\/edit\/instruction\/[a-f0-9-]+\.pdf$/)
    })
  })

  describe('response structure', () => {
    beforeEach(() => {
      mockSelectResult = mockMoc
    })

    it('includes all required fields in response', async () => {
      const event = createMockEvent({
        method: 'POST',
        path,
        pathParameters: { mocId: MOC_ID },
        body: {
          files: [{
            category: 'instruction',
            filename: 'test.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          }],
        },
        userId: OWNER_USER_ID,
      })

      const res: any = await handler(event)
      expect(res.statusCode).toBe(200)

      const body = JSON.parse(res.body)
      const file = body.data.files[0]

      // Check required fields per response schema
      expect(file).toHaveProperty('id')
      expect(file).toHaveProperty('category')
      expect(file).toHaveProperty('filename')
      expect(file).toHaveProperty('uploadUrl')
      expect(file).toHaveProperty('s3Key')
      expect(file).toHaveProperty('expiresAt')

      // Check session expiry
      expect(body.data).toHaveProperty('sessionExpiresAt')

      // Validate UUID format for id
      expect(file.id).toMatch(/^[a-f0-9-]{36}$/)

      // Validate URL format
      expect(file.uploadUrl).toMatch(/^https?:\/\//)

      // Validate ISO datetime format
      expect(new Date(file.expiresAt).toISOString()).toBe(file.expiresAt)
      expect(new Date(body.data.sessionExpiresAt).toISOString()).toBe(body.data.sessionExpiresAt)
    })
  })
})

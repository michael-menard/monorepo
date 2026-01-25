import { describe, it, expect, vi, beforeEach } from 'vitest'
import { editPresign } from '../edit-presign.js'
import type { EditPresignDeps, MocRow, EditFileMetadata } from '../__types__/index.js'

// ============================================================
// MOCK HELPERS
// ============================================================

const now = new Date()
const mockUserId = 'test-user-id'
const mockMocId = '11111111-1111-1111-1111-111111111111'

function createMockMocRow(overrides: Partial<MocRow> = {}): MocRow {
  return {
    id: mockMocId,
    userId: mockUserId,
    type: 'moc',
    mocId: null,
    slug: null,
    title: 'Test MOC',
    description: null,
    author: null,
    brand: null,
    theme: null,
    subtheme: null,
    setNumber: null,
    releaseYear: null,
    retired: null,
    partsCount: null,
    tags: null,
    thumbnailUrl: null,
    status: 'published',
    publishedAt: null,
    finalizedAt: null,
    finalizingAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createMockDeps(overrides: Partial<EditPresignDeps> = {}): EditPresignDeps {
  const mockMoc = createMockMocRow()

  return {
    db: {
      getMoc: vi.fn().mockResolvedValue(mockMoc),
    },
    generatePresignedUrl: vi.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/presigned-url'),
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      currentCount: 1,
      limit: 10,
    }),
    isMimeTypeAllowed: vi.fn().mockReturnValue(true),
    getAllowedMimeTypes: vi.fn().mockReturnValue(['application/pdf', 'image/jpeg']),
    getFileSizeLimit: vi.fn().mockReturnValue(52428800), // 50MB
    getFileCountLimit: vi.fn().mockReturnValue(10),
    sanitizeFilename: vi.fn().mockImplementation((filename: string) =>
      filename.toLowerCase().replace(/[^a-z0-9.-]/g, '_'),
    ),
    generateUuid: vi.fn().mockReturnValue('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    config: {
      pdfMaxBytes: 52428800,
      imageMaxBytes: 10485760,
      partsListMaxBytes: 1048576,
      pdfMaxMb: 50,
      imageMaxMb: 10,
      partsListMaxMb: 1,
      imageMaxCount: 20,
      partsListMaxCount: 5,
      rateLimitPerDay: 10,
      presignTtlMinutes: 5,
      presignTtlSeconds: 300,
      sessionTtlMinutes: 60,
      sessionTtlSeconds: 3600,
      finalizeLockTtlMinutes: 5,
    },
    s3Bucket: 'test-bucket',
    ...overrides,
  }
}

function createValidFiles(count = 1): EditFileMetadata[] {
  return Array.from({ length: count }, (_, i) => ({
    category: 'instruction' as const,
    filename: `instruction-${i}.pdf`,
    size: 5242880, // 5MB
    mimeType: 'application/pdf',
  }))
}

// ============================================================
// TESTS
// ============================================================

describe('editPresign', () => {
  let mockDeps: EditPresignDeps

  beforeEach(() => {
    mockDeps = createMockDeps()
    process.env.STAGE = 'dev'
  })

  describe('Happy Path', () => {
    it('generates presigned URLs for single file', async () => {
      const files = createValidFiles(1)
      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(1)
        expect(result.data.files[0]).toMatchObject({
          id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          category: 'instruction',
          filename: 'instruction-0.pdf',
          uploadUrl: expect.any(String),
          s3Key: expect.stringContaining('/edit/instruction/'),
          expiresAt: expect.any(String),
        })
        expect(result.data.sessionExpiresAt).toBeDefined()
      }
    })

    it('generates presigned URLs for multiple files', async () => {
      let uuidCounter = 1
      mockDeps.generateUuid = vi.fn().mockImplementation(() =>
        `${uuidCounter++}aaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`,
      )

      const files = createValidFiles(3)
      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(3)
      }
    })

    it('generates edit-specific S3 paths', async () => {
      const files = createValidFiles(1)
      await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(mockDeps.generatePresignedUrl).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringMatching(/\/edit\/instruction\//),
        'application/pdf',
        300,
      )
    })

    it('handles different file categories', async () => {
      const files: EditFileMetadata[] = [
        { category: 'instruction', filename: 'doc.pdf', size: 1000, mimeType: 'application/pdf' },
        { category: 'image', filename: 'img.jpg', size: 1000, mimeType: 'image/jpeg' },
        { category: 'parts-list', filename: 'parts.csv', size: 1000, mimeType: 'text/csv' },
        { category: 'thumbnail', filename: 'thumb.png', size: 1000, mimeType: 'image/png' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(4)
      }
    })

    it('sanitizes filenames in S3 keys', async () => {
      const files: EditFileMetadata[] = [
        { category: 'instruction', filename: 'My Document (Final).pdf', size: 1000, mimeType: 'application/pdf' },
      ]

      await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(mockDeps.sanitizeFilename).toHaveBeenCalledWith('My Document (Final).pdf')
    })

    it('includes correct expiration times', async () => {
      const files = createValidFiles(1)
      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        const expiresAt = new Date(result.data.files[0].expiresAt)
        expect(expiresAt.getTime()).toBeGreaterThan(Date.now())
      }
    })
  })

  describe('NOT_FOUND Errors', () => {
    it('returns NOT_FOUND when MOC does not exist', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)
      const files = createValidFiles(1)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('does not generate presigned URLs when MOC not found', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)
      const files = createValidFiles(1)

      await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(mockDeps.generatePresignedUrl).not.toHaveBeenCalled()
    })
  })

  describe('FORBIDDEN Errors', () => {
    it('returns FORBIDDEN when user does not own the MOC', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(otherUserMoc)
      const files = createValidFiles(1)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
        expect(result.message).toBe('You do not have permission to edit this MOC')
      }
    })

    it('does not check rate limit when user does not own MOC', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(otherUserMoc)
      const files = createValidFiles(1)

      await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(mockDeps.checkRateLimit).not.toHaveBeenCalled()
    })
  })

  describe('RATE_LIMIT_EXCEEDED Errors', () => {
    it('returns RATE_LIMIT_EXCEEDED when rate limit exceeded', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue({
        allowed: false,
        currentCount: 10,
        limit: 10,
      })
      const files = createValidFiles(1)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('RATE_LIMIT_EXCEEDED')
        expect(result.message).toContain('Daily upload/edit limit reached')
        expect(result.details?.retryAfterSeconds).toBeGreaterThan(0)
        expect(result.details?.usage).toEqual({ current: 10, limit: 10 })
      }
    })

    it('does not generate presigned URLs when rate limited', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue({
        allowed: false,
        currentCount: 10,
        limit: 10,
      })
      const files = createValidFiles(1)

      await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(mockDeps.generatePresignedUrl).not.toHaveBeenCalled()
    })
  })

  describe('VALIDATION_ERROR Errors', () => {
    it('returns VALIDATION_ERROR when file count exceeds limit', async () => {
      mockDeps.getFileCountLimit = vi.fn().mockReturnValue(2)
      const files = createValidFiles(3) // 3 files, limit is 2

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('Maximum 2 instruction files allowed')
      }
    })

    it('validates file count per category', async () => {
      mockDeps.getFileCountLimit = vi.fn().mockImplementation((fileType: string) => {
        if (fileType === 'gallery-image') return 2
        return 10
      })

      const files: EditFileMetadata[] = [
        { category: 'image', filename: 'img1.jpg', size: 1000, mimeType: 'image/jpeg' },
        { category: 'image', filename: 'img2.jpg', size: 1000, mimeType: 'image/jpeg' },
        { category: 'image', filename: 'img3.jpg', size: 1000, mimeType: 'image/jpeg' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })
  })

  describe('FILE_TOO_LARGE Errors', () => {
    it('returns FILE_TOO_LARGE when file exceeds size limit', async () => {
      mockDeps.getFileSizeLimit = vi.fn().mockReturnValue(10485760) // 10MB limit
      const files: EditFileMetadata[] = [
        { category: 'instruction', filename: 'huge.pdf', size: 100000000, mimeType: 'application/pdf' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FILE_TOO_LARGE')
        expect(result.message).toContain('huge.pdf')
        expect(result.details?.filename).toBe('huge.pdf')
        expect(result.details?.maxBytes).toBe(10485760)
        expect(result.details?.providedBytes).toBe(100000000)
      }
    })

    it('validates each file individually for size', async () => {
      mockDeps.getFileSizeLimit = vi.fn().mockReturnValue(10000000)
      const files: EditFileMetadata[] = [
        { category: 'instruction', filename: 'small.pdf', size: 1000, mimeType: 'application/pdf' },
        { category: 'instruction', filename: 'big.pdf', size: 50000000, mimeType: 'application/pdf' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FILE_TOO_LARGE')
        expect(result.details?.filename).toBe('big.pdf')
      }
    })
  })

  describe('INVALID_MIME_TYPE Errors', () => {
    it('returns INVALID_MIME_TYPE when MIME type not allowed', async () => {
      mockDeps.isMimeTypeAllowed = vi.fn().mockReturnValue(false)
      mockDeps.getAllowedMimeTypes = vi.fn().mockReturnValue(['application/pdf'])
      const files: EditFileMetadata[] = [
        { category: 'instruction', filename: 'doc.exe', size: 1000, mimeType: 'application/x-executable' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_MIME_TYPE')
        expect(result.message).toContain('invalid MIME type')
        expect(result.details?.allowedTypes).toEqual(['application/pdf'])
        expect(result.details?.providedType).toBe('application/x-executable')
      }
    })

    it('validates MIME type per file category', async () => {
      mockDeps.isMimeTypeAllowed = vi.fn().mockImplementation((fileType: string, mimeType: string) => {
        if (fileType === 'instruction' && mimeType === 'application/pdf') return true
        if (fileType === 'gallery-image' && mimeType === 'application/pdf') return false // PDFs not allowed as images
        return false
      })

      const files: EditFileMetadata[] = [
        { category: 'image', filename: 'doc.pdf', size: 1000, mimeType: 'application/pdf' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_MIME_TYPE')
      }
    })
  })

  describe('S3_ERROR Errors', () => {
    it('returns S3_ERROR when presigned URL generation fails', async () => {
      mockDeps.generatePresignedUrl = vi.fn().mockRejectedValue(new Error('S3 access denied'))
      const files = createValidFiles(1)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('S3_ERROR')
        expect(result.message).toBe('S3 access denied')
      }
    })

    it('handles non-Error S3 exceptions', async () => {
      mockDeps.generatePresignedUrl = vi.fn().mockRejectedValue('string error')
      const files = createValidFiles(1)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('S3_ERROR')
        expect(result.message).toBe('Failed to generate presigned URLs')
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles file at exact size limit', async () => {
      mockDeps.getFileSizeLimit = vi.fn().mockReturnValue(1000)
      const files: EditFileMetadata[] = [
        { category: 'instruction', filename: 'exact.pdf', size: 1000, mimeType: 'application/pdf' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles file 1 byte over size limit', async () => {
      mockDeps.getFileSizeLimit = vi.fn().mockReturnValue(1000)
      const files: EditFileMetadata[] = [
        { category: 'instruction', filename: 'over.pdf', size: 1001, mimeType: 'application/pdf' },
      ]

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
    })

    it('handles exact count limit', async () => {
      mockDeps.getFileCountLimit = vi.fn().mockReturnValue(5)
      const files = createValidFiles(5)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles 1 over count limit', async () => {
      mockDeps.getFileCountLimit = vi.fn().mockReturnValue(5)
      const files = createValidFiles(6)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(false)
    })

    it('generates unique file IDs for each file', async () => {
      let counter = 1
      mockDeps.generateUuid = vi.fn().mockImplementation(() => `uuid-${counter++}`)
      const files = createValidFiles(3)

      const result = await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        const ids = result.data.files.map(f => f.id)
        expect(new Set(ids).size).toBe(3) // All unique
      }
    })

    it('uses correct STAGE environment variable in S3 key', async () => {
      process.env.STAGE = 'prod'
      const files = createValidFiles(1)

      await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(mockDeps.generatePresignedUrl).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringContaining('prod/moc-instructions/'),
        expect.any(String),
        expect.any(Number),
      )
    })

    it('defaults to dev STAGE when not set', async () => {
      delete process.env.STAGE
      const files = createValidFiles(1)

      await editPresign(mockMocId, mockUserId, files, mockDeps)

      expect(mockDeps.generatePresignedUrl).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringContaining('dev/moc-instructions/'),
        expect.any(String),
        expect.any(Number),
      )
    })
  })
})

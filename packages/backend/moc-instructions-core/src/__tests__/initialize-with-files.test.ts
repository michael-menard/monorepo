import { describe, it, expect, vi, beforeEach } from 'vitest'
import { initializeWithFiles } from '../initialize-with-files.js'
import type { InitializeMocInput, InitializeWithFilesDeps, MocRow, MocFileRow } from '../__types__/index.js'

// ============================================================
// MOCK HELPERS
// ============================================================

const now = new Date()

function createMockMocRow(overrides: Partial<MocRow> = {}): MocRow {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'test-user-id',
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
    status: 'draft',
    publishedAt: null,
    finalizedAt: null,
    finalizingAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createMockMocFileRow(overrides: Partial<MocFileRow> = {}): MocFileRow {
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    mocId: '11111111-1111-1111-1111-111111111111',
    fileType: 'instruction',
    fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/test-id/instruction/123-test.pdf',
    originalFilename: 'test.pdf',
    mimeType: 'application/pdf',
    createdAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function createMockDeps(overrides: Partial<InitializeWithFilesDeps> = {}): InitializeWithFilesDeps {
  return {
    db: {
      checkDuplicateTitle: vi.fn().mockResolvedValue(null),
      createMoc: vi.fn().mockResolvedValue(createMockMocRow()),
      createMocFile: vi.fn().mockResolvedValue(createMockMocFileRow()),
    },
    generatePresignedUrl: vi.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/presigned-url'),
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      currentCount: 1,
      nextAllowedAt: new Date(Date.now() + 86400000),
      retryAfterSeconds: 86400,
    }),
    isMimeTypeAllowed: vi.fn().mockReturnValue(true),
    getAllowedMimeTypes: vi.fn().mockReturnValue(['application/pdf']),
    sanitizeFilename: vi.fn().mockImplementation((filename: string) => filename.toLowerCase().replace(/[^a-z0-9.-]/g, '_')),
    generateUuid: vi.fn().mockReturnValue('11111111-1111-1111-1111-111111111111'),
    s3Bucket: 'test-bucket',
    s3Region: 'us-east-1',
    config: {
      pdfMaxBytes: 52428800, // 50MB
      imageMaxBytes: 10485760, // 10MB
      partsListMaxBytes: 1048576, // 1MB
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
    ...overrides,
  }
}

function createValidInput(overrides: Partial<InitializeMocInput> = {}): InitializeMocInput {
  return {
    title: 'Test MOC',
    type: 'moc',
    files: [
      {
        filename: 'instructions.pdf',
        fileType: 'instruction',
        mimeType: 'application/pdf',
        size: 5242880, // 5MB
      },
    ],
    ...overrides,
  }
}

// ============================================================
// TESTS
// ============================================================

describe('initializeWithFiles', () => {
  let mockDeps: InitializeWithFilesDeps

  beforeEach(() => {
    mockDeps = createMockDeps()
  })

  describe('Happy Path', () => {
    it('initializes MOC with single instruction file and returns presigned URL', async () => {
      const input = createValidInput()
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mocId).toBe('11111111-1111-1111-1111-111111111111')
        expect(result.data.uploadUrls).toHaveLength(1)
        expect(result.data.uploadUrls[0]).toMatchObject({
          fileId: '11111111-1111-1111-1111-111111111111',
          filename: 'instructions.pdf',
          fileType: 'instruction',
          expiresIn: 300,
        })
        expect(result.data.sessionTtlSeconds).toBe(3600)
      }
    })

    it('initializes MOC with multiple files', async () => {
      // Generate unique UUIDs for each file
      let uuidCounter = 1
      mockDeps.generateUuid = vi.fn().mockImplementation(() =>
        `${uuidCounter++}1111111-1111-1111-1111-111111111111`
      )

      const input = createValidInput({
        files: [
          { filename: 'instructions.pdf', fileType: 'instruction', mimeType: 'application/pdf', size: 5242880 },
          { filename: 'parts.csv', fileType: 'parts-list', mimeType: 'text/csv', size: 102400 },
          { filename: 'thumb.jpg', fileType: 'thumbnail', mimeType: 'image/jpeg', size: 512000 },
        ],
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.uploadUrls).toHaveLength(3)
      }
    })

    it('creates MOC record with type-specific fields for MOC type', async () => {
      const input = createValidInput({
        type: 'moc',
        author: 'Test Builder',
        theme: 'Castle',
        partsCount: 1500,
      })
      await initializeWithFiles('test-user-id', input, mockDeps)

      expect(mockDeps.db.createMoc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'moc',
          author: 'Test Builder',
          theme: 'Castle',
          partsCount: 1500,
          brand: null,
          releaseYear: null,
        })
      )
    })

    it('creates MOC record with type-specific fields for Set type', async () => {
      const input = createValidInput({
        type: 'set',
        brand: 'LEGO',
        setNumber: '75192',
        releaseYear: 2017,
        retired: false,
      })
      await initializeWithFiles('test-user-id', input, mockDeps)

      expect(mockDeps.db.createMoc).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'set',
          brand: 'LEGO',
          setNumber: '75192',
          releaseYear: 2017,
          retired: false,
          author: null,
        })
      )
    })

    it('sanitizes filename before using in S3 key', async () => {
      const input = createValidInput({
        files: [
          { filename: 'Instructions (Final).pdf', fileType: 'instruction', mimeType: 'application/pdf', size: 1000 },
        ],
      })
      await initializeWithFiles('test-user-id', input, mockDeps)

      expect(mockDeps.sanitizeFilename).toHaveBeenCalledWith('Instructions (Final).pdf')
    })
  })

  describe('Validation Errors', () => {
    it('returns VALIDATION_ERROR when no instruction file provided (AC-3)', async () => {
      const input = createValidInput({
        files: [
          { filename: 'parts.csv', fileType: 'parts-list', mimeType: 'text/csv', size: 1000 },
        ],
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('At least one instruction file is required')
      }
    })

    it('returns VALIDATION_ERROR when >10 instruction files (AC-4)', async () => {
      const files = Array.from({ length: 11 }, (_, i) => ({
        filename: `instruction-${i}.pdf`,
        fileType: 'instruction' as const,
        mimeType: 'application/pdf',
        size: 1000,
      }))
      const input = createValidInput({ files })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('Maximum 10 instruction files allowed')
      }
    })

    it('returns VALIDATION_ERROR when file exceeds size limit (AC-5)', async () => {
      const input = createValidInput({
        files: [
          { filename: 'huge.pdf', fileType: 'instruction', mimeType: 'application/pdf', size: 100000000 }, // 100MB
        ],
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('exceeds size limit')
      }
    })

    it('returns VALIDATION_ERROR when MIME type not allowed (AC-6)', async () => {
      mockDeps.isMimeTypeAllowed = vi.fn().mockReturnValue(false)
      mockDeps.getAllowedMimeTypes = vi.fn().mockReturnValue(['application/pdf'])

      const input = createValidInput({
        files: [
          { filename: 'instructions.exe', fileType: 'instruction', mimeType: 'application/x-executable', size: 1000 },
        ],
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('invalid MIME type')
      }
    })

    it('returns VALIDATION_ERROR for empty files array', async () => {
      const input = createValidInput({ files: [] })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })

    it('returns VALIDATION_ERROR for title exceeding 100 chars', async () => {
      const input = createValidInput({
        title: 'A'.repeat(101),
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
    })

    it('returns VALIDATION_ERROR when parts-list count exceeds limit', async () => {
      const files = [
        { filename: 'inst.pdf', fileType: 'instruction' as const, mimeType: 'application/pdf', size: 1000 },
        ...Array.from({ length: 6 }, (_, i) => ({
          filename: `parts-${i}.csv`,
          fileType: 'parts-list' as const,
          mimeType: 'text/csv',
          size: 1000,
        })),
      ]
      const input = createValidInput({ files })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('Maximum 5 parts list files allowed')
      }
    })

    it('returns VALIDATION_ERROR when image count exceeds limit', async () => {
      const files = [
        { filename: 'inst.pdf', fileType: 'instruction' as const, mimeType: 'application/pdf', size: 1000 },
        ...Array.from({ length: 21 }, (_, i) => ({
          filename: `image-${i}.jpg`,
          fileType: 'gallery-image' as const,
          mimeType: 'image/jpeg',
          size: 1000,
        })),
      ]
      const input = createValidInput({ files })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('VALIDATION_ERROR')
        expect(result.message).toContain('Maximum 20 images allowed')
      }
    })
  })

  describe('Rate Limiting (AC-8)', () => {
    it('returns RATE_LIMIT_EXCEEDED when rate limit exceeded', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        currentCount: 10,
        nextAllowedAt: new Date('2026-01-22T00:00:00.000Z'),
        retryAfterSeconds: 3600,
      })

      const input = createValidInput()
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('RATE_LIMIT_EXCEEDED')
        expect(result.message).toContain('Daily upload limit exceeded')
        expect(result.details?.retryAfterSeconds).toBe(3600)
      }
    })

    it('checks rate limit before database writes', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        currentCount: 10,
        nextAllowedAt: new Date(),
        retryAfterSeconds: 3600,
      })

      const input = createValidInput()
      await initializeWithFiles('test-user-id', input, mockDeps)

      // checkRateLimit should be called before createMoc
      expect(mockDeps.checkRateLimit).toHaveBeenCalled()
      expect(mockDeps.db.createMoc).not.toHaveBeenCalled()
    })
  })

  describe('Duplicate Title (AC-7)', () => {
    it('returns DUPLICATE_TITLE when title already exists for user', async () => {
      mockDeps.db.checkDuplicateTitle = vi.fn().mockResolvedValue({ id: 'existing-moc-id' })

      const input = createValidInput({ title: 'Duplicate Title' })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DUPLICATE_TITLE')
        expect(result.message).toContain('MOC with this title already exists')
        expect(result.details?.existingMocId).toBe('existing-moc-id')
      }
    })

    it('handles race condition duplicate via Postgres unique violation', async () => {
      mockDeps.db.checkDuplicateTitle = vi.fn().mockResolvedValue(null)
      mockDeps.db.createMoc = vi.fn().mockRejectedValue({ code: '23505' })

      const input = createValidInput()
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DUPLICATE_TITLE')
      }
    })
  })

  describe('Database Errors', () => {
    it('returns DB_ERROR when createMoc fails with non-unique error', async () => {
      mockDeps.db.createMoc = vi.fn().mockRejectedValue(new Error('Connection failed'))

      const input = createValidInput()
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Connection failed')
      }
    })
  })

  describe('S3 Errors', () => {
    it('returns S3_ERROR when presigned URL generation fails', async () => {
      mockDeps.generatePresignedUrl = vi.fn().mockRejectedValue(new Error('S3 access denied'))

      const input = createValidInput()
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('S3_ERROR')
        expect(result.message).toBe('S3 access denied')
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles empty tags array', async () => {
      const input = createValidInput({ tags: [] })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles 100-char title (boundary)', async () => {
      const input = createValidInput({ title: 'A'.repeat(100) })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles all optional fields provided', async () => {
      const input = createValidInput({
        title: 'Full Featured MOC',
        description: 'A test description',
        type: 'moc',
        tags: ['castle', 'medieval'],
        author: 'Test Builder',
        theme: 'Castle',
        subtheme: 'Fantasy',
        partsCount: 1500,
        mocId: 'MOC-12345',
        slug: 'full-featured-moc',
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(true)
      expect(mockDeps.db.createMoc).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'A test description',
          tags: ['castle', 'medieval'],
          author: 'Test Builder',
          theme: 'Castle',
          subtheme: 'Fantasy',
          mocId: 'MOC-12345',
          slug: 'full-featured-moc',
        })
      )
    })

    it('handles exactly 10 instruction files (boundary)', async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        filename: `instruction-${i}.pdf`,
        fileType: 'instruction' as const,
        mimeType: 'application/pdf',
        size: 1000,
      }))
      const input = createValidInput({ files })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(true)
    })

    it('file size at exact limit passes', async () => {
      const input = createValidInput({
        files: [
          { filename: 'exact.pdf', fileType: 'instruction', mimeType: 'application/pdf', size: 52428800 }, // exactly 50MB
        ],
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(true)
    })

    it('file size 1 byte over limit fails', async () => {
      const input = createValidInput({
        files: [
          { filename: 'over.pdf', fileType: 'instruction', mimeType: 'application/pdf', size: 52428801 }, // 50MB + 1 byte
        ],
      })
      const result = await initializeWithFiles('test-user-id', input, mockDeps)

      expect(result.success).toBe(false)
    })
  })
})

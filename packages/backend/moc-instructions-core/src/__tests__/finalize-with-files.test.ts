import { describe, it, expect, vi, beforeEach } from 'vitest'
import { finalizeWithFiles } from '../finalize-with-files.js'
import type { FinalizeMocInput, FinalizeWithFilesDeps, MocRow, MocFileRow } from '../__types__/index.js'

// ============================================================
// MOCK HELPERS
// ============================================================

const now = new Date()
const mockUserId = 'test-user-id'
const mockMocId = '11111111-1111-1111-1111-111111111111'
const mockFileId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

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
    id: mockFileId,
    mocId: mockMocId,
    fileType: 'instruction',
    fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/test-id/instruction/123-test.pdf',
    originalFilename: 'test.pdf',
    mimeType: 'application/pdf',
    createdAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function createMockDeps(overrides: Partial<FinalizeWithFilesDeps> = {}): FinalizeWithFilesDeps {
  const mockMoc = createMockMocRow()
  const mockFile = createMockMocFileRow()

  return {
    db: {
      getMocById: vi.fn().mockResolvedValue(mockMoc),
      getMocFiles: vi.fn().mockResolvedValue([mockFile]),
      acquireFinalizeLock: vi.fn().mockResolvedValue(mockMoc),
      updateMocFile: vi.fn().mockResolvedValue(undefined),
      updateMoc: vi.fn().mockResolvedValue({ ...mockMoc, status: 'published', finalizedAt: now }),
      clearFinalizeLock: vi.fn().mockResolvedValue(undefined),
    },
    headObject: vi.fn().mockResolvedValue({ contentLength: 5242880 }), // 5MB
    getObject: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')), // PDF magic bytes
    validateMagicBytes: vi.fn().mockReturnValue(true),
    validatePartsFile: vi.fn().mockResolvedValue({
      success: true,
      errors: [],
      warnings: [],
      data: { totalPieceCount: 1500 },
    }),
    checkRateLimit: vi.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      currentCount: 1,
      nextAllowedAt: new Date(Date.now() + 86400000),
      retryAfterSeconds: 86400,
    }),
    getFileSizeLimit: vi.fn().mockReturnValue(52428800), // 50MB
    s3Bucket: 'test-bucket',
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
    ...overrides,
  }
}

function createValidInput(overrides: Partial<FinalizeMocInput> = {}): FinalizeMocInput {
  return {
    uploadedFiles: [
      { fileId: mockFileId, success: true },
    ],
    ...overrides,
  }
}

// ============================================================
// TESTS
// ============================================================

describe('finalizeWithFiles', () => {
  let mockDeps: FinalizeWithFilesDeps

  beforeEach(() => {
    mockDeps = createMockDeps()
  })

  describe('Happy Path', () => {
    it('finalizes MOC with successful file upload', async () => {
      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.moc.status).toBe('published')
        expect(result.data.moc.finalizedAt).toBeTruthy()
      }
    })

    it('sets first image as thumbnail (AC-16)', async () => {
      const mockImageFile = createMockMocFileRow({
        id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        fileType: 'gallery-image',
        fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/test-id/gallery/image.jpg',
        mimeType: 'image/jpeg',
      })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockImageFile])

      const input = createValidInput({
        uploadedFiles: [{ fileId: mockImageFile.id, success: true }],
      })
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(mockDeps.db.updateMocFile).toHaveBeenCalledWith(mockImageFile.id, { fileType: 'thumbnail' })
      expect(mockDeps.db.updateMoc).toHaveBeenCalledWith(
        mockMocId,
        expect.objectContaining({
          thumbnailUrl: mockImageFile.fileUrl,
        })
      )
    })

    it('updates MOC status from draft to published (AC-17)', async () => {
      const input = createValidInput()
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(mockDeps.db.updateMoc).toHaveBeenCalledWith(
        mockMocId,
        expect.objectContaining({
          status: 'published',
          finalizedAt: expect.any(Date),
          finalizingAt: null,
        })
      )
    })

    it('returns complete MOC with files array (AC-24)', async () => {
      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.moc.files).toBeDefined()
        expect(Array.isArray(result.data.moc.files)).toBe(true)
      }
    })

    it('returns total piece count from parts validation', async () => {
      const mockPartsFile = createMockMocFileRow({
        id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
        fileType: 'parts-list',
        mimeType: 'text/csv',
      })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockPartsFile])
      mockDeps.validatePartsFile = vi.fn().mockResolvedValue({
        success: true,
        errors: [],
        warnings: [],
        data: { totalPieceCount: 2500 },
      })

      const input = createValidInput({
        uploadedFiles: [{ fileId: mockPartsFile.id, success: true }],
      })
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.totalPieceCount).toBe(2500)
      }
    })
  })

  describe('Idempotency (AC-20)', () => {
    it('returns idempotent: true for already-finalized MOC', async () => {
      const finalizedMoc = createMockMocRow({
        status: 'published',
        finalizedAt: now,
      })
      mockDeps.db.getMocById = vi.fn().mockResolvedValue(finalizedMoc)

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.idempotent).toBe(true)
      }
      // Should not attempt to acquire lock
      expect(mockDeps.db.acquireFinalizeLock).not.toHaveBeenCalled()
    })

    it('returns status: finalizing when another process holds lock (AC-21)', async () => {
      const finalizingMoc = createMockMocRow({
        finalizingAt: now,
      })
      mockDeps.db.getMocById = vi.fn().mockResolvedValue(finalizingMoc)
      mockDeps.db.acquireFinalizeLock = vi.fn().mockResolvedValue(null) // Lock not acquired

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('finalizing')
      }
    })

    it('rescues stale lock (AC-22)', async () => {
      // First getMocById returns MOC with stale lock
      const staleLockMoc = createMockMocRow({
        finalizingAt: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
      })
      mockDeps.db.getMocById = vi.fn().mockResolvedValue(staleLockMoc)
      // acquireFinalizeLock succeeds (rescued stale lock)
      mockDeps.db.acquireFinalizeLock = vi.fn().mockResolvedValue(staleLockMoc)

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
      expect(mockDeps.db.acquireFinalizeLock).toHaveBeenCalled()
    })
  })

  describe('Authorization', () => {
    it('returns NOT_FOUND when MOC does not exist (AC-19)', async () => {
      mockDeps.db.getMocById = vi.fn().mockResolvedValue(null)

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('returns FORBIDDEN when user does not own MOC (AC-18)', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMocById = vi.fn().mockResolvedValue(otherUserMoc)

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
        expect(result.message).toBe('You do not own this MOC')
      }
    })
  })

  describe('Rate Limiting (AC-23)', () => {
    it('returns RATE_LIMIT_EXCEEDED when rate limit exceeded', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        currentCount: 10,
        nextAllowedAt: new Date('2026-01-22T00:00:00.000Z'),
        retryAfterSeconds: 3600,
      })

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('RATE_LIMIT_EXCEEDED')
      }
    })

    it('checks rate limit before MOC lookup', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        currentCount: 10,
        nextAllowedAt: new Date(),
        retryAfterSeconds: 3600,
      })

      const input = createValidInput()
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      // Rate limit checked before side effects
      expect(mockDeps.checkRateLimit).toHaveBeenCalled()
      // updateMoc should not be called
      expect(mockDeps.db.updateMoc).not.toHaveBeenCalled()
    })
  })

  describe('File Validation', () => {
    it('returns NO_SUCCESSFUL_UPLOADS when no files marked success', async () => {
      const input = createValidInput({
        uploadedFiles: [{ fileId: mockFileId, success: false }],
      })
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NO_SUCCESSFUL_UPLOADS')
      }
    })

    it('returns FILE_NOT_IN_S3 when HeadObject fails (AC-13)', async () => {
      mockDeps.headObject = vi.fn().mockRejectedValue(new Error('NoSuchKey'))

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FILE_NOT_IN_S3')
        expect(result.message).toContain('not uploaded successfully')
      }
    })

    it('returns SIZE_TOO_LARGE when file exceeds limit', async () => {
      mockDeps.headObject = vi.fn().mockResolvedValue({ contentLength: 100000000 }) // 100MB
      mockDeps.getFileSizeLimit = vi.fn().mockReturnValue(52428800) // 50MB limit

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('SIZE_TOO_LARGE')
      }
    })

    it('returns INVALID_TYPE when magic bytes mismatch (AC-14)', async () => {
      mockDeps.validateMagicBytes = vi.fn().mockReturnValue(false)

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_TYPE')
        expect(result.message).toContain('does not match expected type')
      }
    })

    it('returns PARTS_VALIDATION_ERROR when parts list validation fails (AC-15)', async () => {
      const mockPartsFile = createMockMocFileRow({
        id: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
        fileType: 'parts-list',
        mimeType: 'text/csv',
      })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockPartsFile])
      mockDeps.headObject = vi.fn().mockResolvedValue({ contentLength: 1000 })
      mockDeps.getObject = vi.fn().mockResolvedValue(Buffer.from('invalid,csv,data'))
      mockDeps.validatePartsFile = vi.fn().mockResolvedValue({
        success: false,
        errors: [{ code: 'MISSING_COLUMN', message: 'Missing Part ID column', line: 1 }],
        warnings: [],
      })

      const input = createValidInput({
        uploadedFiles: [{ fileId: mockPartsFile.id, success: true }],
      })
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('PARTS_VALIDATION_ERROR')
        expect(result.details?.failedFiles).toBeDefined()
      }
    })

    it('includes validation warnings in success response', async () => {
      const mockPartsFile = createMockMocFileRow({
        id: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
        fileType: 'parts-list',
        mimeType: 'text/csv',
      })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockPartsFile])
      mockDeps.headObject = vi.fn().mockResolvedValue({ contentLength: 1000 })
      mockDeps.getObject = vi.fn().mockResolvedValue(Buffer.from('valid,csv,data'))
      mockDeps.validatePartsFile = vi.fn().mockResolvedValue({
        success: true,
        errors: [],
        warnings: [{ code: 'UNKNOWN_PART', message: 'Unknown part ID: 12345' }],
        data: { totalPieceCount: 100 },
      })

      const input = createValidInput({
        uploadedFiles: [{ fileId: mockPartsFile.id, success: true }],
      })
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fileValidation).toBeDefined()
        expect(result.data.fileValidation?.[0].warnings).toHaveLength(1)
      }
    })
  })

  describe('Lock Management', () => {
    it('clears lock on validation error', async () => {
      mockDeps.headObject = vi.fn().mockRejectedValue(new Error('NoSuchKey'))

      const input = createValidInput()
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(mockDeps.db.clearFinalizeLock).toHaveBeenCalledWith(mockMocId)
    })

    it('clears lock on NO_SUCCESSFUL_UPLOADS error', async () => {
      const input = createValidInput({
        uploadedFiles: [{ fileId: mockFileId, success: false }],
      })
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(mockDeps.db.clearFinalizeLock).toHaveBeenCalledWith(mockMocId)
    })

    it('clears lock on parts validation error', async () => {
      const mockPartsFile = createMockMocFileRow({
        fileType: 'parts-list',
        mimeType: 'text/csv',
      })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockPartsFile])
      mockDeps.headObject = vi.fn().mockResolvedValue({ contentLength: 1000 })
      mockDeps.getObject = vi.fn().mockResolvedValue(Buffer.from('invalid'))
      mockDeps.validatePartsFile = vi.fn().mockResolvedValue({
        success: false,
        errors: [{ code: 'ERROR', message: 'Error' }],
        warnings: [],
      })

      const input = createValidInput()
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(mockDeps.db.clearFinalizeLock).toHaveBeenCalledWith(mockMocId)
    })
  })

  describe('Edge Cases', () => {
    it('handles MOC with no image files (no thumbnail set)', async () => {
      const mockInstructionFile = createMockMocFileRow({
        fileType: 'instruction',
      })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockInstructionFile])

      const input = createValidInput()
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(mockDeps.db.updateMocFile).not.toHaveBeenCalled()
      expect(mockDeps.db.updateMoc).toHaveBeenCalledWith(
        mockMocId,
        expect.objectContaining({
          thumbnailUrl: null,
        })
      )
    })

    it('handles multiple files with mixed success', async () => {
      // Use valid UUIDs for file IDs
      const fileId1 = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
      const fileId2 = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
      // The DB returns only files that match the successful fileIds filter
      const mockSuccessFile = createMockMocFileRow({ id: fileId1, fileType: 'instruction' })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockSuccessFile])

      const input = createValidInput({
        uploadedFiles: [
          { fileId: fileId1, success: true },
          { fileId: fileId2, success: false }, // This one failed - not fetched from DB
        ],
      })
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      // Should still succeed with the one successful file
      expect(result.success).toBe(true)
    })

    it('skips parts validation when validatePartsFile not provided', async () => {
      const mockPartsFile = createMockMocFileRow({
        fileType: 'parts-list',
        mimeType: 'text/csv',
      })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([mockPartsFile])
      mockDeps.validatePartsFile = undefined // Not provided

      const input = createValidInput()
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles empty uploadedFiles array', async () => {
      const input = createValidInput({ uploadedFiles: [] })
      const result = await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      expect(result.success).toBe(false)
      // Should fail validation (min 1 required)
    })

    it('does not update status if already published', async () => {
      const publishedMoc = createMockMocRow({
        status: 'published',
        publishedAt: new Date('2026-01-01'),
      })
      mockDeps.db.getMocById = vi.fn().mockResolvedValue(publishedMoc)
      mockDeps.db.acquireFinalizeLock = vi.fn().mockResolvedValue(publishedMoc)

      const input = createValidInput()
      await finalizeWithFiles(mockUserId, mockMocId, input, mockDeps)

      // Should not try to set status again
      expect(mockDeps.db.updateMoc).toHaveBeenCalledWith(
        mockMocId,
        expect.not.objectContaining({
          status: 'published',
        })
      )
    })
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { editFinalize } from '../edit-finalize.js'
import type {
  EditFinalizeDeps,
  MocRow,
  MocFileRow,
  EditFinalizeInput,
  RateLimitCheckResult,
} from '../__types__/index.js'

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
    status: 'published',
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
    fileUrl: 'https://test-bucket.s3.amazonaws.com/test-key',
    originalFilename: 'test.pdf',
    mimeType: 'application/pdf',
    createdAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function createMockRateLimitResult(overrides: Partial<RateLimitCheckResult> = {}): RateLimitCheckResult {
  return {
    allowed: true,
    remaining: 9,
    currentCount: 1,
    nextAllowedAt: new Date(Date.now() + 86400000),
    retryAfterSeconds: 86400,
    ...overrides,
  }
}

function createMockDeps(overrides: Partial<EditFinalizeDeps> = {}): EditFinalizeDeps {
  const mockMoc = createMockMocRow()
  const mockFile = createMockMocFileRow()

  return {
    db: {
      getMoc: vi.fn().mockResolvedValue(mockMoc),
      getMocFiles: vi.fn().mockResolvedValue([mockFile]),
      transaction: vi.fn().mockImplementation(async fn => fn({})),
      updateMocWithLock: vi.fn().mockResolvedValue({ ...mockMoc, updatedAt: new Date() }),
      insertMocFiles: vi.fn().mockResolvedValue(undefined),
      softDeleteFiles: vi.fn().mockResolvedValue(undefined),
    },
    headObject: vi.fn().mockResolvedValue({ contentLength: 5242880 }),
    getObject: vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4')),
    copyObject: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    deleteObjects: vi.fn().mockResolvedValue(undefined),
    validateMagicBytes: vi.fn().mockReturnValue(true),
    checkRateLimit: vi.fn().mockResolvedValue(createMockRateLimitResult()),
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

function createValidInput(overrides: Partial<EditFinalizeInput> = {}): EditFinalizeInput {
  return {
    expectedUpdatedAt: now.toISOString(),
    newFiles: [],
    removedFileIds: [],
    ...overrides,
  }
}

// ============================================================
// TESTS
// ============================================================

describe('editFinalize', () => {
  let mockDeps: EditFinalizeDeps

  beforeEach(() => {
    mockDeps = createMockDeps()
  })

  describe('Happy Path', () => {
    it('successfully finalizes edit with metadata updates only', async () => {
      const input = createValidInput({
        title: 'Updated Title',
        description: 'Updated description',
      })
      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.moc.id).toBe(mockMocId)
        expect(result.data.files).toBeDefined()
      }
    })

    it('successfully adds new files', async () => {
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/instruction/file.pdf',
            category: 'instruction',
            filename: 'new.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          },
        ],
      })
      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
      expect(mockDeps.db.insertMocFiles).toHaveBeenCalled()
    })

    it('successfully removes files', async () => {
      const input = createValidInput({
        removedFileIds: [mockFileId],
      })
      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
      expect(mockDeps.db.softDeleteFiles).toHaveBeenCalled()
    })

    it('updates metadata including title, description, tags, theme, slug', async () => {
      const input = createValidInput({
        title: 'New Title',
        description: 'New description',
        tags: ['tag1', 'tag2'],
        theme: 'Castle',
        slug: 'new-slug',
      })
      await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(mockDeps.db.updateMocWithLock).toHaveBeenCalledWith(
        {},
        mockMocId,
        now,
        expect.objectContaining({
          title: 'New Title',
          description: 'New description',
          tags: ['tag1', 'tag2'],
          theme: 'Castle',
          slug: 'new-slug',
        }),
      )
    })

    it('moves files from edit/ path to permanent path', async () => {
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/instruction/file.pdf',
            category: 'instruction',
            filename: 'new.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          },
        ],
      })
      await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(mockDeps.copyObject).toHaveBeenCalledWith(
        'test-bucket',
        'dev/moc-instructions/user/moc/edit/instruction/file.pdf',
        'dev/moc-instructions/user/moc/instruction/file.pdf',
      )
      expect(mockDeps.deleteObject).toHaveBeenCalled()
    })

    it('returns updated MOC and active files', async () => {
      const input = createValidInput()
      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.moc).toBeDefined()
        expect(result.data.files).toBeInstanceOf(Array)
      }
    })
  })

  describe('NOT_FOUND Errors', () => {
    it('returns NOT_FOUND when MOC does not exist', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('does not check rate limit when MOC not found', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)
      const input = createValidInput()

      await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(mockDeps.checkRateLimit).not.toHaveBeenCalled()
    })
  })

  describe('FORBIDDEN Errors', () => {
    it('returns FORBIDDEN when user does not own the MOC', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(otherUserMoc)
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
        expect(result.message).toBe('You do not have permission to edit this MOC')
      }
    })

    it('returns FORBIDDEN when trying to delete files from other MOC', async () => {
      const otherMocFile = createMockMocFileRow({ mocId: 'other-moc-id' })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([otherMocFile])
      const input = createValidInput({
        removedFileIds: [mockFileId],
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('RATE_LIMIT_EXCEEDED Errors', () => {
    it('returns RATE_LIMIT_EXCEEDED when rate limit exceeded', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue(
        createMockRateLimitResult({
          allowed: false,
          remaining: 0,
          currentCount: 10,
          retryAfterSeconds: 3600,
        }),
      )
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('RATE_LIMIT_EXCEEDED')
        expect(result.details?.retryAfterSeconds).toBe(3600)
      }
    })

    it('does not proceed with edits when rate limited', async () => {
      mockDeps.checkRateLimit = vi.fn().mockResolvedValue(
        createMockRateLimitResult({ allowed: false }),
      )
      const input = createValidInput()

      await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(mockDeps.db.transaction).not.toHaveBeenCalled()
    })
  })

  describe('CONCURRENT_EDIT Errors', () => {
    it('returns CONCURRENT_EDIT when expectedUpdatedAt does not match', async () => {
      const mocWithDifferentTime = createMockMocRow({
        updatedAt: new Date(Date.now() - 1000), // 1 second earlier
      })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(mocWithDifferentTime)
      const input = createValidInput({
        expectedUpdatedAt: now.toISOString(), // Different from MOC's updatedAt
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONCURRENT_EDIT')
        expect(result.message).toContain('modified since you started editing')
        expect(result.details?.currentUpdatedAt).toBeDefined()
      }
    })

    it('returns CONCURRENT_EDIT when transaction lock fails', async () => {
      mockDeps.db.updateMocWithLock = vi.fn().mockResolvedValue(null)
      mockDeps.db.transaction = vi.fn().mockImplementation(async fn => {
        const result = await fn({})
        if (result === null) throw new Error('CONCURRENT_EDIT')
        return result
      })
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('CONCURRENT_EDIT')
      }
    })
  })

  describe('FILE_NOT_IN_S3 Errors', () => {
    it('returns FILE_NOT_IN_S3 when new file not found in S3', async () => {
      mockDeps.headObject = vi.fn().mockRejectedValue(new Error('NoSuchKey'))
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/instruction/missing.pdf',
            category: 'instruction',
            filename: 'missing.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          },
        ],
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FILE_NOT_IN_S3')
        expect(result.details?.filename).toBe('missing.pdf')
      }
    })
  })

  describe('INVALID_FILE_CONTENT Errors', () => {
    it('returns INVALID_FILE_CONTENT when magic bytes do not match', async () => {
      mockDeps.validateMagicBytes = vi.fn().mockReturnValue(false)
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/instruction/fake.pdf',
            category: 'instruction',
            filename: 'fake.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          },
        ],
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('INVALID_FILE_CONTENT')
        expect(result.details?.filename).toBe('fake.pdf')
      }
    })
  })

  describe('DB_ERROR Errors', () => {
    it('returns DB_ERROR when transaction fails', async () => {
      mockDeps.db.transaction = vi.fn().mockRejectedValue(new Error('Database connection lost'))
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Database connection lost')
      }
    })

    it('cleans up edit files on transaction failure', async () => {
      mockDeps.db.transaction = vi.fn().mockRejectedValue(new Error('DB error'))
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/instruction/file.pdf',
            category: 'instruction',
            filename: 'file.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          },
        ],
      })

      await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(mockDeps.deleteObjects).toHaveBeenCalledWith('test-bucket', [
        'dev/moc-instructions/user/moc/edit/instruction/file.pdf',
      ])
    })
  })

  describe('OpenSearch Integration', () => {
    it('re-indexes OpenSearch on successful edit', async () => {
      const mockUpdateOpenSearch = vi.fn().mockResolvedValue(undefined)
      mockDeps.updateOpenSearch = mockUpdateOpenSearch
      const input = createValidInput({ title: 'New Title' })

      await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(mockUpdateOpenSearch).toHaveBeenCalled()
    })

    it('does not fail if OpenSearch update fails (fail-open)', async () => {
      mockDeps.updateOpenSearch = vi.fn().mockRejectedValue(new Error('OpenSearch error'))
      const input = createValidInput({ title: 'New Title' })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true) // Should still succeed
    })

    it('skips OpenSearch if not provided', async () => {
      mockDeps.updateOpenSearch = undefined
      const input = createValidInput({ title: 'New Title' })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
    })
  })

  describe('Presigned GET URLs', () => {
    it('generates presigned GET URLs when function provided', async () => {
      mockDeps.generatePresignedGetUrl = vi.fn().mockResolvedValue('https://presigned-url')
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files[0].presignedUrl).toBe('https://presigned-url')
      }
    })

    it('handles presigned URL generation failure gracefully', async () => {
      mockDeps.generatePresignedGetUrl = vi.fn().mockRejectedValue(new Error('Error'))
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true) // Should still succeed
      if (result.success) {
        expect(result.data.files[0].presignedUrl).toBeNull()
      }
    })

    it('returns null presignedUrl when function not provided', async () => {
      mockDeps.generatePresignedGetUrl = undefined
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files[0].presignedUrl).toBeNull()
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles empty newFiles and removedFileIds', async () => {
      const input = createValidInput({
        newFiles: [],
        removedFileIds: [],
        title: 'Just Title Update',
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles nullable metadata fields', async () => {
      const input = createValidInput({
        description: null,
        tags: null,
        theme: null,
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
    })

    it('filters out deleted files from response', async () => {
      const deletedFile = createMockMocFileRow({ deletedAt: new Date() })
      const activeFile = createMockMocFileRow({ id: 'active-id', deletedAt: null })
      mockDeps.db.getMocFiles = vi.fn().mockResolvedValue([deletedFile, activeFile])
      const input = createValidInput()

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(1)
        expect(result.data.files[0].id).toBe('active-id')
      }
    })

    it('maps image category to gallery-image fileType', async () => {
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/image/img.jpg',
            category: 'image',
            filename: 'img.jpg',
            size: 1000,
            mimeType: 'image/jpeg',
          },
        ],
      })

      await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(mockDeps.db.insertMocFiles).toHaveBeenCalledWith(
        {},
        expect.arrayContaining([
          expect.objectContaining({ fileType: 'gallery-image' }),
        ]),
      )
    })

    it('continues with file move even if copy fails (logged but not blocking)', async () => {
      mockDeps.copyObject = vi.fn().mockRejectedValue(new Error('Copy failed'))
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/instruction/file.pdf',
            category: 'instruction',
            filename: 'file.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          },
        ],
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      expect(result.success).toBe(true) // Should still succeed
    })

    it('continues if magic bytes validation throws (defensive check)', async () => {
      mockDeps.getObject = vi.fn().mockRejectedValue(new Error('Read error'))
      const input = createValidInput({
        newFiles: [
          {
            s3Key: 'dev/moc-instructions/user/moc/edit/instruction/file.pdf',
            category: 'instruction',
            filename: 'file.pdf',
            size: 1000,
            mimeType: 'application/pdf',
          },
        ],
      })

      const result = await editFinalize(mockMocId, mockUserId, input, mockDeps)

      // Should continue (magic bytes validation is defensive, not blocking)
      expect(result.success).toBe(true)
    })
  })
})

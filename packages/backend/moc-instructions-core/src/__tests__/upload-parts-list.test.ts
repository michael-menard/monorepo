import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uploadPartsList } from '../upload-parts-list.js'
import type { UploadPartsListDeps, MocRow, MocFileRow, MocPartsListRow } from '../__types__/index.js'

// ============================================================
// MOCK HELPERS
// ============================================================

const now = new Date()
const mockUserId = 'test-user-id'
const mockMocId = '11111111-1111-1111-1111-111111111111'
const mockFileId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const mockPartsListId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

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
    fileType: 'parts-list',
    fileUrl: 'https://test-bucket.s3.us-east-1.amazonaws.com/mocs/test-id/parts-list/test.csv',
    originalFilename: 'parts.csv',
    mimeType: 'text/csv',
    createdAt: now,
    deletedAt: null,
    ...overrides,
  }
}

function createMockPartsListRow(overrides: Partial<MocPartsListRow> = {}): MocPartsListRow {
  return {
    id: mockPartsListId,
    mocId: mockMocId,
    fileId: mockFileId,
    title: 'Parts List - parts.csv',
    description: 'Parsed CSV parts list with 150 total pieces',
    totalPartsCount: '150',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createMockDeps(overrides: Partial<UploadPartsListDeps> = {}): UploadPartsListDeps {
  const mockMoc = createMockMocRow()
  const mockFile = createMockMocFileRow()
  const mockPartsList = createMockPartsListRow()
  const updatedMoc = createMockMocRow({ partsCount: 150 })

  return {
    db: {
      getMoc: vi.fn().mockResolvedValue(mockMoc),
      createMocFile: vi.fn().mockResolvedValue(mockFile),
      createPartsList: vi.fn().mockResolvedValue(mockPartsList),
      updateMocPieceCount: vi.fn().mockResolvedValue(updatedMoc),
    },
    uploadToS3: vi.fn().mockResolvedValue('https://test-bucket.s3.us-east-1.amazonaws.com/test-key'),
    parsePartsListFile: vi.fn().mockResolvedValue({
      success: true,
      data: {
        totalPieceCount: 150,
        parts: [
          { partNumber: '3001', quantity: 50 },
          { partNumber: '3002', quantity: 100 },
        ],
        format: 'csv' as const,
      },
      errors: [],
    }),
    sanitizeFilename: vi.fn().mockImplementation((filename: string) =>
      filename.toLowerCase().replace(/[^a-z0-9.-]/g, '_'),
    ),
    generateUuid: vi.fn().mockReturnValue(mockFileId),
    s3Bucket: 'test-bucket',
    s3Region: 'us-east-1',
    ...overrides,
  }
}

function createMockFile(overrides: { buffer?: Buffer; filename?: string; mimeType?: string } = {}) {
  return {
    buffer: Buffer.from('part,quantity\n3001,50\n3002,100'),
    filename: 'parts.csv',
    mimeType: 'text/csv',
    ...overrides,
  }
}

// ============================================================
// TESTS
// ============================================================

describe('uploadPartsList', () => {
  let mockDeps: UploadPartsListDeps

  beforeEach(() => {
    mockDeps = createMockDeps()
    // Reset STAGE env for consistent tests
    process.env.STAGE = 'dev'
  })

  describe('Happy Path', () => {
    it('successfully uploads and parses a CSV parts list', async () => {
      const file = createMockFile()
      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.file.fileType).toBe('parts-list')
        expect(result.data.partsList.totalPartsCount).toBe('150')
        expect(result.data.parsing.totalPieceCount).toBe(150)
        expect(result.data.parsing.uniqueParts).toBe(2)
        expect(result.data.parsing.format).toBe('csv')
        expect(result.data.parsing.success).toBe(true)
      }
    })

    it('uploads file to S3 with correct parameters', async () => {
      const file = createMockFile()
      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.uploadToS3).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringContaining(`dev/moc-instructions/${mockUserId}/${mockMocId}/parts-list/`),
        file.buffer,
        'text/csv',
      )
    })

    it('creates MOC file record with correct data', async () => {
      const file = createMockFile()
      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.db.createMocFile).toHaveBeenCalledWith({
        mocId: mockMocId,
        fileType: 'parts-list',
        fileUrl: expect.any(String),
        originalFilename: 'parts.csv',
        mimeType: 'text/csv',
      })
    })

    it('creates parts list record with parsed data', async () => {
      const file = createMockFile()
      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.db.createPartsList).toHaveBeenCalledWith({
        mocId: mockMocId,
        fileId: mockFileId,
        title: 'Parts List - parts.csv',
        description: expect.stringContaining('150 total pieces'),
        totalPartsCount: '150',
      })
    })

    it('updates MOC piece count after parsing', async () => {
      const file = createMockFile()
      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.db.updateMocPieceCount).toHaveBeenCalledWith(mockMocId, 150)
    })

    it('returns updated MOC piece count in response', async () => {
      const file = createMockFile()
      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.moc.id).toBe(mockMocId)
        expect(result.data.moc.totalPieceCount).toBe(150)
      }
    })

    it('sanitizes filename before using in S3 key', async () => {
      const file = createMockFile({ filename: 'My Parts List (Final).csv' })
      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.sanitizeFilename).toHaveBeenCalledWith('My Parts List (Final).csv')
    })

    it('handles XML format parts list', async () => {
      mockDeps.parsePartsListFile = vi.fn().mockResolvedValue({
        success: true,
        data: {
          totalPieceCount: 200,
          parts: [{ partNumber: '3003', quantity: 200 }],
          format: 'xml' as const,
        },
        errors: [],
      })

      const file = createMockFile({ filename: 'parts.xml', mimeType: 'application/xml' })
      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.parsing.format).toBe('xml')
      }
    })
  })

  describe('NOT_FOUND Errors', () => {
    it('returns NOT_FOUND when MOC does not exist', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('does not attempt to parse file when MOC not found', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)
      const file = createMockFile()

      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.parsePartsListFile).not.toHaveBeenCalled()
    })
  })

  describe('FORBIDDEN Errors', () => {
    it('returns FORBIDDEN when user does not own the MOC', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(otherUserMoc)
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
        expect(result.message).toBe('You do not own this MOC')
      }
    })

    it('does not attempt to parse file when user does not own MOC', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(otherUserMoc)
      const file = createMockFile()

      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.parsePartsListFile).not.toHaveBeenCalled()
    })
  })

  describe('PARSE_ERROR Errors', () => {
    it('returns PARSE_ERROR when parsing fails', async () => {
      mockDeps.parsePartsListFile = vi.fn().mockResolvedValue({
        success: false,
        errors: [{ code: 'INVALID_CSV', message: 'Missing header row' }],
      })
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('PARSE_ERROR')
        expect(result.message).toBe('Failed to parse parts list file')
        expect(result.details?.errors).toEqual([{ code: 'INVALID_CSV', message: 'Missing header row' }])
      }
    })

    it('returns PARSE_ERROR when parsing returns no data', async () => {
      mockDeps.parsePartsListFile = vi.fn().mockResolvedValue({
        success: true,
        data: undefined,
        errors: [],
      })
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('PARSE_ERROR')
      }
    })

    it('does not upload to S3 when parsing fails', async () => {
      mockDeps.parsePartsListFile = vi.fn().mockResolvedValue({
        success: false,
        errors: [{ code: 'ERROR', message: 'Parse error' }],
      })
      const file = createMockFile()

      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.uploadToS3).not.toHaveBeenCalled()
    })
  })

  describe('S3_ERROR Errors', () => {
    it('returns S3_ERROR when upload fails', async () => {
      mockDeps.uploadToS3 = vi.fn().mockRejectedValue(new Error('S3 access denied'))
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('S3_ERROR')
        expect(result.message).toBe('S3 access denied')
      }
    })

    it('handles non-Error S3 exceptions', async () => {
      mockDeps.uploadToS3 = vi.fn().mockRejectedValue('string error')
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('S3_ERROR')
        expect(result.message).toBe('Failed to upload file to S3')
      }
    })

    it('does not create database records when S3 upload fails', async () => {
      mockDeps.uploadToS3 = vi.fn().mockRejectedValue(new Error('S3 error'))
      const file = createMockFile()

      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.db.createMocFile).not.toHaveBeenCalled()
      expect(mockDeps.db.createPartsList).not.toHaveBeenCalled()
    })
  })

  describe('DB_ERROR Errors', () => {
    it('returns DB_ERROR when createMocFile fails', async () => {
      mockDeps.db.createMocFile = vi.fn().mockRejectedValue(new Error('Database connection lost'))
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Database connection lost')
      }
    })

    it('returns DB_ERROR when createPartsList fails', async () => {
      mockDeps.db.createPartsList = vi.fn().mockRejectedValue(new Error('Insert failed'))
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Insert failed')
      }
    })

    it('returns DB_ERROR when updateMocPieceCount fails', async () => {
      mockDeps.db.updateMocPieceCount = vi.fn().mockRejectedValue(new Error('Update failed'))
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Update failed')
      }
    })

    it('handles non-Error DB exceptions', async () => {
      mockDeps.db.createMocFile = vi.fn().mockRejectedValue('string error')
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Database error')
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles file without extension in filename', async () => {
      mockDeps.sanitizeFilename = vi.fn().mockReturnValue('partslist')
      const file = createMockFile({ filename: 'partslist' })

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles parts list with single part', async () => {
      mockDeps.parsePartsListFile = vi.fn().mockResolvedValue({
        success: true,
        data: {
          totalPieceCount: 1,
          parts: [{ partNumber: '3001', quantity: 1 }],
          format: 'csv' as const,
        },
        errors: [],
      })
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.parsing.uniqueParts).toBe(1)
        expect(result.data.parsing.totalPieceCount).toBe(1)
      }
    })

    it('handles large parts list', async () => {
      const parts = Array.from({ length: 1000 }, (_, i) => ({
        partNumber: `300${i}`,
        quantity: i + 1,
      }))
      const totalCount = parts.reduce((sum, p) => sum + p.quantity, 0)

      mockDeps.parsePartsListFile = vi.fn().mockResolvedValue({
        success: true,
        data: {
          totalPieceCount: totalCount,
          parts,
          format: 'csv' as const,
        },
        errors: [],
      })
      const file = createMockFile()

      const result = await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.parsing.uniqueParts).toBe(1000)
      }
    })

    it('uses correct STAGE environment variable in S3 key', async () => {
      process.env.STAGE = 'prod'
      const file = createMockFile()

      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.uploadToS3).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringContaining('prod/moc-instructions/'),
        expect.any(Buffer),
        expect.any(String),
      )
    })

    it('defaults to dev STAGE when not set', async () => {
      delete process.env.STAGE
      const file = createMockFile()

      await uploadPartsList(mockMocId, mockUserId, file, mockDeps)

      expect(mockDeps.uploadToS3).toHaveBeenCalledWith(
        'test-bucket',
        expect.stringContaining('dev/moc-instructions/'),
        expect.any(Buffer),
        expect.any(String),
      )
    })
  })
})

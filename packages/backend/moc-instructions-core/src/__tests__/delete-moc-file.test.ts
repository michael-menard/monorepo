import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteMocFile } from '../delete-moc-file.js'
import type { DeleteMocFileDeps, MocRow, MocFileRow } from '../__types__/index.js'

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

function createMockDeps(overrides: Partial<DeleteMocFileDeps> = {}): DeleteMocFileDeps {
  const mockMoc = createMockMocRow()
  const mockFile = createMockMocFileRow()

  return {
    db: {
      getMoc: vi.fn().mockResolvedValue(mockMoc),
      getFile: vi.fn().mockResolvedValue(mockFile),
      softDeleteFile: vi.fn().mockResolvedValue(undefined),
      updateMocTimestamp: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  }
}

// ============================================================
// TESTS
// ============================================================

describe('deleteMocFile', () => {
  let mockDeps: DeleteMocFileDeps

  beforeEach(() => {
    mockDeps = createMockDeps()
  })

  describe('Happy Path', () => {
    it('successfully soft-deletes a file from a MOC', async () => {
      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.fileId).toBe(mockFileId)
        expect(result.data.message).toBe('File deleted successfully')
      }
    })

    it('calls softDeleteFile with correct fileId', async () => {
      await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(mockDeps.db.softDeleteFile).toHaveBeenCalledWith(mockFileId)
    })

    it('updates MOC timestamp after deletion', async () => {
      await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(mockDeps.db.updateMocTimestamp).toHaveBeenCalledWith(mockMocId)
    })

    it('checks MOC ownership before deleting', async () => {
      await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(mockDeps.db.getMoc).toHaveBeenCalledWith(mockMocId)
    })

    it('checks file belongs to MOC before deleting', async () => {
      await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(mockDeps.db.getFile).toHaveBeenCalledWith(mockFileId, mockMocId)
    })
  })

  describe('NOT_FOUND Errors', () => {
    it('returns NOT_FOUND when MOC does not exist', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('returns NOT_FOUND when file does not exist', async () => {
      mockDeps.db.getFile = vi.fn().mockResolvedValue(null)

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('File not found')
      }
    })

    it('does not attempt file lookup when MOC not found', async () => {
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(null)

      await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(mockDeps.db.getFile).not.toHaveBeenCalled()
    })
  })

  describe('FORBIDDEN Errors', () => {
    it('returns FORBIDDEN when user does not own the MOC', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(otherUserMoc)

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
        expect(result.message).toBe('You do not own this MOC')
      }
    })

    it('does not attempt file lookup when user does not own MOC', async () => {
      const otherUserMoc = createMockMocRow({ userId: 'other-user-id' })
      mockDeps.db.getMoc = vi.fn().mockResolvedValue(otherUserMoc)

      await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(mockDeps.db.getFile).not.toHaveBeenCalled()
    })
  })

  describe('Database Errors', () => {
    it('returns DB_ERROR when softDeleteFile fails', async () => {
      mockDeps.db.softDeleteFile = vi.fn().mockRejectedValue(new Error('Database connection lost'))

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Database connection lost')
      }
    })

    it('returns DB_ERROR when updateMocTimestamp fails', async () => {
      mockDeps.db.updateMocTimestamp = vi.fn().mockRejectedValue(new Error('Update failed'))

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Update failed')
      }
    })

    it('handles non-Error exceptions', async () => {
      mockDeps.db.softDeleteFile = vi.fn().mockRejectedValue('string error')

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Database error')
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles different file types', async () => {
      const thumbnailFile = createMockMocFileRow({ fileType: 'thumbnail' })
      mockDeps.db.getFile = vi.fn().mockResolvedValue(thumbnailFile)

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles file with null mimeType', async () => {
      const fileWithNullMime = createMockMocFileRow({ mimeType: null })
      mockDeps.db.getFile = vi.fn().mockResolvedValue(fileWithNullMime)

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(true)
    })

    it('handles file with null originalFilename', async () => {
      const fileWithNullName = createMockMocFileRow({ originalFilename: null })
      mockDeps.db.getFile = vi.fn().mockResolvedValue(fileWithNullName)

      const result = await deleteMocFile(mockMocId, mockFileId, mockUserId, mockDeps)

      expect(result.success).toBe(true)
    })
  })
})

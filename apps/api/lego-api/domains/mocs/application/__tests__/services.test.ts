/**
 * MOC Service Unit Tests - INST-1101
 *
 * Tests business logic for MOC operations using mock repositories.
 * Focuses on AC-12 (getMoc endpoint), AC-16 (404/auth handling), AC-21 (service layer).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMocService } from '../services.js'
import type { MocRepository, Moc, MocWithFiles, MocFile, MocListResult } from '../../ports/index.js'
import type { CreateMocRequest } from '../../types.js'

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock S3 SDK for INST-1107
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  GetObjectCommand: vi.fn().mockImplementation(params => params),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.amazonaws.com/test-bucket/file.pdf?signature=mock'),
}))

// Test data
const mockMoc: Moc = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  title: 'Castle MOC',
  description: 'A detailed medieval castle MOC',
  theme: 'Castle',
  tags: ['castle', 'medieval'],
  slug: 'castle-moc',
  type: 'moc',
  thumbnailUrl: null,
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-01-02T00:00:00Z'),
}

const mockFiles: MocFile[] = [
  {
    id: 'file-1',
    mocId: '123e4567-e89b-12d3-a456-426614174000',
    fileType: 'instruction',
    fileUrl: 'https://s3.amazonaws.com/bucket/instructions.pdf',
    originalFilename: 'castle-instructions.pdf',
    mimeType: 'application/pdf',
    s3Key: 'instructions/user-123/castle-instructions.pdf',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: null,
  },
  {
    id: 'file-2',
    mocId: '123e4567-e89b-12d3-a456-426614174000',
    fileType: 'parts-list',
    fileUrl: 'https://s3.amazonaws.com/bucket/parts-list.csv',
    originalFilename: 'castle-parts.csv',
    mimeType: 'text/csv',
    s3Key: 'parts-lists/user-123/castle-parts.csv',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: null,
  },
  {
    id: 'file-3',
    mocId: '123e4567-e89b-12d3-a456-426614174000',
    fileType: 'gallery-image',
    fileUrl: 'https://s3.amazonaws.com/bucket/gallery-1.jpg',
    originalFilename: 'castle-gallery-1.jpg',
    mimeType: 'image/jpeg',
    s3Key: 'gallery/user-123/castle-gallery-1.jpg',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: null,
  },
]

const mockMocWithFiles: MocWithFiles = {
  ...mockMoc,
  files: mockFiles,
  totalPieceCount: 1500,
}

// Mock file data for download tests (INST-1107)
const mockFileWithS3Key = {
  id: 'file-1',
  mocId: '123e4567-e89b-12d3-a456-426614174000',
  fileType: 'instruction',
  fileUrl: 'https://s3.amazonaws.com/bucket/instructions.pdf',
  originalFilename: 'castle-instructions.pdf',
  mimeType: 'application/pdf',
  s3Key: 'instructions/user-123/castle-instructions.pdf',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: null,
}

// Mock repository factory
function createMockMocRepo(): MocRepository {
  return {
    create: vi.fn().mockResolvedValue(mockMoc),
    findBySlug: vi.fn().mockResolvedValue(mockMoc),
    getMocById: vi.fn().mockResolvedValue(mockMocWithFiles),
    list: vi.fn().mockResolvedValue({ items: [], total: 0 } as MocListResult),
    updateMoc: vi.fn().mockResolvedValue(mockMoc),
    updateThumbnail: vi.fn().mockResolvedValue(undefined),
    getFileByIdAndMocId: vi.fn().mockResolvedValue(mockFileWithS3Key),
  }
}

describe('MocService - INST-1101', () => {
  let mocRepo: MocRepository
  let service: ReturnType<typeof createMocService>

  beforeEach(() => {
    vi.clearAllMocks()
    mocRepo = createMockMocRepo()
    service = createMocService({ mocRepo })
  })

  describe('createMoc', () => {
    it('creates a new MOC successfully', async () => {
      const input: CreateMocRequest = {
        title: 'New Castle MOC',
        description: 'A new castle design',
        theme: 'Castle',
        tags: ['castle', 'medieval'],
      }

      const result = await service.createMoc('user-123', input)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.title).toBe('Castle MOC')
        expect(mocRepo.create).toHaveBeenCalledWith('user-123', input)
      }
    })

    it('validates input with Zod schema', async () => {
      const invalidInput = {
        title: '', // Invalid: min length 1
        description: 'Test',
        theme: 'Castle',
      } as CreateMocRequest

      const result = await service.createMoc('user-123', invalidInput)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
      expect(mocRepo.create).not.toHaveBeenCalled()
    })

    it('returns DUPLICATE_TITLE on unique constraint violation', async () => {
      const input: CreateMocRequest = {
        title: 'Existing MOC',
        theme: 'Castle',
      }

      const uniqueError = new Error('Unique constraint violation')
      Object.assign(uniqueError, {
        code: '23505',
        constraint: 'moc_instructions_user_title_unique',
      })

      vi.mocked(mocRepo.create).mockRejectedValue(uniqueError)

      const result = await service.createMoc('user-123', input)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DUPLICATE_TITLE')
      }
    })

    it('returns DB_ERROR on other database errors', async () => {
      const input: CreateMocRequest = {
        title: 'New MOC',
        theme: 'Castle',
      }

      vi.mocked(mocRepo.create).mockRejectedValue(new Error('Database connection failed'))

      const result = await service.createMoc('user-123', input)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DB_ERROR')
      }
    })
  })

  describe('getMoc - AC-12, AC-16, AC-21', () => {
    it('AC-12: returns MOC with all related data when user owns it', async () => {
      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).not.toBeNull()
        expect(result.data!.id).toBe(mockMoc.id)
        expect(result.data!.title).toBe('Castle MOC')
        expect(result.data!.files).toHaveLength(3)
        expect(result.data!.totalPieceCount).toBe(1500)
      }

      // Verify repository was called with correct params
      expect(mocRepo.getMocById).toHaveBeenCalledWith(mockMoc.id, 'user-123')
    })

    it('AC-13: returns MOC metadata (title, description, theme, tags, createdAt, updatedAt)', async () => {
      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        // Verify all metadata fields
        expect(result.data.title).toBe('Castle MOC')
        expect(result.data.description).toBe('A detailed medieval castle MOC')
        expect(result.data.theme).toBe('Castle')
        expect(result.data.tags).toEqual(['castle', 'medieval'])
        expect(result.data.createdAt).toBeInstanceOf(Date)
        expect(result.data.updatedAt).toBeInstanceOf(Date)
      }
    })

    it('AC-14: includes files array with metadata (name, size, type, uploadedAt, downloadUrl)', async () => {
      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        expect(result.data.files).toHaveLength(3)

        const instructionFile = result.data.files.find(f => f.fileType === 'instruction')
        expect(instructionFile).toBeDefined()
        expect(instructionFile!.originalFilename).toBe('castle-instructions.pdf')
        expect(instructionFile!.mimeType).toBe('application/pdf')
        expect(instructionFile!.fileUrl).toContain('https://')
        expect(instructionFile!.createdAt).toBeInstanceOf(Date)

        const partsListFile = result.data.files.find(f => f.fileType === 'parts-list')
        expect(partsListFile).toBeDefined()

        const galleryFile = result.data.files.find(f => f.fileType === 'gallery-image')
        expect(galleryFile).toBeDefined()
      }
    })

    it('AC-15: includes stats (pieceCount, fileCount)', async () => {
      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        // pieceCount from totalPieceCount
        expect(result.data.totalPieceCount).toBe(1500)

        // fileCount from files array length
        expect(result.data.files.length).toBe(3)
      }
    })

    it('AC-16: returns null for non-existent MOC', async () => {
      vi.mocked(mocRepo.getMocById).mockResolvedValue(null)

      const result = await service.getMoc('user-123', 'nonexistent-id')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBeNull()
      }

      expect(mocRepo.getMocById).toHaveBeenCalledWith('nonexistent-id', 'user-123')
    })

    it('AC-16: returns null when user is not authorized (different userId)', async () => {
      // Repository enforces authorization by userId filter
      vi.mocked(mocRepo.getMocById).mockResolvedValue(null)

      const result = await service.getMoc('other-user', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBeNull()
      }

      // Repository was called with unauthorized user ID
      expect(mocRepo.getMocById).toHaveBeenCalledWith(mockMoc.id, 'other-user')
    })

    it('returns DB_ERROR on database failure', async () => {
      vi.mocked(mocRepo.getMocById).mockRejectedValue(new Error('Database connection lost'))

      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DB_ERROR')
      }
    })

    it('AC-17 & AC-18: queries mocs table with user authorization and joins moc_files', async () => {
      // This is implicitly tested through the repository mock
      // The repository is responsible for the query implementation
      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      expect(mocRepo.getMocById).toHaveBeenCalledWith(mockMoc.id, 'user-123')

      // Verify the repository returned joined data
      if (result.ok && result.data) {
        expect(result.data.files).toBeDefined()
        expect(Array.isArray(result.data.files)).toBe(true)
      }
    })

    it('AC-19: file metadata includes all required fields', async () => {
      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        result.data.files.forEach(file => {
          expect(file.id).toBeDefined()
          expect(file.mocId).toBe(mockMoc.id)
          expect(file.fileType).toBeDefined()
          expect(file.fileUrl).toBeDefined()
          expect(file.originalFilename).toBeDefined()
          expect(file.mimeType).toBeDefined()
          expect(file.createdAt).toBeInstanceOf(Date)
        })
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles MOC with no files', async () => {
      const mocWithNoFiles: MocWithFiles = {
        ...mockMoc,
        files: [],
        totalPieceCount: 1500,
      }

      vi.mocked(mocRepo.getMocById).mockResolvedValue(mocWithNoFiles)

      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        expect(result.data.files).toEqual([])
        expect(result.data.totalPieceCount).toBe(1500)
      }
    })

    it('handles MOC with null optional fields', async () => {
      const mocWithNulls: MocWithFiles = {
        ...mockMoc,
        description: null,
        theme: null,
        tags: null,
        slug: null,
        files: [],
        totalPieceCount: null,
      }

      vi.mocked(mocRepo.getMocById).mockResolvedValue(mocWithNulls)

      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        expect(result.data.description).toBeNull()
        expect(result.data.theme).toBeNull()
        expect(result.data.tags).toBeNull()
        expect(result.data.slug).toBeNull()
        expect(result.data.totalPieceCount).toBeNull()
      }
    })

    it('handles MOC with only one file type', async () => {
      const mocWithOneFile: MocWithFiles = {
        ...mockMoc,
        files: [mockFiles[0]], // Only instruction file
        totalPieceCount: 1500,
      }

      vi.mocked(mocRepo.getMocById).mockResolvedValue(mocWithOneFile)

      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        expect(result.data.files).toHaveLength(1)
        expect(result.data.files[0].fileType).toBe('instruction')
      }
    })

    it('handles malformed MOC ID', async () => {
      vi.mocked(mocRepo.getMocById).mockResolvedValue(null)

      const result = await service.getMoc('user-123', 'invalid-uuid-format')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBeNull()
      }
    })

    it('handles empty user ID', async () => {
      vi.mocked(mocRepo.getMocById).mockResolvedValue(null)

      const result = await service.getMoc('', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toBeNull()
      }
    })
  })

  describe('getFileDownloadUrl - INST-1107', () => {
    let downloadService: ReturnType<typeof createMocService>

    // Set up env and create fresh service for each test
    beforeEach(() => {
      process.env.S3_BUCKET = 'test-bucket'
      downloadService = createMocService({ mocRepo })
    })

    afterEach(() => {
      delete process.env.S3_BUCKET
    })

    it('AC-2, AC-73: queries file from repository by fileId and mocId', async () => {
      const result = await downloadService.getFileDownloadUrl('user-123', mockMoc.id, 'file-1')

      expect(mocRepo.getFileByIdAndMocId).toHaveBeenCalledWith('file-1', mockMoc.id)
      expect(result.ok).toBe(true)
    })

    it('AC-3, AC-74: verifies file belongs to user\'s MOC', async () => {
      const result = await downloadService.getFileDownloadUrl('user-123', mockMoc.id, 'file-1')

      // Should call getMocById to verify ownership
      expect(mocRepo.getMocById).toHaveBeenCalledWith(mockMoc.id, 'user-123')
      expect(result.ok).toBe(true)
    })

    it('AC-4, AC-74: returns NOT_FOUND for unauthorized user (no info leakage)', async () => {
      // User doesn't own the MOC
      vi.mocked(mocRepo.getMocById).mockResolvedValue(null)

      const result = await downloadService.getFileDownloadUrl('other-user', mockMoc.id, 'file-1')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('AC-4: returns NOT_FOUND for non-existent file', async () => {
      vi.mocked(mocRepo.getFileByIdAndMocId).mockResolvedValue(null)

      const result = await downloadService.getFileDownloadUrl('user-123', mockMoc.id, 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('AC-9: returns downloadUrl and expiresAt on success', async () => {
      const result = await downloadService.getFileDownloadUrl('user-123', mockMoc.id, 'file-1')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.downloadUrl).toBeDefined()
        expect(result.data.downloadUrl).toContain('https://')
        expect(result.data.expiresAt).toBeDefined()
        // Verify ISO8601 format
        expect(new Date(result.data.expiresAt).toISOString()).toBe(result.data.expiresAt)
      }
    })

    it('returns DB_ERROR when file is missing s3Key', async () => {
      vi.mocked(mocRepo.getFileByIdAndMocId).mockResolvedValue({
        ...mockFileWithS3Key,
        s3Key: undefined,
      } as any)

      const result = await downloadService.getFileDownloadUrl('user-123', mockMoc.id, 'file-1')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DB_ERROR')
      }
    })

    it('returns PRESIGN_FAILED when S3 bucket is not configured', async () => {
      delete process.env.S3_BUCKET

      // Need to recreate the service with empty bucket
      const noBucketService = createMocService({ mocRepo })
      const result = await noBucketService.getFileDownloadUrl('user-123', mockMoc.id, 'file-1')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('PRESIGN_FAILED')
      }
    })
  })

  describe('updateMoc - INST-1108', () => {
    it('AC-1, AC-3: updates MOC successfully with valid data', async () => {
      const updateData = {
        title: 'Updated Castle MOC',
        description: 'Updated description',
        tags: ['updated', 'castle'],
      }

      const updatedMoc = {
        ...mockMoc,
        ...updateData,
        updatedAt: new Date('2025-01-03T00:00:00Z'),
      }

      vi.mocked(mocRepo.updateMoc).mockResolvedValue(updatedMoc)

      const result = await service.updateMoc('user-123', mockMoc.id, updateData)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.title).toBe('Updated Castle MOC')
        expect(result.data.description).toBe('Updated description')
        expect(result.data.tags).toEqual(['updated', 'castle'])
      }

      expect(mocRepo.getMocById).toHaveBeenCalledWith(mockMoc.id, 'user-123')
      expect(mocRepo.updateMoc).toHaveBeenCalledWith(mockMoc.id, 'user-123', updateData)
    })

    it('AC-6: validates title length (min 1, max 200)', async () => {
      const shortTitle = {
        title: '', // Too short
      }

      const result = await service.updateMoc('user-123', mockMoc.id, shortTitle)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
      expect(mocRepo.updateMoc).not.toHaveBeenCalled()
    })

    it('AC-7: validates description length (max 2000)', async () => {
      const longDescription = {
        description: 'a'.repeat(2001), // Too long
      }

      const result = await service.updateMoc('user-123', mockMoc.id, longDescription)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
      expect(mocRepo.updateMoc).not.toHaveBeenCalled()
    })

    it('AC-8: validates theme (must be valid ThemeEnum value)', async () => {
      const invalidTheme = {
        theme: 'InvalidTheme' as any,
      }

      const result = await service.updateMoc('user-123', mockMoc.id, invalidTheme)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
      expect(mocRepo.updateMoc).not.toHaveBeenCalled()
    })

    it('AC-9: validates tags (max 20 items, each max 30 chars)', async () => {
      const tooManyTags = {
        tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      }

      const result = await service.updateMoc('user-123', mockMoc.id, tooManyTags)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('VALIDATION_ERROR')
      }
      expect(mocRepo.updateMoc).not.toHaveBeenCalled()
    })

    it('AC-4, AC-13: returns NOT_FOUND when MOC does not exist', async () => {
      vi.mocked(mocRepo.getMocById).mockResolvedValue(null)

      const result = await service.updateMoc('user-123', 'nonexistent-id', { title: 'Test' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
      expect(mocRepo.updateMoc).not.toHaveBeenCalled()
    })

    it('AC-4, AC-13: returns NOT_FOUND when user does not own MOC (authorization)', async () => {
      vi.mocked(mocRepo.getMocById).mockResolvedValue(null)

      const result = await service.updateMoc('other-user', mockMoc.id, { title: 'Test' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }

      expect(mocRepo.getMocById).toHaveBeenCalledWith(mockMoc.id, 'other-user')
      expect(mocRepo.updateMoc).not.toHaveBeenCalled()
    })

    it('Partial update: updates only provided fields', async () => {
      const partialUpdate = {
        tags: ['new-tag'],
      }

      const updatedMoc = {
        ...mockMoc,
        tags: ['new-tag'],
        updatedAt: new Date('2025-01-03T00:00:00Z'),
      }

      vi.mocked(mocRepo.updateMoc).mockResolvedValue(updatedMoc)

      const result = await service.updateMoc('user-123', mockMoc.id, partialUpdate)

      expect(result.ok).toBe(true)
      if (result.ok) {
        // Only tags should be updated
        expect(result.data.tags).toEqual(['new-tag'])
        // Other fields should remain unchanged
        expect(result.data.title).toBe('Castle MOC')
        expect(result.data.description).toBe('A detailed medieval castle MOC')
      }

      expect(mocRepo.updateMoc).toHaveBeenCalledWith(mockMoc.id, 'user-123', partialUpdate)
    })

    it('AC-10, AC-14: returns DB_ERROR on database failure', async () => {
      vi.mocked(mocRepo.updateMoc).mockRejectedValue(new Error('Database connection lost'))

      const result = await service.updateMoc('user-123', mockMoc.id, { title: 'Test' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DB_ERROR')
      }
    })

    it('accepts empty update object (no-op)', async () => {
      const result = await service.updateMoc('user-123', mockMoc.id, {})

      expect(result.ok).toBe(true)
      expect(mocRepo.getMocById).toHaveBeenCalledWith(mockMoc.id, 'user-123')
      expect(mocRepo.updateMoc).toHaveBeenCalledWith(mockMoc.id, 'user-123', {})
    })
  })

  describe('Performance', () => {
    it('handles MOC with many files efficiently', async () => {
      const manyFiles: MocFile[] = Array.from({ length: 50 }, (_, i) => ({
        id: `file-${i}`,
        mocId: mockMoc.id,
        fileType: i % 3 === 0 ? 'instruction' : i % 3 === 1 ? 'parts-list' : 'gallery-image',
        fileUrl: `https://s3.amazonaws.com/bucket/file-${i}.pdf`,
        originalFilename: `file-${i}.pdf`,
        mimeType: 'application/pdf',
        s3Key: `uploads/user-123/${mockMoc.id}/file-${i}.pdf`,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: null,
      }))

      const mocWithManyFiles: MocWithFiles = {
        ...mockMoc,
        files: manyFiles,
        totalPieceCount: 1500,
      }

      vi.mocked(mocRepo.getMocById).mockResolvedValue(mocWithManyFiles)

      const startTime = Date.now()
      const result = await service.getMoc('user-123', mockMoc.id)
      const duration = Date.now() - startTime

      expect(result.ok).toBe(true)
      if (result.ok && result.data) {
        expect(result.data.files).toHaveLength(50)
      }

      // Should complete in under 100ms (for in-memory operations)
      expect(duration).toBeLessThan(100)
    })
  })
})

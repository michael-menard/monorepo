import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createInstructionsService } from '../services.js'
import type { InstructionRepository, FileRepository, FileStorage } from '../ports.js'
import type { MocInstructions, MocFile } from '../types.js'

/**
 * Instructions Service Unit Tests
 *
 * Tests business logic using mock repositories/storage.
 * No real database or S3 calls.
 */

// Mock implementations
const mockMoc: MocInstructions = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  title: 'Test MOC',
  description: 'A test MOC instruction set',
  type: 'moc',
  mocId: null,
  slug: null,
  author: 'Test Author',
  partsCount: 500,
  minifigCount: 2,
  theme: 'Castle',
  themeId: null,
  subtheme: 'Lion Knights',
  uploadedDate: null,
  brand: null,
  setNumber: null,
  releaseYear: null,
  retired: null,
  designer: null,
  dimensions: null,
  instructionsMetadata: null,
  features: null,
  descriptionHtml: null,
  shortDescription: null,
  difficulty: 'intermediate',
  buildTimeHours: 4,
  ageRecommendation: '12+',
  status: 'draft',
  visibility: 'private',
  isFeatured: false,
  isVerified: false,
  tags: ['castle', 'medieval'],
  thumbnailUrl: null,
  totalPieceCount: 500,
  publishedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockFile: MocFile = {
  id: 'file-123',
  mocId: '123e4567-e89b-12d3-a456-426614174000',
  fileType: 'instruction',
  fileUrl: 'https://bucket.s3.amazonaws.com/mocs/user-123/123e4567/instructions/1234567890.pdf',
  originalFilename: 'instructions.pdf',
  mimeType: 'application/pdf',
  createdAt: new Date(),
  updatedAt: null,
  deletedAt: null,
}

function createMockInstructionRepo(): InstructionRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockMoc }),
    findByUserId: vi.fn().mockResolvedValue({
      items: [mockMoc],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    }),
    existsByUserAndTitle: vi.fn().mockResolvedValue(false),
    insert: vi.fn().mockResolvedValue(mockMoc),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockMoc }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  }
}

function createMockFileRepo(): FileRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockFile }),
    findByMocId: vi.fn().mockResolvedValue([mockFile]),
    insert: vi.fn().mockResolvedValue(mockFile),
    softDelete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    deleteByMocId: vi.fn().mockResolvedValue(undefined),
  }
}

function createMockStorage(): FileStorage {
  return {
    upload: vi.fn().mockResolvedValue({ ok: true, data: { url: 'https://bucket.s3.amazonaws.com/test.pdf' } }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    extractKeyFromUrl: vi.fn().mockReturnValue('mocs/user-123/123e4567/test.pdf'),
  }
}

describe('InstructionsService', () => {
  let instructionRepo: InstructionRepository
  let fileRepo: FileRepository
  let fileStorage: FileStorage
  let service: ReturnType<typeof createInstructionsService>

  beforeEach(() => {
    instructionRepo = createMockInstructionRepo()
    fileRepo = createMockFileRepo()
    fileStorage = createMockStorage()
    service = createInstructionsService({ instructionRepo, fileRepo, fileStorage })
  })

  describe('createMoc', () => {
    it('creates a new MOC instruction', async () => {
      const result = await service.createMoc('user-123', {
        title: 'New MOC',
        description: 'A new MOC',
        type: 'moc',
        author: 'Test Author',
        partsCount: 100,
        status: 'draft',
        visibility: 'private',
      })

      expect(result.ok).toBe(true)
      expect(instructionRepo.insert).toHaveBeenCalled()
    })

    it('returns DUPLICATE_TITLE when title already exists', async () => {
      vi.mocked(instructionRepo.existsByUserAndTitle).mockResolvedValue(true)

      const result = await service.createMoc('user-123', {
        title: 'Existing MOC',
        type: 'moc',
        status: 'draft',
        visibility: 'private',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DUPLICATE_TITLE')
      }
    })
  })

  describe('getMoc', () => {
    it('returns MOC when user owns it', async () => {
      const result = await service.getMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe(mockMoc.id)
      }
    })

    it('returns FORBIDDEN when user does not own MOC', async () => {
      const result = await service.getMoc('other-user', mockMoc.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })

    it('returns NOT_FOUND when MOC does not exist', async () => {
      vi.mocked(instructionRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.getMoc('user-123', 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })
  })

  describe('getMocWithFiles', () => {
    it('returns MOC with its files', async () => {
      const result = await service.getMocWithFiles('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.moc.id).toBe(mockMoc.id)
        expect(result.data.files).toHaveLength(1)
      }
    })
  })

  describe('listMocs', () => {
    it('returns paginated MOCs for user', async () => {
      const result = await service.listMocs('user-123', { page: 1, limit: 20 })

      expect(result.items).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(instructionRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        undefined
      )
    })

    it('passes filters to repository', async () => {
      await service.listMocs('user-123', { page: 1, limit: 20 }, { type: 'moc', theme: 'Castle' })

      expect(instructionRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        { type: 'moc', theme: 'Castle' }
      )
    })
  })

  describe('updateMoc', () => {
    it('updates MOC when user owns it', async () => {
      const result = await service.updateMoc('user-123', mockMoc.id, {
        title: 'Updated Title',
        description: 'Updated description',
      })

      expect(result.ok).toBe(true)
      expect(instructionRepo.update).toHaveBeenCalledWith(mockMoc.id, {
        title: 'Updated Title',
        description: 'Updated description',
      })
    })

    it('returns FORBIDDEN when user does not own MOC', async () => {
      const result = await service.updateMoc('other-user', mockMoc.id, { title: 'New Title' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(instructionRepo.update).not.toHaveBeenCalled()
    })

    it('returns DUPLICATE_TITLE when new title already exists', async () => {
      vi.mocked(instructionRepo.existsByUserAndTitle).mockResolvedValue(true)

      const result = await service.updateMoc('user-123', mockMoc.id, { title: 'Existing Title' })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('DUPLICATE_TITLE')
      }
    })
  })

  describe('deleteMoc', () => {
    it('deletes MOC and its files when user owns it', async () => {
      const result = await service.deleteMoc('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      expect(fileStorage.delete).toHaveBeenCalled()
      expect(instructionRepo.delete).toHaveBeenCalledWith(mockMoc.id)
    })

    it('returns FORBIDDEN when user does not own MOC', async () => {
      const result = await service.deleteMoc('other-user', mockMoc.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(instructionRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('uploadInstructionFile', () => {
    it('uploads instruction file and saves to database', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'instructions.pdf',
        mimetype: 'application/pdf',
        size: 1000,
      }

      const result = await service.uploadInstructionFile('user-123', mockMoc.id, file)

      expect(result.ok).toBe(true)
      expect(fileStorage.upload).toHaveBeenCalled()
      expect(fileRepo.insert).toHaveBeenCalled()
    })

    it('returns FORBIDDEN when user does not own MOC', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'instructions.pdf',
        mimetype: 'application/pdf',
        size: 1000,
      }

      const result = await service.uploadInstructionFile('other-user', mockMoc.id, file)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })

    it('rejects files over size limit', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'big.pdf',
        mimetype: 'application/pdf',
        size: 150 * 1024 * 1024, // 150MB
      }

      const result = await service.uploadInstructionFile('user-123', mockMoc.id, file)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('INVALID_FILE')
      }
    })
  })

  describe('uploadPartsListFile', () => {
    it('uploads parts list file', async () => {
      const file = {
        buffer: Buffer.from('part_id,quantity,color\n3001,10,Red'),
        filename: 'parts.csv',
        mimetype: 'text/csv',
        size: 500,
      }

      const result = await service.uploadPartsListFile('user-123', mockMoc.id, file)

      expect(result.ok).toBe(true)
      expect(fileStorage.upload).toHaveBeenCalled()
      expect(fileRepo.insert).toHaveBeenCalled()
    })

    it('rejects invalid file types', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'file.exe',
        mimetype: 'application/x-msdownload',
        size: 500,
      }

      const result = await service.uploadPartsListFile('user-123', mockMoc.id, file)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('INVALID_FILE')
      }
    })
  })

  describe('uploadThumbnail', () => {
    it('uploads thumbnail and updates MOC', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'thumb.jpg',
        mimetype: 'image/jpeg',
        size: 1000,
      }

      const result = await service.uploadThumbnail('user-123', mockMoc.id, file)

      expect(result.ok).toBe(true)
      expect(fileStorage.upload).toHaveBeenCalled()
      expect(instructionRepo.update).toHaveBeenCalled()
    })

    it('rejects invalid image types', async () => {
      const file = {
        buffer: Buffer.from('test'),
        filename: 'image.gif',
        mimetype: 'image/gif',
        size: 1000,
      }

      const result = await service.uploadThumbnail('user-123', mockMoc.id, file)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('INVALID_FILE')
      }
    })
  })

  describe('deleteFile', () => {
    it('deletes file when user owns MOC', async () => {
      const result = await service.deleteFile('user-123', mockMoc.id, mockFile.id)

      expect(result.ok).toBe(true)
      expect(fileStorage.delete).toHaveBeenCalled()
      expect(fileRepo.softDelete).toHaveBeenCalledWith(mockFile.id)
    })

    it('returns FORBIDDEN when user does not own MOC', async () => {
      const result = await service.deleteFile('other-user', mockMoc.id, mockFile.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(fileRepo.softDelete).not.toHaveBeenCalled()
    })

    it('returns FORBIDDEN when file belongs to different MOC', async () => {
      vi.mocked(fileRepo.findById).mockResolvedValue({
        ok: true,
        data: { ...mockFile, mocId: 'different-moc' },
      })

      const result = await service.deleteFile('user-123', mockMoc.id, mockFile.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('listFiles', () => {
    it('returns files for a MOC', async () => {
      const result = await service.listFiles('user-123', mockMoc.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
      }
    })

    it('filters by file type', async () => {
      await service.listFiles('user-123', mockMoc.id, 'instruction')

      expect(fileRepo.findByMocId).toHaveBeenCalledWith(mockMoc.id, 'instruction')
    })
  })
})

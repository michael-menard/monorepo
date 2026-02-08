/**
 * MOC Service Unit Tests - INST-1101
 *
 * Tests business logic for MOC operations using mock repositories.
 * Focuses on AC-12 (getMoc endpoint), AC-16 (404/auth handling), AC-21 (service layer).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
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
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: null,
  },
]

const mockMocWithFiles: MocWithFiles = {
  ...mockMoc,
  files: mockFiles,
  totalPieceCount: 1500,
}

// Mock repository factory
function createMockMocRepo(): MocRepository {
  return {
    create: vi.fn().mockResolvedValue(mockMoc),
    findBySlug: vi.fn().mockResolvedValue(mockMoc),
    getMocById: vi.fn().mockResolvedValue(mockMocWithFiles),
    list: vi.fn().mockResolvedValue({ items: [], total: 0 } as MocListResult),
    updateThumbnail: vi.fn().mockResolvedValue(undefined),
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

  describe('Performance', () => {
    it('handles MOC with many files efficiently', async () => {
      const manyFiles: MocFile[] = Array.from({ length: 50 }, (_, i) => ({
        id: `file-${i}`,
        mocId: mockMoc.id,
        fileType: i % 3 === 0 ? 'instruction' : i % 3 === 1 ? 'parts-list' : 'gallery-image',
        fileUrl: `https://s3.amazonaws.com/bucket/file-${i}.pdf`,
        originalFilename: `file-${i}.pdf`,
        mimeType: 'application/pdf',
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

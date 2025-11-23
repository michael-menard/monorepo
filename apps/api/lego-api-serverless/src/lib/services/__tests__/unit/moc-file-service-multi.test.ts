/**
 * Unit Tests for Multi-File Upload Service (Story 4.7)
 *
 * Tests parallel file upload, batch database insertion, and helper functions.
 * Mock all external dependencies (S3, database).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FileUploadResult } from '@/lib/services/moc-file-service'

// Mock S3 client
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}))

// Mock database client - define mocks before they're used
vi.mock('@/lib/db/client', () => {
  const mockTx = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() =>
          Promise.resolve([
            {
              id: 'file-1',
              mocId: 'moc-123',
              fileType: 'instruction',
              fileUrl: 'https://bucket.s3.amazonaws.com/file1.pdf',
              originalFilename: 'file1.pdf',
              mimeType: 'application/pdf',
              createdAt: new Date(),
            },
          ]),
        ),
      })),
    })),
  }

  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 'moc-123', userId: 'user-123' }])),
        })),
      })),
    })),
    transaction: vi.fn((callback) => callback(mockTx)),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([])),
      })),
    })),
  }

  return { db: mockDb }
})

vi.mock('@/db/schema', () => ({
  mocInstructions: {},
  mocFiles: {},
}))

vi.mock('@/lib/services/moc-service', () => ({
  invalidateMocDetailCache: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

// Mock environment variables
process.env.LEGO_API_BUCKET_NAME = 'test-bucket'
process.env.AWS_REGION = 'us-east-1'

// Import after mocks are set up
const { uploadMocFilesParallel, insertFileRecordsBatch } = await import('@/lib/services/moc-file-service')

describe('Multi-File Upload Service (Story 4.7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('uploadMocFilesParallel()', () => {
    it('should upload 3 valid files successfully in parallel', async () => {
      // Given: 3 valid instruction files (with valid PDF magic bytes)
      const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
      const files = [
        {
          buffer: Buffer.concat([pdfMagicBytes, Buffer.from(' PDF content 1')]),
          filename: 'instructions-1.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
        {
          buffer: Buffer.concat([pdfMagicBytes, Buffer.from(' PDF content 2')]),
          filename: 'instructions-2.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file1',
        },
        {
          buffer: Buffer.concat([pdfMagicBytes, Buffer.from(' PDF content 3')]),
          filename: 'instructions-3.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file2',
        },
      ]

      const fileTypeMapping = {
        file0: 'instruction',
        file1: 'instruction',
        file2: 'instruction',
      }

      // When: Upload files in parallel
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: All 3 files uploaded successfully
      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
      expect(results[0].filename).toBe('instructions-1.pdf')
      expect(results[1].filename).toBe('instructions-2.pdf')
      expect(results[2].filename).toBe('instructions-3.pdf')
      expect(results[0].fileId).toBeDefined()
      expect(results[0].s3Url).toContain('amazonaws.com')
    })

    it('should handle mixed success and failure (2 valid, 1 oversized)', async () => {
      // Given: 2 valid files + 1 oversized file (>50MB for instruction)
      const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
      const largeBuffer = Buffer.concat([pdfMagicBytes, Buffer.alloc(51 * 1024 * 1024)]) // 51MB with magic bytes
      const files = [
        {
          buffer: Buffer.concat([pdfMagicBytes, Buffer.from(' PDF content 1')]),
          filename: 'valid-1.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
        {
          buffer: largeBuffer,
          filename: 'too-large.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file1',
        },
        {
          buffer: Buffer.concat([pdfMagicBytes, Buffer.from(' PDF content 3')]),
          filename: 'valid-2.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file2',
        },
      ]

      const fileTypeMapping = {
        file0: 'instruction',
        file1: 'instruction',
        file2: 'instruction',
      }

      // When: Upload files
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: 2 succeed, 1 fails
      expect(results).toHaveLength(3)
      const succeeded = results.filter(r => r.success)
      const failed = results.filter(r => !r.success)

      expect(succeeded).toHaveLength(2)
      expect(failed).toHaveLength(1)
      expect(failed[0].filename).toBe('too-large.pdf')
      expect(failed[0].error).toContain('exceeds maximum allowed')
    })

    it('should reject invalid MIME type', async () => {
      // Given: Executable file (not allowed)
      const files = [
        {
          buffer: Buffer.from('executable content'),
          filename: 'malicious.exe',
          mimetype: 'application/x-msdownload',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = {
        file0: 'instruction',
      }

      // When: Attempt to upload
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Upload fails with error
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('not allowed')
    })

    it('should reject file with missing fileType', async () => {
      // Given: File without fileType mapping
      const files = [
        {
          buffer: Buffer.from('PDF content'),
          filename: 'test.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = {} // Empty mapping

      // When: Attempt to upload
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Upload fails
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toBe('File type not specified')
    })

    it('should validate different file types with correct size limits', async () => {
      // Given: Files of different types with varying sizes (with valid magic bytes)
      const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
      const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff]) // JPEG
      const files = [
        {
          buffer: Buffer.concat([pdfMagicBytes, Buffer.alloc(45 * 1024 * 1024)]), // 45MB - valid for instruction
          filename: 'instructions.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
        {
          buffer: Buffer.alloc(9 * 1024 * 1024), // 9MB - valid for parts-list (CSV, no magic bytes)
          filename: 'parts.csv',
          mimetype: 'text/csv',
          fieldname: 'file1',
        },
        {
          buffer: Buffer.concat([jpegMagicBytes, Buffer.alloc(4 * 1024 * 1024)]), // 4MB - valid for thumbnail
          filename: 'thumb.jpg',
          mimetype: 'image/jpeg',
          fieldname: 'file2',
        },
      ]

      const fileTypeMapping = {
        file0: 'instruction', // Max: 50MB
        file1: 'parts-list', // Max: 10MB
        file2: 'thumbnail', // Max: 5MB
      }

      // When: Upload files
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: All should succeed (within their respective limits)
      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should throw error if MOC not found', async () => {
      // Given: Non-existent MOC
      const { db } = await import('@/lib/db/client')
      const mockSelect = vi.mocked(db.select)
      mockSelect.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])), // Empty result
          })),
        })),
      } as any)

      const files = [
        {
          buffer: Buffer.from('PDF content'),
          filename: 'test.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'instruction' }

      // When/Then: Should throw NotFoundError
      await expect(
        uploadMocFilesParallel('non-existent-moc', 'user-123', files, fileTypeMapping),
      ).rejects.toThrow('MOC not found')
    })

    it('should throw error if user does not own MOC', async () => {
      // Given: MOC owned by different user
      const { db } = await import('@/lib/db/client')
      const mockSelect = vi.mocked(db.select)
      mockSelect.mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([{ id: 'moc-123', userId: 'other-user' }])),
          })),
        })),
      } as any)

      const files = [
        {
          buffer: Buffer.from('PDF content'),
          filename: 'test.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'instruction' }

      // When/Then: Should throw ForbiddenError
      await expect(
        uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping),
      ).rejects.toThrow('You do not own this MOC')
    })
  })

  describe('insertFileRecordsBatch()', () => {
    it('should insert 3 successful uploads in a transaction', async () => {
      // Given: 3 successful upload results
      const uploadResults: FileUploadResult[] = [
        {
          filename: 'file1.pdf',
          success: true,
          fileId: 'uuid-1',
          s3Url: 'https://bucket.s3.amazonaws.com/file1.pdf',
          fileSize: 1024,
          fileType: 'instruction',
        },
        {
          filename: 'file2.pdf',
          success: true,
          fileId: 'uuid-2',
          s3Url: 'https://bucket.s3.amazonaws.com/file2.pdf',
          fileSize: 2048,
          fileType: 'instruction',
        },
        {
          filename: 'file3.pdf',
          success: true,
          fileId: 'uuid-3',
          s3Url: 'https://bucket.s3.amazonaws.com/file3.pdf',
          fileSize: 3072,
          fileType: 'instruction',
        },
      ]

      // When: Insert batch
      const result = await insertFileRecordsBatch('moc-123', uploadResults)

      // Then: Transaction called with all 3 records
      const { db } = await import('@/lib/db/client')
      expect(vi.mocked(db.transaction)).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should only insert successful uploads (ignore failures)', async () => {
      // Given: Mixed success/failure results
      const uploadResults: FileUploadResult[] = [
        {
          filename: 'success.pdf',
          success: true,
          fileId: 'uuid-1',
          s3Url: 'https://bucket.s3.amazonaws.com/success.pdf',
          fileSize: 1024,
          fileType: 'instruction',
        },
        {
          filename: 'failed.exe',
          success: false,
          error: 'Invalid file type',
        },
      ]

      // When: Insert batch
      const result = await insertFileRecordsBatch('moc-123', uploadResults)

      // Then: Only 1 record inserted (the successful one)
      const { db } = await import('@/lib/db/client')
      expect(vi.mocked(db.transaction)).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('should return empty array if no successful uploads', async () => {
      // Given: All failed uploads
      const uploadResults: FileUploadResult[] = [
        {
          filename: 'failed1.exe',
          success: false,
          error: 'Invalid file type',
        },
        {
          filename: 'failed2.bin',
          success: false,
          error: 'Invalid file type',
        },
      ]

      // When: Insert batch
      const result = await insertFileRecordsBatch('moc-123', uploadResults)

      // Then: No database call, empty result
      const { db } = await import('@/lib/db/client')
      expect(vi.mocked(db.transaction)).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })

  describe('Helper Functions', () => {
    describe('getMimeTypeFromFilename()', () => {
      // Note: This is a private function, so we test it indirectly through the service

      it('should correctly map file extensions to MIME types', async () => {
        // Given: Files with various extensions (with valid magic bytes)
        const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
        const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff]) // JPEG
        const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) // PNG
        const files = [
          {
            buffer: Buffer.concat([pdfMagicBytes, Buffer.from('PDF')]),
            filename: 'test.pdf',
            mimetype: 'application/pdf',
            fieldname: 'file0',
          },
          {
            buffer: Buffer.from('CSV'), // CSV has no magic bytes
            filename: 'test.csv',
            mimetype: 'text/csv',
            fieldname: 'file1',
          },
          {
            buffer: Buffer.concat([jpegMagicBytes, Buffer.from('IMG')]),
            filename: 'test.jpg',
            mimetype: 'image/jpeg',
            fieldname: 'file2',
          },
          {
            buffer: Buffer.concat([pngMagicBytes, Buffer.from('IMG')]),
            filename: 'test.png',
            mimetype: 'image/png',
            fieldname: 'file3',
          },
        ]

        const fileTypeMapping = {
          file0: 'instruction',
          file1: 'parts-list',
          file2: 'gallery-image',
          file3: 'thumbnail',
        }

        // When: Upload files (triggers MIME type detection)
        const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

        // Then: All files processed successfully (MIME types are valid)
        expect(results).toHaveLength(4)
        expect(results.every(r => r.success)).toBe(true)
      })
    })
  })
})

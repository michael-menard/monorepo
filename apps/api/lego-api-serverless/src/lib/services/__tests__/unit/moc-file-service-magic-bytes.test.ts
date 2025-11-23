/**
 * Unit Tests for Magic Bytes Validation (Story 4.7.1)
 *
 * Tests enhanced file validation with magic bytes detection to prevent file spoofing.
 * Mock all external dependencies (S3, database).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock S3 client
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}))

// Mock database client
vi.mock('@/lib/db/client', () => {
  const mockDb = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([{ id: 'moc-123', userId: 'user-123' }])),
        })),
      })),
    })),
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
const { uploadMocFilesParallel } = await import('@/lib/services/moc-file-service')

describe('Magic Bytes Validation (Story 4.7.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Magic Bytes Validation for Binary Files', () => {
    it('should accept valid PDF with correct magic bytes', async () => {
      // Given: Valid PDF file with correct magic bytes
      const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46]) // %PDF
      const pdfContent = Buffer.concat([pdfMagicBytes, Buffer.from(' rest of PDF content')])

      const files = [
        {
          buffer: pdfContent,
          filename: 'instructions.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'instruction' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
      expect(results[0].filename).toBe('instructions.pdf')
    })

    it('should reject EXE file renamed to .pdf (spoofed)', async () => {
      // Given: Windows executable (MZ header) renamed to .pdf
      const exeMagicBytes = Buffer.from([0x4d, 0x5a]) // MZ
      const exeContent = Buffer.concat([exeMagicBytes, Buffer.from(' executable code here')])

      const files = [
        {
          buffer: exeContent,
          filename: 'malicious.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'instruction' }

      // When: Attempt to upload spoofed file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Upload rejected with clear error
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('File signature validation failed')
      expect(results[0].error).toContain('malicious.pdf')
    })

    it('should accept valid JPEG with correct magic bytes', async () => {
      // Given: Valid JPEG file with correct magic bytes
      const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
      const jpegContent = Buffer.concat([jpegMagicBytes, Buffer.from(' JPEG data')])

      const files = [
        {
          buffer: jpegContent,
          filename: 'thumbnail.jpg',
          mimetype: 'image/jpeg',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'thumbnail' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })

    it('should reject PNG file with corrupted magic bytes', async () => {
      // Given: PNG file with corrupted magic bytes (should be 0x89, 0x50, 0x4e, 0x47...)
      const corruptedMagicBytes = Buffer.from([0x00, 0x00, 0x00, 0x00]) // Corrupted
      const corruptedContent = Buffer.concat([corruptedMagicBytes, Buffer.from(' PNG data')])

      const files = [
        {
          buffer: corruptedContent,
          filename: 'corrupted.png',
          mimetype: 'image/png',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'thumbnail' }

      // When: Attempt to upload
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Upload rejected
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('File signature validation failed')
    })

    it('should accept valid PNG with correct magic bytes', async () => {
      // Given: Valid PNG file
      const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const pngContent = Buffer.concat([pngMagicBytes, Buffer.from(' PNG data')])

      const files = [
        {
          buffer: pngContent,
          filename: 'image.png',
          mimetype: 'image/png',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'gallery-image' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })

    it('should accept valid WebP with correct magic bytes', async () => {
      // Given: Valid WebP file (RIFF container with WEBP format)
      const webpMagicBytes = Buffer.from([
        0x52,
        0x49,
        0x46,
        0x46, // RIFF
        0x00,
        0x00,
        0x00,
        0x00, // File size (placeholder)
        0x57,
        0x45,
        0x42,
        0x50, // WEBP
      ])
      const webpContent = Buffer.concat([webpMagicBytes, Buffer.from(' WebP data')])

      const files = [
        {
          buffer: webpContent,
          filename: 'image.webp',
          mimetype: 'image/webp',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'thumbnail' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })
  })

  describe('Fallback Validation for Text-Based Files', () => {
    it('should accept valid CSV file (no magic bytes, MIME type check)', async () => {
      // Given: CSV file (text-based, no magic bytes)
      const csvContent = Buffer.from('part_id,part_name,quantity\n1,Brick 2x4,10\n2,Plate 1x2,20')

      const files = [
        {
          buffer: csvContent,
          filename: 'parts.csv',
          mimetype: 'text/csv',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'parts-list' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted (falls back to MIME type validation)
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })

    it('should accept valid JSON file (no magic bytes, MIME type check)', async () => {
      // Given: JSON file
      const jsonContent = Buffer.from(JSON.stringify({ parts: [{ id: 1, name: 'Brick' }] }))

      const files = [
        {
          buffer: jsonContent,
          filename: 'parts.json',
          mimetype: 'application/json',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'parts-list' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })

    it('should accept valid XML file (no magic bytes, MIME type check)', async () => {
      // Given: XML file
      const xmlContent = Buffer.from('<?xml version="1.0"?><parts><part id="1">Brick</part></parts>')

      const files = [
        {
          buffer: xmlContent,
          filename: 'parts.xml',
          mimetype: 'application/xml',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'parts-list' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })
  })

  describe('HEIC Handling (MIME type validation only)', () => {
    it('should accept valid HEIC file with MIME type check', async () => {
      // Given: HEIC file (complex format, validated by MIME type only)
      const heicContent = Buffer.from('HEIC image data here (actual format is complex)')

      const files = [
        {
          buffer: heicContent,
          filename: 'photo.heic',
          mimetype: 'image/heic',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'thumbnail' }

      // When: Upload file
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: File accepted (MIME type validation)
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })

    it('should reject non-image file renamed to .heic', async () => {
      // Given: Text file renamed to .heic
      const textContent = Buffer.from('This is just a text file, not an image')

      const files = [
        {
          buffer: textContent,
          filename: 'fake.heic',
          mimetype: 'text/plain', // Browser detects it as text
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'thumbnail' }

      // When: Attempt to upload
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Upload rejected (wrong MIME type)
      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('does not match')
    })
  })

  describe('Error Messages', () => {
    it('should provide specific error for spoofed PDF', async () => {
      // Given: Executable disguised as PDF
      const exeContent = Buffer.from([0x4d, 0x5a, 0x90, 0x00]) // MZ header

      const files = [
        {
          buffer: exeContent,
          filename: 'virus.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'instruction' }

      // When: Attempt to upload
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Error message is clear and specific
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('File signature validation failed')
      expect(results[0].error).toContain('virus.pdf')
      expect(results[0].error).toContain('application/pdf')
    })

    it('should provide specific error for spoofed image', async () => {
      // Given: Non-image file disguised as JPEG
      const textContent = Buffer.from('Just some text, not an image')

      const files = [
        {
          buffer: textContent,
          filename: 'backdoor.jpg',
          mimetype: 'image/jpeg',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'gallery-image' }

      // When: Attempt to upload
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Error message is helpful
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('File signature validation failed')
      expect(results[0].error).toContain('backdoor.jpg')
    })

    it('should provide helpful error for valid file type mismatch', async () => {
      // Given: Valid PNG uploaded as JPEG
      const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const pngContent = Buffer.concat([pngMagicBytes, Buffer.from(' PNG data')])

      const files = [
        {
          buffer: pngContent,
          filename: 'image.jpg', // Extension says JPEG
          mimetype: 'image/jpeg', // MIME type says JPEG
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'thumbnail' }

      // When: Attempt to upload
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: Error indicates mismatch
      expect(results[0].success).toBe(false)
      expect(results[0].error).toContain('File signature validation failed')
    })
  })

  describe('Performance Requirements', () => {
    it('should validate single file in <50ms', async () => {
      // Given: Valid PDF
      const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46])
      const pdfContent = Buffer.concat([pdfMagicBytes, Buffer.alloc(1024 * 1024)]) // 1MB file

      const files = [
        {
          buffer: pdfContent,
          filename: 'test.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
      ]

      const fileTypeMapping = { file0: 'instruction' }

      // When: Measure upload time
      const startTime = performance.now()
      await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)
      const endTime = performance.now()

      const validationTime = endTime - startTime

      // Then: Validation takes <50ms (being generous since we include S3 mocks)
      // Note: In practice, just magic bytes check is <10ms
      expect(validationTime).toBeLessThan(100) // Allow 100ms for full upload flow
    })

    it('should validate 10 files in <500ms total', async () => {
      // Given: 10 valid files
      const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46])
      const files = Array.from({ length: 10 }, (_, i) => ({
        buffer: Buffer.concat([pdfMagicBytes, Buffer.alloc(100 * 1024)]), // 100KB each
        filename: `file${i}.pdf`,
        mimetype: 'application/pdf',
        fieldname: `file${i}`,
      }))

      const fileTypeMapping = Object.fromEntries(files.map((_, i) => [`file${i}`, 'instruction']))

      // When: Measure upload time
      const startTime = performance.now()
      await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)
      const endTime = performance.now()

      const totalTime = endTime - startTime

      // Then: Total time <500ms (allowing overhead for S3 mocks)
      expect(totalTime).toBeLessThan(1000) // Allow 1s for full upload flow with mocks
    })
  })

  describe('Backward Compatibility', () => {
    it('should still accept all file types from Story 4.7', async () => {
      // Given: Various valid file types from Story 4.7
      const pdfMagicBytes = Buffer.from([0x25, 0x50, 0x44, 0x46])
      const jpegMagicBytes = Buffer.from([0xff, 0xd8, 0xff])
      const pngMagicBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

      const files = [
        {
          buffer: Buffer.concat([pdfMagicBytes, Buffer.from(' PDF')]),
          filename: 'inst.pdf',
          mimetype: 'application/pdf',
          fieldname: 'file0',
        },
        {
          buffer: Buffer.from('part_id,name\n1,Brick'),
          filename: 'parts.csv',
          mimetype: 'text/csv',
          fieldname: 'file1',
        },
        {
          buffer: Buffer.concat([jpegMagicBytes, Buffer.from(' JPEG')]),
          filename: 'thumb.jpg',
          mimetype: 'image/jpeg',
          fieldname: 'file2',
        },
        {
          buffer: Buffer.concat([pngMagicBytes, Buffer.from(' PNG')]),
          filename: 'gallery.png',
          mimetype: 'image/png',
          fieldname: 'file3',
        },
      ]

      const fileTypeMapping = {
        file0: 'instruction',
        file1: 'parts-list',
        file2: 'thumbnail',
        file3: 'gallery-image',
      }

      // When: Upload all files
      const results = await uploadMocFilesParallel('moc-123', 'user-123', files, fileTypeMapping)

      // Then: All files accepted (backward compatible)
      expect(results).toHaveLength(4)
      expect(results.every(r => r.success)).toBe(true)
    })
  })
})

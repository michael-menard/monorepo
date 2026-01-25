import { describe, it, expect, vi } from 'vitest'
import { getMoc, type GetMocDbClient } from '../get-moc.js'
import type { MocRow, MocFileRow } from '../__types__/index.js'

// Helper to create mock MOC row
function createMockMocRow(overrides: Partial<MocRow> = {}): MocRow {
  const now = new Date()
  return {
    id: '11111111-1111-1111-1111-111111111111',
    userId: 'test-user-id',
    type: 'moc',
    mocId: 'MOC-12345',
    slug: 'test-castle',
    title: 'Test Castle',
    description: 'A beautiful medieval castle',
    author: 'Test Author',
    brand: null,
    theme: 'Castle',
    subtheme: null,
    setNumber: null,
    releaseYear: null,
    retired: null,
    partsCount: 1500,
    tags: ['castle', 'medieval'],
    thumbnailUrl: 'https://example.com/thumb.jpg',
    status: 'published',
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// Helper to create mock MOC file row
function createMockMocFileRow(overrides: Partial<MocFileRow> = {}): MocFileRow {
  const now = new Date()
  return {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    mocId: '11111111-1111-1111-1111-111111111111',
    fileType: 'instruction',
    fileUrl: 'https://example.com/instructions.pdf',
    originalFilename: 'instructions.pdf',
    mimeType: 'application/pdf',
    createdAt: now,
    deletedAt: null,
    ...overrides,
  }
}

// Helper to create mock DB client
function createMockDb(
  mocResult: MocRow | null,
  filesResult: MocFileRow[] = [],
): GetMocDbClient {
  return {
    getMocById: vi.fn().mockResolvedValue(mocResult),
    getMocFiles: vi.fn().mockResolvedValue(filesResult),
  }
}

describe('getMoc', () => {
  describe('Happy Path', () => {
    it('returns MOC with files for owner (isOwner: true)', async () => {
      const mockMoc = createMockMocRow()
      const mockFile = createMockMocFileRow()
      const mockDb = createMockDb(mockMoc, [mockFile])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockMoc.id)
        expect(result.data.title).toBe('Test Castle')
        expect(result.data.isOwner).toBe(true)
        expect(result.data.files).toHaveLength(1)
        expect(result.data.files[0].id).toBe(mockFile.id)
      }
    })

    it('returns published MOC for anonymous (isOwner: false)', async () => {
      const mockMoc = createMockMocRow({ status: 'published' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, null, mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockMoc.id)
        expect(result.data.isOwner).toBe(false)
      }
    })

    it('returns published MOC for non-owner (isOwner: false)', async () => {
      const mockMoc = createMockMocRow({ status: 'published' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'other-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isOwner).toBe(false)
      }
    })

    it('transforms dates to ISO strings correctly', async () => {
      const createdAt = new Date('2026-01-18T12:00:00.000Z')
      const updatedAt = new Date('2026-01-19T08:00:00.000Z')
      const publishedAt = new Date('2026-01-18T14:00:00.000Z')
      const mockMoc = createMockMocRow({ createdAt, updatedAt, publishedAt })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.createdAt).toBe('2026-01-18T12:00:00.000Z')
        expect(result.data.updatedAt).toBe('2026-01-19T08:00:00.000Z')
        expect(result.data.publishedAt).toBe('2026-01-18T14:00:00.000Z')
      }
    })

    it('handles null publishedAt correctly', async () => {
      const mockMoc = createMockMocRow({ publishedAt: null })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.publishedAt).toBe(null)
      }
    })
  })

  describe('Error Cases', () => {
    it('returns NOT_FOUND for non-existent ID', async () => {
      const mockDb = createMockDb(null, [])

      const result = await getMoc(
        mockDb,
        'test-user-id',
        '99999999-9999-9999-9999-999999999999',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('returns NOT_FOUND for invalid UUID format', async () => {
      const mockDb = createMockDb(null, [])

      const result = await getMoc(mockDb, 'test-user-id', 'invalid-uuid')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('returns NOT_FOUND for draft MOC as non-owner', async () => {
      const mockMoc = createMockMocRow({ status: 'draft' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'other-user-id', mockMoc.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
        expect(result.message).toBe('MOC not found')
      }
    })

    it('returns NOT_FOUND for archived MOC as non-owner', async () => {
      const mockMoc = createMockMocRow({ status: 'archived' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'other-user-id', mockMoc.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('returns NOT_FOUND for pending_review MOC as non-owner', async () => {
      const mockMoc = createMockMocRow({ status: 'pending_review' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'other-user-id', mockMoc.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('returns NOT_FOUND for draft MOC as anonymous', async () => {
      const mockMoc = createMockMocRow({ status: 'draft' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, null, mockMoc.id)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('returns DB_ERROR when database throws', async () => {
      const mockDb: GetMocDbClient = {
        getMocById: vi.fn().mockRejectedValue(new Error('Connection failed')),
        getMocFiles: vi.fn().mockResolvedValue([]),
      }

      const result = await getMoc(
        mockDb,
        'test-user-id',
        '11111111-1111-1111-1111-111111111111',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Connection failed')
      }
    })
  })

  describe('Edge Cases', () => {
    it('returns MOC with empty files array', async () => {
      const mockMoc = createMockMocRow()
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(0)
      }
    })

    it('handles null description/tags/theme correctly', async () => {
      const mockMoc = createMockMocRow({
        description: null,
        tags: null,
        theme: null,
      })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.description).toBe(null)
        expect(result.data.tags).toBe(null)
        expect(result.data.theme).toBe(null)
      }
    })

    it('owner can access draft MOC', async () => {
      const mockMoc = createMockMocRow({ status: 'draft' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('draft')
        expect(result.data.isOwner).toBe(true)
      }
    })

    it('owner can access archived MOC', async () => {
      const mockMoc = createMockMocRow({ status: 'archived' })
      const mockDb = createMockDb(mockMoc, [])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe('archived')
        expect(result.data.isOwner).toBe(true)
      }
    })

    it('handles file with null originalFilename', async () => {
      const mockMoc = createMockMocRow()
      const mockFile = createMockMocFileRow({ originalFilename: null })
      const mockDb = createMockDb(mockMoc, [mockFile])

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files[0].filename).toBe('file')
      }
    })

    it('returns multiple files correctly', async () => {
      const mockMoc = createMockMocRow()
      const mockFiles = [
        createMockMocFileRow({ id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', fileType: 'instruction' }),
        createMockMocFileRow({ id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', fileType: 'thumbnail' }),
        createMockMocFileRow({ id: 'dddddddd-dddd-dddd-dddd-dddddddddddd', fileType: 'parts-list' }),
      ]
      const mockDb = createMockDb(mockMoc, mockFiles)

      const result = await getMoc(mockDb, 'test-user-id', mockMoc.id)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.files).toHaveLength(3)
        expect(result.data.files.map(f => f.category)).toEqual([
          'instruction',
          'thumbnail',
          'parts-list',
        ])
      }
    })
  })
})

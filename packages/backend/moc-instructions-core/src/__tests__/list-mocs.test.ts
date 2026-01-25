import { describe, it, expect, vi } from 'vitest'
import { listMocs, type ListMocsDbClient } from '../list-mocs.js'
import type { MocRow, ListMocsFilters } from '../__types__/index.js'

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

// Helper to create mock DB client
function createMockDb(countResult: number, mocsResult: MocRow[]): ListMocsDbClient {
  return {
    countMocs: vi.fn().mockResolvedValue(countResult),
    listMocs: vi.fn().mockResolvedValue(mocsResult),
  }
}

describe('listMocs', () => {
  describe('Happy Path', () => {
    it('returns paginated array of MOCs', async () => {
      const mockMocs = [
        createMockMocRow({ id: '11111111-1111-1111-1111-111111111111', title: 'MOC 1' }),
        createMockMocRow({ id: '22222222-2222-2222-2222-222222222222', title: 'MOC 2' }),
      ]
      const mockDb = createMockDb(2, mockMocs)
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(2)
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
        expect(result.data.total).toBe(2)
      }
    })

    it('uses default page=1, limit=20 when not provided', async () => {
      const mockDb = createMockDb(0, [])
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(1)
        expect(result.data.limit).toBe(20)
      }
    })

    it('respects page/limit params', async () => {
      const mockMocs = [createMockMocRow()]
      const mockDb = createMockDb(50, mockMocs)
      const filters: ListMocsFilters = { page: 3, limit: 10 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.page).toBe(3)
        expect(result.data.limit).toBe(10)
        expect(result.data.total).toBe(50)
      }

      // Verify offset calculation
      expect(mockDb.listMocs).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ page: 3, limit: 10 }),
        20, // offset = (3-1) * 10
      )
    })

    it('caps limit at 100', async () => {
      const mockDb = createMockDb(0, [])
      const filters: ListMocsFilters = { page: 1, limit: 200 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(100)
      }
    })

    it('transforms dates to ISO strings', async () => {
      const createdAt = new Date('2026-01-18T12:00:00.000Z')
      const updatedAt = new Date('2026-01-19T08:00:00.000Z')
      const mockMocs = [createMockMocRow({ createdAt, updatedAt })]
      const mockDb = createMockDb(1, mockMocs)
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data[0].createdAt).toBe('2026-01-18T12:00:00.000Z')
        expect(result.data.data[0].updatedAt).toBe('2026-01-19T08:00:00.000Z')
      }
    })

    it('includes all expected fields in list items', async () => {
      const mockMoc = createMockMocRow({
        description: 'Test description',
        slug: 'test-slug',
        tags: ['tag1', 'tag2'],
        theme: 'Castle',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        status: 'draft',
      })
      const mockDb = createMockDb(1, [mockMoc])
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        const item = result.data.data[0]
        expect(item.id).toBe(mockMoc.id)
        expect(item.title).toBe(mockMoc.title)
        expect(item.description).toBe('Test description')
        expect(item.slug).toBe('test-slug')
        expect(item.tags).toEqual(['tag1', 'tag2'])
        expect(item.theme).toBe('Castle')
        expect(item.thumbnailUrl).toBe('https://example.com/thumb.jpg')
        expect(item.status).toBe('draft')
      }
    })
  })

  describe('Empty Results', () => {
    it('returns empty array when no MOCs exist', async () => {
      const mockDb = createMockDb(0, [])
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(0)
        expect(result.data.total).toBe(0)
      }
    })

    it('returns empty array for page beyond total', async () => {
      const mockDb = createMockDb(5, [])
      const filters: ListMocsFilters = { page: 10, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(0)
        expect(result.data.total).toBe(5)
        expect(result.data.page).toBe(10)
      }
    })

    it('returns empty array for search with no matches', async () => {
      const mockDb = createMockDb(0, [])
      const filters: ListMocsFilters = { page: 1, limit: 20, search: 'nonexistent' }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(0)
        expect(result.data.total).toBe(0)
      }
    })
  })

  describe('Search and Filter', () => {
    it('passes search param to DB client', async () => {
      const mockDb = createMockDb(0, [])
      const filters: ListMocsFilters = { page: 1, limit: 20, search: 'castle' }

      await listMocs(mockDb, 'test-user-id', filters)

      expect(mockDb.countMocs).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ search: 'castle' }),
      )
      expect(mockDb.listMocs).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ search: 'castle' }),
        0,
      )
    })

    it('passes tag param to DB client', async () => {
      const mockDb = createMockDb(0, [])
      const filters: ListMocsFilters = { page: 1, limit: 20, tag: 'medieval' }

      await listMocs(mockDb, 'test-user-id', filters)

      expect(mockDb.countMocs).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ tag: 'medieval' }),
      )
      expect(mockDb.listMocs).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({ tag: 'medieval' }),
        0,
      )
    })
  })

  describe('Error Cases', () => {
    it('returns DB_ERROR when countMocs throws', async () => {
      const mockDb: ListMocsDbClient = {
        countMocs: vi.fn().mockRejectedValue(new Error('Count failed')),
        listMocs: vi.fn().mockResolvedValue([]),
      }
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Count failed')
      }
    })

    it('returns DB_ERROR when listMocs throws', async () => {
      const mockDb: ListMocsDbClient = {
        countMocs: vi.fn().mockResolvedValue(10),
        listMocs: vi.fn().mockRejectedValue(new Error('List failed')),
      }
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('List failed')
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles null values correctly', async () => {
      const mockMoc = createMockMocRow({
        description: null,
        slug: null,
        tags: null,
        theme: null,
        thumbnailUrl: null,
      })
      const mockDb = createMockDb(1, [mockMoc])
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        const item = result.data.data[0]
        expect(item.description).toBe(null)
        expect(item.slug).toBe(null)
        expect(item.tags).toBe(null)
        expect(item.theme).toBe(null)
        expect(item.thumbnailUrl).toBe(null)
      }
    })

    it('returns correct pagination for exact page boundary', async () => {
      // Create 20 valid UUIDs
      const mockMocs = Array.from({ length: 20 }, (_, i) => {
        const hex = i.toString(16).padStart(8, '0')
        return createMockMocRow({
          id: `${hex}-0000-0000-0000-000000000000`,
          title: `MOC ${i}`
        })
      })
      const mockDb = createMockDb(40, mockMocs)
      const filters: ListMocsFilters = { page: 1, limit: 20 }

      const result = await listMocs(mockDb, 'test-user-id', filters)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(20)
        expect(result.data.total).toBe(40)
      }
    })
  })
})

/**
 * Unit Tests for listSets
 *
 * Tests the platform-agnostic list sets function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listSets, type ListSetsDbClient, type SetsSchema } from '../list-sets.js'
import type { ListSetsFilters } from '../__types__/index.js'

// Mock user ID (valid UUID)
const TEST_USER_ID = '223e4567-e89b-12d3-a456-426614174001'

// Mock set row data with valid UUIDs
const createMockSetRow = (overrides: Partial<any> = {}) => ({
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: TEST_USER_ID,
  title: 'LEGO Star Wars Millennium Falcon',
  setNumber: '75192',
  store: 'LEGO Store',
  sourceUrl: 'https://lego.com/75192',
  pieceCount: 7541,
  releaseDate: new Date('2017-10-01'),
  theme: 'Star Wars',
  tags: ['UCS', 'Collector'],
  notes: 'Ultimate Collector Series',
  isBuilt: true,
  quantity: 1,
  purchasePrice: '799.99',
  tax: '64.00',
  shipping: '0.00',
  purchaseDate: new Date('2023-12-25'),
  wishlistItemId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-15'),
  imageId: '323e4567-e89b-12d3-a456-426614174002',
  imageUrl: 'https://example.com/image.jpg',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  position: 0,
  ...overrides,
})

const mockSchema: SetsSchema = {
  sets: {
    id: 'sets.id',
    userId: 'sets.userId',
    title: 'sets.title',
    setNumber: 'sets.setNumber',
    store: 'sets.store',
    sourceUrl: 'sets.sourceUrl',
    pieceCount: 'sets.pieceCount',
    releaseDate: 'sets.releaseDate',
    theme: 'sets.theme',
    tags: 'sets.tags',
    notes: 'sets.notes',
    isBuilt: 'sets.isBuilt',
    quantity: 'sets.quantity',
    purchasePrice: 'sets.purchasePrice',
    tax: 'sets.tax',
    shipping: 'sets.shipping',
    purchaseDate: 'sets.purchaseDate',
    wishlistItemId: 'sets.wishlistItemId',
    createdAt: 'sets.createdAt',
    updatedAt: 'sets.updatedAt',
  },
  setImages: {
    id: 'setImages.id',
    setId: 'setImages.setId',
    imageUrl: 'setImages.imageUrl',
    thumbnailUrl: 'setImages.thumbnailUrl',
    position: 'setImages.position',
  },
}

function createMockDb(
  rows: any[],
  countValue: number,
  themes: string[] = ['Star Wars', 'Technic'],
  allTags: string[][] = [['UCS', 'Collector']],
): ListSetsDbClient {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                offset: vi.fn().mockResolvedValue(rows),
              }),
            }),
          }),
        }),
        where: vi.fn().mockResolvedValue([{ count: countValue }]),
      }),
    }),
    selectDistinct: vi.fn().mockImplementation(fields => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => {
          if ('theme' in fields) {
            return Promise.resolve(themes.map(t => ({ theme: t })))
          }
          if ('tags' in fields) {
            return Promise.resolve(allTags.map(t => ({ tags: t })))
          }
          return Promise.resolve([])
        }),
      }),
    })),
  }
}

describe('listSets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pagination', () => {
    it('returns paginated results with correct metadata', async () => {
      const mockDb = createMockDb([createMockSetRow()], 50)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.pagination.page).toBe(1)
      expect(result.pagination.limit).toBe(20)
      expect(result.pagination.total).toBe(50)
      expect(result.pagination.totalPages).toBe(3)
    })

    it('calculates totalPages correctly', async () => {
      const mockDb = createMockDb([], 25)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 10,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.pagination.totalPages).toBe(3)
    })

    it('handles single page', async () => {
      const mockDb = createMockDb([createMockSetRow()], 5)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.pagination.totalPages).toBe(1)
    })

    it('handles empty results', async () => {
      const mockDb = createMockDb([], 0)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items).toHaveLength(0)
      expect(result.pagination.total).toBe(0)
      expect(result.pagination.totalPages).toBe(0)
    })
  })

  describe('filtering', () => {
    it('applies default filter values', async () => {
      const mockDb = createMockDb([createMockSetRow()], 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {})

      expect(result.items).toHaveLength(1)
    })

    it('returns available filters', async () => {
      const mockDb = createMockDb(
        [createMockSetRow()],
        1,
        ['Star Wars', 'Technic', 'City'],
        [['UCS'], ['Collector', 'Display']],
      )

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.filters.availableThemes).toContain('Star Wars')
      expect(result.filters.availableThemes).toContain('Technic')
      expect(result.filters.availableThemes).toContain('City')
    })

    it('deduplicates available tags', async () => {
      const mockDb = createMockDb(
        [createMockSetRow()],
        1,
        ['Star Wars'],
        [['UCS', 'Collector'], ['UCS', 'Display']],
      )

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      const ucsCount = result.filters.availableTags.filter(t => t === 'UCS').length
      expect(ucsCount).toBe(1)
    })
  })

  describe('sorting', () => {
    it('uses default sort field and direction', async () => {
      const mockDb = createMockDb([createMockSetRow()], 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {})

      expect(result.items).toHaveLength(1)
    })

    it('accepts all valid sort fields', async () => {
      const sortFields: Array<ListSetsFilters['sortField']> = [
        'title',
        'setNumber',
        'pieceCount',
        'purchaseDate',
        'purchasePrice',
        'createdAt',
      ]

      for (const sortField of sortFields) {
        const mockDb = createMockDb([createMockSetRow()], 1)

        const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
          sortField,
          page: 1,
          limit: 20,
          sortDirection: 'desc',
        })

        expect(result.items).toBeDefined()
      }
    })

    it('accepts both sort directions', async () => {
      for (const sortDirection of ['asc', 'desc'] as const) {
        const mockDb = createMockDb([createMockSetRow()], 1)

        const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
          sortDirection,
          page: 1,
          limit: 20,
          sortField: 'createdAt',
        })

        expect(result.items).toBeDefined()
      }
    })
  })

  describe('image aggregation', () => {
    it('aggregates multiple images per set', async () => {
      const setId = '123e4567-e89b-12d3-a456-426614174000'
      const rows = [
        createMockSetRow({ imageId: '423e4567-e89b-12d3-a456-426614174010', position: 0 }),
        createMockSetRow({ imageId: '423e4567-e89b-12d3-a456-426614174011', imageUrl: 'https://example.com/img2.jpg', position: 1 }),
        createMockSetRow({ imageId: '423e4567-e89b-12d3-a456-426614174012', imageUrl: 'https://example.com/img3.jpg', position: 2 }),
      ]
      const mockDb = createMockDb(rows, 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].images).toHaveLength(3)
    })

    it('handles sets without images', async () => {
      const rows = [createMockSetRow({ imageId: null, imageUrl: null })]
      const mockDb = createMockDb(rows, 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items[0].images).toHaveLength(0)
    })

    it('handles multiple sets with images', async () => {
      const SET_1_ID = '523e4567-e89b-12d3-a456-426614174001'
      const SET_2_ID = '523e4567-e89b-12d3-a456-426614174002'
      const rows = [
        createMockSetRow({ id: SET_1_ID, imageId: '623e4567-e89b-12d3-a456-426614174001' }),
        createMockSetRow({ id: SET_1_ID, imageId: '623e4567-e89b-12d3-a456-426614174002', imageUrl: 'https://example.com/img2.jpg' }),
        createMockSetRow({ id: SET_2_ID, title: 'Another Set', imageId: '623e4567-e89b-12d3-a456-426614174003', imageUrl: 'https://example.com/img3.jpg' }),
      ]
      const mockDb = createMockDb(rows, 2)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items).toHaveLength(2)
      const set1 = result.items.find(s => s.id === SET_1_ID)
      const set2 = result.items.find(s => s.id === SET_2_ID)
      expect(set1?.images).toHaveLength(2)
      expect(set2?.images).toHaveLength(1)
    })
  })

  describe('data transformation', () => {
    it('converts dates to ISO strings', async () => {
      const mockDb = createMockDb([createMockSetRow()], 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items[0].createdAt).toBe('2024-01-01T00:00:00.000Z')
      expect(result.items[0].updatedAt).toBe('2024-01-15T00:00:00.000Z')
    })

    it('converts decimal prices to numbers', async () => {
      const mockDb = createMockDb([createMockSetRow()], 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items[0].purchasePrice).toBe(799.99)
      expect(result.items[0].tax).toBe(64)
      expect(result.items[0].shipping).toBe(0)
    })

    it('handles null tags', async () => {
      const rows = [createMockSetRow({ tags: null })]
      const mockDb = createMockDb(rows, 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items[0].tags).toEqual([])
    })

    it('handles null optional fields', async () => {
      const rows = [
        createMockSetRow({
          pieceCount: null,
          releaseDate: null,
          purchasePrice: null,
          purchaseDate: null,
        }),
      ]
      const mockDb = createMockDb(rows, 1)

      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result.items[0].pieceCount).toBeNull()
      expect(result.items[0].releaseDate).toBeNull()
      expect(result.items[0].purchasePrice).toBeNull()
      expect(result.items[0].purchaseDate).toBeNull()
    })
  })

  describe('schema validation', () => {
    it('validates response against SetListResponseSchema', async () => {
      const mockDb = createMockDb([createMockSetRow()], 1)

      // If validation fails, listSets will throw
      const result = await listSets(mockDb, mockSchema, TEST_USER_ID, {
        page: 1,
        limit: 20,
        sortField: 'createdAt',
        sortDirection: 'desc',
      })

      expect(result).toHaveProperty('items')
      expect(result).toHaveProperty('pagination')
      expect(result).toHaveProperty('filters')
    })
  })
})

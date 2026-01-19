/**
 * Unit Tests for getSetById
 *
 * Tests the platform-agnostic get set by ID function.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSetById, type GetSetDbClient, type SetsSchema } from '../get-set.js'

// Mock set row data with valid UUIDs
const mockSetRow = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: '223e4567-e89b-12d3-a456-426614174001',
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
}

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

function createMockDb(rows: any[]): GetSetDbClient {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    }),
  }
}

describe('getSetById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('successful retrieval', () => {
    it('returns set with images when user owns the set', async () => {
      const mockDb = createMockDb([mockSetRow])

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('123e4567-e89b-12d3-a456-426614174000')
        expect(result.data.title).toBe('LEGO Star Wars Millennium Falcon')
        expect(result.data.images).toHaveLength(1)
        expect(result.data.images[0].id).toBe('323e4567-e89b-12d3-a456-426614174002')
      }
    })

    it('aggregates multiple images correctly', async () => {
      const rowWithMultipleImages = [
        { ...mockSetRow, imageId: '323e4567-e89b-12d3-a456-426614174002', position: 0 },
        { ...mockSetRow, imageId: '423e4567-e89b-12d3-a456-426614174003', imageUrl: 'https://example.com/img2.jpg', position: 1 },
        { ...mockSetRow, imageId: '523e4567-e89b-12d3-a456-426614174004', imageUrl: 'https://example.com/img3.jpg', position: 2 },
      ]
      const mockDb = createMockDb(rowWithMultipleImages)

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.images).toHaveLength(3)
        expect(result.data.images[0].position).toBe(0)
        expect(result.data.images[1].position).toBe(1)
        expect(result.data.images[2].position).toBe(2)
      }
    })

    it('handles set with no images', async () => {
      const rowWithNoImages = [{ ...mockSetRow, imageId: null, imageUrl: null }]
      const mockDb = createMockDb(rowWithNoImages)

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.images).toHaveLength(0)
      }
    })

    it('converts decimal prices to numbers', async () => {
      const mockDb = createMockDb([mockSetRow])

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.purchasePrice).toBe(799.99)
        expect(result.data.tax).toBe(64)
        expect(result.data.shipping).toBe(0)
      }
    })

    it('handles null optional fields', async () => {
      const rowWithNulls = {
        ...mockSetRow,
        setNumber: null,
        store: null,
        sourceUrl: null,
        pieceCount: null,
        releaseDate: null,
        theme: null,
        notes: null,
        purchasePrice: null,
        tax: null,
        shipping: null,
        purchaseDate: null,
        wishlistItemId: null,
      }
      const mockDb = createMockDb([rowWithNulls])

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.setNumber).toBeNull()
        expect(result.data.purchasePrice).toBeNull()
        expect(result.data.releaseDate).toBeNull()
      }
    })
  })

  describe('error handling', () => {
    it('returns NOT_FOUND when set does not exist', async () => {
      const mockDb = createMockDb([])

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '00000000-0000-0000-0000-000000000000',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('NOT_FOUND')
      }
    })

    it('returns FORBIDDEN when user does not own the set', async () => {
      const mockDb = createMockDb([mockSetRow])

      const result = await getSetById(
        mockDb,
        mockSchema,
        'different-user',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('date formatting', () => {
    it('converts dates to ISO strings', async () => {
      const mockDb = createMockDb([mockSetRow])

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.createdAt).toBe('2024-01-01T00:00:00.000Z')
        expect(result.data.updatedAt).toBe('2024-01-15T00:00:00.000Z')
        expect(result.data.releaseDate).toBe('2017-10-01T00:00:00.000Z')
        expect(result.data.purchaseDate).toBe('2023-12-25T00:00:00.000Z')
      }
    })
  })

  describe('tags handling', () => {
    it('returns empty array for null tags', async () => {
      const rowWithNullTags = { ...mockSetRow, tags: null }
      const mockDb = createMockDb([rowWithNullTags])

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual([])
      }
    })

    it('preserves tags array', async () => {
      const mockDb = createMockDb([mockSetRow])

      const result = await getSetById(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        '123e4567-e89b-12d3-a456-426614174000',
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual(['UCS', 'Collector'])
      }
    })
  })
})

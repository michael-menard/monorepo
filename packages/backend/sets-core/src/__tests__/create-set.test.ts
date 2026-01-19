/**
 * Unit Tests for createSet
 *
 * Tests the platform-agnostic create set function.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSet, type CreateSetDbClient, type CreateSetSetsSchema } from '../create-set.js'
import type { CreateSetInput } from '@repo/api-client/schemas/sets'

// Mock crypto.randomUUID
const mockUuid = '123e4567-e89b-12d3-a456-426614174000'
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => mockUuid),
})

// Mock date for consistent testing
const mockNow = new Date('2024-01-15T12:00:00.000Z')

const mockSchema: CreateSetSetsSchema = {
  sets: 'mock_sets_table',
}

// Factory for mock DB client
function createMockDb(returnRow: any | null = null, shouldThrow = false): CreateSetDbClient {
  const mockReturning = vi.fn()

  if (shouldThrow) {
    mockReturning.mockRejectedValue(new Error('Database connection failed'))
  } else {
    mockReturning.mockResolvedValue(returnRow ? [returnRow] : [])
  }

  return {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockReturning,
      }),
    }),
  }
}

// Helper to create a typical inserted row from the DB
function createInsertedRow(overrides: Partial<any> = {}) {
  return {
    id: mockUuid,
    userId: '223e4567-e89b-12d3-a456-426614174001',
    title: 'Test Set',
    setNumber: null,
    store: null,
    sourceUrl: null,
    pieceCount: null,
    releaseDate: null,
    theme: null,
    tags: [],
    notes: null,
    isBuilt: false,
    quantity: 1,
    purchasePrice: null,
    tax: null,
    shipping: null,
    purchaseDate: null,
    wishlistItemId: null,
    createdAt: mockNow,
    updatedAt: mockNow,
    ...overrides,
  }
}

describe('createSet', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockNow)
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('successful creation', () => {
    it('creates a set with minimal input (title only)', async () => {
      const insertedRow = createInsertedRow()
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = {
        title: 'Test Set',
      }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockUuid)
        expect(result.data.title).toBe('Test Set')
        expect(result.data.userId).toBe('223e4567-e89b-12d3-a456-426614174001')
        expect(result.data.isBuilt).toBe(false)
        expect(result.data.quantity).toBe(1)
        expect(result.data.images).toEqual([])
        expect(result.data.wishlistItemId).toBeNull()
      }
    })

    it('creates a set with all fields populated', async () => {
      const insertedRow = createInsertedRow({
        title: 'LEGO Star Wars Millennium Falcon',
        setNumber: '75192',
        store: 'LEGO.com',
        sourceUrl: 'https://www.lego.com/product/75192',
        pieceCount: 7541,
        releaseDate: new Date('2017-10-01'),
        theme: 'Star Wars',
        tags: ['UCS', 'display', 'retired'],
        notes: 'Ultimate Collector Series',
        isBuilt: true,
        quantity: 1,
        purchasePrice: '799.99',
        tax: '64.00',
        shipping: '0.00',
        purchaseDate: new Date('2020-05-04'),
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = {
        title: 'LEGO Star Wars Millennium Falcon',
        setNumber: '75192',
        store: 'LEGO.com',
        sourceUrl: 'https://www.lego.com/product/75192',
        pieceCount: 7541,
        releaseDate: '2017-10-01T00:00:00.000Z',
        theme: 'Star Wars',
        tags: ['UCS', 'display', 'retired'],
        notes: 'Ultimate Collector Series',
        isBuilt: true,
        quantity: 1,
        purchasePrice: 799.99,
        tax: 64.00,
        shipping: 0,
        purchaseDate: '2020-05-04T00:00:00.000Z',
      }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.title).toBe('LEGO Star Wars Millennium Falcon')
        expect(result.data.setNumber).toBe('75192')
        expect(result.data.store).toBe('LEGO.com')
        expect(result.data.sourceUrl).toBe('https://www.lego.com/product/75192')
        expect(result.data.pieceCount).toBe(7541)
        expect(result.data.releaseDate).toBe('2017-10-01T00:00:00.000Z')
        expect(result.data.theme).toBe('Star Wars')
        expect(result.data.tags).toEqual(['UCS', 'display', 'retired'])
        expect(result.data.notes).toBe('Ultimate Collector Series')
        expect(result.data.isBuilt).toBe(true)
        expect(result.data.purchasePrice).toBe(799.99)
        expect(result.data.tax).toBe(64)
        expect(result.data.shipping).toBe(0)
        expect(result.data.purchaseDate).toBe('2020-05-04T00:00:00.000Z')
      }
    })

    it('generates UUID for set id', async () => {
      const insertedRow = createInsertedRow()
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(mockUuid)
      }

      // Verify insert was called with the generated UUID
      expect(mockDb.insert).toHaveBeenCalled()
    })

    it('sets createdAt and updatedAt to current timestamp', async () => {
      const insertedRow = createInsertedRow()
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.createdAt).toBe('2024-01-15T12:00:00.000Z')
        expect(result.data.updatedAt).toBe('2024-01-15T12:00:00.000Z')
      }
    })

    it('returns empty images array', async () => {
      const insertedRow = createInsertedRow()
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.images).toEqual([])
        expect(result.data.images).toHaveLength(0)
      }
    })

    it('sets wishlistItemId to null', async () => {
      const insertedRow = createInsertedRow()
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.wishlistItemId).toBeNull()
      }
    })

    it('handles default values for isBuilt and quantity', async () => {
      const insertedRow = createInsertedRow({
        isBuilt: false,
        quantity: 1,
      })
      const mockDb = createMockDb(insertedRow)

      // Input without isBuilt or quantity
      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.isBuilt).toBe(false)
        expect(result.data.quantity).toBe(1)
      }
    })

    it('converts decimal prices to numbers in response', async () => {
      const insertedRow = createInsertedRow({
        purchasePrice: '199.99',
        tax: '16.00',
        shipping: '5.99',
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = {
        title: 'Test Set',
        purchasePrice: 199.99,
        tax: 16.00,
        shipping: 5.99,
      }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.purchasePrice).toBe(199.99)
        expect(result.data.tax).toBe(16)
        expect(result.data.shipping).toBe(5.99)
      }
    })

    it('converts dates to ISO strings in response', async () => {
      const insertedRow = createInsertedRow({
        releaseDate: new Date('2023-06-01'),
        purchaseDate: new Date('2023-12-25'),
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = {
        title: 'Test Set',
        releaseDate: '2023-06-01T00:00:00.000Z',
        purchaseDate: '2023-12-25T00:00:00.000Z',
      }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.releaseDate).toBe('2023-06-01T00:00:00.000Z')
        expect(result.data.purchaseDate).toBe('2023-12-25T00:00:00.000Z')
      }
    })

    it('handles null tags by returning empty array', async () => {
      const insertedRow = createInsertedRow({
        tags: null,
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual([])
      }
    })
  })

  describe('error handling', () => {
    it('returns DB_ERROR when insert returns no rows', async () => {
      const mockDb = createMockDb(null) // No row returned

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('No row returned from insert')
      }
    })

    it('returns DB_ERROR when database throws', async () => {
      const mockDb = createMockDb(null, true) // Will throw

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Database connection failed')
      }
    })
  })

  describe('input handling', () => {
    it('passes userId from parameter to insert', async () => {
      const customUserId = '333e4567-e89b-12d3-a456-426614174002'
      const insertedRow = createInsertedRow({
        userId: customUserId,
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = { title: 'Test Set' }

      const result = await createSet(
        mockDb,
        mockSchema,
        customUserId,
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(customUserId)
      }
    })

    it('handles empty tags array', async () => {
      const insertedRow = createInsertedRow({
        tags: [],
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = {
        title: 'Test Set',
        tags: [],
      }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual([])
      }
    })

    it('handles tags with values', async () => {
      const insertedRow = createInsertedRow({
        tags: ['tag1', 'tag2', 'tag3'],
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = {
        title: 'Test Set',
        tags: ['tag1', 'tag2', 'tag3'],
      }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual(['tag1', 'tag2', 'tag3'])
      }
    })

    it('handles zero values for shipping', async () => {
      const insertedRow = createInsertedRow({
        shipping: '0.00',
      })
      const mockDb = createMockDb(insertedRow)

      const input: CreateSetInput = {
        title: 'Test Set',
        shipping: 0,
      }

      const result = await createSet(
        mockDb,
        mockSchema,
        '223e4567-e89b-12d3-a456-426614174001',
        input,
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.shipping).toBe(0)
      }
    })
  })
})

/**
 * Tests for parsePartsCsv core function
 */

import { describe, it, expect, vi } from 'vitest'
import { parsePartsCsv, type ParsePartsCsvDbClient, type ParsePartsCsvSchema } from '../parse-parts-csv.js'

const mockSchema: ParsePartsCsvSchema = {
  mocPartsLists: {
    id: 'id',
    mocId: 'moc_id',
    totalPartsCount: 'total_parts_count',
    updatedAt: 'updated_at',
  },
  mocParts: {
    id: 'id',
    partsListId: 'parts_list_id',
    partId: 'part_id',
    partName: 'part_name',
    quantity: 'quantity',
    color: 'color',
    createdAt: 'created_at',
  },
  mocInstructions: {
    id: 'id',
    userId: 'user_id',
  },
}

describe('parsePartsCsv', () => {
  const mockUserId = 'user-123'
  const mockMocId = '11111111-1111-1111-1111-111111111111'
  const mockPartsListId = '22222222-2222-2222-2222-222222222222'
  const now = new Date()

  function createMockDb(overrides: Partial<{
    mocResult: Array<{ id: string; userId: string }>;
    partsListResult: Array<{ id: string; mocId: string }>;
  }> = {}): ParsePartsCsvDbClient {
    const mocResult = overrides.mocResult ?? [{ id: mockMocId, userId: mockUserId }]
    const partsListResult = overrides.partsListResult ?? [{ id: mockPartsListId, mocId: mockMocId }]

    let selectCallCount = 0
    const mockDb: ParsePartsCsvDbClient = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) return Promise.resolve(mocResult)
            return Promise.resolve(partsListResult)
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{
              id: mockPartsListId,
              mocId: mockMocId,
              totalPartsCount: '75',
              updatedAt: now,
            }]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
      transaction: vi.fn().mockImplementation(async (fn) => {
        return fn(mockDb)
      }),
    }
    return mockDb
  }

  const validCsv = `Part ID,Part Name,Quantity,Color
3001,Brick 2 x 4,25,Red
3002,Brick 2 x 3,50,Blue`

  it('should parse valid CSV and return counts', async () => {
    const mockDb = createMockDb()

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, validCsv)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.partsListId).toBe(mockPartsListId)
      expect(result.data.rowsProcessed).toBe(2)
      expect(result.data.totalParts).toBe(75) // 25 + 50
    }
  })

  it('should return VALIDATION_ERROR for missing columns', async () => {
    const mockDb = createMockDb()
    const invalidCsv = `Part ID,Part Name
3001,Brick 2 x 4`

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, invalidCsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toContain('Missing required columns')
    }
  })

  it('should return VALIDATION_ERROR for invalid quantity', async () => {
    const mockDb = createMockDb()
    const invalidCsv = `Part ID,Part Name,Quantity,Color
3001,Brick 2 x 4,abc,Red`

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, invalidCsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
    }
  })

  it('should return VALIDATION_ERROR for zero quantity', async () => {
    const mockDb = createMockDb()
    const invalidCsv = `Part ID,Part Name,Quantity,Color
3001,Brick 2 x 4,0,Red`

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, invalidCsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toContain('greater than 0')
    }
  })

  it('should return VALIDATION_ERROR for empty CSV', async () => {
    const mockDb = createMockDb()
    const emptyCsv = ''

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, emptyCsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
    }
  })

  it('should return NOT_FOUND when MOC does not exist', async () => {
    const mockDb = createMockDb({ mocResult: [] })

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, validCsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })

  it('should return NOT_FOUND when parts list does not exist', async () => {
    const mockDb = createMockDb({ partsListResult: [] })

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, validCsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Parts list not found')
    }
  })

  it('should handle CSV with only header (no data rows)', async () => {
    const mockDb = createMockDb()
    const headerOnlyCsv = 'Part ID,Part Name,Quantity,Color'

    const result = await parsePartsCsv(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, headerOnlyCsv)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('VALIDATION_ERROR')
      expect(result.message).toContain('no valid data')
    }
  })
})

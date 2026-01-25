/**
 * Tests for getPartsLists core function
 */

import { describe, it, expect, vi } from 'vitest'
import { getPartsLists, type GetPartsListsDbClient, type GetPartsListsSchema } from '../get-parts-lists.js'

const mockSchema: GetPartsListsSchema = {
  mocPartsLists: {
    id: 'id',
    mocId: 'moc_id',
    title: 'title',
    description: 'description',
    built: 'built',
    purchased: 'purchased',
    notes: 'notes',
    costEstimate: 'cost_estimate',
    actualCost: 'actual_cost',
    totalPartsCount: 'total_parts_count',
    acquiredPartsCount: 'acquired_parts_count',
    createdAt: 'created_at',
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

describe('getPartsLists', () => {
  const mockUserId = 'user-123'
  const mockMocId = '11111111-1111-1111-1111-111111111111'
  const mockPartsListId = '22222222-2222-2222-2222-222222222222'
  const now = new Date()

  function createMockDb(overrides: Partial<{
    mocResult: Array<{ id: string; userId: string }>;
    partsListsResult: Array<Record<string, unknown>>;
    partsResult: Array<Record<string, unknown>>;
  }> = {}): GetPartsListsDbClient {
    const mocResult = overrides.mocResult ?? [{ id: mockMocId, userId: mockUserId }]
    const partsListsResult = overrides.partsListsResult ?? [{
      id: mockPartsListId,
      mocId: mockMocId,
      title: 'Test Parts List',
      description: 'Test description',
      built: false,
      purchased: false,
      notes: null,
      costEstimate: null,
      actualCost: null,
      totalPartsCount: '50',
      acquiredPartsCount: '0',
      createdAt: now,
      updatedAt: now,
    }]
    const partsResult = overrides.partsResult ?? [{
      id: '33333333-3333-3333-3333-333333333333',
      partsListId: mockPartsListId,
      partId: '3001',
      partName: 'Brick 2x4',
      quantity: 50,
      color: 'Red',
      createdAt: now,
    }]

    let callCount = 0
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) return Promise.resolve(mocResult)
            if (callCount === 2) return Promise.resolve(partsListsResult)
            return Promise.resolve(partsResult)
          }),
          orderBy: vi.fn().mockResolvedValue(partsListsResult),
        }),
      }),
    }
  }

  it('should return parts lists with nested parts', async () => {
    const mockDb = createMockDb()

    const result = await getPartsLists(mockDb, mockSchema, mockUserId, mockMocId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(1)
      expect(result.data[0].title).toBe('Test Parts List')
      expect(result.data[0].parts.length).toBe(1)
      expect(result.data[0].parts[0].partId).toBe('3001')
    }
  })

  it('should return empty array when MOC has no parts lists', async () => {
    const mockDb = createMockDb({
      partsListsResult: [],
      partsResult: [],
    })

    const result = await getPartsLists(mockDb, mockSchema, mockUserId, mockMocId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(0)
    }
  })

  it('should return NOT_FOUND when MOC does not exist', async () => {
    const mockDb = createMockDb({ mocResult: [] })

    const result = await getPartsLists(mockDb, mockSchema, mockUserId, mockMocId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })

  it('should return NOT_FOUND when MOC belongs to different user', async () => {
    const mockDb = createMockDb({
      mocResult: [{ id: mockMocId, userId: 'different-user' }],
    })

    const result = await getPartsLists(mockDb, mockSchema, mockUserId, mockMocId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })

  it('should handle parts list with empty parts array', async () => {
    const mockDb = createMockDb({
      partsResult: [],
    })

    const result = await getPartsLists(mockDb, mockSchema, mockUserId, mockMocId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.length).toBe(1)
      expect(result.data[0].parts.length).toBe(0)
    }
  })
})

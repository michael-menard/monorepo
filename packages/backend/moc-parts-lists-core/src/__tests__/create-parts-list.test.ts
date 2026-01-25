/**
 * Tests for createPartsList core function
 */

import { describe, it, expect, vi } from 'vitest'
import { createPartsList, type CreatePartsListDbClient, type CreatePartsListSchema } from '../create-parts-list.js'
import type { CreatePartsListInput } from '../__types__/index.js'

// Mock schema references
const mockSchema: CreatePartsListSchema = {
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

describe('createPartsList', () => {
  const mockUserId = 'user-123'
  const mockMocId = '11111111-1111-1111-1111-111111111111'

  function createMockDb(overrides: Partial<{
    selectResult: Array<{ id: string; userId: string }>;
    insertResult: Record<string, unknown>;
  }> = {}): CreatePartsListDbClient {
    const selectResult = overrides.selectResult ?? [{ id: mockMocId, userId: mockUserId }]
    const now = new Date()
    const insertResult = overrides.insertResult ?? {
      id: '22222222-2222-2222-2222-222222222222',
      mocId: mockMocId,
      title: 'Test Parts List',
      description: null,
      built: false,
      purchased: false,
      notes: null,
      costEstimate: null,
      actualCost: null,
      totalPartsCount: null,
      acquiredPartsCount: '0',
      createdAt: now,
      updatedAt: now,
    }

    return {
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([insertResult]),
        }),
      }),
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(selectResult),
        }),
      }),
    }
  }

  it('should create a parts list with title only', async () => {
    const mockDb = createMockDb()
    const input: CreatePartsListInput = {
      title: 'Test Parts List',
    }

    const result = await createPartsList(mockDb, mockSchema, mockUserId, mockMocId, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Parts List')
      expect(result.data.mocId).toBe(mockMocId)
      expect(result.data.built).toBe(false)
      expect(result.data.purchased).toBe(false)
    }
  })

  it('should create a parts list with initial parts', async () => {
    const now = new Date()
    const mockDb = createMockDb({
      insertResult: {
        id: '22222222-2222-2222-2222-222222222222',
        mocId: mockMocId,
        title: 'Test Parts List',
        description: null,
        built: false,
        purchased: false,
        notes: null,
        costEstimate: null,
        actualCost: null,
        totalPartsCount: '75', // 25 + 50
        acquiredPartsCount: '0',
        createdAt: now,
        updatedAt: now,
      },
    })

    const input: CreatePartsListInput = {
      title: 'Test Parts List',
      parts: [
        { partId: '3001', partName: 'Brick 2x4', quantity: 25, color: 'Red' },
        { partId: '3002', partName: 'Brick 2x3', quantity: 50, color: 'Blue' },
      ],
    }

    const result = await createPartsList(mockDb, mockSchema, mockUserId, mockMocId, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Test Parts List')
      expect(result.data.totalPartsCount).toBe('75')
    }
  })

  it('should return NOT_FOUND when MOC does not exist', async () => {
    const mockDb = createMockDb({ selectResult: [] })
    const input: CreatePartsListInput = {
      title: 'Test Parts List',
    }

    const result = await createPartsList(mockDb, mockSchema, mockUserId, mockMocId, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('MOC not found')
    }
  })

  it('should return NOT_FOUND when MOC belongs to different user', async () => {
    const mockDb = createMockDb({
      selectResult: [{ id: mockMocId, userId: 'different-user' }],
    })
    const input: CreatePartsListInput = {
      title: 'Test Parts List',
    }

    const result = await createPartsList(mockDb, mockSchema, mockUserId, mockMocId, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })

  it('should set built and purchased flags when provided', async () => {
    const now = new Date()
    const mockDb = createMockDb({
      insertResult: {
        id: '22222222-2222-2222-2222-222222222222',
        mocId: mockMocId,
        title: 'Test Parts List',
        description: null,
        built: true,
        purchased: true,
        notes: null,
        costEstimate: null,
        actualCost: null,
        totalPartsCount: null,
        acquiredPartsCount: '0',
        createdAt: now,
        updatedAt: now,
      },
    })

    const input: CreatePartsListInput = {
      title: 'Test Parts List',
      built: true,
      purchased: true,
    }

    const result = await createPartsList(mockDb, mockSchema, mockUserId, mockMocId, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.built).toBe(true)
      expect(result.data.purchased).toBe(true)
    }
  })
})

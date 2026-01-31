import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createPartsListsService } from '../application/services.js'
import type { MocRepository, PartsListRepository, PartRepository } from '../ports/index.js'
import type { PartsList, Part } from '../types.js'

/**
 * Parts Lists Service Unit Tests
 *
 * Tests business logic using mock repositories.
 * No real database calls.
 */

// Mock data
const mockPartsList: PartsList = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  mocId: 'moc-123',
  fileId: null,
  title: 'Test Parts List',
  description: 'A test parts list',
  built: false,
  purchased: false,
  inventoryPercentage: '0.00',
  totalPartsCount: '100',
  acquiredPartsCount: '0',
  costEstimate: null,
  actualCost: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockPart: Part = {
  id: 'part-123',
  partsListId: '123e4567-e89b-12d3-a456-426614174000',
  partId: '3001',
  partName: 'Brick 2 x 4',
  quantity: 10,
  color: 'Red',
  createdAt: new Date(),
}

function createMockMocRepo(): MocRepository {
  return {
    verifyOwnership: vi.fn().mockResolvedValue({ ok: true, data: { id: 'moc-123' } }),
  }
}

function createMockPartsListRepo(): PartsListRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockPartsList }),
    findByIdWithParts: vi.fn().mockResolvedValue({
      ok: true,
      data: { ...mockPartsList, parts: [mockPart] },
    }),
    findByMocId: vi.fn().mockResolvedValue({
      items: [mockPartsList],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasMore: false },
    }),
    findByUserId: vi.fn().mockResolvedValue([mockPartsList]),
    insert: vi.fn().mockResolvedValue(mockPartsList),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockPartsList }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    getSummaryByUserId: vi.fn().mockResolvedValue({
      totalPartsLists: 1,
      byStatus: { planning: 1, in_progress: 0, completed: 0 },
      totalParts: 100,
      totalAcquiredParts: 0,
    }),
  }
}

function createMockPartRepo(): PartRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockPart }),
    findByPartsListId: vi.fn().mockResolvedValue([mockPart]),
    insert: vi.fn().mockResolvedValue(mockPart),
    insertMany: vi.fn().mockResolvedValue([mockPart]),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockPart }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    deleteByPartsListId: vi.fn().mockResolvedValue(undefined),
    countByPartsListId: vi.fn().mockResolvedValue(1),
    sumQuantityByPartsListId: vi.fn().mockResolvedValue(10),
  }
}

describe('PartsListsService', () => {
  let mocRepo: MocRepository
  let partsListRepo: PartsListRepository
  let partRepo: PartRepository
  let service: ReturnType<typeof createPartsListsService>

  beforeEach(() => {
    mocRepo = createMockMocRepo()
    partsListRepo = createMockPartsListRepo()
    partRepo = createMockPartRepo()
    service = createPartsListsService({ mocRepo, partsListRepo, partRepo })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Parts List Operations
  // ─────────────────────────────────────────────────────────────────────

  describe('createPartsList', () => {
    it('creates a parts list when user owns the MOC', async () => {
      const result = await service.createPartsList('user-123', 'moc-123', {
        title: 'New Parts List',
      })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.title).toBe('Test Parts List')
      }
      expect(partsListRepo.insert).toHaveBeenCalledWith('moc-123', { title: 'New Parts List' })
    })

    it('returns MOC_NOT_FOUND when MOC does not exist', async () => {
      vi.mocked(mocRepo.verifyOwnership).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.createPartsList('user-123', 'nonexistent', {
        title: 'New Parts List',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('MOC_NOT_FOUND')
      }
    })
  })

  describe('getPartsList', () => {
    it('returns parts list when user owns the MOC', async () => {
      const result = await service.getPartsList('user-123', 'moc-123', mockPartsList.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe(mockPartsList.id)
      }
    })

    it('returns MOC_NOT_FOUND when MOC does not exist', async () => {
      vi.mocked(mocRepo.verifyOwnership).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.getPartsList('user-123', 'nonexistent', mockPartsList.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('MOC_NOT_FOUND')
      }
    })

    it('returns PARTS_LIST_NOT_FOUND when parts list does not exist', async () => {
      vi.mocked(partsListRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.getPartsList('user-123', 'moc-123', 'nonexistent')

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('PARTS_LIST_NOT_FOUND')
      }
    })

    it('returns FORBIDDEN when parts list belongs to different MOC', async () => {
      vi.mocked(partsListRepo.findById).mockResolvedValue({
        ok: true,
        data: { ...mockPartsList, mocId: 'different-moc' },
      })

      const result = await service.getPartsList('user-123', 'moc-123', mockPartsList.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('getPartsListWithParts', () => {
    it('returns parts list with parts when user owns the MOC', async () => {
      const result = await service.getPartsListWithParts('user-123', 'moc-123', mockPartsList.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.id).toBe(mockPartsList.id)
        expect(result.data.parts).toHaveLength(1)
        expect(result.data.parts[0].partId).toBe('3001')
      }
    })
  })

  describe('listPartsLists', () => {
    it('returns paginated parts lists for a MOC', async () => {
      const result = await service.listPartsLists('user-123', 'moc-123', { page: 1, limit: 20 })

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.items).toHaveLength(1)
        expect(result.data.pagination.total).toBe(1)
      }
    })
  })

  describe('updatePartsList', () => {
    it('updates parts list when user owns the MOC', async () => {
      const result = await service.updatePartsList('user-123', 'moc-123', mockPartsList.id, {
        title: 'Updated Title',
      })

      expect(result.ok).toBe(true)
      expect(partsListRepo.update).toHaveBeenCalledWith(mockPartsList.id, { title: 'Updated Title' })
    })

    it('returns FORBIDDEN when parts list belongs to different MOC', async () => {
      vi.mocked(partsListRepo.findById).mockResolvedValue({
        ok: true,
        data: { ...mockPartsList, mocId: 'different-moc' },
      })

      const result = await service.updatePartsList('user-123', 'moc-123', mockPartsList.id, {
        title: 'Updated Title',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('updatePartsListStatus', () => {
    it('sets built=true, purchased=false for in_progress status', async () => {
      await service.updatePartsListStatus('user-123', 'moc-123', mockPartsList.id, 'in_progress')

      expect(partsListRepo.update).toHaveBeenCalledWith(mockPartsList.id, {
        built: true,
        purchased: false,
      })
    })

    it('sets built=true, purchased=true for completed status', async () => {
      await service.updatePartsListStatus('user-123', 'moc-123', mockPartsList.id, 'completed')

      expect(partsListRepo.update).toHaveBeenCalledWith(mockPartsList.id, {
        built: true,
        purchased: true,
      })
    })

    it('sets built=false, purchased=false for planning status', async () => {
      await service.updatePartsListStatus('user-123', 'moc-123', mockPartsList.id, 'planning')

      expect(partsListRepo.update).toHaveBeenCalledWith(mockPartsList.id, {
        built: false,
        purchased: false,
      })
    })
  })

  describe('deletePartsList', () => {
    it('deletes parts list and its parts when user owns the MOC', async () => {
      const result = await service.deletePartsList('user-123', 'moc-123', mockPartsList.id)

      expect(result.ok).toBe(true)
      expect(partRepo.deleteByPartsListId).toHaveBeenCalledWith(mockPartsList.id)
      expect(partsListRepo.delete).toHaveBeenCalledWith(mockPartsList.id)
    })

    it('returns FORBIDDEN when parts list belongs to different MOC', async () => {
      vi.mocked(partsListRepo.findById).mockResolvedValue({
        ok: true,
        data: { ...mockPartsList, mocId: 'different-moc' },
      })

      const result = await service.deletePartsList('user-123', 'moc-123', mockPartsList.id)

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
      expect(partsListRepo.delete).not.toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Part Operations
  // ─────────────────────────────────────────────────────────────────────

  describe('addPart', () => {
    it('adds a part to a parts list', async () => {
      const result = await service.addPart('user-123', 'moc-123', mockPartsList.id, {
        partId: '3002',
        partName: 'Brick 2 x 3',
        quantity: 5,
        color: 'Blue',
      })

      expect(result.ok).toBe(true)
      expect(partRepo.insert).toHaveBeenCalledWith(mockPartsList.id, {
        partId: '3002',
        partName: 'Brick 2 x 3',
        quantity: 5,
        color: 'Blue',
      })
    })

    it('returns PARTS_LIST_NOT_FOUND when parts list does not exist', async () => {
      vi.mocked(partsListRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.addPart('user-123', 'moc-123', 'nonexistent', {
        partId: '3002',
        partName: 'Brick 2 x 3',
        quantity: 5,
        color: 'Blue',
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('PARTS_LIST_NOT_FOUND')
      }
    })
  })

  describe('addParts', () => {
    it('adds multiple parts to a parts list', async () => {
      const parts = [
        { partId: '3002', partName: 'Brick 2 x 3', quantity: 5, color: 'Blue' },
        { partId: '3003', partName: 'Brick 2 x 2', quantity: 3, color: 'Red' },
      ]

      const result = await service.addParts('user-123', 'moc-123', mockPartsList.id, parts)

      expect(result.ok).toBe(true)
      expect(partRepo.insertMany).toHaveBeenCalledWith(mockPartsList.id, parts)
    })
  })

  describe('updatePart', () => {
    it('updates a part when user owns the MOC', async () => {
      const result = await service.updatePart('user-123', 'moc-123', mockPartsList.id, mockPart.id, {
        quantity: 20,
      })

      expect(result.ok).toBe(true)
      expect(partRepo.update).toHaveBeenCalledWith(mockPart.id, { quantity: 20 })
    })

    it('returns PART_NOT_FOUND when part does not exist', async () => {
      vi.mocked(partRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })

      const result = await service.updatePart(
        'user-123',
        'moc-123',
        mockPartsList.id,
        'nonexistent',
        { quantity: 20 }
      )

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('PART_NOT_FOUND')
      }
    })

    it('returns FORBIDDEN when part belongs to different parts list', async () => {
      vi.mocked(partRepo.findById).mockResolvedValue({
        ok: true,
        data: { ...mockPart, partsListId: 'different-parts-list' },
      })

      const result = await service.updatePart('user-123', 'moc-123', mockPartsList.id, mockPart.id, {
        quantity: 20,
      })

      expect(result.ok).toBe(false)
      if (!result.ok) {
        expect(result.error).toBe('FORBIDDEN')
      }
    })
  })

  describe('deletePart', () => {
    it('deletes a part when user owns the MOC', async () => {
      const result = await service.deletePart('user-123', 'moc-123', mockPartsList.id, mockPart.id)

      expect(result.ok).toBe(true)
      expect(partRepo.delete).toHaveBeenCalledWith(mockPart.id)
    })
  })

  describe('listParts', () => {
    it('returns parts for a parts list', async () => {
      const result = await service.listParts('user-123', 'moc-123', mockPartsList.id)

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].partId).toBe('3001')
      }
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Summary Operations
  // ─────────────────────────────────────────────────────────────────────

  describe('getUserSummary', () => {
    it('returns user summary', async () => {
      const result = await service.getUserSummary('user-123')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.totalPartsLists).toBe(1)
        expect(result.data.byStatus.planning).toBe(1)
        expect(result.data.totalParts).toBe(100)
        expect(result.data.completionPercentage).toBe(0)
      }
    })

    it('calculates completion percentage correctly', async () => {
      vi.mocked(partsListRepo.getSummaryByUserId).mockResolvedValue({
        totalPartsLists: 2,
        byStatus: { planning: 0, in_progress: 1, completed: 1 },
        totalParts: 200,
        totalAcquiredParts: 100,
      })

      const result = await service.getUserSummary('user-123')

      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.completionPercentage).toBe(50)
      }
    })
  })
})

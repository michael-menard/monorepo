import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMinifigsService } from '../application/services.js'
import type {
  MinifigInstanceRepository,
  MinifigArchetypeRepository,
  MinifigVariantRepository,
} from '../ports/index.js'
import type { MinifigInstance, MinifigArchetype, MinifigVariant } from '../types.js'

/**
 * Minifigs Service Unit Tests
 *
 * Tests business logic using mock repositories.
 * No real database calls.
 */

const mockInstance: MinifigInstance = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  variantId: '223e4567-e89b-12d3-a456-426614174000',
  displayName: 'Forestman - Green Hat',
  status: 'owned',
  condition: 'built',
  sourceType: 'set',
  sourceSetId: '323e4567-e89b-12d3-a456-426614174000',
  isCustom: false,
  quantityOwned: 1,
  quantityWanted: 0,
  purchasePrice: '12.99',
  purchaseTax: '1.04',
  purchaseShipping: null,
  purchaseDate: new Date('2026-01-15'),
  purpose: 'Castle MOC',
  plannedUse: 'Display',
  notes: 'Good condition',
  imageUrl: null,
  sortOrder: null,
  tags: ['forestmen', 'castle'],
  variant: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockArchetype: MinifigArchetype = {
  id: '423e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  name: 'Forestman',
  description: 'Classic Castle Forestman',
  imageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockVariant: MinifigVariant = {
  id: '223e4567-e89b-12d3-a456-426614174000',
  userId: 'user-123',
  archetypeId: '423e4567-e89b-12d3-a456-426614174000',
  name: 'Forestman - Green Hat',
  legoNumber: 'cas002',
  theme: 'Castle',
  subtheme: 'Forestmen',
  year: 1990,
  cmfSeries: null,
  imageUrl: null,
  weight: '5.2g',
  dimensions: '4.0 x 1.6 x 1.3 cm',
  partsCount: 4,
  bricklinkUrl: 'https://www.bricklink.com/v2/catalog/catalogitem.page?M=cas002',
  priceGuide: null,
  parts: [
    { partNumber: '3626', name: 'Head', color: 'Yellow', quantity: 1, position: 'head' },
  ],
  appearsInSets: [{ setNumber: '6077-1', name: 'Forestmen River Fortress' }],
  createdAt: new Date(),
  updatedAt: new Date(),
}

function createMockInstanceRepo(): MinifigInstanceRepository {
  return {
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockInstance }),
    findByUserId: vi.fn().mockResolvedValue({
      data: [mockInstance],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    insert: vi.fn().mockResolvedValue(mockInstance),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockInstance }),
    delete: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
  }
}

function createMockArchetypeRepo(): MinifigArchetypeRepository {
  return {
    findAll: vi.fn().mockResolvedValue([mockArchetype]),
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockArchetype }),
    insert: vi.fn().mockResolvedValue(mockArchetype),
  }
}

function createMockVariantRepo(): MinifigVariantRepository {
  return {
    findAll: vi.fn().mockResolvedValue([mockVariant]),
    findById: vi.fn().mockResolvedValue({ ok: true, data: mockVariant }),
    findByLegoNumber: vi.fn().mockResolvedValue({ ok: true, data: mockVariant }),
    insert: vi.fn().mockResolvedValue(mockVariant),
    update: vi.fn().mockResolvedValue({ ok: true, data: mockVariant }),
  }
}

describe('MinifigsService', () => {
  let instanceRepo: MinifigInstanceRepository
  let archetypeRepo: MinifigArchetypeRepository
  let variantRepo: MinifigVariantRepository
  let service: ReturnType<typeof createMinifigsService>

  beforeEach(() => {
    instanceRepo = createMockInstanceRepo()
    archetypeRepo = createMockArchetypeRepo()
    variantRepo = createMockVariantRepo()
    service = createMinifigsService({ instanceRepo, archetypeRepo, variantRepo })
  })

  // ─────────────────────────────────────────────────────────────────────
  // getInstance
  // ─────────────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    it('returns instance when found and owned by user', async () => {
      const result = await service.getInstance('user-123', mockInstance.id)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.displayName).toBe('Forestman - Green Hat')
      }
    })

    it('returns NOT_FOUND when instance does not exist', async () => {
      vi.mocked(instanceRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })
      const result = await service.getInstance('user-123', 'nonexistent')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('NOT_FOUND')
    })

    it('returns FORBIDDEN when user does not own instance', async () => {
      const result = await service.getInstance('other-user', mockInstance.id)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // listInstances
  // ─────────────────────────────────────────────────────────────────────

  describe('listInstances', () => {
    it('returns paginated instances for user', async () => {
      const result = await service.listInstances('user-123', { page: 1, limit: 20 })
      expect(result.data).toHaveLength(1)
      expect(result.pagination.total).toBe(1)
      expect(instanceRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        undefined,
      )
    })

    it('passes filters to repository', async () => {
      const filters = { status: 'owned' as const, search: 'forest', condition: 'built' }
      await service.listInstances('user-123', { page: 1, limit: 20 }, filters)
      expect(instanceRepo.findByUserId).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 20 },
        filters,
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // updateInstance
  // ─────────────────────────────────────────────────────────────────────

  describe('updateInstance', () => {
    it('updates instance fields', async () => {
      const result = await service.updateInstance('user-123', mockInstance.id, {
        displayName: 'Updated Name',
        condition: 'parted_out',
      })
      expect(result.ok).toBe(true)
      expect(instanceRepo.update).toHaveBeenCalledWith(mockInstance.id, {
        displayName: 'Updated Name',
        condition: 'parted_out',
      })
    })

    it('returns NOT_FOUND when instance does not exist', async () => {
      vi.mocked(instanceRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })
      const result = await service.updateInstance('user-123', 'nonexistent', {
        displayName: 'Test',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('NOT_FOUND')
    })

    it('returns FORBIDDEN when user does not own instance', async () => {
      const result = await service.updateInstance('other-user', mockInstance.id, {
        displayName: 'Test',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })

    it('only passes defined fields to repository', async () => {
      await service.updateInstance('user-123', mockInstance.id, {
        notes: 'Updated notes',
      })
      expect(instanceRepo.update).toHaveBeenCalledWith(mockInstance.id, {
        notes: 'Updated notes',
      })
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // deleteInstance
  // ─────────────────────────────────────────────────────────────────────

  describe('deleteInstance', () => {
    it('deletes instance owned by user', async () => {
      const result = await service.deleteInstance('user-123', mockInstance.id)
      expect(result.ok).toBe(true)
      expect(instanceRepo.delete).toHaveBeenCalledWith(mockInstance.id)
    })

    it('returns NOT_FOUND when instance does not exist', async () => {
      vi.mocked(instanceRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })
      const result = await service.deleteInstance('user-123', 'nonexistent')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('NOT_FOUND')
    })

    it('returns FORBIDDEN when user does not own instance', async () => {
      const result = await service.deleteInstance('other-user', mockInstance.id)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Archetypes
  // ─────────────────────────────────────────────────────────────────────

  describe('listArchetypes', () => {
    it('returns archetypes for user', async () => {
      const result = await service.listArchetypes('user-123')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Forestman')
      expect(archetypeRepo.findAll).toHaveBeenCalledWith('user-123', undefined)
    })

    it('passes search filter', async () => {
      await service.listArchetypes('user-123', 'forest')
      expect(archetypeRepo.findAll).toHaveBeenCalledWith('user-123', 'forest')
    })
  })

  // ─────────────────────────────────────────────────────────────────────
  // Variants
  // ─────────────────────────────────────────────────────────────────────

  describe('listVariants', () => {
    it('returns variants for user', async () => {
      const result = await service.listVariants('user-123')
      expect(result).toHaveLength(1)
      expect(result[0].legoNumber).toBe('cas002')
    })

    it('passes archetype filter', async () => {
      await service.listVariants('user-123', { archetypeId: mockArchetype.id })
      expect(variantRepo.findAll).toHaveBeenCalledWith('user-123', {
        archetypeId: mockArchetype.id,
      })
    })
  })

  describe('getVariant', () => {
    it('returns variant when found and owned by user', async () => {
      const result = await service.getVariant('user-123', mockVariant.id)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.legoNumber).toBe('cas002')
        expect(result.data.parts).toHaveLength(1)
      }
    })

    it('returns NOT_FOUND when variant does not exist', async () => {
      vi.mocked(variantRepo.findById).mockResolvedValue({ ok: false, error: 'NOT_FOUND' })
      const result = await service.getVariant('user-123', 'nonexistent')
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('NOT_FOUND')
    })

    it('returns FORBIDDEN when user does not own variant', async () => {
      const result = await service.getVariant('other-user', mockVariant.id)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('FORBIDDEN')
    })
  })
})

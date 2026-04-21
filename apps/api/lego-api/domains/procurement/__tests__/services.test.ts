import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ok, err } from '@repo/api-core'
import { createProcurementService } from '../application/services.js'
import type { ProcurementRepository } from '../ports/index.js'
import type { AggregatedPart, InventoryPart, MarketplaceListing } from '../types.js'

// ─────────────────────────────────────────────────────────────────────────
// Test Data
// ─────────────────────────────────────────────────────────────────────────

const mockParts: AggregatedPart[] = [
  {
    partNumber: '3001',
    partName: 'Brick 2x4',
    color: 'Red',
    quantityNeeded: 10,
    quantityOwned: 0,
    quantityToBuy: 10,
    mocSources: [
      { mocId: 'moc-1', mocTitle: 'Castle', quantity: 6 },
      { mocId: 'moc-2', mocTitle: 'Tower', quantity: 4 },
    ],
  },
  {
    partNumber: '3002',
    partName: 'Brick 2x3',
    color: 'Blue',
    quantityNeeded: 5,
    quantityOwned: 0,
    quantityToBuy: 5,
    mocSources: [{ mocId: 'moc-1', mocTitle: 'Castle', quantity: 5 }],
  },
  {
    partNumber: '3003',
    partName: 'Brick 2x2',
    color: 'Red',
    quantityNeeded: 8,
    quantityOwned: 0,
    quantityToBuy: 8,
    mocSources: [{ mocId: 'moc-2', mocTitle: 'Tower', quantity: 8 }],
  },
]

const mockInventory: InventoryPart[] = [
  { partNumber: '3001', color: 'Red', quantity: 3, source: 'manual', sourceId: null },
  { partNumber: '3001', color: 'Red', quantity: 2, source: 'disassembled_moc', sourceId: 'moc-old' },
  { partNumber: '3003', color: 'Red', quantity: 8, source: 'manual', sourceId: null },
]

const now = new Date()
const mockListings: MarketplaceListing[] = [
  {
    id: 'listing-1',
    source: 'bricklink',
    storeId: 'store-1',
    storeName: 'Bricks R Us',
    partNumber: '3001',
    colorRaw: 'Red',
    condition: 'new',
    priceOriginal: '0.15',
    currencyOriginal: 'USD',
    priceUsd: '0.15',
    quantityAvailable: 100,
    fetchedAt: now,
    expiresAt: new Date(now.getTime() + 86400000),
  },
  {
    id: 'listing-2',
    source: 'bricklink',
    storeId: 'store-2',
    storeName: 'Cheap Bricks',
    partNumber: '3001',
    colorRaw: 'Red',
    condition: 'new',
    priceOriginal: '0.10',
    currencyOriginal: 'USD',
    priceUsd: '0.10',
    quantityAvailable: 50,
    fetchedAt: now,
    expiresAt: new Date(now.getTime() + 86400000),
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Mock Repository
// ─────────────────────────────────────────────────────────────────────────

function createMockRepo(): ProcurementRepository {
  return {
    getWantToBuildMocIds: vi.fn().mockResolvedValue(['moc-1', 'moc-2']),
    setWantToBuild: vi.fn().mockResolvedValue(ok(undefined)),
    getAggregatedPartsNeeded: vi.fn().mockResolvedValue(mockParts),
    getMocsMissingPartsLists: vi.fn().mockResolvedValue([]),
    getAvailableInventory: vi.fn().mockResolvedValue(mockInventory),
    getListingsForParts: vi.fn().mockResolvedValue(mockListings),
    upsertListings: vi.fn().mockResolvedValue(2),
    getCacheFreshness: vi.fn().mockResolvedValue({ totalCached: 2, staleCount: 0, oldestFetch: now }),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────

describe('ProcurementService', () => {
  let repo: ProcurementRepository
  let service: ReturnType<typeof createProcurementService>

  beforeEach(() => {
    repo = createMockRepo()
    service = createProcurementService({ procurementRepo: repo })
  })

  describe('toggleWantToBuild', () => {
    it('delegates to repository', async () => {
      const result = await service.toggleWantToBuild('user-1', 'moc-1', true)
      expect(result.ok).toBe(true)
      expect(repo.setWantToBuild).toHaveBeenCalledWith('user-1', 'moc-1', true)
    })

    it('returns NOT_FOUND if MOC does not exist', async () => {
      vi.mocked(repo.setWantToBuild).mockResolvedValue(err('NOT_FOUND'))
      const result = await service.toggleWantToBuild('user-1', 'nonexistent', true)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toBe('NOT_FOUND')
    })
  })

  describe('getPartsNeeded', () => {
    it('returns parts with inventory subtracted', async () => {
      const result = await service.getPartsNeeded('user-1')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // 3001 Red: needed 10, owned 5 (3 manual + 2 disassembled), toBuy 5
      const brick2x4 = result.data.find(p => p.partNumber === '3001')
      expect(brick2x4?.quantityNeeded).toBe(10)
      expect(brick2x4?.quantityOwned).toBe(5)
      expect(brick2x4?.quantityToBuy).toBe(5)

      // 3002 Blue: needed 5, owned 0, toBuy 5
      const brick2x3 = result.data.find(p => p.partNumber === '3002')
      expect(brick2x3?.quantityOwned).toBe(0)
      expect(brick2x3?.quantityToBuy).toBe(5)

      // 3003 Red: needed 8, owned 8, toBuy 0
      const brick2x2 = result.data.find(p => p.partNumber === '3003')
      expect(brick2x2?.quantityOwned).toBe(8)
      expect(brick2x2?.quantityToBuy).toBe(0)
    })

    it('handles empty parts list', async () => {
      vi.mocked(repo.getAggregatedPartsNeeded).mockResolvedValue([])
      const result = await service.getPartsNeeded('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.data).toHaveLength(0)
    })

    it('handles empty inventory', async () => {
      vi.mocked(repo.getAvailableInventory).mockResolvedValue([])
      const result = await service.getPartsNeeded('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) {
        // No inventory = all parts need buying
        expect(result.data.every(p => p.quantityOwned === 0)).toBe(true)
        expect(result.data.every(p => p.quantityToBuy === p.quantityNeeded)).toBe(true)
      }
    })
  })

  describe('getSummary', () => {
    it('returns correct aggregate stats', async () => {
      const result = await service.getSummary('user-1')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.data.mocsSelected).toBe(2)
      expect(result.data.mocsMissingParts).toBe(0)
      expect(result.data.totalPartsNeeded).toBe(23) // 10 + 5 + 8
      expect(result.data.partsInInventory).toBe(13) // 5 + 0 + 8
      expect(result.data.partsToBuy).toBe(10) // 5 + 5 + 0
    })

    it('includes pricing coverage', async () => {
      const result = await service.getSummary('user-1')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // Only 3001:Red has listings, out of 2 unique parts that need buying (3001:Red, 3002:Blue)
      expect(result.data.pricingCoverage).toBe(0.5)
    })

    it('reports MOCs missing parts lists', async () => {
      vi.mocked(repo.getMocsMissingPartsLists).mockResolvedValue([
        { id: 'moc-3', title: 'Broken MOC' },
      ])
      const result = await service.getSummary('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.data.mocsMissingParts).toBe(1)
    })

    it('handles no MOCs selected', async () => {
      vi.mocked(repo.getWantToBuildMocIds).mockResolvedValue([])
      vi.mocked(repo.getAggregatedPartsNeeded).mockResolvedValue([])
      const result = await service.getSummary('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data.mocsSelected).toBe(0)
        expect(result.data.totalPartsNeeded).toBe(0)
        expect(result.data.partsToBuy).toBe(0)
      }
    })
  })

  describe('getPricedParts', () => {
    it('returns parts with cheapest pricing attached', async () => {
      const result = await service.getPricedParts('user-1')
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // 3001 Red has 2 listings, cheapest is $0.10
      const brick2x4 = result.data.find(p => p.partNumber === '3001')
      expect(brick2x4?.cheapestPriceUsd).toBe('0.10')
      expect(brick2x4?.cheapestStoreName).toBe('Cheap Bricks')
      expect(brick2x4?.listingCount).toBe(2)
      expect(brick2x4?.status).toBe('priced')

      // 3002 Blue has no listings
      const brick2x3 = result.data.find(p => p.partNumber === '3002')
      expect(brick2x3?.cheapestPriceUsd).toBeNull()
      expect(brick2x3?.listingCount).toBe(0)
      expect(brick2x3?.status).toBe('not_fetched')
    })
  })

  describe('inventory subtraction edge cases', () => {
    it('does not go negative when inventory exceeds need', async () => {
      vi.mocked(repo.getAggregatedPartsNeeded).mockResolvedValue([
        {
          partNumber: '3001',
          partName: 'Brick 2x4',
          color: 'Red',
          quantityNeeded: 2,
          quantityOwned: 0,
          quantityToBuy: 2,
          mocSources: [{ mocId: 'moc-1', mocTitle: 'Castle', quantity: 2 }],
        },
      ])
      vi.mocked(repo.getAvailableInventory).mockResolvedValue([
        { partNumber: '3001', color: 'Red', quantity: 100, source: 'manual', sourceId: null },
      ])

      const result = await service.getPartsNeeded('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.data[0].quantityToBuy).toBe(0)
        expect(result.data[0].quantityOwned).toBe(100)
      }
    })

    it('aggregates inventory from multiple sources', async () => {
      vi.mocked(repo.getAggregatedPartsNeeded).mockResolvedValue([
        {
          partNumber: '3001',
          partName: 'Brick 2x4',
          color: 'Red',
          quantityNeeded: 20,
          quantityOwned: 0,
          quantityToBuy: 20,
          mocSources: [{ mocId: 'moc-1', mocTitle: 'Castle', quantity: 20 }],
        },
      ])
      vi.mocked(repo.getAvailableInventory).mockResolvedValue([
        { partNumber: '3001', color: 'Red', quantity: 5, source: 'manual', sourceId: null },
        { partNumber: '3001', color: 'Red', quantity: 3, source: 'disassembled_set', sourceId: 'set-1' },
        { partNumber: '3001', color: 'Red', quantity: 7, source: 'disassembled_moc', sourceId: 'moc-old' },
      ])

      const result = await service.getPartsNeeded('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) {
        // 5 + 3 + 7 = 15 owned, 20 - 15 = 5 to buy
        expect(result.data[0].quantityOwned).toBe(15)
        expect(result.data[0].quantityToBuy).toBe(5)
      }
    })

    it('same part in multiple MOCs aggregates correctly', async () => {
      // Already tested by mockParts — 3001 Red appears in both Castle (6) and Tower (4)
      const result = await service.getPartsNeeded('user-1')
      expect(result.ok).toBe(true)
      if (result.ok) {
        const brick2x4 = result.data.find(p => p.partNumber === '3001')
        expect(brick2x4?.quantityNeeded).toBe(10) // 6 + 4
        expect(brick2x4?.mocSources).toHaveLength(2)
      }
    })
  })
})

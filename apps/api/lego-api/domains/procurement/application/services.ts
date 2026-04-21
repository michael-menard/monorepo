import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { ProcurementRepository } from '../ports/index.js'
import type {
  AggregatedPart,
  InventoryPart,
  ProcurementSummary,
  PricedPart,
  ProcurementError,
} from '../types.js'

export interface ProcurementServiceDeps {
  procurementRepo: ProcurementRepository
}

export function createProcurementService(deps: ProcurementServiceDeps) {
  const { procurementRepo } = deps

  /**
   * Subtract available inventory from parts needed.
   * Groups inventory by (partNumber, color) and deducts from aggregated needs.
   */
  function subtractInventory(
    partsNeeded: AggregatedPart[],
    inventory: InventoryPart[],
  ): AggregatedPart[] {
    // Build inventory lookup: key = "partNumber|color" → total quantity
    const inventoryMap = new Map<string, number>()
    for (const inv of inventory) {
      const key = `${inv.partNumber}|${inv.color}`
      inventoryMap.set(key, (inventoryMap.get(key) ?? 0) + inv.quantity)
    }

    return partsNeeded.map(part => {
      const key = `${part.partNumber}|${part.color}`
      const owned = inventoryMap.get(key) ?? 0
      const toBuy = Math.max(0, part.quantityNeeded - owned)

      return {
        ...part,
        quantityOwned: owned,
        quantityToBuy: toBuy,
      }
    })
  }

  return {
    /**
     * Toggle want_to_build on a MOC
     */
    async toggleWantToBuild(
      userId: string,
      mocId: string,
      wantToBuild: boolean,
    ): Promise<Result<void, ProcurementError>> {
      return procurementRepo.setWantToBuild(userId, mocId, wantToBuild)
    },

    /**
     * Get aggregated parts needed across all want_to_build MOCs,
     * minus available inventory.
     */
    async getPartsNeeded(userId: string): Promise<Result<AggregatedPart[], ProcurementError>> {
      try {
        const [partsNeeded, inventory] = await Promise.all([
          procurementRepo.getAggregatedPartsNeeded(userId),
          procurementRepo.getAvailableInventory(userId),
        ])

        return ok(subtractInventory(partsNeeded, inventory))
      } catch (error) {
        logger.error('Failed to get parts needed:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get available inventory parts
     */
    async getInventoryAvailable(
      userId: string,
    ): Promise<Result<InventoryPart[], ProcurementError>> {
      try {
        const inventory = await procurementRepo.getAvailableInventory(userId)
        return ok(inventory)
      } catch (error) {
        logger.error('Failed to get inventory:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get procurement summary with aggregate stats
     */
    async getSummary(userId: string): Promise<Result<ProcurementSummary, ProcurementError>> {
      try {
        const [mocIds, mocsMissing, partsNeeded, inventory, cacheFreshness] = await Promise.all([
          procurementRepo.getWantToBuildMocIds(userId),
          procurementRepo.getMocsMissingPartsLists(userId),
          procurementRepo.getAggregatedPartsNeeded(userId),
          procurementRepo.getAvailableInventory(userId),
          procurementRepo.getCacheFreshness(),
        ])

        const adjusted = subtractInventory(partsNeeded, inventory)

        const totalPartsNeeded = adjusted.reduce((sum, p) => sum + p.quantityNeeded, 0)
        const partsInInventory = adjusted.reduce((sum, p) => sum + p.quantityOwned, 0)
        const partsToBuy = adjusted.reduce((sum, p) => sum + p.quantityToBuy, 0)

        // Get pricing for parts that need buying
        const partsToPriceLookup = adjusted
          .filter(p => p.quantityToBuy > 0)
          .map(p => ({ partNumber: p.partNumber, color: p.color }))

        const listings = await procurementRepo.getListingsForParts(partsToPriceLookup)

        // Calculate estimated cost from cheapest listings
        let estimatedCost = 0
        let pricedCount = 0
        const pricedParts = new Set<string>()

        for (const part of adjusted.filter(p => p.quantityToBuy > 0)) {
          const partListings = listings.filter(
            l => l.partNumber === part.partNumber && l.colorRaw === part.color,
          )
          if (partListings.length > 0) {
            const cheapest = partListings.reduce((min, l) =>
              parseFloat(l.priceUsd) < parseFloat(min.priceUsd) ? l : min,
            )
            estimatedCost += parseFloat(cheapest.priceUsd) * part.quantityToBuy
            pricedParts.add(`${part.partNumber}|${part.color}`)
            pricedCount++
          }
        }

        const uniquePartsNeeded = adjusted.filter(p => p.quantityToBuy > 0).length

        return ok({
          mocsSelected: mocIds.length,
          mocsMissingParts: mocsMissing.length,
          totalPartsNeeded,
          uniquePartsNeeded,
          partsInInventory,
          partsToBuy,
          estimatedCostUsd: pricedCount > 0 ? estimatedCost.toFixed(2) : null,
          pricingCoverage: uniquePartsNeeded > 0 ? pricedCount / uniquePartsNeeded : 0,
          cacheFreshness: {
            totalCached: cacheFreshness.totalCached,
            staleCount: cacheFreshness.staleCount,
            oldestFetch: cacheFreshness.oldestFetch?.toISOString() ?? null,
          },
        })
      } catch (error) {
        logger.error('Failed to get procurement summary:', error)
        return err('DB_ERROR')
      }
    },

    /**
     * Get priced parts list — parts needed with cheapest pricing attached
     */
    async getPricedParts(userId: string): Promise<Result<PricedPart[], ProcurementError>> {
      try {
        const [partsNeeded, inventory] = await Promise.all([
          procurementRepo.getAggregatedPartsNeeded(userId),
          procurementRepo.getAvailableInventory(userId),
        ])

        const adjusted = subtractInventory(partsNeeded, inventory)
        const partsToPriceLookup = adjusted.map(p => ({
          partNumber: p.partNumber,
          color: p.color,
        }))

        const listings = await procurementRepo.getListingsForParts(partsToPriceLookup)

        const pricedParts: PricedPart[] = adjusted.map(part => {
          const partListings = listings.filter(
            l => l.partNumber === part.partNumber && l.colorRaw === part.color,
          )

          if (partListings.length === 0) {
            return {
              ...part,
              cheapestPriceUsd: null,
              cheapestSource: null,
              cheapestStoreName: null,
              listingCount: 0,
              status: 'not_fetched' as const,
            }
          }

          const cheapest = partListings.reduce((min, l) =>
            parseFloat(l.priceUsd) < parseFloat(min.priceUsd) ? l : min,
          )

          return {
            ...part,
            cheapestPriceUsd: cheapest.priceUsd,
            cheapestSource: cheapest.source,
            cheapestStoreName: cheapest.storeName,
            listingCount: partListings.length,
            status: 'priced' as const,
          }
        })

        return ok(pricedParts)
      } catch (error) {
        logger.error('Failed to get priced parts:', error)
        return err('DB_ERROR')
      }
    },
  }
}

export type ProcurementService = ReturnType<typeof createProcurementService>

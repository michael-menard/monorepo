import type { Result } from '@repo/api-core'
import type {
  AggregatedPart,
  InventoryPart,
  MarketplaceListing,
  ProcurementError,
} from '../types.js'

/**
 * Procurement Repository Interface
 *
 * Handles aggregation queries and marketplace listings cache.
 */
export interface ProcurementRepository {
  /**
   * Get all MOC IDs flagged as want_to_build for a user
   */
  getWantToBuildMocIds(userId: string): Promise<string[]>

  /**
   * Toggle want_to_build flag on a MOC
   */
  setWantToBuild(
    userId: string,
    mocId: string,
    wantToBuild: boolean,
  ): Promise<Result<void, ProcurementError>>

  /**
   * Aggregate parts needed across all want_to_build MOCs.
   * Groups by (partNumber, color), sums quantities, includes MOC sources.
   */
  getAggregatedPartsNeeded(userId: string): Promise<AggregatedPart[]>

  /**
   * Get MOCs flagged as want_to_build that have no parts lists
   */
  getMocsMissingPartsLists(userId: string): Promise<Array<{ id: string; title: string }>>

  /**
   * Get available inventory: loose parts + parts from disassembled sets/MOCs.
   * Only includes parts from sources where buildStatus = 'parted_out'.
   */
  getAvailableInventory(userId: string): Promise<InventoryPart[]>

  /**
   * Get cached marketplace listings for specific parts.
   * Only returns non-expired listings.
   */
  getListingsForParts(
    partNumbers: Array<{ partNumber: string; color: string }>,
  ): Promise<MarketplaceListing[]>

  /**
   * Upsert marketplace listings (from scraper results)
   */
  upsertListings(listings: MarketplaceListing[]): Promise<number>

  /**
   * Get cache freshness stats
   */
  getCacheFreshness(): Promise<{
    totalCached: number
    staleCount: number
    oldestFetch: Date | null
  }>
}

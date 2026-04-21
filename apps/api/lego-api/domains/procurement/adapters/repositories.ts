import { eq, and, sql, gt, inArray } from 'drizzle-orm'
import type { PgDatabase } from 'drizzle-orm/pg-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import type { ProcurementRepository } from '../ports/index.js'
import type { AggregatedPart, InventoryPart, MarketplaceListing } from '../types.js'

type ProcurementSchema = {
  mocInstructions: typeof import('@repo/db').mocInstructions
  mocPartsLists: typeof import('@repo/db').mocPartsLists
  mocParts: typeof import('@repo/db').mocParts
  partsInventory: typeof import('@repo/db').partsInventory
  marketplaceListings: typeof import('@repo/db').marketplaceListings
}

export function createProcurementRepository(
  db: PgDatabase<Record<string, never>>,
  schema: ProcurementSchema,
): ProcurementRepository {
  return {
    async getWantToBuildMocIds(userId) {
      const results = await db
        .select({ id: schema.mocInstructions.id })
        .from(schema.mocInstructions)
        .where(
          and(
            eq(schema.mocInstructions.userId, userId),
            eq(schema.mocInstructions.wantToBuild, true),
          ),
        )

      return results.map(r => r.id)
    },

    async setWantToBuild(userId, mocId, wantToBuild) {
      const [result] = await db
        .update(schema.mocInstructions)
        .set({ wantToBuild, updatedAt: new Date() })
        .where(and(eq(schema.mocInstructions.id, mocId), eq(schema.mocInstructions.userId, userId)))
        .returning({ id: schema.mocInstructions.id })

      if (!result) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async getAggregatedPartsNeeded(userId) {
      // Get all parts across all want_to_build MOCs, grouped by (partNumber, color)
      const results = await db.execute(sql`
        SELECT
          mp.part_id AS part_number,
          mp.part_name,
          mp.color,
          SUM(mp.quantity)::int AS total_quantity,
          json_agg(json_build_object(
            'mocId', mi.id,
            'mocTitle', mi.title,
            'quantity', mp.quantity
          )) AS moc_sources
        FROM moc_parts mp
        INNER JOIN moc_parts_lists mpl ON mp.parts_list_id = mpl.id
        INNER JOIN moc_instructions mi ON mpl.moc_id = mi.id
        WHERE mi.user_id = ${userId}
          AND mi.want_to_build = true
        GROUP BY mp.part_id, mp.part_name, mp.color
        ORDER BY mp.part_id, mp.color
      `)

      return (
        results.rows as Array<{
          part_number: string
          part_name: string
          color: string
          total_quantity: number
          moc_sources: Array<{ mocId: string; mocTitle: string; quantity: number }>
        }>
      ).map(row => ({
        partNumber: row.part_number,
        partName: row.part_name,
        color: row.color,
        quantityNeeded: row.total_quantity,
        quantityOwned: 0, // filled in by service layer
        quantityToBuy: row.total_quantity, // adjusted by service layer
        mocSources: row.moc_sources,
      }))
    },

    async getMocsMissingPartsLists(userId) {
      const results = await db.execute(sql`
        SELECT mi.id, mi.title
        FROM moc_instructions mi
        WHERE mi.user_id = ${userId}
          AND mi.want_to_build = true
          AND NOT EXISTS (
            SELECT 1 FROM moc_parts_lists mpl WHERE mpl.moc_id = mi.id
          )
      `)

      return results.rows as Array<{ id: string; title: string }>
    },

    async getAvailableInventory(userId) {
      // Loose parts from parts_inventory
      const looseResults = await db
        .select({
          partNumber: schema.partsInventory.partNumber,
          color: schema.partsInventory.color,
          quantity: schema.partsInventory.quantity,
          source: schema.partsInventory.source,
          sourceId: schema.partsInventory.sourceId,
        })
        .from(schema.partsInventory)
        .where(eq(schema.partsInventory.userId, userId))

      // Parts from disassembled MOCs (build_status = 'parted_out')
      const disassembledMocParts = await db.execute(sql`
        SELECT
          mp.part_id AS part_number,
          mp.color,
          SUM(mp.quantity)::int AS quantity,
          'disassembled_moc' AS source,
          mi.id::text AS source_id
        FROM moc_parts mp
        INNER JOIN moc_parts_lists mpl ON mp.parts_list_id = mpl.id
        INNER JOIN moc_instructions mi ON mpl.moc_id = mi.id
        WHERE mi.user_id = ${userId}
          AND mi.build_status = 'parted_out'
          AND mi.want_to_build = false
        GROUP BY mp.part_id, mp.color, mi.id
      `)

      const inventory: InventoryPart[] = [
        ...looseResults.map(r => ({
          partNumber: r.partNumber,
          color: r.color,
          quantity: r.quantity,
          source: r.source,
          sourceId: r.sourceId,
        })),
        ...(
          disassembledMocParts.rows as Array<{
            part_number: string
            color: string
            quantity: number
            source: string
            source_id: string
          }>
        ).map(row => ({
          partNumber: row.part_number,
          color: row.color,
          quantity: row.quantity,
          source: row.source,
          sourceId: row.source_id,
        })),
      ]

      return inventory
    },

    async getListingsForParts(partNumbers) {
      if (partNumbers.length === 0) return []

      const partIds = partNumbers.map(p => p.partNumber)
      const now = new Date()

      const results = await db
        .select()
        .from(schema.marketplaceListings)
        .where(
          and(
            inArray(schema.marketplaceListings.partNumber, partIds),
            gt(schema.marketplaceListings.expiresAt, now),
          ),
        )

      return results.map(r => ({
        id: r.id,
        source: r.source,
        storeId: r.storeId,
        storeName: r.storeName,
        partNumber: r.partNumber,
        colorRaw: r.colorRaw,
        condition: r.condition,
        priceOriginal: r.priceOriginal,
        currencyOriginal: r.currencyOriginal,
        priceUsd: r.priceUsd,
        quantityAvailable: r.quantityAvailable,
        fetchedAt: r.fetchedAt,
        expiresAt: r.expiresAt,
      }))
    },

    async upsertListings(listings) {
      if (listings.length === 0) return 0

      let upserted = 0
      for (const listing of listings) {
        try {
          await db
            .insert(schema.marketplaceListings)
            .values({
              source: listing.source,
              storeId: listing.storeId,
              storeName: listing.storeName,
              partNumber: listing.partNumber,
              colorRaw: listing.colorRaw,
              condition: listing.condition,
              priceOriginal: listing.priceOriginal,
              currencyOriginal: listing.currencyOriginal,
              priceUsd: listing.priceUsd,
              exchangeRate: '1.0',
              quantityAvailable: listing.quantityAvailable,
              fetchedAt: listing.fetchedAt,
              expiresAt: listing.expiresAt,
            })
            .onConflictDoUpdate({
              target: [
                schema.marketplaceListings.source,
                schema.marketplaceListings.storeId,
                schema.marketplaceListings.partNumber,
                schema.marketplaceListings.colorRaw,
                schema.marketplaceListings.condition,
              ],
              set: {
                priceOriginal: listing.priceOriginal,
                currencyOriginal: listing.currencyOriginal,
                priceUsd: listing.priceUsd,
                quantityAvailable: listing.quantityAvailable,
                storeName: listing.storeName,
                fetchedAt: listing.fetchedAt,
                expiresAt: listing.expiresAt,
              },
            })
          upserted++
        } catch (error) {
          logger.error('Failed to upsert listing:', { partNumber: listing.partNumber, error })
        }
      }

      return upserted
    },

    async getCacheFreshness() {
      const now = new Date()

      const [stats] = await db
        .select({
          totalCached: sql<number>`count(*)::int`,
          staleCount: sql<number>`count(*) FILTER (WHERE expires_at < ${now})::int`,
          oldestFetch: sql<Date | null>`min(fetched_at)`,
        })
        .from(schema.marketplaceListings)

      return {
        totalCached: stats?.totalCached ?? 0,
        staleCount: stats?.staleCount ?? 0,
        oldestFetch: stats?.oldestFetch ?? null,
      }
    },
  }
}

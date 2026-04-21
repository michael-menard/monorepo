import { eq, and, or, ilike, sql } from 'drizzle-orm'
import type { Column } from 'drizzle-orm'
import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as dbSchema from '@repo/db'
import type { ConceptSignals, DonorMinifig } from '../types.js'
import type { PartsSearchProvider, SearchablePart } from '../ports/index.js'

type DB = NodePgDatabase<typeof dbSchema>
type Schema = typeof dbSchema

/**
 * Parts search provider that queries the local database.
 *
 * Collection: Parts from MOC parts lists where the MOC's parts are available
 * (disassembled sets/MOCs, loose parts inventory).
 *
 * Wishlist: Parts from wanted sets' known part lists and wanted minifig variants.
 *
 * External: Minifig variant parts not owned by the user (the richest local source
 * since variant parts have category, color, name, theme, and imageUrl).
 */
export function createPartsSearchProvider(db: DB, schema: Schema): PartsSearchProvider {
  return {
    async searchCollection(userId: string, signals: ConceptSignals): Promise<SearchablePart[]> {
      logger.info(`[recommender:search] Searching collection for user ${userId}`)

      const results: SearchablePart[] = []

      // Search parts inventory (loose parts + disassembled)
      const inventoryParts = await db
        .select()
        .from(schema.partsInventory)
        .where(
          and(
            eq(schema.partsInventory.userId, userId),
            buildColorFilter(schema.partsInventory.color, signals.colors),
          ),
        )
        .limit(100)

      for (const part of inventoryParts) {
        results.push({
          partNumber: part.partNumber,
          partName: part.partNumber, // Inventory doesn't store names — use part number as fallback
          color: part.color,
          category: null,
          theme: null,
          tags: [],
          imageUrl: null,
          source: 'collection',
        })
      }

      // Search MOC parts lists for parts the user owns
      // (MOC parts have partName which is more useful)
      const mocParts = await db
        .select({
          partId: schema.mocParts.partId,
          partName: schema.mocParts.partName,
          color: schema.mocParts.color,
        })
        .from(schema.mocParts)
        .innerJoin(schema.mocPartsLists, eq(schema.mocParts.partsListId, schema.mocPartsLists.id))
        .innerJoin(
          schema.mocInstructions,
          eq(schema.mocPartsLists.mocId, schema.mocInstructions.id),
        )
        .where(
          and(
            eq(schema.mocInstructions.userId, userId),
            buildColorFilter(schema.mocParts.color, signals.colors),
          ),
        )
        .limit(100)

      for (const part of mocParts) {
        // Check if name matches any signal
        if (matchesAnySignal(part.partName, signals)) {
          results.push({
            partNumber: part.partId,
            partName: part.partName,
            color: part.color,
            category: null,
            theme: null,
            tags: [],
            imageUrl: null,
            source: 'collection',
          })
        }
      }

      return deduplicateParts(results)
    },

    async searchWishlist(userId: string, signals: ConceptSignals): Promise<SearchablePart[]> {
      logger.info(`[recommender:search] Searching wishlist for user ${userId}`)

      const results: SearchablePart[] = []

      // Search wanted minifig variant parts (richest metadata source)
      const wantedInstances = await db
        .select({
          variantId: schema.minifigVariants.id,
          parts: schema.minifigVariants.parts,
          theme: schema.minifigVariants.theme,
        })
        .from(schema.minifigInstances)
        .innerJoin(
          schema.minifigVariants,
          eq(schema.minifigInstances.variantId, schema.minifigVariants.id),
        )
        .where(
          and(
            eq(schema.minifigInstances.userId, userId),
            eq(schema.minifigInstances.status, 'wanted'),
          ),
        )

      for (const instance of wantedInstances) {
        const parts = (instance.parts as MinifigPartJson[]) ?? []
        for (const part of parts) {
          if (matchesMinifigPart(part, signals)) {
            results.push({
              partNumber: part.partNumber ?? '',
              partName: part.name ?? '',
              color: part.color ?? '',
              category: part.category ?? null,
              theme: instance.theme ?? null,
              tags: [],
              imageUrl: part.imageUrl ?? null,
              source: 'wishlist',
            })
          }
        }
      }

      return deduplicateParts(results)
    },

    async searchExternal(userId: string, signals: ConceptSignals): Promise<SearchablePart[]> {
      logger.info(`[recommender:search] Searching external parts for user ${userId}`)

      const results: SearchablePart[] = []

      // Search all minifig variant parts not owned by the user
      // This is the richest local data source — variants have full metadata
      const variants = await db
        .select({
          id: schema.minifigVariants.id,
          parts: schema.minifigVariants.parts,
          theme: schema.minifigVariants.theme,
        })
        .from(schema.minifigVariants)
        .where(eq(schema.minifigVariants.userId, userId))
        .limit(500)

      // Get owned variant IDs to exclude
      const ownedInstances = await db
        .select({ variantId: schema.minifigInstances.variantId })
        .from(schema.minifigInstances)
        .where(
          and(
            eq(schema.minifigInstances.userId, userId),
            eq(schema.minifigInstances.status, 'owned'),
          ),
        )

      const ownedVariantIds = new Set(ownedInstances.map(i => i.variantId))

      for (const variant of variants) {
        if (ownedVariantIds.has(variant.id)) continue

        const parts = (variant.parts as MinifigPartJson[]) ?? []
        for (const part of parts) {
          if (matchesMinifigPart(part, signals)) {
            results.push({
              partNumber: part.partNumber ?? '',
              partName: part.name ?? '',
              color: part.color ?? '',
              category: part.category ?? null,
              theme: variant.theme ?? null,
              tags: [],
              imageUrl: part.imageUrl ?? null,
              source: 'external',
            })
          }
        }
      }

      return deduplicateParts(results)
    },

    async findDonorMinifigs(userId: string, signals: ConceptSignals): Promise<DonorMinifig[]> {
      logger.info(`[recommender:search] Finding donor minifigs for user ${userId}`)

      const variants = await db
        .select({
          id: schema.minifigVariants.id,
          name: schema.minifigVariants.name,
          legoNumber: schema.minifigVariants.legoNumber,
          theme: schema.minifigVariants.theme,
          imageUrl: schema.minifigVariants.imageUrl,
          parts: schema.minifigVariants.parts,
        })
        .from(schema.minifigVariants)
        .where(eq(schema.minifigVariants.userId, userId))
        .limit(500)

      const donors: DonorMinifig[] = []

      for (const variant of variants) {
        const parts = (variant.parts as MinifigPartJson[]) ?? []
        let matchCount = 0
        const matchedCategories: string[] = []

        for (const part of parts) {
          if (matchesMinifigPart(part, signals)) {
            matchCount++
            if (part.category) matchedCategories.push(part.category)
          }
        }

        if (matchCount >= 2) {
          donors.push({
            variantId: variant.id,
            name: variant.name ?? '',
            legoNumber: variant.legoNumber,
            theme: variant.theme,
            imageUrl: variant.imageUrl,
            matchingParts: matchCount,
            reason: `Has ${matchCount} matching parts (${[...new Set(matchedCategories)].join(', ')})`,
          })
        }
      }

      // Sort by matching parts descending
      donors.sort((a, b) => b.matchingParts - a.matchingParts)

      return donors.slice(0, 10)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

interface MinifigPartJson {
  partNumber?: string
  name?: string
  color?: string
  colorId?: number
  quantity?: number
  position?: string
  imageUrl?: string
  category?: string
  bricklinkUrl?: string
  hasInventory?: boolean
  priceGuide?: unknown
}

function buildColorFilter(colorColumn: Column, colors: string[]) {
  if (colors.length === 0) return undefined
  return or(...colors.map(c => ilike(colorColumn, `%${c}%`)))
}

function matchesMinifigPart(part: MinifigPartJson, signals: ConceptSignals): boolean {
  const colorMatch = signals.colors.some(c =>
    (part.color ?? '').toLowerCase().includes(c.toLowerCase()),
  )
  const categoryMatch = signals.categories.some(c =>
    (part.category ?? '').toLowerCase().includes(c.toLowerCase()),
  )
  const nameMatch =
    signals.categories.some(c => (part.name ?? '').toLowerCase().includes(c.toLowerCase())) ||
    signals.styleDescriptors.some(s => (part.name ?? '').toLowerCase().includes(s.toLowerCase()))

  return colorMatch || categoryMatch || nameMatch
}

function matchesAnySignal(text: string, signals: ConceptSignals): boolean {
  const lower = text.toLowerCase()
  return (
    signals.categories.some(c => lower.includes(c.toLowerCase())) ||
    signals.styleDescriptors.some(s => lower.includes(s.toLowerCase())) ||
    signals.accessoryTypes.some(a => lower.includes(a.toLowerCase()))
  )
}

function deduplicateParts(parts: SearchablePart[]): SearchablePart[] {
  const seen = new Set<string>()
  return parts.filter(part => {
    const key = `${part.partNumber}:${part.color}:${part.source}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

import { eq, and, ilike, or, sql, desc, asc, inArray, max } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err, paginate } from '@repo/api-core'
import type * as schema from '@repo/db'
import { toCloudFrontUrl } from '../../../core/cdn/index.js'
import type { SetRepository, SetImageRepository, StoreRepository } from '../ports/index.js'
import type { Set, SetImage, Store, UpdateSetImageInput } from '../types.js'

type Schema = typeof schema

// ─────────────────────────────────────────────────────────────────────────
// Set Repository
// ─────────────────────────────────────────────────────────────────────────

export function createSetRepository(db: NodePgDatabase<Schema>, schema: Schema): SetRepository {
  const { sets, stores } = schema

  return {
    async findById(id: string): Promise<Result<Set, 'NOT_FOUND'>> {
      const rows = await db
        .select({
          set: sets,
          storeName: stores.name,
        })
        .from(sets)
        .leftJoin(stores, eq(sets.storeId, stores.id))
        .where(eq(sets.id, id))
        .limit(1)

      if (!rows[0]) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToSet(rows[0].set, rows[0].storeName))
    },

    async findByUserId(
      userId: string,
      pagination: PaginationInput,
      filters?,
    ): Promise<PaginatedResult<Set>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const conditions = [eq(sets.userId, userId)]

      // Status filter
      if (filters?.status) {
        conditions.push(eq(sets.status, filters.status))
      }

      // Search
      if (filters?.search) {
        const pattern = `%${filters.search}%`
        conditions.push(
          or(
            ilike(sets.title, pattern),
            ilike(sets.setNumber, pattern),
            ilike(sets.notes, pattern),
          )!,
        )
      }

      // Store filter
      if (filters?.storeId) {
        conditions.push(eq(sets.storeId, filters.storeId))
      }

      // Priority range
      if (filters?.priorityRange) {
        conditions.push(
          and(
            sql`${sets.priority} IS NOT NULL`,
            sql`${sets.priority} >= ${filters.priorityRange.min}`,
            sql`${sets.priority} <= ${filters.priorityRange.max}`,
          )!,
        )
      } else if (filters?.priority !== undefined) {
        conditions.push(eq(sets.priority, filters.priority))
      }

      // Price range
      if (filters?.priceRange) {
        conditions.push(
          and(
            sql`${sets.purchasePrice} IS NOT NULL`,
            sql`${sets.purchasePrice}::numeric >= ${filters.priceRange.min}`,
            sql`${sets.purchasePrice}::numeric <= ${filters.priceRange.max}`,
          )!,
        )
      }

      // Build status filter (isBuilt maps to buildStatus)
      if (filters?.isBuilt !== undefined) {
        if (filters.isBuilt) {
          conditions.push(eq(sets.buildStatus, 'completed'))
        } else {
          conditions.push(
            or(
              eq(sets.buildStatus, 'not_started'),
              eq(sets.buildStatus, 'in_progress'),
              sql`${sets.buildStatus} IS NULL`,
            )!,
          )
        }
      }

      // Tags filter via entity_tags join
      if (filters?.tags && filters.tags.length > 0) {
        conditions.push(
          sql`${sets.id} IN (
            SELECT et.entity_id FROM entity_tags et
            JOIN tags t ON t.id = et.tag_id
            WHERE et.entity_type = 'set'
            AND t.name IN (${sql.join(
              filters.tags.map(t => sql`${t.toLowerCase()}`),
              sql`,`,
            )})
          )`,
        )
      }

      // Sort
      const sortMode = filters?.sort ?? 'createdAt'
      const orderDirection = filters?.order ?? 'desc'
      let orderByClause

      if (sortMode === 'bestValue') {
        const dir = orderDirection === 'desc' ? 'DESC' : 'ASC'
        orderByClause = sql`
          CASE WHEN ${sets.purchasePrice} IS NULL OR ${sets.pieceCount} IS NULL OR ${sets.pieceCount} = 0 THEN 1 ELSE 0 END ASC,
          CASE WHEN ${sets.purchasePrice} IS NOT NULL AND ${sets.pieceCount} > 0
            THEN ${sets.purchasePrice}::numeric / ${sets.pieceCount} ELSE NULL
          END ${sql.raw(dir)} NULLS LAST
        `
      } else if (sortMode === 'expiringSoon') {
        const dir = orderDirection === 'desc' ? 'DESC' : 'ASC'
        orderByClause = sql`
          CASE WHEN ${sets.releaseDate} IS NULL THEN 1 ELSE 0 END ASC,
          ${sets.releaseDate} ${sql.raw(dir)} NULLS LAST
        `
      } else if (sortMode === 'hiddenGems') {
        const dir = orderDirection === 'asc' ? 'ASC' : 'DESC'
        orderByClause = sql`
          CASE WHEN ${sets.pieceCount} IS NULL THEN 1 ELSE 0 END ASC,
          (5 - COALESCE(${sets.priority}, 0)) * COALESCE(${sets.pieceCount}, 0) ${sql.raw(dir)}
        `
      } else {
        const sortColumn =
          {
            createdAt: sets.createdAt,
            title: sets.title,
            purchasePrice: sets.purchasePrice,
            pieceCount: sets.pieceCount,
            sortOrder: sets.sortOrder,
            priority: sets.priority,
          }[sortMode] ?? sets.createdAt

        orderByClause = orderDirection === 'desc' ? desc(sortColumn) : asc(sortColumn)
      }

      // Query with store join
      const rows = await db
        .select({
          set: sets,
          storeName: stores.name,
        })
        .from(sets)
        .leftJoin(stores, eq(sets.storeId, stores.id))
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sets)
        .where(and(...conditions))

      const total = countResult[0]?.count ?? 0

      return paginate(
        rows.map(r => mapRowToSet(r.set, r.storeName)),
        total,
        pagination,
      )
    },

    async insert(data): Promise<Set> {
      const [row] = await db
        .insert(sets)
        .values({
          userId: data.userId,
          status: data.status,
          statusChangedAt: data.statusChangedAt ?? null,
          title: data.title,
          setNumber: data.setNumber ?? null,
          sourceUrl: data.sourceUrl ?? null,
          storeId: data.storeId ?? null,
          pieceCount: data.pieceCount ?? null,
          brand: data.brand ?? null,
          year: data.year ?? null,
          theme: data.theme ?? null,
          description: data.description ?? null,
          dimensions: data.dimensions ?? null,
          releaseDate: data.releaseDate ?? null,
          retireDate: data.retireDate ?? null,
          notes: data.notes ?? null,
          condition: data.condition ?? null,
          completeness: data.completeness ?? null,
          buildStatus: data.buildStatus ?? 'not_started',
          purchasePrice: data.purchasePrice ?? null,
          purchaseTax: data.purchaseTax ?? null,
          purchaseShipping: data.purchaseShipping ?? null,
          purchaseDate: data.purchaseDate ?? null,
          quantity: data.quantity ?? 1,
          priority: data.priority ?? null,
          sortOrder: data.sortOrder ?? null,
          imageUrl: data.imageUrl ?? null,
          imageVariants: data.imageVariants ?? null,
        })
        .returning()

      return mapRowToSet(row, null)
    },

    async update(id: string, data: Record<string, unknown>): Promise<Result<Set, 'NOT_FOUND'>> {
      const [row] = await db
        .update(sets)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(sets.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToSet(row, null))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(sets).where(eq(sets.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async getMaxSortOrder(userId: string): Promise<number> {
      const result = await db
        .select({ maxSort: max(sets.sortOrder) })
        .from(sets)
        .where(and(eq(sets.userId, userId), eq(sets.status, 'wanted')))

      return result[0]?.maxSort ?? -1
    },

    async updateSortOrders(
      userId: string,
      items: Array<{ id: string; sortOrder: number }>,
    ): Promise<Result<number, 'VALIDATION_ERROR'>> {
      const itemIds = items.map(item => item.id)
      const existing = await db
        .select()
        .from(sets)
        .where(and(eq(sets.userId, userId), inArray(sets.id, itemIds)))

      if (existing.length !== itemIds.length) {
        return err('VALIDATION_ERROR')
      }

      await db.transaction(async tx => {
        for (const item of items) {
          await tx
            .update(sets)
            .set({ sortOrder: item.sortOrder, updatedAt: new Date() })
            .where(and(eq(sets.id, item.id), eq(sets.userId, userId)))
        }
      })

      return ok(items.length)
    },

    async verifyOwnership(userId: string, itemIds: string[]): Promise<boolean> {
      const existing = await db
        .select({ id: sets.id })
        .from(sets)
        .where(and(eq(sets.userId, userId), inArray(sets.id, itemIds)))

      return existing.length === itemIds.length
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Store Repository
// ─────────────────────────────────────────────────────────────────────────

export function createStoreRepository(db: NodePgDatabase<Schema>, schema: Schema): StoreRepository {
  const { stores } = schema

  return {
    async findAll(): Promise<Store[]> {
      const rows = await db.query.stores.findMany({
        orderBy: asc(stores.sortOrder),
      })
      return rows.map(r => ({
        id: r.id,
        name: r.name,
        url: r.url,
        sortOrder: r.sortOrder,
        createdAt: r.createdAt,
      }))
    },

    async findById(id: string): Promise<Result<Store, 'NOT_FOUND'>> {
      const row = await db.query.stores.findFirst({
        where: eq(stores.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok({
        id: row.id,
        name: row.name,
        url: row.url,
        sortOrder: row.sortOrder,
        createdAt: row.createdAt,
      })
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Set Image Repository (deprecated — migrating to entity_files)
// ─────────────────────────────────────────────────────────────────────────

export function createSetImageRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): SetImageRepository {
  const { setImages } = schema

  return {
    async findById(id: string): Promise<Result<SetImage, 'NOT_FOUND'>> {
      const row = (await db.query.setImages.findFirst({
        where: eq(setImages.id, id),
      })) as typeof setImages.$inferSelect | undefined

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToSetImage(row))
    },

    async findBySetId(setId: string): Promise<SetImage[]> {
      const rows = (await db.query.setImages.findMany({
        where: eq(setImages.setId, setId),
        orderBy: setImages.position,
      })) as (typeof setImages.$inferSelect)[]

      return rows.map(mapRowToSetImage)
    },

    async insert(data): Promise<SetImage> {
      const [row] = await db
        .insert(setImages)
        .values({
          setId: data.setId,
          imageUrl: data.imageUrl,
          thumbnailUrl: data.thumbnailUrl ?? null,
          position: data.position ?? 0,
        })
        .returning()

      return mapRowToSetImage(row)
    },

    async update(
      id: string,
      data: Partial<UpdateSetImageInput>,
    ): Promise<Result<SetImage, 'NOT_FOUND'>> {
      const updateData: Record<string, unknown> = {}
      if (data.position !== undefined) updateData.position = data.position

      if (Object.keys(updateData).length === 0) {
        return this.findById(id)
      }

      const [row] = await db
        .update(setImages)
        .set(updateData)
        .where(eq(setImages.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToSetImage(row))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(setImages).where(eq(setImages.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async deleteBySetId(setId: string): Promise<void> {
      await db.delete(setImages).where(eq(setImages.setId, setId))
    },

    async getNextPosition(setId: string): Promise<number> {
      const result = await db
        .select({ maxPos: sql<number>`COALESCE(MAX(position), -1)::int` })
        .from(setImages)
        .where(eq(setImages.setId, setId))

      return (result[0]?.maxPos ?? -1) + 1
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function mapRowToSet(row: Record<string, unknown>, storeName: string | null): Set {
  const r = row as typeof import('@repo/db').sets.$inferSelect
  return {
    id: r.id,
    userId: r.userId,
    status: r.status as Set['status'],
    statusChangedAt: r.statusChangedAt ?? null,
    title: r.title,
    setNumber: r.setNumber ?? null,
    sourceUrl: r.sourceUrl ?? null,
    storeId: r.storeId ?? null,
    storeName: storeName ?? null,
    pieceCount: r.pieceCount ?? null,
    brand: r.brand ?? null,
    year: r.year ?? null,
    theme: r.theme ?? null,
    description: r.description ?? null,
    dimensions: r.dimensions ?? null,
    releaseDate: r.releaseDate ?? null,
    retireDate: r.retireDate ?? null,
    notes: r.notes ?? null,
    condition: (r.condition as Set['condition']) ?? null,
    completeness: (r.completeness as Set['completeness']) ?? null,
    buildStatus: (r.buildStatus as Set['buildStatus']) ?? null,
    purchasePrice: r.purchasePrice ?? null,
    purchaseTax: r.purchaseTax ?? null,
    purchaseShipping: r.purchaseShipping ?? null,
    purchaseDate: r.purchaseDate ?? null,
    quantity: r.quantity,
    priority: r.priority ?? null,
    sortOrder: r.sortOrder ?? null,
    imageUrl: toCloudFrontUrl(r.imageUrl),
    imageVariants: (r.imageVariants as Set['imageVariants']) ?? null,
    tags: r.tags ?? [],
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function mapRowToSetImage(row: {
  id: string
  setId: string
  imageUrl: string
  thumbnailUrl: string | null
  position: number
  createdAt: Date
}): SetImage {
  return {
    id: row.id,
    setId: row.setId,
    imageUrl: row.imageUrl,
    thumbnailUrl: row.thumbnailUrl,
    position: row.position,
    createdAt: row.createdAt,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Parts Lookup (bridges sets → moc_instructions → moc_parts)
// ─────────────────────────────────────────────────────────────────────────

export interface SetPartsListData {
  id: string
  title: string
  totalPartsCount: string | null
  parts: Array<{
    id: string
    partId: string
    partName: string
    quantity: number
    color: string
  }>
}

export function createPartsLookup(db: NodePgDatabase<Schema>, schema: Schema) {
  const { sets, mocInstructions, mocPartsLists, mocParts } = schema

  return {
    async findPartsForSet(
      setId: string,
    ): Promise<Result<{ partsLists: SetPartsListData[] }, 'NOT_FOUND' | 'NO_MOC'>> {
      // 1. Get the set to find its setNumber
      const setRow = await db
        .select({ setNumber: sets.setNumber })
        .from(sets)
        .where(eq(sets.id, setId))
        .limit(1)

      if (!setRow[0] || !setRow[0].setNumber) {
        return err('NOT_FOUND')
      }

      // 2. Find matching moc_instructions by mocId
      const mocRow = await db
        .select({ id: mocInstructions.id })
        .from(mocInstructions)
        .where(eq(mocInstructions.mocId, setRow[0].setNumber))
        .limit(1)

      if (!mocRow[0]) {
        return err('NO_MOC')
      }

      const mocId = mocRow[0].id

      // 3. Get parts lists with their parts
      const lists = await db
        .select({
          id: mocPartsLists.id,
          title: mocPartsLists.title,
          totalPartsCount: mocPartsLists.totalPartsCount,
        })
        .from(mocPartsLists)
        .where(eq(mocPartsLists.mocId, mocId))

      const result: SetPartsListData[] = []

      for (const list of lists) {
        const parts = await db
          .select({
            id: mocParts.id,
            partId: mocParts.partId,
            partName: mocParts.partName,
            quantity: mocParts.quantity,
            color: mocParts.color,
          })
          .from(mocParts)
          .where(eq(mocParts.partsListId, list.id))

        result.push({
          id: list.id,
          title: list.title,
          totalPartsCount: list.totalPartsCount,
          parts,
        })
      }

      return ok({ partsLists: result })
    },
  }
}

import { eq, and, desc, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err, paginate } from '@repo/api-core'
import type * as schema from '../../db/schema.js'
import type { MocRepository, PartsListRepository, PartRepository } from './ports.js'
import type {
  PartsList,
  Part,
  CreatePartsListInput,
  UpdatePartsListInput,
  CreatePartInput,
  UpdatePartInput,
} from './types.js'

type Schema = typeof schema

/**
 * Create a MocRepository implementation using Drizzle
 */
export function createMocRepository(db: NodePgDatabase<Schema>, schema: Schema): MocRepository {
  const { mocInstructions } = schema

  return {
    async verifyOwnership(
      mocId: string,
      userId: string,
    ): Promise<Result<{ id: string }, 'NOT_FOUND'>> {
      const row = await db.query.mocInstructions.findFirst({
        where: and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)),
        columns: { id: true },
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok({ id: row.id })
    },
  }
}

/**
 * Create a PartsListRepository implementation using Drizzle
 */
export function createPartsListRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): PartsListRepository {
  const { mocPartsLists, mocInstructions } = schema

  return {
    async findById(id: string): Promise<Result<PartsList, 'NOT_FOUND'>> {
      const row = await db.query.mocPartsLists.findFirst({
        where: eq(mocPartsLists.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToPartsList(row))
    },

    async findByIdWithParts(
      id: string,
    ): Promise<Result<PartsList & { parts: Part[] }, 'NOT_FOUND'>> {
      const row = await db.query.mocPartsLists.findFirst({
        where: eq(mocPartsLists.id, id),
        with: {
          parts: true,
        },
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok({
        ...mapRowToPartsList(row),
        parts: row.parts.map(mapRowToPart),
      })
    },

    async findByMocId(
      mocId: string,
      pagination: PaginationInput,
    ): Promise<PaginatedResult<PartsList>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const rows = await db.query.mocPartsLists.findMany({
        where: eq(mocPartsLists.mocId, mocId),
        orderBy: desc(mocPartsLists.createdAt),
        limit,
        offset,
      })

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(mocPartsLists)
        .where(eq(mocPartsLists.mocId, mocId))

      const total = countResult[0]?.count ?? 0

      return paginate(rows.map(mapRowToPartsList), total, pagination)
    },

    async findByUserId(userId: string): Promise<PartsList[]> {
      // Get all MOCs for this user first
      const userMocs = await db
        .select({ id: mocInstructions.id })
        .from(mocInstructions)
        .where(eq(mocInstructions.userId, userId))

      if (userMocs.length === 0) {
        return []
      }

      const mocIds = userMocs.map(moc => moc.id)

      const rows = await db
        .select()
        .from(mocPartsLists)
        .where(sql`${mocPartsLists.mocId} = ANY(${mocIds})`)
        .orderBy(desc(mocPartsLists.createdAt))

      return rows.map(mapRowToPartsList)
    },

    async insert(mocId: string, data: CreatePartsListInput): Promise<PartsList> {
      const [row] = await db
        .insert(mocPartsLists)
        .values({
          mocId,
          title: data.title,
          description: data.description ?? null,
          notes: data.notes ?? null,
          built: false,
          purchased: false,
          totalPartsCount: '0',
          acquiredPartsCount: '0',
        })
        .returning()

      return mapRowToPartsList(row)
    },

    async update(
      id: string,
      data: Partial<UpdatePartsListInput>,
    ): Promise<Result<PartsList, 'NOT_FOUND'>> {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.notes !== undefined) updateData.notes = data.notes
      if (data.built !== undefined) updateData.built = data.built
      if (data.purchased !== undefined) updateData.purchased = data.purchased
      if (data.costEstimate !== undefined) updateData.costEstimate = data.costEstimate
      if (data.actualCost !== undefined) updateData.actualCost = data.actualCost

      const [row] = await db
        .update(mocPartsLists)
        .set(updateData)
        .where(eq(mocPartsLists.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToPartsList(row))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(mocPartsLists).where(eq(mocPartsLists.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async getSummaryByUserId(userId: string): Promise<{
      totalPartsLists: number
      byStatus: { planning: number; in_progress: number; completed: number }
      totalParts: number
      totalAcquiredParts: number
    }> {
      // Get all MOCs for this user
      const userMocs = await db
        .select({ id: mocInstructions.id })
        .from(mocInstructions)
        .where(eq(mocInstructions.userId, userId))

      if (userMocs.length === 0) {
        return {
          totalPartsLists: 0,
          byStatus: { planning: 0, in_progress: 0, completed: 0 },
          totalParts: 0,
          totalAcquiredParts: 0,
        }
      }

      const mocIds = userMocs.map(moc => moc.id)

      // Get aggregated stats
      const summaryResult = await db
        .select({
          built: mocPartsLists.built,
          purchased: mocPartsLists.purchased,
          count: sql<number>`count(*)::int`,
          totalParts: sql<number>`sum(COALESCE(${mocPartsLists.totalPartsCount}::int, 0))::int`,
          acquiredParts: sql<number>`sum(COALESCE(${mocPartsLists.acquiredPartsCount}::int, 0))::int`,
        })
        .from(mocPartsLists)
        .where(sql`${mocPartsLists.mocId} = ANY(${mocIds})`)
        .groupBy(mocPartsLists.built, mocPartsLists.purchased)

      const byStatus = { planning: 0, in_progress: 0, completed: 0 }
      let totalPartsLists = 0
      let totalParts = 0
      let totalAcquiredParts = 0

      for (const row of summaryResult) {
        let status: 'planning' | 'in_progress' | 'completed'
        if (row.purchased) {
          status = 'completed'
        } else if (row.built) {
          status = 'in_progress'
        } else {
          status = 'planning'
        }

        byStatus[status] += Number(row.count)
        totalPartsLists += Number(row.count)
        totalParts += Number(row.totalParts || 0)
        totalAcquiredParts += Number(row.acquiredParts || 0)
      }

      return { totalPartsLists, byStatus, totalParts, totalAcquiredParts }
    },
  }
}

/**
 * Create a PartRepository implementation using Drizzle
 */
export function createPartRepository(db: NodePgDatabase<Schema>, schema: Schema): PartRepository {
  const { mocParts } = schema

  return {
    async findById(id: string): Promise<Result<Part, 'NOT_FOUND'>> {
      const row = await db.query.mocParts.findFirst({
        where: eq(mocParts.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToPart(row))
    },

    async findByPartsListId(partsListId: string): Promise<Part[]> {
      const rows = await db.query.mocParts.findMany({
        where: eq(mocParts.partsListId, partsListId),
      })

      return rows.map(mapRowToPart)
    },

    async insert(partsListId: string, data: CreatePartInput): Promise<Part> {
      const [row] = await db
        .insert(mocParts)
        .values({
          partsListId,
          partId: data.partId,
          partName: data.partName,
          quantity: data.quantity,
          color: data.color,
        })
        .returning()

      return mapRowToPart(row)
    },

    async insertMany(partsListId: string, data: CreatePartInput[]): Promise<Part[]> {
      if (data.length === 0) {
        return []
      }

      const rows = await db
        .insert(mocParts)
        .values(
          data.map(part => ({
            partsListId,
            partId: part.partId,
            partName: part.partName,
            quantity: part.quantity,
            color: part.color,
          })),
        )
        .returning()

      return rows.map(mapRowToPart)
    },

    async update(id: string, data: Partial<UpdatePartInput>): Promise<Result<Part, 'NOT_FOUND'>> {
      const updateData: Record<string, unknown> = {}

      if (data.partName !== undefined) updateData.partName = data.partName
      if (data.quantity !== undefined) updateData.quantity = data.quantity
      if (data.color !== undefined) updateData.color = data.color

      const [row] = await db.update(mocParts).set(updateData).where(eq(mocParts.id, id)).returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToPart(row))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(mocParts).where(eq(mocParts.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async deleteByPartsListId(partsListId: string): Promise<void> {
      await db.delete(mocParts).where(eq(mocParts.partsListId, partsListId))
    },

    async countByPartsListId(partsListId: string): Promise<number> {
      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(mocParts)
        .where(eq(mocParts.partsListId, partsListId))

      return result[0]?.count ?? 0
    },

    async sumQuantityByPartsListId(partsListId: string): Promise<number> {
      const result = await db
        .select({ sum: sql<number>`COALESCE(sum(${mocParts.quantity}), 0)::int` })
        .from(mocParts)
        .where(eq(mocParts.partsListId, partsListId))

      return result[0]?.sum ?? 0
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function mapRowToPartsList(row: {
  id: string
  mocId: string
  fileId: string | null
  title: string
  description: string | null
  built: boolean | null
  purchased: boolean | null
  inventoryPercentage: string | null
  totalPartsCount: string | null
  acquiredPartsCount: string | null
  costEstimate: string | null
  actualCost: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}): PartsList {
  return {
    id: row.id,
    mocId: row.mocId,
    fileId: row.fileId,
    title: row.title,
    description: row.description,
    built: row.built ?? false,
    purchased: row.purchased ?? false,
    inventoryPercentage: row.inventoryPercentage,
    totalPartsCount: row.totalPartsCount,
    acquiredPartsCount: row.acquiredPartsCount,
    costEstimate: row.costEstimate,
    actualCost: row.actualCost,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapRowToPart(row: {
  id: string
  partsListId: string
  partId: string
  partName: string
  quantity: number
  color: string
  createdAt: Date
}): Part {
  return {
    id: row.id,
    partsListId: row.partsListId,
    partId: row.partId,
    partName: row.partName,
    quantity: row.quantity,
    color: row.color,
    createdAt: row.createdAt,
  }
}

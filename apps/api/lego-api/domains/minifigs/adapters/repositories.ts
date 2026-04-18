import { eq, and, ilike, or, sql, desc, asc, inArray } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err, paginate } from '@repo/api-core'
import type * as schema from '@repo/db'
import type {
  MinifigInstanceRepository,
  MinifigArchetypeRepository,
  MinifigVariantRepository,
} from '../ports/index.js'
import type { MinifigInstance, MinifigArchetype, MinifigVariant } from '../types.js'

type Schema = typeof schema

// ─────────────────────────────────────────────────────────────────────────
// Instance Repository
// ─────────────────────────────────────────────────────────────────────────

export function createMinifigInstanceRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): MinifigInstanceRepository {
  const { minifigInstances, minifigVariants } = schema

  return {
    async findById(id: string): Promise<Result<MinifigInstance, 'NOT_FOUND'>> {
      const rows = await db
        .select({
          instance: minifigInstances,
          variant: minifigVariants,
        })
        .from(minifigInstances)
        .leftJoin(minifigVariants, eq(minifigInstances.variantId, minifigVariants.id))
        .where(eq(minifigInstances.id, id))
        .limit(1)

      if (!rows[0]) {
        return err('NOT_FOUND')
      }

      const tags = await resolveTagsForEntity(db, schema, id)
      return ok(mapRowToInstance(rows[0].instance, rows[0].variant, tags))
    },

    async findByUserId(
      userId: string,
      pagination: PaginationInput,
      filters?,
    ): Promise<PaginatedResult<MinifigInstance>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      const conditions = [eq(minifigInstances.userId, userId)]

      if (filters?.status) {
        conditions.push(eq(minifigInstances.status, filters.status))
      }

      if (filters?.condition) {
        conditions.push(eq(minifigInstances.condition, filters.condition))
      }

      if (filters?.sourceType) {
        conditions.push(eq(minifigInstances.sourceType, filters.sourceType))
      }

      if (filters?.search) {
        const pattern = `%${filters.search}%`
        conditions.push(
          or(
            ilike(minifigInstances.displayName, pattern),
            ilike(minifigInstances.notes, pattern),
            ilike(minifigInstances.purpose, pattern),
            ilike(minifigInstances.plannedUse, pattern),
          )!,
        )
      }

      if (filters?.tags && filters.tags.length > 0) {
        conditions.push(
          sql`${minifigInstances.id} IN (
            SELECT et.entity_id FROM entity_tags et
            JOIN tags t ON t.id = et.tag_id
            WHERE et.entity_type = 'minifig'
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

      const sortColumn =
        {
          createdAt: minifigInstances.createdAt,
          displayName: minifigInstances.displayName,
          purchasePrice: minifigInstances.purchasePrice,
          purchaseDate: minifigInstances.purchaseDate,
          condition: minifigInstances.condition,
        }[sortMode] ?? minifigInstances.createdAt

      const orderByClause = orderDirection === 'desc' ? desc(sortColumn) : asc(sortColumn)

      const rows = await db
        .select({
          instance: minifigInstances,
          variant: minifigVariants,
        })
        .from(minifigInstances)
        .leftJoin(minifigVariants, eq(minifigInstances.variantId, minifigVariants.id))
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset)

      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(minifigInstances)
        .where(and(...conditions))

      const total = countResult[0]?.count ?? 0

      const entityIds = rows.map(r => (r.instance as { id: string }).id)
      const tagMap = await resolveTagsForEntities(db, schema, entityIds)

      return paginate(
        rows.map(r => {
          const instanceId = (r.instance as { id: string }).id
          return mapRowToInstance(r.instance, r.variant, tagMap.get(instanceId) ?? [])
        }),
        total,
        pagination,
      )
    },

    async insert(data): Promise<MinifigInstance> {
      const [row] = await db
        .insert(minifigInstances)
        .values({
          userId: data.userId,
          variantId: data.variantId ?? null,
          displayName: data.displayName,
          status: data.status,
          condition: data.condition ?? null,
          sourceType: data.sourceType ?? null,
          sourceSetId: data.sourceSetId ?? null,
          isCustom: data.isCustom ?? false,
          purchasePrice: data.purchasePrice ?? null,
          purchaseTax: data.purchaseTax ?? null,
          purchaseShipping: data.purchaseShipping ?? null,
          purchaseDate: data.purchaseDate ?? null,
          purpose: data.purpose ?? null,
          plannedUse: data.plannedUse ?? null,
          notes: data.notes ?? null,
          imageUrl: data.imageUrl ?? null,
          sortOrder: data.sortOrder ?? null,
        })
        .returning()

      return mapRowToInstance(row, null, [])
    },

    async update(
      id: string,
      data: Record<string, unknown>,
    ): Promise<Result<MinifigInstance, 'NOT_FOUND'>> {
      const [row] = await db
        .update(minifigInstances)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(minifigInstances.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      const tags = await resolveTagsForEntity(db, schema, id)
      return ok(mapRowToInstance(row, null, tags))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(minifigInstances).where(eq(minifigInstances.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Archetype Repository
// ─────────────────────────────────────────────────────────────────────────

export function createMinifigArchetypeRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): MinifigArchetypeRepository {
  const { minifigArchetypes } = schema

  return {
    async findAll(userId: string, search?: string): Promise<MinifigArchetype[]> {
      const conditions = [eq(minifigArchetypes.userId, userId)]

      if (search) {
        conditions.push(ilike(minifigArchetypes.name, `%${search}%`))
      }

      const rows = await db
        .select()
        .from(minifigArchetypes)
        .where(and(...conditions))
        .orderBy(asc(minifigArchetypes.name))

      return rows.map(mapRowToArchetype)
    },

    async findById(id: string): Promise<Result<MinifigArchetype, 'NOT_FOUND'>> {
      const row = await db.query.minifigArchetypes.findFirst({
        where: eq(minifigArchetypes.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToArchetype(row))
    },

    async insert(data): Promise<MinifigArchetype> {
      const [row] = await db
        .insert(minifigArchetypes)
        .values({
          userId: data.userId,
          name: data.name,
          description: data.description ?? null,
          imageUrl: data.imageUrl ?? null,
        })
        .returning()

      return mapRowToArchetype(row)
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Variant Repository
// ─────────────────────────────────────────────────────────────────────────

export function createMinifigVariantRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): MinifigVariantRepository {
  const { minifigVariants } = schema

  return {
    async findAll(
      userId: string,
      filters?: { archetypeId?: string; search?: string },
    ): Promise<MinifigVariant[]> {
      const conditions = [eq(minifigVariants.userId, userId)]

      if (filters?.archetypeId) {
        conditions.push(eq(minifigVariants.archetypeId, filters.archetypeId))
      }

      if (filters?.search) {
        const pattern = `%${filters.search}%`
        conditions.push(
          or(ilike(minifigVariants.name, pattern), ilike(minifigVariants.legoNumber, pattern))!,
        )
      }

      const rows = await db
        .select()
        .from(minifigVariants)
        .where(and(...conditions))
        .orderBy(asc(minifigVariants.name))

      return rows.map(mapRowToVariant)
    },

    async findById(id: string): Promise<Result<MinifigVariant, 'NOT_FOUND'>> {
      const row = await db.query.minifigVariants.findFirst({
        where: eq(minifigVariants.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToVariant(row))
    },

    async findByLegoNumber(
      userId: string,
      legoNumber: string,
    ): Promise<Result<MinifigVariant, 'NOT_FOUND'>> {
      const rows = await db
        .select()
        .from(minifigVariants)
        .where(and(eq(minifigVariants.userId, userId), eq(minifigVariants.legoNumber, legoNumber)))
        .limit(1)

      if (!rows[0]) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToVariant(rows[0]))
    },

    async insert(data): Promise<MinifigVariant> {
      const [row] = await db
        .insert(minifigVariants)
        .values({
          userId: data.userId,
          archetypeId: data.archetypeId ?? null,
          name: data.name ?? null,
          legoNumber: data.legoNumber ?? null,
          theme: data.theme ?? null,
          subtheme: data.subtheme ?? null,
          year: data.year ?? null,
          cmfSeries: data.cmfSeries ?? null,
          imageUrl: data.imageUrl ?? null,
          weight: data.weight ?? null,
          dimensions: data.dimensions ?? null,
          partsCount: data.partsCount ?? null,
          parts: data.parts ?? null,
          appearsInSets: data.appearsInSets ?? null,
        })
        .returning()

      return mapRowToVariant(row)
    },

    async update(
      id: string,
      data: Record<string, unknown>,
    ): Promise<Result<MinifigVariant, 'NOT_FOUND'>> {
      const [row] = await db
        .update(minifigVariants)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(minifigVariants.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToVariant(row))
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Tag Helpers
// ─────────────────────────────────────────────────────────────────────────

async function resolveTagsForEntity(
  db: NodePgDatabase<Schema>,
  schema: Schema,
  entityId: string,
): Promise<string[]> {
  const rows = await db
    .select({ name: schema.tags.name })
    .from(schema.entityTags)
    .innerJoin(schema.tags, eq(schema.entityTags.tagId, schema.tags.id))
    .where(
      and(eq(schema.entityTags.entityId, entityId), eq(schema.entityTags.entityType, 'minifig')),
    )
    .orderBy(asc(schema.tags.name))

  return rows.map(r => r.name)
}

async function resolveTagsForEntities(
  db: NodePgDatabase<Schema>,
  schema: Schema,
  entityIds: string[],
): Promise<Map<string, string[]>> {
  if (entityIds.length === 0) return new Map()

  const rows = await db
    .select({
      entityId: schema.entityTags.entityId,
      name: schema.tags.name,
    })
    .from(schema.entityTags)
    .innerJoin(schema.tags, eq(schema.entityTags.tagId, schema.tags.id))
    .where(
      and(
        inArray(schema.entityTags.entityId, entityIds),
        eq(schema.entityTags.entityType, 'minifig'),
      ),
    )
    .orderBy(asc(schema.tags.name))

  const tagMap = new Map<string, string[]>()
  for (const row of rows) {
    const existing = tagMap.get(row.entityId) ?? []
    existing.push(row.name)
    tagMap.set(row.entityId, existing)
  }
  return tagMap
}

export async function syncTagsForEntity(
  db: NodePgDatabase<Schema>,
  schema: Schema,
  entityId: string,
  tagNames: string[],
): Promise<void> {
  // Normalize tag names
  const normalized = [...new Set(tagNames.map(t => t.toLowerCase().trim()))].filter(Boolean)

  // Delete existing entity_tags for this minifig
  await db
    .delete(schema.entityTags)
    .where(
      and(eq(schema.entityTags.entityId, entityId), eq(schema.entityTags.entityType, 'minifig')),
    )

  if (normalized.length === 0) return

  // Upsert tags (insert if not exists)
  await db
    .insert(schema.tags)
    .values(normalized.map(name => ({ name })))
    .onConflictDoNothing({ target: schema.tags.name })

  // Fetch tag IDs
  const tagRows = await db
    .select({ id: schema.tags.id, name: schema.tags.name })
    .from(schema.tags)
    .where(inArray(schema.tags.name, normalized))

  // Insert entity_tags
  if (tagRows.length > 0) {
    await db
      .insert(schema.entityTags)
      .values(
        tagRows.map(t => ({
          tagId: t.id,
          entityId,
          entityType: 'minifig',
        })),
      )
      .onConflictDoNothing()
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function mapRowToInstance(
  row: Record<string, unknown>,
  variantRow: Record<string, unknown> | null,
  tags: string[] = [],
): MinifigInstance {
  const r = row as typeof import('@repo/db').minifigInstances.$inferSelect
  return {
    id: r.id,
    userId: r.userId,
    variantId: r.variantId ?? null,
    displayName: r.displayName,
    status: r.status as MinifigInstance['status'],
    condition: (r.condition as MinifigInstance['condition']) ?? null,
    sourceType: (r.sourceType as MinifigInstance['sourceType']) ?? null,
    sourceSetId: r.sourceSetId ?? null,
    isCustom: r.isCustom,
    quantityOwned: r.quantityOwned,
    quantityWanted: r.quantityWanted,
    purchasePrice: r.purchasePrice ?? null,
    purchaseTax: r.purchaseTax ?? null,
    purchaseShipping: r.purchaseShipping ?? null,
    purchaseDate: r.purchaseDate ?? null,
    purpose: r.purpose ?? null,
    plannedUse: r.plannedUse ?? null,
    notes: r.notes ?? null,
    imageUrl: r.imageUrl ?? null,
    sortOrder: r.sortOrder ?? null,
    tags,
    variant: variantRow
      ? mapRowToVariant(variantRow as typeof import('@repo/db').minifigVariants.$inferSelect)
      : null,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }
}

function mapRowToArchetype(
  row: typeof import('@repo/db').minifigArchetypes.$inferSelect,
): MinifigArchetype {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description ?? null,
    imageUrl: row.imageUrl ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapRowToVariant(
  row: typeof import('@repo/db').minifigVariants.$inferSelect,
): MinifigVariant {
  return {
    id: row.id,
    userId: row.userId,
    archetypeId: row.archetypeId ?? null,
    name: row.name ?? null,
    legoNumber: row.legoNumber ?? null,
    theme: row.theme ?? null,
    subtheme: row.subtheme ?? null,
    year: row.year ?? null,
    cmfSeries: row.cmfSeries ?? null,
    imageUrl: row.imageUrl ?? null,
    weight: row.weight ?? null,
    dimensions: row.dimensions ?? null,
    partsCount: row.partsCount ?? null,
    parts: (row.parts as MinifigVariant['parts']) ?? null,
    appearsInSets: (row.appearsInSets as MinifigVariant['appearsInSets']) ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

import { and, asc, count, desc, eq, sql } from 'drizzle-orm'
import { getDbAsync } from '@/core/database/client'
import { mocInstructions, setImages } from '@/core/database/schema'
import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '@/core/utils/responses'
import {
  SetListQuerySchema,
  SetListResponseSchema,
  SetSchema,
  CreateSetSchema,
  UpdateSetSchema,
  type SetListQuery,
  type CreateSetInput,
  type UpdateSetInput,
} from '../schemas'

export async function listSets(
  userId: string,
  rawQuery: Record<string, string | undefined>,
) {
  const parsed = SetListQuerySchema.safeParse(rawQuery)
  if (!parsed.success) {
    throw new ValidationError('Invalid query parameters', {
      errors: parsed.error.flatten(),
    })
  }
  const query = parsed.data as SetListQuery

  const db = await getDbAsync()
  const conditions = [eq(mocInstructions.userId, userId), eq(mocInstructions.type, 'set')]

  if (query.search) {
    const searchPattern = `%${query.search}%`
    conditions.push(
      sql`(${mocInstructions.title} ILIKE ${searchPattern} OR ${mocInstructions.setNumber} ILIKE ${searchPattern})`,
    )
  }

  if (query.theme) {
    conditions.push(eq(mocInstructions.theme, query.theme))
  }

  if (query.isBuilt !== undefined) {
    conditions.push(eq(mocInstructions.isBuilt, query.isBuilt))
  }

  if (query.tags && query.tags.length) {
    conditions.push(sql`${mocInstructions.tags} ?| ${query.tags}`)
  }

  const orderColumn =
    query.sortField === 'title'
      ? mocInstructions.title
      : query.sortField === 'partsCount'
      ? mocInstructions.partsCount
      : query.sortField === 'purchaseDate'
      ? mocInstructions.purchaseDate
      : query.sortField === 'purchasePrice'
      ? mocInstructions.purchasePrice
      : mocInstructions.createdAt

  const orderDirection = query.sortDirection === 'asc' ? asc : desc

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(mocInstructions)
      .where(and(...conditions))
      .orderBy(orderDirection(orderColumn))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit),
    db.select({ count: count() }).from(mocInstructions).where(and(...conditions)),
  ])

  const setIds = rows.map(r => r.id)
  const images =
    setIds.length > 0
      ? await db
          .select()
          .from(setImages)
          .where(sql`${setImages.setId} = ANY(${setIds}::uuid[])`)
          .orderBy(asc(setImages.position))
      : []

  const imagesBySet = new Map<string, typeof images>()
  for (const img of images) {
    const arr = imagesBySet.get(img.setId) ?? []
    arr.push(img)
    imagesBySet.set(img.setId, arr)
  }

  const items = rows.map(row =>
    SetSchema.parse({
      ...row,
      images: (imagesBySet.get(row.id) ?? []).map(img => ({
        id: img.id,
        imageUrl: img.imageUrl,
        thumbnailUrl: img.thumbnailUrl,
        position: img.position,
      })),
    }),
  )

  const [themeRows, tagRows] = await Promise.all([
    db
      .select({ theme: mocInstructions.theme })
      .from(mocInstructions)
      .where(and(eq(mocInstructions.userId, userId), eq(mocInstructions.type, 'set')))
      .groupBy(mocInstructions.theme),
    db
      .select({ tags: mocInstructions.tags })
      .from(mocInstructions)
      .where(and(eq(mocInstructions.userId, userId), eq(mocInstructions.type, 'set'))),
  ])

  const availableThemes = Array.from(
    new Set(themeRows.map(r => r.theme).filter((t): t is string => !!t)),
  )

  const tagSet = new Set<string>()
  for (const row of tagRows) {
    for (const tag of row.tags ?? []) {
      tagSet.add(tag)
    }
  }

  const response = SetListResponseSchema.parse({
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: Number(totalRows[0]?.count ?? 0),
      totalPages: Math.max(
        1,
        Math.ceil(Number(totalRows[0]?.count ?? 0) / query.limit),
      ),
    },
    filters: {
      availableThemes,
      availableTags: Array.from(tagSet),
    },
  })

  return response
}

export async function getSetDetail(userId: string, setId: string) {
  const db = await getDbAsync()

  const [row] = await db
    .select()
    .from(mocInstructions)
    .where(
      and(
        eq(mocInstructions.id, setId),
        eq(mocInstructions.userId, userId),
        eq(mocInstructions.type, 'set'),
      ),
    )
    .limit(1)

  if (!row) {
    throw new NotFoundError('Set not found')
  }

  const images = await db
    .select()
    .from(setImages)
    .where(eq(setImages.setId, setId))
    .orderBy(asc(setImages.position))

  return SetSchema.parse({
    ...row,
    images: images.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      position: img.position,
    })),
  })
}

export async function createSet(userId: string, body: unknown) {
  const parsed = CreateSetSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Invalid Set data', {
      errors: parsed.error.flatten(),
    })
  }
  const input = parsed.data as CreateSetInput

  const db = await getDbAsync()
  const now = new Date()

  const [row] = await db
    .insert(mocInstructions)
    .values({
      id: sql`gen_random_uuid()`,
      userId,
      type: 'set',
      title: input.title,
      description: input.description ?? null,
      theme: input.theme ?? null,
      tags: input.tags ?? [],
      partsCount: input.partsCount ?? null,
      isBuilt: input.isBuilt ?? false,
      quantity: input.quantity ?? 1,
      brand: input.brand ?? null,
      setNumber: input.setNumber ?? null,
      releaseYear: input.releaseYear ?? null,
      retired: input.retired ?? null,
      store: input.store ?? null,
      sourceUrl: input.sourceUrl ?? null,
      purchasePrice: input.purchasePrice ?? null,
      tax: input.tax ?? null,
      shipping: input.shipping ?? null,
      purchaseDate: input.purchaseDate ? new Date(input.purchaseDate) : null,
      createdAt: now,
      updatedAt: now,
    })
    .returning()

  return SetSchema.parse({ ...row, images: [] })
}

export async function updateSet(userId: string, setId: string, body: unknown) {
  const parsed = UpdateSetSchema.safeParse(body)
  if (!parsed.success) {
    throw new ValidationError('Invalid Set update data', {
      errors: parsed.error.flatten(),
    })
  }
  const input = parsed.data as UpdateSetInput
  const db = await getDbAsync()

  const [existing] = await db
    .select({ userId: mocInstructions.userId, type: mocInstructions.type })
    .from(mocInstructions)
    .where(eq(mocInstructions.id, setId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Set not found')
  }
  if (existing.userId !== userId || existing.type !== 'set') {
    throw new ForbiddenError('Not authorized to update this set')
  }

  const now = new Date()

  const updatePayload: Record<string, unknown> = {
    ...input,
    updatedAt: now,
  }

  if (input.purchaseDate !== undefined) {
    updatePayload.purchaseDate = input.purchaseDate
      ? new Date(input.purchaseDate)
      : null
  }

  const [updated] = await db
    .update(mocInstructions)
    .set(updatePayload)
    .where(eq(mocInstructions.id, setId))
    .returning()

  const images = await db
    .select()
    .from(setImages)
    .where(eq(setImages.setId, setId))
    .orderBy(asc(setImages.position))

  return SetSchema.parse({
    ...updated,
    images: images.map(img => ({
      id: img.id,
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      position: img.position,
    })),
  })
}

export async function deleteSet(userId: string, setId: string) {
  const db = await getDbAsync()

  const [existing] = await db
    .select({ userId: mocInstructions.userId, type: mocInstructions.type })
    .from(mocInstructions)
    .where(eq(mocInstructions.id, setId))
    .limit(1)

  if (!existing) {
    throw new NotFoundError('Set not found')
  }
  if (existing.userId !== userId || existing.type !== 'set') {
    throw new ForbiddenError('Not authorized to delete this set')
  }

  const images = await db
    .select({ imageUrl: setImages.imageUrl, thumbnailUrl: setImages.thumbnailUrl })
    .from(setImages)
    .where(eq(setImages.setId, setId))

  await db.delete(mocInstructions).where(eq(mocInstructions.id, setId))

  return { imagesForCleanup: images }
}

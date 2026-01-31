import { eq, and, ilike, or, sql, desc, isNull } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Result, PaginatedResult, PaginationInput } from '@repo/api-core'
import { ok, err, paginate } from '@repo/api-core'
import type * as schema from '@repo/database-schema'
import type { InstructionRepository, FileRepository } from '../ports/index.js'
import type { MocInstructions, MocFile, UpdateMocInput } from '../types.js'

type Schema = typeof schema

/**
 * Create an InstructionRepository implementation using Drizzle
 */
export function createInstructionRepository(
  db: NodePgDatabase<Schema>,
  schema: Schema,
): InstructionRepository {
  const { mocInstructions } = schema

  return {
    async findById(id: string): Promise<Result<MocInstructions, 'NOT_FOUND'>> {
      const row = await db.query.mocInstructions.findFirst({
        where: eq(mocInstructions.id, id),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToMoc(row))
    },

    async findByUserId(
      userId: string,
      pagination: PaginationInput,
      filters?: {
        type?: 'moc' | 'set'
        status?: string
        theme?: string
        search?: string
      },
    ): Promise<PaginatedResult<MocInstructions>> {
      const { page, limit } = pagination
      const offset = (page - 1) * limit

      // Build conditions
      const conditions = [eq(mocInstructions.userId, userId)]

      if (filters?.type) {
        conditions.push(eq(mocInstructions.type, filters.type))
      }

      if (filters?.status) {
        conditions.push(eq(mocInstructions.status, filters.status))
      }

      if (filters?.theme) {
        conditions.push(eq(mocInstructions.theme, filters.theme))
      }

      if (filters?.search) {
        const searchPattern = `%${filters.search}%`
        conditions.push(
          or(
            ilike(mocInstructions.title, searchPattern),
            ilike(mocInstructions.description, searchPattern),
            ilike(mocInstructions.author, searchPattern),
          )!,
        )
      }

      // Get items
      const rows = await db.query.mocInstructions.findMany({
        where: and(...conditions),
        orderBy: desc(mocInstructions.createdAt),
        limit,
        offset,
      })

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(mocInstructions)
        .where(and(...conditions))

      const total = countResult[0]?.count ?? 0

      return paginate(rows.map(mapRowToMoc), total, pagination)
    },

    async existsByUserAndTitle(
      userId: string,
      title: string,
      excludeId?: string,
    ): Promise<boolean> {
      const conditions = [eq(mocInstructions.userId, userId), eq(mocInstructions.title, title)]

      if (excludeId) {
        conditions.push(sql`${mocInstructions.id} != ${excludeId}`)
      }

      const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(mocInstructions)
        .where(and(...conditions))

      return (result[0]?.count ?? 0) > 0
    },

    async insert(data): Promise<MocInstructions> {
      const [row] = await db
        .insert(mocInstructions)
        .values({
          userId: data.userId,
          title: data.title,
          description: data.description ?? null,
          type: data.type,
          mocId: data.mocId ?? null,
          slug: data.slug ?? null,
          author: data.author ?? null,
          partsCount: data.partsCount ?? null,
          minifigCount: data.minifigCount ?? null,
          theme: data.theme ?? null,
          themeId: data.themeId ?? null,
          subtheme: data.subtheme ?? null,
          uploadedDate: data.uploadedDate ?? null,
          brand: data.brand ?? null,
          setNumber: data.setNumber ?? null,
          releaseYear: data.releaseYear ?? null,
          retired: data.retired ?? null,
          designer: data.designer ?? null,
          dimensions: data.dimensions ?? null,
          instructionsMetadata: data.instructionsMetadata ?? null,
          features: data.features ?? null,
          descriptionHtml: data.descriptionHtml ?? null,
          shortDescription: data.shortDescription ?? null,
          difficulty: data.difficulty ?? null,
          buildTimeHours: data.buildTimeHours ?? null,
          ageRecommendation: data.ageRecommendation ?? null,
          status: data.status ?? 'draft',
          visibility: data.visibility ?? 'private',
          tags: data.tags ?? null,
          thumbnailUrl: data.thumbnailUrl ?? null,
          totalPieceCount: data.totalPieceCount ?? null,
        })
        .returning()

      return mapRowToMoc(row)
    },

    async update(
      id: string,
      data: Partial<UpdateMocInput>,
    ): Promise<Result<MocInstructions, 'NOT_FOUND'>> {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (data.title !== undefined) updateData.title = data.title
      if (data.description !== undefined) updateData.description = data.description
      if (data.type !== undefined) updateData.type = data.type
      if (data.author !== undefined) updateData.author = data.author
      if (data.partsCount !== undefined) updateData.partsCount = data.partsCount
      if (data.minifigCount !== undefined) updateData.minifigCount = data.minifigCount
      if (data.theme !== undefined) updateData.theme = data.theme
      if (data.subtheme !== undefined) updateData.subtheme = data.subtheme
      if (data.brand !== undefined) updateData.brand = data.brand
      if (data.setNumber !== undefined) updateData.setNumber = data.setNumber
      if (data.releaseYear !== undefined) updateData.releaseYear = data.releaseYear
      if (data.tags !== undefined) updateData.tags = data.tags
      if (data.difficulty !== undefined) updateData.difficulty = data.difficulty
      if (data.buildTimeHours !== undefined) updateData.buildTimeHours = data.buildTimeHours
      if (data.ageRecommendation !== undefined)
        updateData.ageRecommendation = data.ageRecommendation
      if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl
      if (data.status !== undefined) updateData.status = data.status
      if (data.visibility !== undefined) updateData.visibility = data.visibility

      // Handle publish date
      if (data.status === 'published' && data.visibility === 'public') {
        updateData.publishedAt = new Date()
      }

      const [row] = await db
        .update(mocInstructions)
        .set(updateData)
        .where(eq(mocInstructions.id, id))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToMoc(row))
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(mocInstructions).where(eq(mocInstructions.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },
  }
}

/**
 * Create a FileRepository implementation using Drizzle
 */
export function createFileRepository(db: NodePgDatabase<Schema>, schema: Schema): FileRepository {
  const { mocFiles } = schema

  return {
    async findById(id: string): Promise<Result<MocFile, 'NOT_FOUND'>> {
      const row = await db.query.mocFiles.findFirst({
        where: and(eq(mocFiles.id, id), isNull(mocFiles.deletedAt)),
      })

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(mapRowToFile(row))
    },

    async findByMocId(mocId: string, fileType?: string): Promise<MocFile[]> {
      const conditions = [eq(mocFiles.mocId, mocId), isNull(mocFiles.deletedAt)]

      if (fileType) {
        conditions.push(eq(mocFiles.fileType, fileType))
      }

      const rows = await db.query.mocFiles.findMany({
        where: and(...conditions),
        orderBy: desc(mocFiles.createdAt),
      })

      return rows.map(mapRowToFile)
    },

    async insert(data): Promise<MocFile> {
      const [row] = await db
        .insert(mocFiles)
        .values({
          mocId: data.mocId,
          fileType: data.fileType,
          fileUrl: data.fileUrl,
          originalFilename: data.originalFilename ?? null,
          mimeType: data.mimeType ?? null,
        })
        .returning()

      return mapRowToFile(row)
    },

    async softDelete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const [row] = await db
        .update(mocFiles)
        .set({ deletedAt: new Date() })
        .where(and(eq(mocFiles.id, id), isNull(mocFiles.deletedAt)))
        .returning()

      if (!row) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async delete(id: string): Promise<Result<void, 'NOT_FOUND'>> {
      const result = await db.delete(mocFiles).where(eq(mocFiles.id, id))

      if (result.rowCount === 0) {
        return err('NOT_FOUND')
      }

      return ok(undefined)
    },

    async deleteByMocId(mocId: string): Promise<void> {
      await db.delete(mocFiles).where(eq(mocFiles.mocId, mocId))
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function mapRowToMoc(row: {
  id: string
  userId: string
  title: string
  description: string | null
  type: string
  mocId: string | null
  slug: string | null
  author: string | null
  partsCount: number | null
  minifigCount: number | null
  theme: string | null
  themeId: number | null
  subtheme: string | null
  uploadedDate: Date | null
  brand: string | null
  setNumber: string | null
  releaseYear: number | null
  retired: boolean | null
  designer: unknown
  dimensions: unknown
  instructionsMetadata: unknown
  features: unknown
  descriptionHtml: string | null
  shortDescription: string | null
  difficulty: string | null
  buildTimeHours: number | null
  ageRecommendation: string | null
  status: string | null
  visibility: string | null
  isFeatured: boolean | null
  isVerified: boolean | null
  tags: unknown
  thumbnailUrl: string | null
  totalPieceCount: number | null
  publishedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): MocInstructions {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    type: row.type as 'moc' | 'set',
    mocId: row.mocId,
    slug: row.slug,
    author: row.author,
    partsCount: row.partsCount,
    minifigCount: row.minifigCount,
    theme: row.theme,
    themeId: row.themeId,
    subtheme: row.subtheme,
    uploadedDate: row.uploadedDate,
    brand: row.brand,
    setNumber: row.setNumber,
    releaseYear: row.releaseYear,
    retired: row.retired,
    designer: row.designer as MocInstructions['designer'],
    dimensions: row.dimensions as MocInstructions['dimensions'],
    instructionsMetadata: row.instructionsMetadata as MocInstructions['instructionsMetadata'],
    features: row.features as MocInstructions['features'],
    descriptionHtml: row.descriptionHtml,
    shortDescription: row.shortDescription,
    difficulty: row.difficulty as MocInstructions['difficulty'],
    buildTimeHours: row.buildTimeHours,
    ageRecommendation: row.ageRecommendation,
    status: (row.status ?? 'draft') as MocInstructions['status'],
    visibility: (row.visibility ?? 'private') as MocInstructions['visibility'],
    isFeatured: row.isFeatured ?? false,
    isVerified: row.isVerified ?? false,
    tags: row.tags as string[] | null,
    thumbnailUrl: row.thumbnailUrl,
    totalPieceCount: row.totalPieceCount,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function mapRowToFile(row: {
  id: string
  mocId: string
  fileType: string
  fileUrl: string
  originalFilename: string | null
  mimeType: string | null
  createdAt: Date
  updatedAt: Date | null
  deletedAt: Date | null
}): MocFile {
  return {
    id: row.id,
    mocId: row.mocId,
    fileType: row.fileType,
    fileUrl: row.fileUrl,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }
}

import { randomUUID } from 'crypto'
import { eq, and, like, count, desc } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type * as schema from '@repo/database-schema'
import slugifyLib from 'slugify'
const slugify = slugifyLib.default || slugifyLib
import type {
  MocRepository,
  Moc,
  MocWithFiles,
  MocListItem,
  MocListResult,
  MocFile,
} from '../ports/index.js'
import type { CreateMocRequest, ListMocsQuery } from '../types.js'

type Schema = typeof schema

/**
 * Create a MocRepository implementation using Drizzle
 */
export function createMocRepository(db: NodePgDatabase<Schema>, dbSchema: Schema): MocRepository {
  const { mocInstructions } = dbSchema

  return {
    async create(userId: string, data: CreateMocRequest): Promise<Moc> {
      // Generate slug from title
      const baseSlug = slugify(data.title, { lower: true, strict: true })

      try {
        // Attempt to insert with base slug
        const [created] = await db
          .insert(mocInstructions)
          .values({
            userId,
            title: data.title,
            description: data.description || null,
            theme: data.theme,
            tags: data.tags || null,
            slug: baseSlug,
            type: 'MOC',
          })
          .returning()

        return mapRowToMoc(created)
      } catch (error: any) {
        // Check if it's a unique constraint violation on (userId, slug)
        if (error.code === '23505' && error.constraint === 'moc_instructions_user_slug_unique') {
          // Retry with UUID suffix
          const uuidSuffix = randomUUID().slice(0, 6)
          const uniqueSlug = `${baseSlug}-${uuidSuffix}`

          const [created] = await db
            .insert(mocInstructions)
            .values({
              userId,
              title: data.title,
              description: data.description || null,
              theme: data.theme,
              tags: data.tags || null,
              slug: uniqueSlug,
              type: 'MOC',
            })
            .returning()

          return mapRowToMoc(created)
        }

        // Re-throw other errors
        throw error
      }
    },

    async findBySlug(slug: string, userId: string): Promise<Moc | null> {
      const result = await db.query.mocInstructions.findFirst({
        where: and(eq(mocInstructions.slug, slug), eq(mocInstructions.userId, userId)),
      })

      return result ? mapRowToMoc(result) : null
    },

    async getMocById(id: string, userId: string): Promise<MocWithFiles | null> {
      const result = await db.query.mocInstructions.findFirst({
        where: and(eq(mocInstructions.id, id), eq(mocInstructions.userId, userId)),
        with: {
          files: {
            where: (files, { isNull }) => isNull(files.deletedAt),
          },
        },
      })

      if (!result) {
        return null
      }

      // Map files to port interface
      const files = result.files.map(file => ({
        id: file.id,
        mocId: file.mocId,
        fileType: file.fileType,
        fileUrl: file.fileUrl,
        originalFilename: file.originalFilename,
        mimeType: file.mimeType,
        s3Key: file.s3Key,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      }))

      return {
        ...mapRowToMoc(result),
        files,
        totalPieceCount: result.totalPieceCount,
      }
    },

    async list(userId: string, query: ListMocsQuery): Promise<MocListResult> {
      const { page, limit, search, type, status, theme } = query

      // Build where conditions
      const conditions = [eq(mocInstructions.userId, userId)]

      if (search) {
        conditions.push(like(mocInstructions.title, `%${search}%`))
      }
      if (type) {
        conditions.push(eq(mocInstructions.type, type.toUpperCase()))
      }
      if (status) {
        conditions.push(eq(mocInstructions.status, status))
      }
      if (theme) {
        conditions.push(eq(mocInstructions.theme, theme))
      }

      const whereClause = and(...conditions)

      // Get total count
      const [countResult] = await db
        .select({ count: count() })
        .from(mocInstructions)
        .where(whereClause)

      const total = countResult?.count ?? 0

      // Get paginated results
      const offset = (page - 1) * limit
      const results = await db
        .select()
        .from(mocInstructions)
        .where(whereClause)
        .orderBy(desc(mocInstructions.createdAt))
        .limit(limit)
        .offset(offset)

      const items: MocListItem[] = results.map(row => ({
        id: row.id,
        userId: row.userId,
        title: row.title,
        description: row.description,
        theme: row.theme,
        tags: row.tags,
        slug: row.slug,
        type: row.type,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        mocId: row.mocId,
        author: row.author,
        partsCount: row.partsCount,
        minifigCount: row.minifigCount,
        themeId: row.themeId,
        subtheme: row.subtheme,
        uploadedDate: row.uploadedDate,
        brand: row.brand,
        setNumber: row.setNumber,
        releaseYear: row.releaseYear,
        retired: row.retired,
        designer: row.designer,
        dimensions: row.dimensions,
        instructionsMetadata: row.instructionsMetadata,
        features: row.features,
        descriptionHtml: row.descriptionHtml,
        shortDescription: row.shortDescription,
        difficulty: row.difficulty,
        buildTimeHours: row.buildTimeHours,
        ageRecommendation: row.ageRecommendation,
        status: row.status ?? 'draft',
        visibility: row.visibility ?? 'private',
        isFeatured: row.isFeatured ?? false,
        isVerified: row.isVerified ?? false,
        thumbnailUrl: row.thumbnailUrl,
        totalPieceCount: row.totalPieceCount,
        publishedAt: row.publishedAt,
      }))

      return { items, total }
    },

    async updateThumbnail(mocId: string, userId: string, thumbnailUrl: string): Promise<void> {
      await db
        .update(mocInstructions)
        .set({ thumbnailUrl, updatedAt: new Date() })
        .where(and(eq(mocInstructions.id, mocId), eq(mocInstructions.userId, userId)))
    },

    async getFileByIdAndMocId(fileId: string, mocId: string): Promise<MocFile | null> {
      const result = await db.query.mocFiles.findFirst({
        where: (mocFiles, { and, eq, isNull }) =>
          and(eq(mocFiles.id, fileId), eq(mocFiles.mocId, mocId), isNull(mocFiles.deletedAt)),
      })

      if (!result) {
        return null
      }

      return {
        id: result.id,
        mocId: result.mocId,
        fileType: result.fileType,
        fileUrl: result.fileUrl,
        originalFilename: result.originalFilename,
        mimeType: result.mimeType,
        s3Key: result.s3Key,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      }
    },
  }
}

/**
 * Map database row to Moc entity
 */
function mapRowToMoc(row: any): Moc {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    theme: row.theme,
    tags: row.tags,
    slug: row.slug,
    type: row.type,
    thumbnailUrl: row.thumbnailUrl || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

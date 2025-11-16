/**
 * MOC Service Layer
 *
 * Business logic for MOC Instructions operations.
 * Handles database queries, caching, and search integration.
 */

import { eq, and, sql, desc, ilike, or } from 'drizzle-orm'
import { db } from '@/lib/db/client'
import {
  mocInstructions,
  mocFiles,
  mocGalleryImages,
  mocGalleryAlbums,
  galleryImages,
  galleryAlbums,
  mocPartsLists,
} from '@/db/schema'
import { getRedisClient } from '@/lib/services/redis'
import { searchMocs as searchMocsOpenSearch } from '@/lib/services/opensearch-moc'
import type { MocInstruction, MocListQuery, MocDetailResponse } from '@/types/moc'
import { DatabaseError, NotFoundError, ForbiddenError, ConflictError } from '@/lib/errors'
import { createLogger } from '../utils/logger'

const logger = createLogger('moc-service')

/**
 * List MOCs for a user with pagination, search, and filtering
 *
 * Features:
 * - Pagination (page/limit)
 * - Full-text search (OpenSearch with PostgreSQL fallback)
 * - Tag filtering
 * - Redis caching (5 minute TTL)
 * - Cache invalidation on mutations
 */
export async function listMocs(
  userId: string,
  query: MocListQuery,
): Promise<{ mocs: MocInstruction[]; total: number }> {
  const { page, limit, search, tag } = query
  const offset = (page - 1) * limit

  // Generate cache key
  const cacheKey = `moc:user:${userId}:list:${page}:${limit}:${search || ''}:${tag || ''}`

  try {
    // Check Redis cache first
    const cached = await getCachedMocList(cacheKey)
    if (cached) {
      logger.info('MOC list cache hit', { userId, cacheKey })
      return cached
    }

    // If search query provided, try OpenSearch first
    if (search && search.trim()) {
      try {
        const searchResults = await searchMocsOpenSearch(userId, search, offset, limit, tag)

        // Cache the results
        await cacheMocList(cacheKey, searchResults)

        return searchResults
      } catch (error) {
        logger.warn('OpenSearch query failed, falling back to PostgreSQL', error)
        // Fall through to PostgreSQL search below
      }
    }

    // Build PostgreSQL query
    const whereConditions = [eq(mocInstructions.userId, userId)]

    // Add tag filter if provided
    if (tag && tag.trim()) {
      whereConditions.push(sql`${mocInstructions.tags} @> ${JSON.stringify([tag])}`)
    }

    // Add search filter if provided (PostgreSQL ILIKE fallback)
    if (search && search.trim()) {
      const searchPattern = `%${search}%`
      whereConditions.push(
        or(
          ilike(mocInstructions.title, searchPattern),
          ilike(mocInstructions.description, searchPattern),
        )!,
      )
    }

    // Execute query with pagination
    const [mocsRaw, countResult] = await Promise.all([
      db
        .select()
        .from(mocInstructions)
        .where(and(...whereConditions))
        .orderBy(desc(mocInstructions.updatedAt))
        .limit(limit)
        .offset(offset),

      // Get total count for pagination
      db
        .select({ count: sql<number>`count(*)` })
        .from(mocInstructions)
        .where(and(...whereConditions)),
    ])

    // Cast database results to MocInstruction type
    // Database returns 'type' as string, but our type expects "moc" | "set"
    const mocs = mocsRaw as unknown as MocInstruction[]

    const total = Number(countResult[0]?.count || 0)

    const result = { mocs, total }

    // Cache the results (5 minute TTL)
    await cacheMocList(cacheKey, result)

    logger.info('MOC list query completed', {
      userId,
      mocsReturned: mocs.length,
      total,
      page,
      limit,
    })

    return result
  } catch (error) {
    logger.error('Error listing MOCs:', error)
    throw new DatabaseError('Failed to retrieve MOC list', {
      userId,
      query,
      error: (error as Error).message,
    })
  }
}

/**
 * Get cached MOC list from Redis
 */
async function getCachedMocList(
  cacheKey: string,
): Promise<{ mocs: MocInstruction[]; total: number } | null> {
  try {
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)

    if (!cached) {
      return null
    }

    return JSON.parse(cached)
  } catch (error) {
    logger.warn('Redis cache read failed:', error)
    return null
  }
}

/**
 * Cache MOC list in Redis with 5 minute TTL
 */
async function cacheMocList(
  cacheKey: string,
  data: { mocs: MocInstruction[]; total: number },
): Promise<void> {
  try {
    const redis = await getRedisClient()
    const TTL = 300 // 5 minutes

    await redis.setEx(cacheKey, TTL, JSON.stringify(data))
  } catch (error) {
    logger.warn('Redis cache write failed:', error)
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Invalidate all MOC list caches for a user
 * Called after create/update/delete operations
 */
export async function invalidateMocListCache(userId: string): Promise<void> {
  try {
    const redis = await getRedisClient()

    // Find all keys matching the pattern
    const pattern = `moc:user:${userId}:list:*`
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      await redis.del(keys)
      logger.info('Invalidated MOC list cache', { userId, keysDeleted: keys.length })
    }
  } catch (error) {
    logger.warn('Failed to invalidate MOC list cache:', error)
    // Don't throw - cache invalidation failure shouldn't break the request
  }
}

/**
 * Get MOC detail by ID with eager loading
 *
 * Features:
 * - Authorization check (user must own the MOC)
 * - Eager loading of related entities:
 *   - mocFiles (instructions, parts lists, thumbnails, gallery images)
 *   - mocGalleryImages (linked from gallery_images table)
 *   - mocPartsLists (parts list metadata)
 * - Redis caching (10 minute TTL)
 * - Cache invalidation on update/delete
 *
 * Story 2.3 implementation
 */
export async function getMocDetail(mocId: string, userId: string): Promise<MocDetailResponse> {
  const cacheKey = `moc:detail:${mocId}`

  try {
    // Check Redis cache first
    const cached = await getCachedMocDetail(cacheKey)
    if (cached) {
      // Verify user owns the cached MOC
      if (cached.userId !== userId) {
        throw new ForbiddenError('You do not own this MOC')
      }
      logger.info('MOC detail cache hit', { mocId, userId })
      return cached
    }

    // Query MOC with basic info first
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!moc) {
      throw new NotFoundError('MOC not found')
    }

    // Authorization check: user must own the MOC
    if (moc.userId !== userId) {
      throw new ForbiddenError('You do not own this MOC')
    }

    // Eager load related entities in parallel
    const [files, galleryImagesData, partsLists] = await Promise.all([
      // Load MOC files (instructions, parts lists, thumbnails, images)
      db.select().from(mocFiles).where(eq(mocFiles.mocId, mocId)),

      // Load linked gallery images with full image data
      db
        .select({
          id: mocGalleryImages.id,
          galleryImageId: mocGalleryImages.galleryImageId,
          url: galleryImages.imageUrl,
          alt: galleryImages.title,
          caption: galleryImages.description,
        })
        .from(mocGalleryImages)
        .innerJoin(galleryImages, eq(mocGalleryImages.galleryImageId, galleryImages.id))
        .where(eq(mocGalleryImages.mocId, mocId)),

      // Load parts lists
      db.select().from(mocPartsLists).where(eq(mocPartsLists.mocId, mocId)),
    ])

    // Cast moc to MocInstruction type
    const mocInstruction = moc as unknown as MocInstruction

    // Construct response with all related entities
    const response: MocDetailResponse = {
      ...mocInstruction,
      files: files as any, // Cast database results to MocFile type
      images: galleryImagesData,
      partsLists: partsLists as any, // Cast to match MocPartsList type
    }

    // Cache the result (10 minute TTL)
    await cacheMocDetail(cacheKey, response)

    logger.info('MOC detail query completed', {
      mocId,
      userId,
      filesCount: files.length,
      imagesCount: galleryImagesData.length,
      partsListsCount: partsLists.length,
    })

    return response
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      throw error
    }

    logger.error('Error retrieving MOC detail:', error)
    throw new DatabaseError('Failed to retrieve MOC detail', {
      mocId,
      userId,
      error: (error as Error).message,
    })
  }
}

/**
 * Get cached MOC detail from Redis
 */
async function getCachedMocDetail(cacheKey: string): Promise<MocDetailResponse | null> {
  try {
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)

    if (!cached) {
      return null
    }

    const parsed = JSON.parse(cached)

    // Convert date strings back to Date objects
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      updatedAt: new Date(parsed.updatedAt),
      uploadedDate: parsed.uploadedDate ? new Date(parsed.uploadedDate) : null,
      files: parsed.files.map((file: any) => ({
        ...file,
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt),
      })),
      partsLists: parsed.partsLists.map((list: any) => ({
        ...list,
        createdAt: new Date(list.createdAt),
        updatedAt: new Date(list.updatedAt),
      })),
    }
  } catch (error) {
    logger.warn('Redis cache read failed:', error)
    return null
  }
}

/**
 * Cache MOC detail in Redis with 10 minute TTL
 */
async function cacheMocDetail(cacheKey: string, data: MocDetailResponse): Promise<void> {
  try {
    const redis = await getRedisClient()
    const TTL = 600 // 10 minutes

    await redis.setEx(cacheKey, TTL, JSON.stringify(data))
  } catch (error) {
    logger.warn('Redis cache write failed:', error)
    // Don't throw - caching failure shouldn't break the request
  }
}

/**
 * Invalidate MOC detail cache
 * Called after update/delete operations
 */
export async function invalidateMocDetailCache(mocId: string): Promise<void> {
  try {
    const redis = await getRedisClient()
    const cacheKey = `moc:detail:${mocId}`

    await redis.del(cacheKey)
    logger.info('Invalidated MOC detail cache', { mocId })
  } catch (error) {
    logger.warn('Failed to invalidate MOC detail cache:', error)
    // Don't throw - cache invalidation failure shouldn't break the request
  }
}

/**
 * Create a new MOC instruction
 *
 * Features:
 * - Zod validation (via handler)
 * - User ID from JWT automatically assigned
 * - Unique title per user constraint (database enforced)
 * - Transaction support for atomicity
 * - OpenSearch indexing (async, non-blocking)
 * - Redis cache invalidation for user's list
 *
 * Story 2.4 implementation
 */
export async function createMoc(
  userId: string,
  data: { title: string; description?: string; tags?: string[]; thumbnailUrl?: string },
): Promise<MocInstruction> {
  try {
    logger.info('Creating MOC', { userId, title: data.title })

    const now = new Date()

    // Insert into database with transaction
    // Note: Drizzle doesn't have explicit transaction API in this context,
    // but insert is atomic. For multi-step transactions, we'd use db.transaction()
    const [moc] = await db
      .insert(mocInstructions)
      .values({
        userId,
        type: 'moc', // Default to 'moc' type for simple creation
        title: data.title,
        description: data.description || null,
        tags: data.tags || null,
        thumbnailUrl: data.thumbnailUrl || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    if (!moc) {
      throw new DatabaseError('Failed to create MOC - no record returned')
    }

    // Cast to MocInstruction type
    const mocInstruction = moc as unknown as MocInstruction

    logger.info('MOC created successfully', { mocId: moc.id, userId })

    // Index in OpenSearch asynchronously (non-blocking)
    // Fire and forget - don't wait for indexing to complete
    indexMocAsync(mocInstruction)

    // Invalidate user's MOC list cache
    invalidateMocListCache(userId)

    return mocInstruction
  } catch (error) {
    // Check for unique constraint violation (duplicate title)
    if ((error as any).code === '23505' && (error as any).constraint?.includes('user_title')) {
      throw new ConflictError('A MOC with this title already exists', {
        userId,
        title: data.title,
      })
    }

    logger.error('Error creating MOC:', error)
    throw new DatabaseError('Failed to create MOC', {
      userId,
      data,
      error: (error as Error).message,
    })
  }
}

/**
 * Index MOC in OpenSearch asynchronously
 * Non-blocking - errors are logged but don't fail the request
 */
async function indexMocAsync(moc: MocInstruction): Promise<void> {
  try {
    const { indexMoc } = await import('@/lib/services/opensearch-moc')
    await indexMoc(moc)
  } catch (error) {
    logger.error('Failed to index MOC in OpenSearch (non-blocking):', error)
    // Don't throw - indexing failure shouldn't break the creation request
    // Search will fall back to PostgreSQL until re-indexed
  }
}

/**
 * Update an existing MOC instruction
 *
 * Features:
 * - Partial updates (only provided fields are updated)
 * - Authorization check (user must own MOC)
 * - Optimistic locking with updatedAt timestamp
 * - OpenSearch re-indexing (async, non-blocking)
 * - Redis cache invalidation (detail and list caches)
 *
 * Story 2.5 implementation
 */
export async function updateMoc(
  mocId: string,
  userId: string,
  data: {
    title?: string
    description?: string
    author?: string
    theme?: string
    subtheme?: string
    partsCount?: number
    tags?: string[]
    thumbnailUrl?: string
  },
): Promise<MocInstruction> {
  try {
    logger.info('Updating MOC', { mocId, userId, fields: Object.keys(data) })

    // First, fetch the MOC to verify ownership
    const [existingMoc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!existingMoc) {
      throw new NotFoundError('MOC not found')
    }

    // Authorization check: user must own the MOC
    if (existingMoc.userId !== userId) {
      throw new ForbiddenError('You do not own this MOC')
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(), // Always update timestamp
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.author !== undefined) updateData.author = data.author
    if (data.theme !== undefined) updateData.theme = data.theme
    if (data.subtheme !== undefined) updateData.subtheme = data.subtheme
    if (data.partsCount !== undefined) updateData.partsCount = data.partsCount
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl

    // Perform update with optimistic locking
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set(updateData)
      .where(eq(mocInstructions.id, mocId))
      .returning()

    if (!updatedMoc) {
      throw new DatabaseError('Failed to update MOC - no record returned')
    }

    // Cast to MocInstruction type
    const mocInstruction = updatedMoc as unknown as MocInstruction

    logger.info('MOC updated successfully', { mocId, userId, updatedFields: Object.keys(data) })

    // Re-index in OpenSearch asynchronously (non-blocking)
    updateMocIndexAsync(mocInstruction)

    // Invalidate caches
    invalidateMocDetailCache(mocId)
    invalidateMocListCache(userId)

    return mocInstruction
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      throw error
    }

    // Check for unique constraint violation (duplicate title)
    if ((error as any).code === '23505' && (error as any).constraint?.includes('user_title')) {
      throw new ConflictError('A MOC with this title already exists', {
        userId,
        mocId,
        title: data.title,
      })
    }

    logger.error('Error updating MOC:', error)
    throw new DatabaseError('Failed to update MOC', {
      mocId,
      userId,
      data,
      error: (error as Error).message,
    })
  }
}

/**
 * Update MOC index in OpenSearch asynchronously
 * Non-blocking - errors are logged but don't fail the request
 */
async function updateMocIndexAsync(moc: MocInstruction): Promise<void> {
  try {
    const { updateMocIndex } = await import('@/lib/services/opensearch-moc')
    await updateMocIndex(moc)
  } catch (error) {
    logger.error('Failed to update MOC in OpenSearch (non-blocking):', error)
    // Don't throw - indexing failure shouldn't break the update request
  }
}

/**
 * DELETE MOC - Story 2.6
 *
 * Deletes a MOC and all related entities.
 * Performs cascade deletion and cleans up S3 files.
 *
 * Features:
 * - Authorization check (user must own MOC)
 * - Cascade deletion: MOC files, gallery images, parts lists
 * - S3 file cleanup (async, non-blocking)
 * - OpenSearch document deletion
 * - Redis cache invalidation (detail + list)
 *
 * @param mocId - MOC ID to delete
 * @param userId - User ID from JWT claims
 * @throws NotFoundError if MOC doesn't exist
 * @throws ForbiddenError if user doesn't own MOC
 */
export async function deleteMoc(mocId: string, userId: string): Promise<void> {
  logger.info('Deleting MOC', { mocId, userId })

  // Fetch existing MOC to verify ownership
  const [existingMoc] = await db
    .select()
    .from(mocInstructions)
    .where(eq(mocInstructions.id, mocId))
    .limit(1)

  if (!existingMoc) {
    throw new NotFoundError('MOC not found')
  }

  if (existingMoc.userId !== userId) {
    throw new ForbiddenError('You do not own this MOC')
  }

  logger.info('Performing cascade deletion for MOC', { mocId })

  // Fetch MOC-owned files for S3 cleanup (before deletion)
  // These are files that belong exclusively to this MOC (instructions, parts lists, thumbnails)
  const mocOwnedFiles = await db.select().from(mocFiles).where(eq(mocFiles.mocId, mocId))

  // Fetch gallery images linked to this MOC to check for orphans
  const linkedGalleryImages = await db
    .select({ id: galleryImages.id, imageUrl: galleryImages.imageUrl })
    .from(mocGalleryImages)
    .innerJoin(galleryImages, eq(mocGalleryImages.galleryImageId, galleryImages.id))
    .where(eq(mocGalleryImages.mocId, mocId))

  // Cascade deletion (database handles foreign key constraints)
  // Order matters for foreign key constraints:
  // 1. Delete moc_parts_lists (references moc_instructions and moc_files)
  // 2. Delete moc_gallery_albums (references moc_instructions)
  // 3. Delete moc_gallery_images (references moc_instructions)
  // 4. Delete moc_files (references moc_instructions)
  // 5. Delete moc_instructions
  await db.delete(mocPartsLists).where(eq(mocPartsLists.mocId, mocId))
  await db.delete(mocGalleryAlbums).where(eq(mocGalleryAlbums.mocId, mocId))
  await db.delete(mocGalleryImages).where(eq(mocGalleryImages.mocId, mocId))
  await db.delete(mocFiles).where(eq(mocFiles.mocId, mocId))
  await db.delete(mocInstructions).where(eq(mocInstructions.id, mocId))

  logger.info('MOC deleted from database', {
    mocId,
    mocOwnedFilesCount: mocOwnedFiles.length,
    linkedGalleryImagesCount: linkedGalleryImages.length,
  })

  // Determine which gallery images are now orphaned (not referenced by any other MOC or album)
  const orphanedGalleryImageUrls: string[] = []
  for (const galleryImage of linkedGalleryImages) {
    const isOrphaned = await checkIfGalleryImageIsOrphaned(galleryImage.id)
    if (isOrphaned) {
      orphanedGalleryImageUrls.push(galleryImage.imageUrl)
      // Delete the orphaned gallery image from database
      await db.delete(galleryImages).where(eq(galleryImages.id, galleryImage.id))
    }
  }

  logger.info('Orphaned gallery images identified', {
    mocId,
    orphanedCount: orphanedGalleryImageUrls.length,
  })

  // Async S3 cleanup (fire-and-forget)
  // Only delete MOC-owned files and orphaned gallery images
  const filesToDelete = [...mocOwnedFiles.map(f => f.fileUrl), ...orphanedGalleryImageUrls]

  if (filesToDelete.length > 0) {
    deleteS3FilesAsync(filesToDelete)
  }

  // Async OpenSearch deletion (fire-and-forget)
  deleteMocIndexAsync(mocId)

  // Invalidate caches
  invalidateMocDetailCache(mocId)
  invalidateMocListCache(userId)

  logger.info('MOC deletion complete', { mocId })
}

/**
 * Check if a gallery image is orphaned (not referenced by any MOC or album)
 * Called after deleting moc_gallery_images links to determine if the image should be deleted
 */
async function checkIfGalleryImageIsOrphaned(galleryImageId: string): Promise<boolean> {
  // Check if image is linked to any other MOCs
  const [mocLink] = await db
    .select({ id: mocGalleryImages.id })
    .from(mocGalleryImages)
    .where(eq(mocGalleryImages.galleryImageId, galleryImageId))
    .limit(1)

  if (mocLink) {
    return false // Still referenced by another MOC
  }

  // Check if image is the cover image of any album
  const [albumCoverLink] = await db
    .select({ id: galleryAlbums.id })
    .from(galleryAlbums)
    .where(eq(galleryAlbums.coverImageId, galleryImageId))
    .limit(1)

  if (albumCoverLink) {
    return false // Used as album cover
  }

  // Check if image belongs to any album (via albumId in gallery_images)
  const [galleryImage] = await db
    .select({ albumId: galleryImages.albumId })
    .from(galleryImages)
    .where(eq(galleryImages.id, galleryImageId))
    .limit(1)

  if (galleryImage?.albumId) {
    return false // Belongs to an album
  }

  // Image is orphaned - not referenced by any MOC or album
  return true
}

/**
 * Async S3 file deletion (fire-and-forget)
 * Extracts S3 keys from URLs and deletes objects.
 */
async function deleteS3FilesAsync(fileUrls: string[]): Promise<void> {
  try {
    const { DeleteObjectsCommand, S3Client } = await import('@aws-sdk/client-s3')

    const s3Client = new S3Client({})

    // Get bucket name from environment variable (set by SST link)
    const bucketName = process.env.LEGO_API_BUCKET_NAME

    if (!bucketName) {
      logger.error('S3 bucket name not configured - skipping file deletion')
      return
    }

    // Extract S3 keys from URLs
    // Expected format: https://bucket-name.s3.region.amazonaws.com/key
    const keys = fileUrls
      .map(url => {
        try {
          const urlObj = new URL(url)
          // Extract key from pathname (remove leading slash)
          return urlObj.pathname.substring(1)
        } catch (error) {
          logger.error('Invalid S3 URL:', url, error)
          return null
        }
      })
      .filter((key): key is string => key !== null)

    if (keys.length === 0) {
      logger.info('No valid S3 keys to delete')
      return
    }

    logger.info('Deleting S3 objects', { bucketName, keysCount: keys.length })

    // Delete objects in batches of 1000 (S3 limit)
    const batchSize = 1000
    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize)

      const command = new DeleteObjectsCommand({
        Bucket: bucketName,
        Delete: {
          Objects: batch.map(key => ({ Key: key })),
          Quiet: true,
        },
      })

      await s3Client.send(command)
      logger.info('S3 batch deletion complete', { batchSize: batch.length })
    }

    logger.info('All S3 objects deleted', { totalKeys: keys.length })
  } catch (error) {
    logger.error('Failed to delete S3 files (non-blocking):', error)
    // Don't throw - S3 cleanup failure shouldn't break the delete request
  }
}

/**
 * Async OpenSearch document deletion (fire-and-forget)
 */
async function deleteMocIndexAsync(mocId: string): Promise<void> {
  try {
    const { deleteMocIndex } = await import('@/lib/services/opensearch-moc')
    await deleteMocIndex(mocId)
  } catch (error) {
    logger.error('Failed to delete MOC from OpenSearch (non-blocking):', error)
    // Don't throw - indexing failure shouldn't break the delete request
  }
}

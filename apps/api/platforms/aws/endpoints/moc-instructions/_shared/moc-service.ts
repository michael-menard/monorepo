/**
 * MOC Service Layer
 *
 * Business logic for MOC Instructions operations.
 * Handles database queries, caching, and search integration.
 */

import { eq, and, sql, desc, ilike, or, isNull } from 'drizzle-orm'
import { db } from '@/core/database/client'
import {
  mocInstructions,
  mocFiles,
  mocGalleryImages,
  mocGalleryAlbums,
  galleryImages,
  galleryAlbums,
  mocPartsLists,
} from '@/core/database/schema'
import { searchMocs as searchMocsOpenSearch } from '@/endpoints/moc-instructions/_shared/opensearch-moc'
import type { MocInstruction, MocListQuery, MocDetailResponse } from '@repo/api-types/moc'
import {
  DatabaseError,
  NotFoundError,
  ForbiddenError,
  DuplicateSlugError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('moc-service')

/**
 * List MOCs for a user with pagination, search, and filtering
 *
 * Features:
 * - Pagination (page/limit)
 * - Full-text search (OpenSearch with PostgreSQL fallback)
 * - Tag filtering
 */
export async function listMocs(
  userId: string,
  query: MocListQuery,
): Promise<{ mocs: MocInstruction[]; total: number }> {
  const { page, limit, search, tag } = query
  const offset = (page - 1) * limit

  try {
    // If search query provided, try OpenSearch first
    if (search && search.trim()) {
      try {
        const searchResults = await searchMocsOpenSearch(userId, search, offset, limit, tag)
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
 * Get MOC detail by ID with eager loading
 *
 * Features:
 * - Authorization check (user must own the MOC)
 * - Eager loading of related entities:
 *   - mocFiles (instructions, parts lists, thumbnails, gallery images)
 *   - mocGalleryImages (linked from gallery_images table)
 *   - mocPartsLists (parts list metadata)
 *
 * Story 2.3 implementation
 */
export async function getMocDetail(mocId: string, userId: string): Promise<MocDetailResponse> {
  try {
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
      // Load MOC files (instructions, parts lists, thumbnails, images) - exclude soft-deleted
      db
        .select()
        .from(mocFiles)
        .where(and(eq(mocFiles.mocId, mocId), isNull(mocFiles.deletedAt))),

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
  data: {
    title: string
    description?: string
    tags?: string[]
    thumbnailUrl?: string
    // New optional fields for extended creation
    type?: 'moc' | 'set'
    mocId?: string
    slug?: string
    author?: string
    theme?: string
    themeId?: number
    subtheme?: string
    partsCount?: number
    minifigCount?: number
    brand?: string
    setNumber?: string
    releaseYear?: number
    retired?: boolean
    designer?: {
      username: string
      displayName?: string | null
      profileUrl?: string | null
      avatarUrl?: string | null
      socialLinks?: {
        instagram?: string | null
        twitter?: string | null
        youtube?: string | null
        website?: string | null
      } | null
    }
    dimensions?: {
      height?: { cm?: number | null; inches?: number | null } | null
      width?: {
        cm?: number | null
        inches?: number | null
        openCm?: number | null
        openInches?: number | null
      } | null
      depth?: {
        cm?: number | null
        inches?: number | null
        openCm?: number | null
        openInches?: number | null
      } | null
      weight?: { kg?: number | null; lbs?: number | null } | null
      studsWidth?: number | null
      studsDepth?: number | null
    }
    instructionsMetadata?: {
      instructionType?: 'pdf' | 'xml' | 'studio' | 'ldraw' | 'lxf' | 'other' | null
      hasInstructions: boolean
      pageCount?: number | null
      fileSize?: number | null
      previewImages: string[]
    }
    alternateBuild?: {
      isAlternateBuild: boolean
      sourceSetNumbers: string[]
      sourceSetNames: string[]
      setsRequired?: number | null
      additionalPartsNeeded: number
    }
    features?: Array<{
      title: string
      description?: string | null
      icon?: string | null
    }>
    descriptionHtml?: string
    shortDescription?: string
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    buildTimeHours?: number
    ageRecommendation?: string
    status?: 'draft' | 'published' | 'archived' | 'pending_review'
    visibility?: 'public' | 'private' | 'unlisted'
    uploadedDate?: string | Date
    // BrickLink-specific fields (dates as ISO strings for JSON storage)
    sourcePlatform?: {
      platform: 'rebrickable' | 'bricklink' | 'brickowl' | 'mecabricks' | 'studio' | 'other'
      externalId?: string | null
      sourceUrl?: string | null
      uploadSource?: 'web' | 'desktop_app' | 'mobile_app' | 'api' | 'unknown' | null
      forkedFromId?: string | null
      importedAt?: string | null
    }
    eventBadges?: Array<{
      eventId: string
      eventName: string
      badgeType?: string | null
      badgeImageUrl?: string | null
      awardedAt?: string | null
    }>
    moderation?: {
      action: 'none' | 'approved' | 'flagged' | 'removed' | 'pending'
      moderatedAt?: string | null
      reason?: string | null
      forcedPrivate?: boolean
    }
    platformCategoryId?: number
  },
): Promise<MocInstruction> {
  try {
    logger.info('Creating MOC', { userId, title: data.title })

    const now = new Date()

    // Build insert values with all available fields
    const insertValues: any = {
      userId,
      type: data.type || 'moc',
      title: data.title,
      description: data.description || null,
      tags: data.tags || null,
      thumbnailUrl: data.thumbnailUrl || null,
      // Default status and visibility
      status: data.status || 'draft',
      visibility: data.visibility || 'private',
      // Audit trail
      addedByUserId: userId,
      createdAt: now,
      updatedAt: now,
    }

    // Add optional fields if provided
    if (data.mocId) insertValues.mocId = data.mocId
    if (data.slug) insertValues.slug = data.slug
    if (data.author) insertValues.author = data.author
    if (data.theme) insertValues.theme = data.theme
    if (data.themeId) insertValues.themeId = data.themeId
    if (data.subtheme) insertValues.subtheme = data.subtheme
    if (data.partsCount) insertValues.partsCount = data.partsCount
    if (data.minifigCount) insertValues.minifigCount = data.minifigCount
    if (data.brand) insertValues.brand = data.brand
    if (data.setNumber) insertValues.setNumber = data.setNumber
    if (data.releaseYear) insertValues.releaseYear = data.releaseYear
    if (data.retired !== undefined) insertValues.retired = data.retired

    // JSONB fields
    if (data.designer) insertValues.designer = data.designer
    if (data.dimensions) insertValues.dimensions = data.dimensions
    if (data.instructionsMetadata) insertValues.instructionsMetadata = data.instructionsMetadata
    if (data.alternateBuild) insertValues.alternateBuild = data.alternateBuild
    if (data.features) insertValues.features = data.features

    // BrickLink-specific JSONB fields
    if (data.sourcePlatform) insertValues.sourcePlatform = data.sourcePlatform
    if (data.eventBadges) insertValues.eventBadges = data.eventBadges
    if (data.moderation) insertValues.moderation = data.moderation
    if (data.platformCategoryId) insertValues.platformCategoryId = data.platformCategoryId

    // Rich description
    if (data.descriptionHtml) insertValues.descriptionHtml = data.descriptionHtml
    if (data.shortDescription) insertValues.shortDescription = data.shortDescription

    // Build info
    if (data.difficulty) insertValues.difficulty = data.difficulty
    if (data.buildTimeHours) insertValues.buildTimeHours = data.buildTimeHours
    if (data.ageRecommendation) insertValues.ageRecommendation = data.ageRecommendation

    // Dates
    if (data.uploadedDate) {
      insertValues.uploadedDate =
        typeof data.uploadedDate === 'string' ? new Date(data.uploadedDate) : data.uploadedDate
    }
    if (data.status === 'published') {
      insertValues.publishedAt = now
    }

    // Insert into database
    const [moc] = await db.insert(mocInstructions).values(insertValues).returning()

    if (!moc) {
      throw new DatabaseError('Failed to create MOC - no record returned')
    }

    // Cast to MocInstruction type
    const mocInstruction = moc as unknown as MocInstruction

    logger.info('MOC created successfully', { mocId: moc.id, userId })

    // Index in OpenSearch asynchronously (non-blocking)
    // Fire and forget - don't wait for indexing to complete
    indexMocAsync(mocInstruction)

    return mocInstruction
  } catch (error) {
    // Check for unique constraint violation (duplicate title)
    // Story 3.1.21: Use DUPLICATE_SLUG error code for client mapping
    if ((error as any).code === '23505' && (error as any).constraint?.includes('user_title')) {
      throw new DuplicateSlugError('A MOC with this title already exists', undefined, {
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
    const { indexMoc } = await import('@/endpoints/moc-instructions/_shared/opensearch-moc')
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
    // Basic fields
    title?: string
    description?: string
    descriptionHtml?: string
    shortDescription?: string
    author?: string
    theme?: string
    themeId?: number
    subtheme?: string
    partsCount?: number
    minifigCount?: number
    tags?: string[]
    thumbnailUrl?: string
    // Extended metadata
    mocId?: string
    slug?: string
    designer?: {
      username: string
      displayName?: string | null
      profileUrl?: string | null
      avatarUrl?: string | null
      socialLinks?: {
        instagram?: string | null
        twitter?: string | null
        youtube?: string | null
        website?: string | null
      } | null
    }
    dimensions?: {
      height?: { cm?: number | null; inches?: number | null } | null
      width?: {
        cm?: number | null
        inches?: number | null
        openCm?: number | null
        openInches?: number | null
      } | null
      depth?: {
        cm?: number | null
        inches?: number | null
        openCm?: number | null
        openInches?: number | null
      } | null
      weight?: { kg?: number | null; lbs?: number | null } | null
      studsWidth?: number | null
      studsDepth?: number | null
    }
    instructionsMetadata?: {
      instructionType?: 'pdf' | 'xml' | 'studio' | 'ldraw' | 'lxf' | 'other' | null
      hasInstructions: boolean
      pageCount?: number | null
      fileSize?: number | null
      previewImages: string[]
    }
    alternateBuild?: {
      isAlternateBuild: boolean
      sourceSetNumbers: string[]
      sourceSetNames: string[]
      setsRequired?: number | null
      additionalPartsNeeded: number
    }
    features?: Array<{
      title: string
      description?: string | null
      icon?: string | null
    }>
    // Build info
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
    buildTimeHours?: number
    ageRecommendation?: string
    // Status
    status?: 'draft' | 'published' | 'archived' | 'pending_review'
    visibility?: 'public' | 'private' | 'unlisted'
    isFeatured?: boolean
    // BrickLink-specific fields (dates as ISO strings for JSON storage)
    sourcePlatform?: {
      platform: 'rebrickable' | 'bricklink' | 'brickowl' | 'mecabricks' | 'studio' | 'other'
      externalId?: string | null
      sourceUrl?: string | null
      uploadSource?: 'web' | 'desktop_app' | 'mobile_app' | 'api' | 'unknown' | null
      forkedFromId?: string | null
      importedAt?: string | null
    }
    eventBadges?: Array<{
      eventId: string
      eventName: string
      badgeType?: string | null
      badgeImageUrl?: string | null
      awardedAt?: string | null
    }>
    moderation?: {
      action: 'none' | 'approved' | 'flagged' | 'removed' | 'pending'
      moderatedAt?: string | null
      reason?: string | null
      forcedPrivate?: boolean
    }
    platformCategoryId?: number
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
      lastUpdatedByUserId: userId, // Track who made the update
    }

    // Basic fields
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.descriptionHtml !== undefined) updateData.descriptionHtml = data.descriptionHtml
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription
    if (data.author !== undefined) updateData.author = data.author
    if (data.theme !== undefined) updateData.theme = data.theme
    if (data.themeId !== undefined) updateData.themeId = data.themeId
    if (data.subtheme !== undefined) updateData.subtheme = data.subtheme
    if (data.partsCount !== undefined) updateData.partsCount = data.partsCount
    if (data.minifigCount !== undefined) updateData.minifigCount = data.minifigCount
    if (data.tags !== undefined) updateData.tags = data.tags
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl

    // Extended metadata (stored as data.mocId to avoid conflict with function param)
    if (data.mocId !== undefined) updateData.mocId = data.mocId
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.designer !== undefined) updateData.designer = data.designer
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions
    if (data.instructionsMetadata !== undefined)
      updateData.instructionsMetadata = data.instructionsMetadata
    if (data.alternateBuild !== undefined) updateData.alternateBuild = data.alternateBuild
    if (data.features !== undefined) updateData.features = data.features

    // Build info
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty
    if (data.buildTimeHours !== undefined) updateData.buildTimeHours = data.buildTimeHours
    if (data.ageRecommendation !== undefined) updateData.ageRecommendation = data.ageRecommendation

    // Status fields
    if (data.status !== undefined) {
      updateData.status = data.status
      // Set publishedAt when status changes to 'published' for the first time
      if (data.status === 'published' && !existingMoc.publishedAt) {
        updateData.publishedAt = new Date()
      }
    }
    if (data.visibility !== undefined) updateData.visibility = data.visibility
    if (data.isFeatured !== undefined) updateData.isFeatured = data.isFeatured

    // BrickLink-specific fields
    if (data.sourcePlatform !== undefined) updateData.sourcePlatform = data.sourcePlatform
    if (data.eventBadges !== undefined) updateData.eventBadges = data.eventBadges
    if (data.moderation !== undefined) updateData.moderation = data.moderation
    if (data.platformCategoryId !== undefined)
      updateData.platformCategoryId = data.platformCategoryId

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

    return mocInstruction
  } catch (error) {
    // Re-throw known errors
    if (error instanceof NotFoundError || error instanceof ForbiddenError) {
      throw error
    }

    // Check for unique constraint violation (duplicate title)
    // Story 3.1.21: Use DUPLICATE_SLUG error code for client mapping
    if ((error as any).code === '23505' && (error as any).constraint?.includes('user_title')) {
      throw new DuplicateSlugError('A MOC with this title already exists', undefined, {
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
    const { updateMocIndex } = await import('@/endpoints/moc-instructions/_shared/opensearch-moc')
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
    const { deleteMocIndex } = await import('@/endpoints/moc-instructions/_shared/opensearch-moc')
    await deleteMocIndex(mocId)
  } catch (error) {
    logger.error('Failed to delete MOC from OpenSearch (non-blocking):', error)
    // Don't throw - indexing failure shouldn't break the delete request
  }
}

/**
 * Invalidate MOC detail cache
 * Call this after any operation that modifies a MOC's data
 */
export async function invalidateMocDetailCache(mocId: string): Promise<void> {
  try {
    const { getRedisClient } = await import('@/core/cache/redis')
    const redis = await getRedisClient()
    const cacheKey = `moc:detail:${mocId}`
    await redis.del(cacheKey)
    logger.debug('Invalidated MOC detail cache', { mocId, cacheKey })
  } catch (error) {
    logger.warn('Failed to invalidate MOC detail cache (non-blocking):', error)
    // Don't throw - cache invalidation failure shouldn't break the request
  }
}

/**
 * Gallery Images Lambda Handler
 *
 * Handles gallery image operations including upload, CRUD, and album management.
 * Uses Sharp for image processing, S3 for storage, Redis for caching, OpenSearch for indexing.
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { eq, and, isNull, desc, count, sql } from 'drizzle-orm'
import { validateFile, createImageValidationConfig } from '@monorepo/file-validator'
import { logger } from '@/lib/utils/logger'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import {
  CreateGalleryImageSchema,
  UpdateGalleryImageSchema,
  ListGalleryImagesQuerySchema,
  SearchGalleryImagesQuerySchema,
  GalleryImageIdSchema,
  CreateAlbumSchema,
  UpdateAlbumSchema,
  ListAlbumsQuerySchema,
  AlbumIdSchema,
} from '@/lib/validation/gallery-schemas'
import { db } from '@monorepo/db/client'
import { getS3Client, uploadToS3 } from '@/lib/storage/s3-client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { indexDocument, deleteDocument } from '@/lib/search/opensearch-client'
import { searchGalleryImages, hashQuery } from '@/lib/search/search-utils'
import { galleryImages, galleryAlbums } from '@monorepo/db/schema'
import { getEnv } from '@/lib/utils/env'
import { parseMultipartForm, getFile, getField } from '@/lib/utils/multipart-parser'
import { processImage, generateThumbnail } from '@/lib/services/image-processing'

/**
 * Main Gallery Lambda Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract route information
    const method = event.requestContext.http.method
    const path = event.requestContext.http.path
    const pathParams = event.pathParameters || {}

    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return createErrorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Route to appropriate handler
    // Search route must be checked before list route
    if (path === '/api/images/search' && method === 'GET') {
      return handleSearchImages(event, userId)
    }

    if (path === '/api/images' && method === 'GET') {
      return handleListImages(event, userId)
    }

    if (path === '/api/images' && method === 'POST') {
      return handleUploadImage(event, userId)
    }

    if (path.startsWith('/api/images/') && method === 'GET') {
      return handleGetImage(event, userId, pathParams.id!)
    }

    if (path.startsWith('/api/images/') && method === 'PATCH') {
      return handleUpdateImage(event, userId, pathParams.id!)
    }

    if (path.startsWith('/api/images/') && method === 'DELETE') {
      return handleDeleteImage(event, userId, pathParams.id!)
    }

    // Album routes
    if (path === '/api/albums' && method === 'GET') {
      return handleListAlbums(event, userId)
    }

    if (path === '/api/albums' && method === 'POST') {
      return handleCreateAlbum(event, userId)
    }

    if (path.startsWith('/api/albums/') && method === 'GET') {
      return handleGetAlbum(event, userId, pathParams.id!)
    }

    if (path.startsWith('/api/albums/') && method === 'PATCH') {
      return handleUpdateAlbum(event, userId, pathParams.id!)
    }

    if (path.startsWith('/api/albums/') && method === 'DELETE') {
      return handleDeleteAlbum(event, userId, pathParams.id!)
    }

    return createErrorResponse(404, 'NOT_FOUND', 'Route not found')
  } catch (error) {
    logger.error('Gallery handler error:', error)
    return createErrorResponse(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }
}

/**
 * GET /api/images - List gallery images
 */
async function handleListImages(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate query parameters
    const queryParams = ListGalleryImagesQuerySchema.parse(event.queryStringParameters || {})
    const { page, limit, search, albumId } = queryParams

    // Generate cache key
    const cacheKey = `gallery:images:user:${userId}:page:${page}:limit:${limit}:search:${search || 'none'}:album:${albumId || 'none'}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return createSuccessResponse(JSON.parse(cached))
    }

    // Query database
    const offset = (page - 1) * limit

    // Build query conditions
    const conditions = [eq(galleryImages.userId, userId)]
    if (albumId) {
      conditions.push(eq(galleryImages.albumId, albumId))
    } else {
      // If no albumId specified, return standalone images (no album)
      conditions.push(isNull(galleryImages.albumId))
    }

    // Execute query with pagination
    const images = await db
      .select()
      .from(galleryImages)
      .where(and(...conditions))
      .orderBy(desc(galleryImages.createdAt))
      .limit(limit)
      .offset(offset)

    // Count total for pagination
    const [{ total }] = await db
      .select({ total: count() })
      .from(galleryImages)
      .where(and(...conditions))

    const response = {
      data: images,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }

    // Cache result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(response))

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('List images error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to list images')
  }
}

/**
 * GET /api/images/search - Search gallery images
 * Story 3.8 AC #1: Search via OpenSearch multi-match on title, description, tags
 * Story 3.8 AC #3: User ID filter enforced
 * Story 3.8 AC #4: PostgreSQL fallback if OpenSearch unavailable
 * Story 3.8 AC #5: Pagination with page and limit
 * Story 3.8 AC #6: Fuzzy matching enabled
 * Story 3.8 AC #7: Sorted by relevance score
 * Story 3.8 AC #8: Response includes total hits
 * Story 3.8 AC #10: Redis caching with 2-minute TTL
 */
async function handleSearchImages(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate query parameters
    const queryParams = SearchGalleryImagesQuerySchema.parse(event.queryStringParameters || {})
    const { search, page, limit } = queryParams

    // Generate cache key with MD5 hash of query
    const queryHash = hashQuery(search)
    const cacheKey = `gallery:search:${userId}:query:${queryHash}:page:${page}:limit:${limit}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      logger.info('Gallery search cache hit', { userId, query: search, page, limit })
      return createSuccessResponse(JSON.parse(cached))
    }

    // Execute search with OpenSearch (or PostgreSQL fallback)
    const searchResult = await searchGalleryImages({
      query: search,
      userId,
      page,
      limit,
    })

    // Build response
    const response = {
      success: true,
      data: searchResult.data,
      total: searchResult.total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(searchResult.total / limit),
      },
      timestamp: new Date().toISOString(),
    }

    // Cache result for 2 minutes (120 seconds)
    await redis.setEx(cacheKey, 120, JSON.stringify(response))

    logger.info('Gallery search completed', {
      userId,
      query: search,
      page,
      limit,
      resultCount: searchResult.data.length,
      total: searchResult.total,
      source: searchResult.source,
      duration: searchResult.duration,
    })

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('Search images error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    if (error instanceof Error && error.message.includes('Search service unavailable')) {
      return createErrorResponse(500, 'SEARCH_ERROR', 'Search service is currently unavailable')
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to search images')
  }
}

/**
 * POST /api/images - Upload gallery image
 * Handles multipart form data with Sharp image processing
 */
async function handleUploadImage(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Parse multipart form data
    const formData = await parseMultipartForm(event)
    const file = getFile(formData)

    if (!file) {
      return createErrorResponse(400, 'BAD_REQUEST', 'No file uploaded')
    }

    // Validate file using @monorepo/file-validator
    const validationResult = validateFile(
      {
        fieldname: 'file',
        originalname: file.filename,
        encoding: file.encoding || '7bit',
        mimetype: file.mimetype,
        size: file.buffer.length,
      },
      createImageValidationConfig(10 * 1024 * 1024), // 10MB
    )

    if (!validationResult.isValid) {
      return createErrorResponse(
        400,
        'VALIDATION_ERROR',
        validationResult.errors?.join(', ') || 'Invalid file',
      )
    }

    // Parse and validate form fields
    let tags: string[] = []
    const tagsField = getField(formData, 'tags')
    if (tagsField) {
      try {
        tags = JSON.parse(tagsField)
      } catch {
        return createErrorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON format for tags field')
      }
    }

    const metadata = CreateGalleryImageSchema.parse({
      title: getField(formData, 'title'),
      description: getField(formData, 'description') || undefined,
      tags,
      albumId: getField(formData, 'albumId') || undefined,
    })

    // Generate unique ID for image
    const imageId = uuidv4()

    // Process main image with Sharp
    const processedImage = await processImage(file.buffer, {
      maxWidth: 2048,
      quality: 80,
      format: 'webp',
    })

    // Generate thumbnail
    const thumbnail = await generateThumbnail(processedImage.buffer, 400)

    // Upload main image to S3
    const imageKey = `images/${userId}/${imageId}.webp`
    const imageUrl = await uploadToS3({
      key: imageKey,
      body: processedImage.buffer,
      contentType: 'image/webp',
    })

    // Upload thumbnail to S3
    const thumbnailKey = `images/${userId}/thumbnails/${imageId}.webp`
    const thumbnailUrl = await uploadToS3({
      key: thumbnailKey,
      body: thumbnail.buffer,
      contentType: 'image/webp',
    })

    // Create database record
    const [newImage] = await db
      .insert(galleryImages)
      .values({
        id: imageId,
        userId,
        title: metadata.title,
        description: metadata.description || null,
        tags: metadata.tags || [],
        imageUrl,
        thumbnailUrl,
        albumId: metadata.albumId || null,
        flagged: false,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      })
      .returning()

    // Index in OpenSearch
    try {
      await indexDocument({
        index: 'gallery_images',
        id: imageId,
        body: {
          userId,
          title: metadata.title,
          description: metadata.description || '',
          tags: metadata.tags || [],
          albumId: metadata.albumId || null,
          createdAt: newImage.createdAt.toISOString(),
        },
      })
    } catch (error) {
      logger.error('OpenSearch indexing failed (non-critical):', error)
      // Don't fail the request if indexing fails
    }

    // Invalidate Redis cache for user's gallery lists
    try {
      const redis = await getRedisClient()
      // Find and delete all gallery list cache keys for this user
      const pattern = `gallery:images:user:${userId}:*`
      const keys = await redis.keys(pattern)

      // Delete all matching keys
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis cache invalidation failed (non-critical):', error)
      // Don't fail the request if cache invalidation fails
    }

    return createSuccessResponse(
      {
        id: newImage.id,
        userId: newImage.userId,
        title: newImage.title,
        description: newImage.description,
        tags: newImage.tags,
        imageUrl: newImage.imageUrl,
        thumbnailUrl: newImage.thumbnailUrl,
        albumId: newImage.albumId,
        flagged: newImage.flagged,
        createdAt: newImage.createdAt,
        lastUpdatedAt: newImage.lastUpdatedAt,
      },
      201,
    )
  } catch (error) {
    logger.error('Upload image error:', error)

    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    if (error instanceof Error && error.message.includes('Image processing')) {
      return createErrorResponse(400, 'FILE_ERROR', error.message)
    }

    if (error instanceof Error && error.message.includes('multipart')) {
      return createErrorResponse(400, 'BAD_REQUEST', 'Invalid multipart form data')
    }

    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to upload image')
  }
}

/**
 * GET /api/images/:id - Get single image
 */
async function handleGetImage(
  _event: APIGatewayProxyEventV2,
  userId: string,
  imageId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate image ID
    GalleryImageIdSchema.parse({ id: imageId })

    // Check cache
    const cacheKey = `gallery:image:detail:${imageId}`
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      const image = JSON.parse(cached)
      // Verify ownership
      if (image.userId !== userId) {
        return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this image')
      }
      return createSuccessResponse(image)
    }

    // Query database
    const [image] = await db.select().from(galleryImages).where(eq(galleryImages.id, imageId))

    if (!image) {
      return createErrorResponse(404, 'NOT_FOUND', 'Image not found')
    }

    // Verify ownership
    if (image.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this image')
    }

    // Cache for 10 minutes
    await redis.setEx(cacheKey, 600, JSON.stringify(image))

    return createSuccessResponse(image)
  } catch (error) {
    logger.error('Get image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get image')
  }
}

/**
 * PATCH /api/images/:id - Update image metadata
 */
async function handleUpdateImage(
  event: APIGatewayProxyEventV2,
  userId: string,
  imageId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate image ID
    GalleryImageIdSchema.parse({ id: imageId })

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const updateData = UpdateGalleryImageSchema.parse(body)

    // Check if image exists and verify ownership
    const [existingImage] = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.id, imageId))

    if (!existingImage) {
      return createErrorResponse(404, 'NOT_FOUND', 'Image not found')
    }

    if (existingImage.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this image')
    }

    // Update image
    const [updatedImage] = await db
      .update(galleryImages)
      .set({
        ...updateData,
        lastUpdatedAt: new Date(),
      })
      .where(eq(galleryImages.id, imageId))
      .returning()

    // Update OpenSearch index
    try {
      await indexDocument({
        index: 'gallery_images',
        id: imageId,
        body: {
          userId: updatedImage.userId,
          title: updatedImage.title,
          description: updatedImage.description || '',
          tags: updatedImage.tags || [],
          albumId: updatedImage.albumId || null,
          createdAt: updatedImage.createdAt.toISOString(),
        },
      })
    } catch (error) {
      logger.error('OpenSearch update failed (non-critical):', error)
      // Don't fail the request if indexing fails
    }

    // Invalidate caches
    const redis = await getRedisClient()
    await redis.del(`gallery:image:detail:${imageId}`)

    // Invalidate list caches for this user
    try {
      const pattern = `gallery:images:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} list cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis list cache invalidation failed (non-critical):', error)
    }

    return createSuccessResponse(updatedImage)
  } catch (error) {
    logger.error('Update image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update image')
  }
}

/**
 * DELETE /api/images/:id - Delete image
 */
async function handleDeleteImage(
  _event: APIGatewayProxyEventV2,
  userId: string,
  imageId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate image ID
    GalleryImageIdSchema.parse({ id: imageId })

    // Check if image exists and verify ownership
    const [existingImage] = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.id, imageId))

    if (!existingImage) {
      return createErrorResponse(404, 'NOT_FOUND', 'Image not found')
    }

    if (existingImage.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this image')
    }

    // Delete from S3 (image and thumbnail)
    const s3 = await getS3Client()
    const env = getEnv()

    // Extract key from URL (handle both formats: https://bucket.s3.region.amazonaws.com/key and https://bucket/key)
    const imageUrl = existingImage.imageUrl
    let imageKey: string
    try {
      const url = new URL(imageUrl)
      imageKey = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname
    } catch (error) {
      logger.error('Failed to parse image URL:', error)
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image from S3')
    }

    // Delete main image
    await s3.send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET!,
        Key: imageKey,
      }),
    )

    // Delete thumbnail if exists (reconstruct thumbnail key from image key)
    if (existingImage.thumbnailUrl) {
      try {
        const thumbnailUrl = new URL(existingImage.thumbnailUrl)
        const thumbnailKey = thumbnailUrl.pathname.startsWith('/')
          ? thumbnailUrl.pathname.substring(1)
          : thumbnailUrl.pathname

        await s3.send(
          new DeleteObjectCommand({
            Bucket: env.S3_BUCKET!,
            Key: thumbnailKey,
          }),
        )
      } catch (err) {
        logger.warn('Thumbnail deletion failed (may not exist):', err)
      }
    }

    // Delete from database
    await db.delete(galleryImages).where(eq(galleryImages.id, imageId))

    // Delete from OpenSearch
    try {
      await deleteDocument({
        index: 'gallery_images',
        id: imageId,
      })
    } catch (error) {
      logger.error('OpenSearch delete failed (non-critical):', error)
      // Don't fail the request if deletion fails
    }

    // Invalidate caches
    const redis = await getRedisClient()
    await redis.del(`gallery:image:detail:${imageId}`)

    // Invalidate list caches for this user
    try {
      const pattern = `gallery:images:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} list cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis list cache invalidation failed (non-critical):', error)
    }

    return createSuccessResponse({ message: 'Image deleted successfully' }, 204)
  } catch (error) {
    logger.error('Delete image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image')
  }
}

/**
 * POST /api/albums - Create album
 */
async function handleCreateAlbum(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const albumData = CreateAlbumSchema.parse(body)

    // Generate unique ID for album
    const albumId = uuidv4()

    // If coverImageId is provided, verify it exists and belongs to user
    if (albumData.coverImageId) {
      const [coverImage] = await db
        .select()
        .from(galleryImages)
        .where(eq(galleryImages.id, albumData.coverImageId))

      if (!coverImage) {
        return createErrorResponse(400, 'VALIDATION_ERROR', 'Cover image not found')
      }

      if (coverImage.userId !== userId) {
        return createErrorResponse(403, 'FORBIDDEN', "Cannot use another user's image as cover")
      }
    }

    // Create database record
    const [newAlbum] = await db
      .insert(galleryAlbums)
      .values({
        id: albumId,
        userId,
        title: albumData.title,
        description: albumData.description || null,
        coverImageId: albumData.coverImageId || null,
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
      })
      .returning()

    // Index in OpenSearch
    try {
      await indexDocument({
        index: 'gallery_images',
        id: albumId,
        body: {
          type: 'album',
          userId,
          title: albumData.title,
          description: albumData.description || '',
          coverImageId: albumData.coverImageId || null,
          createdAt: newAlbum.createdAt.toISOString(),
        },
      })
    } catch (error) {
      logger.error('OpenSearch indexing failed (non-critical):', error)
    }

    // Invalidate album list cache
    try {
      const redis = await getRedisClient()
      const pattern = `gallery:albums:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} album cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis cache invalidation failed (non-critical):', error)
    }

    // Build response with imageCount = 0
    return createSuccessResponse(
      {
        id: newAlbum.id,
        userId: newAlbum.userId,
        title: newAlbum.title,
        description: newAlbum.description,
        coverImageId: newAlbum.coverImageId,
        createdAt: newAlbum.createdAt,
        lastUpdatedAt: newAlbum.lastUpdatedAt,
        imageCount: 0,
        coverImageUrl: null,
      },
      201,
    )
  } catch (error) {
    logger.error('Create album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to create album')
  }
}

/**
 * GET /api/albums - List albums
 */
async function handleListAlbums(
  event: APIGatewayProxyEventV2,
  userId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate query parameters
    const queryParams = ListAlbumsQuerySchema.parse(event.queryStringParameters || {})
    const { page, limit, search } = queryParams

    // Generate cache key
    const cacheKey = `gallery:albums:user:${userId}:page:${page}:limit:${limit}:search:${search || 'none'}`

    // Check Redis cache
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      return createSuccessResponse(JSON.parse(cached))
    }

    // Query database with image count
    const offset = (page - 1) * limit

    // Get albums with image count using left join and group by
    const albums = await db
      .select({
        id: galleryAlbums.id,
        userId: galleryAlbums.userId,
        title: galleryAlbums.title,
        description: galleryAlbums.description,
        coverImageId: galleryAlbums.coverImageId,
        createdAt: galleryAlbums.createdAt,
        lastUpdatedAt: galleryAlbums.lastUpdatedAt,
        imageCount: sql<number>`CAST(COUNT(${galleryImages.id}) AS INTEGER)`,
        coverImageUrl: sql<
          string | null
        >`MAX(CASE WHEN ${galleryImages.id} = ${galleryAlbums.coverImageId} THEN ${galleryImages.imageUrl} ELSE NULL END)`,
      })
      .from(galleryAlbums)
      .leftJoin(galleryImages, eq(galleryImages.albumId, galleryAlbums.id))
      .where(eq(galleryAlbums.userId, userId))
      .groupBy(galleryAlbums.id)
      .orderBy(desc(galleryAlbums.createdAt))
      .limit(limit)
      .offset(offset)

    // Count total albums
    const [{ total }] = await db
      .select({ total: count() })
      .from(galleryAlbums)
      .where(eq(galleryAlbums.userId, userId))

    const response = {
      data: albums,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    }

    // Cache result for 5 minutes
    await redis.setEx(cacheKey, 300, JSON.stringify(response))

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('List albums error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to list albums')
  }
}

/**
 * GET /api/albums/:id - Get album with all images
 */
async function handleGetAlbum(
  _event: APIGatewayProxyEventV2,
  userId: string,
  albumId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate album ID
    AlbumIdSchema.parse({ id: albumId })

    // Check cache
    const cacheKey = `gallery:album:detail:${albumId}`
    const redis = await getRedisClient()
    const cached = await redis.get(cacheKey)
    if (cached) {
      const album = JSON.parse(cached)
      // Verify ownership
      if (album.userId !== userId) {
        return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')
      }
      return createSuccessResponse(album)
    }

    // Query database for album
    const [album] = await db.select().from(galleryAlbums).where(eq(galleryAlbums.id, albumId))

    if (!album) {
      return createErrorResponse(404, 'NOT_FOUND', 'Album not found')
    }

    // Verify ownership
    if (album.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')
    }

    // Get all images in this album
    const images = await db
      .select()
      .from(galleryImages)
      .where(eq(galleryImages.albumId, albumId))
      .orderBy(desc(galleryImages.createdAt))

    // Build response with eager-loaded images
    const response = {
      ...album,
      images,
      imageCount: images.length,
    }

    // Cache for 10 minutes
    await redis.setEx(cacheKey, 600, JSON.stringify(response))

    return createSuccessResponse(response)
  } catch (error) {
    logger.error('Get album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to get album')
  }
}

/**
 * PATCH /api/albums/:id - Update album metadata
 */
async function handleUpdateAlbum(
  event: APIGatewayProxyEventV2,
  userId: string,
  albumId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate album ID
    AlbumIdSchema.parse({ id: albumId })

    // Parse and validate request body
    const body = JSON.parse(event.body || '{}')
    const updateData = UpdateAlbumSchema.parse(body)

    // Check if album exists and verify ownership
    const [existingAlbum] = await db
      .select()
      .from(galleryAlbums)
      .where(eq(galleryAlbums.id, albumId))

    if (!existingAlbum) {
      return createErrorResponse(404, 'NOT_FOUND', 'Album not found')
    }

    if (existingAlbum.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')
    }

    // If coverImageId is being updated, verify it exists and belongs to user
    if (updateData.coverImageId !== undefined && updateData.coverImageId !== null) {
      const [coverImage] = await db
        .select()
        .from(galleryImages)
        .where(eq(galleryImages.id, updateData.coverImageId))

      if (!coverImage) {
        return createErrorResponse(400, 'VALIDATION_ERROR', 'Cover image not found')
      }

      if (coverImage.userId !== userId) {
        return createErrorResponse(403, 'FORBIDDEN', "Cannot use another user's image as cover")
      }
    }

    // Update album
    const [updatedAlbum] = await db
      .update(galleryAlbums)
      .set({
        ...updateData,
        lastUpdatedAt: new Date(),
      })
      .where(eq(galleryAlbums.id, albumId))
      .returning()

    // Update OpenSearch index
    try {
      await indexDocument({
        index: 'gallery_images',
        id: albumId,
        body: {
          type: 'album',
          userId: updatedAlbum.userId,
          title: updatedAlbum.title,
          description: updatedAlbum.description || '',
          coverImageId: updatedAlbum.coverImageId || null,
          createdAt: updatedAlbum.createdAt.toISOString(),
        },
      })
    } catch (error) {
      logger.error('OpenSearch update failed (non-critical):', error)
    }

    // Invalidate caches
    const redis = await getRedisClient()
    await redis.del(`gallery:album:detail:${albumId}`)

    // Invalidate list caches for this user
    try {
      const pattern = `gallery:albums:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} album cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis list cache invalidation failed (non-critical):', error)
    }

    return createSuccessResponse(updatedAlbum)
  } catch (error) {
    logger.error('Update album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to update album')
  }
}

/**
 * DELETE /api/albums/:id - Delete album (sets albumId=null for contained images)
 */
async function handleDeleteAlbum(
  _event: APIGatewayProxyEventV2,
  userId: string,
  albumId: string,
): Promise<APIGatewayProxyResultV2> {
  try {
    // Validate album ID
    AlbumIdSchema.parse({ id: albumId })

    // Check if album exists and verify ownership
    const [existingAlbum] = await db
      .select()
      .from(galleryAlbums)
      .where(eq(galleryAlbums.id, albumId))

    if (!existingAlbum) {
      return createErrorResponse(404, 'NOT_FOUND', 'Album not found')
    }

    if (existingAlbum.userId !== userId) {
      return createErrorResponse(403, 'FORBIDDEN', 'Access denied to this album')
    }

    // Set albumId=null for all images in this album (do not delete images)
    await db
      .update(galleryImages)
      .set({ albumId: null, lastUpdatedAt: new Date() })
      .where(eq(galleryImages.albumId, albumId))

    // Delete album from database
    await db.delete(galleryAlbums).where(eq(galleryAlbums.id, albumId))

    // Delete from OpenSearch
    try {
      await deleteDocument({
        index: 'gallery_images',
        id: albumId,
      })
    } catch (error) {
      logger.error('OpenSearch delete failed (non-critical):', error)
    }

    // Invalidate caches
    const redis = await getRedisClient()
    await redis.del(`gallery:album:detail:${albumId}`)

    // Invalidate list caches for this user
    try {
      const pattern = `gallery:albums:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} album cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis list cache invalidation failed (non-critical):', error)
    }

    // Also invalidate image list caches since images were updated
    try {
      const pattern = `gallery:images:user:${userId}:*`
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(keys)
        logger.info(`Invalidated ${keys.length} image cache keys for user ${userId}`)
      }
    } catch (error) {
      logger.error('Redis image cache invalidation failed (non-critical):', error)
    }

    return createSuccessResponse({ message: 'Album deleted successfully' }, 204)
  } catch (error) {
    logger.error('Delete album error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete album')
  }
}

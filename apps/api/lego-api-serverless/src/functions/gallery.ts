/**
 * Gallery Images Lambda Handler
 *
 * Handles gallery image operations including upload, CRUD, and album management.
 * Uses Sharp for image processing, S3 for storage, Redis for caching, OpenSearch for indexing.
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { getUserIdFromEvent } from '@/lib/auth/jwt-utils'
import { createSuccessResponse, createErrorResponse } from '@/lib/utils/response-utils'
import {
  CreateGalleryImageSchema,
  UpdateGalleryImageSchema,
  ListGalleryImagesQuerySchema,
  GalleryImageIdSchema,
} from '@/lib/validation/gallery-schemas'
import { db } from '@/lib/db/client'
import { getS3Client, uploadToS3 } from '@/lib/storage/s3-client'
import { getRedisClient } from '@/lib/cache/redis-client'
import { indexDocument } from '@/lib/search/opensearch-client'
import { galleryImages } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { getEnv } from '@/lib/utils/env'
import { parseMultipartForm, getFile, getField } from '@/lib/utils/multipart-parser'
import { processImage, generateThumbnail } from '@/lib/services/image-processing'
import { validateFile, createImageValidationConfig } from '@monorepo/file-validator'

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

    return createErrorResponse(404, 'NOT_FOUND', 'Route not found')
  } catch (error) {
    console.error('Gallery handler error:', error)
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
    console.error('List images error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to list images')
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
        mimetype: file.mimetype,
        size: file.buffer.length,
        originalname: file.filename,
      } as { mimetype: string; size: number; originalname: string },
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
      console.error('OpenSearch indexing failed (non-critical):', error)
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
        console.log(`Invalidated ${keys.length} cache keys for user ${userId}`)
      }
    } catch (error) {
      console.error('Redis cache invalidation failed (non-critical):', error)
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
    console.error('Upload image error:', error)

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
    console.error('Get image error:', error)
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

    // Invalidate caches
    const redis = await getRedisClient()
    await redis.del(`gallery:image:detail:${imageId}`)
    // Note: In production, implement proper cache invalidation with tags or patterns
    // For now, just invalidate the specific image cache (list caches would require SCAN)

    return createSuccessResponse(updatedImage)
  } catch (error) {
    console.error('Update image error:', error)
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
      console.error('Failed to parse image URL:', error)
      return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image from S3')
    }

    // Delete main image
    await s3.send(new DeleteObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: imageKey,
    }))

    // Delete thumbnail if exists (reconstruct thumbnail key from image key)
    if (existingImage.thumbnailUrl) {
      try {
        const thumbnailUrl = new URL(existingImage.thumbnailUrl)
        const thumbnailKey = thumbnailUrl.pathname.startsWith('/')
          ? thumbnailUrl.pathname.substring(1)
          : thumbnailUrl.pathname

        await s3.send(new DeleteObjectCommand({
          Bucket: env.S3_BUCKET!,
          Key: thumbnailKey,
        }))
      } catch (err) {
        console.warn('Thumbnail deletion failed (may not exist):', err)
      }
    }

    // Delete from database
    await db.delete(galleryImages).where(eq(galleryImages.id, imageId))

    // Invalidate caches
    const redis = await getRedisClient()
    await redis.del(`gallery:image:detail:${imageId}`)

    return createSuccessResponse({ message: 'Image deleted successfully' }, 204)
  } catch (error) {
    console.error('Delete image error:', error)
    if (error instanceof Error && error.message.includes('Validation')) {
      return createErrorResponse(400, 'VALIDATION_ERROR', error.message)
    }
    return createErrorResponse(500, 'INTERNAL_ERROR', 'Failed to delete image')
  }
}

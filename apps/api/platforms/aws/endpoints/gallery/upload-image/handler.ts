/**
 * Upload Gallery Image Lambda Handler
 *
 * POST /api/images
 * Handles multipart form upload with Sharp image processing, S3 storage, and OpenSearch indexing
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { v4 as uuidv4 } from 'uuid'
import { validateFile, createImageValidationConfig } from '@repo/file-validator'
import { logger } from '@/core/observability/logger'
import { getUserIdFromEvent } from '@repo/lambda-auth'
import { successResponse, errorResponse } from '@/core/utils/responses'
import { CreateGalleryImageSchema } from '@/endpoints/gallery/schemas'
import { db } from '@/core/database/client'
import { uploadToS3 } from '@/core/storage/s3'
import { getRedisClient } from '@/core/cache/redis'
import { indexDocument } from '@/core/search/opensearch'
import { galleryImages } from '@/core/database/schema'
import { parseMultipartForm, getFile, getField } from '@repo/lambda-utils'
import { processImage, generateThumbnail } from '@repo/image-processing'

/**
 * Upload Gallery Image Handler
 */
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    // Get authenticated user ID from JWT
    const userId = getUserIdFromEvent(event)
    if (!userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'Authentication required')
    }

    // Parse multipart form data
    const formData = await parseMultipartForm(event)
    const file = getFile(formData)

    if (!file) {
      return errorResponse(400, 'BAD_REQUEST', 'No file uploaded')
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
      return errorResponse(
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
        return errorResponse(400, 'VALIDATION_ERROR', 'Invalid JSON format for tags field')
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

    return successResponse(
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
      return errorResponse(400, 'VALIDATION_ERROR', error.message)
    }

    if (error instanceof Error && error.message.includes('Image processing')) {
      return errorResponse(400, 'FILE_ERROR', error.message)
    }

    if (error instanceof Error && error.message.includes('multipart')) {
      return errorResponse(400, 'BAD_REQUEST', 'Invalid multipart form data')
    }

    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to upload image')
  }
}

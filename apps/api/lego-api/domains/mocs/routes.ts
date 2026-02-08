import { Hono } from 'hono'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'
import { loadPermissions } from '../../middleware/load-permissions.js'
import { requireFeature } from '../../middleware/require-feature.js'
import { db, schema } from '../../composition/index.js'
import { createMocService } from './application/index.js'
import { createMocRepository, createMocImageStorage } from './adapters/index.js'
import {
  CreateMocRequestSchema,
  CreateMocResponseSchema,
  GetMocResponseSchema,
  ListMocsQuerySchema,
  MocListResponseSchema,
  UploadThumbnailResponseSchema,
} from './types.js'

// Setup: Wire dependencies
const mocRepo = createMocRepository(db, schema)
const imageStorage = createMocImageStorage()
const mocService = createMocService({ mocRepo, imageStorage })

// Create Hono router
const mocs = new Hono()

// Apply middleware chain
mocs.use('*', auth)
mocs.use('*', loadPermissions)
mocs.use('*', requireFeature('moc'))

/**
 * GET /mocs
 * List MOCs for the authenticated user with pagination and filters
 * (INST-1102: Gallery listing support)
 */
mocs.get('/', async c => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Parse query parameters
    const query = {
      page: c.req.query('page') || '1',
      limit: c.req.query('limit') || '20',
      search: c.req.query('search'),
      type: c.req.query('type'),
      status: c.req.query('status'),
      theme: c.req.query('theme'),
    }

    const validated = ListMocsQuerySchema.safeParse(query)
    if (!validated.success) {
      logger.warn('Invalid list query', undefined, {
        userId,
        errors: validated.error.flatten(),
      })
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          details: validated.error.flatten(),
        },
        400,
      )
    }

    const result = await mocService.listMocs(userId, validated.data)

    if (!result.ok) {
      return c.json({ error: result.error }, 500)
    }

    const { items, total, query: validatedQuery } = result.data
    const totalPages = Math.ceil(total / validatedQuery.limit)

    // Map items to response format with proper type handling
    const mappedItems = items.map(item => ({
      id: item.id,
      userId: item.userId,
      title: item.title,
      description: item.description,
      type: item.type.toLowerCase() as 'moc' | 'set',
      mocId: item.mocId,
      slug: item.slug,
      author: item.author,
      partsCount: item.partsCount,
      minifigCount: item.minifigCount,
      theme: item.theme,
      themeId: item.themeId,
      subtheme: item.subtheme,
      uploadedDate: item.uploadedDate?.toISOString() ?? null,
      brand: item.brand,
      setNumber: item.setNumber,
      releaseYear: item.releaseYear,
      retired: item.retired,
      designer: item.designer,
      dimensions: item.dimensions,
      instructionsMetadata: item.instructionsMetadata,
      features: item.features,
      descriptionHtml: item.descriptionHtml,
      shortDescription: item.shortDescription,
      difficulty: item.difficulty,
      buildTimeHours: item.buildTimeHours,
      ageRecommendation: item.ageRecommendation,
      status: (item.status || 'draft') as 'draft' | 'published' | 'archived' | 'pending_review',
      visibility: (item.visibility || 'private') as 'public' | 'private' | 'unlisted',
      isFeatured: item.isFeatured,
      isVerified: item.isVerified,
      tags: item.tags,
      thumbnailUrl: item.thumbnailUrl,
      totalPieceCount: item.totalPieceCount,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))

    const response = MocListResponseSchema.parse({
      items: mappedItems,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        totalPages,
      },
    })

    return c.json(response, 200)
  } catch (error) {
    logger.error('Unhandled error in GET /mocs', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /mocs
 * Create a new MOC
 */
mocs.post('/', async c => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Parse and validate request body
    const body = await c.req.json()
    const input = CreateMocRequestSchema.safeParse(body)

    if (!input.success) {
      logger.warn('Invalid MOC creation request', undefined, {
        userId,
        errors: input.error.flatten(),
      })
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          details: input.error.flatten(),
        },
        400,
      )
    }

    // Call service
    const result = await mocService.createMoc(userId, input.data)

    if (!result.ok) {
      if (result.error === 'VALIDATION_ERROR') {
        return c.json({ error: 'VALIDATION_ERROR' }, 400)
      }
      if (result.error === 'DUPLICATE_TITLE') {
        return c.json(
          {
            error: 'DUPLICATE_TITLE',
            message: 'A MOC with this title already exists. Please try another title.',
          },
          409,
        )
      }
      return c.json({ error: 'DB_ERROR' }, 500)
    }

    // Validate and return response
    const response = CreateMocResponseSchema.parse({
      id: result.data.id,
      userId: result.data.userId,
      title: result.data.title,
      description: result.data.description,
      theme: result.data.theme,
      tags: result.data.tags,
      slug: result.data.slug,
      type: result.data.type,
      createdAt: result.data.createdAt.toISOString(),
      updatedAt: result.data.updatedAt.toISOString(),
    })

    return c.json(response, 201)
  } catch (error) {
    logger.error('Unhandled error in POST /mocs', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * GET /mocs/:id
 * Get MOC details with files and stats
 * (INST-1101: AC-12)
 */
mocs.get('/:id', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Call service (authorization check inside)
    const result = await mocService.getMoc(userId, mocId)

    if (!result.ok) {
      return c.json({ error: 'DB_ERROR' }, 500)
    }

    // Return 404 for non-existent or unauthorized MOC (INST-1101: AC-16, ARCH-003)
    if (!result.data) {
      return c.json({ error: 'NOT_FOUND' }, 404)
    }

    const moc = result.data

    // Map files to response format
    const files = moc.files.map(file => ({
      id: file.id,
      mocId: file.mocId,
      fileType: file.fileType,
      name: file.originalFilename || 'Unnamed file',
      size: 0, // TODO: Add fileSize to database schema
      mimeType: file.mimeType,
      s3Key: file.fileUrl, // Using fileUrl as s3Key for now
      uploadedAt: file.createdAt.toISOString(),
      downloadUrl: file.fileUrl,
    }))

    // Build response
    const response = GetMocResponseSchema.parse({
      id: moc.id,
      userId: moc.userId,
      title: moc.title,
      description: moc.description,
      theme: moc.theme,
      tags: moc.tags,
      thumbnailUrl: moc.thumbnailUrl,
      createdAt: moc.createdAt.toISOString(),
      updatedAt: moc.updatedAt.toISOString(),
      files,
      stats: {
        pieceCount: moc.totalPieceCount,
        fileCount: files.length,
      },
    })

    return c.json(response, 200)
  } catch (error) {
    logger.error('Unhandled error in GET /mocs/:id', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /mocs/:id/thumbnail
 * Upload a thumbnail image for a MOC
 * (INST-1103: AC49-AC52)
 */
mocs.post('/:id/thumbnail', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Parse multipart/form-data
    const body = await c.req.parseBody()
    const file = body.thumbnail

    // Validate that file exists and is a File object
    if (!file || typeof file === 'string') {
      logger.warn('Missing or invalid thumbnail file', undefined, { userId, mocId })
      return c.json({ error: 'MISSING_FILE', message: 'Thumbnail file is required' }, 400)
    }

    // Convert File to Buffer and extract metadata
    const buffer = Buffer.from(await file.arrayBuffer())
    const fileData = {
      buffer,
      filename: file.name,
      mimetype: file.type,
      size: buffer.length,
    }

    // Call service
    const result = await mocService.uploadThumbnail(userId, mocId, fileData)

    // Map errors to HTTP status codes
    if (!result.ok) {
      switch (result.error) {
        case 'MOC_NOT_FOUND':
          return c.json({ error: result.error, message: 'MOC not found or access denied' }, 404)
        case 'FORBIDDEN':
          return c.json({ error: result.error, message: 'Access denied' }, 403)
        case 'INVALID_MIME_TYPE':
          return c.json(
            {
              error: result.error,
              message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed',
            },
            400,
          )
        case 'FILE_TOO_LARGE':
          return c.json(
            { error: result.error, message: 'File is too large. Maximum size is 10MB' },
            400,
          )
        case 'FILE_TOO_SMALL':
          return c.json({ error: result.error, message: 'File is too small' }, 400)
        case 'IMAGE_TOO_LARGE':
          return c.json(
            { error: result.error, message: 'Image dimensions exceed 8000x8000 pixels' },
            400,
          )
        case 'INVALID_IMAGE':
          return c.json({ error: result.error, message: 'Invalid or corrupted image file' }, 400)
        case 'UPLOAD_FAILED':
          return c.json({ error: result.error, message: 'Failed to upload thumbnail' }, 500)
        case 'DB_ERROR':
          return c.json({ error: result.error, message: 'Database error' }, 500)
        default:
          return c.json({ error: 'INTERNAL_ERROR', message: 'Internal error' }, 500)
      }
    }

    // Validate and return response
    const response = UploadThumbnailResponseSchema.parse(result.data)
    return c.json(response, 200)
  } catch (error) {
    logger.error('Unhandled error in POST /mocs/:id/thumbnail', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

export default mocs

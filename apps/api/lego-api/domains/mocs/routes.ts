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
  GetFileDownloadUrlResponseSchema,
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
      status: item.status,
      visibility: item.visibility,
      isFeatured: item.isFeatured,
      isVerified: item.isVerified,
      tags: item.tags,
      thumbnailUrl: item.thumbnailUrl,
      totalPieceCount: item.totalPieceCount,
      publishedAt: item.publishedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }))

    const response = {
      items: mappedItems,
      pagination: {
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        total,
        totalPages,
      },
    }

    // Validate response with Zod
    const validatedResponse = MocListResponseSchema.parse(response)

    return c.json(validatedResponse, 200)
  } catch (error) {
    logger.error('Unhandled error in GET /mocs', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /mocs
 * Create a new MOC for the authenticated user
 * (INST-1102: AC-1 to AC-23)
 */
mocs.post('/', async c => {
  const userId = c.get('userId')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()

    // Validate request with Zod
    const validated = CreateMocRequestSchema.safeParse(body)
    if (!validated.success) {
      logger.warn('Invalid MOC creation request', undefined, {
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

    const result = await mocService.createMoc(userId, validated.data)

    if (!result.ok) {
      switch (result.error) {
        case 'VALIDATION_ERROR':
          return c.json({ error: result.error }, 400)
        case 'DUPLICATE_TITLE':
          return c.json({ error: result.error, message: 'MOC title already exists' }, 409)
        case 'DB_ERROR':
          return c.json({ error: result.error }, 500)
        default:
          return c.json({ error: 'INTERNAL_ERROR' }, 500)
      }
    }

    const moc = result.data

    // Map to response format
    const response = {
      id: moc.id,
      userId: moc.userId,
      title: moc.title,
      description: moc.description,
      theme: moc.theme,
      tags: moc.tags,
      slug: moc.slug,
      type: moc.type,
      createdAt: moc.createdAt.toISOString(),
      updatedAt: moc.updatedAt.toISOString(),
    }

    // Validate response with Zod
    const validatedResponse = CreateMocResponseSchema.parse(response)

    return c.json(validatedResponse, 201)
  } catch (error) {
    logger.error('Unhandled error in POST /mocs', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * GET /mocs/:id
 * Get a specific MOC by ID with files
 * (INST-1101: AC-11 to AC-21)
 */
mocs.get('/:id', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const result = await mocService.getMoc(userId, mocId)

    if (!result.ok) {
      return c.json({ error: result.error }, 500)
    }

    const moc = result.data

    if (!moc) {
      return c.json({ error: 'NOT_FOUND' }, 404)
    }

    // Map files to response format
    const mappedFiles = moc.files.map(file => ({
      id: file.id,
      mocId: file.mocId,
      fileType: file.fileType,
      name: file.originalFilename || 'Unnamed file',
      size: 0, // Size not stored in current schema
      mimeType: file.mimeType,
      s3Key: file.s3Key || '',
      uploadedAt: file.createdAt.toISOString(),
      downloadUrl: file.fileUrl,
    }))

    // Map stats
    const stats = {
      pieceCount: moc.totalPieceCount,
      fileCount: moc.files.length,
    }

    const response = {
      id: moc.id,
      userId: moc.userId,
      title: moc.title,
      description: moc.description,
      theme: moc.theme,
      tags: moc.tags,
      thumbnailUrl: moc.thumbnailUrl,
      createdAt: moc.createdAt.toISOString(),
      updatedAt: moc.updatedAt.toISOString(),
      files: mappedFiles,
      stats,
    }

    // Validate response with Zod
    const validatedResponse = GetMocResponseSchema.parse(response)

    return c.json(validatedResponse, 200)
  } catch (error) {
    logger.error('Unhandled error in GET /mocs/:id', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /mocs/:id/thumbnail
 * Upload a thumbnail for a MOC
 * (INST-1103: AC1, AC21, AC34, AC49-AC52)
 */
mocs.post('/:id/thumbnail', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Parse multipart form data
    const body = await c.req.parseBody()
    const file = body.file

    if (!file || typeof file === 'string') {
      return c.json({ error: 'NO_FILE', message: 'No file provided' }, 400)
    }

    // Read file buffer
    const buffer = await file.arrayBuffer()

    const fileData = {
      buffer: Buffer.from(buffer),
      filename: file.name,
      mimetype: file.type,
      size: buffer.byteLength,
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

/**
 * GET /mocs/:id/files/:fileId/download
 * Generate presigned download URL for a file
 * (INST-1107: AC-1, AC-5, AC-14, AC-75)
 */
mocs.get('/:id/files/:fileId/download', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')
  const fileId = c.req.param('fileId')

  // AC-5: Authentication required
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // AC-14: Validate mocId and fileId format (UUIDs)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(mocId) || !uuidRegex.test(fileId)) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'Invalid MOC ID or file ID format' }, 400)
    }

    // AC-1, AC-75: Delegate to service layer (thin adapter pattern)
    const result = await mocService.getFileDownloadUrl(userId, mocId, fileId)

    // Map service errors to HTTP status codes
    if (!result.ok) {
      switch (result.error) {
        case 'NOT_FOUND':
          // AC-4: Return 404 for both not found and unauthorized (no info leakage)
          return c.json({ error: result.error }, 404)
        case 'PRESIGN_FAILED':
          // AC-10: S3 presigning failed
          return c.json({ error: result.error }, 500)
        case 'DB_ERROR':
          return c.json({ error: result.error }, 500)
        default:
          return c.json({ error: 'INTERNAL_ERROR' }, 500)
      }
    }

    // Validate and return response
    const response = GetFileDownloadUrlResponseSchema.parse(result.data)
    return c.json(response, 200)
  } catch (error) {
    logger.error('Unhandled error in GET /mocs/:id/files/:fileId/download', error, {
      userId,
      mocId,
      fileId,
    })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

export default mocs

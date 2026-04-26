import { Hono } from 'hono'
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { eq, and, sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import { auth } from '../../middleware/auth.js'
import { loadPermissions } from '../../middleware/load-permissions.js'
import { requireFeature } from '../../middleware/require-feature.js'
import { db, schema } from '../../composition/index.js'
import { createMocService, createUploadSessionService } from './application/index.js'
import {
  createMocRepository,
  createMocImageStorage,
  createUploadSessionRepository,
  createS3StorageAdapter,
  createMocReviewRepository,
} from './adapters/index.js'
import {
  CreateMocRequestSchema,
  UpdateMocRequestSchema,
  CreateMocResponseSchema,
  GetMocResponseSchema,
  ListMocsQuerySchema,
  MocListResponseSchema,
  UploadThumbnailResponseSchema,
  GetFileDownloadUrlResponseSchema,
  CreateUploadSessionRequestSchema,
  CreateUploadSessionResponseSchema,
  CompleteUploadSessionResponseSchema,
  UpdateReviewRequestSchema,
  MocReviewResponseSchema,
} from './types.js'
import type { MocFile } from './ports/index.js'

// Setup: Wire dependencies
const mocRepo = createMocRepository(db, schema)
const reviewRepo = createMocReviewRepository(db, schema)
const imageStorage = createMocImageStorage()
const mocService = createMocService({ mocRepo, imageStorage })

// Upload Session Service dependencies
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
})
const s3Bucket = process.env.S3_BUCKET || ''

// MinIO-aware S3 client for presigning stored files (supports local dev + prod)
const s3Endpoint = process.env.S3_ENDPOINT
const presignClient = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(s3Endpoint ? { endpoint: s3Endpoint, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})
const presignBucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET || ''

async function presignS3Key(s3Key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({ Bucket: presignBucket, Key: s3Key })
    return await getSignedUrl(presignClient, command, { expiresIn: 3600 })
  } catch {
    // Fallback: construct a direct URL
    const { buildFileUrl } = await import('../instructions/adapters/storage.js')
    return buildFileUrl(s3Key)
  }
}
const cloudfrontDomain = process.env.CLOUDFRONT_DOMAIN

const sessionRepo = createUploadSessionRepository(db, schema)
const s3Storage = createS3StorageAdapter(s3Client, cloudfrontDomain)

// Rate limiting - uses user_daily_uploads table
const DAILY_UPLOAD_LIMIT = 10

async function checkRateLimit(userId: string) {
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const result = await db
    .select({ count: schema.userDailyUploads.count })
    .from(schema.userDailyUploads)
    .where(and(eq(schema.userDailyUploads.userId, userId), eq(schema.userDailyUploads.day, today)))

  const currentCount = result[0]?.count ?? 0
  const allowed = currentCount < DAILY_UPLOAD_LIMIT

  return {
    allowed,
    remaining: Math.max(0, DAILY_UPLOAD_LIMIT - currentCount),
    currentCount,
    limit: DAILY_UPLOAD_LIMIT,
    retryAfterSeconds: allowed ? undefined : 86400, // 24 hours
  }
}

async function incrementRateLimit(userId: string) {
  const today = new Date().toISOString().split('T')[0]

  // Upsert: insert or increment
  await db
    .insert(schema.userDailyUploads)
    .values({
      userId,
      day: today,
      count: 1,
    })
    .onConflictDoUpdate({
      target: [schema.userDailyUploads.userId, schema.userDailyUploads.day],
      set: {
        count: sql`${schema.userDailyUploads.count} + 1`,
        updatedAt: new Date(),
      },
    })
}

// Insert moc_files record
async function insertMocFile(data: {
  mocId: string
  fileType: string
  originalFilename: string
  mimeType: string
  s3Key: string
}): Promise<MocFile> {
  const [row] = await db
    .insert(schema.mocFiles)
    .values({
      mocId: data.mocId,
      fileType: data.fileType,
      s3Key: data.s3Key,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
    })
    .returning()

  return {
    id: row.id,
    mocId: row.mocId,
    fileType: row.fileType,
    originalFilename: row.originalFilename,
    mimeType: row.mimeType,
    s3Key: row.s3Key,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// Create upload session service
const uploadSessionService = createUploadSessionService({
  mocRepo,
  sessionRepo,
  s3Storage,
  checkRateLimit,
  incrementRateLimit,
  insertMocFile,
  s3Bucket,
  cloudfrontDomain,
  presignTtlSeconds: 900, // 15 minutes
})

// Create Hono router
const mocs = new Hono()

// Apply middleware chain
mocs.use('*', auth)
mocs.use('*', loadPermissions)
mocs.use('*', requireFeature('moc'))

/**
 * POST /tags/split
 * Split a tag into multiple tags across all user's MOCs
 * Must be registered before /:id routes to avoid path conflicts
 */
mocs.post('/tags/split', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()
    const { oldTag, newTags } = body as { oldTag?: string; newTags?: string[] }

    if (!oldTag || !Array.isArray(newTags) || newTags.length === 0) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: 'oldTag and newTags[] are required' },
        400,
      )
    }

    const result = await mocService.splitTag(userId, oldTag, newTags)

    if (!result.ok) {
      return c.json({ error: result.error }, result.error === 'VALIDATION_ERROR' ? 400 : 500)
    }

    return c.json(result.data, 200)
  } catch (error) {
    logger.error('Unhandled error in POST /tags/split', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /tags/merge
 * Merge multiple tags into one across all user's MOCs
 */
mocs.post('/tags/merge', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()
    const { oldTags, newTag } = body as { oldTags?: string[]; newTag?: string }

    if (!Array.isArray(oldTags) || oldTags.length < 2 || !newTag) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: 'oldTags[] (2+) and newTag are required' },
        400,
      )
    }

    const result = await mocService.mergeTags(userId, oldTags, newTag)

    if (!result.ok) {
      return c.json({ error: result.error }, result.error === 'VALIDATION_ERROR' ? 400 : 500)
    }

    return c.json(result.data, 200)
  } catch (error) {
    logger.error('Unhandled error in POST /tags/merge', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /tags/rename
 * Rename a tag across all user's MOCs
 */
mocs.post('/tags/rename', async c => {
  const userId = c.get('userId')
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()
    const { oldTag, newTag } = body as { oldTag?: string; newTag?: string }

    if (!oldTag || !newTag) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'oldTag and newTag are required' }, 400)
    }

    const result = await mocService.renameTag(userId, oldTag, newTag)

    if (!result.ok) {
      return c.json({ error: result.error }, result.error === 'VALIDATION_ERROR' ? 400 : 500)
    }

    return c.json(result.data, 200)
  } catch (error) {
    logger.error('Unhandled error in POST /tags/rename', error, { userId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

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
    const mappedItems = await Promise.all(
      items.map(async item => ({
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
        uploadedDate:
          item.uploadedDate instanceof Date
            ? item.uploadedDate.toISOString()
            : (item.uploadedDate ?? null),
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
        thumbnailUrl: item.thumbnailUrl ? await presignS3Key(item.thumbnailUrl) : null,
        totalPieceCount: item.totalPieceCount,
        publishedAt:
          item.publishedAt instanceof Date
            ? item.publishedAt.toISOString()
            : (item.publishedAt ?? null),
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
        updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
      })),
    )

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
      createdAt: moc.createdAt instanceof Date ? moc.createdAt.toISOString() : moc.createdAt,
      updatedAt: moc.updatedAt instanceof Date ? moc.updatedAt.toISOString() : moc.updatedAt,
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
 * PATCH /mocs/:id
 * Update MOC metadata (thin adapter pattern)
 * (INST-1108: AC-2, AC-3, AC-5, AC-11, AC-12, AC-13)
 */
mocs.patch('/:id', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()

    // AC-5: Validate request with Zod
    const validated = UpdateMocRequestSchema.safeParse(body)
    if (!validated.success) {
      logger.warn('Invalid MOC update request', undefined, {
        userId,
        mocId,
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

    // AC-3: Delegate to service layer (thin adapter)
    const result = await mocService.updateMoc(userId, mocId, validated.data)

    if (!result.ok) {
      switch (result.error) {
        case 'VALIDATION_ERROR':
          // AC-12: Return 400 with validation error details
          return c.json({ error: result.error }, 400)
        case 'NOT_FOUND':
          // AC-4, AC-13: Return 404 for both not found and unauthorized (no info leakage)
          return c.json({ error: result.error }, 404)
        case 'DB_ERROR':
          // AC-14: Return 500 on database errors
          return c.json({ error: result.error }, 500)
        default:
          return c.json({ error: 'INTERNAL_ERROR' }, 500)
      }
    }

    const moc = result.data

    // Map to response format (reuse CreateMocResponse schema)
    const response = {
      id: moc.id,
      userId: moc.userId,
      title: moc.title,
      description: moc.description,
      theme: moc.theme,
      tags: moc.tags,
      slug: moc.slug,
      type: moc.type,
      createdAt: moc.createdAt instanceof Date ? moc.createdAt.toISOString() : moc.createdAt,
      updatedAt: moc.updatedAt instanceof Date ? moc.updatedAt.toISOString() : moc.updatedAt,
    }

    // AC-11: Validate response with Zod (200 with updated MOC data)
    const validatedResponse = CreateMocResponseSchema.parse(response)

    return c.json(validatedResponse, 200)
  } catch (error) {
    logger.error('Unhandled error in PATCH /mocs/:id', error, { userId, mocId })
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

    // Presign all file URLs (files are private in S3/MinIO)
    const mappedFiles = await Promise.all(
      moc.files.map(async file => ({
        id: file.id,
        mocId: file.mocId,
        fileType: file.fileType,
        name: file.originalFilename || 'Unnamed file',
        size: 0,
        mimeType: file.mimeType,
        s3Key: file.s3Key || '',
        uploadedAt: file.createdAt instanceof Date ? file.createdAt.toISOString() : file.createdAt,
        downloadUrl: await presignS3Key(file.s3Key),
      })),
    )

    // Presign thumbnailUrl if present (thumbnailUrl now stores an s3Key)
    const thumbnailUrl = moc.thumbnailUrl ? await presignS3Key(moc.thumbnailUrl) : null

    // Map stats
    const stats = {
      pieceCount: moc.partsCount ?? moc.totalPieceCount,
      fileCount: moc.files.length,
    }

    // Derive reviewStatus from review existence
    const review = await reviewRepo.findByMocAndUser(moc.id, userId)
    const reviewStatus = review ? (review.status as 'draft' | 'complete') : 'none'

    const response = {
      id: moc.id,
      userId: moc.userId,
      mocId: moc.mocId ?? null,
      source: moc.source ?? 'rebrickable',
      title: moc.title,
      description: moc.description,
      theme: moc.theme,
      tags: moc.tags,
      thumbnailUrl,
      author: moc.author ?? null,
      designerUrl: moc.designer?.profileUrl ?? null,
      createdAt: moc.createdAt instanceof Date ? moc.createdAt.toISOString() : moc.createdAt,
      updatedAt: moc.updatedAt instanceof Date ? moc.updatedAt.toISOString() : moc.updatedAt,
      publishedAt: moc.publishedAt ?? null,
      files: mappedFiles,
      stats,
      dimensions: moc.dimensions ?? null,
      ratings: moc.ratings ?? null,
      notes: moc.notes ?? null,
      buildStatus: moc.buildStatus ?? 'instructions_added',
      reviewStatus,
      reviewSkippedAt: moc.reviewSkippedAt
        ? moc.reviewSkippedAt instanceof Date
          ? moc.reviewSkippedAt.toISOString()
          : moc.reviewSkippedAt
        : null,
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
 * PUT /mocs/:id/cover
 * Set a gallery image as the cover image
 */
mocs.put('/:id/cover', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()
    const { fileId } = body as { fileId?: string }

    if (!fileId) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'fileId is required' }, 400)
    }

    // Verify the file belongs to this MOC
    const file = await mocRepo.getFileByIdAndMocId(fileId, mocId)
    if (!file) {
      return c.json({ error: 'NOT_FOUND', message: 'File not found' }, 404)
    }

    // Set the file's S3 key as the thumbnail
    await mocRepo.updateThumbnail(mocId, userId, file.s3Key)

    return c.json({ ok: true, s3Key: file.s3Key }, 200)
  } catch (error) {
    logger.error('Unhandled error in PUT /mocs/:id/cover', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /mocs/:id/pdf-captures
 * Extract specific pages from a PDF as high-res gallery images
 */
mocs.post('/:id/pdf-captures', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()
    const { fileId, pages } = body as { fileId?: string; pages?: number[] }

    if (!fileId || !Array.isArray(pages) || pages.length === 0 || pages.length > 10) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: 'fileId and pages[] (1-10) are required' },
        400,
      )
    }

    // Verify the file belongs to this MOC and is a PDF
    const file = await mocRepo.getFileByIdAndMocId(fileId, mocId)
    if (!file || file.fileType !== 'instruction') {
      return c.json({ error: 'NOT_FOUND', message: 'Instruction file not found' }, 404)
    }

    // Download PDF from S3 to temp dir
    const { randomUUID } = await import('crypto')
    const { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } = await import('fs')
    const { join } = await import('path')
    const sharp = (await import('sharp')).default

    const tmpDir = join('/tmp', `pdf-capture-${randomUUID()}`)
    mkdirSync(tmpDir, { recursive: true })
    const pdfPath = join(tmpDir, 'input.pdf')

    try {
      // Download PDF from S3
      const getCmd = new GetObjectCommand({ Bucket: presignBucket, Key: file.s3Key })
      const s3Response = await presignClient.send(getCmd)
      const pdfBytes = await s3Response.Body?.transformToByteArray()
      if (!pdfBytes) {
        return c.json({ error: 'NOT_FOUND', message: 'PDF file not found in storage' }, 404)
      }
      writeFileSync(pdfPath, pdfBytes)

      const capturedImages: Array<{ id: string; s3Key: string }> = []
      const { mocFiles: mocFilesTable } = schema

      for (const pageNum of pages) {
        const outputPrefix = join(tmpDir, `page-${pageNum}`)

        // Render page at 300 DPI using pdftoppm
        const proc = Bun.spawn(
          [
            'pdftoppm',
            '-png',
            '-r',
            '300',
            '-f',
            String(pageNum),
            '-l',
            String(pageNum),
            pdfPath,
            outputPrefix,
          ],
          { timeout: 30000 },
        )
        await proc.exited

        // pdftoppm outputs {prefix}-{pagenum}.png (zero-padded)
        const candidates = [
          `${outputPrefix}-${String(pageNum).padStart(1, '0')}.png`,
          `${outputPrefix}-${String(pageNum).padStart(2, '0')}.png`,
          `${outputPrefix}-${String(pageNum).padStart(3, '0')}.png`,
          `${outputPrefix}-${String(pageNum).padStart(4, '0')}.png`,
          `${outputPrefix}-${String(pageNum).padStart(5, '0')}.png`,
          `${outputPrefix}-${String(pageNum).padStart(6, '0')}.png`,
        ]
        const outputPath = candidates.find(p => existsSync(p))
        if (!outputPath) {
          logger.warn('pdftoppm did not produce output for page', undefined, { pageNum, mocId })
          continue
        }

        // Process with sharp: resize and convert to WebP
        const webpBuffer = await sharp(readFileSync(outputPath))
          .resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer()

        // Upload to S3
        const imageUuid = randomUUID()
        const s3Key = `mocs/${mocId}/images/pdf-capture-p${pageNum}-${imageUuid}.webp`
        const putCmd = new PutObjectCommand({
          Bucket: presignBucket,
          Key: s3Key,
          Body: webpBuffer,
          ContentType: 'image/webp',
        })
        await presignClient.send(putCmd)

        // Insert moc_files row
        const [row] = await db
          .insert(mocFilesTable)
          .values({
            mocId,
            fileType: 'gallery-image',
            s3Key,
            originalFilename: `pdf-capture-p${pageNum}.webp`,
            mimeType: 'image/webp',
          })
          .returning()

        capturedImages.push({ id: row.id, s3Key })
      }

      return c.json({ capturedImages }, 200)
    } finally {
      // Clean up temp directory
      try {
        rmSync(tmpDir, { recursive: true, force: true })
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error) {
    logger.error('Unhandled error in POST /mocs/:id/pdf-captures', error, { userId, mocId })
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

// ─────────────────────────────────────────────────────────────────────────
// Review Routes (MOC Build Status & Review System)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /mocs/:id/review
 * Create a new draft review for a MOC
 */
mocs.post('/:id/review', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Verify MOC exists and belongs to user
    const moc = await mocRepo.getMocById(mocId, userId)
    if (!moc) {
      return c.json({ error: 'NOT_FOUND' }, 404)
    }

    // Check if review already exists
    const existing = await reviewRepo.findByMocAndUser(mocId, userId)
    if (existing) {
      return c.json({ error: 'CONFLICT', message: 'Review already exists for this MOC' }, 409)
    }

    const review = await reviewRepo.create(mocId, userId)

    const response = MocReviewResponseSchema.parse({
      id: review.id,
      mocId: review.mocId,
      userId: review.userId,
      status: review.status,
      sections: review.sections,
      createdAt:
        review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
      updatedAt:
        review.updatedAt instanceof Date ? review.updatedAt.toISOString() : review.updatedAt,
    })

    return c.json(response, 201)
  } catch (error) {
    logger.error('Unhandled error in POST /mocs/:id/review', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * GET /mocs/:id/review
 * Get the review for a MOC
 */
mocs.get('/:id/review', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const review = await reviewRepo.findByMocAndUser(mocId, userId)
    if (!review) {
      return c.json({ error: 'NOT_FOUND' }, 404)
    }

    const response = MocReviewResponseSchema.parse({
      id: review.id,
      mocId: review.mocId,
      userId: review.userId,
      status: review.status,
      sections: review.sections,
      createdAt:
        review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
      updatedAt:
        review.updatedAt instanceof Date ? review.updatedAt.toISOString() : review.updatedAt,
    })

    return c.json(response, 200)
  } catch (error) {
    logger.error('Unhandled error in GET /mocs/:id/review', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * PATCH /mocs/:id/review
 * Update review sections and/or status
 * When status transitions to 'complete', sync ratings back to moc_instructions
 */
mocs.patch('/:id/review', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    const body = await c.req.json()

    const validated = UpdateReviewRequestSchema.safeParse(body)
    if (!validated.success) {
      return c.json({ error: 'VALIDATION_ERROR', details: validated.error.flatten() }, 400)
    }

    // Verify review exists
    const existing = await reviewRepo.findByMocAndUser(mocId, userId)
    if (!existing) {
      return c.json({ error: 'NOT_FOUND' }, 404)
    }

    // Merge sections if provided
    const updateData: { sections?: Record<string, unknown>; status?: string } = {}
    if (validated.data.sections) {
      updateData.sections = { ...existing.sections, ...validated.data.sections }
    }
    if (validated.data.status) {
      updateData.status = validated.data.status
    }

    const review = await reviewRepo.update(mocId, userId, updateData)

    // Sync ratings when review is completed
    if (validated.data.status === 'complete') {
      const sections = review.sections as Record<string, { rating?: number }>
      const ratings: number[] = []
      for (const section of Object.values(sections)) {
        if (section && typeof section.rating === 'number') {
          ratings.push(section.rating)
        }
      }

      const overall =
        ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null
      const buildExperience = (sections.buildExperience as { rating?: number })?.rating ?? null

      await mocRepo.updateMoc(mocId, userId, {
        ratings: { overall, buildExperience },
      } as any)
    }

    const response = MocReviewResponseSchema.parse({
      id: review.id,
      mocId: review.mocId,
      userId: review.userId,
      status: review.status,
      sections: review.sections,
      createdAt:
        review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
      updatedAt:
        review.updatedAt instanceof Date ? review.updatedAt.toISOString() : review.updatedAt,
    })

    return c.json(response, 200)
  } catch (error) {
    logger.error('Unhandled error in PATCH /mocs/:id/review', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Upload Session Routes (INST-1105)
// ─────────────────────────────────────────────────────────────────────────

/**
 * POST /mocs/:id/upload-sessions
 * Create a presigned URL upload session for large files (>10MB)
 * (INST-1105: AC31-AC48)
 */
mocs.post('/:id/upload-sessions', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  // AC32: Authentication required
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(mocId)) {
      return c.json({ error: 'VALIDATION_ERROR', message: 'Invalid MOC ID format' }, 400)
    }

    const body = await c.req.json()

    // AC31: Validate request body
    const validated = CreateUploadSessionRequestSchema.safeParse(body)
    if (!validated.success) {
      logger.warn('Invalid upload session request', undefined, {
        userId,
        mocId,
        errors: validated.error.flatten(),
      })
      return c.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: validated.error.flatten(),
        },
        400,
      )
    }

    // Call upload session service
    const result = await uploadSessionService.createUploadSession(userId, mocId, validated.data)

    if (!result.ok) {
      switch (result.error) {
        case 'VALIDATION_ERROR':
          return c.json({ error: result.error, message: 'Invalid request' }, 400)
        case 'MOC_NOT_FOUND':
          return c.json({ error: result.error, message: 'MOC not found or access denied' }, 404)
        case 'FORBIDDEN':
          return c.json({ error: result.error, message: 'Access denied' }, 403)
        case 'FILE_TOO_SMALL':
          return c.json(
            { error: result.error, message: 'File too small for presigned upload (min 10MB)' },
            400,
          )
        case 'FILE_TOO_LARGE':
          return c.json({ error: result.error, message: 'File too large (max 50MB)' }, 400)
        case 'INVALID_MIME_TYPE':
          return c.json(
            { error: result.error, message: 'Invalid file type. Only PDF files are allowed' },
            400,
          )
        case 'RATE_LIMIT_EXCEEDED':
          return c.json(
            { error: result.error, message: 'Upload limit exceeded. Try again tomorrow' },
            429,
          )
        case 'DB_ERROR':
          return c.json({ error: result.error, message: 'Database error' }, 500)
        case 'S3_ERROR':
          return c.json({ error: result.error, message: 'Storage error' }, 500)
        default:
          return c.json({ error: 'INTERNAL_ERROR' }, 500)
      }
    }

    // Validate and return response
    const response = CreateUploadSessionResponseSchema.parse(result.data)
    return c.json(response, 201)
  } catch (error) {
    logger.error('Unhandled error in POST /mocs/:id/upload-sessions', error, {
      userId,
      mocId,
    })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /mocs/:id/upload-sessions/:sessionId/complete
 * Complete an upload session after S3 upload
 * (INST-1105: AC49-AC65)
 */
mocs.post('/:id/upload-sessions/:sessionId/complete', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')
  const sessionId = c.req.param('sessionId')

  // AC49: Authentication required
  if (!userId) {
    return c.json({ error: 'UNAUTHORIZED' }, 401)
  }

  try {
    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(mocId) || !uuidRegex.test(sessionId)) {
      return c.json(
        { error: 'VALIDATION_ERROR', message: 'Invalid MOC ID or session ID format' },
        400,
      )
    }

    // Call upload session service
    const result = await uploadSessionService.completeUploadSession(userId, mocId, sessionId)

    if (!result.ok) {
      switch (result.error) {
        case 'SESSION_NOT_FOUND':
          return c.json({ error: result.error, message: 'Upload session not found' }, 404)
        case 'FORBIDDEN':
          return c.json({ error: result.error, message: 'Access denied' }, 403)
        case 'EXPIRED_SESSION':
          return c.json({ error: result.error, message: 'Upload session has expired' }, 410)
        case 'SESSION_ALREADY_COMPLETED':
          return c.json({ error: result.error, message: 'Session already completed' }, 409)
        case 'FILE_NOT_IN_S3':
          return c.json(
            { error: result.error, message: 'File not found in storage. Upload may have failed' },
            400,
          )
        case 'SIZE_MISMATCH':
          return c.json(
            { error: result.error, message: 'Uploaded file size does not match expected size' },
            400,
          )
        case 'DB_ERROR':
          return c.json({ error: result.error, message: 'Database error' }, 500)
        case 'S3_ERROR':
          return c.json({ error: result.error, message: 'Storage error' }, 500)
        default:
          return c.json({ error: 'INTERNAL_ERROR' }, 500)
      }
    }

    // Transform s3Key to fileUrl for API response
    const { buildFileUrl } = await import('../instructions/adapters/storage.js')
    const { s3Key: _key, ...rest } = result.data
    const response = CompleteUploadSessionResponseSchema.parse({
      ...rest,
      fileUrl: buildFileUrl(result.data.s3Key),
    })
    return c.json(response, 200)
  } catch (error) {
    logger.error('Unhandled error in POST /mocs/:id/upload-sessions/:sessionId/complete', error, {
      userId,
      mocId,
      sessionId,
    })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// Want-to-Build Toggle (Procurement)
// ─────────────────────────────────────────────────────────────────────────

/**
 * PATCH /mocs/:id/want-to-build — toggle procurement flag
 */
mocs.patch('/:id/want-to-build', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  try {
    const body = await c.req.json()
    const wantToBuild = body?.wantToBuild === true

    const [result] = await db
      .update(schema.mocInstructions)
      .set({ wantToBuild, updatedAt: new Date() })
      .where(and(eq(schema.mocInstructions.id, mocId), eq(schema.mocInstructions.userId, userId)))
      .returning({ id: schema.mocInstructions.id })

    if (!result) {
      return c.json({ error: 'NOT_FOUND' }, 404)
    }

    return c.json({ success: true, wantToBuild })
  } catch (error) {
    logger.error('Failed to toggle want-to-build', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// GET /mocs/:id/source-sets — LEGO sets this MOC is built from
// ─────────────────────────────────────────────────────────────────────────

mocs.get('/:id/source-sets', async c => {
  const userId = c.get('userId')
  const mocId = c.req.param('id')

  try {
    // Get the MOC to find its mocId (external MOC number like "MOC-253417")
    const [moc] = await db
      .select({ mocId: schema.mocInstructions.mocId })
      .from(schema.mocInstructions)
      .where(and(eq(schema.mocInstructions.id, mocId), eq(schema.mocInstructions.userId, userId)))
      .limit(1)

    if (!moc?.mocId) {
      return c.json({ error: 'NOT_FOUND' }, 404)
    }

    // Find linked sets via moc_source_sets join table
    const sourceSets = await db
      .select({
        id: schema.mocSourceSets.id,
        setNumber: schema.mocSourceSets.setNumber,
        createdAt: schema.mocSourceSets.createdAt,
      })
      .from(schema.mocSourceSets)
      .where(eq(schema.mocSourceSets.mocNumber, moc.mocId))

    // Enrich with set data from the sets table where available
    const enriched = await Promise.all(
      sourceSets.map(async ss => {
        const [set] = await db
          .select({
            id: schema.sets.id,
            title: schema.sets.title,
            setNumber: schema.sets.setNumber,
            imageUrl: schema.sets.imageUrl,
            pieceCount: schema.sets.pieceCount,
            year: schema.sets.year,
            theme: schema.sets.theme,
          })
          .from(schema.sets)
          .where(eq(schema.sets.setNumber, ss.setNumber))
          .limit(1)

        return {
          setNumber: ss.setNumber,
          set: set || null,
        }
      }),
    )

    return c.json({ sourceSets: enriched })
  } catch (error) {
    logger.error('Failed to get source sets', error, { userId, mocId })
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

export default mocs

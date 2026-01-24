/**
 * Initialize MOC with Files Lambda Function
 *
 * Phase 1 of two-phase MOC creation with file uploads.
 * Creates MOC record and generates presigned S3 URLs for file uploads.
 *
 * Route: POST /api/mocs/with-files/initialize
 *
 * Features:
 * - Creates MOC record in database
 * - Generates presigned S3 URLs for direct client uploads
 * - Creates placeholder file records in database
 * - Returns MOC ID and upload URLs
 *
 * Flow:
 * 1. Client calls this endpoint with MOC metadata + file list
 * 2. Lambda creates MOC record
 * 3. Lambda generates presigned URLs for each file
 * 4. Client uploads files directly to S3 using presigned URLs
 * 5. Client calls finalize endpoint to confirm uploads
 *
 * Authentication: JWT via AWS Cognito
 */

import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createRateLimiter, generateDailyKey, RATE_LIMIT_WINDOWS } from '@repo/rate-limit'
import {
  successResponse,
  errorResponseFromError,
  errorResponse,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import {
  BadRequestError,
  UnauthorizedError,
  ValidationError,
  ConflictError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { db } from '@/core/database/client'
import { mocInstructions, mocFiles } from '@/core/database/schema'
import { getUploadConfig, isMimeTypeAllowed, getAllowedMimeTypes } from '@/core/config/upload'
import { createPostgresRateLimitStore } from '@/core/rate-limit/postgres-store'
import { sanitizeFilenameForS3 } from '@/core/utils/filename-sanitizer'

const logger = createLogger('initialize-with-files')

/**
 * File metadata schema for initialization
 */
const FileMetadataSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  fileType: z.enum(['instruction', 'parts-list', 'gallery-image', 'thumbnail']),
  mimeType: z.string().min(1, 'MIME type is required'),
  size: z.number().positive('File size must be positive'),
})

/**
 * Designer schema for nested object
 */
const DesignerSchema = z.object({
  username: z.string().min(1).max(100),
  displayName: z.string().max(255).nullable().optional(),
  profileUrl: z.string().url().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  socialLinks: z
    .object({
      instagram: z.string().url().nullable().optional(),
      twitter: z.string().url().nullable().optional(),
      youtube: z.string().url().nullable().optional(),
      website: z.string().url().nullable().optional(),
    })
    .nullable()
    .optional(),
  stats: z
    .object({
      publicCreationsCount: z.number().int().nonnegative().nullable().optional(),
      totalPublicViews: z.number().int().nonnegative().nullable().optional(),
      totalPublicLikes: z.number().int().nonnegative().nullable().optional(),
      staffPickedCount: z.number().int().nonnegative().nullable().optional(),
    })
    .nullable()
    .optional(),
})

/**
 * Dimensions schema for nested object
 */
const DimensionsSchema = z.object({
  height: z
    .object({
      cm: z.number().positive().nullable().optional(),
      inches: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  width: z
    .object({
      cm: z.number().positive().nullable().optional(),
      inches: z.number().positive().nullable().optional(),
      openCm: z.number().positive().nullable().optional(),
      openInches: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  depth: z
    .object({
      cm: z.number().positive().nullable().optional(),
      inches: z.number().positive().nullable().optional(),
      openCm: z.number().positive().nullable().optional(),
      openInches: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  weight: z
    .object({
      kg: z.number().positive().nullable().optional(),
      lbs: z.number().positive().nullable().optional(),
    })
    .nullable()
    .optional(),
  studsWidth: z.number().int().positive().nullable().optional(),
  studsDepth: z.number().int().positive().nullable().optional(),
})

/**
 * Instructions metadata schema
 */
const InstructionsMetadataSchema = z.object({
  instructionType: z.enum(['pdf', 'xml', 'studio', 'ldraw', 'lxf', 'other']).nullable().optional(),
  hasInstructions: z.boolean().default(false),
  pageCount: z.number().int().positive().nullable().optional(),
  fileSize: z.number().int().positive().nullable().optional(),
  previewImages: z.array(z.string().url()).default([]),
})

/**
 * Alternate build schema
 */
const AlternateBuildSchema = z.object({
  isAlternateBuild: z.boolean().default(false),
  sourceSetNumbers: z.array(z.string()).default([]),
  sourceSetNames: z.array(z.string()).default([]),
  setsRequired: z.number().int().positive().nullable().optional(),
  additionalPartsNeeded: z.number().int().nonnegative().default(0),
})

/**
 * Feature schema
 */
const FeatureSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
})

/**
 * Source platform schema (BrickLink-specific)
 */
const SourcePlatformSchema = z.object({
  platform: z.enum(['rebrickable', 'bricklink', 'brickowl', 'mecabricks', 'studio', 'other']),
  externalId: z.string().max(100).nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  uploadSource: z
    .enum(['web', 'desktop_app', 'mobile_app', 'api', 'unknown'])
    .nullable()
    .optional(),
  forkedFromId: z.string().max(100).nullable().optional(),
  importedAt: z.string().datetime().nullable().optional(),
})

/**
 * Event badge schema (BrickLink-specific)
 */
const EventBadgeSchema = z.object({
  eventId: z.string().max(100),
  eventName: z.string().max(255),
  badgeType: z.string().max(50).nullable().optional(),
  badgeImageUrl: z.string().url().nullable().optional(),
  awardedAt: z.string().datetime().nullable().optional(),
})

/**
 * Moderation schema (BrickLink-specific)
 */
const ModerationSchema = z.object({
  action: z.enum(['none', 'approved', 'flagged', 'removed', 'pending']).default('none'),
  moderatedAt: z.string().datetime().nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
  forcedPrivate: z.boolean().default(false),
})

/**
 * MOC initialization schema
 */
const InitializeMocWithFilesSchema = z.object({
  // Basic fields
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['moc', 'set']),
  tags: z.array(z.string()).optional(),

  // MOC-specific fields
  author: z.string().optional(),
  setNumber: z.string().optional(),
  partsCount: z.number().optional(),
  minifigCount: z.number().int().nonnegative().optional(),
  theme: z.string().optional(),
  themeId: z.number().int().optional(),
  subtheme: z.string().optional(),
  uploadedDate: z.string().datetime().optional(),

  // Set-specific fields
  brand: z.string().optional(),
  releaseYear: z.number().optional(),
  retired: z.boolean().optional(),

  // Core identification
  mocId: z.string().max(50).optional(),
  slug: z.string().max(255).optional(),

  // Extended metadata (JSONB)
  designer: DesignerSchema.optional(),
  dimensions: DimensionsSchema.optional(),
  instructionsMetadata: InstructionsMetadataSchema.optional(),
  alternateBuild: AlternateBuildSchema.optional(),
  features: z.array(FeatureSchema).optional(),

  // Rich description
  descriptionHtml: z.string().optional(),
  shortDescription: z.string().max(500).optional(),

  // Build info
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional(),
  buildTimeHours: z.number().positive().optional(),
  ageRecommendation: z.string().max(20).optional(),

  // Status
  status: z.enum(['draft', 'published', 'archived', 'pending_review']).optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),

  // BrickLink-specific fields
  sourcePlatform: SourcePlatformSchema.optional(),
  eventBadges: z.array(EventBadgeSchema).optional(),
  moderation: ModerationSchema.optional(),
  platformCategoryId: z.number().int().optional(),

  // Files
  files: z.array(FileMetadataSchema).min(1, 'At least one file is required'),
})

/**
 * API Gateway Event Interface
 */
interface APIGatewayEvent {
  requestContext: {
    http: {
      method: string
      path: string
    }
    authorizer?: {
      jwt?: {
        claims: {
          sub: string
          email?: string
        }
      }
    }
    requestId: string
  }
  body?: string | null
}

/**
 * Main Lambda Handler
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('Initialize MOC with Files Lambda invoked', {
      requestId: event.requestContext.requestId,
      method: event.requestContext.http.method,
      path: event.requestContext.http.path,
    })

    // Verify authentication
    const userId = getUserIdFromEvent(event)

    // Parse and validate request body
    if (!event.body) {
      throw new BadRequestError('Request body is required')
    }

    const body = JSON.parse(event.body)
    const validation = InitializeMocWithFilesSchema.safeParse(body)

    if (!validation.success) {
      throw new ValidationError('Invalid request body', {
        errors: validation.error.flatten(),
      })
    }

    const { files, ...mocData } = validation.data
    const requestId = event.requestContext.requestId

    logger.info('Creating MOC with file uploads', {
      requestId,
      ownerId: userId,
      title: mocData.title,
      type: mocData.type,
      fileCount: files.length,
    })

    // Validate file requirements
    validateFileRequirements(files)

    // Check rate limit BEFORE any DB writes (Story 3.1.6)
    const uploadConfig = getUploadConfig()
    const store = createPostgresRateLimitStore()
    const rateLimiter = createRateLimiter(store)
    const rateLimitKey = generateDailyKey('moc-upload', userId)
    const rateLimitResult = await rateLimiter.checkLimit(rateLimitKey, {
      maxRequests: uploadConfig.rateLimitPerDay,
      windowMs: RATE_LIMIT_WINDOWS.DAY,
    })

    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for initialize', {
        requestId,
        ownerId: userId,
        currentCount: rateLimitResult.currentCount,
        maxPerDay: uploadConfig.rateLimitPerDay,
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      })

      return errorResponse(429, 'TOO_MANY_REQUESTS', 'Daily upload limit exceeded', {
        message: `You have reached your daily upload limit of ${uploadConfig.rateLimitPerDay}. Please try again tomorrow.`,
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      })
    }

    logger.info('Rate limit check passed', {
      requestId,
      ownerId: userId,
      remaining: rateLimitResult.remaining,
    })

    // Story 3.1.7: Pre-check for duplicate title
    const [existingMoc] = await db
      .select({ id: mocInstructions.id })
      .from(mocInstructions)
      .where(and(eq(mocInstructions.userId, userId), eq(mocInstructions.title, mocData.title)))
      .limit(1)

    if (existingMoc) {
      logger.warn('Duplicate title conflict', {
        requestId,
        ownerId: userId,
        title: mocData.title,
        existingMocId: existingMoc.id,
      })
      throw new ConflictError('A MOC with this title already exists', {
        title: mocData.title,
        existingMocId: existingMoc.id,
      })
    }

    // Generate MOC ID
    const mocId = uuidv4()
    const now = new Date()

    // Prepare MOC values with all new fields
    const baseValues = {
      id: mocId,
      userId,
      title: mocData.title,
      description: mocData.description || null,
      type: mocData.type,
      tags: mocData.tags || null,
      thumbnailUrl: null, // Will be set in finalize step

      // Core identification
      mocId: mocData.mocId || null,
      slug: mocData.slug || null,

      // Extended metadata (JSONB)
      designer: mocData.designer || null,
      dimensions: mocData.dimensions || null,
      instructionsMetadata: mocData.instructionsMetadata || null,
      alternateBuild: mocData.alternateBuild || null,
      features: mocData.features || null,

      // BrickLink-specific fields
      sourcePlatform: mocData.sourcePlatform || null,
      eventBadges: mocData.eventBadges || null,
      moderation: mocData.moderation || null,
      platformCategoryId: mocData.platformCategoryId || null,

      // Rich description
      descriptionHtml: mocData.descriptionHtml || null,
      shortDescription: mocData.shortDescription || null,

      // Build info
      difficulty: mocData.difficulty || null,
      buildTimeHours: mocData.buildTimeHours ?? null,
      ageRecommendation: mocData.ageRecommendation || null,

      // Status
      status: mocData.status || 'draft',
      visibility: mocData.visibility || 'private',
      isFeatured: false,
      isVerified: false,

      // Audit trail
      addedByUserId: userId,

      // Timestamps
      createdAt: now,
      updatedAt: now,
    }

    // Add type-specific fields
    const values =
      mocData.type === 'moc'
        ? {
            ...baseValues,
            author: mocData.author || null,
            setNumber: mocData.setNumber || null,
            partsCount: mocData.partsCount || null,
            minifigCount: mocData.minifigCount || null,
            theme: mocData.theme || null,
            themeId: mocData.themeId || null,
            subtheme: mocData.subtheme || null,
            uploadedDate: mocData.uploadedDate ? new Date(mocData.uploadedDate) : now,
            brand: null,
            releaseYear: null,
            retired: null,
          }
        : {
            ...baseValues,
            author: null,
            brand: mocData.brand || null,
            theme: mocData.theme || null,
            themeId: mocData.themeId || null,
            setNumber: mocData.setNumber || null,
            releaseYear: mocData.releaseYear || null,
            retired: mocData.retired || false,
            partsCount: mocData.partsCount || null,
            minifigCount: mocData.minifigCount || null,
            subtheme: null,
            uploadedDate: null,
          }

    // Insert MOC into database (with unique violation fallback for race conditions)
    let moc
    try {
      const [insertedMoc] = await db.insert(mocInstructions).values(values).returning()
      moc = insertedMoc
    } catch (insertError) {
      // Story 3.1.7: Handle Postgres unique violation (code 23505) for race conditions
      if (isPostgresUniqueViolation(insertError)) {
        logger.warn('Duplicate title conflict (race condition)', {
          requestId,
          ownerId: userId,
          title: mocData.title,
        })
        throw new ConflictError('A MOC with this title already exists', {
          title: mocData.title,
        })
      }
      throw insertError
    }

    logger.info('MOC created', { requestId, ownerId: userId, mocId, title: moc.title })

    // Generate presigned URLs for each file
    const uploadUrls = await generatePresignedUrls(mocId, userId, files)

    logger.info('Presigned URLs generated', {
      requestId,
      ownerId: userId,
      mocId,
      urlCount: uploadUrls.length,
    })

    // Story 3.1.8: Use config-driven session TTL (reuse uploadConfig from rate limit check)
    return successResponse(201, {
      message: 'MOC initialized successfully. Upload files using the provided URLs.',
      data: {
        mocId,
        uploadUrls,
        expiresIn: uploadConfig.sessionTtlSeconds, // Session TTL from config
        sessionTtlSeconds: uploadConfig.sessionTtlSeconds, // Explicit alias for clarity
      },
    })
  } catch (error) {
    logger.error('Initialize MOC with files error:', error)
    return errorResponseFromError(error)
  }
}

/**
 * Extract user ID from JWT claims
 */
function getUserIdFromEvent(event: APIGatewayEvent): string {
  const userId = event.requestContext.authorizer?.jwt?.claims.sub

  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  return userId
}

/**
 * Check if error is a Postgres unique violation (code 23505)
 * Story 3.1.7: Used to catch race conditions on duplicate title
 */
function isPostgresUniqueViolation(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code: string }).code === '23505'
  }
  return false
}

/**
 * Validate file requirements
 */
function validateFileRequirements(files: z.infer<typeof FileMetadataSchema>[]): void {
  // Must have at least one instruction file
  const instructionFiles = files.filter(f => f.fileType === 'instruction')
  if (instructionFiles.length === 0) {
    throw new BadRequestError('At least one instruction file is required')
  }

  // Validate file count limits
  if (instructionFiles.length > 10) {
    throw new BadRequestError('Maximum 10 instruction files allowed')
  }

  // Use config for file count limits
  const uploadConfig = getUploadConfig()

  const partsListFiles = files.filter(f => f.fileType === 'parts-list')
  if (partsListFiles.length > uploadConfig.partsListMaxCount) {
    throw new BadRequestError(`Maximum ${uploadConfig.partsListMaxCount} parts list files allowed`)
  }

  const imageFiles = files.filter(f => f.fileType === 'gallery-image' || f.fileType === 'thumbnail')
  if (imageFiles.length > uploadConfig.imageMaxCount) {
    throw new BadRequestError(`Maximum ${uploadConfig.imageMaxCount} images allowed`)
  }

  // Validate file sizes and MIME types using config
  for (const file of files) {
    let maxSize: number
    let maxSizeMb: number

    switch (file.fileType) {
      case 'instruction':
        maxSize = uploadConfig.pdfMaxBytes
        maxSizeMb = uploadConfig.pdfMaxMb
        break
      case 'parts-list':
        maxSize = uploadConfig.partsListMaxBytes
        maxSizeMb = uploadConfig.partsListMaxMb
        break
      case 'thumbnail':
      case 'gallery-image':
        maxSize = uploadConfig.imageMaxBytes
        maxSizeMb = uploadConfig.imageMaxMb
        break
      default:
        throw new BadRequestError(`Unknown file type: ${file.fileType}`)
    }

    if (file.size > maxSize) {
      throw new BadRequestError(
        `File ${file.filename} exceeds size limit for ${file.fileType} (max: ${maxSizeMb} MB)`,
      )
    }

    // Story 3.1.8: Validate MIME type against allowlist
    if (!isMimeTypeAllowed(file.fileType, file.mimeType)) {
      const allowedTypes = getAllowedMimeTypes(file.fileType)
      throw new BadRequestError(
        `File ${file.filename} has invalid MIME type "${file.mimeType}" for ${file.fileType}. Allowed types: ${allowedTypes.join(', ')}`,
      )
    }
  }
}

/**
 * Generate presigned S3 URLs for file uploads
 */
async function generatePresignedUrls(
  mocId: string,
  userId: string,
  files: z.infer<typeof FileMetadataSchema>[],
): Promise<
  Array<{
    fileId: string
    filename: string
    fileType: string
    uploadUrl: string
    expiresIn: number
  }>
> {
  const bucketName = process.env.LEGO_API_BUCKET_NAME
  if (!bucketName) {
    throw new Error('S3 bucket not configured')
  }

  const s3Client = new S3Client({})
  const uploadUrls: Array<{
    fileId: string
    filename: string
    fileType: string
    uploadUrl: string
    expiresIn: number
  }> = []

  // Create file records and generate presigned URLs
  for (const file of files) {
    const fileId = uuidv4()
    const timestamp = Date.now()
    // Story 3.1.22: Secure filename sanitization
    const sanitizedFilename = sanitizeFilenameForS3(file.filename)
    const s3Key = `mocs/${mocId}/${file.fileType}/${timestamp}-${sanitizedFilename}`

    // Create placeholder file record
    await db.insert(mocFiles).values({
      id: fileId,
      mocId,
      fileType: file.fileType,
      fileUrl: `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`,
      originalFilename: file.filename,
      mimeType: file.mimeType,
      createdAt: new Date(),
    })

    // Generate presigned URL for PUT operation
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: file.mimeType,
      Metadata: {
        mocId,
        userId,
        fileType: file.fileType,
        originalFilename: file.filename,
        fileId,
      },
    })

    // Use TTL from upload config (in seconds)
    const uploadConfig = getUploadConfig()
    const expiresIn = uploadConfig.presignTtlSeconds
    const uploadUrl = await getSignedUrl(s3Client as any, command, { expiresIn })

    uploadUrls.push({
      fileId,
      filename: file.filename,
      fileType: file.fileType,
      uploadUrl,
      expiresIn,
    })

    logger.info('Generated presigned URL', {
      fileId,
      filename: file.filename,
      fileType: file.fileType,
      s3Key,
    })
  }

  return uploadUrls
}

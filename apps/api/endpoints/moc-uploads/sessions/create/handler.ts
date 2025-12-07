/**
 * Create Upload Session Lambda Function
 *
 * Story 3.1.11: Upload Session Endpoint — Validation, Owner Keys, TTL
 *
 * Creates an upload session for multipart file uploads.
 * Returns sessionId, partSizeBytes, and expiresAt.
 *
 * Route: POST /api/mocs/uploads/sessions
 */

import {
  successResponse,
  errorResponseFromError,
  errorResponse,
  type APIGatewayProxyResult,
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { getDbAsync } from '@/core/database/client'
import { uploadSessions } from '@/core/database/schema'
import { v4 as uuidv4 } from 'uuid'
import { getUploadConfig, isMimeTypeAllowed, getAllowedMimeTypes } from '@/core/config/upload'
import { checkAndIncrementDailyLimit } from '@/core/rate-limit/upload-rate-limit'
import {
  CreateSessionRequestSchema,
  type CreateSessionResponse,
  type FileMetadata,
} from '../_shared/schemas'

const logger = createLogger('create-upload-session')

/**
 * Map file category to config file type
 */
function categoryToFileType(category: string): 'instruction' | 'parts-list' | 'gallery-image' {
  switch (category) {
    case 'instruction':
      return 'instruction'
    case 'parts-list':
      return 'parts-list'
    case 'image':
    case 'thumbnail':
      return 'gallery-image'
    default:
      return 'gallery-image'
  }
}

/**
 * Validate files against upload config limits
 */
function validateFilesAgainstConfig(
  files: FileMetadata[],
  config: ReturnType<typeof getUploadConfig>,
): void {
  // Must have at least one instruction file
  const instructionFiles = files.filter(f => f.category === 'instruction')
  if (instructionFiles.length === 0) {
    throw new BadRequestError('At least one instruction file is required')
  }

  // Check file count limits
  const partsListFiles = files.filter(f => f.category === 'parts-list')
  if (partsListFiles.length > config.partsListMaxCount) {
    throw new BadRequestError(`Maximum ${config.partsListMaxCount} parts list files allowed`)
  }

  const imageFiles = files.filter(f => f.category === 'image' || f.category === 'thumbnail')
  if (imageFiles.length > config.imageMaxCount) {
    throw new BadRequestError(`Maximum ${config.imageMaxCount} images allowed`)
  }

  // Validate each file
  for (const file of files) {
    const fileType = categoryToFileType(file.category)
    let maxSize: number
    let maxSizeMb: number

    switch (file.category) {
      case 'instruction':
        maxSize = config.pdfMaxBytes
        maxSizeMb = config.pdfMaxMb
        break
      case 'parts-list':
        maxSize = config.partsListMaxBytes
        maxSizeMb = config.partsListMaxMb
        break
      case 'image':
      case 'thumbnail':
        maxSize = config.imageMaxBytes
        maxSizeMb = config.imageMaxMb
        break
      default:
        throw new BadRequestError(`Unknown file category: ${file.category}`)
    }

    // Check size limit (413 Payload Too Large)
    if (file.size > maxSize) {
      throw new BadRequestError(
        `File "${file.name}" exceeds size limit for ${file.category} (max: ${maxSizeMb} MB)`,
        { statusCode: 413 },
      )
    }

    // Check MIME type (415 Unsupported Media Type)
    if (!isMimeTypeAllowed(fileType, file.type)) {
      const allowedTypes = getAllowedMimeTypes(fileType)
      throw new BadRequestError(
        `File "${file.name}" has invalid MIME type "${file.type}". Allowed: ${allowedTypes.join(', ')}`,
        { statusCode: 415, allowedTypes },
      )
    }
  }
}

/** Default part size: 5MB (S3 minimum for multipart) */
const DEFAULT_PART_SIZE_BYTES = 5 * 1024 * 1024

/**
 * API Gateway Event Interface
 */
interface APIGatewayEvent {
  requestContext: {
    http: { method: string; path: string }
    authorizer?: { jwt?: { claims: { sub: string; email?: string } } }
    requestId: string
  }
  body?: string | null
}

/**
 * Main Lambda Handler
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId

  try {
    logger.info('Create upload session invoked', {
      requestId,
      method: event.requestContext.http.method,
      path: event.requestContext.http.path,
    })

    // Verify authentication
    const userId = event.requestContext.authorizer?.jwt?.claims.sub
    if (!userId) {
      throw new UnauthorizedError('Authentication required')
    }

    // Parse and validate request body
    if (!event.body) {
      throw new BadRequestError('Request body is required')
    }

    let body: unknown
    try {
      body = JSON.parse(event.body)
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }

    const validation = CreateSessionRequestSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid request body', {
        errors: validation.error.flatten(),
      })
    }

    const { files } = validation.data
    const uploadConfig = getUploadConfig()

    // Check rate limit BEFORE any DB writes (Story 3.1.6)
    const rateLimitResult = await checkAndIncrementDailyLimit(userId, uploadConfig.rateLimitPerDay)
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for session creation', {
        requestId,
        ownerId: userId,
        currentCount: rateLimitResult.currentCount,
        maxPerDay: uploadConfig.rateLimitPerDay,
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      })
      return errorResponse(429, 'TOO_MANY_REQUESTS', 'Daily upload limit exceeded', {
        message: `Daily limit of ${uploadConfig.rateLimitPerDay} reached. Try again tomorrow.`,
        nextAllowedAt: rateLimitResult.nextAllowedAt.toISOString(),
        retryAfterSeconds: rateLimitResult.retryAfterSeconds,
      })
    }

    // Validate files against config limits
    validateFilesAgainstConfig(files, uploadConfig)

    // Create session in database
    const db = await getDbAsync()
    const sessionId = uuidv4()
    const expiresAt = new Date(Date.now() + uploadConfig.sessionTtlSeconds * 1000)

    await db.insert(uploadSessions).values({
      id: sessionId,
      userId,
      status: 'active',
      partSizeBytes: DEFAULT_PART_SIZE_BYTES,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    logger.info('Upload session created', {
      requestId,
      ownerId: userId,
      sessionId,
      fileCount: files.length,
      expiresAt: expiresAt.toISOString(),
    })

    const response: CreateSessionResponse = {
      sessionId,
      partSizeBytes: DEFAULT_PART_SIZE_BYTES,
      expiresAt: expiresAt.toISOString(),
    }

    return successResponse(201, { data: response })
  } catch (error) {
    logger.error('Create upload session error', { requestId, error })
    return errorResponseFromError(error)
  }
}

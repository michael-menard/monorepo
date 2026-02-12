import type { Result } from '@repo/api-core'
import { ok, err } from '@repo/api-core'
import { logger } from '@repo/logger'
import { fileTypeFromBuffer } from 'file-type'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  MocRepository,
  Moc,
  MocWithFiles,
  MocListResult,
  MocImageStorage,
  UploadSessionRepository,
  S3StoragePort,
  UploadSession,
  MocFile,
} from '../ports/index.js'
import type {
  CreateMocRequest,
  UpdateMocRequest,
  ListMocsQuery,
  CreateUploadSessionRequest,
} from '../types.js'
import {
  CreateMocRequestSchema,
  UpdateMocRequestSchema,
  ListMocsQuerySchema,
  CreateUploadSessionRequestSchema,
} from '../types.js'

/**
 * MOC Service Dependencies
 */
export interface MocServiceDeps {
  mocRepo: MocRepository
  imageStorage?: MocImageStorage
}

/**
 * Create the MOC Service
 */
export function createMocService(deps: MocServiceDeps) {
  const { mocRepo, imageStorage } = deps

  // Initialize S3 client for presigned URLs
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
  })
  const bucket = process.env.S3_BUCKET

  return {
    /**
     * Create a new MOC
     */
    async createMoc(
      userId: string,
      data: CreateMocRequest,
    ): Promise<Result<Moc, 'VALIDATION_ERROR' | 'DUPLICATE_TITLE' | 'DB_ERROR'>> {
      // Validate with Zod
      const validated = CreateMocRequestSchema.safeParse(data)
      if (!validated.success) {
        logger.warn('MOC validation failed', undefined, {
          userId,
          errors: validated.error.flatten(),
        })
        return err('VALIDATION_ERROR')
      }

      try {
        const moc = await mocRepo.create(userId, validated.data)
        logger.info('MOC created successfully', undefined, {
          userId,
          mocId: moc.id,
          title: moc.title,
        })
        return ok(moc)
      } catch (error: any) {
        // Check for unique constraint violation on (userId, title)
        if (error.code === '23505' && error.constraint === 'moc_instructions_user_title_unique') {
          logger.warn('Duplicate MOC title', undefined, { userId, title: data.title })
          return err('DUPLICATE_TITLE')
        }

        logger.error('Failed to create MOC', error, { userId, title: data.title })
        return err('DB_ERROR')
      }
    },

    /**
     * Get MOC by ID with authorization check
     * Returns null if MOC doesn't exist or user is not authorized
     * (INST-1101: AC-12, AC-16, AC-21)
     */
    async getMoc(userId: string, mocId: string): Promise<Result<MocWithFiles | null, 'DB_ERROR'>> {
      try {
        // Repository enforces authorization via userId filter
        const moc = await mocRepo.getMocById(mocId, userId)

        if (moc) {
          logger.info('MOC retrieved successfully', undefined, { userId, mocId })
        } else {
          // Don't log as error - could be 404 or unauthorized access
          logger.debug('MOC not found or unauthorized', undefined, { userId, mocId })
        }

        return ok(moc)
      } catch (error: any) {
        logger.error('Failed to retrieve MOC', error, { userId, mocId })
        return err('DB_ERROR')
      }
    },

    /**
     * Update MOC metadata
     * (INST-1108: AC-1, AC-3, AC-4, AC-10)
     *
     * Business logic:
     * 1. Validate request data
     * 2. Verify user owns the MOC (authorization)
     * 3. Update MOC with partial semantics
     * 4. Return updated MOC
     */
    async updateMoc(
      userId: string,
      mocId: string,
      data: UpdateMocRequest,
    ): Promise<Result<Moc, 'VALIDATION_ERROR' | 'NOT_FOUND' | 'DB_ERROR'>> {
      // Validate with Zod
      const validated = UpdateMocRequestSchema.safeParse(data)
      if (!validated.success) {
        logger.warn('MOC update validation failed', undefined, {
          userId,
          mocId,
          errors: validated.error.flatten(),
        })
        return err('VALIDATION_ERROR')
      }

      try {
        // AC-4: Verify user owns the MOC (authorization check)
        // Returns null if MOC doesn't exist or user doesn't own it
        const existingMoc = await mocRepo.getMocById(mocId, userId)
        if (!existingMoc) {
          // AC-4, AC-13: Return NOT_FOUND for both not found and unauthorized (no info leakage)
          logger.warn('MOC not found or unauthorized for update', undefined, { userId, mocId })
          return err('NOT_FOUND')
        }

        // AC-10: Update MOC with partial semantics (repository sets updatedAt)
        const updatedMoc = await mocRepo.updateMoc(mocId, userId, validated.data)
        logger.info('MOC updated successfully', undefined, {
          userId,
          mocId,
          updatedFields: Object.keys(validated.data),
        })
        return ok(updatedMoc)
      } catch (error: any) {
        logger.error('Failed to update MOC', error, { userId, mocId })
        return err('DB_ERROR')
      }
    },

    /**
     * List MOCs for a user with pagination and filters
     * (INST-1102: Gallery listing)
     */
    async listMocs(
      userId: string,
      query: ListMocsQuery,
    ): Promise<Result<MocListResult & { query: ListMocsQuery }, 'VALIDATION_ERROR' | 'DB_ERROR'>> {
      // Validate query params
      const validated = ListMocsQuerySchema.safeParse(query)
      if (!validated.success) {
        logger.warn('Invalid list query', undefined, { userId, errors: validated.error.flatten() })
        return err('VALIDATION_ERROR')
      }

      try {
        const result = await mocRepo.list(userId, validated.data)
        logger.info('MOCs listed successfully', undefined, {
          userId,
          count: result.items.length,
          total: result.total,
          page: validated.data.page,
        })
        return ok({ ...result, query: validated.data })
      } catch (error: any) {
        logger.error('Failed to list MOCs', error, { userId })
        return err('DB_ERROR')
      }
    },

    /**
     * Upload thumbnail for a MOC
     * (INST-1103: AC49-AC52, AC24-AC28, AC34)
     *
     * Business logic:
     * 1. Verify user owns the MOC (AC21)
     * 2. Validate file type and size (AC24-AC28)
     * 3. Upload to S3 with WebP conversion (AC57)
     * 4. Delete old thumbnail if exists (AC32)
     * 5. Update database with new URL (AC34: transaction safety)
     */
    async uploadThumbnail(
      userId: string,
      mocId: string,
      file: { buffer: Buffer; filename: string; mimetype: string; size: number },
    ): Promise<
      Result<
        { thumbnailUrl: string },
        | 'MOC_NOT_FOUND'
        | 'FORBIDDEN'
        | 'INVALID_MIME_TYPE'
        | 'FILE_TOO_LARGE'
        | 'FILE_TOO_SMALL'
        | 'IMAGE_TOO_LARGE'
        | 'INVALID_IMAGE'
        | 'UPLOAD_FAILED'
        | 'DB_ERROR'
      >
    > {
      if (!imageStorage) {
        logger.error('Image storage not configured', undefined, { userId, mocId })
        return err('UPLOAD_FAILED')
      }

      // AC21: Verify user owns the MOC
      const mocResult = await this.getMoc(userId, mocId)
      if (!mocResult.ok) {
        return err('DB_ERROR')
      }
      if (!mocResult.data) {
        logger.warn('MOC not found or forbidden', undefined, { userId, mocId })
        return err('MOC_NOT_FOUND')
      }

      const moc = mocResult.data

      // AC24-AC25: Validate MIME type with file-type library
      const detectedType = await fileTypeFromBuffer(file.buffer)
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

      if (!detectedType || !allowedMimeTypes.includes(detectedType.mime)) {
        // AC35: Security logging for rejected uploads
        logger.warn('Rejected upload: invalid MIME type', undefined, {
          userId,
          mocId,
          declaredMime: file.mimetype,
          detectedMime: detectedType?.mime || 'unknown',
        })
        return err('INVALID_MIME_TYPE')
      }

      // AC27: Validate file size (1 byte <= size <= 10MB)
      const MAX_SIZE = 10 * 1024 * 1024 // 10MB
      const MIN_SIZE = 1

      if (file.size > MAX_SIZE) {
        logger.warn('Rejected upload: file too large', undefined, {
          userId,
          mocId,
          size: file.size,
          max: MAX_SIZE,
        })
        return err('FILE_TOO_LARGE')
      }

      if (file.size < MIN_SIZE) {
        logger.warn('Rejected upload: file too small', undefined, {
          userId,
          mocId,
          size: file.size,
        })
        return err('FILE_TOO_SMALL')
      }

      // Upload to S3 (includes WebP conversion, EXIF stripping, high-res validation)
      const uploadResult = await imageStorage.uploadThumbnail(userId, mocId, file)

      if (!uploadResult.ok) {
        // AC36: Log S3 upload failures
        logger.error('S3 upload failed', undefined, { userId, mocId, error: uploadResult.error })
        return err(uploadResult.error)
      }

      const { key, url } = uploadResult.data

      // AC32: Delete old thumbnail if exists (non-blocking)
      if (moc.thumbnailUrl) {
        const oldKey = imageStorage.extractKeyFromUrl(moc.thumbnailUrl)
        if (oldKey) {
          // Fire and forget - don't block on deletion
          imageStorage.deleteThumbnail(oldKey).catch(error => {
            // AC37: Log deletion failures without blocking
            logger.warn('Failed to delete old thumbnail (non-blocking)', error, {
              userId,
              mocId,
              oldKey,
            })
          })
        }
      }

      // AC34: Update database with thumbnail URL
      try {
        await mocRepo.updateThumbnail(mocId, userId, url)
        logger.info('Thumbnail uploaded successfully', undefined, { userId, mocId, key, url })
        return ok({ thumbnailUrl: url })
      } catch (error: any) {
        // Rollback: Try to delete the uploaded file
        await imageStorage.deleteThumbnail(key).catch(rollbackError => {
          logger.error('Rollback failed: could not delete uploaded thumbnail', rollbackError, {
            userId,
            mocId,
            key,
          })
        })

        logger.error('Failed to update thumbnail in database', error, { userId, mocId })
        return err('DB_ERROR')
      }
    },

    /**
     * Get file download URL
     * (INST-1107: AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9, AC-11, AC-12, AC-13, AC-73, AC-74, AC-76)
     *
     * Business logic:
     * 1. Query file from repository
     * 2. Verify file belongs to user's MOC (ownership check)
     * 3. Generate presigned S3 URL with ResponseContentDisposition
     * 4. Return downloadUrl and expiresAt
     */
    async getFileDownloadUrl(
      userId: string,
      mocId: string,
      fileId: string,
    ): Promise<
      Result<
        { downloadUrl: string; expiresAt: string },
        'NOT_FOUND' | 'PRESIGN_FAILED' | 'DB_ERROR'
      >
    > {
      try {
        // AC-2: Query file by fileId and mocId
        const file = await mocRepo.getFileByIdAndMocId(fileId, mocId)

        if (!file) {
          logger.debug('File not found', undefined, { userId, mocId, fileId })
          return err('NOT_FOUND')
        }

        // AC-3: Verify file belongs to user's MOC (ownership check)
        const mocResult = await mocRepo.getMocById(mocId, userId)
        if (!mocResult) {
          // AC-4, AC-74: Return NOT_FOUND for unauthorized (no info leakage)
          logger.warn('Unauthorized file download attempt', undefined, { userId, mocId, fileId })
          return err('NOT_FOUND')
        }

        // AC-6, AC-7, AC-8, AC-13: Generate presigned S3 URL
        if (!file.s3Key) {
          logger.error('File missing s3Key', undefined, { userId, mocId, fileId })
          return err('DB_ERROR')
        }

        if (!bucket) {
          logger.error('S3 bucket not configured', undefined, { userId, mocId, fileId })
          return err('PRESIGN_FAILED')
        }

        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: file.s3Key,
          // AC-7, AC-13: ResponseContentDisposition with RFC 5987 encoding
          ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(file.originalFilename || 'download')}`,
        })

        // AC-8: 900 seconds = 15 minutes
        const expiresIn = 900
        const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn })
        const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        // AC-11: Log successful download URL generation
        logger.info('Download URL generated', undefined, {
          userId,
          mocId,
          fileId,
          filename: file.originalFilename,
        })

        // AC-9: Return downloadUrl and expiresAt
        return ok({ downloadUrl, expiresAt })
      } catch (error: any) {
        // AC-10, AC-12: Log failures
        logger.error('Failed to generate presigned URL', error, { userId, mocId, fileId })
        return err('PRESIGN_FAILED')
      }
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Upload Session Types (INST-1105)
// ─────────────────────────────────────────────────────────────────────────

/** Rate limit check result */
interface RateLimitCheckResult {
  allowed: boolean
  remaining: number
  currentCount: number
  limit: number
  retryAfterSeconds?: number
}

/** Upload session service dependencies */
export interface UploadSessionServiceDeps {
  mocRepo: MocRepository
  sessionRepo: UploadSessionRepository
  s3Storage: S3StoragePort
  /** Check rate limit for user - returns true if allowed */
  checkRateLimit: (userId: string) => Promise<RateLimitCheckResult>
  /** Increment rate limit counter */
  incrementRateLimit: (userId: string) => Promise<void>
  /** Insert moc_files record */
  insertMocFile: (data: {
    mocId: string
    fileType: string
    fileUrl: string
    originalFilename: string
    mimeType: string
    s3Key: string
  }) => Promise<MocFile>
  /** S3 bucket name */
  s3Bucket: string
  /** CloudFront distribution domain (optional) */
  cloudfrontDomain?: string
  /** Presign TTL in seconds (default: 900 = 15 minutes) */
  presignTtlSeconds?: number
}

/** Upload session creation result */
export interface CreateUploadSessionResult {
  sessionId: string
  presignedUrl: string
  expiresAt: string
}

/** Upload session completion result */
export interface CompleteUploadSessionResult {
  id: string
  mocId: string
  fileType: string
  fileUrl: string
  originalFilename: string
  mimeType: string
  fileSize: number
  createdAt: string
  uploadedBy: string
}

/** Error codes for createUploadSession */
export type CreateUploadSessionError =
  | 'VALIDATION_ERROR'
  | 'MOC_NOT_FOUND'
  | 'FORBIDDEN'
  | 'FILE_TOO_SMALL'
  | 'FILE_TOO_LARGE'
  | 'INVALID_MIME_TYPE'
  | 'RATE_LIMIT_EXCEEDED'
  | 'DB_ERROR'
  | 'S3_ERROR'

/** Error codes for completeUploadSession */
export type CompleteUploadSessionError =
  | 'SESSION_NOT_FOUND'
  | 'FORBIDDEN'
  | 'EXPIRED_SESSION'
  | 'SESSION_ALREADY_COMPLETED'
  | 'FILE_NOT_IN_S3'
  | 'SIZE_MISMATCH'
  | 'DB_ERROR'
  | 'S3_ERROR'

// File size thresholds (in bytes)
const MIN_PRESIGNED_SIZE = 10 * 1024 * 1024 // 10MB - use direct upload for smaller files
const MAX_PRESIGNED_SIZE = 50 * 1024 * 1024 // 50MB - maximum file size
const SIZE_TOLERANCE_PERCENT = 5 // 5% tolerance for size verification

/**
 * Create Upload Session Service
 * (INST-1105: AC89, AC90)
 *
 * Business logic:
 * 1. Validate request (AC31, AC36, AC37)
 * 2. Authenticate user (AC32)
 * 3. Verify MOC exists and user owns it (AC34, AC35)
 * 4. Check rate limit (AC40, AC41)
 * 5. Generate S3 key (AC42, AC43)
 * 6. Generate presigned URL (AC44, AC45)
 * 7. Create session record (AC46)
 * 8. Return session info (AC47, AC48)
 */
export function createUploadSessionService(deps: UploadSessionServiceDeps) {
  const {
    mocRepo,
    sessionRepo,
    s3Storage,
    checkRateLimit,
    s3Bucket,
    presignTtlSeconds = 900, // 15 minutes default
  } = deps

  return {
    /**
     * Create a presigned URL upload session
     * (INST-1105: AC31-AC48)
     */
    async createUploadSession(
      userId: string,
      mocId: string,
      request: CreateUploadSessionRequest,
    ): Promise<
      Result<
        CreateUploadSessionResult,
        CreateUploadSessionError & { message?: string; retryAfterSeconds?: number }
      >
    > {
      // AC31: Validate request
      const validated = CreateUploadSessionRequestSchema.safeParse(request)
      if (!validated.success) {
        logger.warn('Invalid upload session request', undefined, {
          userId,
          mocId,
          errors: validated.error.flatten(),
        })
        return err('VALIDATION_ERROR')
      }

      const { filename, fileSize, fileType } = validated.data

      // AC36: Validate fileType (must be application/pdf)
      if (fileType !== 'application/pdf') {
        logger.warn('Invalid MIME type for presigned upload', undefined, {
          userId,
          mocId,
          fileType,
        })
        return err('INVALID_MIME_TYPE')
      }

      // AC38: Validate fileSize (must be >10MB)
      if (fileSize <= MIN_PRESIGNED_SIZE) {
        logger.warn('File too small for presigned upload', undefined, {
          userId,
          mocId,
          fileSize,
          minSize: MIN_PRESIGNED_SIZE,
        })
        return err('FILE_TOO_SMALL')
      }

      // AC39: Validate fileSize (must be ≤50MB)
      if (fileSize > MAX_PRESIGNED_SIZE) {
        logger.warn('File too large for presigned upload', undefined, {
          userId,
          mocId,
          fileSize,
          maxSize: MAX_PRESIGNED_SIZE,
        })
        return err('FILE_TOO_LARGE')
      }

      // AC34, AC35: Verify MOC exists and user owns it
      try {
        const moc = await mocRepo.getMocById(mocId, userId)
        if (!moc) {
          logger.warn('MOC not found for upload session', undefined, { userId, mocId })
          return err('MOC_NOT_FOUND')
        }
      } catch (error: any) {
        logger.error('Failed to verify MOC for upload session', error, { userId, mocId })
        return err('DB_ERROR')
      }

      // AC40, AC41: Check rate limit
      try {
        const rateLimitResult = await checkRateLimit(userId)
        if (!rateLimitResult.allowed) {
          logger.warn('Rate limit exceeded for upload session', undefined, {
            userId,
            mocId,
            current: rateLimitResult.currentCount,
            limit: rateLimitResult.limit,
          })
          // Return with retryAfterSeconds in error details
          return {
            ok: false,
            error: 'RATE_LIMIT_EXCEEDED' as any,
          }
        }
      } catch (error: any) {
        logger.error('Failed to check rate limit', error, { userId, mocId })
        return err('DB_ERROR')
      }

      // AC42, AC43: Generate S3 key
      const sanitizedFilename = sanitizeFilename(filename)
      const sessionId = crypto.randomUUID()
      const stage = process.env.STAGE || 'dev'
      const s3Key = `${stage}/moc-instructions/${userId}/${mocId}/instructions/${sessionId}-${sanitizedFilename}`

      // AC44, AC45: Generate presigned URL
      let presignedUrl: string
      try {
        presignedUrl = await s3Storage.generatePresignedPutUrl(
          s3Bucket,
          s3Key,
          fileType,
          presignTtlSeconds,
        )
      } catch (error: any) {
        logger.error('Failed to generate presigned URL', error, { userId, mocId, s3Key })
        return err('S3_ERROR')
      }

      const expiresAt = new Date(Date.now() + presignTtlSeconds * 1000)

      // AC46: Create session record
      try {
        await sessionRepo.create({
          userId,
          mocInstructionId: mocId,
          status: 'pending',
          partSizeBytes: fileSize, // Using file size as part size for single-part upload
          expiresAt,
          originalFilename: filename,
          originalFileSize: fileSize,
          s3Key,
        })

        // AC48: Security logging
        logger.info('Upload session created', undefined, {
          userId,
          mocId,
          sessionId,
          filename,
          fileSize,
        })

        // AC47: Return session info
        return ok({
          sessionId,
          presignedUrl,
          expiresAt: expiresAt.toISOString(),
        })
      } catch (error: any) {
        logger.error('Failed to create upload session', error, { userId, mocId, sessionId })
        return err('DB_ERROR')
      }
    },

    /**
     * Complete an upload session after S3 upload
     * (INST-1105: AC49-AC65)
     */
    async completeUploadSession(
      userId: string,
      mocId: string,
      sessionId: string,
    ): Promise<Result<CompleteUploadSessionResult, CompleteUploadSessionError>> {
      // AC49: Find session and verify ownership
      let session: UploadSession | null
      try {
        session = await sessionRepo.findByIdAndUserId(sessionId, userId)
      } catch (error: any) {
        logger.error('Failed to find upload session', error, { userId, mocId, sessionId })
        return err('DB_ERROR')
      }

      // AC50: Return 404 if session not found
      if (!session) {
        logger.warn('Upload session not found', undefined, { userId, mocId, sessionId })
        return err('SESSION_NOT_FOUND')
      }

      // AC51: Verify user owns session
      if (session.userId !== userId) {
        logger.warn('Unauthorized session completion attempt', undefined, {
          userId,
          mocId,
          sessionId,
          sessionUserId: session.userId,
        })
        return err('FORBIDDEN')
      }

      // Verify session belongs to the correct MOC
      if (session.mocInstructionId !== mocId) {
        logger.warn('Session MOC mismatch', undefined, {
          userId,
          mocId,
          sessionId,
          sessionMocId: session.mocInstructionId,
        })
        return err('SESSION_NOT_FOUND')
      }

      // AC52: Check if session already completed
      if (session.status === 'completed') {
        logger.info('Session already completed (idempotent)', undefined, {
          userId,
          mocId,
          sessionId,
        })
        return err('SESSION_ALREADY_COMPLETED')
      }

      // AC52: Check if session expired
      if (session.expiresAt < new Date()) {
        logger.warn('Session expired', undefined, {
          userId,
          mocId,
          sessionId,
          expiresAt: session.expiresAt.toISOString(),
        })
        return err('EXPIRED_SESSION')
      }

      // Get the S3 key from session (we need to add this to the session type)
      // For now, reconstruct the key
      const stage = process.env.STAGE || 'dev'
      const sanitizedFilename = sanitizeFilename(session.originalFilename || 'unknown')
      const s3Key = `${stage}/moc-instructions/${userId}/${mocId}/instructions/${sessionId}-${sanitizedFilename}`

      // AC53, AC54: Verify file exists in S3
      let s3Metadata: { contentLength: number; contentType?: string }
      try {
        const headResult = await s3Storage.headObject(s3Bucket, s3Key)
        if (!headResult.ok) {
          logger.warn('File not found in S3', undefined, { userId, mocId, sessionId, s3Key })
          return err('FILE_NOT_IN_S3')
        }
        s3Metadata = headResult.data
      } catch (error: any) {
        logger.error('Failed to verify file in S3', error, { userId, mocId, sessionId, s3Key })
        return err('S3_ERROR')
      }

      // AC55, AC56: Verify file size matches (within tolerance)
      const expectedSize = session.originalFileSize || 0
      const actualSize = s3Metadata.contentLength
      const toleranceBytes = Math.ceil(expectedSize * (SIZE_TOLERANCE_PERCENT / 100))

      if (Math.abs(actualSize - expectedSize) > toleranceBytes) {
        logger.warn('File size mismatch', undefined, {
          userId,
          mocId,
          sessionId,
          expectedSize,
          actualSize,
          toleranceBytes,
        })
        return err('SIZE_MISMATCH')
      }

      // AC57-61: Transaction - Insert moc_files + Update session status
      try {
        // Generate public URL
        const fileUrl = deps.cloudfrontDomain
          ? `https://${deps.cloudfrontDomain}/${s3Key}`
          : s3Storage.getPublicUrl(s3Bucket, s3Key)

        // AC58: Insert moc_files record
        const mocFile = await deps.insertMocFile({
          mocId,
          fileType: 'instruction',
          fileUrl,
          originalFilename: session.originalFilename || 'unknown',
          mimeType: 'application/pdf',
          s3Key,
        })

        // AC59: Update session status
        await sessionRepo.markCompleted(sessionId, new Date())

        // Increment rate limit counter on successful completion
        await deps.incrementRateLimit(userId)

        // Log successful completion
        logger.info('Upload session completed', undefined, {
          userId,
          mocId,
          sessionId,
          fileId: mocFile.id,
          fileSize: actualSize,
        })

        // AC61: Return created moc_files record
        return ok({
          id: mocFile.id,
          mocId,
          fileType: 'instruction',
          fileUrl,
          originalFilename: session.originalFilename || 'unknown',
          mimeType: 'application/pdf',
          fileSize: actualSize,
          createdAt: mocFile.createdAt.toISOString(),
          uploadedBy: userId,
        })
      } catch (error: any) {
        // AC60: Log transaction failure
        logger.error('Failed to complete upload session', error, { userId, mocId, sessionId })
        return err('DB_ERROR')
      }
    },
  }
}

/**
 * Sanitize filename for S3 key usage
 * Removes special characters, preserves extension
 */
function sanitizeFilename(filename: string): string {
  // Get extension
  const lastDot = filename.lastIndexOf('.')
  const extension = lastDot > 0 ? filename.substring(lastDot) : ''
  const baseName = lastDot > 0 ? filename.substring(0, lastDot) : filename

  // Replace special characters with hyphens, convert to lowercase
  const sanitized = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return sanitized + extension.toLowerCase()
}

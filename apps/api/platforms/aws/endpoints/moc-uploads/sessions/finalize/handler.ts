/**
 * Finalize Upload Session Lambda Function
 *
 * Story 3.1.12: Finalize Endpoint — Verify, Persist, Idempotent
 *
 * Verifies uploaded files, creates MOC instruction record, and returns metadata.
 * Idempotent by uploadSessionId.
 *
 * Route: POST /api/mocs/uploads/finalize
 */

import {
  successResponse,
  errorResponseFromError,
  errorResponse,
  type APIGatewayProxyResult,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  ConflictError,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'
import { getDbAsync } from '@/core/database/client'
import {
  uploadSessions,
  uploadSessionFiles,
  mocInstructions,
  mocFiles,
} from '@/core/database/schema'
import { eq, and, isNull, or, lt, like } from 'drizzle-orm'
import { getS3Client } from '@/core/storage/s3'
import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getEnv } from '@/core/utils/env'
import { validateMagicBytes } from '@repo/file-validator'
import { slugify, findAvailableSlug } from '@repo/upload-types'
import { FinalizeSessionRequestSchema, type FinalizeSessionResponse } from '../_shared/schemas'

const logger = createLogger('finalize-upload-session')

interface APIGatewayEvent {
  requestContext: {
    http: { method: string; path: string }
    authorizer?: { jwt?: { claims: { sub: string } } }
    requestId: string
  }
  body?: string | null
}

/** Lock TTL for finalization (minutes) */
const FINALIZE_LOCK_TTL_MINUTES = 5

/**
 * Map category to file type for mocFiles
 */
function categoryToFileType(
  category: string,
): 'instruction' | 'parts-list' | 'gallery-image' | 'thumbnail' {
  switch (category) {
    case 'instruction':
      return 'instruction'
    case 'parts-list':
      return 'parts-list'
    case 'thumbnail':
      return 'thumbnail'
    case 'image':
    default:
      return 'gallery-image'
  }
}

/**
 * Get expected MIME type for magic bytes validation
 */
function getExpectedMimeType(category: string, mimeType: string): string {
  if (mimeType) return mimeType
  switch (category) {
    case 'instruction':
      return 'application/pdf'
    case 'image':
    case 'thumbnail':
      return 'image/jpeg'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Check if error is a Postgres unique violation
 */
function isPostgresUniqueViolation(error: unknown): boolean {
  return (error as { code?: string })?.code === '23505'
}

export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  const requestId = event.requestContext.requestId

  try {
    logger.info('Finalize upload session invoked', { requestId })

    // Auth check
    const userId = event.requestContext.authorizer?.jwt?.claims.sub
    if (!userId) throw new UnauthorizedError('Authentication required')

    // Parse body
    if (!event.body) throw new BadRequestError('Request body is required')
    let body: unknown
    try {
      body = JSON.parse(event.body)
    } catch {
      throw new BadRequestError('Invalid JSON body')
    }

    const validation = FinalizeSessionRequestSchema.safeParse(body)
    if (!validation.success) {
      throw new ValidationError('Invalid request body', { errors: validation.error.flatten() })
    }

    const { uploadSessionId, title, description, tags, theme } = validation.data
    const db = await getDbAsync()

    logger.info('Finalizing session', {
      requestId,
      ownerId: userId,
      uploadSessionId,
      title,
    })

    // Verify session exists and belongs to user
    const [session] = await db
      .select()
      .from(uploadSessions)
      .where(and(eq(uploadSessions.id, uploadSessionId), eq(uploadSessions.userId, userId)))
      .limit(1)

    if (!session) {
      throw new NotFoundError('Upload session not found')
    }

    // Check if already finalized (idempotent short-circuit)
    if (session.finalizedAt && session.mocInstructionId) {
      logger.info('Session already finalized (idempotent)', {
        requestId,
        uploadSessionId,
        mocId: session.mocInstructionId,
        idempotent: true,
      })

      // Fetch the existing MOC and return
      const [existingMoc] = await db
        .select()
        .from(mocInstructions)
        .where(eq(mocInstructions.id, session.mocInstructionId))
        .limit(1)

      if (existingMoc) {
        return buildSuccessResponse(existingMoc, db, true)
      }
    }

    // Check if session is expired
    if (new Date() > session.expiresAt) {
      throw new BadRequestError('Upload session has expired')
    }

    // Try to acquire finalize lock
    const staleCutoff = new Date(Date.now() - FINALIZE_LOCK_TTL_MINUTES * 60 * 1000)

    const [lockedSession] = await db
      .update(uploadSessions)
      .set({ finalizingAt: new Date() })
      .where(
        and(
          eq(uploadSessions.id, uploadSessionId),
          isNull(uploadSessions.finalizedAt),
          or(isNull(uploadSessions.finalizingAt), lt(uploadSessions.finalizingAt, staleCutoff)),
        ),
      )
      .returning()

    if (!lockedSession) {
      // Check if finalized by another process
      const [currentSession] = await db
        .select()
        .from(uploadSessions)
        .where(eq(uploadSessions.id, uploadSessionId))
        .limit(1)

      if (currentSession?.finalizedAt && currentSession.mocInstructionId) {
        const [existingMoc] = await db
          .select()
          .from(mocInstructions)
          .where(eq(mocInstructions.id, currentSession.mocInstructionId))
          .limit(1)

        if (existingMoc) {
          return buildSuccessResponse(existingMoc, db, true)
        }
      }

      // Another process is finalizing
      return successResponse(200, {
        message: 'Finalization in progress',
        idempotent: true,
        status: 'finalizing',
      })
    }

    // We have the lock - proceed with finalization
    try {
      // Get all completed files for this session
      const sessionFiles = await db
        .select()
        .from(uploadSessionFiles)
        .where(
          and(
            eq(uploadSessionFiles.sessionId, uploadSessionId),
            eq(uploadSessionFiles.status, 'completed'),
          ),
        )

      // Must have at least one instruction file
      const instructionFiles = sessionFiles.filter(f => f.category === 'instruction')
      if (instructionFiles.length === 0) {
        throw new BadRequestError('At least one instruction file must be uploaded and completed')
      }

      // Verify all files in S3
      await verifyFilesInS3(sessionFiles, requestId)

      // Generate slug
      const baseSlug = slugify(title)
      const existingSlugs = await db
        .select({ slug: mocInstructions.slug })
        .from(mocInstructions)
        .where(and(eq(mocInstructions.userId, userId), like(mocInstructions.slug, `${baseSlug}%`)))
        .then(rows => rows.map(r => r.slug).filter((s): s is string => s !== null))

      const slug = findAvailableSlug(baseSlug, existingSlugs)

      // Create MOC instruction record
      const now = new Date()
      let moc
      try {
        ;[moc] = await db
          .insert(mocInstructions)
          .values({
            userId,
            title,
            slug,
            description: description || null,
            type: 'moc',
            tags: tags || [],
            theme: theme || null,
            status: 'private',
            createdAt: now,
            updatedAt: now,
            addedByUserId: userId,
            lastUpdatedByUserId: userId,
          })
          .returning()
      } catch (insertError) {
        if (isPostgresUniqueViolation(insertError)) {
          // Title conflict - suggest alternative
          const suggestedSlug = findAvailableSlug(baseSlug, [...existingSlugs, slug])
          throw new ConflictError('A MOC with this title already exists', {
            title,
            suggestedSlug,
          })
        }
        throw insertError
      }

      // Create mocFiles records from session files
      const fileInserts = sessionFiles.map(sf => ({
        mocId: moc.id,
        fileType: categoryToFileType(sf.category),
        fileUrl: sf.fileUrl!,
        mimeType: sf.mimeType,
        originalFilename: sf.name,
        createdAt: now,
      }))

      await db.insert(mocFiles).values(fileInserts)

      // Set thumbnail from first image
      const imageFile = sessionFiles.find(f => f.category === 'image' || f.category === 'thumbnail')
      if (imageFile?.fileUrl) {
        await db
          .update(mocInstructions)
          .set({ thumbnailUrl: imageFile.fileUrl })
          .where(eq(mocInstructions.id, moc.id))
        moc.thumbnailUrl = imageFile.fileUrl
      }

      // Update session as finalized
      await db
        .update(uploadSessions)
        .set({
          status: 'completed',
          finalizedAt: now,
          finalizingAt: null,
          mocInstructionId: moc.id,
          updatedAt: now,
        })
        .where(eq(uploadSessions.id, uploadSessionId))

      logger.info('Session finalized successfully', {
        requestId,
        ownerId: userId,
        uploadSessionId,
        mocId: moc.id,
        slug,
        fileCount: sessionFiles.length,
      })

      return buildSuccessResponse(moc, db, false)
    } catch (error) {
      // Clear lock on failure
      await db
        .update(uploadSessions)
        .set({ finalizingAt: null })
        .where(eq(uploadSessions.id, uploadSessionId))

      logger.error('Finalize failed, lock cleared', { requestId, uploadSessionId, error })
      throw error
    }
  } catch (error) {
    logger.error('Finalize upload session error', { requestId, error })

    // Handle 409 conflict with proper response
    if (error instanceof ConflictError) {
      return errorResponse(409, 'CONFLICT', error.message, error.details)
    }

    return errorResponseFromError(error)
  }
}

/**
 * Verify files exist in S3 with size and magic bytes validation
 */
async function verifyFilesInS3(
  files: Array<{
    id: string
    category: string
    name: string
    size: number
    mimeType: string
    s3Key: string
    fileUrl: string | null
  }>,
  requestId: string,
): Promise<void> {
  const env = getEnv()
  const s3 = await getS3Client()
  const bucketName = env.S3_BUCKET

  for (const file of files) {
    try {
      // HeadObject for existence and size check
      const headResponse = await s3.send(
        new HeadObjectCommand({ Bucket: bucketName, Key: file.s3Key }),
      )

      const contentLength = headResponse.ContentLength ?? 0

      // Validate size matches
      if (Math.abs(contentLength - file.size) > 1024) {
        // Allow 1KB tolerance
        logger.warn('File size mismatch', {
          requestId,
          fileId: file.id,
          expected: file.size,
          actual: contentLength,
        })
        throw new BadRequestError(`File "${file.name}" size does not match expected size`)
      }

      // Magic bytes validation for instruction and image files
      const shouldValidateMagicBytes = ['instruction', 'image', 'thumbnail'].includes(file.category)

      if (shouldValidateMagicBytes && contentLength > 0) {
        const getResponse = await s3.send(
          new GetObjectCommand({
            Bucket: bucketName,
            Key: file.s3Key,
            Range: 'bytes=0-511',
          }),
        )

        const bodyBytes = await getResponse.Body?.transformToByteArray()
        if (bodyBytes) {
          const buffer = Buffer.from(bodyBytes)
          const expectedMime = getExpectedMimeType(file.category, file.mimeType)
          const isValid = validateMagicBytes(buffer, expectedMime)

          if (!isValid) {
            logger.warn('Magic bytes validation failed', {
              requestId,
              fileId: file.id,
              filename: file.name,
              expectedMime,
            })
            throw new BadRequestError(
              `File "${file.name}" content does not match expected type. The file may be corrupted.`,
            )
          }
        }
      }

      logger.info('File verified', { requestId, fileId: file.id, s3Key: file.s3Key })
    } catch (error) {
      if (error instanceof BadRequestError) throw error

      logger.error('File verification failed', { requestId, fileId: file.id, error })
      throw new BadRequestError(`File "${file.name}" verification failed. Please re-upload.`)
    }
  }
}

/**
 * Build success response with file URLs
 */
async function buildSuccessResponse(
  moc: typeof mocInstructions.$inferSelect,
  db: Awaited<ReturnType<typeof getDbAsync>>,
  idempotent: boolean,
): Promise<APIGatewayProxyResult> {
  // Get file records
  const files = await db.select().from(mocFiles).where(eq(mocFiles.mocId, moc.id))

  // Use fileUrl for keys (this is what we have in the schema)
  const pdfKey = files.find(f => f.fileType === 'instruction')?.fileUrl || ''
  const imageKeys = files
    .filter(f => f.fileType === 'gallery-image' || f.fileType === 'thumbnail')
    .map(f => f.fileUrl)
  const partsKeys = files.filter(f => f.fileType === 'parts-list').map(f => f.fileUrl)

  const response: FinalizeSessionResponse = {
    id: moc.id,
    title: moc.title,
    slug: moc.slug || '',
    description: moc.description,
    status: moc.status || 'private',
    pdfKey,
    imageKeys,
    partsKeys,
    tags: moc.tags as string[] | null,
    theme: moc.theme,
    createdAt: moc.createdAt.toISOString(),
    idempotent: idempotent || undefined,
  }

  return successResponse(idempotent ? 200 : 201, { data: response })
}

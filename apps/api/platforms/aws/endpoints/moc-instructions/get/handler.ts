/**
 * GET MOC Detail Lambda Function
 *
 * Story 3.1.33: GET MOC Detail Endpoint
 *
 * Route: GET /api/mocs/:mocId
 *
 * Features:
 * - Single endpoint with ownership-aware responses
 * - Published MOCs visible to anyone with CDN URLs
 * - Draft/archived MOCs only visible to owner
 * - Owner responses include presigned URLs (24h TTL) and isOwner: true
 * - Non-owner responses include CDN URLs and isOwner: false
 * - Returns 404 for non-existent MOCs or unauthorized access to drafts
 *
 * Authentication: Optional JWT via AWS Cognito (supports anonymous)
 */

import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { CognitoJwtVerifier } from 'aws-jwt-verify'

import { db } from '@/core/database/client'
import { mocInstructions, mocFiles } from '@/core/database/schema'
import {
  successResponse,
  errorResponseFromError,
  NotFoundError,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('moc-get-detail')

// ─────────────────────────────────────────────────────────────────────────────
// JWT Verifier (lazy initialization)
// ─────────────────────────────────────────────────────────────────────────────

let jwtVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null

const getJwtVerifier = () => {
  if (!jwtVerifier) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID
    const clientId = process.env.COGNITO_CLIENT_ID

    if (!userPoolId || !clientId) {
      logger.warn('Cognito environment variables not configured, JWT verification disabled')
      return null
    }

    jwtVerifier = CognitoJwtVerifier.create({
      userPoolId,
      tokenUse: 'access',
      clientId,
    })
  }
  return jwtVerifier
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Schema
// ─────────────────────────────────────────────────────────────────────────────

const MocIdSchema = z.string().uuid()

// ─────────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────────

const MocFileSchema = z.object({
  id: z.string().uuid(),
  category: z.string(), // 'instruction' | 'parts-list' | 'thumbnail' | 'gallery-image'
  filename: z.string(),
  size: z.number().optional(),
  mimeType: z.string().nullable(),
  url: z.string().url(),
  uploadedAt: z.string().datetime(),
})

const MocDetailResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  theme: z.string().nullable(),
  status: z.enum(['draft', 'published', 'archived', 'pending_review']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  files: z.array(MocFileSchema),
  isOwner: z.boolean(),
})

export type MocDetailResponse = z.infer<typeof MocDetailResponseSchema>

// ─────────────────────────────────────────────────────────────────────────────
// API Gateway Event Interface
// ─────────────────────────────────────────────────────────────────────────────

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
  headers?: Record<string, string | undefined>
  pathParameters?: Record<string, string>
  queryStringParameters?: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────────
// Optional JWT Authentication
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract and verify JWT from Authorization header (optional)
 * Returns userId if valid, null if no token or invalid
 */
const extractUserId = async (event: APIGatewayEvent): Promise<string | null> => {
  // First check if authorizer claims are available (when route uses authorizer)
  const authorizerUserId = event.requestContext.authorizer?.jwt?.claims.sub
  if (authorizerUserId) {
    return authorizerUserId
  }

  // Otherwise, manually verify JWT from Authorization header
  const authHeader = event.headers?.authorization || event.headers?.Authorization
  if (!authHeader) {
    return null // Anonymous request
  }

  // Extract token from "Bearer <token>"
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token || token === authHeader) {
    logger.debug('Invalid Authorization header format')
    return null
  }

  // Verify JWT
  const verifier = getJwtVerifier()
  if (!verifier) {
    logger.warn('JWT verifier not configured, treating as anonymous')
    return null
  }

  try {
    const payload = await verifier.verify(token)
    return payload.sub
  } catch (error) {
    logger.debug('JWT verification failed', { error: (error as Error).message })
    return null // Invalid token treated as anonymous
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// URL Generation Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PRESIGNED_URL_TTL_SECONDS = 24 * 60 * 60 // 24 hours

/**
 * Extract S3 key from full S3 URL
 */
const extractS3KeyFromUrl = (fileUrl: string): string => {
  const url = new URL(fileUrl)
  return url.pathname.substring(1)
}

/**
 * Generate presigned GET URL for owner access
 */
const generatePresignedGetUrl = async (fileUrl: string, ttlSeconds: number): Promise<string> => {
  const bucketName = process.env.LEGO_API_BUCKET_NAME
  if (!bucketName) {
    throw new Error('S3 bucket not configured')
  }

  const s3Key = extractS3KeyFromUrl(fileUrl)
  const s3Client = new S3Client({})

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
  })

  return getSignedUrl(s3Client as any, command, { expiresIn: ttlSeconds })
}

/**
 * Get CDN URL for public access
 * TODO: Replace with actual CDN URL when CloudFront is configured
 */
const getCdnUrl = (fileUrl: string): string => {
  // For now, return the S3 URL directly
  // When CloudFront is configured, transform to CDN URL:
  // const cdnDomain = process.env.CDN_DOMAIN
  // if (cdnDomain) {
  //   const s3Key = extractS3KeyFromUrl(fileUrl)
  //   return `https://${cdnDomain}/${s3Key}`
  // }
  return fileUrl
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Handler
// ─────────────────────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext.requestId

  try {
    logger.info('GET MOC Detail invoked', {
      requestId,
      path: event.requestContext.http.path,
    })

    // Extract mocId from path parameters
    const mocId = event.pathParameters?.mocId || event.pathParameters?.id

    if (!mocId) {
      throw new NotFoundError('MOC ID is required')
    }

    // Validate mocId format
    const parseResult = MocIdSchema.safeParse(mocId)
    if (!parseResult.success) {
      throw new NotFoundError('MOC not found')
    }

    // Extract and verify userId (null for anonymous requests)
    const userId = await extractUserId(event)

    // Fetch MOC from database
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!moc) {
      logger.info('MOC not found', { requestId, mocId })
      throw new NotFoundError('MOC not found')
    }

    // Determine ownership
    const isOwner = Boolean(userId && moc.userId === userId)

    // Access control: Draft/archived only visible to owner
    // Return 404 (not 403) to prevent existence leak
    if (moc.status !== 'published' && !isOwner) {
      logger.info('MOC access denied - non-owner accessing non-published', {
        requestId,
        mocId,
        status: moc.status,
        isOwner,
      })
      throw new NotFoundError('MOC not found')
    }

    // Fetch associated files (excluding soft-deleted)
    const files = await db
      .select()
      .from(mocFiles)
      .where(and(eq(mocFiles.mocId, mocId), isNull(mocFiles.deletedAt)))

    // Generate URLs based on ownership
    const filesWithUrls = await Promise.all(
      files.map(async file => ({
        id: file.id,
        category: file.fileType,
        filename: file.originalFilename || 'file',
        size: undefined, // Size not stored in current schema
        mimeType: file.mimeType,
        url: isOwner
          ? await generatePresignedGetUrl(file.fileUrl, PRESIGNED_URL_TTL_SECONDS)
          : getCdnUrl(file.fileUrl),
        uploadedAt: file.createdAt.toISOString(),
      })),
    )

    // Build response
    const response: MocDetailResponse = {
      id: moc.id,
      title: moc.title,
      description: moc.description,
      slug: moc.slug,
      tags: moc.tags as string[] | null,
      theme: moc.theme,
      status: moc.status as 'draft' | 'published' | 'archived' | 'pending_review',
      createdAt: moc.createdAt.toISOString(),
      updatedAt: moc.updatedAt.toISOString(),
      publishedAt: moc.publishedAt?.toISOString() ?? null,
      files: filesWithUrls,
      isOwner,
    }

    // Validate response schema
    const validated = MocDetailResponseSchema.parse(response)

    // Story 3.1.37: Log moc.edit.start when owner fetches their MOC (edit scenario)
    if (isOwner) {
      logger.info('moc.edit.start', {
        correlationId: requestId,
        requestId,
        ownerId: userId,
        mocId,
        fileCount: filesWithUrls.length,
        status: moc.status,
      })
    } else {
      logger.info('MOC detail fetched', {
        requestId,
        mocId,
        isOwner,
        filesCount: filesWithUrls.length,
      })
    }

    return successResponse(200, {
      success: true,
      data: validated,
    })
  } catch (error) {
    logger.error('GET MOC Detail error', error, { requestId })
    return errorResponseFromError(error, requestId)
  }
}

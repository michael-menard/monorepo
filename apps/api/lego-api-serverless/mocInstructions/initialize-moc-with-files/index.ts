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

import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
} from '@/lib/responses'
import { BadRequestError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { logger } from '@/lib/utils/logger'
import { db } from '@/lib/db/client'
import { mocInstructions, mocFiles } from '@/db/schema'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
 * MOC initialization schema
 */
const InitializeMocWithFilesSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  type: z.enum(['moc', 'set']),
  tags: z.array(z.string()).optional(),
  author: z.string().optional(),
  setNumber: z.string().optional(),
  partsCount: z.number().optional(),
  theme: z.string().optional(),
  subtheme: z.string().optional(),
  uploadedDate: z.string().datetime().optional(),
  brand: z.string().optional(),
  releaseYear: z.number().optional(),
  retired: z.boolean().optional(),
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

    logger.info('Creating MOC with file uploads', {
      userId,
      title: mocData.title,
      type: mocData.type,
      fileCount: files.length,
    })

    // Validate file requirements
    validateFileRequirements(files)

    // Generate MOC ID
    const mocId = uuidv4()
    const now = new Date()

    // Prepare MOC values
    const baseValues = {
      id: mocId,
      userId,
      title: mocData.title,
      description: mocData.description || null,
      type: mocData.type,
      tags: mocData.tags || null,
      thumbnailUrl: null, // Will be set in finalize step
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
            theme: mocData.theme || null,
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
            setNumber: mocData.setNumber || null,
            releaseYear: mocData.releaseYear || null,
            retired: mocData.retired || false,
            partsCount: null,
            subtheme: null,
            uploadedDate: null,
          }

    // Insert MOC into database
    const [moc] = await db.insert(mocInstructions).values(values).returning()

    logger.info('MOC created', { mocId, title: moc.title })

    // Generate presigned URLs for each file
    const uploadUrls = await generatePresignedUrls(mocId, userId, files)

    logger.info('Presigned URLs generated', {
      mocId,
      urlCount: uploadUrls.length,
    })

    return successResponse(201, {
      message: 'MOC initialized successfully. Upload files using the provided URLs.',
      data: {
        mocId,
        uploadUrls,
        expiresIn: 3600, // URLs valid for 1 hour
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

  const partsListFiles = files.filter(f => f.fileType === 'parts-list')
  if (partsListFiles.length > 10) {
    throw new BadRequestError('Maximum 10 parts list files allowed')
  }

  const imageFiles = files.filter(
    f => f.fileType === 'gallery-image' || f.fileType === 'thumbnail',
  )
  if (imageFiles.length > 3) {
    throw new BadRequestError('Maximum 3 images allowed')
  }

  // Validate file sizes
  const FILE_SIZE_LIMITS = {
    instruction: 50 * 1024 * 1024, // 50 MB
    'parts-list': 10 * 1024 * 1024, // 10 MB
    thumbnail: 5 * 1024 * 1024, // 5 MB
    'gallery-image': 10 * 1024 * 1024, // 10 MB
  }

  for (const file of files) {
    const maxSize = FILE_SIZE_LIMITS[file.fileType]
    if (file.size > maxSize) {
      throw new BadRequestError(
        `File ${file.filename} exceeds size limit for ${file.fileType} (max: ${maxSize / 1024 / 1024} MB)`,
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
    const sanitizedFilename = sanitizeFilename(file.filename)
    const s3Key = `mocs/${mocId}/${file.fileType}/${timestamp}-${sanitizedFilename}`

    // Create placeholder file record
    await db
      .insert(mocFiles)
      .values({
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

    const expiresIn = 3600 // 1 hour
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn })

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

/**
 * Sanitize filename for S3 key
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase()
}

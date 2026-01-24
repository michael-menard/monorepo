/**
 * MOC Parts List Upload Lambda Function
 *
 * Handles parts list file uploads (CSV/XML) with parsing and piece count calculation.
 * Route: POST /api/mocs/:id/upload-parts-list
 *
 * Features:
 * - Multipart form data parsing
 * - CSV/XML file parsing with automatic header detection
 * - Part number and quantity extraction
 * - Total piece count calculation
 * - Database record creation (mocFiles + mocPartsLists)
 * - MOC totalPieceCount update
 *
 * Authentication: JWT via AWS Cognito
 * Authorization: User must own the MOC
 */

import { eq } from 'drizzle-orm'
import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
} from '@/core/utils/responses'
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
} from '@/core/utils/responses'
import { parsePartsListFile } from '@/endpoints/moc-instructions/_shared/parts-list-parser'
import { logger } from '@/core/observability/logger'
import { db } from '@/core/database/client'
import { mocInstructions, mocFiles, mocPartsLists } from '@/core/database/schema'

/**
 * API Gateway Event Interface for Parts List Upload
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
          sub: string // User ID from Cognito
          email?: string
        }
      }
    }
    requestId: string
  }
  pathParameters?: Record<string, string>
  body?: string | null
  isBase64Encoded?: boolean
  headers?: Record<string, string>
}

/**
 * Main Lambda Handler for Parts List Upload
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('MOC Parts List Upload Lambda invoked', {
      requestId: event.requestContext.requestId,
      method: event.requestContext.http.method,
      path: event.requestContext.http.path,
    })

    // Verify authentication
    const userId = getUserIdFromEvent(event)

    // Get MOC ID from path
    const mocId = event.pathParameters?.id
    if (!mocId) {
      throw new BadRequestError('MOC ID is required')
    }

    // Verify content type is multipart/form-data
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type']
    if (!contentType?.includes('multipart/form-data')) {
      throw new BadRequestError('Content-Type must be multipart/form-data')
    }

    if (!event.body) {
      throw new BadRequestError('Request body is required')
    }

    // Parse multipart form data
    const { file, metadata } = await parseMultipartFormData(event)

    logger.info('Processing parts list file', {
      mocId,
      fileName: file.filename,
      fileSize: file.size,
      mimeType: file.mimeType,
      fileType: metadata.fileType,
    })

    // Check if MOC exists and user has permission
    const [moc] = await db
      .select()
      .from(mocInstructions)
      .where(eq(mocInstructions.id, mocId))
      .limit(1)

    if (!moc) {
      throw new NotFoundError('MOC not found')
    }
    if (moc.userId !== userId) {
      throw new ForbiddenError('You do not own this MOC')
    }

    // Parse the parts list file
    logger.info('Parsing parts list file...')
    const parseResult = await parsePartsListFile(file.filename, file.mimeType, file.buffer)

    if (!parseResult.success) {
      logger.warn('Parts list parsing failed', { errors: parseResult.errors })
      throw new ValidationError('Failed to parse parts list file', {
        errors: parseResult.errors,
      })
    }

    const { totalPieceCount, parts, format } = parseResult.data!
    logger.info(
      `Parts list parsed successfully: ${totalPieceCount} pieces, ${parts.length} unique parts`,
    )

    // Upload file to S3
    const { uploadPartsListToS3 } = await import(
      '@/endpoints/moc-parts-lists/_shared/parts-list-service'
    )
    const s3Key = await uploadPartsListToS3(mocId, userId, file)

    // Construct file URL
    const bucketName = process.env.LEGO_API_BUCKET_NAME
    const region = process.env.AWS_REGION || 'us-east-1'
    const fileUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`

    // Create file record in database
    const [fileRecord] = await db
      .insert(mocFiles)
      .values({
        mocId,
        fileType: 'parts-list',
        fileUrl,
        originalFilename: file.filename,
        mimeType: file.mimeType,
        createdAt: new Date(),
      })
      .returning()

    // Update MOC with total piece count
    logger.info('Updating MOC with piece count...')
    const [updatedMoc] = await db
      .update(mocInstructions)
      .set({
        totalPieceCount,
        updatedAt: new Date(),
      })
      .where(eq(mocInstructions.id, mocId))
      .returning()

    // Create parts list record with parsed data
    const [partsListRecord] = await db
      .insert(mocPartsLists)
      .values({
        mocId,
        fileId: fileRecord.id,
        title: `Parts List - ${file.filename}`,
        description: `Parsed ${format.toUpperCase()} parts list with ${totalPieceCount} total pieces`,
        totalPartsCount: totalPieceCount.toString(),
      })
      .returning()

    logger.info('Parts list processed successfully', {
      fileId: fileRecord.id,
      partsListId: partsListRecord.id,
      totalPieceCount,
      uniqueParts: parts.length,
    })

    return successResponse(201, {
      message: 'Parts list uploaded and processed successfully',
      data: {
        file: fileRecord,
        partsList: partsListRecord,
        parsing: {
          totalPieceCount,
          uniqueParts: parts.length,
          format,
          success: true,
        },
        moc: {
          id: updatedMoc.id,
          totalPieceCount: updatedMoc.totalPieceCount,
        },
      },
    })
  } catch (error) {
    logger.error('Parts list upload error:', error)
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
 * Parse multipart/form-data from API Gateway event
 * Returns file buffer and metadata
 */
async function parseMultipartFormData(event: APIGatewayEvent): Promise<{
  file: {
    buffer: Buffer
    filename: string
    mimeType: string
    size: number
  }
  metadata: {
    fileType: string
  }
}> {
  // Use busboy for streaming multipart parsing
  const { default: Busboy } = await import('busboy')

  return new Promise((resolve, reject) => {
    const contentType = event.headers?.['content-type'] || event.headers?.['Content-Type']
    if (!contentType) {
      return reject(new BadRequestError('Content-Type header is required'))
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } })

    let fileBuffer: Buffer | null = null
    let filename = ''
    let mimeType = ''
    let fileSize = 0
    const fields: Record<string, string> = {}

    busboy.on('file', (_fieldname, file, info) => {
      const { filename: fname, mimeType: mime } = info
      filename = fname
      mimeType = mime

      const chunks: Buffer[] = []
      file.on('data', chunk => {
        chunks.push(chunk)
        fileSize += chunk.length
      })

      file.on('end', () => {
        fileBuffer = Buffer.concat(chunks)
      })
    })

    busboy.on('field', (fieldname, value) => {
      fields[fieldname] = value
    })

    busboy.on('finish', () => {
      if (!fileBuffer) {
        return reject(new BadRequestError('No file provided'))
      }

      // fileType is optional for parts list uploads (always 'parts-list')
      const fileType = fields.fileType || 'parts-list'

      resolve({
        file: {
          buffer: fileBuffer,
          filename,
          mimeType,
          size: fileSize,
        },
        metadata: {
          fileType,
        },
      })
    })

    busboy.on('error', (error: Error) => {
      reject(new BadRequestError(`Failed to parse multipart data: ${error.message}`))
    })

    // Write the request body to busboy
    const body = event.isBase64Encoded
      ? Buffer.from(event.body!, 'base64')
      : Buffer.from(event.body!, 'utf-8')

    busboy.write(body)
    busboy.end()
  })
}

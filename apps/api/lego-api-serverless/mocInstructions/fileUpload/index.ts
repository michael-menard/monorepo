/**
 * MOC File Upload Lambda Function
 *
 * Handles file uploads for MOC Instructions.
 * Route: POST /api/mocs/:id/files
 *
 * Features:
 * - Multipart form data parsing
 * - File validation (type, size, mime type)
 * - S3 upload with signed URLs
 * - Database record creation
 * - Cache invalidation
 *
 * Authentication: JWT via AWS Cognito
 * Authorization: User must own the MOC
 */

import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
} from '@/lib/responses'
import { FileUploadSchema } from '@/types/moc'
import { BadRequestError, UnauthorizedError, ValidationError } from '@/lib/errors'
import { uploadMocFile } from '@/lib/services/moc-file-service'
import { logger } from '../lib/utils/logger'

/**
 * API Gateway Event Interface for File Upload
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
 * Main Lambda Handler for File Upload
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('MOC File Upload Lambda invoked', {
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

    // Validate metadata
    const validationResult = FileUploadSchema.safeParse(metadata)
    if (!validationResult.success) {
      throw new ValidationError('Invalid file metadata', {
        errors: validationResult.error.flatten(),
      })
    }

    // Upload file to S3 and create database record
    const uploadedFile = await uploadMocFile(mocId, userId, file, validationResult.data)

    return successResponse(201, {
      success: true,
      data: uploadedFile,
    })
  } catch (error) {
    logger.error('MOC File Upload Lambda error:', error)
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
  // For AWS Lambda with API Gateway, we need to use a library like busboy or multiparty
  // Since we're in a serverless environment, we'll use busboy for streaming parsing
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

      if (!fields.fileType) {
        return reject(new BadRequestError('fileType field is required'))
      }

      resolve({
        file: {
          buffer: fileBuffer,
          filename,
          mimeType,
          size: fileSize,
        },
        metadata: {
          fileType: fields.fileType,
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

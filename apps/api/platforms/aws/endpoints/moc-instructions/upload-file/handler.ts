/**
 * MOC File Upload Lambda Function
 *
 * Handles file uploads for MOC Instructions.
 * Route: POST /api/mocs/:id/files
 *
 * Features:
 * - Multipart form data parsing (single or multi-file)
 * - File validation (type, size, mime type)
 * - S3 upload with signed URLs (parallel for multi-file)
 * - Database record creation (batch for multi-file)
 * - Cache invalidation
 * - Partial success handling for multi-file uploads
 *
 * Story 4.7: Enhanced to support up to 10 files per request
 *
 * Authentication: JWT via AWS Cognito
 * Authorization: User must own the MOC
 */

import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { FileUploadSchema } from '@repo/api-types/common'
import {
  successResponse,
  errorResponseFromError,
  BadRequestError,
  UnauthorizedError,
  ValidationError,
} from '@/core/utils/responses'
import {
  uploadMocFile,
  uploadMocFilesParallel,
  insertFileRecordsBatch,
} from '@/endpoints/moc-instructions/_shared/moc-file-service'
import { parseMultipartForm } from '@/core/utils/multipart-parser'
import { createLogger } from '@/core/observability/logger'

const logger = createLogger('moc-file-upload')

/**
 * Main Lambda Handler for File Upload
 *
 * Supports both single-file (backward compatible) and multi-file uploads
 */
export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
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
    const contentType = event.headers['content-type'] || event.headers['Content-Type']
    if (!contentType?.includes('multipart/form-data')) {
      throw new BadRequestError('Content-Type must be multipart/form-data')
    }

    if (!event.body) {
      throw new BadRequestError('Request body is required')
    }

    // Parse multipart form data using shared parser
    const formData = await parseMultipartForm(event)

    // Validate file count
    if (formData.files.length === 0) {
      throw new BadRequestError('No files provided')
    }

    if (formData.files.length > 10) {
      throw new BadRequestError('Maximum 10 files per upload')
    }

    logger.info('Files parsed', {
      fileCount: formData.files.length,
      mode: formData.files.length === 1 ? 'single' : 'multi',
    })

    // ========================================
    // SINGLE FILE MODE (Backward Compatible)
    // ========================================
    if (formData.files.length === 1) {
      const file = formData.files[0]
      const fileType = formData.fields.fileType

      if (!fileType) {
        throw new BadRequestError('fileType field is required')
      }

      // Validate metadata
      const validationResult = FileUploadSchema.safeParse({ fileType })
      if (!validationResult.success) {
        throw new ValidationError('Invalid file metadata', {
          errors: validationResult.error.flatten(),
        })
      }

      // Use existing single-file service
      const uploadedFile = await uploadMocFile(
        mocId,
        userId,
        {
          buffer: file.buffer,
          filename: file.filename,
          mimeType: file.mimetype,
          size: file.buffer.length,
        },
        validationResult.data,
      )

      logger.info('Single file uploaded successfully', {
        fileId: uploadedFile.id,
        filename: file.filename,
      })

      return successResponse(201, {
        success: true,
        data: uploadedFile,
      })
    }

    // ========================================
    // MULTI-FILE MODE (Story 4.7)
    // ========================================

    // Build fileType mapping from form fields
    // Supports two patterns:
    // 1. fileType_0, fileType_1, etc. (per-file type)
    // 2. fileType (same type for all files)
    const fileTypeMapping: Record<string, string> = {}

    formData.files.forEach((file, index) => {
      // Try specific field first (e.g., fileType_0)
      const specificType = formData.fields[`fileType_${index}`]
      // Fall back to generic fileType field
      const genericType = formData.fields.fileType

      fileTypeMapping[file.fieldname] = specificType || genericType || 'instruction'
    })

    logger.info('File type mapping created', { fileTypeMapping })

    // Upload files in parallel
    const uploadResults = await uploadMocFilesParallel(
      mocId,
      userId,
      formData.files,
      fileTypeMapping,
    )

    // Insert successful uploads to database
    await insertFileRecordsBatch(mocId, uploadResults)

    // Build response with uploaded and failed files
    const uploaded = uploadResults
      .filter(r => r.success)
      .map(r => ({
        id: r.fileId!,
        filename: r.filename,
        fileUrl: r.s3Url!,
        fileSize: r.fileSize!,
        fileType: r.fileType!,
      }))

    const failed = uploadResults
      .filter(r => !r.success)
      .map(r => ({
        filename: r.filename,
        error: r.error!,
      }))

    logger.info('Multi-file upload completed', {
      total: formData.files.length,
      succeeded: uploaded.length,
      failed: failed.length,
    })

    // Return 200 even with partial failures (failures detailed in response)
    return successResponse(200, {
      uploaded,
      failed,
      summary: {
        total: formData.files.length,
        succeeded: uploaded.length,
        failed: failed.length,
      },
    })
  } catch (error) {
    logger.error('MOC File Upload Lambda error:', error)
    return errorResponseFromError(error)
  }
}

/**
 * Extract user ID from JWT claims
 */
function getUserIdFromEvent(event: APIGatewayProxyEventV2): string {
  const userId = (event.requestContext as any).authorizer?.jwt?.claims.sub

  if (!userId) {
    throw new UnauthorizedError('Authentication required')
  }

  return userId
}

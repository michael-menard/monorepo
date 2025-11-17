/**
 * MOC File Download Lambda Function
 *
 * Generates pre-signed URLs for downloading MOC files.
 * Route: GET /api/mocs/:mocId/files/:fileId/download
 *
 * Features:
 * - Authorization check (user must own MOC)
 * - Generates S3 pre-signed URL (valid for 1 hour)
 * - Supports instructions, parts lists, thumbnails
 * - Returns redirect or JSON with download URL
 *
 * Authentication: JWT via AWS Cognito
 */

import {
  successResponse,
  errorResponseFromError,
  type APIGatewayProxyResult,
} from '@/lib/responses'
import { UnauthorizedError, BadRequestError } from '@/lib/errors'
import { generateFileDownloadUrl } from '@/lib/services/moc-file-service'
import { logger } from '../lib/utils/logger'

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
          sub: string // User ID from Cognito
          email?: string
        }
      }
    }
    requestId: string
  }
  pathParameters?: Record<string, string>
  queryStringParameters?: Record<string, string>
}

/**
 * Main Lambda Handler for File Download
 */
export async function handler(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
  try {
    logger.info('MOC File Download Lambda invoked', {
      requestId: event.requestContext.requestId,
      method: event.requestContext.http.method,
      path: event.requestContext.http.path,
    })

    // Verify authentication
    const userId = getUserIdFromEvent(event)

    // Get MOC ID and File ID from path
    const mocId = event.pathParameters?.mocId
    const fileId = event.pathParameters?.fileId

    if (!mocId) {
      throw new BadRequestError('MOC ID is required')
    }

    if (!fileId) {
      throw new BadRequestError('File ID is required')
    }

    // Check if client wants redirect or JSON response
    const format = event.queryStringParameters?.format || 'redirect'

    // Generate pre-signed URL
    const { downloadUrl, filename, mimeType, expiresIn } = await generateFileDownloadUrl(
      mocId,
      fileId,
      userId,
    )

    logger.info('Pre-signed URL generated', {
      mocId,
      fileId,
      filename,
      expiresIn,
    })

    // Return redirect or JSON based on format parameter
    if (format === 'json') {
      return successResponse(200, {
        success: true,
        data: {
          downloadUrl,
          filename,
          mimeType,
          expiresIn,
          expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
        },
      })
    }

    // Default: redirect to pre-signed URL
    return {
      statusCode: 302,
      headers: {
        Location: downloadUrl,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: '',
    }
  } catch (error) {
    logger.error('MOC File Download Lambda error:', error)
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

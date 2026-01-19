/**
 * Upload Config API Endpoint
 *
 * Returns public-safe upload configuration for browser clients.
 * Configuration is loaded from environment variables and cached.
 *
 * API Gateway Endpoint: GET /api/config/upload
 */

import { successResponse, type APIGatewayProxyResult } from '@/core/utils/responses'
import { withErrorHandling } from '@/core/utils/lambda-wrapper'
import { createLogger } from '@/core/observability/logger'
import { loadEnvConfig } from '@/core/config/env-loader'
import type { UploadConfig } from '@repo/upload-config'

const logger = createLogger('config-upload')

/**
 * Public config response type
 * Excludes any internal/sensitive fields
 */
type PublicUploadConfig = Pick<
  UploadConfig,
  | 'pdfMaxBytes'
  | 'imageMaxBytes'
  | 'partsListMaxBytes'
  | 'thumbnailMaxBytes'
  | 'maxImagesPerMoc'
  | 'maxPartsListsPerMoc'
  | 'allowedPdfMimeTypes'
  | 'allowedImageMimeTypes'
  | 'allowedPartsListMimeTypes'
  | 'presignTtlMinutes'
  | 'sessionTtlMinutes'
>

/**
 * Upload Config Handler
 * - Returns public upload configuration for browser clients
 * - Configuration is loaded from environment on Lambda cold start
 * - Wrapped with withErrorHandling for consistent error handling
 */
export const handler = withErrorHandling(
  async (event: { requestContext?: { requestId?: string } }): Promise<APIGatewayProxyResult> => {
    logger.info('Upload config requested', {
      requestId: event.requestContext?.requestId,
      stage: process.env.STAGE,
    })

    const config = loadEnvConfig()

    // Return only public-safe config values
    const publicConfig: PublicUploadConfig = {
      pdfMaxBytes: config.pdfMaxBytes,
      imageMaxBytes: config.imageMaxBytes,
      partsListMaxBytes: config.partsListMaxBytes,
      thumbnailMaxBytes: config.thumbnailMaxBytes,
      maxImagesPerMoc: config.maxImagesPerMoc,
      maxPartsListsPerMoc: config.maxPartsListsPerMoc,
      allowedPdfMimeTypes: config.allowedPdfMimeTypes,
      allowedImageMimeTypes: config.allowedImageMimeTypes,
      allowedPartsListMimeTypes: config.allowedPartsListMimeTypes,
      presignTtlMinutes: config.presignTtlMinutes,
      sessionTtlMinutes: config.sessionTtlMinutes,
    }

    logger.debug('Returning upload config', {
      pdfMaxMb: publicConfig.pdfMaxBytes / (1024 * 1024),
      imageMaxMb: publicConfig.imageMaxBytes / (1024 * 1024),
      maxImagesPerMoc: publicConfig.maxImagesPerMoc,
    })

    return successResponse(publicConfig)
  },
  {
    functionName: 'UploadConfig',
    logRequest: false, // No sensitive data in request
    logResponse: false, // Config is not sensitive but verbose
  },
)

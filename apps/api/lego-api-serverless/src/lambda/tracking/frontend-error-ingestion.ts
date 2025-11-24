/**
 * Frontend Error Ingestion Lambda Function
 * Story 3.4: Frontend Error Reporting to CloudWatch
 *
 * This Lambda function receives error reports from the frontend application,
 * sanitizes PII, and publishes them to CloudWatch Logs for monitoring
 * and alerting in Grafana dashboards.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { z } from 'zod'
import { withErrorHandling } from '../../lib/utils/lambda-wrapper'
import { successResponse } from '@monorepo/lambda-responses'
import { createLambdaLogger } from '@repo/logger'
import { logFrontendError } from '../../lib/tracking/cloudwatch-frontend-errors'

// Initialize structured logger
const logger = createLambdaLogger('frontend-error-ingestion')

/**
 * Error payload schema
 */
const ErrorPayloadSchema = z.object({
  type: z.enum(['error', 'unhandledrejection', 'react-error-boundary']),
  sessionId: z.string(),
  timestamp: z.number(),
  url: z.string(),
  userAgent: z.string().optional(),
  error: z.object({
    message: z.string(),
    name: z.string().optional(),
    stack: z.string().optional(),
    componentStack: z.string().optional(),
  }),
  context: z
    .object({
      userId: z.string().optional(),
      route: z.string().optional(),
      action: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),
})

type ErrorPayload = z.infer<typeof ErrorPayloadSchema>

/**
 * Batch error payload schema for multiple errors
 */
const BatchErrorPayloadSchema = z.object({
  sessionId: z.string(),
  errors: z.array(ErrorPayloadSchema),
})

type BatchErrorPayload = z.infer<typeof BatchErrorPayloadSchema>

/**
 * Lambda handler for frontend error ingestion
 */
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    logger.info('Processing frontend error reports', {
      path: event.rawPath,
      method: event.requestContext.http.method,
    })

    // Parse request body
    if (!event.body) {
      logger.warn('Empty request body received')
      return successResponse(400, { error: 'Request body is required' })
    }

    let body: unknown
    try {
      body = JSON.parse(event.body)
    } catch (error) {
      logger.error('Invalid JSON in request body', error instanceof Error ? error : undefined)
      return successResponse(400, { error: 'Invalid JSON format' })
    }

    // Check if this is a batch or single error
    let errors: ErrorPayload[]
    let sessionId: string

    try {
      // Try parsing as batch first
      const batchPayload = BatchErrorPayloadSchema.safeParse(body)
      if (batchPayload.success) {
        errors = batchPayload.data.errors
        sessionId = batchPayload.data.sessionId
        logger.info('Processing batch error report', {
          errorCount: errors.length,
          sessionId,
        })
      } else {
        // Try parsing as single error
        const singlePayload = ErrorPayloadSchema.parse(body)
        errors = [singlePayload]
        sessionId = singlePayload.sessionId
        logger.info('Processing single error report', {
          sessionId,
        })
      }
    } catch (error) {
      logger.error('Invalid error payload', error instanceof Error ? error : undefined, {
        bodyPreview: JSON.stringify(body).substring(0, 200),
      })
      return successResponse(400, {
        error: 'Invalid payload format',
        details: error instanceof z.ZodError ? error.errors : undefined,
      })
    }

    // Process each error
    const results = await Promise.allSettled(
      errors.map(async errorPayload => {
        const { type, timestamp, url, userAgent, error: errorData, context } = errorPayload

        logger.info('Processing error', {
          type,
          errorName: errorData.name,
          message: errorData.message?.substring(0, 100),
          url,
        })

        // Publish error to CloudWatch
        return logFrontendError({
          type,
          sessionId,
          timestamp,
          url,
          userAgent,
          error: {
            message: errorData.message,
            name: errorData.name || 'Error',
            stack: errorData.stack,
            componentStack: errorData.componentStack,
          },
          context,
        })
      }),
    )

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    if (failed > 0) {
      logger.warn('Some errors failed to log', {
        successful,
        failed,
        total: results.length,
      })

      // Log the failures
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          logger.error('Failed to log error', result.reason, {
            errorIndex: index,
            errorType: errors[index]?.type,
          })
        }
      })
    }

    if (successful === 0) {
      return successResponse(500, {
        success: false,
        error: 'Failed to log all errors',
        processed: successful,
        failed,
      })
    }

    logger.info('Successfully processed errors', {
      successful,
      failed,
      total: results.length,
    })

    return successResponse(200, {
      success: true,
      message: 'Error reports processed successfully',
      processed: successful,
      failed,
    })
  },
  {
    functionName: 'FrontendErrorIngestion',
    logRequest: true,
    logResponse: false, // Don't log response to avoid duplicate error logs
  },
)

/**
 * Web Vitals Ingestion Lambda Function
 * Story 3.3: Frontend Web Vitals Tracking
 *
 * This Lambda function receives Web Vitals metrics from the frontend application
 * and publishes them to CloudWatch using Embedded Metric Format (EMF) for monitoring
 * and alerting in Grafana dashboards.
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { z } from 'zod'
import { createLambdaLogger } from '@repo/logger'
import { withErrorHandling } from '../../lib/utils/lambda-wrapper'
import { recordWebVitalsMetric } from '../../lib/tracking/cloudwatch-web-vitals'
import { successResponse } from '@/core/utils/responses'

// Initialize structured logger
const logger = createLambdaLogger('web-vitals-ingestion')

/**
 * Web Vitals payload schema
 */
const WebVitalsPayloadSchema = z.object({
  type: z.string(),
  sessionId: z.string(),
  timestamp: z.number(),
  url: z.string(),
  userAgent: z.string().optional(),
  data: z.object({
    name: z.string(),
    value: z.number(),
    rating: z.enum(['good', 'needs-improvement', 'poor']),
    id: z.string(),
    navigationType: z.string().optional(),
    delta: z.number().optional(),
  }),
})

type WebVitalsPayload = z.infer<typeof WebVitalsPayloadSchema>

/**
 * Lambda handler for Web Vitals ingestion
 */
export const handler = withErrorHandling(
  async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    logger.info('Processing Web Vitals metrics', {
      path: event.rawPath,
      method: event.requestContext.http.method,
    })

    // Parse request body
    if (!event.body) {
      logger.warn('Empty request body received')
      return successResponse(400, { error: 'Request body is required' })
    }

    let payload: WebVitalsPayload
    try {
      const body = JSON.parse(event.body)
      payload = WebVitalsPayloadSchema.parse(body)
    } catch (error) {
      logger.error('Invalid Web Vitals payload', error instanceof Error ? error : undefined, {
        bodyPreview: event.body?.substring(0, 200),
      })
      return successResponse(400, {
        error: 'Invalid payload format',
        details: error instanceof z.ZodError ? error.errors : undefined,
      })
    }

    // Extract metric data
    const { name, value, rating, id, navigationType, delta } = payload.data
    const { sessionId, url, userAgent } = payload

    logger.info('Received Web Vitals metric', {
      metricName: name,
      value,
      rating,
      url,
      sessionId,
    })

    // Publish metric to CloudWatch using EMF
    try {
      await recordWebVitalsMetric(
        name,
        value,
        rating,
        {
          SessionId: sessionId,
          URL: new URL(url).pathname,
          Rating: rating,
          NavigationType: navigationType || 'unknown',
          MetricId: id,
        },
        {
          userAgent,
          fullUrl: url,
          delta,
        },
      )

      logger.info('Successfully published Web Vitals metric to CloudWatch', {
        metricName: name,
        value,
      })

      return successResponse(200, {
        success: true,
        message: 'Web Vitals metric recorded successfully',
      })
    } catch (error) {
      logger.error(
        'Failed to publish Web Vitals metric',
        error instanceof Error ? error : undefined,
        {
          metricName: name,
          sessionId,
        },
      )

      return successResponse(500, {
        success: false,
        error: 'Failed to record metric',
      })
    }
  },
  {
    functionName: 'WebVitalsIngestion',
    logRequest: true,
    logResponse: true,
  },
)

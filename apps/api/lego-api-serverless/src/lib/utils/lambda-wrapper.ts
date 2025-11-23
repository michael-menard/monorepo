/**
 * Lambda Handler Error Wrapper (Story 5.3: X-Ray annotations)
 *
 * Wraps Lambda handlers with:
 * - Automatic error handling and sanitization
 * - Structured logging with request context
 * - CloudWatch metrics emission
 * - Error response generation
 * - Request/response logging
 * - X-Ray annotations and metadata (Story 5.3)
 *
 * Usage:
 * ```typescript
 * import { withErrorHandling } from '@/lib/utils/lambda-wrapper'
 *
 * export const handler = withErrorHandling(async (event) => {
 *   // Your handler logic
 *   const data = await getMocById(event.pathParameters.id)
 *   return successResponse(200, data)
 * })
 * ```
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { errorResponseFromError } from '@monorepo/lambda-responses'
import { sanitizeError, sanitizeErrorForLogging } from './error-sanitizer'
import { createLogger } from './logger'
import { emitMetric } from './cloudwatch-metrics'
import { addAnnotation, addMetadata, addError } from './xray'

const logger = createLogger('lambda-wrapper')

/**
 * Request context for logging and tracing
 */
interface RequestContext {
  requestId: string
  userId?: string
  method?: string
  path?: string
  sourceIp?: string
  userAgent?: string
}

/**
 * Extract request context from Lambda event
 */
function extractRequestContext(event: APIGatewayProxyEventV2): RequestContext {
  const requestContext = event.requestContext

  return {
    requestId: requestContext.requestId,
    userId: requestContext.authorizer?.jwt?.claims?.sub as string | undefined,
    method: requestContext.http.method,
    path: requestContext.http.path,
    sourceIp: requestContext.http.sourceIp,
    userAgent: requestContext.http.userAgent,
  }
}

/**
 * Extract user ID from event (if authenticated)
 */
function getUserId(event: APIGatewayProxyEventV2): string | undefined {
  return event.requestContext.authorizer?.jwt?.claims?.sub as string | undefined
}

/**
 * Wrap Lambda handler with error handling, logging, and metrics
 *
 * Features:
 * - Automatic error catching and sanitization
 * - Structured request/response logging
 * - CloudWatch metrics for errors and latency
 * - Request context extraction
 * - CORS headers on all responses
 *
 * @param handler - The Lambda handler function
 * @param options - Optional configuration
 * @returns Wrapped handler with error handling
 *
 * @example
 * ```typescript
 * export const handler = withErrorHandling(async (event) => {
 *   const mocId = event.pathParameters?.id
 *   if (!mocId) {
 *     throw new BadRequestError('MOC ID is required')
 *   }
 *
 *   const moc = await getMocById(mocId)
 *   return successResponse(200, moc)
 * })
 * ```
 */
export function withErrorHandling(
  handler: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>,
  options?: {
    /** Custom function name for logging/metrics */
    functionName?: string
    /** Enable detailed request logging */
    logRequest?: boolean
    /** Enable detailed response logging */
    logResponse?: boolean
  },
): (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2> {
  return async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    const startTime = Date.now()
    const context = extractRequestContext(event)
    const functionName = options?.functionName || 'lambda-handler'

    // Story 5.3: Add X-Ray annotations for searchable fields
    if (context.userId) {
      addAnnotation('userId', context.userId)
    }
    addAnnotation('method', context.method || 'UNKNOWN')
    addAnnotation('path', context.path || 'UNKNOWN')
    addAnnotation('functionName', functionName)

    // Story 5.3: Add X-Ray metadata for additional context
    addMetadata('request', 'requestId', context.requestId)
    addMetadata('request', 'sourceIp', context.sourceIp || 'unknown')
    addMetadata('request', 'userAgent', context.userAgent || 'unknown')
    if (event.pathParameters) {
      addMetadata('request', 'pathParameters', event.pathParameters)
    }
    if (event.queryStringParameters) {
      addMetadata('request', 'queryStringParameters', event.queryStringParameters)
    }

    try {
      // Log incoming request
      if (options?.logRequest !== false) {
        logger.info('Incoming request', {
          functionName,
          ...context,
          pathParameters: event.pathParameters,
          queryStringParameters: event.queryStringParameters,
        })
      }

      // Execute the handler
      const response = await handler(event)

      // Calculate duration
      const duration = Date.now() - startTime

      // Log successful response
      if (options?.logResponse !== false) {
        logger.info('Request completed successfully', {
          functionName,
          requestId: context.requestId,
          statusCode: response.statusCode,
          duration,
        })
      }

      // Emit success metrics
      await emitMetric({
        metricName: 'RequestSuccess',
        value: 1,
        unit: 'Count',
        dimensions: {
          FunctionName: functionName,
          Method: context.method || 'UNKNOWN',
          StatusCode: response.statusCode.toString(),
        },
      })

      await emitMetric({
        metricName: 'RequestDuration',
        value: duration,
        unit: 'Milliseconds',
        dimensions: {
          FunctionName: functionName,
          Method: context.method || 'UNKNOWN',
        },
      })

      return response
    } catch (error) {
      // Calculate duration
      const duration = Date.now() - startTime

      // Story 5.3: Add error to X-Ray trace
      if (error instanceof Error) {
        addError(error)
        addMetadata('error', 'message', error.message)
        addMetadata('error', 'stack', error.stack)
      } else {
        addMetadata('error', 'unknown', String(error))
      }

      // Sanitize error for logging (keeps stack trace but removes credentials)
      const sanitizedForLog = sanitizeErrorForLogging(error)

      // Log error with full context
      logger.error('Request failed with error', {
        functionName,
        ...context,
        error: sanitizedForLog,
        duration,
      })

      // Sanitize error for client response
      const sanitizedError = sanitizeError(error)

      // Emit error metrics
      await emitMetric({
        metricName: 'RequestError',
        value: 1,
        unit: 'Count',
        dimensions: {
          FunctionName: functionName,
          Method: context.method || 'UNKNOWN',
          ErrorType: sanitizedError.errorType,
          StatusCode: sanitizedError.statusCode.toString(),
        },
      })

      await emitMetric({
        metricName: 'ErrorDuration',
        value: duration,
        unit: 'Milliseconds',
        dimensions: {
          FunctionName: functionName,
          ErrorType: sanitizedError.errorType,
        },
      })

      // Return sanitized error response
      return errorResponseFromError(error)
    }
  }
}

/**
 * Enhanced wrapper that includes request validation
 *
 * @param handler - The Lambda handler function
 * @param validator - Zod schema for request validation
 * @param options - Optional configuration
 * @returns Wrapped handler with validation and error handling
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * const createMocSchema = z.object({
 *   title: z.string().min(1),
 *   description: z.string().optional(),
 * })
 *
 * export const handler = withValidation(
 *   createMocSchema,
 *   async (event, validatedBody) => {
 *     const moc = await createMoc(validatedBody)
 *     return successResponse(201, moc)
 *   }
 * )
 * ```
 */
export function withValidation<T>(
  validator: { parse: (data: unknown) => T },
  handler: (event: APIGatewayProxyEventV2, validatedData: T) => Promise<APIGatewayProxyResultV2>,
  options?: {
    functionName?: string
    logRequest?: boolean
    logResponse?: boolean
  },
): (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2> {
  return withErrorHandling(
    async (event: APIGatewayProxyEventV2) => {
      // Parse and validate request body
      const body = event.body ? JSON.parse(event.body) : {}
      const validatedData = validator.parse(body)

      // Call handler with validated data
      return await handler(event, validatedData)
    },
    options,
  )
}

/**
 * Log structured CloudWatch log with request context
 *
 * Automatically includes request ID and user ID from Lambda context
 * This is a convenience function for handlers that use the wrapper
 *
 * @param level - Log level
 * @param message - Log message
 * @param event - Lambda event for context
 * @param additionalData - Additional data to log
 */
export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  event: APIGatewayProxyEventV2,
  additionalData?: Record<string, unknown>,
): void {
  const context = extractRequestContext(event)

  logger[level](message, {
    ...context,
    ...additionalData,
  })
}

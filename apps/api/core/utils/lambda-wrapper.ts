/**
 * Lambda Handler Error Wrapper (Story 3.1: EMF Instrumentation + Story 5.3: X-Ray annotations)
 *
 * Wraps Lambda handlers with:
 * - Automatic error handling and sanitization
 * - Structured logging with request context
 * - CloudWatch EMF metrics emission (Story 3.1)
 * - Cold start detection and tracking (Story 3.1)
 * - Error response generation
 * - Request/response logging
 * - X-Ray annotations and metadata (Story 5.3)
 *
 * Usage:
 * ```typescript
 * import { withErrorHandling } from '@/core/utils/lambda-wrapper'
 *
 * export const handler = withErrorHandling(async (event) => {
 *   // Your handler logic
 *   const data = await getMocById(event.pathParameters.id)
 *   return successResponse(200, data)
 * })
 * ```
 */

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { errorResponseFromError } from '@/core/utils/responses'
import { sanitizeError, sanitizeErrorForLogging } from '@/core/observability/error-sanitizer'
import {
  createLambdaLogger,
  generateCorrelationId,
  getXRayTraceId,
  extractCorrelationId,
} from '@repo/logger'
import { addAnnotation, addMetadata, addError } from '@/core/observability/tracing'
import { recordColdStart, recordExecution, recordError } from '@/core/observability/metrics'

// Base logger for wrapper (context will be added per request)
const baseLogger = createLambdaLogger('lambda-wrapper')

/**
 * Cold start detection
 * This variable persists across warm invocations in the same container
 */
let isContainerInitialized = false

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
    userId: (requestContext as any).authorizer?.jwt?.claims?.sub as string | undefined,
    method: requestContext.http.method,
    path: requestContext.http.path,
    sourceIp: requestContext.http.sourceIp,
    userAgent: requestContext.http.userAgent,
  }
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
    const functionName =
      options?.functionName || process.env.AWS_LAMBDA_FUNCTION_NAME || 'lambda-handler'

    // Story 3.2: Generate or extract correlation ID for request tracing
    const correlationId = extractCorrelationId(event.headers) || generateCorrelationId()

    // Story 3.2: Extract X-Ray trace ID if available
    const traceId = getXRayTraceId()

    // Story 3.2: Create request-specific logger with full structured context
    const logger = baseLogger.child({
      requestId: context.requestId,
      correlationId,
      traceId,
      userId: context.userId,
      functionName,
      method: context.method,
      path: context.path,
    })

    // Story 3.1: Detect and record cold starts
    const isColdStart = !isContainerInitialized
    if (isColdStart) {
      isContainerInitialized = true
      // Record cold start asynchronously (non-blocking)
      recordColdStart(functionName, {
        Method: context.method || 'UNKNOWN',
        Path: context.path || 'UNKNOWN',
      }).catch(err => {
        logger.debug('Failed to record cold start (non-blocking)', { error: err })
      })

      logger.info('Cold start detected')
    }

    // Story 5.3: Add X-Ray annotations for searchable fields
    if (context.userId) {
      addAnnotation('userId', context.userId)
    }
    addAnnotation('method', context.method || 'UNKNOWN')
    addAnnotation('path', context.path || 'UNKNOWN')
    addAnnotation('functionName', functionName)
    addAnnotation('coldStart', isColdStart)
    addAnnotation('correlationId', correlationId) // Story 3.2: Add correlation ID to X-Ray

    // Story 5.3: Add X-Ray metadata for additional context
    addMetadata('request', 'requestId', context.requestId)
    addMetadata('request', 'correlationId', correlationId) // Story 3.2
    addMetadata('request', 'sourceIp', context.sourceIp || 'unknown')
    addMetadata('request', 'userAgent', context.userAgent || 'unknown')
    addMetadata('request', 'isColdStart', isColdStart)
    if (event.pathParameters) {
      addMetadata('request', 'pathParameters', event.pathParameters)
    }
    if (event.queryStringParameters) {
      addMetadata('request', 'queryStringParameters', event.queryStringParameters)
    }

    try {
      // Log incoming request with structured context
      if (options?.logRequest !== false) {
        logger.info('Incoming request', {
          pathParameters: event.pathParameters,
          queryStringParameters: event.queryStringParameters,
        })
      }

      // Execute the handler
      const response = await handler(event)

      // Calculate duration
      const duration = Date.now() - startTime

      // Log successful response with structured context
      if (options?.logResponse !== false) {
        logger.info('Request completed successfully', {
          statusCode: typeof response === 'string' ? 200 : response.statusCode,
          duration,
        })
      }

      // Story 3.1: Record EMF execution metrics (asynchronous, non-blocking)
      recordExecution(functionName, duration, false, {
        Method: context.method || 'UNKNOWN',
        Path: context.path || 'UNKNOWN',
        StatusCode: (typeof response === 'string' ? 200 : response.statusCode || 200).toString(),
        ...(context.userId && { UserId: context.userId }),
      }).catch(err => {
        logger.debug('Failed to record EMF execution metrics (non-blocking)', { error: err })
      })

      // Legacy CloudWatch metrics removed - using EMF metrics instead

      // Story 3.2: Add correlation ID to response headers for client-side tracing
      if (typeof response === 'string') {
        return response
      }

      return {
        ...response,
        headers: {
          ...(response.headers || {}),
          'X-Correlation-ID': correlationId,
        },
      }
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

      // Log error with structured context (error object handled by logger)
      logger.error(
        'Request failed with error',
        sanitizedForLog instanceof Error ? sanitizedForLog : undefined,
        {
          duration,
          errorType: sanitizedForLog instanceof Error ? sanitizedForLog.name : 'Unknown',
        },
      )

      // Sanitize error for client response
      const sanitizedError = sanitizeError(error)

      // Story 3.1: Record EMF error metrics (asynchronous, non-blocking)
      recordError(
        functionName,
        sanitizedError.errorType,
        sanitizedError.message,
        sanitizedError.statusCode,
        {
          Method: context.method || 'UNKNOWN',
          Path: context.path || 'UNKNOWN',
          ...(context.userId && { UserId: context.userId }),
        },
      ).catch(err => {
        logger.debug('Failed to record EMF error metrics (non-blocking)', { error: err })
      })

      // Story 3.1: Record EMF execution metrics with error flag
      recordExecution(functionName, duration, true, {
        Method: context.method || 'UNKNOWN',
        Path: context.path || 'UNKNOWN',
        ErrorType: sanitizedError.errorType,
        StatusCode: sanitizedError.statusCode.toString(),
        ...(context.userId && { UserId: context.userId }),
      }).catch(err => {
        logger.debug('Failed to record EMF execution metrics (non-blocking)', { error: err })
      })

      // Legacy CloudWatch error metrics removed - using EMF metrics instead

      // Story 3.2: Return sanitized error response with correlation ID header
      const errorResponse = errorResponseFromError(error)
      return {
        ...errorResponse,
        headers: {
          ...errorResponse.headers,
          'X-Correlation-ID': correlationId,
        },
      }
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
  return withErrorHandling(async (event: APIGatewayProxyEventV2) => {
    // Parse and validate request body
    const body = event.body ? JSON.parse(event.body) : {}
    const validatedData = validator.parse(body)

    // Call handler with validated data
    return await handler(event, validatedData)
  }, options)
}

/**
 * Log structured CloudWatch log with request context
 *
 * Automatically includes request ID, correlation ID, and user ID from Lambda context
 * This is a convenience function for handlers that use the wrapper
 *
 * @param level - Log level
 * @param message - Log message
 * @param event - Lambda event for context
 * @param additionalData - Additional data to log
 *
 * @deprecated Use the logger instance provided in the handler context instead
 */
export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  event: APIGatewayProxyEventV2,
  additionalData?: Record<string, unknown>,
): void {
  const context = extractRequestContext(event)
  const correlationId = extractCorrelationId(event.headers) || generateCorrelationId()
  const traceId = getXRayTraceId()

  // Create a temporary logger with full context
  const contextLogger = baseLogger.child({
    ...context,
    correlationId,
    traceId,
  })

  if (level === 'error') {
    contextLogger.error(message, undefined, additionalData)
  } else {
    contextLogger[level](message, additionalData)
  }
}

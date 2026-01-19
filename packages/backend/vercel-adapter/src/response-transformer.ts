/**
 * Response Transformer
 *
 * Transforms Lambda Response → Vercel Response
 */

import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import type { VercelResponse } from '@vercel/node'

/**
 * Transform Lambda result to Vercel response
 *
 * Maps API Gateway response format to Vercel response.
 * Handles status codes, headers, and body serialization.
 *
 * @param result - Lambda handler result (structured format)
 * @param res - Vercel response object
 */
export function transformResponse(result: APIGatewayProxyStructuredResultV2, res: VercelResponse): void {
  // Handle undefined/null result
  if (!result) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Handler returned invalid response',
      },
      timestamp: new Date().toISOString(),
    })
    return
  }

  // Extract status code (default to 200)
  const statusCode = result.statusCode || 200

  // Validate status code range
  if (statusCode < 100 || statusCode > 599) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Invalid status code: ${statusCode}`,
      },
      timestamp: new Date().toISOString(),
    })
    return
  }

  // Set status code
  res.status(statusCode)

  // Set headers
  if (result.headers) {
    for (const [key, value] of Object.entries(result.headers)) {
      if (value !== undefined) {
        res.setHeader(key, String(value))
      }
    }
  }

  // Set cookies (if any)
  if (result.cookies) {
    for (const cookie of result.cookies) {
      res.setHeader('Set-Cookie', cookie)
    }
  }

  // Send body
  if (!result.body) {
    res.end()
    return
  }

  // Check if body is already JSON or needs parsing
  try {
    // Try to parse as JSON to validate
    const parsed = JSON.parse(result.body)
    res.json(parsed)
  } catch {
    // Not JSON, send as-is
    res.send(result.body)
  }
}

/**
 * Transform error to Vercel response
 *
 * Handles errors thrown by Lambda handler.
 * Returns 500 with error details.
 *
 * @param error - Error object
 * @param res - Vercel response object
 */
export function transformError(error: unknown, res: VercelResponse): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  const errorStack = error instanceof Error ? error.stack : undefined

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: errorMessage,
      // Include stack trace in development
      ...(process.env.NODE_ENV !== 'production' && errorStack ? { stack: errorStack } : {}),
    },
    timestamp: new Date().toISOString(),
  })
}

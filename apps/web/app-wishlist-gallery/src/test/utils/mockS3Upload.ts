/**
 * Test utility for mocking S3 upload scenarios
 *
 * Story: WISH-2120
 */

import { z } from 'zod'
import { http, HttpResponse, delay } from 'msw'
import { server } from '../mocks/server'
import { createMockPresignResponse } from '../fixtures/s3-mocks'

const API_BASE_URL = 'http://localhost:3001'

/**
 * Scenario types for S3 upload mocking
 */
export const MockS3UploadScenarioSchema = z.enum(['success', 'presign-error', 's3-error', 'timeout'])

export type MockS3UploadScenario = z.infer<typeof MockS3UploadScenarioSchema>

/**
 * Options schema for mockS3Upload
 */
export const MockS3UploadOptionsSchema = z.object({
  scenario: MockS3UploadScenarioSchema,
  statusCode: z.number().int().min(100).max(599).optional(),
  delay: z.number().int().min(0).optional(),
  progressSteps: z.array(z.number().int().min(0).max(100)).optional(),
})

export type MockS3UploadOptions = z.infer<typeof MockS3UploadOptionsSchema>

/**
 * Cleanup function type returned by mockS3Upload
 */
export type MockS3UploadCleanup = () => void

/**
 * Configures MSW handlers for S3 upload testing scenarios.
 *
 * This utility injects runtime MSW handlers using server.use() to mock
 * presign API and S3 PUT operations. Returns a cleanup function to remove
 * handlers after the test.
 *
 * @param options - Scenario configuration
 * @param options.scenario - Upload scenario to simulate
 * @param options.statusCode - HTTP status code for error scenarios (default depends on scenario)
 * @param options.delay - Response delay in milliseconds (default: 0)
 * @param options.progressSteps - Progress percentages to simulate (default: [100])
 * @returns Cleanup function that removes the injected handlers
 *
 * @example
 * ```ts
 * // Success scenario
 * const cleanup = mockS3Upload({ scenario: 'success' })
 * // ... test code ...
 * cleanup()
 *
 * // Error scenarios
 * const cleanup = mockS3Upload({
 *   scenario: 'presign-error',
 *   statusCode: 403
 * })
 *
 * // Timeout with delay
 * const cleanup = mockS3Upload({
 *   scenario: 'timeout',
 *   delay: 5000
 * })
 *
 * // Custom progress simulation
 * const cleanup = mockS3Upload({
 *   scenario: 'success',
 *   progressSteps: [25, 50, 75, 100]
 * })
 * ```
 */
export function mockS3Upload(options: MockS3UploadOptions): MockS3UploadCleanup {
  const validated = MockS3UploadOptionsSchema.parse(options)

  const { scenario, delay: responseDelay = 0 } = validated

  // Determine status code based on scenario if not explicitly provided
  const getStatusCode = (): number => {
    if (validated.statusCode !== undefined) {
      return validated.statusCode
    }
    switch (scenario) {
      case 'presign-error':
        return 500
      case 's3-error':
        return 403
      case 'timeout':
        return 500 // Not used but included for completeness
      case 'success':
      default:
        return 200
    }
  }

  const statusCode = getStatusCode()

  // Create handlers based on scenario
  const handlers = []

  // Presign endpoint handler
  if (scenario === 'presign-error') {
    handlers.push(
      http.post(`${API_BASE_URL}/api/wishlist/images/presign`, async () => {
        if (responseDelay > 0) {
          await delay(responseDelay)
        }
        return HttpResponse.json(
          {
            error: 'Internal Server Error',
            message: 'Failed to generate presigned URL',
            statusCode,
          },
          { status: statusCode },
        )
      }),
    )
  } else if (scenario === 'timeout') {
    // Timeout scenario: never resolve
    handlers.push(
      http.post(`${API_BASE_URL}/api/wishlist/images/presign`, async () => {
        // Delay indefinitely (test will timeout or cancel)
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
  } else {
    // Success or s3-error: presign succeeds
    handlers.push(
      http.post(`${API_BASE_URL}/api/wishlist/images/presign`, async ({ request }) => {
        if (responseDelay > 0) {
          await delay(responseDelay)
        }
        const body = (await request.json()) as { fileName: string; mimeType: string }
        const presignResponse = createMockPresignResponse(body.fileName)
        return HttpResponse.json(presignResponse)
      }),
    )
  }

  // S3 PUT handler
  if (scenario === 's3-error') {
    // S3 PUT fails
    handlers.push(
      http.put('https://*.s3.amazonaws.com/*', async () => {
        if (responseDelay > 0) {
          await delay(responseDelay)
        }
        return HttpResponse.json(
          {
            error: 'Forbidden',
            message: 'Access denied to S3 bucket',
          },
          { status: statusCode },
        )
      }),
    )
  } else if (scenario === 'success') {
    // S3 PUT succeeds
    handlers.push(
      http.put('https://*.s3.amazonaws.com/*', async () => {
        if (responseDelay > 0) {
          await delay(responseDelay)
        }
        return new HttpResponse(null, {
          status: 200,
          headers: {
            'x-amz-request-id': 'mock-request-id',
            etag: '"mock-etag"',
          },
        })
      }),
    )
  }
  // Note: For timeout scenario, S3 handler is not needed as presign never resolves

  // Inject handlers into MSW server
  server.use(...handlers)

  // Return cleanup function
  return () => {
    server.resetHandlers()
  }
}

/**
 * Vercel Adapter
 *
 * Core adapter function that wraps Lambda handlers for Vercel runtime
 */

import type { LambdaHandler, VercelHandler } from './types.js'
import { transformRequest } from './request-transformer.js'
import { transformResponse, transformError } from './response-transformer.js'
import { createLambdaContext } from './context-factory.js'

/**
 * Create Vercel handler from Lambda handler
 *
 * Wraps an AWS Lambda handler (API Gateway V2 format) to run on Vercel.
 * Handles request/response transformation and error handling.
 *
 * Example:
 * ```typescript
 * import { createVercelHandler } from '@repo/vercel-adapter'
 * import { handler as listSetsHandler } from './endpoints/sets/list/handler'
 *
 * export const GET = createVercelHandler(listSetsHandler)
 * ```
 *
 * @param lambdaHandler - Lambda handler function (API Gateway V2 format)
 * @returns Vercel handler function
 */
export function createVercelHandler(lambdaHandler: LambdaHandler): VercelHandler {
  return async (req, res) => {
    try {
      // Transform Vercel request → API Gateway event
      const event = transformRequest(req)

      // Create minimal Lambda context stub
      const context = createLambdaContext()

      // Invoke Lambda handler (real logic, no mocks)
      const result = await lambdaHandler(event, context, () => {})

      // Handle result (could be structured object or string)
      if (typeof result === 'string') {
        // Simple string response (default 200)
        res.status(200).send(result)
      } else if (result && typeof result === 'object') {
        // Structured response with statusCode, headers, body
        transformResponse(result, res)
      } else {
        // Invalid response
        transformError(new Error('Handler returned invalid response type'), res)
      }
    } catch (error) {
      // Handle errors thrown by handler
      transformError(error, res)
    }
  }
}

/**
 * Type definitions for Vercel Adapter
 *
 * Maps between Vercel Request/Response and AWS Lambda API Gateway Event/Result
 */

import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  Context as LambdaContext,
} from 'aws-lambda'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * Lambda Handler Type (API Gateway V2 format)
 */
export type LambdaHandler = (
  event: APIGatewayProxyEventV2,
  context: LambdaContext,
  callback: () => void,
) => Promise<APIGatewayProxyResultV2>

/**
 * Vercel Handler Type
 */
export type VercelHandler = (req: VercelRequest, res: VercelResponse) => Promise<void>

/**
 * Re-export AWS Lambda types for convenience
 */
export type {
  APIGatewayProxyEventV2,
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyResultV2,
  APIGatewayProxyStructuredResultV2,
  LambdaContext,
}

/**
 * Re-export Vercel types for convenience
 */
export type { VercelRequest, VercelResponse }

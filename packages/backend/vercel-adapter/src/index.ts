/**
 * @repo/vercel-adapter
 *
 * Adapter layer to run AWS Lambda handlers on Vercel with minimal changes.
 * Handles request/response transformation between Vercel and API Gateway formats.
 */

export { createVercelHandler } from './adapter.js'
export { transformRequest, type TransformRequestOptions } from './request-transformer.js'
export { transformResponse, transformError } from './response-transformer.js'
export { createLambdaContext } from './context-factory.js'
export {
  validateCognitoJwt,
  getJwtClaims,
  type CognitoJwtClaims,
  type CognitoConfig,
  type JwtValidationResult,
} from './vercel-auth-middleware.js'

export type {
  LambdaHandler,
  VercelHandler,
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
  LambdaContext,
  VercelRequest,
  VercelResponse,
} from './types.js'

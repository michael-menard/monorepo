/**
 * Request Transformer
 *
 * Transforms Vercel Request → API Gateway V2 Event
 */

import type { APIGatewayProxyEventV2WithJWTAuthorizer } from 'aws-lambda'
import type { VercelRequest } from '@vercel/node'

/**
 * Options for request transformation
 */
export interface TransformRequestOptions {
  /**
   * Pre-validated JWT claims to inject into the event
   * If provided, these claims are used directly without mock data
   */
  jwtClaims?: Record<string, unknown>

  /**
   * Path parameters extracted from the URL (e.g., { id: '123' })
   */
  pathParameters?: Record<string, string>
}

/**
 * Transform Vercel Request to API Gateway V2 Event with JWT Authorizer
 *
 * Maps Vercel request structure to API Gateway HTTP API event format (v2).
 * Supports injecting validated JWT claims and path parameters.
 *
 * @param req - Vercel request object
 * @param options - Optional transformation options
 * @returns API Gateway V2 event with JWT authorizer
 */
export function transformRequest(
  req: VercelRequest,
  options?: TransformRequestOptions,
): APIGatewayProxyEventV2WithJWTAuthorizer {
  // Extract query parameters from URL
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const queryStringParameters: Record<string, string> = {}

  url.searchParams.forEach((value, key) => {
    queryStringParameters[key] = value
  })

  // Normalize headers to lowercase (API Gateway convention)
  const headers: Record<string, string> = {}
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') {
      headers[key.toLowerCase()] = value
    } else if (Array.isArray(value)) {
      headers[key.toLowerCase()] = value[0] || ''
    }
  }

  // Parse body if present
  let body: string | undefined
  if (req.body) {
    if (typeof req.body === 'string') {
      body = req.body
    } else {
      body = JSON.stringify(req.body)
    }
  }

  // JWT claims handling:
  // - If options.jwtClaims provided, use those (pre-validated by middleware)
  // - Otherwise, use empty claims (handler must validate auth header directly)
  // Type cast to match APIGateway JWT claims type
  const jwtClaims = (options?.jwtClaims ?? {}) as { [name: string]: string | number | boolean | string[] }

  // Path parameters handling
  const pathParameters = options?.pathParameters

  // Build API Gateway V2 event with JWT authorizer
  const event: APIGatewayProxyEventV2WithJWTAuthorizer = {
    version: '2.0',
    routeKey: `${req.method} ${url.pathname}`,
    rawPath: url.pathname,
    rawQueryString: url.search.slice(1), // Remove leading '?'
    headers,
    queryStringParameters: Object.keys(queryStringParameters).length > 0 ? queryStringParameters : undefined,
    pathParameters,
    requestContext: {
      accountId: '000000000000',
      apiId: 'vercel-adapter',
      domainName: req.headers.host || 'localhost',
      domainPrefix: 'vercel',
      http: {
        method: req.method || 'GET',
        path: url.pathname,
        protocol: 'HTTP/1.1',
        sourceIp: req.headers['x-forwarded-for'] as string || '127.0.0.1',
        userAgent: req.headers['user-agent'] as string || 'vercel-adapter',
      },
      requestId: `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      routeKey: `${req.method} ${url.pathname}`,
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      // JWT authorizer context (required for this event type)
      authorizer: {
        principalId: (jwtClaims.sub as string) || 'anonymous',
        integrationLatency: 0,
        jwt: {
          claims: jwtClaims,
          scopes: [],
        },
      },
    },
    body,
    isBase64Encoded: false,
  }

  return event
}

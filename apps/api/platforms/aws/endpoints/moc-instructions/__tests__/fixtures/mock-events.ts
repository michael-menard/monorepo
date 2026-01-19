/**
 * Mock API Gateway Events for Tests
 */

import { mockJwtClaims } from './mock-users'

/**
 * Create mock API Gateway HTTP API event
 */
export function createMockEvent(options: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  pathParameters?: Record<string, string>
  queryStringParameters?: Record<string, string>
  body?: any
  userId?: string
  headers?: Record<string, string>
}): any {
  const userId = options.userId || 'user-123'
  const claims = userId === 'user-123' ? mockJwtClaims.user1 : mockJwtClaims.user2

  return {
    version: '2.0',
    routeKey: `${options.method} ${options.path}`,
    rawPath: options.path,
    rawQueryString: new URLSearchParams(options.queryStringParameters || {}).toString(),
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer mock-jwt-token-${userId}`,
      ...options.headers,
    },
    queryStringParameters: options.queryStringParameters || {},
    pathParameters: options.pathParameters || {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      domainName: 'test.execute-api.us-east-1.amazonaws.com',
      domainPrefix: 'test',
      http: {
        method: options.method,
        path: options.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test-agent',
      },
      requestId: `test-request-${Date.now()}`,
      routeKey: `${options.method} ${options.path}`,
      stage: 'dev',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      authorizer: {
        jwt: {
          claims,
          scopes: [],
        },
      },
    },
    body: options.body ? JSON.stringify(options.body) : null,
    isBase64Encoded: false,
  }
}

/**
 * Create mock event without authentication (for 401 tests)
 */
export function createUnauthorizedEvent(options: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  path: string
  pathParameters?: Record<string, string>
  body?: any
}): any {
  return {
    version: '2.0',
    routeKey: `${options.method} ${options.path}`,
    rawPath: options.path,
    headers: {
      'content-type': 'application/json',
    },
    queryStringParameters: {},
    pathParameters: options.pathParameters || {},
    requestContext: {
      accountId: '123456789012',
      apiId: 'test-api-id',
      http: {
        method: options.method,
        path: options.path,
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
      },
      requestId: `test-request-${Date.now()}`,
      routeKey: `${options.method} ${options.path}`,
      stage: 'dev',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      // No authorizer - simulates unauthenticated request
    },
    body: options.body ? JSON.stringify(options.body) : null,
    isBase64Encoded: false,
  }
}

/**
 * Pre-built common events
 */
export const commonEvents = {
  listMocs: createMockEvent({
    method: 'GET',
    path: '/api/mocs',
    queryStringParameters: { page: '1', limit: '20' },
  }),

  getMocDetail: createMockEvent({
    method: 'GET',
    path: '/api/mocs/moc-basic-123',
    pathParameters: { id: 'moc-basic-123' },
  }),

  createMoc: (body: any) =>
    createMockEvent({
      method: 'POST',
      path: '/api/mocs',
      body,
    }),

  updateMoc: (id: string, body: any) =>
    createMockEvent({
      method: 'PATCH',
      path: `/api/mocs/${id}`,
      pathParameters: { id },
      body,
    }),

  deleteMoc: (id: string) =>
    createMockEvent({
      method: 'DELETE',
      path: `/api/mocs/${id}`,
      pathParameters: { id },
    }),

  searchMocs: (searchQuery: string) =>
    createMockEvent({
      method: 'GET',
      path: '/api/mocs',
      queryStringParameters: { search: searchQuery, page: '1', limit: '20' },
    }),
}

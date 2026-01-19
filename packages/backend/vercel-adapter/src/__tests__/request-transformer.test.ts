/**
 * Request Transformer Tests
 */

import { describe, it, expect } from 'vitest'
import { transformRequest } from '../request-transformer'
import type { VercelRequest } from '@vercel/node'

describe('transformRequest', () => {
  it('should transform basic GET request', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {
        host: 'localhost:3000',
        'user-agent': 'test-agent',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.requestContext.http.method).toBe('GET')
    expect(event.rawPath).toBe('/api/sets/list')
    expect(event.queryStringParameters).toBeUndefined()
    expect(event.body).toBeUndefined()
  })

  it('should parse query parameters', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list?page=1&limit=20&search=lego',
      headers: {
        host: 'localhost:3000',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.queryStringParameters).toEqual({
      page: '1',
      limit: '20',
      search: 'lego',
    })
    expect(event.rawQueryString).toBe('page=1&limit=20&search=lego')
  })

  it('should handle empty query parameters', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list?',
      headers: {
        host: 'localhost:3000',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.queryStringParameters).toBeUndefined()
    expect(event.rawQueryString).toBe('')
  })

  it('should normalize headers to lowercase', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {
        Host: 'localhost:3000',
        'Content-Type': 'application/json',
        Authorization: 'Bearer token123',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.headers).toHaveProperty('host', 'localhost:3000')
    expect(event.headers).toHaveProperty('content-type', 'application/json')
    expect(event.headers).toHaveProperty('authorization', 'Bearer token123')
  })

  it('should handle array headers (take first value)', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {
        host: 'localhost:3000',
        accept: ['application/json', 'text/html'],
      },
      body: undefined,
    } as unknown as VercelRequest

    const event = transformRequest(req)

    expect(event.headers.accept).toBe('application/json')
  })

  it('should parse JSON body', () => {
    const body = { title: 'Test Set', setNumber: '12345' }
    const req = {
      method: 'POST',
      url: '/api/sets/create',
      headers: {
        host: 'localhost:3000',
        'content-type': 'application/json',
      },
      body,
    } as unknown as VercelRequest

    const event = transformRequest(req)

    expect(event.body).toBe(JSON.stringify(body))
    expect(event.requestContext.http.method).toBe('POST')
  })

  it('should handle string body as-is', () => {
    const req = {
      method: 'POST',
      url: '/api/sets/create',
      headers: {
        host: 'localhost:3000',
      },
      body: 'plain text body',
    } as unknown as VercelRequest

    const event = transformRequest(req)

    expect(event.body).toBe('plain text body')
  })

  it('should create JWT authorizer context from pre-validated claims', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {
        host: 'localhost:3000',
        authorization: 'Bearer test-jwt-token',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req, {
      jwtClaims: {
        sub: 'test-user-id',
        email: 'test@example.com',
      },
    })

    expect(event.requestContext.authorizer).toBeDefined()
    expect(event.requestContext.authorizer.jwt.claims.sub).toBe('test-user-id')
    expect(event.requestContext.authorizer.jwt.claims.email).toBe('test@example.com')
  })

  it('should create empty JWT claims without auth header', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {
        host: 'localhost:3000',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.requestContext.authorizer).toBeDefined()
    expect(event.requestContext.authorizer.jwt.claims).toEqual({})
  })

  it('should handle missing url with fallback', () => {
    const req = {
      method: 'GET',
      url: undefined,
      headers: {
        host: 'localhost:3000',
      },
      body: undefined,
    } as unknown as VercelRequest

    const event = transformRequest(req)

    expect(event.rawPath).toBe('/')
  })

  it('should handle missing host header', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {},
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.requestContext.domainName).toBe('localhost')
  })

  it('should set routeKey correctly', () => {
    const req = {
      method: 'POST',
      url: '/api/sets/create',
      headers: {
        host: 'localhost:3000',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.routeKey).toBe('POST /api/sets/create')
    expect(event.requestContext.routeKey).toBe('POST /api/sets/create')
  })

  it('should handle special characters in query params', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list?search=Star%20Wars&tags=space%2Cship',
      headers: {
        host: 'localhost:3000',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.queryStringParameters).toEqual({
      search: 'Star Wars',
      tags: 'space,ship',
    })
  })

  it('should extract sourceIp from x-forwarded-for header', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {
        host: 'localhost:3000',
        'x-forwarded-for': '192.168.1.1',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.requestContext.http.sourceIp).toBe('192.168.1.1')
  })

  it('should default sourceIp to 127.0.0.1 without x-forwarded-for', () => {
    const req = {
      method: 'GET',
      url: '/api/sets/list',
      headers: {
        host: 'localhost:3000',
      },
      body: undefined,
    } as VercelRequest

    const event = transformRequest(req)

    expect(event.requestContext.http.sourceIp).toBe('127.0.0.1')
  })
})

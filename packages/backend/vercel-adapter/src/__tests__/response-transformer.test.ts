/**
 * Response Transformer Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { transformResponse, transformError } from '../response-transformer'
import type { APIGatewayProxyStructuredResultV2 } from '../types'
import type { VercelResponse } from '@vercel/node'

describe('transformResponse', () => {
  let mockRes: VercelResponse

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
      end: vi.fn().mockReturnThis(),
    } as unknown as VercelResponse
  })

  it('should transform 200 response with JSON body', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ success: true, data: [] }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(200)
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    expect(mockRes.json).toHaveBeenCalledWith({ success: true, data: [] })
  })

  it('should default statusCode to 200 if missing', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      body: JSON.stringify({ message: 'OK' }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(200)
  })

  it('should handle error response (500)', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong',
        },
      }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong',
      },
    })
  })

  it('should handle 401 unauthorized', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(401)
  })

  it('should set multiple headers', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'X-Custom-Header': 'custom-value',
      },
      body: JSON.stringify({ data: [] }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    expect(mockRes.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
    expect(mockRes.setHeader).toHaveBeenCalledWith('X-Custom-Header', 'custom-value')
  })

  it('should handle cookies', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 200,
      cookies: [
        'session=abc123; HttpOnly; Secure',
        'preferences=dark-mode; Path=/',
      ],
      body: JSON.stringify({ message: 'Cookies set' }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', 'session=abc123; HttpOnly; Secure')
    expect(mockRes.setHeader).toHaveBeenCalledWith('Set-Cookie', 'preferences=dark-mode; Path=/')
  })

  it('should handle empty body', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 204,
    }

    transformResponse(result, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(204)
    expect(mockRes.end).toHaveBeenCalled()
    expect(mockRes.json).not.toHaveBeenCalled()
    expect(mockRes.send).not.toHaveBeenCalled()
  })

  it('should handle non-JSON body as text', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 200,
      body: 'Plain text response',
    }

    transformResponse(result, mockRes)

    expect(mockRes.send).toHaveBeenCalledWith('Plain text response')
  })

  it('should handle null/undefined result', () => {
    transformResponse(null as unknown as APIGatewayProxyStructuredResultV2, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Handler returned invalid response',
        }),
      }),
    )
  })

  it('should reject invalid status codes (<100)', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 50,
      body: JSON.stringify({ message: 'invalid' }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid status code: 50',
        }),
      }),
    )
  })

  it('should reject invalid status codes (>599)', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 600,
      body: JSON.stringify({ message: 'invalid' }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          message: 'Invalid status code: 600',
        }),
      }),
    )
  })

  it('should skip undefined header values', () => {
    const result: APIGatewayProxyStructuredResultV2 = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Optional': undefined,
      },
      body: JSON.stringify({ data: [] }),
    }

    transformResponse(result, mockRes)

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json')
    expect(mockRes.setHeader).not.toHaveBeenCalledWith('X-Optional', expect.anything())
  })
})

describe('transformError', () => {
  let mockRes: VercelResponse

  beforeEach(() => {
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    } as unknown as VercelResponse
  })

  it('should transform Error object', () => {
    const error = new Error('Test error message')

    transformError(error, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
          message: 'Test error message',
        }),
        timestamp: expect.any(String),
      }),
    )
  })

  it('should include stack trace in development', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    const error = new Error('Dev error')

    transformError(error, mockRes)

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          stack: expect.any(String),
        }),
      }),
    )

    process.env.NODE_ENV = originalEnv
  })

  it('should not include stack trace in production', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    const error = new Error('Prod error')

    transformError(error, mockRes)

    const jsonCall = (mockRes.json as any).mock.calls[0][0]
    expect(jsonCall.error).not.toHaveProperty('stack')

    process.env.NODE_ENV = originalEnv
  })

  it('should handle non-Error objects', () => {
    transformError('String error', mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Unknown error',
        }),
      }),
    )
  })

  it('should handle null/undefined errors', () => {
    transformError(null, mockRes)

    expect(mockRes.status).toHaveBeenCalledWith(500)
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          message: 'Unknown error',
        }),
      }),
    )
  })
})

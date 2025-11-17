/**
 * Unit Tests for Response Builders
 *
 * Tests the response builder functions that create standardized API Gateway responses.
 * Focus: API contract, CORS headers, production vs dev behavior, JSON serialization.
 */

import { describe, it, expect, afterEach } from 'vitest'
import {
  successResponse,
  errorResponse,
  errorResponseFromError,
  healthCheckResponse,
  noContentResponse,
  redirectResponse,
  corsResponse,
  type HealthCheckData,
} from '../responses.js'
import { NotFoundError, BadRequestError } from '../errors.js'

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV

describe('Response Builders', () => {
  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('Success Responses - successResponse()', () => {
    it('should create success response with data', () => {
      const result = successResponse(200, { id: '123', title: 'My MOC' })

      expect(result.statusCode).toBe(200)
      expect(result.headers['Content-Type']).toBe('application/json')
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data).toEqual({ id: '123', title: 'My MOC' })
      expect(body.timestamp).toBeDefined()
    })

    it('should include optional message', () => {
      const result = successResponse(201, { id: '123' }, 'Resource created')

      const body = JSON.parse(result.body)
      expect(body.message).toBe('Resource created')
    })

    it('should have timestamp in ISO 8601 format', () => {
      const beforeTime = Date.now()
      const result = successResponse(200, {})
      const afterTime = Date.now()

      const body = JSON.parse(result.body)
      const timestamp = new Date(body.timestamp).getTime()

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime)
      expect(timestamp).toBeLessThanOrEqual(afterTime)
    })

    it('should include CORS headers', () => {
      const result = successResponse(200, {})

      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)
    })
  })

  describe('Error Responses - errorResponse()', () => {
    it('should create error response with all parameters', () => {
      process.env.NODE_ENV = 'development'

      const result = errorResponse(404, 'NOT_FOUND', 'Resource not found', { id: '123' })

      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('NOT_FOUND')
      expect(body.error.message).toBe('Resource not found')
      expect(body.error.details).toEqual({ id: '123' })
      expect(body.timestamp).toBeDefined()
    })

    it('should strip details in production', () => {
      process.env.NODE_ENV = 'production'

      const result = errorResponse(500, 'INTERNAL_ERROR', 'Error', { stack: 'sensitive data' })

      const body = JSON.parse(result.body)
      expect(body.error.details).toBeUndefined()
    })

    it('should include details in development', () => {
      process.env.NODE_ENV = 'development'

      const result = errorResponse(400, 'BAD_REQUEST', 'Invalid', { field: 'email' })

      const body = JSON.parse(result.body)
      expect(body.error.details).toEqual({ field: 'email' })
    })
  })

  describe('Error Response from Error Object - errorResponseFromError()', () => {
    it('should create response from ApiError', () => {
      process.env.NODE_ENV = 'development'
      const error = new NotFoundError('MOC not found', { mocId: '123' })

      const result = errorResponseFromError(error)

      expect(result.statusCode).toBe(404)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('NOT_FOUND')
      expect(body.error.message).toBe('MOC not found')
      expect(body.error.details).toEqual({ mocId: '123' })
    })

    it('should wrap standard Error', () => {
      const error = new Error('Unexpected failure')

      const result = errorResponseFromError(error)

      expect(result.statusCode).toBe(500)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('INTERNAL_ERROR')
      expect(body.error.message).toBe('Unexpected failure')
    })

    it('should wrap unknown error', () => {
      const error = 'Something broke'

      const result = errorResponseFromError(error)

      expect(result.statusCode).toBe(500)

      const body = JSON.parse(result.body)
      expect(body.error.type).toBe('INTERNAL_ERROR')
      expect(body.error.message).toBe('An unexpected error occurred')
    })
  })

  describe('Health Check Response - healthCheckResponse()', () => {
    it('should return 200 when healthy', () => {
      const data: HealthCheckData = {
        status: 'healthy',
        services: {
          postgres: 'connected',
          redis: 'connected',
          opensearch: 'connected',
        },
        timestamp: new Date().toISOString(),
      }

      const result = healthCheckResponse(data)

      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.status).toBe('healthy')
      expect(body.message).toBe('System status: healthy')
    })

    it('should return 200 when degraded', () => {
      const data: HealthCheckData = {
        status: 'degraded',
        services: {
          postgres: 'connected',
          redis: 'disconnected',
          opensearch: 'connected',
        },
        timestamp: new Date().toISOString(),
      }

      const result = healthCheckResponse(data)

      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.message).toBe('System status: degraded')
    })

    it('should return 503 when unhealthy', () => {
      const data: HealthCheckData = {
        status: 'unhealthy',
        services: {
          postgres: 'error',
          redis: 'error',
          opensearch: 'error',
        },
        timestamp: new Date().toISOString(),
      }

      const result = healthCheckResponse(data)

      expect(result.statusCode).toBe(503)

      const body = JSON.parse(result.body)
      expect(body.message).toBe('System status: unhealthy')
    })
  })

  describe('Special Responses', () => {
    it('should create noContentResponse() for deletes', () => {
      const result = noContentResponse()

      expect(result.statusCode).toBe(204)
      expect(result.body).toBe('')
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)
    })

    it('should create redirectResponse() for presigned URLs', () => {
      const url = 'https://s3.amazonaws.com/bucket/key'

      const result = redirectResponse(url)

      expect(result.statusCode).toBe(302)
      expect(result.headers.Location).toBe(url)
      expect(result.body).toBe('')
    })

    it('should create corsResponse() for OPTIONS preflight', () => {
      const result = corsResponse()

      expect(result.statusCode).toBe(200)
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Methods']).toBe(
        'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      )
      expect(result.headers['Access-Control-Allow-Headers']).toBe(
        'Content-Type, Authorization, X-Requested-With',
      )
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)
      expect(result.headers['Access-Control-Max-Age']).toBe('86400')
      expect(result.body).toBe('')
    })
  })

  describe('Response Body Validation', () => {
    it('should produce valid JSON for all response builders', () => {
      const responses = [
        successResponse(200, { test: 'data' }),
        errorResponse(400, 'BAD_REQUEST', 'Error'),
        healthCheckResponse({
          status: 'healthy',
          services: { postgres: 'connected', redis: 'connected', opensearch: 'connected' },
          timestamp: new Date().toISOString(),
        }),
      ]

      responses.forEach((response) => {
        expect(() => JSON.parse(response.body)).not.toThrow()
      })
    })

    it('should have expected structure for success responses', () => {
      const result = successResponse(200, { id: '123' })

      const body = JSON.parse(result.body)

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('data')
      expect(body).toHaveProperty('timestamp')
      expect(body.success).toBe(true)
    })

    it('should have expected structure for error responses', () => {
      const result = errorResponse(404, 'NOT_FOUND', 'Not found')

      const body = JSON.parse(result.body)

      expect(body).toHaveProperty('success')
      expect(body).toHaveProperty('error')
      expect(body).toHaveProperty('timestamp')
      expect(body.success).toBe(false)
      expect(body.error).toHaveProperty('type')
      expect(body.error).toHaveProperty('message')
    })
  })

  describe('CORS Headers Consistency', () => {
    it('should include CORS headers on all response types', () => {
      const responses = [
        successResponse(200, {}),
        errorResponse(404, 'NOT_FOUND', 'Not found'),
        errorResponseFromError(new BadRequestError('test')),
        healthCheckResponse({
          status: 'healthy',
          services: { postgres: 'connected', redis: 'connected', opensearch: 'connected' },
          timestamp: new Date().toISOString(),
        }),
        noContentResponse(),
        redirectResponse('https://example.com'),
        corsResponse(),
      ]

      responses.forEach((response) => {
        expect(response.headers['Access-Control-Allow-Origin']).toBe('*')
        expect(response.headers['Access-Control-Allow-Credentials']).toBe(true)
      })
    })
  })
})

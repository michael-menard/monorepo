/**
 * Unit Tests for Response Builders
 *
 * Tests the response builder functions that create standardized API Gateway responses.
 * Focus: API contract, CORS headers, production vs dev behavior, JSON serialization.
 */

import { describe, it, expect, afterEach } from 'vitest';
import {
  successResponse,
  errorResponse,
  errorResponseFromError,
  healthCheckResponse,
  noContentResponse,
  redirectResponse,
  corsResponse,
  type HealthCheckData,
} from '../index';
import { NotFoundError, BadRequestError } from '@/core/utils/errors';

// Store original NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

describe('Response Builders', () => {
  afterEach(() => {
    // Restore original NODE_ENV
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Success Responses - successResponse()', () => {
    it('should create success response with data', () => {
      // Given: successResponse(200, { id: '123', title: 'My MOC' })
      const result = successResponse(200, { id: '123', title: 'My MOC' });

      // Then: Returns APIGatewayProxyResult with correct structure
      expect(result.statusCode).toBe(200);
      expect(result.headers['Content-Type']).toBe('application/json');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '123', title: 'My MOC' });
      expect(body.timestamp).toBeDefined();
    });

    it('should include optional message', () => {
      // Given: successResponse(201, { id: '123' }, 'Resource created')
      const result = successResponse(201, { id: '123' }, 'Resource created');

      // Then: body includes message
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Resource created');
    });

    it('should have timestamp in ISO 8601 format', () => {
      // Given: successResponse(200, {})
      const beforeTime = Date.now();
      const result = successResponse(200, {});
      const afterTime = Date.now();

      // Then: Timestamp matches ISO 8601 format and is recent
      const body = JSON.parse(result.body);
      const timestamp = new Date(body.timestamp).getTime();

      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include CORS headers', () => {
      // Given: successResponse(200, {})
      const result = successResponse(200, {});

      // Then: CORS headers are present
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);
    });
  });

  describe('Error Responses - errorResponse()', () => {
    it('should create error response with all parameters', () => {
      // Given: NODE_ENV=development
      process.env.NODE_ENV = 'development';

      // When: errorResponse(404, 'NOT_FOUND', 'Resource not found', { id: '123' })
      const result = errorResponse(404, 'NOT_FOUND', 'Resource not found', { id: '123' });

      // Then: Returns APIGatewayProxyResult with error structure
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.success).toBe(false);
      expect(body.error.type).toBe('NOT_FOUND');
      expect(body.error.message).toBe('Resource not found');
      expect(body.error.details).toEqual({ id: '123' });
      expect(body.timestamp).toBeDefined();
    });

    it('should strip details in production', () => {
      // Given: NODE_ENV=production
      process.env.NODE_ENV = 'production';

      // When: errorResponse(500, 'INTERNAL_ERROR', 'Error', { stack: '...' })
      const result = errorResponse(500, 'INTERNAL_ERROR', 'Error', { stack: 'sensitive data' });

      // Then: details === undefined (stripped for security)
      const body = JSON.parse(result.body);
      expect(body.error.details).toBeUndefined();
    });

    it('should include details in development', () => {
      // Given: NODE_ENV=development
      process.env.NODE_ENV = 'development';

      // When: errorResponse(400, 'BAD_REQUEST', 'Invalid', { field: 'email' })
      const result = errorResponse(400, 'BAD_REQUEST', 'Invalid', { field: 'email' });

      // Then: details are included
      const body = JSON.parse(result.body);
      expect(body.error.details).toEqual({ field: 'email' });
    });
  });

  describe('Error Response from Error Object - errorResponseFromError()', () => {
    it('should create response from ApiError', () => {
      // Given: NotFoundError('MOC not found', { mocId: '123' })
      process.env.NODE_ENV = 'development';
      const error = new NotFoundError('MOC not found', { mocId: '123' });

      // When: errorResponseFromError(error) is called
      const result = errorResponseFromError(error);

      // Then: Returns error response with correct properties
      expect(result.statusCode).toBe(404);

      const body = JSON.parse(result.body);
      expect(body.error.type).toBe('NOT_FOUND');
      expect(body.error.message).toBe('MOC not found');
      expect(body.error.details).toEqual({ mocId: '123' });
    });

    it('should wrap standard Error', () => {
      // Given: Standard Error('Unexpected failure')
      const error = new Error('Unexpected failure');

      // When: errorResponseFromError(error) is called
      const result = errorResponseFromError(error);

      // Then: Returns 500 response with wrapped error
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.error.type).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('Unexpected failure');
    });

    it('should wrap unknown error', () => {
      // Given: String 'Something broke'
      const error = 'Something broke';

      // When: errorResponseFromError(value) is called
      const result = errorResponseFromError(error);

      // Then: Returns 500 response with generic message
      expect(result.statusCode).toBe(500);

      const body = JSON.parse(result.body);
      expect(body.error.type).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('An unexpected error occurred');
    });
  });

  describe('Health Check Response - healthCheckResponse()', () => {
    it('should return 200 when healthy', () => {
      // Given: HealthCheckData with status='healthy'
      const data: HealthCheckData = {
        status: 'healthy',
        services: {
          postgres: 'connected',
          redis: 'connected',
          opensearch: 'connected',
        },
        timestamp: new Date().toISOString(),
      };

      // When: healthCheckResponse(data) is called
      const result = healthCheckResponse(data);

      // Then: Returns success response with 200
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.data.status).toBe('healthy');
      expect(body.message).toBe('System status: healthy');
    });

    it('should return 200 when degraded', () => {
      // Given: HealthCheckData with status='degraded'
      const data: HealthCheckData = {
        status: 'degraded',
        services: {
          postgres: 'connected',
          redis: 'disconnected',
          opensearch: 'connected',
        },
        timestamp: new Date().toISOString(),
      };

      // When: healthCheckResponse(data) is called
      const result = healthCheckResponse(data);

      // Then: Returns 200 (still returns 200 for degraded)
      expect(result.statusCode).toBe(200);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('System status: degraded');
    });

    it('should return 503 when unhealthy', () => {
      // Given: HealthCheckData with status='unhealthy'
      const data: HealthCheckData = {
        status: 'unhealthy',
        services: {
          postgres: 'error',
          redis: 'error',
          opensearch: 'error',
        },
        timestamp: new Date().toISOString(),
      };

      // When: healthCheckResponse(data) is called
      const result = healthCheckResponse(data);

      // Then: Returns 503 (Service Unavailable)
      expect(result.statusCode).toBe(503);

      const body = JSON.parse(result.body);
      expect(body.message).toBe('System status: unhealthy');
    });
  });

  describe('Special Responses', () => {
    it('should create noContentResponse() for deletes', () => {
      // Given: DELETE operation succeeded
      // When: noContentResponse() is called
      const result = noContentResponse();

      // Then: Returns 204 with empty body and CORS headers
      expect(result.statusCode).toBe(204);
      expect(result.body).toBe('');
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);
    });

    it('should create redirectResponse() for presigned URLs', () => {
      // Given: redirectResponse('https://s3.amazonaws.com/bucket/key')
      const url = 'https://s3.amazonaws.com/bucket/key';

      // When: Called
      const result = redirectResponse(url);

      // Then: Returns 302 with Location header
      expect(result.statusCode).toBe(302);
      expect(result.headers.Location).toBe(url);
      expect(result.body).toBe('');
    });

    it('should create corsResponse() for OPTIONS preflight', () => {
      // Given: corsResponse() is called
      const result = corsResponse();

      // Then: Returns 200 with CORS headers
      expect(result.statusCode).toBe(200);
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers['Access-Control-Allow-Methods']).toBe(
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      );
      expect(result.headers['Access-Control-Allow-Headers']).toBe(
        'Content-Type, Authorization, X-Requested-With'
      );
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true);
      expect(result.headers['Access-Control-Max-Age']).toBe('86400');
      expect(result.body).toBe('');
    });
  });

  describe('Response Body Validation', () => {
    it('should produce valid JSON for all response builders', () => {
      // Given: Various response builders
      const responses = [
        successResponse(200, { test: 'data' }),
        errorResponse(400, 'BAD_REQUEST', 'Error'),
        healthCheckResponse({
          status: 'healthy',
          services: { postgres: 'connected', redis: 'connected', opensearch: 'connected' },
          timestamp: new Date().toISOString(),
        }),
      ];

      // When: Parsing response bodies
      // Then: JSON.parse does not throw
      responses.forEach((response) => {
        expect(() => JSON.parse(response.body)).not.toThrow();
      });
    });

    it('should have expected structure for success responses', () => {
      // Given: Any success response
      const result = successResponse(200, { id: '123' });

      // When: Parsing body
      const body = JSON.parse(result.body);

      // Then: Has expected keys
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('timestamp');
      expect(body.success).toBe(true);
    });

    it('should have expected structure for error responses', () => {
      // Given: Any error response
      const result = errorResponse(404, 'NOT_FOUND', 'Not found');

      // When: Parsing body
      const body = JSON.parse(result.body);

      // Then: Has expected keys
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('timestamp');
      expect(body.success).toBe(false);
      expect(body.error).toHaveProperty('type');
      expect(body.error).toHaveProperty('message');
    });
  });

  describe('CORS Headers Consistency', () => {
    it('should include CORS headers on all response types', () => {
      // Given: All response builder functions
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
      ];

      // When: Checking headers
      // Then: All have Access-Control-Allow-Origin
      responses.forEach((response) => {
        expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(response.headers['Access-Control-Allow-Credentials']).toBe(true);
      });
    });
  });
});

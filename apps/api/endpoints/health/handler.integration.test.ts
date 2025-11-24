/**
 * Health Check Lambda Integration Tests
 *
 * Tests the health check Lambda handler with mocked dependencies.
 * Verifies proper integration between handler, service tests, and response builders.
 *
 * NOTE: Redis has been removed to reduce costs. Tests updated to reflect PostgreSQL + OpenSearch only.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock all external dependencies
vi.mock('@/lib/db/client')
vi.mock('@/lib/search/opensearch-client')

describe('Health Check Lambda Integration', () => {
  beforeEach(() => {
    process.env.STAGE = 'dev'
    process.env.npm_package_version = '1.0.0-test'
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Healthy System', () => {
    it('should return 200 when all services are healthy', async () => {
      // Given: All services are connected
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockResolvedValue(true)
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(true)

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      const result = await handler({
        requestContext: { requestId: 'test-123' },
      })

      // Then: Returns 200 with healthy status
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(true)
      expect(body.data.status).toBe('healthy')
      expect(body.data.services).toEqual({
        postgres: 'connected',
        opensearch: 'connected',
      })
      expect(body.data.timestamp).toBeDefined()
      expect(body.data.version).toBe('1.0.0-test')
      expect(body.message).toBe('System status: healthy')
    })

    it('should call all service tests in parallel', async () => {
      // Given: All services are connected
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockResolvedValue(true)
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(true)

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      await handler({ requestContext: { requestId: 'test-123' } })

      // Then: All service tests are called
      expect(dbClient.testConnection).toHaveBeenCalled()
      expect(opensearch.testOpenSearchConnection).toHaveBeenCalled()
    })
  })

  describe('Degraded System', () => {
    it('should return 200 with degraded status when OpenSearch is down', async () => {
      // Given: OpenSearch is down, PostgreSQL is up
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockResolvedValue(true)
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(false)

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      const result = await handler({ requestContext: { requestId: 'test-123' } })

      // Then: Returns 200 with degraded status
      expect(result.statusCode).toBe(200)

      const body = JSON.parse(result.body)
      expect(body.data.status).toBe('degraded')
      expect(body.data.services).toEqual({
        postgres: 'connected',
        opensearch: 'disconnected',
      })
      expect(body.message).toBe('System status: degraded')
    })
  })

  describe('Unhealthy System', () => {
    it('should return 503 when PostgreSQL is down', async () => {
      // Given: PostgreSQL is down (critical service)
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockResolvedValue(false)
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(true)

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      const result = await handler({ requestContext: { requestId: 'test-123' } })

      // Then: Returns 503 Service Unavailable
      expect(result.statusCode).toBe(503)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('SERVICE_UNAVAILABLE')
      expect(body.error.message).toBe('Database connection failed')
    })

    it('should return 503 when all services are down', async () => {
      // Given: All services are down
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockResolvedValue(false)
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(false)

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      const result = await handler({ requestContext: { requestId: 'test-123' } })

      // Then: Returns 503 Service Unavailable
      expect(result.statusCode).toBe(503)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('SERVICE_UNAVAILABLE')
    })
  })

  describe('Error Handling', () => {
    it('should handle service test exceptions', async () => {
      // Given: Service test throws exception
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockRejectedValue(new Error('Connection timeout'))
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(true)

      // Suppress console.error for this test
      vi.spyOn(console, 'error').mockImplementation(() => {})

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      const result = await handler({ requestContext: { requestId: 'test-123' } })

      // Then: Returns 500 Internal Server Error
      expect(result.statusCode).toBe(500)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('INTERNAL_ERROR')
    })

    it('should handle unexpected exceptions gracefully', async () => {
      // Given: Handler throws unexpected error
      const dbClient = await import('@/lib/db/client')

      // Mock testConnection to throw a non-ApiError
      vi.mocked(dbClient.testConnection).mockImplementation(() => {
        throw new Error('Unexpected error')
      })

      // Suppress console.error for this test
      vi.spyOn(console, 'error').mockImplementation(() => {})

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      const result = await handler({ requestContext: { requestId: 'test-123' } })

      // Then: Returns 500 with wrapped error
      expect(result.statusCode).toBe(500)

      const body = JSON.parse(result.body)
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('INTERNAL_ERROR')
    })
  })

  describe('Response Format', () => {
    it('should include CORS headers', async () => {
      // Given: Healthy system
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockResolvedValue(true)
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(true)

      // When: Health check is invoked
      const { handler } = await import('../../../../health/index')
      const result = await handler({ requestContext: { requestId: 'test-123' } })

      // Then: CORS headers are present
      expect(result.headers['Access-Control-Allow-Origin']).toBe('*')
      expect(result.headers['Access-Control-Allow-Credentials']).toBe(true)
    })

    it('should include timestamp in response', async () => {
      // Given: Healthy system
      const dbClient = await import('@/lib/db/client')
      const opensearch = await import('@/lib/search/opensearch-client')

      vi.mocked(dbClient.testConnection).mockResolvedValue(true)
      vi.mocked(opensearch.testOpenSearchConnection).mockResolvedValue(true)

      // When: Health check is invoked
      const beforeTime = Date.now()
      const { handler } = await import('../../../../health/index')
      const result = await handler({ requestContext: { requestId: 'test-123' } })
      const afterTime = Date.now()

      // Then: Response includes recent timestamp
      const body = JSON.parse(result.body)
      const responseTime = new Date(body.data.timestamp).getTime()

      expect(responseTime).toBeGreaterThanOrEqual(beforeTime)
      expect(responseTime).toBeLessThanOrEqual(afterTime)
    })
  })
})

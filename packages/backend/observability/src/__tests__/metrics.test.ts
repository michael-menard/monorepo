import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMetricsRegistry, MetricsConfigSchema } from '../metrics/index.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('MetricsConfigSchema', () => {
    it('should validate a complete config', () => {
      const config = {
        prefix: 'myapp',
        defaultLabels: { environment: 'test' },
        collectDefaultMetrics: true,
        collectInterval: 10000,
        enabled: true,
      }

      const result = MetricsConfigSchema.parse(config)
      expect(result).toEqual(config)
    })

    it('should apply defaults for optional fields', () => {
      const config = {}

      const result = MetricsConfigSchema.parse(config)
      expect(result.prefix).toBe('app')
      expect(result.collectDefaultMetrics).toBe(true)
      expect(result.collectInterval).toBe(10000)
      expect(result.enabled).toBe(true)
    })
  })

  describe('createMetricsRegistry', () => {
    it('should create a registry with all collectors', () => {
      const collectors = createMetricsRegistry({ prefix: 'test' })

      expect(collectors.registry).toBeDefined()
      expect(collectors.httpRequests).toBeDefined()
      expect(collectors.httpDuration).toBeDefined()
      expect(collectors.httpActiveConnections).toBeDefined()
      expect(collectors.circuitBreakerState).toBeDefined()
      expect(collectors.circuitBreakerEvents).toBeDefined()
      expect(collectors.dbPoolConnections).toBeDefined()
      expect(collectors.dbQueryDuration).toBeDefined()
    })

    it('should create no-op collectors when disabled', () => {
      const collectors = createMetricsRegistry({
        prefix: 'test',
        enabled: false,
      })

      // No-op collectors should not throw when used
      expect(() => collectors.httpRequests.inc({ method: 'GET', route: '/', status: '200' })).not.toThrow()
      expect(() => collectors.httpDuration.observe({ method: 'GET', route: '/' }, 0.5)).not.toThrow()
    })

    it('should allow incrementing counters', () => {
      const collectors = createMetricsRegistry({ prefix: 'test' })

      // Should not throw
      expect(() => {
        collectors.httpRequests.inc({ method: 'GET', route: '/', status: '200' })
      }).not.toThrow()
    })

    it('should allow observing histograms', () => {
      const collectors = createMetricsRegistry({ prefix: 'test' })

      // Should not throw
      expect(() => {
        collectors.httpDuration.observe({ method: 'GET', route: '/' }, 0.5)
      }).not.toThrow()
    })

    it('should allow setting gauges', () => {
      const collectors = createMetricsRegistry({ prefix: 'test' })

      // Should not throw
      expect(() => {
        collectors.httpActiveConnections.inc()
        collectors.httpActiveConnections.dec()
      }).not.toThrow()
    })
  })
})

/**
 * Enhanced Connection Warming Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ConnectionWarmer, DEFAULT_WARMING_CONFIG } from '../retry/connection-warming'

// Mock the ServerlessApiClient
const mockGet = vi.fn()
vi.mock('../client/serverless-client', () => ({
  ServerlessApiClient: vi.fn().mockImplementation(() => ({
    get: mockGet,
  })),
}))

// Mock the config
vi.mock('../config/environments', () => ({
  getServerlessApiConfig: vi.fn().mockReturnValue({
    connectionWarmingEnabled: true,
    timeout: 5000,
    retryAttempts: 3,
  }),
}))

describe('Enhanced Connection Warming', () => {
  let warmer: ConnectionWarmer

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockGet.mockClear()

    // Create warmer with test config
    warmer = new ConnectionWarmer({
      ...DEFAULT_WARMING_CONFIG,
      enabled: false, // Start disabled to avoid automatic warming
      interval: 1000,
      endpoints: ['/health', '/api/test'],
      priorityEndpoints: ['/health'],
      adaptiveWarming: true,
    })
  })

  afterEach(() => {
    warmer.stop()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('Basic Warming', () => {
    it('should initialize with correct configuration', () => {
      expect(warmer).toBeDefined()

      const stats = warmer.getStats()
      expect(stats.totalRequests).toBe(0)
      expect(stats.endpointStats).toHaveProperty('/health')
      expect(stats.endpointStats).toHaveProperty('/api/test')
    })

    it('should warm endpoints manually', async () => {
      mockGet.mockResolvedValue({ data: 'ok' })

      // Enable and start warming
      warmer.updateConfig({ enabled: true })
      warmer.start()

      // Wait for initial warming
      await vi.advanceTimersByTimeAsync(100)

      expect(mockGet).toHaveBeenCalledWith('/health', expect.any(Object))
      expect(mockGet).toHaveBeenCalledWith('/api/test', expect.any(Object))
    })

    it('should track basic statistics', async () => {
      mockGet.mockResolvedValue({ data: 'ok' })

      // Manually trigger warming to test stats
      await (warmer as any).warmConnections()

      const stats = warmer.getStats()
      expect(stats.totalRequests).toBeGreaterThan(0)
      expect(stats.successfulRequests).toBeGreaterThan(0)
    })
  })

  describe('Adaptive Warming', () => {
    it('should track successful requests', async () => {
      mockGet.mockResolvedValue({ data: 'ok' })

      // Manually trigger warming
      await (warmer as any).warmConnections()

      const stats = warmer.getStats()
      expect(stats.successfulRequests).toBeGreaterThan(0)
      expect(stats.consecutiveFailures).toBe(0)
    })

    it('should track failed requests', async () => {
      mockGet.mockRejectedValue(new Error('Service unavailable'))

      // Manually trigger warming
      await (warmer as any).warmConnections()

      const stats = warmer.getStats()
      expect(stats.failedRequests).toBeGreaterThan(0)
      expect(stats.consecutiveFailures).toBeGreaterThan(0)
    })

    it('should track per-endpoint statistics', async () => {
      mockGet
        .mockResolvedValueOnce({ data: 'ok' }) // /health success
        .mockRejectedValueOnce(new Error('fail')) // /api/test failure

      // Manually trigger warming
      await (warmer as any).warmConnections()

      const stats = warmer.getStats()

      // Should have tracked both endpoints
      expect(stats.endpointStats['/health']).toBeDefined()
      expect(stats.endpointStats['/api/test']).toBeDefined()
      expect(stats.totalRequests).toBe(2)
    })
  })

  describe('Health Check', () => {
    it('should perform health check on configured endpoint', async () => {
      const warmerWithHealthCheck = new ConnectionWarmer({
        ...DEFAULT_WARMING_CONFIG,
        healthCheckEndpoint: '/health',
        enabled: false,
      })

      mockGet.mockResolvedValue({ data: 'healthy' })

      const result = await warmerWithHealthCheck.performHealthCheck()

      expect(result.healthy).toBe(true)
      expect(result.responseTime).toBeGreaterThan(0)
    })

    it('should handle health check failures', async () => {
      const warmerWithHealthCheck = new ConnectionWarmer({
        ...DEFAULT_WARMING_CONFIG,
        healthCheckEndpoint: '/health',
        enabled: false,
      })

      mockGet.mockRejectedValue(new Error('Service down'))

      const result = await warmerWithHealthCheck.performHealthCheck()

      expect(result.healthy).toBe(false)
      expect(result.error).toBe('Service down')
      expect(result.responseTime).toBeGreaterThan(0)
    })

    it('should return healthy when no health check endpoint configured', async () => {
      const warmerNoHealthCheck = new ConnectionWarmer({
        ...DEFAULT_WARMING_CONFIG,
        healthCheckEndpoint: undefined,
        enabled: false,
      })

      const result = await warmerNoHealthCheck.performHealthCheck()

      expect(result.healthy).toBe(true)
      expect(result.responseTime).toBe(0)
    })
  })

  describe('Configuration Updates', () => {
    it('should update configuration', () => {
      const initialConfig = (warmer as any).config

      warmer.updateConfig({ interval: 2000 })

      const updatedConfig = (warmer as any).config
      expect(updatedConfig.interval).toBe(2000)
      expect(updatedConfig.interval).not.toBe(initialConfig.interval)
    })

    it('should handle configuration changes', () => {
      expect(() => {
        warmer.updateConfig({ maxConcurrent: 5 })
      }).not.toThrow()

      const config = (warmer as any).config
      expect(config.maxConcurrent).toBe(5)
    })
  })

  describe('Basic Functionality', () => {
    it('should start and stop without errors', () => {
      expect(() => {
        warmer.start()
        warmer.stop()
      }).not.toThrow()
    })

    it('should handle multiple start/stop calls', () => {
      expect(() => {
        warmer.start()
        warmer.start() // Should not cause issues
        warmer.stop()
        warmer.stop() // Should not cause issues
      }).not.toThrow()
    })

    it('should provide stats interface', () => {
      const stats = warmer.getStats()

      expect(stats).toHaveProperty('totalRequests')
      expect(stats).toHaveProperty('successfulRequests')
      expect(stats).toHaveProperty('failedRequests')
      expect(stats).toHaveProperty('endpointStats')
      expect(stats).toHaveProperty('adaptiveInterval')
    })
  })
})

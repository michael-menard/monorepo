import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { performanceMonitor, trackEvent, trackInteraction, trackPerformanceMetric } from '../services/performance'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
  mark: vi.fn(),
  measure: vi.fn(),
}

const mockPerformanceObserver = vi.fn()
mockPerformanceObserver.mockImplementation((callback) => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}))

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
})

Object.defineProperty(window, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
})

// Mock console
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    process.env.NODE_ENV = 'development'
    
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        href: 'http://localhost:3000/test',
        pathname: '/test',
      },
      writable: true,
    })
    
    // Mock navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Test Browser)',
      writable: true,
    })
  })

  afterEach(() => {
    consoleSpy.mockRestore()
    consoleErrorSpy.mockRestore()
  })

  describe('PerformanceMonitor class', () => {
    it('should initialize with a session ID', () => {
      const monitor = performanceMonitor
      expect(monitor.getAnalytics().sessionId).toBeDefined()
      expect(typeof monitor.getAnalytics().sessionId).toBe('string')
    })

    it('should track performance metrics', () => {
      const monitor = performanceMonitor
      monitor.trackPerformanceMetric('test_metric', 150)
      
      const analytics = monitor.getAnalytics()
      expect(analytics.performance).toHaveLength(1)
      expect(analytics.performance[0].name).toBe('test_metric')
      expect(analytics.performance[0].value).toBe(150)
      expect(analytics.performance[0].rating).toBe('good')
    })

    it('should rate performance metrics correctly', () => {
      const monitor = performanceMonitor
      
      // Clear previous metrics
      monitor.getAnalytics().performance.length = 0
      
      // Test good rating
      monitor.trackPerformanceMetric('FCP', 1000)
      expect(monitor.getAnalytics().performance[0].rating).toBe('good')
      
      // Test needs-improvement rating
      monitor.trackPerformanceMetric('LCP', 3000)
      expect(monitor.getAnalytics().performance[1].rating).toBe('needs-improvement')
      
      // Test poor rating
      monitor.trackPerformanceMetric('CLS', 0.3)
      expect(monitor.getAnalytics().performance[2].rating).toBe('poor')
    })

    it('should track user interactions', () => {
      const monitor = performanceMonitor
      monitor.trackInteraction('click', 'button#submit')
      
      const analytics = monitor.getAnalytics()
      expect(analytics.interactions).toHaveLength(1)
      expect(analytics.interactions[0].type).toBe('click')
      expect(analytics.interactions[0].target).toBe('button#submit')
    })

    it('should track custom events', () => {
      const monitor = performanceMonitor
      monitor.trackEvent('user_login', { userId: '123' })
      
      // In development, should log to console
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Performance Analytics] custom:',
        expect.objectContaining({
          type: 'custom',
          data: { eventName: 'user_login', data: { userId: '123' } },
        })
      )
    })

    it('should generate performance summary', () => {
      const monitor = performanceMonitor
      
      // Clear previous metrics
      monitor.getAnalytics().performance.length = 0
      
      // Add some test metrics
      monitor.trackPerformanceMetric('FCP', 1000)
      monitor.trackPerformanceMetric('FCP', 1500)
      monitor.trackPerformanceMetric('LCP', 2000)
      
      const summary = monitor.getPerformanceSummary()
      
      expect(summary.FCP).toBeDefined()
      expect(summary.FCP.count).toBe(2)
      expect(summary.FCP.avg).toBe(1250)
      expect(summary.FCP.min).toBe(1000)
      expect(summary.FCP.max).toBe(1500)
      
      expect(summary.LCP).toBeDefined()
      expect(summary.LCP.count).toBe(1)
      expect(summary.LCP.avg).toBe(2000)
    })
  })

  describe('Convenience functions', () => {
    it('should track performance metrics via convenience function', () => {
      trackPerformanceMetric('convenience_test', 200)
      
      const analytics = performanceMonitor.getAnalytics()
      const metric = analytics.performance.find(m => m.name === 'convenience_test')
      expect(metric).toBeDefined()
      expect(metric?.value).toBe(200)
    })

    it('should track interactions via convenience function', () => {
      trackInteraction('submit', 'form#login')
      
      const analytics = performanceMonitor.getAnalytics()
      const interaction = analytics.interactions.find(i => i.type === 'submit')
      expect(interaction).toBeDefined()
      expect(interaction?.target).toBe('form#login')
    })

    it('should track events via convenience function', () => {
      trackEvent('test_event', { test: true })
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Performance Analytics] custom:',
        expect.objectContaining({
          type: 'custom',
          data: { eventName: 'test_event', data: { test: true } },
        })
      )
    })
  })

  describe('Analytics sending', () => {
    it('should log analytics in development mode', () => {
      process.env.NODE_ENV = 'development'
      
      trackEvent('dev_test', { test: true })
      
      expect(consoleSpy).toHaveBeenCalled()
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should send analytics to endpoint in production mode', async () => {
      process.env.NODE_ENV = 'production'
      mockFetch.mockResolvedValue({ ok: true })
      
      await trackEvent('prod_test', { test: true })
      
      expect(mockFetch).toHaveBeenCalledWith('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('prod_test'),
      })
    })

    it('should handle analytics sending errors gracefully', async () => {
      process.env.NODE_ENV = 'production'
      mockFetch.mockRejectedValue(new Error('Network error'))
      
      await trackEvent('error_test', { test: true })
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to send analytics:',
        expect.any(Error)
      )
    })
  })

  describe('Schema validation', () => {
    it('should validate performance metric schema', async () => {
      const { PerformanceMetricSchema } = await import('../services/performance')
      
      const validMetric = {
        name: 'test',
        value: 100,
        rating: 'good' as const,
        timestamp: Date.now(),
        url: 'http://localhost:3000',
      }
      
      expect(() => PerformanceMetricSchema.parse(validMetric)).not.toThrow()
    })

    it('should reject invalid performance metric schema', async () => {
      const { PerformanceMetricSchema } = await import('../services/performance')
      
      const invalidMetric = {
        name: 'test',
        value: 'not a number',
        rating: 'invalid',
        timestamp: 'not a number',
        url: 'http://localhost:3000',
      }
      
      expect(() => PerformanceMetricSchema.parse(invalidMetric)).toThrow()
    })
  })
}) 
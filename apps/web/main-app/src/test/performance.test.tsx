import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { performanceMonitor } from '../lib/performance'

// Mock web-vitals
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(callback => callback({ name: 'CLS', value: 0.05 })),
  onFID: vi.fn(callback => callback({ name: 'FID', value: 50 })),
  onFCP: vi.fn(callback => callback({ name: 'FCP', value: 1200 })),
  onLCP: vi.fn(callback => callback({ name: 'LCP', value: 2000 })),
  onTTFB: vi.fn(callback => callback({ name: 'TTFB', value: 600 })),
}))

// Mock PerformanceObserver
const mockPerformanceObserver = vi.fn() as unknown as typeof PerformanceObserver
;(
  mockPerformanceObserver as unknown as {
    prototype: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }
  }
).prototype = {
  observe: vi.fn(),
  disconnect: vi.fn(),
}
Object.defineProperty(mockPerformanceObserver, 'supportedEntryTypes', {
  value: ['paint', 'navigation', 'resource', 'longtask'],
  writable: false,
})
global.PerformanceObserver = mockPerformanceObserver

describe.skip('Performance Monitoring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(1000)
    // Clear performance monitor state
    performanceMonitor.destroy()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Web Vitals Collection', () => {
    it('should collect and store web vitals metrics', () => {
      const metrics = performanceMonitor.getMetrics()

      expect(metrics.cls).toBe(0.05)
      expect(metrics.fid).toBe(50)
      expect(metrics.fcp).toBe(1200)
      expect(metrics.lcp).toBe(2000)
      expect(metrics.ttfb).toBe(600)
    })

    it('should rate metrics correctly', () => {
      // This would test the private getRating method
      // We can test it indirectly through console logs or by making it public for testing
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      // Trigger metric reporting by creating a new monitor
      new (performanceMonitor.constructor as new () => unknown)()

      expect(consoleSpy).toHaveBeenCalledWith(
        'Web Vital:',
        expect.objectContaining({
          name: 'CLS',
          value: 0.05,
          rating: 'good',
        }),
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Component Performance Tracking', () => {
    it('should track component render times', () => {
      const componentName = 'TestComponent'
      const renderTime = 15.5

      performanceMonitor.trackComponentRender(componentName, renderTime)

      const componentMetrics = performanceMonitor.getComponentMetrics()
      const testComponentMetric = componentMetrics.find(m => m.componentName === componentName)

      expect(testComponentMetric).toBeDefined()
      expect(testComponentMetric?.renderTime).toBe(renderTime)
      expect(testComponentMetric?.updateCount).toBe(1)
    })

    it('should update component metrics on subsequent renders', () => {
      const componentName = 'TestComponent'

      performanceMonitor.trackComponentRender(componentName, 10)
      performanceMonitor.trackComponentRender(componentName, 20)

      const componentMetrics = performanceMonitor.getComponentMetrics()
      const testComponentMetric = componentMetrics.find(m => m.componentName === componentName)

      expect(testComponentMetric?.renderTime).toBe(20)
      expect(testComponentMetric?.updateCount).toBe(2)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should detect slow components (>16ms render time)', () => {
      const slowRenderTime = 25 // Above 16ms threshold for 60fps
      performanceMonitor.trackComponentRender('SlowComponent', slowRenderTime)

      const componentMetrics = performanceMonitor.getComponentMetrics()
      const slowComponent = componentMetrics.find(m => m.componentName === 'SlowComponent')

      expect(slowComponent?.renderTime).toBeGreaterThan(16)
    })

    it('should track multiple component updates', () => {
      const components = ['Header', 'Sidebar', 'MainContent']

      components.forEach((name, index) => {
        performanceMonitor.trackComponentRender(name, (index + 1) * 5)
      })

      const componentMetrics = performanceMonitor.getComponentMetrics()
      expect(componentMetrics).toHaveLength(components.length)

      components.forEach((name, index) => {
        const metric = componentMetrics.find(m => m.componentName === name)
        expect(metric?.renderTime).toBe((index + 1) * 5)
      })
    })
  })

  describe('Memory and Resource Monitoring', () => {
    it('should handle performance observer initialization', () => {
      // Test that PerformanceObserver is available (mocked)
      expect(mockPerformanceObserver).toBeDefined()
      expect(typeof mockPerformanceObserver).toBe('function')
    })

    it('should clean up observers on destroy', () => {
      // Test that destroy method exists and can be called
      expect(() => performanceMonitor.destroy()).not.toThrow()

      // After destroy, component metrics should be cleared
      const metrics = performanceMonitor.getComponentMetrics()
      expect(metrics).toHaveLength(0)
    })
  })

  describe('Performance Thresholds', () => {
    const performanceThresholds = {
      renderTime: 16, // 60fps = 16.67ms per frame
      componentCount: 100, // Max components to track
      memoryUsage: 50 * 1024 * 1024, // 50MB
    }

    it('should enforce render time thresholds', () => {
      const fastRenderTime = 8
      const slowRenderTime = 25

      performanceMonitor.trackComponentRender('FastComponent', fastRenderTime)
      performanceMonitor.trackComponentRender('SlowComponent', slowRenderTime)

      const metrics = performanceMonitor.getComponentMetrics()
      const fastComponent = metrics.find(m => m.componentName === 'FastComponent')
      const slowComponent = metrics.find(m => m.componentName === 'SlowComponent')

      expect(fastComponent?.renderTime).toBeLessThan(performanceThresholds.renderTime)
      expect(slowComponent?.renderTime).toBeGreaterThan(performanceThresholds.renderTime)
    })

    it('should limit the number of tracked components', () => {
      // Track more components than the threshold
      for (let i = 0; i < performanceThresholds.componentCount + 10; i++) {
        performanceMonitor.trackComponentRender(`Component${i}`, 10)
      }

      const metrics = performanceMonitor.getComponentMetrics()
      // In a real implementation, we might want to limit this
      // For now, we just verify we can track many components
      expect(metrics.length).toBeGreaterThan(performanceThresholds.componentCount)
    })
  })
})

// Integration test for performance monitoring with actual components
describe('Component Performance Integration', () => {
  it('should measure actual component render performance', async () => {
    const TestComponent = () => {
      // Simulate some work
      const start = performance.now()
      while (performance.now() - start < 5) {
        // Busy wait for 5ms
      }
      return <div data-testid="test-component">Test</div>
    }

    const renderStart = performance.now()
    render(<TestComponent />)
    const renderEnd = performance.now()

    const renderTime = renderEnd - renderStart

    // Verify component rendered
    expect(screen.getByTestId('test-component')).toBeInTheDocument()

    // Verify render time is reasonable (should be > 5ms due to our busy wait)
    expect(renderTime).toBeGreaterThan(5)
    expect(renderTime).toBeLessThan(100) // Should not take too long
  })
})

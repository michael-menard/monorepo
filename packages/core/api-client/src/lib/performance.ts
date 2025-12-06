/**
 * Performance Monitoring Library
 * Lightweight performance tracking for serverless applications
 */

export interface PerformanceMetric {
  id: string
  startTime: number
  endTime?: number
  duration?: number
  type: 'component' | 'api' | 'query' | 'mutation'
  metadata?: Record<string, any>
}

export interface PerformanceSummary {
  totalMetrics: number
  averageDuration: number
  slowOperations: number
  fastOperations: number
  recentMetrics: PerformanceMetric[]
}

/**
 * Simple performance monitor for tracking operations
 */
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>()
  private maxMetrics = 1000 // Keep last 1000 metrics

  /**
   * Track component render or operation
   */
  trackComponentRender(id: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      id,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
      type: 'component',
      metadata,
    }

    this.addMetric(metric)
  }

  /**
   * Track API call performance
   */
  trackApiCall(id: string, duration: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      id,
      startTime: performance.now() - duration,
      endTime: performance.now(),
      duration,
      type: 'api',
      metadata,
    }

    this.addMetric(metric)
  }

  /**
   * Start tracking an operation
   */
  startTracking(id: string, type: PerformanceMetric['type'] = 'component'): void {
    const metric: PerformanceMetric = {
      id,
      startTime: performance.now(),
      type,
    }

    this.metrics.set(id, metric)
  }

  /**
   * End tracking an operation
   */
  endTracking(id: string, metadata?: Record<string, any>): PerformanceMetric | null {
    const metric = this.metrics.get(id)
    if (!metric) {
      return null
    }

    const endTime = performance.now()
    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration: endTime - metric.startTime,
      metadata,
    }

    this.addMetric(completedMetric)
    this.metrics.delete(id)

    return completedMetric
  }

  /**
   * Get performance summary
   */
  getSummary(): PerformanceSummary {
    const allMetrics = Array.from(this.metrics.values()).filter(m => m.duration !== undefined)
    const totalMetrics = allMetrics.length

    if (totalMetrics === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowOperations: 0,
        fastOperations: 0,
        recentMetrics: [],
      }
    }

    const durations = allMetrics.map(m => m.duration!).filter(d => d > 0)
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length

    const slowOperations = durations.filter(d => d > 1000).length // > 1 second
    const fastOperations = durations.filter(d => d < 100).length // < 100ms

    const recentMetrics = allMetrics
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, 10)

    return {
      totalMetrics,
      averageDuration,
      slowOperations,
      fastOperations,
      recentMetrics,
    }
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.type === type)
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear()
  }

  /**
   * Add metric to collection
   */
  private addMetric(metric: PerformanceMetric): void {
    this.metrics.set(metric.id, metric)

    // Clean up old metrics if we exceed the limit
    if (this.metrics.size > this.maxMetrics) {
      const oldestKey = this.metrics.keys().next().value
      if (oldestKey) {
        this.metrics.delete(oldestKey)
      }
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor()

/**
 * Performance decorator for functions
 */
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  id: string,
  type: PerformanceMetric['type'] = 'component',
): T {
  return ((...args: any[]) => {
    const trackingId = `${id}-${Date.now()}`
    performanceMonitor.startTracking(trackingId, type)

    try {
      const result = fn(...args)

      // Handle promises
      if (result && typeof result.then === 'function') {
        return result.finally(() => {
          performanceMonitor.endTracking(trackingId)
        })
      }

      performanceMonitor.endTracking(trackingId)
      return result
    } catch (error) {
      performanceMonitor.endTracking(trackingId, {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }) as T
}

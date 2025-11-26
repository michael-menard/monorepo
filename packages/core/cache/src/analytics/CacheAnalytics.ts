/**
 * Cache Analytics System
 *
 * Comprehensive analytics for cache performance monitoring and optimization:
 * - Real-time cache hit/miss tracking
 * - Performance metrics collection
 * - Usage pattern analysis
 * - Cache efficiency reporting
 * - Predictive analytics for optimization
 */

import { createLogger } from '@repo/logger'

const logger = createLogger('CacheAnalytics')

export interface CacheMetrics {
  hitRate: number
  missRate: number
  totalRequests: number
  totalHits: number
  totalMisses: number
  averageResponseTime: number
  cacheSize: number
  memoryUsage: number
  evictionCount: number
  prefetchCount: number
  invalidationCount: number
  errorCount: number
}

export interface CacheEvent {
  type: 'hit' | 'miss' | 'set' | 'delete' | 'evict' | 'prefetch' | 'invalidate' | 'error'
  key: string
  timestamp: number
  duration?: number
  size?: number
  reason?: string
  metadata?: Record<string, unknown>
}

export interface PerformanceInsight {
  category: 'performance' | 'efficiency' | 'usage' | 'optimization'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  recommendation: string
  impact: number // 0-100 scale
  metrics: Record<string, number>
}

export class CacheAnalytics {
  private events: CacheEvent[] = []
  private metrics: CacheMetrics = {
    hitRate: 0,
    missRate: 0,
    totalRequests: 0,
    totalHits: 0,
    totalMisses: 0,
    averageResponseTime: 0,
    cacheSize: 0,
    memoryUsage: 0,
    evictionCount: 0,
    prefetchCount: 0,
    invalidationCount: 0,
    errorCount: 0,
  }
  private responseTimes: number[] = []
  private maxEvents = 10000 // Keep last 10k events
  private reportingInterval: NodeJS.Timeout | null = null

  constructor() {
    this.startPeriodicReporting()
  }

  /**
   * Record a cache hit event
   */
  recordCacheHit(
    key: string,
    isHit: boolean,
    duration: number,
    metadata?: Record<string, unknown>,
  ): void {
    const event: CacheEvent = {
      type: isHit ? 'hit' : 'miss',
      key,
      timestamp: Date.now(),
      duration,
      metadata,
    }

    this.addEvent(event)
    this.updateMetrics(event)
  }

  /**
   * Record a cache set operation
   */
  recordCacheSet(key: string, size: number, duration: number): void {
    const event: CacheEvent = {
      type: 'set',
      key,
      timestamp: Date.now(),
      duration,
      size,
    }

    this.addEvent(event)
    this.updateMetrics(event)
  }

  /**
   * Record a cache invalidation
   */
  recordInvalidation(key: string, reason: string, dependentCount: number): void {
    const event: CacheEvent = {
      type: 'invalidate',
      key,
      timestamp: Date.now(),
      reason,
      metadata: { dependentCount },
    }

    this.addEvent(event)
    this.updateMetrics(event)
  }

  /**
   * Record a prefetch trigger
   */
  recordPrefetchTrigger(key: string, strategy: string): void {
    const event: CacheEvent = {
      type: 'prefetch',
      key,
      timestamp: Date.now(),
      metadata: { strategy },
    }

    this.addEvent(event)
    this.updateMetrics(event)
  }

  /**
   * Record a cache error
   */
  recordError(key: string, error: Error, operation: string): void {
    const event: CacheEvent = {
      type: 'error',
      key,
      timestamp: Date.now(),
      reason: error.message,
      metadata: { operation, stack: error.stack },
    }

    this.addEvent(event)
    this.updateMetrics(event)
  }

  /**
   * Get current cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  /**
   * Get recent cache events
   */
  getRecentEvents(limit = 100): CacheEvent[] {
    return this.events.slice(-limit)
  }

  /**
   * Generate performance insights
   */
  generateInsights(): PerformanceInsight[] {
    const insights: PerformanceInsight[] = []

    // Hit rate analysis
    if (this.metrics.hitRate < 0.7) {
      insights.push({
        category: 'performance',
        severity: this.metrics.hitRate < 0.5 ? 'critical' : 'high',
        title: 'Low Cache Hit Rate',
        description: `Cache hit rate is ${(this.metrics.hitRate * 100).toFixed(1)}%, indicating inefficient caching`,
        recommendation:
          'Consider increasing cache TTL, improving cache key strategies, or implementing predictive prefetching',
        impact: (1 - this.metrics.hitRate) * 100,
        metrics: { hitRate: this.metrics.hitRate, totalRequests: this.metrics.totalRequests },
      })
    }

    // Response time analysis
    if (this.metrics.averageResponseTime > 100) {
      insights.push({
        category: 'performance',
        severity: this.metrics.averageResponseTime > 500 ? 'critical' : 'medium',
        title: 'High Cache Response Time',
        description: `Average cache response time is ${this.metrics.averageResponseTime.toFixed(1)}ms`,
        recommendation:
          'Optimize cache storage mechanism, reduce data serialization overhead, or implement cache warming',
        impact: Math.min(this.metrics.averageResponseTime / 10, 100),
        metrics: { averageResponseTime: this.metrics.averageResponseTime },
      })
    }

    // Memory usage analysis
    if (this.metrics.memoryUsage > 0.8) {
      insights.push({
        category: 'efficiency',
        severity: this.metrics.memoryUsage > 0.95 ? 'critical' : 'high',
        title: 'High Memory Usage',
        description: `Cache memory usage is at ${(this.metrics.memoryUsage * 100).toFixed(1)}%`,
        recommendation:
          'Implement more aggressive eviction policies, reduce cache size, or optimize data compression',
        impact: this.metrics.memoryUsage * 100,
        metrics: { memoryUsage: this.metrics.memoryUsage, cacheSize: this.metrics.cacheSize },
      })
    }

    // Eviction rate analysis
    const evictionRate = this.metrics.evictionCount / Math.max(this.metrics.totalRequests, 1)
    if (evictionRate > 0.1) {
      insights.push({
        category: 'efficiency',
        severity: evictionRate > 0.3 ? 'high' : 'medium',
        title: 'High Cache Eviction Rate',
        description: `${(evictionRate * 100).toFixed(1)}% of cache entries are being evicted`,
        recommendation:
          'Increase cache size, optimize TTL values, or implement smarter eviction strategies',
        impact: evictionRate * 100,
        metrics: { evictionRate, evictionCount: this.metrics.evictionCount },
      })
    }

    return insights.sort((a, b) => b.impact - a.impact)
  }

  /**
   * Add event to the analytics system
   */
  private addEvent(event: CacheEvent): void {
    this.events.push(event)

    // Keep only the most recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
  }

  /**
   * Update metrics based on event
   */
  private updateMetrics(event: CacheEvent): void {
    switch (event.type) {
      case 'hit':
        this.metrics.totalRequests++
        this.metrics.totalHits++
        break
      case 'miss':
        this.metrics.totalRequests++
        this.metrics.totalMisses++
        break
      case 'invalidate':
        this.metrics.invalidationCount++
        break
      case 'prefetch':
        this.metrics.prefetchCount++
        break
      case 'error':
        this.metrics.errorCount++
        break
    }

    // Update calculated metrics
    if (this.metrics.totalRequests > 0) {
      this.metrics.hitRate = this.metrics.totalHits / this.metrics.totalRequests
      this.metrics.missRate = this.metrics.totalMisses / this.metrics.totalRequests
    }

    // Update response times
    if (event.duration !== undefined) {
      this.responseTimes.push(event.duration)
      if (this.responseTimes.length > 1000) {
        this.responseTimes = this.responseTimes.slice(-1000)
      }
      this.metrics.averageResponseTime =
        this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
    }
  }

  /**
   * Start periodic reporting
   */
  private startPeriodicReporting(): void {
    this.reportingInterval = setInterval(
      () => {
        const insights = this.generateInsights()
        if (insights.length > 0) {
          logger.info('Cache performance insights generated', undefined, {
            insightCount: insights.length,
            criticalInsights: insights.filter(i => i.severity === 'critical').length,
            metrics: this.metrics,
          })
        }
      },
      5 * 60 * 1000,
    ) // Every 5 minutes
  }

  /**
   * Stop analytics and cleanup
   */
  destroy(): void {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval)
      this.reportingInterval = null
    }
  }
}

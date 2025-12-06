/**
 * Cache Performance Tests
 *
 * Comprehensive tests for intelligent caching system performance:
 * - Cache hit/miss rate validation
 * - Performance benchmarking
 * - Memory usage monitoring
 * - Predictive analytics accuracy
 * - Cache invalidation efficiency
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { IntelligentCacheManager } from '@repo/cache/managers/IntelligentCacheManager'
import { CacheAnalytics } from '@repo/cache/analytics/CacheAnalytics'
import { PerformanceMonitor } from '@repo/cache/utils/performanceMonitor'

describe('Cache Performance Tests', () => {
  let cacheManager: IntelligentCacheManager
  let analytics: CacheAnalytics
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    cacheManager = new IntelligentCacheManager()
    analytics = new CacheAnalytics()
    performanceMonitor = new PerformanceMonitor()
  })

  afterEach(() => {
    analytics.destroy()
  })

  describe('Cache Hit Rate Performance', () => {
    it('should achieve high hit rate with repeated access patterns', async () => {
      const testData = { id: 1, name: 'Test MOC', category: 'Castle' }
      const key = 'gallery:moc:1'

      // First access - cache miss
      await cacheManager.set(key, testData)

      // Subsequent accesses - should be cache hits
      for (let i = 0; i < 10; i++) {
        const result = await cacheManager.get(key)
        expect(result).toEqual(testData)
      }

      const stats = cacheManager.getStatistics()
      const pattern = stats.usagePatterns.find(p => p.key === key)

      expect(pattern).toBeDefined()
      expect(pattern!.accessCount).toBeGreaterThan(10)
      expect(pattern!.hitRate).toBeGreaterThan(0.9) // 90%+ hit rate
    })

    it('should maintain performance under high load', async () => {
      const startTime = performance.now()
      const promises: Promise<void>[] = []

      // Simulate high concurrent load
      for (let i = 0; i < 1000; i++) {
        const key = `load-test:${i % 100}` // 100 unique keys, 10x repetition
        const data = { id: i, value: `test-data-${i}` }

        promises.push(cacheManager.set(key, data))
      }

      await Promise.all(promises)

      const endTime = performance.now()
      const duration = endTime - startTime

      // Should complete within reasonable time (adjust based on hardware)
      expect(duration).toBeLessThan(5000) // 5 seconds max

      const stats = cacheManager.getStatistics()
      expect(stats.usagePatterns.length).toBeGreaterThan(0)
    })
  })

  describe('Predictive Analytics Accuracy', () => {
    it('should generate accurate predictive insights', async () => {
      // Create predictable access pattern
      const baseKey = 'predictive-test'
      const testData = { value: 'test' }

      // Simulate regular access pattern over time
      for (let hour = 0; hour < 24; hour++) {
        const key = `${baseKey}:${hour}`
        await cacheManager.set(key, testData, { userId: 'test-user' })

        // Simulate multiple accesses during business hours
        if (hour >= 9 && hour <= 17) {
          for (let access = 0; access < 5; access++) {
            await cacheManager.get(key, 'test-user')
          }
        }
      }

      const insights = cacheManager.generatePredictiveInsights()

      expect(insights.length).toBeGreaterThan(0)

      // Check for high-confidence insights during business hours
      const businessHourInsights = insights.filter(
        insight => insight.confidence > 0.7 && insight.recommendedAction === 'prefetch',
      )

      expect(businessHourInsights.length).toBeGreaterThan(0)
    })

    it('should recommend appropriate cache actions', async () => {
      const highUsageKey = 'high-usage-item'
      const lowUsageKey = 'low-usage-item'
      const testData = { value: 'test' }

      // Create high usage pattern
      await cacheManager.set(highUsageKey, testData)
      for (let i = 0; i < 50; i++) {
        await cacheManager.get(highUsageKey)
      }

      // Create low usage pattern
      await cacheManager.set(lowUsageKey, testData)
      await cacheManager.get(lowUsageKey) // Only one access

      // Wait for pattern analysis
      await new Promise(resolve => setTimeout(resolve, 100))

      const insights = cacheManager.generatePredictiveInsights()

      const highUsageInsight = insights.find(i => i.key === highUsageKey)
      const lowUsageInsight = insights.find(i => i.key === lowUsageKey)

      if (highUsageInsight) {
        expect(['prefetch', 'extend-ttl']).toContain(highUsageInsight.recommendedAction)
      }

      if (lowUsageInsight) {
        expect(lowUsageInsight.confidence).toBeLessThan(0.8)
      }
    })
  })

  describe('Memory Usage Optimization', () => {
    it('should manage memory efficiently under pressure', async () => {
      const initialMemory = process.memoryUsage().heapUsed

      // Fill cache with large amount of data
      for (let i = 0; i < 1000; i++) {
        const key = `memory-test:${i}`
        const largeData = {
          id: i,
          data: new Array(1000).fill(`large-string-${i}`),
          metadata: {
            created: new Date().toISOString(),
            tags: new Array(50).fill(`tag-${i}`),
          },
        }

        await cacheManager.set(key, largeData)
      }

      const peakMemory = process.memoryUsage().heapUsed
      const memoryIncrease = peakMemory - initialMemory

      // Memory increase should be reasonable (adjust based on test data size)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024) // 100MB max

      // Cache should still be responsive
      const testKey = 'memory-test:500'
      const result = await cacheManager.get(testKey)
      expect(result).toBeDefined()
    })
  })

  describe('Cache Invalidation Efficiency', () => {
    it('should efficiently invalidate dependent caches', async () => {
      const parentKey = 'parent-item'
      const childKeys = ['child-1', 'child-2', 'child-3']
      const testData = { value: 'test' }

      // Set up parent-child relationships
      await cacheManager.set(parentKey, testData)

      for (const childKey of childKeys) {
        await cacheManager.set(childKey, testData, {
          dependencies: [parentKey],
        })
      }

      // Verify all items are cached
      for (const key of [parentKey, ...childKeys]) {
        const result = await cacheManager.get(key)
        expect(result).toEqual(testData)
      }

      // Invalidate parent - should cascade to children
      await cacheManager.invalidate(parentKey, 'test-invalidation')

      // Verify parent and children are invalidated
      const parentResult = await cacheManager.get(parentKey)
      expect(parentResult).toBeNull()

      for (const childKey of childKeys) {
        const childResult = await cacheManager.get(childKey)
        expect(childResult).toBeNull()
      }
    })
  })

  describe('Performance Monitoring', () => {
    it('should track operation performance accurately', async () => {
      const operations = 100
      const promises: Promise<void>[] = []

      for (let i = 0; i < operations; i++) {
        const endTimer = performanceMonitor.startOperation()

        promises.push(
          cacheManager.set(`perf-test:${i}`, { value: i }).then(() => {
            endTimer()
          }),
        )
      }

      await Promise.all(promises)

      const metrics = performanceMonitor.getMetrics()

      expect(metrics.operationCount).toBe(operations)
      expect(metrics.averageLatency).toBeGreaterThan(0)
      expect(metrics.averageLatency).toBeLessThan(100) // Should be fast
      expect(metrics.throughput).toBeGreaterThan(10) // At least 10 ops/sec
    })

    it('should detect performance anomalies', async () => {
      // Simulate slow operations
      for (let i = 0; i < 5; i++) {
        const endTimer = performanceMonitor.startOperation()

        // Simulate slow operation
        await new Promise(resolve => setTimeout(resolve, 200))

        endTimer()
      }

      const alerts = performanceMonitor.getAlerts()
      const latencyAlerts = alerts.filter(alert => alert.type === 'latency')

      expect(latencyAlerts.length).toBeGreaterThan(0)
      expect(latencyAlerts[0].severity).toBe('warning')
    })
  })

  describe('Analytics Accuracy', () => {
    it('should accurately track cache events', async () => {
      const key = 'analytics-test'
      const testData = { value: 'test' }

      // Record various cache events
      analytics.recordCacheSet(key, JSON.stringify(testData).length, 10)
      analytics.recordCacheHit(key, true, 5)
      analytics.recordCacheHit(key, false, 15)
      analytics.recordInvalidation(key, 'test', 0)

      const metrics = analytics.getMetrics()

      expect(metrics.totalRequests).toBe(2) // 2 hit/miss events
      expect(metrics.totalHits).toBe(1)
      expect(metrics.totalMisses).toBe(1)
      expect(metrics.hitRate).toBe(0.5)
      expect(metrics.invalidationCount).toBe(1)
    })

    it('should generate meaningful performance insights', async () => {
      // Simulate poor cache performance
      for (let i = 0; i < 10; i++) {
        analytics.recordCacheHit(`poor-perf:${i}`, false, 100) // All misses
      }

      const insights = analytics.generateInsights()
      const hitRateInsights = insights.filter(i => i.category === 'performance')

      expect(hitRateInsights.length).toBeGreaterThan(0)
      expect(hitRateInsights[0].severity).toBe('critical')
      expect(hitRateInsights[0].title).toContain('Hit Rate')
    })
  })
})

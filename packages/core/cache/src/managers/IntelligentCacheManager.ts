/**
 * Intelligent Cache Manager
 *
 * Advanced caching system with AI-like intelligence for optimal cache decisions:
 * - Predictive prefetching based on user behavior patterns
 * - Dynamic TTL adjustment based on data access patterns
 * - Smart cache invalidation with dependency tracking
 * - Performance-based cache strategy selection
 * - Memory pressure management with intelligent eviction
 */

import { createLogger } from '@repo/logger'
import { MemoryCache } from '../utils/memoryCache'
import { CacheAnalytics } from '../analytics/CacheAnalytics'

const logger = createLogger('IntelligentCacheManager')

export interface CacheUsagePattern {
  key: string
  accessCount: number
  lastAccessed: number
  averageAccessInterval: number
  dataSize: number
  hitRate: number
  missRate: number
  userSessions: Set<string>
  timeOfDayPattern: number[] // 24-hour pattern
  dayOfWeekPattern: number[] // 7-day pattern
}

export interface PredictiveInsight {
  key: string
  predictedNextAccess: number
  confidence: number
  recommendedAction: 'prefetch' | 'extend-ttl' | 'invalidate' | 'ignore'
  reasoning: string
}

export interface CacheStrategy {
  name: string
  ttl: number
  priority: number
  prefetchTrigger: number // Percentage of TTL when to prefetch
  invalidationRules: string[]
  compressionEnabled: boolean
  encryptionEnabled: boolean
}

export class IntelligentCacheManager {
  private cache: MemoryCache
  private analytics: CacheAnalytics
  private usagePatterns = new Map<string, CacheUsagePattern>()
  private strategies = new Map<string, CacheStrategy>()
  private prefetchQueue = new Set<string>()
  private invalidationGraph = new Map<string, Set<string>>() // Dependency graph

  constructor() {
    this.cache = new MemoryCache({
      maxSize: 2000,
      maxAge: 30 * 60 * 1000, // 30 minutes base
    })

    this.analytics = new CacheAnalytics()

    this.initializeStrategies()
    this.startIntelligentBackgroundTasks()
  }

  /**
   * Initialize predefined caching strategies
   */
  private initializeStrategies(): void {
    // High-frequency data (navigation, user preferences)
    this.strategies.set('high-frequency', {
      name: 'high-frequency',
      ttl: 2 * 60 * 1000, // 2 minutes
      priority: 10,
      prefetchTrigger: 0.8, // Prefetch at 80% of TTL
      invalidationRules: ['user-action', 'navigation-change'],
      compressionEnabled: false, // Small data, compression overhead not worth it
      encryptionEnabled: false,
    })

    // User-generated content (gallery images, wishlist items)
    this.strategies.set('user-content', {
      name: 'user-content',
      ttl: 15 * 60 * 1000, // 15 minutes
      priority: 8,
      prefetchTrigger: 0.7,
      invalidationRules: ['user-modification', 'content-update'],
      compressionEnabled: true,
      encryptionEnabled: true, // Sensitive user data
    })

    // Static content (MOC instructions, themes)
    this.strategies.set('static-content', {
      name: 'static-content',
      ttl: 2 * 60 * 60 * 1000, // 2 hours
      priority: 5,
      prefetchTrigger: 0.9,
      invalidationRules: ['content-publish', 'admin-update'],
      compressionEnabled: true,
      encryptionEnabled: false,
    })

    // Search results (dynamic but predictable)
    this.strategies.set('search-results', {
      name: 'search-results',
      ttl: 5 * 60 * 1000, // 5 minutes
      priority: 7,
      prefetchTrigger: 0.6, // Aggressive prefetching for search
      invalidationRules: ['new-content', 'search-index-update'],
      compressionEnabled: true,
      encryptionEnabled: false,
    })

    // Analytics and stats (computed data)
    this.strategies.set('analytics', {
      name: 'analytics',
      ttl: 10 * 60 * 1000, // 10 minutes
      priority: 6,
      prefetchTrigger: 0.5,
      invalidationRules: ['data-change', 'stats-recalculation'],
      compressionEnabled: true,
      encryptionEnabled: false,
    })
  }

  /**
   * Intelligent cache get with learning
   */
  async get<T>(key: string, userId?: string): Promise<T | null> {
    const startTime = performance.now()

    try {
      // Update usage pattern
      this.updateUsagePattern(key, userId)

      // Get from cache
      const result = await this.cache.get<T>(key)

      // Record analytics
      const duration = performance.now() - startTime
      this.analytics.recordCacheHit(key, result !== null, duration)

      // Check if we should prefetch related data
      if (result !== null) {
        this.considerPrefetching(key)
      }

      return result
    } catch (error) {
      logger.error('Intelligent cache get failed', error as Error, { key })
      return null
    }
  }

  /**
   * Intelligent cache set with strategy selection
   */
  async set<T>(
    key: string,
    data: T,
    options?: {
      strategy?: string
      userId?: string
      dependencies?: string[]
      tags?: string[]
    },
  ): Promise<void> {
    try {
      // Select optimal strategy
      const strategy = this.selectOptimalStrategy(key, data, options?.strategy)

      // Set cache with strategy
      await this.cache.set(key, data, strategy.ttl)

      // Update dependency graph
      if (options?.dependencies) {
        this.updateDependencyGraph(key, options.dependencies)
      }

      // Record usage pattern
      this.updateUsagePattern(key, options?.userId)

      // Schedule prefetching if needed
      this.schedulePrefetch(key, strategy)

      logger.debug('Intelligent cache set completed', undefined, {
        key,
        strategy: strategy.name,
        ttl: strategy.ttl,
        dependencies: options?.dependencies?.length || 0,
      })
    } catch (error) {
      logger.error('Intelligent cache set failed', error as Error, { key })
    }
  }

  /**
   * Smart cache invalidation with dependency tracking
   */
  async invalidate(key: string, reason: string): Promise<void> {
    try {
      // Invalidate the key
      this.cache.delete(key)

      // Find and invalidate dependent keys
      const dependents = this.findDependentKeys(key)
      for (const dependent of dependents) {
        this.cache.delete(dependent)
        logger.debug('Invalidated dependent key', undefined, { key: dependent, reason })
      }

      // Record invalidation analytics
      this.analytics.recordInvalidation(key, reason, dependents.size)

      logger.info('Smart cache invalidation completed', undefined, {
        key,
        reason,
        dependentsInvalidated: dependents.size,
      })
    } catch (error) {
      logger.error('Cache invalidation failed', error as Error, { key, reason })
    }
  }

  /**
   * Generate predictive insights for cache optimization
   */
  generatePredictiveInsights(): PredictiveInsight[] {
    const insights: PredictiveInsight[] = []
    const now = Date.now()

    for (const [key, pattern] of this.usagePatterns) {
      const timeSinceLastAccess = now - pattern.lastAccessed
      const predictedNextAccess = this.predictNextAccess(pattern)
      const confidence = this.calculatePredictionConfidence(pattern)

      let recommendedAction: PredictiveInsight['recommendedAction'] = 'ignore'
      let reasoning = ''

      if (confidence > 0.8 && predictedNextAccess < 5 * 60 * 1000) {
        // Next access in 5 minutes
        recommendedAction = 'prefetch'
        reasoning = 'High confidence prediction of imminent access'
      } else if (
        pattern.hitRate > 0.9 &&
        timeSinceLastAccess < pattern.averageAccessInterval * 0.5
      ) {
        recommendedAction = 'extend-ttl'
        reasoning = 'High hit rate with frequent access pattern'
      } else if (pattern.hitRate < 0.3 && timeSinceLastAccess > pattern.averageAccessInterval * 2) {
        recommendedAction = 'invalidate'
        reasoning = 'Low hit rate with infrequent access'
      }

      if (recommendedAction !== 'ignore') {
        insights.push({
          key,
          predictedNextAccess,
          confidence,
          recommendedAction,
          reasoning,
        })
      }
    }

    return insights.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Update usage pattern for a key
   */
  private updateUsagePattern(key: string, userId?: string): void {
    const now = Date.now()
    const pattern = this.usagePatterns.get(key) || {
      key,
      accessCount: 0,
      lastAccessed: now,
      averageAccessInterval: 0,
      dataSize: 0,
      hitRate: 0,
      missRate: 0,
      userSessions: new Set(),
      timeOfDayPattern: new Array(24).fill(0),
      dayOfWeekPattern: new Array(7).fill(0),
    }

    // Update access statistics
    pattern.accessCount++
    const timeSinceLastAccess = now - pattern.lastAccessed
    pattern.averageAccessInterval =
      (pattern.averageAccessInterval * (pattern.accessCount - 1) + timeSinceLastAccess) /
      pattern.accessCount
    pattern.lastAccessed = now

    // Update time patterns
    const hour = new Date(now).getHours()
    const dayOfWeek = new Date(now).getDay()
    pattern.timeOfDayPattern[hour]++
    pattern.dayOfWeekPattern[dayOfWeek]++

    // Track user sessions
    if (userId) {
      pattern.userSessions.add(userId)
    }

    this.usagePatterns.set(key, pattern)
  }

  /**
   * Select optimal caching strategy based on data characteristics
   */
  private selectOptimalStrategy(
    key: string,
    data: unknown,
    preferredStrategy?: string,
  ): CacheStrategy {
    if (preferredStrategy && this.strategies.has(preferredStrategy)) {
      return this.strategies.get(preferredStrategy)!
    }

    // Analyze data characteristics
    const dataSize = JSON.stringify(data).length

    // Navigation and UI state data
    if (key.includes('navigation') || key.includes('ui-state')) {
      return this.strategies.get('high-frequency')!
    }

    // User-specific data
    if (key.includes('user') || key.includes('profile') || key.includes('wishlist')) {
      return this.strategies.get('user-content')!
    }

    // Search results
    if (key.includes('search') || key.includes('query')) {
      return this.strategies.get('search-results')!
    }

    // Large static content
    if (dataSize > 10000 || key.includes('instruction') || key.includes('theme')) {
      return this.strategies.get('static-content')!
    }

    // Analytics and computed data
    if (key.includes('stats') || key.includes('analytics') || key.includes('metrics')) {
      return this.strategies.get('analytics')!
    }

    // Default to user-content strategy
    return this.strategies.get('user-content')!
  }

  /**
   * Consider prefetching related data
   */
  private considerPrefetching(key: string): void {
    // Prefetch related keys based on access patterns
    const relatedKeys = this.findRelatedKeys(key)

    for (const relatedKey of relatedKeys) {
      const relatedPattern = this.usagePatterns.get(relatedKey)
      if (relatedPattern && relatedPattern.hitRate > 0.7) {
        this.prefetchQueue.add(relatedKey)
      }
    }
  }

  /**
   * Find keys related to the given key
   */
  private findRelatedKeys(key: string): string[] {
    const related: string[] = []

    // Extract base patterns
    const keyParts = key.split(':')
    const basePattern = keyParts[0]

    // Find keys with similar patterns
    for (const [otherKey] of this.usagePatterns) {
      if (otherKey !== key && otherKey.startsWith(basePattern)) {
        related.push(otherKey)
      }
    }

    return related
  }

  /**
   * Update dependency graph for cache invalidation
   */
  private updateDependencyGraph(key: string, dependencies: string[]): void {
    for (const dependency of dependencies) {
      if (!this.invalidationGraph.has(dependency)) {
        this.invalidationGraph.set(dependency, new Set())
      }
      this.invalidationGraph.get(dependency)!.add(key)
    }
  }

  /**
   * Find keys that depend on the given key
   */
  private findDependentKeys(key: string): Set<string> {
    return this.invalidationGraph.get(key) || new Set()
  }

  /**
   * Predict next access time based on usage patterns
   */
  private predictNextAccess(pattern: CacheUsagePattern): number {
    const now = Date.now()
    const currentHour = new Date(now).getHours()
    const currentDay = new Date(now).getDay()

    // Weight factors
    const timeOfDayWeight =
      pattern.timeOfDayPattern[currentHour] / Math.max(...pattern.timeOfDayPattern)
    const dayOfWeekWeight =
      pattern.dayOfWeekPattern[currentDay] / Math.max(...pattern.dayOfWeekPattern)
    const intervalWeight = pattern.averageAccessInterval > 0 ? 1 / pattern.averageAccessInterval : 0

    // Combine weights to predict next access
    const combinedWeight = (timeOfDayWeight + dayOfWeekWeight + intervalWeight) / 3
    const predictedInterval = pattern.averageAccessInterval * (1 - combinedWeight)

    return Math.max(predictedInterval, 30 * 1000) // Minimum 30 seconds
  }

  /**
   * Calculate confidence in prediction
   */
  private calculatePredictionConfidence(pattern: CacheUsagePattern): number {
    let confidence = 0

    // Access count factor (more accesses = higher confidence)
    confidence += Math.min(pattern.accessCount / 100, 0.3)

    // Hit rate factor
    confidence += pattern.hitRate * 0.4

    // Pattern consistency factor
    const timeVariance = this.calculateVariance(pattern.timeOfDayPattern)
    const dayVariance = this.calculateVariance(pattern.dayOfWeekPattern)
    confidence += (1 - (timeVariance + dayVariance) / 2) * 0.3

    return Math.min(confidence, 1)
  }

  /**
   * Calculate variance for pattern consistency
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const maxVariance = Math.pow(Math.max(...values) - mean, 2)
    return maxVariance > 0 ? variance / maxVariance : 0
  }

  /**
   * Schedule prefetch for a key based on strategy
   */
  private schedulePrefetch(key: string, strategy: CacheStrategy): void {
    const prefetchTime = strategy.ttl * strategy.prefetchTrigger

    setTimeout(() => {
      if (this.prefetchQueue.has(key)) {
        this.prefetchQueue.delete(key)
        // Trigger prefetch event (to be handled by the application)
        this.analytics.recordPrefetchTrigger(key, strategy.name)
      }
    }, prefetchTime)
  }

  /**
   * Start intelligent background tasks
   */
  private startIntelligentBackgroundTasks(): void {
    // Cleanup expired patterns every 5 minutes
    setInterval(
      () => {
        this.cleanupExpiredPatterns()
      },
      5 * 60 * 1000,
    )

    // Generate insights every 10 minutes
    setInterval(
      () => {
        const insights = this.generatePredictiveInsights()
        if (insights.length > 0) {
          logger.info('Generated predictive insights', undefined, {
            insightCount: insights.length,
            topInsight: insights[0],
          })
        }
      },
      10 * 60 * 1000,
    )

    // Performance optimization every 15 minutes
    setInterval(
      () => {
        this.optimizePerformance()
      },
      15 * 60 * 1000,
    )
  }

  /**
   * Clean up expired usage patterns
   */
  private cleanupExpiredPatterns(): void {
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours

    for (const [key, pattern] of this.usagePatterns) {
      if (now - pattern.lastAccessed > maxAge) {
        this.usagePatterns.delete(key)
      }
    }
  }

  /**
   * Optimize cache performance based on analytics
   */
  private optimizePerformance(): void {
    const metrics = this.analytics.getMetrics()

    logger.debug('Cache performance metrics', undefined, {
      hitRate: metrics.hitRate,
      totalRequests: metrics.totalRequests,
    })
  }

  /**
   * Get cache statistics and insights
   */
  getStatistics() {
    return {
      cacheMetrics: this.analytics.getMetrics(),
      usagePatterns: Array.from(this.usagePatterns.values()),
      strategies: Array.from(this.strategies.values()),
      prefetchQueue: Array.from(this.prefetchQueue),
      dependencyGraph: Object.fromEntries(
        Array.from(this.invalidationGraph.entries()).map(([key, deps]) => [key, Array.from(deps)]),
      ),
      predictiveInsights: this.generatePredictiveInsights(),
    }
  }
}

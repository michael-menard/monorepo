/**
 * RTK Query Performance Monitoring Utilities
 * Enhanced monitoring for serverless API performance
 */

import type { Middleware } from '@reduxjs/toolkit'
import { createLogger } from '@repo/logger'
import { getRetryMetrics } from '../retry/retry-logic'

const logger = createLogger('api-client:rtk-performance')

export interface RTKQueryPerformanceMetrics {
  totalQueries: number
  successfulQueries: number
  failedQueries: number
  averageQueryTime: number
  slowQueries: number
  cacheHits: number
  cacheMisses: number
  retryCount: number
  circuitBreakerTrips: number
}

export interface QueryPerformanceData {
  endpoint: string
  queryTime: number
  cacheStatus: 'hit' | 'miss' | 'stale'
  retryCount: number
  timestamp: number
  success: boolean
}

/**
 * Global RTK Query performance metrics
 */
let rtkQueryMetrics: RTKQueryPerformanceMetrics = {
  totalQueries: 0,
  successfulQueries: 0,
  failedQueries: 0,
  averageQueryTime: 0,
  slowQueries: 0,
  cacheHits: 0,
  cacheMisses: 0,
  retryCount: 0,
  circuitBreakerTrips: 0,
}

/**
 * Query performance tracking
 */
const queryPerformanceData = new Map<string, QueryPerformanceData>()

/**
 * RTK Query performance monitoring middleware
 */
export const rtkQueryPerformanceMiddleware: Middleware = () => next => (action: unknown) => {
  const typedAction = action as { type: string; meta?: { requestId?: string } }
  const startTime = performance.now()

  // Track query start
  if (typedAction.type.endsWith('/pending')) {
    const endpoint = extractEndpointFromAction(typedAction)
    if (endpoint && typedAction.meta?.requestId) {
      queryPerformanceData.set(typedAction.meta.requestId, {
        endpoint,
        queryTime: 0,
        cacheStatus: 'miss',
        retryCount: 0,
        timestamp: Date.now(),
        success: false,
      })

      rtkQueryMetrics.totalQueries++
    }
  }

  const result = next(action)
  const endTime = performance.now()
  const duration = endTime - startTime

  // Track query completion
  if (typedAction.type.endsWith('/fulfilled') || typedAction.type.endsWith('/rejected')) {
    const requestId = typedAction.meta?.requestId
    const queryData = requestId ? queryPerformanceData.get(requestId) : undefined

    if (queryData) {
      queryData.queryTime = duration
      queryData.success = typedAction.type.endsWith('/fulfilled')

      // Update global metrics
      if (queryData.success) {
        rtkQueryMetrics.successfulQueries++
      } else {
        rtkQueryMetrics.failedQueries++
      }

      // Track slow queries (>1s)
      if (duration > 1000) {
        rtkQueryMetrics.slowQueries++
        logger.warn(
          `🐌 Slow RTK Query: ${queryData.endpoint} took ${duration.toFixed(2)}ms`,
          undefined,
          {
            endpoint: queryData.endpoint,
            duration,
          },
        )
      }

      // Update average query time
      const totalSuccessful = rtkQueryMetrics.successfulQueries + rtkQueryMetrics.failedQueries
      rtkQueryMetrics.averageQueryTime =
        (rtkQueryMetrics.averageQueryTime * (totalSuccessful - 1) + duration) / totalSuccessful

      // Track cache status
      const actionMeta = typedAction as { meta?: { condition?: boolean } }
      if (actionMeta.meta?.condition === false) {
        queryData.cacheStatus = 'hit'
        rtkQueryMetrics.cacheHits++
      } else {
        rtkQueryMetrics.cacheMisses++
      }

      // Clean up old data (keep last 100 queries)
      if (queryPerformanceData.size > 100) {
        const oldestKey = queryPerformanceData.keys().next().value
        if (oldestKey) {
          queryPerformanceData.delete(oldestKey)
        }
      }
    }
  }

  return result
}

/**
 * Extract endpoint name from RTK Query action
 */
function extractEndpointFromAction(action: { type: string }): string | null {
  const type = action.type
  const parts = type.split('/')

  if (parts.length >= 2) {
    return parts[1] // e.g., "api/getUser/pending" -> "getUser"
  }

  return null
}

/**
 * Get current RTK Query performance metrics
 */
export function getRTKQueryMetrics(): RTKQueryPerformanceMetrics {
  // Include retry system metrics
  const retryMetrics = getRetryMetrics()

  return {
    ...rtkQueryMetrics,
    retryCount: retryMetrics.totalAttempts - retryMetrics.successfulAttempts,
    circuitBreakerTrips: retryMetrics.circuitBreakerTrips,
  }
}

/**
 * Get recent query performance data
 */
export function getRecentQueryPerformance(limit = 20): QueryPerformanceData[] {
  const recentQueries = Array.from(queryPerformanceData.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)

  return recentQueries
}

/**
 * Reset RTK Query performance metrics
 */
export function resetRTKQueryMetrics(): void {
  rtkQueryMetrics = {
    totalQueries: 0,
    successfulQueries: 0,
    failedQueries: 0,
    averageQueryTime: 0,
    slowQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    retryCount: 0,
    circuitBreakerTrips: 0,
  }
  queryPerformanceData.clear()
}

/**
 * Get performance summary for monitoring dashboards
 */
export function getRTKQueryPerformanceSummary() {
  const metrics = getRTKQueryMetrics()
  const recentQueries = getRecentQueryPerformance(10)

  const successRate =
    metrics.totalQueries > 0 ? (metrics.successfulQueries / metrics.totalQueries) * 100 : 100

  const cacheHitRate =
    metrics.cacheHits + metrics.cacheMisses > 0
      ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
      : 0

  return {
    summary: {
      totalQueries: metrics.totalQueries,
      successRate: Math.round(successRate * 100) / 100,
      averageQueryTime: Math.round(metrics.averageQueryTime * 100) / 100,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      slowQueriesCount: metrics.slowQueries,
      retryCount: metrics.retryCount,
    },
    recentQueries,
    health: {
      status: successRate > 95 ? 'healthy' : successRate > 80 ? 'degraded' : 'unhealthy',
      recommendations: generatePerformanceRecommendations(metrics),
    },
  }
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(metrics: RTKQueryPerformanceMetrics): string[] {
  const recommendations: string[] = []

  const successRate =
    metrics.totalQueries > 0 ? (metrics.successfulQueries / metrics.totalQueries) * 100 : 100

  if (successRate < 95) {
    recommendations.push('Consider implementing circuit breakers for failing endpoints')
  }

  if (metrics.averageQueryTime > 500) {
    recommendations.push('Average query time is high - consider optimizing slow endpoints')
  }

  if (metrics.slowQueries > metrics.totalQueries * 0.1) {
    recommendations.push('High number of slow queries detected - review endpoint performance')
  }

  const cacheHitRate =
    metrics.cacheHits + metrics.cacheMisses > 0
      ? (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100
      : 0

  if (cacheHitRate < 50) {
    recommendations.push('Low cache hit rate - consider adjusting cache strategies')
  }

  if (metrics.retryCount > metrics.totalQueries * 0.2) {
    recommendations.push('High retry rate detected - investigate network or server issues')
  }

  return recommendations
}

/**
 * Web Vitals Tracking Module
 * Story 3.3: Frontend Web Vitals Tracking
 *
 * This module captures Core Web Vitals metrics and sends them to CloudWatch
 * via the Lambda ingestion endpoint for monitoring in Grafana dashboards.
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals'
import { getPerformanceConfig, getAnalyticsEndpoint } from '../../config/performance'

// Web Vitals metrics queue for batching
let metricsQueue: Metric[] = []
let flushTimer: number | null = null

/**
 * Send Web Vitals metric to CloudWatch via Lambda endpoint
 */
async function sendWebVitalsMetric(metric: Metric): Promise<void> {
  const config = getPerformanceConfig()

  // In development, only log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
      navigationType: metric.navigationType,
    })
    return
  }

  // In production, send to CloudWatch via Lambda
  if (config.production.sendToAnalytics) {
    try {
      const payload = {
        type: 'web-vitals',
        sessionId: getSessionId(),
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: config.privacy.anonymizeUserAgent ? undefined : navigator.userAgent,
        data: {
          name: metric.name,
          value: metric.value,
          rating: metric.rating,
          id: metric.id,
          navigationType: metric.navigationType,
          delta: metric.delta,
        },
      }

      await fetch(getWebVitalsEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        // Use keepalive to ensure metrics are sent even if page is closing
        keepalive: true,
      })
    } catch (error) {
      // Silent fail - don't throw errors for analytics
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to send Web Vitals metric:', error)
      }
    }
  }
}

/**
 * Batch send Web Vitals metrics
 */
function batchSendMetrics(): void {
  if (metricsQueue.length === 0) return

  const config = getPerformanceConfig()
  const batch = [...metricsQueue]
  metricsQueue = []

  // In development, only log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals Batch]', batch)
    return
  }

  // In production, send batch to CloudWatch
  if (config.production.sendToAnalytics) {
    const payload = {
      type: 'web-vitals-batch',
      sessionId: getSessionId(),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: config.privacy.anonymizeUserAgent ? undefined : navigator.userAgent,
      metrics: batch.map(metric => ({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        id: metric.id,
        navigationType: metric.navigationType,
        delta: metric.delta,
      })),
    }

    fetch(getWebVitalsEndpoint(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silent fail
    })
  }
}

/**
 * Queue metric for batching
 */
function queueMetric(metric: Metric): void {
  const config = getPerformanceConfig()
  metricsQueue.push(metric)

  // Start flush timer if not already running
  if (!flushTimer) {
    flushTimer = window.setTimeout(() => {
      batchSendMetrics()
      flushTimer = null
    }, config.production.flushInterval)
  }

  // If batch size reached, flush immediately
  if (metricsQueue.length >= config.production.batchSize) {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    batchSendMetrics()
  }
}

/**
 * Handle Web Vitals metric
 */
function handleWebVitalsMetric(metric: Metric): void {
  // Send metric immediately for critical metrics
  if (metric.name === 'LCP' || metric.name === 'CLS' || metric.name === 'INP') {
    sendWebVitalsMetric(metric)
  } else {
    // Queue less critical metrics for batching
    queueMetric(metric)
  }
}

/**
 * Get or create session ID
 */
function getSessionId(): string {
  const SESSION_KEY = 'web-vitals-session-id'
  let sessionId = sessionStorage.getItem(SESSION_KEY)

  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }

  return sessionId
}

/**
 * Get Web Vitals endpoint
 */
function getWebVitalsEndpoint(): string {
  // Use environment variable if available, otherwise use default
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || ''
  return `${apiBaseUrl}/api/tracking/web-vitals`
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals(): void {
  const config = getPerformanceConfig()

  if (!config.enabled || !config.tracking.coreWebVitals) {
    return
  }

  // Track Core Web Vitals
  onCLS(handleWebVitalsMetric)
  onFID(handleWebVitalsMetric)
  onFCP(handleWebVitalsMetric)
  onLCP(handleWebVitalsMetric)
  onTTFB(handleWebVitalsMetric)
  onINP(handleWebVitalsMetric)

  // Flush remaining metrics when page is hidden
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      batchSendMetrics()
    }
  })

  // Flush metrics before page unload
  window.addEventListener('beforeunload', () => {
    if (flushTimer) {
      clearTimeout(flushTimer)
      flushTimer = null
    }
    batchSendMetrics()
  })

  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals] Tracking initialized')
  }
}

/**
 * Report Web Vitals with custom callback
 * (Maintains backwards compatibility with existing reportWebVitals)
 */
export function reportWebVitals(onPerfEntry?: (metric: Metric) => void): void {
  const config = getPerformanceConfig()

  if (!config.enabled || !config.tracking.coreWebVitals) {
    return
  }

  if (onPerfEntry && typeof onPerfEntry === 'function') {
    onCLS(onPerfEntry)
    onFID(onPerfEntry)
    onFCP(onPerfEntry)
    onLCP(onPerfEntry)
    onTTFB(onPerfEntry)
    onINP(onPerfEntry)
  } else {
    // Use default handling
    initWebVitals()
  }
}

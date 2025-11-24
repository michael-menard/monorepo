/**
 * Web Vitals Reporting (Story 3.3)
 *
 * This module initializes Web Vitals tracking, sending metrics to CloudWatch
 * via the Lambda ingestion endpoint for monitoring in Grafana dashboards.
 */

import {
  initWebVitals,
  reportWebVitals as reportWebVitalsTracking,
} from './lib/tracking/web-vitals'
import { performanceMonitor } from './services/performance'
import type { Metric } from 'web-vitals'

// Web Vitals callback function type (for backwards compatibility)
type WebVitalsCallback = (metric: {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}) => void

// Enhanced analytics function that sends to both CloudWatch and local performance monitor
const sendToAnalytics = (metric: Metric) => {
  // Send to local performance monitoring service for backwards compatibility
  performanceMonitor.trackPerformanceMetric(metric.name, metric.value)

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log('[Web Vitals]', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    })
  }
}

/**
 * Initialize Web Vitals tracking
 * Sends metrics to CloudWatch via Lambda endpoint (Story 3.3)
 */
const reportWebVitals = (onPerfEntry?: WebVitalsCallback) => {
  if (onPerfEntry && typeof onPerfEntry === 'function') {
    // Custom callback provided - use it along with our CloudWatch tracking
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(metric => {
        onPerfEntry(metric)
        sendToAnalytics(metric)
      })
      onINP(metric => {
        onPerfEntry(metric)
        sendToAnalytics(metric)
      })
      onFCP(metric => {
        onPerfEntry(metric)
        sendToAnalytics(metric)
      })
      onLCP(metric => {
        onPerfEntry(metric)
        sendToAnalytics(metric)
      })
      onTTFB(metric => {
        onPerfEntry(metric)
        sendToAnalytics(metric)
      })
    })

    // Also initialize CloudWatch tracking
    initWebVitals()
  } else {
    // Use default: send to CloudWatch and local performance monitor
    reportWebVitalsTracking(sendToAnalytics)
  }
}

export default reportWebVitals

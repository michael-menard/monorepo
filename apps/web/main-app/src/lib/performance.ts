import { onCLS, onFID, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals'
import { logger } from '@repo/logger'

export interface PerformanceMetrics {
  cls: number | null
  fid: number | null
  fcp: number | null
  lcp: number | null
  ttfb: number | null
  timestamp: number
}

export interface ComponentPerformanceData {
  componentName: string
  renderTime: number
  mountTime: number
  updateCount: number
  lastUpdate: number
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    timestamp: Date.now(),
  }

  private componentMetrics = new Map<string, ComponentPerformanceData>()
  private observers: PerformanceObserver[] = []

  constructor() {
    this.initializeWebVitals()
    this.initializePerformanceObserver()
  }

  private initializeWebVitals() {
    const handleMetric = (metric: Metric) => {
      switch (metric.name) {
        case 'CLS':
          this.metrics.cls = metric.value
          break
        case 'FID':
          this.metrics.fid = metric.value
          break
        case 'FCP':
          this.metrics.fcp = metric.value
          break
        case 'LCP':
          this.metrics.lcp = metric.value
          break
        case 'TTFB':
          this.metrics.ttfb = metric.value
          break
      }

      this.reportMetric(metric)
    }

    onCLS(handleMetric)
    onFID(handleMetric)
    onFCP(handleMetric)
    onLCP(handleMetric)
    onTTFB(handleMetric)
  }

  private initializePerformanceObserver() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return
    }

    // Observe navigation timing
    const navObserver = new PerformanceObserver(list => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.entryType === 'navigation') {
          this.handleNavigationTiming(entry as PerformanceNavigationTiming)
        }
      })
    })

    try {
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.push(navObserver)
    } catch (e) {
      logger.warn('Navigation timing observer not supported')
    }

    // Observe resource timing
    const resourceObserver = new PerformanceObserver(list => {
      const entries = list.getEntries()
      entries.forEach(entry => {
        if (entry.entryType === 'resource') {
          this.handleResourceTiming(entry as PerformanceEntry & { transferSize?: number })
        }
      })
    })

    try {
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.push(resourceObserver)
    } catch (e) {
      logger.warn('Resource timing observer not supported')
    }
  }

  private handleNavigationTiming(entry: PerformanceNavigationTiming) {
    const timing = {
      dns: entry.domainLookupEnd - entry.domainLookupStart,
      tcp: entry.connectEnd - entry.connectStart,
      request: entry.responseStart - entry.requestStart,
      response: entry.responseEnd - entry.responseStart,
      dom: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      load: entry.loadEventEnd - entry.loadEventStart,
    }

    logger.info('Navigation Timing:', timing)
  }

  private handleResourceTiming(entry: PerformanceEntry & { transferSize?: number }) {
    // Log slow resources (>1s)
    if (entry.duration > 1000) {
      logger.warn('Slow resource:', {
        name: entry.name,
        duration: entry.duration,
        size: entry.transferSize,
      })
    }
  }

  private reportMetric(metric: Metric) {
    // In production, send to analytics service
    if (import.meta.env.PROD) {
      // Example: Send to analytics
      // analytics.track('web-vital', {
      //   name: metric.name,
      //   value: metric.value,
      //   id: metric.id,
      // })
    }

    logger.info('Web Vital:', {
      name: metric.name,
      value: metric.value,
      rating: this.getRating(metric.name, metric.value),
    })
  }

  private getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    }

    const threshold = thresholds[name as keyof typeof thresholds]
    if (!threshold) return 'good'

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  // Component performance tracking
  trackComponentRender(componentName: string, renderTime: number) {
    const existing = this.componentMetrics.get(componentName)

    if (existing) {
      existing.renderTime = renderTime
      existing.updateCount += 1
      existing.lastUpdate = Date.now()
    } else {
      this.componentMetrics.set(componentName, {
        componentName,
        renderTime,
        mountTime: Date.now(),
        updateCount: 1,
        lastUpdate: Date.now(),
      })
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  getComponentMetrics(): ComponentPerformanceData[] {
    return Array.from(this.componentMetrics.values())
  }

  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.componentMetrics.clear()
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

// React hook for component performance tracking
export function usePerformanceTracking(componentName: string) {
  const startTime = performance.now()

  return {
    trackRender: () => {
      const renderTime = performance.now() - startTime
      performanceMonitor.trackComponentRender(componentName, renderTime)
    },
  }
}

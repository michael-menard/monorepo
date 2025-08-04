import { z } from 'zod'
import { getAnalyticsEndpoint, getPerformanceConfig, getThresholds, shouldLogToConsole, shouldRespectPrivacy, shouldSample, shouldTrack } from '../config/performance'

// Performance metric schemas
export const PerformanceMetricSchema = z.object({
  name: z.string(),
  value: z.number(),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  timestamp: z.number(),
  url: z.string(),
  userAgent: z.string().optional(),
})

export const WebVitalsSchema = z.object({
  CLS: z.number().optional(),
  FID: z.number().optional(),
  FCP: z.number().optional(),
  LCP: z.number().optional(),
  TTFB: z.number().optional(),
  INP: z.number().optional(),
  timestamp: z.number(),
  url: z.string(),
})

export const UserAnalyticsSchema = z.object({
  sessionId: z.string(),
  userId: z.string().optional(),
  pageViews: z.array(z.object({
    path: z.string(),
    timestamp: z.number(),
    loadTime: z.number(),
  })),
  interactions: z.array(z.object({
    type: z.string(),
    target: z.string(),
    timestamp: z.number(),
  })),
  performance: z.array(PerformanceMetricSchema),
})

export type PerformanceMetric = z.infer<typeof PerformanceMetricSchema>
export type WebVitals = z.infer<typeof WebVitalsSchema>
export type UserAnalytics = z.infer<typeof UserAnalyticsSchema>

// Get performance rating
const getPerformanceRating = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
  const thresholds = getThresholds()
  const metricThresholds = thresholds[metric as keyof typeof thresholds]
  if (!metricThresholds) return 'good'
  
  if (value <= metricThresholds.good) return 'good'
  if (value <= metricThresholds.poor) return 'needs-improvement'
  return 'poor'
}

// Generate session ID
const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}



// Performance monitoring service
class PerformanceMonitor {
  private sessionId: string
  private analytics: UserAnalytics
  private isInitialized = false

  constructor() {
    this.sessionId = generateSessionId()
    this.analytics = {
      sessionId: this.sessionId,
      pageViews: [],
      interactions: [],
      performance: [],
    }
  }

  // Initialize performance monitoring
  init(): void {
    if (this.isInitialized) return
    
    const config = getPerformanceConfig()
    if (!config.enabled) return
    
    if (shouldTrack('pageViews')) {
      this.trackPageView()
    }
    if (shouldTrack('coreWebVitals')) {
      this.setupPerformanceObserver()
    }
    if (shouldTrack('userInteractions')) {
      this.setupInteractionTracking()
    }
    this.isInitialized = true
  }

  // Track page view
  trackPageView(): void {
    const startTime = performance.now()
    
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime
      this.analytics.pageViews.push({
        path: window.location.pathname,
        timestamp: Date.now(),
        loadTime,
      })
      
      this.sendAnalytics('pageView', { loadTime })
    })
  }

  // Setup Performance Observer for Core Web Vitals
  private setupPerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) return

    // Observe navigation timing
    const navigationObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          const navEntry = entry as PerformanceNavigationTiming
          this.trackNavigationMetrics(navEntry)
        }
      }
    })
    
    navigationObserver.observe({ entryTypes: ['navigation'] })

    // Observe paint timing
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'paint') {
          const paintEntry = entry as PerformancePaintTiming
          this.trackPaintMetrics(paintEntry)
        }
      }
    })
    
    paintObserver.observe({ entryTypes: ['paint'] })

    // Observe layout shifts
    const layoutObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'layout-shift') {
          const layoutEntry = entry as PerformanceLayoutShift
          this.trackLayoutShift(layoutEntry)
        }
      }
    })
    
    layoutObserver.observe({ entryTypes: ['layout-shift'] })
  }

  // Track navigation metrics
  private trackNavigationMetrics(entry: PerformanceNavigationTiming): void {
    const metrics = [
      { name: 'TTFB', value: entry.responseStart - entry.requestStart },
      { name: 'DOMContentLoaded', value: entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart },
      { name: 'LoadComplete', value: entry.loadEventEnd - entry.loadEventStart },
    ]

    metrics.forEach(({ name, value }) => {
      if (value > 0) {
        this.trackPerformanceMetric(name, value)
      }
    })
  }

  // Track paint metrics
  private trackPaintMetrics(entry: PerformancePaintTiming): void {
    const metricName = entry.name === 'first-paint' ? 'FP' : 'FCP'
    this.trackPerformanceMetric(metricName, entry.startTime)
  }

  // Track layout shift
  private trackLayoutShift(entry: PerformanceLayoutShift): void {
    if (!entry.hadRecentInput) {
      this.trackPerformanceMetric('CLS', entry.value)
    }
  }

  // Track custom performance metric
  trackPerformanceMetric(name: string, value: number): void {
    if (!shouldTrack('customMetrics') || !shouldSample()) return
    
    const metric: PerformanceMetric = {
      name,
      value,
      rating: getPerformanceRating(name, value),
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: shouldRespectPrivacy() ? undefined : navigator.userAgent,
    }

    this.analytics.performance.push(metric)
    this.sendAnalytics('performance', metric)
  }

  // Setup interaction tracking
  private setupInteractionTracking(): void {
    const trackInteraction = (event: Event) => {
      const target = event.target as HTMLElement
      if (!target) return

      this.analytics.interactions.push({
        type: event.type,
        target: target.tagName.toLowerCase() + (target.id ? `#${target.id}` : '') + (target.className ? `.${target.className.split(' ')[0]}` : ''),
        timestamp: Date.now(),
      })
    }

    // Track clicks
    document.addEventListener('click', trackInteraction, { passive: true })
    
    // Track form interactions
    document.addEventListener('submit', trackInteraction, { passive: true })
    
    // Track scroll events (throttled)
    let scrollTimeout: number
    document.addEventListener('scroll', () => {
      if (scrollTimeout) return
      scrollTimeout = window.setTimeout(() => {
        this.analytics.interactions.push({
          type: 'scroll',
          target: 'document',
          timestamp: Date.now(),
        })
        scrollTimeout = 0
      }, 100)
    }, { passive: true })
  }

  // Track user interaction
  trackInteraction(type: string, target: string, data?: Record<string, any>): void {
    if (!shouldTrack('userInteractions') || !shouldSample()) return
    
    this.analytics.interactions.push({
      type,
      target,
      timestamp: Date.now(),
    })
    
    this.sendAnalytics('interaction', { type, target, data })
  }

  // Track custom event
  trackEvent(eventName: string, data?: Record<string, any>): void {
    if (!shouldSample()) return
    this.sendAnalytics('custom', { eventName, data })
  }

  // Send analytics data
  private async sendAnalytics(type: string, data: any): Promise<void> {
    try {
      const payload = {
        type,
        sessionId: this.sessionId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: shouldRespectPrivacy() ? undefined : navigator.userAgent,
        data,
      }

      // Log to console if enabled
      if (shouldLogToConsole()) {
        console.log(`[Performance Analytics] ${type}:`, payload)
      }

      // Send to analytics endpoint if enabled
      const config = getPerformanceConfig()
      if (config.production.sendToAnalytics) {
        await fetch(getAnalyticsEndpoint(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })
      }
    } catch (error) {
      console.error('Failed to send analytics:', error)
    }
  }

  // Get current analytics data
  getAnalytics(): UserAnalytics {
    return { ...this.analytics }
  }

  // Get performance summary
  getPerformanceSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    this.analytics.performance.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, min: Infinity, max: -Infinity, count: 0 }
      }
      
      const stats = summary[metric.name]
      stats.count++
      stats.min = Math.min(stats.min, metric.value)
      stats.max = Math.max(stats.max, metric.value)
      stats.avg = (stats.avg * (stats.count - 1) + metric.value) / stats.count
    })
    
    return summary
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor()

// Export convenience functions
export const trackPerformanceMetric = (name: string, value: number) => 
  performanceMonitor.trackPerformanceMetric(name, value)

export const trackInteraction = (type: string, target: string, data?: Record<string, any>) => 
  performanceMonitor.trackInteraction(type, target, data)

export const trackEvent = (eventName: string, data?: Record<string, any>) => 
  performanceMonitor.trackEvent(eventName, data)

export const getPerformanceSummary = () => performanceMonitor.getPerformanceSummary() 
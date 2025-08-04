import { useCallback, useEffect, useState } from 'react'
import {  getPerformanceSummary, performanceMonitor, trackEvent, trackInteraction, trackPerformanceMetric } from '../services/performance'
import type {UserAnalytics} from '../services/performance';

export const usePerformance = () => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null)
  const [performanceSummary, setPerformanceSummary] = useState<ReturnType<typeof getPerformanceSummary> | null>(null)

  // Initialize performance monitoring
  useEffect(() => {
    performanceMonitor.init()
    
    // Update analytics data periodically
    const updateAnalytics = () => {
      setAnalytics(performanceMonitor.getAnalytics())
      setPerformanceSummary(getPerformanceSummary())
    }

    // Initial update
    updateAnalytics()

    // Update every 5 seconds
    const interval = setInterval(updateAnalytics, 5000)

    return () => clearInterval(interval)
  }, [])

  // Track custom performance metric
  const trackMetric = useCallback((name: string, value: number) => {
    trackPerformanceMetric(name, value)
  }, [])

  // Track user interaction
  const trackUserInteraction = useCallback((type: string, target: string, data?: Record<string, any>) => {
    trackInteraction(type, target, data)
  }, [])

  // Track custom event
  const trackCustomEvent = useCallback((eventName: string, data?: Record<string, any>) => {
    trackEvent(eventName, data)
  }, [])

  // Get current performance summary
  const getSummary = useCallback(() => {
    return getPerformanceSummary()
  }, [])

  // Track component render time
  const trackRenderTime = useCallback((componentName: string, renderTime: number) => {
    trackPerformanceMetric(`${componentName}_render_time`, renderTime)
  }, [])

  // Track API call performance
  const trackApiCall = useCallback((endpoint: string, duration: number, status: number) => {
    trackPerformanceMetric(`${endpoint}_api_call`, duration)
    trackEvent('api_call', { endpoint, duration, status })
  }, [])

  // Track image load performance
  const trackImageLoad = useCallback((imageUrl: string, loadTime: number) => {
    trackPerformanceMetric('image_load_time', loadTime)
    trackEvent('image_load', { imageUrl, loadTime })
  }, [])

  // Track route change performance
  const trackRouteChange = useCallback((from: string, to: string, transitionTime: number) => {
    trackPerformanceMetric('route_transition_time', transitionTime)
    trackEvent('route_change', { from, to, transitionTime })
  }, [])

  return {
    analytics,
    performanceSummary,
    trackMetric,
    trackUserInteraction,
    trackCustomEvent,
    getSummary,
    trackRenderTime,
    trackApiCall,
    trackImageLoad,
    trackRouteChange,
  }
}

// Hook for tracking component performance
export const useComponentPerformance = (componentName: string) => {
  const { trackRenderTime, trackUserInteraction } = usePerformance()

  useEffect(() => {
    const startTime = performance.now()
    
    return () => {
      const renderTime = performance.now() - startTime
      trackRenderTime(componentName, renderTime)
    }
  }, [componentName, trackRenderTime])

  const trackInteraction = useCallback((type: string, target: string, data?: Record<string, any>) => {
    trackUserInteraction(type, `${componentName}:${target}`, data)
  }, [componentName, trackUserInteraction])

  return { trackInteraction }
}

// Hook for tracking API performance
export const useApiPerformance = () => {
  const { trackApiCall } = usePerformance()

  const trackApiRequest = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await apiCall()
      const duration = performance.now() - startTime
      trackApiCall(endpoint, duration, 200)
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      const status = error instanceof Response ? error.status : 500
      trackApiCall(endpoint, duration, status)
      throw error
    }
  }, [trackApiCall])

  return { trackApiRequest }
}

// Hook for tracking image performance
export const useImagePerformance = () => {
  const { trackImageLoad } = usePerformance()

  const trackImage = useCallback((imageUrl: string) => {
    const img = new Image()
    const startTime = performance.now()
    
    img.onload = () => {
      const loadTime = performance.now() - startTime
      trackImageLoad(imageUrl, loadTime)
    }
    
    img.onerror = () => {
      const loadTime = performance.now() - startTime
      trackImageLoad(imageUrl, loadTime)
    }
    
    img.src = imageUrl
  }, [trackImageLoad])

  return { trackImage }
} 
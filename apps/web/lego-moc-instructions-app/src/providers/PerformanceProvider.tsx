import { createContext, useContext, useEffect } from 'react'
import { performanceMonitor } from '../services/performance'
import { usePerformance } from '../hooks/usePerformance'
import { getPerformanceConfig, shouldTrack } from '../config/performance'
import type { ReactNode } from 'react';

interface PerformanceContextType {
  isInitialized: boolean
  analytics: ReturnType<typeof usePerformance>['analytics']
  performanceSummary: ReturnType<typeof usePerformance>['performanceSummary']
  trackMetric: (name: string, value: number) => void
  trackUserInteraction: (type: string, target: string, data?: Record<string, any>) => void
  trackCustomEvent: (eventName: string, data?: Record<string, any>) => void
}

const PerformanceContext = createContext<PerformanceContextType | null>(null)

interface PerformanceProviderProps {
  children: ReactNode
  enabled?: boolean
}

export const PerformanceProvider = ({ children, enabled = true }: PerformanceProviderProps) => {
  const performance = usePerformance()

  useEffect(() => {
    if (enabled) {
      const config = getPerformanceConfig()
      if (!config.enabled) return
      
      // Initialize performance monitoring
      performanceMonitor.init()
      
      // Track app initialization
      performance.trackCustomEvent('app_initialized', {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      })

      // Track route changes if enabled
      if (shouldTrack('routeChanges')) {
        const handleRouteChange = () => {
          performance.trackCustomEvent('route_change', {
            path: window.location.pathname,
            timestamp: Date.now(),
          })
        }

        // Listen for popstate events (browser back/forward)
        window.addEventListener('popstate', handleRouteChange)

        return () => {
          window.removeEventListener('popstate', handleRouteChange)
        }
      }

      // Track initial page load performance
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          performance.trackCustomEvent('dom_content_loaded', {
            timestamp: Date.now(),
          })
        })
      } else {
        performance.trackCustomEvent('dom_content_loaded', {
          timestamp: Date.now(),
        })
      }
    }
  }, [enabled, performance])

  const contextValue: PerformanceContextType = {
    isInitialized: enabled,
    analytics: performance.analytics,
    performanceSummary: performance.performanceSummary,
    trackMetric: performance.trackMetric,
    trackUserInteraction: performance.trackUserInteraction,
    trackCustomEvent: performance.trackCustomEvent,
  }

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
    </PerformanceContext.Provider>
  )
}

export const usePerformanceContext = () => {
  const context = useContext(PerformanceContext)
  if (!context) {
    throw new Error('usePerformanceContext must be used within a PerformanceProvider')
  }
  return context
} 
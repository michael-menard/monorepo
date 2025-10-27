import { performanceMonitor } from './services/performance'

// Web Vitals callback function type
type WebVitalsCallback = (metric: {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}) => void

// Default analytics function
const sendToAnalytics = (metric: { id: string; name: string; value: number; rating: string }) => {
  // Send to our performance monitoring service
  performanceMonitor.trackPerformanceMetric(metric.name, metric.value)

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
      id: metric.id,
    })
  }

  // In production, you can send to external analytics services
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics
    // gtag('event', metric.name, {
    //   event_category: 'Web Vitals',
    //   value: Math.round(metric.value),
    //   event_label: metric.id,
    //   non_interaction: true,
    // })
  }
}

const reportWebVitals = (onPerfEntry?: WebVitalsCallback) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(onPerfEntry)
      onINP(onPerfEntry)
      onFCP(onPerfEntry)
      onLCP(onPerfEntry)
      onTTFB(onPerfEntry)
    })
  } else {
    // Use default analytics function
    import('web-vitals').then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) => {
      onCLS(sendToAnalytics)
      onINP(sendToAnalytics)
      onFCP(sendToAnalytics)
      onLCP(sendToAnalytics)
      onTTFB(sendToAnalytics)
    })
  }
}

export default reportWebVitals

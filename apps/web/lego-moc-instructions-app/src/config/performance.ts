import { z } from 'zod'

// Performance monitoring configuration schema
export const PerformanceConfigSchema = z.object({
  enabled: z.boolean().default(true),
  development: z.object({
    logToConsole: z.boolean().default(true),
    showMonitor: z.boolean().default(true),
    trackInteractions: z.boolean().default(true),
    trackPageViews: z.boolean().default(true),
  }),
  production: z.object({
    sendToAnalytics: z.boolean().default(true),
    analyticsEndpoint: z.string().default('/api/analytics'),
    batchSize: z.number().default(10),
    flushInterval: z.number().default(5000), // 5 seconds
  }),
  thresholds: z.object({
    CLS: z.object({
      good: z.number().default(0.1),
      poor: z.number().default(0.25),
    }),
    FID: z.object({
      good: z.number().default(100),
      poor: z.number().default(300),
    }),
    FCP: z.object({
      good: z.number().default(1800),
      poor: z.number().default(3000),
    }),
    LCP: z.object({
      good: z.number().default(2500),
      poor: z.number().default(4000),
    }),
    TTFB: z.object({
      good: z.number().default(800),
      poor: z.number().default(1800),
    }),
    INP: z.object({
      good: z.number().default(200),
      poor: z.number().default(500),
    }),
  }),
  tracking: z.object({
    coreWebVitals: z.boolean().default(true),
    customMetrics: z.boolean().default(true),
    userInteractions: z.boolean().default(true),
    pageViews: z.boolean().default(true),
    routeChanges: z.boolean().default(true),
    apiCalls: z.boolean().default(true),
    imageLoads: z.boolean().default(true),
    componentRenders: z.boolean().default(false), // Disabled by default for performance
  }),
  sampling: z.object({
    enabled: z.boolean().default(false),
    rate: z.number().min(0).max(1).default(0.1), // 10% sampling
  }),
  privacy: z.object({
    anonymizeUserAgent: z.boolean().default(false),
    excludePII: z.boolean().default(true),
    respectDNT: z.boolean().default(true), // Do Not Track
  }),
})

export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>

// Default configuration
export const defaultPerformanceConfig: PerformanceConfig = {
  enabled: true,
  development: {
    logToConsole: true,
    showMonitor: true,
    trackInteractions: true,
    trackPageViews: true,
  },
  production: {
    sendToAnalytics: true,
    analyticsEndpoint: '/api/analytics',
    batchSize: 10,
    flushInterval: 5000,
  },
  thresholds: {
    CLS: { good: 0.1, poor: 0.25 },
    FID: { good: 100, poor: 300 },
    FCP: { good: 1800, poor: 3000 },
    LCP: { good: 2500, poor: 4000 },
    TTFB: { good: 800, poor: 1800 },
    INP: { good: 200, poor: 500 },
  },
  tracking: {
    coreWebVitals: true,
    customMetrics: true,
    userInteractions: true,
    pageViews: true,
    routeChanges: true,
    apiCalls: true,
    imageLoads: true,
    componentRenders: false,
  },
  sampling: {
    enabled: false,
    rate: 0.1,
  },
  privacy: {
    anonymizeUserAgent: false,
    excludePII: true,
    respectDNT: true,
  },
}

// Environment-specific configuration
export const getPerformanceConfig = (): PerformanceConfig => {
  const env = process.env.NODE_ENV

  // Base configuration
  const config = { ...defaultPerformanceConfig }

  // Environment-specific overrides
  if (env === 'development') {
    config.development.logToConsole = true
    config.development.showMonitor = true
    config.production.sendToAnalytics = false
  } else if (env === 'production') {
    config.development.logToConsole = false
    config.development.showMonitor = false
    config.production.sendToAnalytics = true
  } else if (env === 'test') {
    config.enabled = false
    config.development.logToConsole = false
    config.development.showMonitor = false
    config.production.sendToAnalytics = false
  }

  // Check for Do Not Track
  if (config.privacy.respectDNT && navigator.doNotTrack === '1') {
    config.enabled = false
  }

  return config
}

// Utility functions for configuration
export const shouldTrack = (metricType: keyof PerformanceConfig['tracking']): boolean => {
  const config = getPerformanceConfig()
  return config.enabled && config.tracking[metricType]
}

export const shouldSample = (): boolean => {
  const config = getPerformanceConfig()
  if (!config.sampling.enabled) return true
  return Math.random() < config.sampling.rate
}

export const getAnalyticsEndpoint = (): string => {
  const config = getPerformanceConfig()
  return config.production.analyticsEndpoint
}

export const shouldLogToConsole = (): boolean => {
  const config = getPerformanceConfig()
  return config.development.logToConsole
}

export const shouldShowMonitor = (): boolean => {
  const config = getPerformanceConfig()
  return config.development.showMonitor
}

export const getThresholds = () => {
  const config = getPerformanceConfig()
  return config.thresholds
}

export const shouldRespectPrivacy = (): boolean => {
  const config = getPerformanceConfig()
  return config.privacy.excludePII
}

/**
 * Advanced Cache Configuration
 *
 * Centralized configuration for intelligent caching system:
 * - Environment-specific cache settings
 * - Performance optimization parameters
 * - Cache strategy definitions
 * - Monitoring and analytics configuration
 */

import { IntelligentCacheManager } from '@repo/cache/managers/IntelligentCacheManager'

export interface CacheEnvironmentConfig {
  development: CacheConfig
  staging: CacheConfig
  production: CacheConfig
}

export interface CacheConfig {
  // Core cache settings
  maxSize: number
  defaultTTL: number
  enableCompression: boolean
  enableEncryption: boolean

  // Intelligent features
  enablePredictivePrefetching: boolean
  enableSmartInvalidation: boolean
  enablePerformanceMonitoring: boolean
  enableAnalytics: boolean

  // Performance thresholds
  maxLatency: number
  minHitRate: number
  maxMemoryUsage: number

  // Strategy configurations
  strategies: Record<string, CacheStrategyConfig>

  // Monitoring settings
  analyticsInterval: number
  reportingInterval: number
  alertThresholds: AlertThresholds
}

export interface CacheStrategyConfig {
  ttl: number
  priority: number
  prefetchTrigger: number
  compressionEnabled: boolean
  encryptionEnabled: boolean
  invalidationRules: string[]
  dependencies?: string[]
}

export interface AlertThresholds {
  criticalHitRate: number
  warningHitRate: number
  criticalLatency: number
  warningLatency: number
  criticalMemoryUsage: number
  warningMemoryUsage: number
}

/**
 * Environment-specific cache configurations
 */
export const cacheConfigurations: CacheEnvironmentConfig = {
  development: {
    maxSize: 500,
    defaultTTL: 2 * 60 * 1000, // 2 minutes
    enableCompression: false,
    enableEncryption: false,
    enablePredictivePrefetching: true,
    enableSmartInvalidation: true,
    enablePerformanceMonitoring: true,
    enableAnalytics: true,
    maxLatency: 1000,
    minHitRate: 0.6,
    maxMemoryUsage: 0.8,
    analyticsInterval: 30 * 1000, // 30 seconds
    reportingInterval: 2 * 60 * 1000, // 2 minutes
    strategies: {
      'dev-fast': {
        ttl: 30 * 1000, // 30 seconds
        priority: 10,
        prefetchTrigger: 0.5,
        compressionEnabled: false,
        encryptionEnabled: false,
        invalidationRules: ['dev-change'],
      },
    },
    alertThresholds: {
      criticalHitRate: 0.4,
      warningHitRate: 0.6,
      criticalLatency: 2000,
      warningLatency: 1000,
      criticalMemoryUsage: 0.9,
      warningMemoryUsage: 0.7,
    },
  },

  staging: {
    maxSize: 1500,
    defaultTTL: 10 * 60 * 1000, // 10 minutes
    enableCompression: true,
    enableEncryption: true,
    enablePredictivePrefetching: true,
    enableSmartInvalidation: true,
    enablePerformanceMonitoring: true,
    enableAnalytics: true,
    maxLatency: 500,
    minHitRate: 0.7,
    maxMemoryUsage: 0.85,
    analyticsInterval: 60 * 1000, // 1 minute
    reportingInterval: 5 * 60 * 1000, // 5 minutes
    strategies: {
      'staging-balanced': {
        ttl: 5 * 60 * 1000, // 5 minutes
        priority: 8,
        prefetchTrigger: 0.7,
        compressionEnabled: true,
        encryptionEnabled: true,
        invalidationRules: ['content-update', 'user-action'],
      },
    },
    alertThresholds: {
      criticalHitRate: 0.5,
      warningHitRate: 0.7,
      criticalLatency: 1000,
      warningLatency: 500,
      criticalMemoryUsage: 0.95,
      warningMemoryUsage: 0.8,
    },
  },

  production: {
    maxSize: 5000,
    defaultTTL: 30 * 60 * 1000, // 30 minutes
    enableCompression: true,
    enableEncryption: true,
    enablePredictivePrefetching: true,
    enableSmartInvalidation: true,
    enablePerformanceMonitoring: true,
    enableAnalytics: true,
    maxLatency: 200,
    minHitRate: 0.85,
    maxMemoryUsage: 0.9,
    analyticsInterval: 5 * 60 * 1000, // 5 minutes
    reportingInterval: 15 * 60 * 1000, // 15 minutes
    strategies: {
      'production-optimized': {
        ttl: 60 * 60 * 1000, // 1 hour
        priority: 9,
        prefetchTrigger: 0.8,
        compressionEnabled: true,
        encryptionEnabled: true,
        invalidationRules: ['content-publish', 'critical-update'],
        dependencies: ['user-content', 'static-assets'],
      },
    },
    alertThresholds: {
      criticalHitRate: 0.7,
      warningHitRate: 0.85,
      criticalLatency: 500,
      warningLatency: 200,
      criticalMemoryUsage: 0.95,
      warningMemoryUsage: 0.85,
    },
  },
}

/**
 * Get cache configuration for current environment
 */
export function getCacheConfig(): CacheConfig {
  const environment = (process.env.NODE_ENV || 'development') as keyof CacheEnvironmentConfig
  return cacheConfigurations[environment] || cacheConfigurations.development
}

/**
 * Create configured intelligent cache manager
 */
export function createConfiguredCacheManager(): IntelligentCacheManager {
  const config = getCacheConfig()
  const manager = new IntelligentCacheManager()

  // Apply configuration settings
  // Note: This would require extending IntelligentCacheManager to accept configuration

  return manager
}

/**
 * Cache configuration for specific LEGO MOC application features
 */
export const legoMocCacheStrategies = {
  // Navigation and UI state
  navigation: {
    ttl: 2 * 60 * 1000, // 2 minutes
    priority: 10,
    prefetchTrigger: 0.8,
    compressionEnabled: false,
    encryptionEnabled: false,
    invalidationRules: ['navigation-change', 'user-preference-change'],
  },

  // Gallery images and metadata
  galleryContent: {
    ttl: 15 * 60 * 1000, // 15 minutes
    priority: 8,
    prefetchTrigger: 0.7,
    compressionEnabled: true,
    encryptionEnabled: false,
    invalidationRules: ['image-upload', 'image-update', 'image-delete'],
    dependencies: ['user-content'],
  },

  // Wishlist items
  wishlistContent: {
    ttl: 10 * 60 * 1000, // 10 minutes
    priority: 9,
    prefetchTrigger: 0.8,
    compressionEnabled: true,
    encryptionEnabled: true, // Personal data
    invalidationRules: ['wishlist-update', 'item-add', 'item-remove'],
    dependencies: ['user-content'],
  },

  // Search results
  searchResults: {
    ttl: 5 * 60 * 1000, // 5 minutes
    priority: 7,
    prefetchTrigger: 0.6,
    compressionEnabled: true,
    encryptionEnabled: false,
    invalidationRules: ['content-update', 'search-index-refresh'],
  },

  // MOC building instructions
  instructions: {
    ttl: 2 * 60 * 60 * 1000, // 2 hours
    priority: 6,
    prefetchTrigger: 0.9,
    compressionEnabled: true,
    encryptionEnabled: false,
    invalidationRules: ['instruction-update', 'version-change'],
  },

  // User statistics and analytics
  userStats: {
    ttl: 10 * 60 * 1000, // 10 minutes
    priority: 5,
    prefetchTrigger: 0.5,
    compressionEnabled: true,
    encryptionEnabled: true,
    invalidationRules: ['user-activity', 'stats-recalculation'],
    dependencies: ['user-content', 'gallery-content', 'wishlist-content'],
  },
}

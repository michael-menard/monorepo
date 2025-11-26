/**
 * Connection Warming for Serverless APIs
 * Proactive connection warming to reduce cold start impact
 */

import { ServerlessApiClient } from '../client/serverless-client'
import { getServerlessApiConfig } from '../config/environments'
import { createLogger } from '@repo/logger'

const logger = createLogger('api-client:connection-warming')

export interface WarmingConfig {
  enabled: boolean
  interval: number // milliseconds
  endpoints: string[]
  maxConcurrent: number
  timeout: number
  // Enhanced features
  adaptiveWarming: boolean
  priorityEndpoints: string[]
  failureThreshold: number
  backoffMultiplier: number
  healthCheckEndpoint?: string
}

export interface WarmingStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  lastWarmingTime: string
  // Enhanced metrics
  consecutiveFailures: number
  adaptiveInterval: number
  endpointStats: Record<string, {
    requests: number
    successes: number
    failures: number
    avgResponseTime: number
    lastSuccess: string
  }>
}

/**
 * Default warming configuration
 */
export const DEFAULT_WARMING_CONFIG: WarmingConfig = {
  enabled: true,
  interval: 5 * 60 * 1000, // 5 minutes
  endpoints: ['/api/v2/health'],
  maxConcurrent: 3,
  timeout: 5000,
  // Enhanced features
  adaptiveWarming: true,
  priorityEndpoints: ['/api/v2/health'],
  failureThreshold: 3,
  backoffMultiplier: 1.5,
  healthCheckEndpoint: '/api/v2/health',
}

/**
 * Connection warming service
 */
export class ConnectionWarmer {
  private config: WarmingConfig
  private client: ServerlessApiClient
  private intervalId?: NodeJS.Timeout
  private stats: WarmingStats
  private isWarming = false

  constructor(config: Partial<WarmingConfig> = {}) {
    this.config = { ...DEFAULT_WARMING_CONFIG, ...config }
    this.client = new ServerlessApiClient()
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastWarmingTime: new Date().toISOString(),
      // Enhanced metrics
      consecutiveFailures: 0,
      adaptiveInterval: this.config.interval,
      endpointStats: {},
    }

    // Initialize endpoint stats
    this.config.endpoints.forEach(endpoint => {
      this.stats.endpointStats[endpoint] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0,
        lastSuccess: new Date().toISOString(),
      }
    })
  }

  /**
   * Start connection warming
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('🔥 Connection warming is disabled')
      return
    }

    if (this.intervalId) {
      console.warn('🔥 Connection warming is already running')
      return
    }

    console.log(`🔥 Starting connection warming every ${this.config.interval / 1000}s`)
    
    // Warm immediately
    this.warmConnections()
    
    // Set up adaptive interval
    this.scheduleNextWarming()
  }

  /**
   * Stop connection warming
   */
  stop(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId)
      this.intervalId = undefined
      console.log('🔥 Connection warming stopped')
    }
  }

  /**
   * Schedule next warming with adaptive interval
   */
  private scheduleNextWarming(): void {
    if (this.intervalId) {
      clearTimeout(this.intervalId)
    }

    // Don't schedule if warming is disabled
    if (!this.config.enabled) {
      return
    }

    const interval = this.config.adaptiveWarming
      ? this.stats.adaptiveInterval
      : this.config.interval

    this.intervalId = setTimeout(() => {
      this.warmConnections().then(() => {
        // Only reschedule if still enabled and not stopped
        if (this.config.enabled && this.intervalId) {
          this.scheduleNextWarming()
        }
      }).catch((error) => {
        console.error('🔥 Error in warming cycle:', error)
        // Still reschedule on error if enabled
        if (this.config.enabled && this.intervalId) {
          this.scheduleNextWarming()
        }
      })
    }, interval)
  }

  /**
   * Adjust warming interval based on success/failure patterns
   */
  private adjustWarmingInterval(): void {
    if (!this.config.adaptiveWarming) return

    const successRate = this.stats.totalRequests > 0
      ? this.stats.successfulRequests / this.stats.totalRequests
      : 1

    if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
      // Increase interval on consecutive failures (back off)
      this.stats.adaptiveInterval = Math.min(
        this.stats.adaptiveInterval * this.config.backoffMultiplier,
        this.config.interval * 3 // Max 3x original interval
      )
      console.log(`🔥 Backing off warming interval to ${this.stats.adaptiveInterval / 1000}s`)
    } else if (successRate > 0.9 && this.stats.consecutiveFailures === 0) {
      // Decrease interval on high success rate (more aggressive warming)
      this.stats.adaptiveInterval = Math.max(
        this.stats.adaptiveInterval / this.config.backoffMultiplier,
        this.config.interval / 2 // Min 0.5x original interval
      )
    }
  }

  /**
   * Warm connections to specified endpoints with priority handling
   */
  private async warmConnections(): Promise<void> {
    if (this.isWarming) {
      console.log('🔥 Warming already in progress, skipping...')
      return
    }

    this.isWarming = true
    const startTime = Date.now()
    let batchSuccessCount = 0

    try {
      console.log(`🔥 Warming ${this.config.endpoints.length} endpoints...`)

      // Separate priority and regular endpoints
      const priorityEndpoints = this.config.endpoints.filter(ep =>
        this.config.priorityEndpoints.includes(ep)
      )
      const regularEndpoints = this.config.endpoints.filter(ep =>
        !this.config.priorityEndpoints.includes(ep)
      )

      // Warm priority endpoints first
      if (priorityEndpoints.length > 0) {
        console.log(`🔥 Warming ${priorityEndpoints.length} priority endpoints first...`)
        const priorityResults = await Promise.allSettled(
          priorityEndpoints.map(endpoint => this.warmEndpoint(endpoint))
        )
        batchSuccessCount += priorityResults.filter(r => r.status === 'fulfilled').length
      }

      // Then warm regular endpoints in batches
      if (regularEndpoints.length > 0) {
        const batches = this.chunkArray(regularEndpoints, this.config.maxConcurrent)

        for (const batch of batches) {
          const promises = batch.map(endpoint => this.warmEndpoint(endpoint))
          const results = await Promise.allSettled(promises)
          batchSuccessCount += results.filter(r => r.status === 'fulfilled').length
        }
      }

      const duration = Date.now() - startTime
      this.updateStats(duration, batchSuccessCount)

      console.log(`🔥 Warming completed in ${duration}ms (${batchSuccessCount}/${this.config.endpoints.length} successful)`)
    } catch (error) {
      console.error('🔥 Connection warming failed:', error)
      this.stats.consecutiveFailures++
    } finally {
      this.isWarming = false
      this.adjustWarmingInterval()
    }
  }

  /**
   * Warm a single endpoint with enhanced tracking
   */
  private async warmEndpoint(endpoint: string): Promise<void> {
    const startTime = Date.now()

    // Initialize endpoint stats if not exists
    if (!this.stats.endpointStats[endpoint]) {
      this.stats.endpointStats[endpoint] = {
        requests: 0,
        successes: 0,
        failures: 0,
        avgResponseTime: 0,
        lastSuccess: new Date().toISOString(),
      }
    }

    const endpointStats = this.stats.endpointStats[endpoint]

    try {
      await this.client.get(endpoint, {
        timeout: this.config.timeout,
        skipRetry: true,
      })

      const responseTime = Date.now() - startTime

      // Update global stats
      this.stats.successfulRequests++
      this.stats.consecutiveFailures = 0 // Reset on success

      // Update endpoint stats
      endpointStats.requests++
      endpointStats.successes++
      endpointStats.avgResponseTime =
        (endpointStats.avgResponseTime * (endpointStats.successes - 1) + responseTime) /
        endpointStats.successes
      endpointStats.lastSuccess = new Date().toISOString()

      logger.debug(`🔥 Warmed ${endpoint} in ${responseTime}ms`, { endpoint, responseTime })
    } catch (error) {
      // Update global stats
      this.stats.failedRequests++

      // Update endpoint stats
      endpointStats.requests++
      endpointStats.failures++

      logger.warn(`🔥 Failed to warm ${endpoint}`, error instanceof Error ? error : new Error(String(error)), { endpoint })
    } finally {
      this.stats.totalRequests++
    }
  }

  /**
   * Update warming statistics
   */
  private updateStats(totalDuration: number, successCount: number): void {
    this.stats.averageResponseTime = totalDuration / this.config.endpoints.length
    this.stats.lastWarmingTime = new Date().toISOString()

    // Update consecutive failures based on batch success
    if (successCount === 0) {
      this.stats.consecutiveFailures++
    } else if (successCount === this.config.endpoints.length) {
      this.stats.consecutiveFailures = 0
    }
  }

  /**
   * Perform health check on configured endpoint
   */
  async performHealthCheck(): Promise<{
    healthy: boolean
    responseTime: number
    error?: string
  }> {
    if (!this.config.healthCheckEndpoint) {
      return { healthy: true, responseTime: 0 }
    }

    const startTime = Date.now()

    try {
      await this.client.get(this.config.healthCheckEndpoint, {
        timeout: this.config.timeout,
        skipRetry: true,
      })

      const responseTime = Date.now() - startTime
      return { healthy: true, responseTime }
    } catch (error) {
      const responseTime = Date.now() - startTime
      return {
        healthy: false,
        responseTime,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Get warming statistics
   */
  getStats(): WarmingStats {
    return { ...this.stats }
  }

  /**
   * Update warming configuration
   */
  updateConfig(config: Partial<WarmingConfig>): void {
    this.config = { ...this.config, ...config }
    
    // Restart if interval changed
    if (this.intervalId && config.interval) {
      this.stop()
      this.start()
    }
  }

  /**
   * Utility to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }
}

/**
 * Global connection warmer instance
 */
let globalWarmer: ConnectionWarmer | null = null

/**
 * Initialize global connection warming
 */
export function initializeConnectionWarming(config: Partial<WarmingConfig> = {}): ConnectionWarmer {
  const apiConfig = getServerlessApiConfig()
  
  if (!apiConfig.connectionWarmingEnabled) {
    console.log('🔥 Connection warming disabled by configuration')
    return new ConnectionWarmer({ enabled: false })
  }

  if (globalWarmer) {
    globalWarmer.updateConfig(config)
    return globalWarmer
  }

  globalWarmer = new ConnectionWarmer(config)
  globalWarmer.start()
  
  return globalWarmer
}

/**
 * Get global connection warmer
 */
export function getConnectionWarmer(): ConnectionWarmer | null {
  return globalWarmer
}

/**
 * Stop global connection warming
 */
export function stopConnectionWarming(): void {
  if (globalWarmer) {
    globalWarmer.stop()
    globalWarmer = null
  }
}

/**
 * Performance Monitor for Cache Operations
 *
 * Monitors and tracks performance metrics for cache operations:
 * - Operation timing and latency tracking
 * - Memory usage monitoring
 * - Throughput measurement
 * - Performance bottleneck detection
 * - Real-time performance alerts
 */

import { createLogger } from '@repo/logger'

const logger = createLogger('PerformanceMonitor')

export interface PerformanceMetrics {
  operationCount: number
  averageLatency: number
  minLatency: number
  maxLatency: number
  p95Latency: number
  p99Latency: number
  throughput: number // operations per second
  memoryUsage: number
  cpuUsage: number
  errorRate: number
}

export interface PerformanceAlert {
  type: 'latency' | 'throughput' | 'memory' | 'error'
  severity: 'warning' | 'critical'
  message: string
  value: number
  threshold: number
  timestamp: number
}

export class PerformanceMonitor {
  private operationTimes: number[] = []
  private operationCount = 0
  private errorCount = 0
  private startTime = Date.now()
  private alerts: PerformanceAlert[] = []
  private thresholds = {
    maxLatency: 1000, // 1 second
    minThroughput: 10, // 10 ops/sec
    maxMemoryUsage: 0.9, // 90%
    maxErrorRate: 0.05, // 5%
  }

  /**
   * Start timing an operation
   */
  startOperation(): () => void {
    const startTime = performance.now()

    return () => {
      const duration = performance.now() - startTime
      this.recordOperation(duration)
    }
  }

  /**
   * Record an operation duration
   */
  recordOperation(duration: number): void {
    this.operationTimes.push(duration)
    this.operationCount++

    // Keep only recent operations (last 1000)
    if (this.operationTimes.length > 1000) {
      this.operationTimes = this.operationTimes.slice(-1000)
    }

    // Check for performance alerts
    this.checkPerformanceAlerts(duration)
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const sortedTimes = [...this.operationTimes].sort((a, b) => a - b)
    const totalTime = this.operationTimes.reduce((sum, time) => sum + time, 0)
    const elapsedTime = (Date.now() - this.startTime) / 1000 // seconds

    return {
      operationCount: this.operationCount,
      averageLatency: totalTime / Math.max(this.operationTimes.length, 1),
      minLatency: Math.min(...this.operationTimes) || 0,
      maxLatency: Math.max(...this.operationTimes) || 0,
      p95Latency: this.calculatePercentile(sortedTimes, 0.95),
      p99Latency: this.calculatePercentile(sortedTimes, 0.99),
      throughput: this.operationCount / Math.max(elapsedTime, 1),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      errorRate: this.errorCount / Math.max(this.operationCount, 1),
    }
  }

  /**
   * Get recent performance alerts
   */
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts]
  }

  /**
   * Clear performance alerts
   */
  clearAlerts(): void {
    this.alerts = []
  }

  /**
   * Update performance thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds }
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0

    const index = Math.ceil(sortedArray.length * percentile) - 1
    return sortedArray[Math.max(0, index)]
  }

  /**
   * Get memory usage (browser environment)
   */
  private getMemoryUsage(): number {
    if (
      typeof window !== 'undefined' &&
      'performance' in window &&
      'memory' in window.performance
    ) {
      const memory = (window.performance as any).memory
      return memory.usedJSHeapSize / memory.jsHeapSizeLimit
    }
    return 0
  }

  /**
   * Get CPU usage estimate (simplified)
   */
  private getCpuUsage(): number {
    // Simplified CPU usage estimation based on operation frequency
    const recentOps = this.operationTimes.slice(-100)
    const avgLatency =
      recentOps.reduce((sum, time) => sum + time, 0) / Math.max(recentOps.length, 1)

    // Normalize to 0-1 scale (higher latency suggests higher CPU usage)
    return Math.min(avgLatency / 100, 1)
  }

  /**
   * Check for performance alerts
   */
  private checkPerformanceAlerts(latency: number): void {
    const metrics = this.getMetrics()
    const now = Date.now()

    // Latency alert
    if (latency > this.thresholds.maxLatency) {
      this.addAlert({
        type: 'latency',
        severity: latency > this.thresholds.maxLatency * 2 ? 'critical' : 'warning',
        message: `High operation latency detected: ${latency.toFixed(2)}ms`,
        value: latency,
        threshold: this.thresholds.maxLatency,
        timestamp: now,
      })
    }

    // Throughput alert
    if (metrics.throughput < this.thresholds.minThroughput) {
      this.addAlert({
        type: 'throughput',
        severity: metrics.throughput < this.thresholds.minThroughput * 0.5 ? 'critical' : 'warning',
        message: `Low throughput detected: ${metrics.throughput.toFixed(2)} ops/sec`,
        value: metrics.throughput,
        threshold: this.thresholds.minThroughput,
        timestamp: now,
      })
    }

    // Memory alert
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.addAlert({
        type: 'memory',
        severity: metrics.memoryUsage > 0.95 ? 'critical' : 'warning',
        message: `High memory usage detected: ${(metrics.memoryUsage * 100).toFixed(1)}%`,
        value: metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: now,
      })
    }

    // Error rate alert
    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      this.addAlert({
        type: 'error',
        severity: metrics.errorRate > this.thresholds.maxErrorRate * 2 ? 'critical' : 'warning',
        message: `High error rate detected: ${(metrics.errorRate * 100).toFixed(1)}%`,
        value: metrics.errorRate,
        threshold: this.thresholds.maxErrorRate,
        timestamp: now,
      })
    }
  }

  /**
   * Add performance alert
   */
  private addAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert)

    // Keep only recent alerts (last 100)
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100)
    }

    // Log critical alerts
    if (alert.severity === 'critical') {
      logger.warn('Critical performance alert', undefined, alert)
    }
  }

  /**
   * Reset performance metrics
   */
  reset(): void {
    this.operationTimes = []
    this.operationCount = 0
    this.errorCount = 0
    this.startTime = Date.now()
    this.alerts = []
  }
}

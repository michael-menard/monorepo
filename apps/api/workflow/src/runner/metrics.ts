/**
 * Node execution metrics module.
 *
 * Provides structured metrics capture for node execution, including:
 * - Execution counts (success, failure, retry)
 * - Duration tracking with percentiles (p50, p90, p99)
 * - Error categorization
 * - Threshold-based event callbacks
 *
 * Adapted from @repo/api-client RetryMetrics pattern.
 *
 * AC-1: NodeMetrics Zod schema with per-node metrics fields
 * AC-2: NodeMetricsCollector class with recording methods
 * AC-8: Duration percentiles from rolling window
 * AC-12: Configurable windowSize
 * AC-15: Failure counts by error category
 * AC-16: toJSON() method for serializable snapshot
 * AC-17: Threshold events for failure rate and latency
 */

import { z } from 'zod'
import { createLogger } from '@repo/logger'

const logger = createLogger('orchestrator:metrics')

// ============================================================================
// Zod Schemas (AC-1, AC-15)
// ============================================================================

/**
 * Error category for failure tracking in metrics.
 * AC-15: Track failures by category.
 *
 * Note: Named MetricsErrorCategory to avoid conflict with ErrorCategory
 * from error-classification.ts (which has more categories for retry logic).
 */
export const MetricsErrorCategorySchema = z.enum(['timeout', 'validation', 'network', 'other'])
export type MetricsErrorCategory = z.infer<typeof MetricsErrorCategorySchema>

/**
 * Node metrics schema.
 * AC-1: Per-node metrics fields.
 */
export const NodeMetricsSchema = z.object({
  /** Total number of executions */
  totalExecutions: z.number().int().min(0),
  /** Number of successful executions */
  successCount: z.number().int().min(0),
  /** Number of failed executions */
  failureCount: z.number().int().min(0),
  /** Number of retry attempts */
  retryCount: z.number().int().min(0),
  /** Duration of last execution in milliseconds */
  lastExecutionMs: z.number().nullable(),
  /** Average execution duration in milliseconds */
  avgExecutionMs: z.number(),
  /** 50th percentile duration (median) */
  p50: z.number().nullable(),
  /** 90th percentile duration */
  p90: z.number().nullable(),
  /** 99th percentile duration */
  p99: z.number().nullable(),
  /** Number of timeout errors (AC-15) */
  timeoutErrors: z.number().int().min(0),
  /** Number of validation errors (AC-15) */
  validationErrors: z.number().int().min(0),
  /** Number of network errors (AC-15) */
  networkErrors: z.number().int().min(0),
  /** Number of other errors (AC-15) */
  otherErrors: z.number().int().min(0),
})

export type NodeMetrics = z.infer<typeof NodeMetricsSchema>

/**
 * Threshold configuration schema.
 * AC-17: Threshold-based event callbacks.
 */
export const ThresholdConfigSchema = z.object({
  /** Failure rate threshold (0-1) - triggers onFailureRateThreshold when exceeded */
  failureRateThreshold: z.number().min(0).max(1).optional(),
  /** Latency threshold in ms - triggers onLatencyThreshold when p99 exceeds this */
  latencyThresholdMs: z.number().min(0).optional(),
})

export type ThresholdConfig = z.infer<typeof ThresholdConfigSchema>

/**
 * Serialized metrics schema for JSON export.
 * AC-16: toJSON() returns JSON-serializable snapshot.
 */
export const SerializedMetricsSchema = z.record(z.string(), NodeMetricsSchema)
export type SerializedMetrics = z.infer<typeof SerializedMetricsSchema>

/**
 * Callback invoked when failure rate exceeds threshold.
 * AC-17: onFailureRateThreshold callback.
 */
export type OnFailureRateThresholdCallback = (nodeName: string, rate: number) => void

/**
 * Callback invoked when latency exceeds threshold.
 * AC-17: onLatencyThreshold callback.
 */
export type OnLatencyThresholdCallback = (nodeName: string, p99: number) => void

/**
 * Node metrics collector configuration.
 * AC-12: Configurable windowSize.
 * AC-17: Threshold configuration and callbacks.
 */
export interface NodeMetricsCollectorConfig {
  /** Size of rolling window for percentile calculations (default: 100) */
  windowSize?: number
  /** Failure rate threshold (0-1) */
  failureRateThreshold?: number
  /** Latency threshold in milliseconds */
  latencyThresholdMs?: number
  /** Callback when failure rate exceeds threshold */
  onFailureRateThreshold?: OnFailureRateThresholdCallback
  /** Callback when p99 latency exceeds threshold */
  onLatencyThreshold?: OnLatencyThresholdCallback
}

// ============================================================================
// Rolling Window (AC-8, AC-12)
// ============================================================================

/**
 * Rolling window for tracking duration samples and calculating percentiles.
 * Evicts oldest samples when at capacity.
 *
 * AC-8: Duration percentiles p50, p90, p99.
 * AC-12: Configurable windowSize.
 */
class RollingWindow {
  private readonly maxSize: number
  private samples: number[] = []

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize
  }

  /**
   * Add a sample to the window.
   * Evicts oldest sample if at capacity.
   */
  add(value: number): void {
    if (this.samples.length >= this.maxSize) {
      this.samples.shift()
    }
    this.samples.push(value)
  }

  /**
   * Calculate percentile from current samples.
   * @param p - Percentile value (0-100)
   * @returns Percentile value or null if no samples
   */
  getPercentile(p: number): number | null {
    if (this.samples.length === 0) {
      return null
    }

    // Sort samples for percentile calculation
    const sorted = [...this.samples].sort((a, b) => a - b)

    // Handle single sample case
    if (sorted.length === 1) {
      return sorted[0]
    }

    // Calculate percentile index
    const index = Math.floor((p / 100) * (sorted.length - 1))
    return sorted[index]
  }

  /**
   * Get all current percentiles.
   */
  getPercentiles(): { p50: number | null; p90: number | null; p99: number | null } {
    return {
      p50: this.getPercentile(50),
      p90: this.getPercentile(90),
      p99: this.getPercentile(99),
    }
  }

  /**
   * Clear all samples.
   */
  clear(): void {
    this.samples = []
  }

  /**
   * Get current sample count.
   */
  get length(): number {
    return this.samples.length
  }
}

// ============================================================================
// Internal Node Metrics State
// ============================================================================

/**
 * Internal metrics state for a single node.
 */
interface InternalNodeMetrics {
  totalExecutions: number
  successCount: number
  failureCount: number
  retryCount: number
  lastExecutionMs: number | null
  totalDurationMs: number
  timeoutErrors: number
  validationErrors: number
  networkErrors: number
  otherErrors: number
}

/**
 * Creates default internal metrics.
 */
function createDefaultInternalMetrics(): InternalNodeMetrics {
  return {
    totalExecutions: 0,
    successCount: 0,
    failureCount: 0,
    retryCount: 0,
    lastExecutionMs: null,
    totalDurationMs: 0,
    timeoutErrors: 0,
    validationErrors: 0,
    networkErrors: 0,
    otherErrors: 0,
  }
}

/**
 * Creates default (empty) node metrics.
 */
function createDefaultNodeMetrics(): NodeMetrics {
  return {
    totalExecutions: 0,
    successCount: 0,
    failureCount: 0,
    retryCount: 0,
    lastExecutionMs: null,
    avgExecutionMs: 0,
    p50: null,
    p90: null,
    p99: null,
    timeoutErrors: 0,
    validationErrors: 0,
    networkErrors: 0,
    otherErrors: 0,
  }
}

// ============================================================================
// NodeMetricsCollector (AC-2, AC-3, AC-4, AC-5, AC-12, AC-13, AC-14)
// ============================================================================

/**
 * Collects and aggregates metrics for node executions.
 *
 * AC-2: Recording methods (recordSuccess, recordFailure, recordRetry)
 * AC-3: getNodeMetrics(nodeName) returns metrics for specific node
 * AC-4: getAllNodeMetrics() returns Map of all node metrics
 * AC-5: resetNodeMetrics(nodeName?) clears metrics
 * AC-12: Configurable windowSize
 * AC-13: Async-safe metric recording
 * AC-14: Negative durationMs clamped to 0 with warning
 */
export class NodeMetricsCollector {
  private readonly metrics: Map<string, InternalNodeMetrics> = new Map()
  private readonly windows: Map<string, RollingWindow> = new Map()
  private readonly windowSize: number
  private readonly failureRateThreshold?: number
  private readonly latencyThresholdMs?: number
  private readonly onFailureRateThreshold?: OnFailureRateThresholdCallback
  private readonly onLatencyThreshold?: OnLatencyThresholdCallback

  constructor(config: NodeMetricsCollectorConfig = {}) {
    this.windowSize = config.windowSize ?? 100
    this.failureRateThreshold = config.failureRateThreshold
    this.latencyThresholdMs = config.latencyThresholdMs
    this.onFailureRateThreshold = config.onFailureRateThreshold
    this.onLatencyThreshold = config.onLatencyThreshold
  }

  /**
   * Validates and clamps duration.
   * AC-14: Negative durationMs clamped to 0 with warning.
   */
  private validateDuration(durationMs: number, nodeName: string): number {
    if (durationMs < 0) {
      logger.warn(
        `Negative duration (${durationMs}ms) recorded for node "${nodeName}", clamping to 0`,
      )
      return 0
    }
    return durationMs
  }

  /**
   * Gets or creates metrics for a node.
   */
  private getOrCreateMetrics(nodeName: string): InternalNodeMetrics {
    let metrics = this.metrics.get(nodeName)
    if (!metrics) {
      metrics = createDefaultInternalMetrics()
      this.metrics.set(nodeName, metrics)
    }
    return metrics
  }

  /**
   * Gets or creates rolling window for a node.
   */
  private getOrCreateWindow(nodeName: string): RollingWindow {
    let window = this.windows.get(nodeName)
    if (!window) {
      window = new RollingWindow(this.windowSize)
      this.windows.set(nodeName, window)
    }
    return window
  }

  /**
   * Checks thresholds and invokes callbacks if exceeded.
   * AC-17: Threshold events.
   */
  private checkThresholds(nodeName: string): void {
    const metrics = this.metrics.get(nodeName)
    if (!metrics) return

    // Check failure rate threshold
    if (
      this.failureRateThreshold !== undefined &&
      this.onFailureRateThreshold &&
      metrics.totalExecutions > 0
    ) {
      const failureRate = metrics.failureCount / metrics.totalExecutions
      if (failureRate > this.failureRateThreshold) {
        this.onFailureRateThreshold(nodeName, failureRate)
      }
    }

    // Check latency threshold
    if (this.latencyThresholdMs !== undefined && this.onLatencyThreshold) {
      const window = this.windows.get(nodeName)
      if (window) {
        const p99 = window.getPercentile(99)
        if (p99 !== null && p99 > this.latencyThresholdMs) {
          this.onLatencyThreshold(nodeName, p99)
        }
      }
    }
  }

  /**
   * Records a successful node execution.
   * AC-2: recordSuccess method.
   * AC-13: Safe for concurrent async calls.
   *
   * @param nodeName - Name of the node
   * @param durationMs - Execution duration in milliseconds
   */
  recordSuccess(nodeName: string, durationMs: number): void {
    const duration = this.validateDuration(durationMs, nodeName)
    const metrics = this.getOrCreateMetrics(nodeName)
    const window = this.getOrCreateWindow(nodeName)

    metrics.totalExecutions++
    metrics.successCount++
    metrics.lastExecutionMs = duration
    metrics.totalDurationMs += duration

    window.add(duration)

    this.checkThresholds(nodeName)
  }

  /**
   * Records a failed node execution.
   * AC-2: recordFailure method.
   * AC-13: Safe for concurrent async calls.
   * AC-15: Tracks error category.
   *
   * @param nodeName - Name of the node
   * @param durationMs - Execution duration in milliseconds
   * @param _error - Optional error object (unused, for future extension)
   * @param errorType - Optional error category (defaults to 'other')
   */
  recordFailure(
    nodeName: string,
    durationMs: number,
    _error?: unknown,
    errorType: MetricsErrorCategory = 'other',
  ): void {
    const duration = this.validateDuration(durationMs, nodeName)
    const metrics = this.getOrCreateMetrics(nodeName)
    const window = this.getOrCreateWindow(nodeName)

    metrics.totalExecutions++
    metrics.failureCount++
    metrics.lastExecutionMs = duration
    metrics.totalDurationMs += duration

    // Increment error category counter (AC-15)
    switch (errorType) {
      case 'timeout':
        metrics.timeoutErrors++
        break
      case 'validation':
        metrics.validationErrors++
        break
      case 'network':
        metrics.networkErrors++
        break
      case 'other':
      default:
        metrics.otherErrors++
        break
    }

    window.add(duration)

    this.checkThresholds(nodeName)
  }

  /**
   * Records a retry attempt.
   * AC-2: recordRetry method.
   * AC-13: Safe for concurrent async calls.
   *
   * @param nodeName - Name of the node
   * @param _attemptNumber - Retry attempt number (1-indexed, unused for now)
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  recordRetry(nodeName: string, attemptNumber: number): void {
    const metrics = this.getOrCreateMetrics(nodeName)
    metrics.retryCount++
    // Note: attemptNumber is available for future use (e.g., tracking retry distributions)
  }

  /**
   * Gets metrics for a specific node.
   * AC-3: Returns NodeMetrics for that node.
   *
   * @param nodeName - Name of the node
   * @returns NodeMetrics for the node (default empty metrics if unknown)
   */
  getNodeMetrics(nodeName: string): NodeMetrics {
    const metrics = this.metrics.get(nodeName)
    const window = this.windows.get(nodeName)

    if (!metrics) {
      return createDefaultNodeMetrics()
    }

    const percentiles = window?.getPercentiles() ?? { p50: null, p90: null, p99: null }
    const avgExecutionMs =
      metrics.totalExecutions > 0 ? metrics.totalDurationMs / metrics.totalExecutions : 0

    return {
      totalExecutions: metrics.totalExecutions,
      successCount: metrics.successCount,
      failureCount: metrics.failureCount,
      retryCount: metrics.retryCount,
      lastExecutionMs: metrics.lastExecutionMs,
      avgExecutionMs,
      p50: percentiles.p50,
      p90: percentiles.p90,
      p99: percentiles.p99,
      timeoutErrors: metrics.timeoutErrors,
      validationErrors: metrics.validationErrors,
      networkErrors: metrics.networkErrors,
      otherErrors: metrics.otherErrors,
    }
  }

  /**
   * Gets metrics for all nodes.
   * AC-4: Returns Map of all node metrics.
   *
   * @returns Map of node name to NodeMetrics
   */
  getAllNodeMetrics(): Map<string, NodeMetrics> {
    const result = new Map<string, NodeMetrics>()
    for (const nodeName of this.metrics.keys()) {
      result.set(nodeName, this.getNodeMetrics(nodeName))
    }
    return result
  }

  /**
   * Resets metrics for a specific node or all nodes.
   * AC-5: Clears metrics.
   *
   * @param nodeName - Optional node name. If omitted, resets all nodes.
   */
  resetNodeMetrics(nodeName?: string): void {
    if (nodeName) {
      this.metrics.delete(nodeName)
      this.windows.delete(nodeName)
    } else {
      this.metrics.clear()
      this.windows.clear()
    }
  }

  /**
   * Returns a JSON-serializable snapshot of all node metrics.
   * AC-16: toJSON() method.
   *
   * @returns Serializable metrics object
   */
  toJSON(): SerializedMetrics {
    const result: SerializedMetrics = {}
    for (const nodeName of this.metrics.keys()) {
      result[nodeName] = this.getNodeMetrics(nodeName)
    }
    return result
  }
}

// ============================================================================
// Factory Function (AC-9)
// ============================================================================

/**
 * Creates a new NodeMetricsCollector instance.
 * AC-9: Factory function exported from @repo/orchestrator.
 *
 * @param config - Optional configuration
 * @returns New NodeMetricsCollector instance
 *
 * @example
 * ```typescript
 * import { createNodeMetricsCollector } from '@repo/orchestrator'
 *
 * const collector = createNodeMetricsCollector({ windowSize: 200 })
 * collector.recordSuccess('my-node', 150)
 * const metrics = collector.getNodeMetrics('my-node')
 * ```
 */
export function createNodeMetricsCollector(
  config?: NodeMetricsCollectorConfig,
): NodeMetricsCollector {
  return new NodeMetricsCollector(config)
}

/**
 * Configuration types for node runner infrastructure.
 *
 * All types are defined as Zod schemas with inferred TypeScript types,
 * following the project convention of Zod-first types.
 */

import { z } from 'zod'
import type { NodeMetricsCollector } from './metrics.js'

/**
 * Retry event callback type.
 * AC-23: onRetryAttempt callback.
 */
export type OnRetryAttemptCallback = (attempt: number, error: Error, delayMs: number) => void

/**
 * Timeout cleanup callback type.
 * AC-19: onTimeout cleanup callback.
 */
export type OnTimeoutCallback = (nodeName: string, context: NodeExecutionContext) => void

/**
 * Schema for node retry configuration.
 * AC-5: Configurable retry strategies.
 * AC-18: Retry jitter.
 * AC-23: onRetryAttempt callback.
 */
export const NodeRetryConfigSchema = z.object({
  /** Maximum number of retry attempts (default: 3) */
  maxAttempts: z.number().int().min(1).default(3),
  /** Base backoff delay in milliseconds (default: 1000) */
  backoffMs: z.number().min(0).default(1000),
  /** Backoff multiplier for exponential backoff (default: 2) */
  backoffMultiplier: z.number().min(1).default(2),
  /** Maximum backoff delay in milliseconds (default: 30000) */
  maxBackoffMs: z.number().min(0).default(30000),
  /** Optional node execution timeout in milliseconds */
  timeoutMs: z.number().min(0).optional(),
  /** Jitter factor (0-1) for retry delay variance (default: 0.25) */
  jitterFactor: z.number().min(0).max(1).default(0.25),
})

export type NodeRetryConfig = z.infer<typeof NodeRetryConfigSchema>
export type NodeRetryConfigInput = z.input<typeof NodeRetryConfigSchema>

/**
 * Schema for circuit breaker configuration.
 * AC-21: Circuit breaker pattern.
 */
export const CircuitBreakerConfigSchema = z.object({
  /** Number of failures before circuit opens (default: 5) */
  failureThreshold: z.number().int().min(1).default(5),
  /** Time in ms before attempting recovery (default: 60000) */
  recoveryTimeoutMs: z.number().min(0).default(60000),
})

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>
export type CircuitBreakerConfigInput = z.input<typeof CircuitBreakerConfigSchema>

/**
 * Schema for node execution context.
 * AC-22: Node execution context with observability metadata.
 */
export const NodeExecutionContextSchema = z.object({
  /** Unique trace ID for distributed tracing */
  traceId: z.string().min(1),
  /** Unique ID for this graph execution */
  graphExecutionId: z.string().min(1),
  /** Current retry attempt (1-indexed) */
  retryAttempt: z.number().int().min(1).default(1),
  /** Maximum retry attempts */
  maxRetryAttempts: z.number().int().min(1).default(3),
  /** Parent node ID if this is a nested node call */
  parentNodeId: z.string().optional(),
  /** Start timestamp of node execution */
  startTime: z.number(),
  /** Story ID from GraphState */
  storyId: z.string().min(1),
})

export type NodeExecutionContext = z.infer<typeof NodeExecutionContextSchema>
export type NodeExecutionContextInput = z.input<typeof NodeExecutionContextSchema>

/**
 * Schema for node configuration.
 * AC-1: createNode() factory configuration.
 * WRKF-1021: Added metricsCollector for optional metrics capture.
 */
export const NodeConfigSchema = z.object({
  /** Unique name for the node (used in logging and error reporting) */
  name: z.string().min(1, 'Node name is required'),
  /** Retry configuration */
  retry: NodeRetryConfigSchema.optional(),
  /** Circuit breaker configuration */
  circuitBreaker: CircuitBreakerConfigSchema.optional(),
  /** Optional timeout cleanup callback */
  // Note: Functions and class instances cannot be validated by Zod at runtime,
  // so we use z.any(). Type safety is enforced by TypeScript at compile time.
  onTimeout: z.any().optional(),
  /** Optional retry attempt callback */
  onRetryAttempt: z.any().optional(),
  /** Optional metrics collector for recording node execution metrics (WRKF-1021) */
  metricsCollector: z.any().optional(),
})

export type NodeConfig = Omit<
  z.infer<typeof NodeConfigSchema>,
  'onTimeout' | 'onRetryAttempt' | 'metricsCollector'
> & {
  onTimeout?: OnTimeoutCallback
  onRetryAttempt?: OnRetryAttemptCallback
  metricsCollector?: NodeMetricsCollector
}

export type NodeConfigInput = Omit<
  z.input<typeof NodeConfigSchema>,
  'onTimeout' | 'onRetryAttempt' | 'metricsCollector'
> & {
  onTimeout?: OnTimeoutCallback
  onRetryAttempt?: OnRetryAttemptCallback
  metricsCollector?: NodeMetricsCollector
}

/**
 * Default retry configuration values.
 * Suitable for general node types.
 */
export const DEFAULT_RETRY_CONFIG: NodeRetryConfig = NodeRetryConfigSchema.parse({})

/**
 * Preset retry configurations for different node types.
 */
export const RETRY_PRESETS = {
  /** LLM nodes: higher maxAttempts, longer backoff, 60s timeout */
  llm: NodeRetryConfigSchema.parse({
    maxAttempts: 5,
    backoffMs: 2000,
    backoffMultiplier: 2,
    maxBackoffMs: 60000,
    timeoutMs: 60000,
    jitterFactor: 0.25,
  }),
  /** Tool nodes: lower maxAttempts, shorter backoff, 10s timeout */
  tool: NodeRetryConfigSchema.parse({
    maxAttempts: 2,
    backoffMs: 500,
    backoffMultiplier: 2,
    maxBackoffMs: 10000,
    timeoutMs: 10000,
    jitterFactor: 0.25,
  }),
  /** Validation nodes: no retry, 5s timeout */
  validation: NodeRetryConfigSchema.parse({
    maxAttempts: 1,
    backoffMs: 0,
    backoffMultiplier: 1,
    maxBackoffMs: 0,
    timeoutMs: 5000,
    jitterFactor: 0,
  }),
} as const

/**
 * Default circuit breaker configuration values.
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig =
  CircuitBreakerConfigSchema.parse({})

/**
 * Generates a unique trace ID.
 * Uses crypto.randomUUID if available, falls back to timestamp-based ID.
 */
export function generateTraceId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Generates a unique graph execution ID.
 */
export function generateGraphExecutionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `exec-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
}

/**
 * Creates an initial node execution context.
 * AC-22: Node execution context.
 */
export function createNodeExecutionContext(params: {
  storyId: string
  traceId?: string
  graphExecutionId?: string
  parentNodeId?: string
  maxRetryAttempts?: number
}): NodeExecutionContext {
  return NodeExecutionContextSchema.parse({
    traceId: params.traceId ?? generateTraceId(),
    graphExecutionId: params.graphExecutionId ?? generateGraphExecutionId(),
    retryAttempt: 1,
    maxRetryAttempts: params.maxRetryAttempts ?? 3,
    parentNodeId: params.parentNodeId,
    startTime: Date.now(),
    storyId: params.storyId,
  })
}

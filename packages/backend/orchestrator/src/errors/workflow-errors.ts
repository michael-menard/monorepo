/**
 * workflow-errors.ts
 *
 * Zod schemas for all workflow error types. This is the single source of truth
 * for error contracts between Claude workflow and LangGraph orchestrator.
 *
 * Error types:
 * - AGENT_SPAWN_FAILED: Task tool failed to spawn agent
 * - AGENT_TIMEOUT: Agent exceeded time limit
 * - MALFORMED_OUTPUT: Agent output doesn't match expected schema
 * - PRECONDITION_FAILED: Required input missing or invalid
 * - EXTERNAL_SERVICE_DOWN: KB, git, or other external service unavailable
 *
 * @module errors/workflow-errors
 */

import { z } from 'zod'

// ============================================================================
// Error Type Enum
// ============================================================================

/**
 * All workflow error types.
 * Claude agents reference these types in error handling sections.
 */
export const WorkflowErrorTypeSchema = z.enum([
  'AGENT_SPAWN_FAILED',
  'AGENT_TIMEOUT',
  'MALFORMED_OUTPUT',
  'PRECONDITION_FAILED',
  'EXTERNAL_SERVICE_DOWN',
])

export type WorkflowErrorType = z.infer<typeof WorkflowErrorTypeSchema>

// ============================================================================
// Error Configuration
// ============================================================================

/**
 * Configuration for error retry behavior.
 */
export const ErrorRetryConfigSchema = z.object({
  /** Whether this error type can be retried */
  retryable: z.boolean(),
  /** Maximum retry attempts (0 = no retries) */
  maxRetries: z.number().int().min(0).default(0),
  /** Base delay between retries in milliseconds */
  baseDelayMs: z.number().int().min(0).default(1000),
  /** Whether to use exponential backoff */
  exponentialBackoff: z.boolean().default(false),
  /** Maximum delay between retries in milliseconds */
  maxDelayMs: z.number().int().min(0).default(30000),
})

export type ErrorRetryConfig = z.infer<typeof ErrorRetryConfigSchema>

/**
 * Default retry configurations per error type.
 */
export const ERROR_RETRY_DEFAULTS: Record<WorkflowErrorType, ErrorRetryConfig> = {
  AGENT_SPAWN_FAILED: {
    retryable: true,
    maxRetries: 1,
    baseDelayMs: 2000,
    exponentialBackoff: false,
    maxDelayMs: 5000,
  },
  AGENT_TIMEOUT: {
    retryable: false,
    maxRetries: 0,
    baseDelayMs: 0,
    exponentialBackoff: false,
    maxDelayMs: 0,
  },
  MALFORMED_OUTPUT: {
    retryable: true,
    maxRetries: 2,
    baseDelayMs: 1000,
    exponentialBackoff: false,
    maxDelayMs: 5000,
  },
  PRECONDITION_FAILED: {
    retryable: false,
    maxRetries: 0,
    baseDelayMs: 0,
    exponentialBackoff: false,
    maxDelayMs: 0,
  },
  EXTERNAL_SERVICE_DOWN: {
    retryable: true,
    maxRetries: 3,
    baseDelayMs: 5000,
    exponentialBackoff: true,
    maxDelayMs: 60000,
  },
}

// ============================================================================
// Error Recovery Actions
// ============================================================================

/**
 * Actions that can be taken when an error occurs.
 */
export const ErrorRecoveryActionSchema = z.enum([
  'RETRY',           // Retry the operation
  'FAIL_PHASE',      // Mark the phase as failed
  'SKIP',            // Skip and continue to next operation
  'FALLBACK',        // Use fallback behavior
  'MANUAL',          // Require manual intervention
  'CIRCUIT_BREAK',   // Open circuit breaker, prevent further attempts
])

export type ErrorRecoveryAction = z.infer<typeof ErrorRecoveryActionSchema>

/**
 * Default recovery actions per error type.
 */
export const ERROR_RECOVERY_DEFAULTS: Record<WorkflowErrorType, ErrorRecoveryAction> = {
  AGENT_SPAWN_FAILED: 'RETRY',
  AGENT_TIMEOUT: 'FAIL_PHASE',
  MALFORMED_OUTPUT: 'RETRY',
  PRECONDITION_FAILED: 'FAIL_PHASE',
  EXTERNAL_SERVICE_DOWN: 'FALLBACK',
}

// ============================================================================
// Workflow Error Schema
// ============================================================================

/**
 * Complete workflow error with all metadata.
 * This is the structure written to ERROR-LOG.yaml and emitted in traces.
 */
export const WorkflowErrorSchema = z.object({
  /** Error type from the enum */
  type: WorkflowErrorTypeSchema,

  /** Phase where the error occurred (e.g., "dev-implementation", "qa-verify") */
  phase: z.string().min(1),

  /** Node/agent that experienced the error */
  node: z.string().min(1),

  /** Human-readable error message */
  message: z.string().min(1),

  /** Original error message if wrapped */
  originalError: z.string().optional(),

  /** Whether the operation can be retried */
  retryable: z.boolean(),

  /** Current retry attempt (0-indexed) */
  retryCount: z.number().int().min(0).default(0),

  /** Maximum retry attempts allowed */
  maxRetries: z.number().int().min(0).default(3),

  /** ISO-8601 timestamp when error occurred */
  timestamp: z.string().datetime(),

  /** Recovery action taken or recommended */
  recovery: ErrorRecoveryActionSchema.optional(),

  /** Additional context for debugging */
  context: z.record(z.unknown()).optional(),

  /** Stack trace (sanitized) */
  stack: z.string().optional(),
})

export type WorkflowError = z.infer<typeof WorkflowErrorSchema>

// ============================================================================
// Circuit Breaker Schema
// ============================================================================

/**
 * Circuit breaker state for error handling.
 */
export const CircuitBreakerStateSchema = z.enum(['CLOSED', 'OPEN', 'HALF_OPEN'])

export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>

/**
 * Circuit breaker configuration.
 */
export const CircuitBreakerConfigSchema = z.object({
  /** Number of failures before opening circuit */
  failureThreshold: z.number().int().min(1).default(3),

  /** Time in ms before attempting recovery (half-open) */
  recoveryTimeMs: z.number().int().min(0).default(60000),

  /** Number of successes in half-open to close circuit */
  successThreshold: z.number().int().min(1).default(1),

  /** Window in ms for counting failures */
  failureWindowMs: z.number().int().min(0).default(300000),
})

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>

/**
 * Default circuit breaker configuration.
 * After 3 consecutive failures of the same type within a phase:
 * 1. Stop retrying
 * 2. Write ERROR-LOG.yaml to _implementation/
 * 3. Set story status to blocked
 * 4. Require manual intervention
 */
export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 3,
  recoveryTimeMs: 60000, // 1 minute
  successThreshold: 1,
  failureWindowMs: 300000, // 5 minutes
}

// ============================================================================
// Error Log Schema
// ============================================================================

/**
 * Schema for ERROR-LOG.yaml written to _implementation/ directory.
 */
export const ErrorLogSchema = z.object({
  /** Story ID this log belongs to */
  storyId: z.string().min(1),

  /** Phase where errors occurred */
  phase: z.string().min(1),

  /** Timestamp when log was created */
  createdAt: z.string().datetime(),

  /** Timestamp when log was last updated */
  updatedAt: z.string().datetime(),

  /** List of errors that occurred */
  errors: z.array(WorkflowErrorSchema),

  /** Circuit breaker state if applicable */
  circuitState: CircuitBreakerStateSchema.optional(),

  /** Whether manual intervention is required */
  requiresIntervention: z.boolean().default(false),

  /** Notes about resolution */
  resolutionNotes: z.string().optional(),
})

export type ErrorLog = z.infer<typeof ErrorLogSchema>

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new WorkflowError with proper defaults.
 */
export function createWorkflowError(params: {
  type: WorkflowErrorType
  phase: string
  node: string
  message: string
  originalError?: string
  context?: Record<string, unknown>
  stack?: string
}): WorkflowError {
  const retryConfig = ERROR_RETRY_DEFAULTS[params.type]

  return WorkflowErrorSchema.parse({
    type: params.type,
    phase: params.phase,
    node: params.node,
    message: params.message,
    originalError: params.originalError,
    retryable: retryConfig.retryable,
    retryCount: 0,
    maxRetries: retryConfig.maxRetries,
    timestamp: new Date().toISOString(),
    recovery: ERROR_RECOVERY_DEFAULTS[params.type],
    context: params.context,
    stack: params.stack,
  })
}

/**
 * Creates a new ErrorLog for a story/phase.
 */
export function createErrorLog(params: {
  storyId: string
  phase: string
  errors?: WorkflowError[]
}): ErrorLog {
  const now = new Date().toISOString()

  return ErrorLogSchema.parse({
    storyId: params.storyId,
    phase: params.phase,
    createdAt: now,
    updatedAt: now,
    errors: params.errors ?? [],
    requiresIntervention: false,
  })
}

/**
 * Determines if an error should trigger circuit breaker.
 */
export function shouldOpenCircuit(
  errors: WorkflowError[],
  config: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG,
): boolean {
  const now = Date.now()
  const windowStart = now - config.failureWindowMs

  // Count recent failures
  const recentFailures = errors.filter(e => {
    const errorTime = new Date(e.timestamp).getTime()
    return errorTime >= windowStart
  })

  return recentFailures.length >= config.failureThreshold
}

/**
 * Gets the retry delay for the current attempt.
 */
export function getRetryDelay(
  errorType: WorkflowErrorType,
  attempt: number,
): number {
  const config = ERROR_RETRY_DEFAULTS[errorType]

  if (!config.retryable || attempt >= config.maxRetries) {
    return 0
  }

  if (config.exponentialBackoff) {
    const delay = config.baseDelayMs * Math.pow(2, attempt)
    return Math.min(delay, config.maxDelayMs)
  }

  return config.baseDelayMs
}

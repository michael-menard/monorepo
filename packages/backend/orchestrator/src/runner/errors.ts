/**
 * Error classes and constants for node runner infrastructure.
 *
 * Provides custom error types for timeout, cancellation, and circuit breaker scenarios,
 * plus error code constants for consistent error handling.
 */

/**
 * Error code constants for infrastructure-level errors.
 * AC-24: Error message templates with consistent formatting.
 */
export const NodeErrorCodes = {
  /** Node execution exceeded configured timeout */
  NODE_TIMEOUT: 'NODE_TIMEOUT',
  /** All retry attempts exhausted */
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  /** Validation failed (e.g., ZodError) */
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  /** Operation cancelled via AbortSignal */
  CANCELLED: 'CANCELLED',
  /** Circuit breaker is open, preventing execution */
  CIRCUIT_OPEN: 'CIRCUIT_OPEN',
  /** Unknown error occurred */
  UNKNOWN: 'UNKNOWN',
} as const

export type NodeErrorCode = (typeof NodeErrorCodes)[keyof typeof NodeErrorCodes]

/**
 * Error message templates for consistent formatting.
 * AC-24: Error message templates.
 */
export const NodeErrorMessages = {
  [NodeErrorCodes.NODE_TIMEOUT]: (nodeName: string, timeoutMs: number) =>
    `Node "${nodeName}" execution exceeded timeout of ${timeoutMs}ms`,
  [NodeErrorCodes.RETRY_EXHAUSTED]: (nodeName: string, attempts: number) =>
    `Node "${nodeName}" failed after ${attempts} attempts`,
  [NodeErrorCodes.VALIDATION_FAILED]: (nodeName: string, details: string) =>
    `Node "${nodeName}" validation failed: ${details}`,
  [NodeErrorCodes.CANCELLED]: (nodeName: string) => `Node "${nodeName}" execution was cancelled`,
  [NodeErrorCodes.CIRCUIT_OPEN]: (nodeName: string) =>
    `Node "${nodeName}" circuit breaker is open, execution blocked`,
  [NodeErrorCodes.UNKNOWN]: (nodeName: string, message: string) =>
    `Node "${nodeName}" encountered an error: ${message}`,
} as const

/**
 * Base class for node execution errors.
 * All node-specific errors extend this class.
 */
export class NodeExecutionError extends Error {
  public readonly code: NodeErrorCode
  public readonly nodeName: string
  public readonly timestamp: string

  constructor(message: string, code: NodeErrorCode, nodeName: string) {
    super(message)
    this.name = 'NodeExecutionError'
    this.code = code
    this.nodeName = nodeName
    this.timestamp = new Date().toISOString()

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, new.target.prototype)
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      nodeName: this.nodeName,
      timestamp: this.timestamp,
      stack: this.stack,
    }
  }
}

/**
 * Error thrown when node execution exceeds configured timeout.
 * AC-15: NodeTimeoutError for timeout handling.
 */
export class NodeTimeoutError extends NodeExecutionError {
  public readonly timeoutMs: number

  constructor(nodeName: string, timeoutMs: number) {
    const message = NodeErrorMessages[NodeErrorCodes.NODE_TIMEOUT](nodeName, timeoutMs)
    super(message, NodeErrorCodes.NODE_TIMEOUT, nodeName)
    this.name = 'NodeTimeoutError'
    this.timeoutMs = timeoutMs

    Object.setPrototypeOf(this, new.target.prototype)
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      timeoutMs: this.timeoutMs,
    }
  }
}

/**
 * Error thrown when node execution is cancelled via AbortSignal.
 * AC-17: Cancellation via AbortSignal.
 */
export class NodeCancellationError extends NodeExecutionError {
  constructor(nodeName: string) {
    const message = NodeErrorMessages[NodeErrorCodes.CANCELLED](nodeName)
    super(message, NodeErrorCodes.CANCELLED, nodeName)
    this.name = 'NodeCancellationError'

    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error thrown when circuit breaker is open and prevents execution.
 * AC-21: Circuit breaker pattern.
 */
export class NodeCircuitOpenError extends NodeExecutionError {
  public readonly failureCount: number
  public readonly recoveryTimeMs: number

  constructor(nodeName: string, failureCount: number, recoveryTimeMs: number) {
    const message = NodeErrorMessages[NodeErrorCodes.CIRCUIT_OPEN](nodeName)
    super(message, NodeErrorCodes.CIRCUIT_OPEN, nodeName)
    this.name = 'NodeCircuitOpenError'
    this.failureCount = failureCount
    this.recoveryTimeMs = recoveryTimeMs

    Object.setPrototypeOf(this, new.target.prototype)
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      failureCount: this.failureCount,
      recoveryTimeMs: this.recoveryTimeMs,
    }
  }
}

/**
 * Error thrown when all retry attempts are exhausted.
 * AC-6: Retry exhaustion handling.
 */
export class NodeRetryExhaustedError extends NodeExecutionError {
  public readonly attempts: number
  public readonly lastError: Error

  constructor(nodeName: string, attempts: number, lastError: Error) {
    const message = NodeErrorMessages[NodeErrorCodes.RETRY_EXHAUSTED](nodeName, attempts)
    super(message, NodeErrorCodes.RETRY_EXHAUSTED, nodeName)
    this.name = 'NodeRetryExhaustedError'
    this.attempts = attempts
    this.lastError = lastError

    Object.setPrototypeOf(this, new.target.prototype)
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      attempts: this.attempts,
      lastError: {
        name: this.lastError.name,
        message: this.lastError.message,
        stack: this.lastError.stack,
      },
    }
  }
}

/**
 * Configuration for stack trace sanitization.
 * AC-20: Stack trace sanitization.
 */
export interface StackSanitizationConfig {
  /** Maximum length of sanitized stack trace (default: 2000) */
  maxStackLength: number
  /** Whether to filter out node_modules frames (default: true) */
  filterNodeModules: boolean
  /** Whether to convert absolute paths to relative (default: true) */
  relativePaths: boolean
  /** Base path for relative path conversion */
  basePath?: string
}

const DEFAULT_STACK_SANITIZATION_CONFIG: StackSanitizationConfig = {
  maxStackLength: 2000,
  filterNodeModules: true,
  relativePaths: true,
}

/**
 * Sanitizes a stack trace according to configuration.
 * AC-20: Stack trace sanitization.
 *
 * @param stack - The raw stack trace string
 * @param config - Sanitization configuration
 * @returns Sanitized stack trace
 */
export function sanitizeStackTrace(
  stack: string | undefined,
  config: Partial<StackSanitizationConfig> = {},
): string | undefined {
  if (!stack) {
    return undefined
  }

  const fullConfig = { ...DEFAULT_STACK_SANITIZATION_CONFIG, ...config }
  let sanitized = stack

  // Filter out node_modules frames
  if (fullConfig.filterNodeModules) {
    const lines = sanitized.split('\n')
    const filteredLines = lines.filter(line => !line.includes('node_modules'))
    sanitized = filteredLines.join('\n')
  }

  // Convert absolute paths to relative
  if (fullConfig.relativePaths && fullConfig.basePath) {
    sanitized = sanitized.replace(new RegExp(fullConfig.basePath, 'g'), '.')
  }

  // Truncate to max length
  if (sanitized.length > fullConfig.maxStackLength) {
    sanitized = sanitized.slice(0, fullConfig.maxStackLength) + '\n... (truncated)'
  }

  return sanitized
}

/**
 * Wraps an unknown error value into a proper Error object.
 * Handles cases where non-Error objects are thrown.
 *
 * @param error - Any thrown value
 * @returns A proper Error object
 */
export function normalizeError(error: unknown): Error {
  if (error instanceof Error) {
    return error
  }

  if (typeof error === 'string') {
    return new Error(error)
  }

  if (typeof error === 'object' && error !== null) {
    const message = 'message' in error ? String(error.message) : JSON.stringify(error)
    return new Error(message)
  }

  return new Error(String(error))
}

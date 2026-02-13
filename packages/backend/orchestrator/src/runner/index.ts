/**
 * Runner module - exports all node runner infrastructure.
 *
 * Provides:
 * - Node factory (createNode, createSimpleNode, createLLMNode, createToolNode)
 * - Retry logic (withNodeRetry, calculateRetryDelay)
 * - Timeout handling (withTimeout, withTimeoutResult)
 * - Error handling (error classes, classification, sanitization)
 * - State helpers (updateState and field-specific helpers)
 * - Logging (createNodeLogger, createNodeLoggerWithContext)
 * - Circuit breaker (NodeCircuitBreaker)
 * - Types and configuration (schemas, presets, defaults)
 */

// Error classes and constants
export {
  NodeCancellationError,
  NodeCircuitOpenError,
  NodeErrorCodes,
  NodeErrorMessages,
  NodeExecutionError,
  NodeRetryExhaustedError,
  NodeTimeoutError,
  normalizeError,
  sanitizeStackTrace,
  type NodeErrorCode,
  type StackSanitizationConfig,
} from './errors.js'

// Error classification
export {
  classifyError,
  getErrorCategory,
  isRetryableNodeError,
  type ErrorCategory,
  type ErrorClassification,
} from './error-classification.js'

// Types and configuration
export {
  CircuitBreakerConfigSchema,
  createNodeExecutionContext,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RETRY_CONFIG,
  generateGraphExecutionId,
  generateTraceId,
  NodeConfigSchema,
  NodeExecutionContextSchema,
  NodeRetryConfigSchema,
  RETRY_PRESETS,
  type CircuitBreakerConfig,
  type CircuitBreakerConfigInput,
  type NodeConfig,
  type NodeConfigInput,
  type NodeExecutionContext,
  type NodeExecutionContextInput,
  type NodeRetryConfig,
  type NodeRetryConfigInput,
  type OnRetryAttemptCallback,
  type OnTimeoutCallback,
} from './types.js'

// Circuit breaker
export {
  NodeCircuitBreaker,
  type CircuitBreakerStatus,
  type CircuitState,
} from './circuit-breaker.js'

// Timeout handling
export {
  createTimeoutController,
  withTimeout,
  withTimeoutResult,
  type TimeoutOptions,
  type TimeoutResult,
} from './timeout.js'

// Retry logic
export {
  calculateRetryDelay,
  createRetryWrapper,
  withNodeRetry,
  wouldRetry,
  type RetryOptions,
  type RetryResult,
} from './retry.js'

// State helpers
export {
  addErrors,
  addEvidenceRefs,
  createBlockedUpdate,
  createCompleteUpdate,
  createErrorUpdate,
  createNodeError,
  mergeStateUpdates,
  updateArtifactPaths,
  updateGateDecisions,
  updateRoutingFlags,
  updateState,
  type CreateNodeErrorOptions,
  type StateUpdate,
} from './state-helpers.js'

// Logger
export { createNodeLogger, createNodeLoggerWithContext, type NodeLogger } from './logger.js'

// Node factory
export {
  createLLMNode,
  createLLMPoweredNode,
  createNode,
  createSimpleNode,
  createToolNode,
  type LLMNodeImplementation,
  type LLMPoweredNodeConfig,
  type LLMRunnableConfig,
  type NodeFunction,
  type NodeImplementation,
} from './node-factory.js'

// Metrics (WRKF-1021)
export {
  createNodeMetricsCollector,
  MetricsErrorCategorySchema,
  NodeMetricsCollector,
  NodeMetricsSchema,
  SerializedMetricsSchema,
  ThresholdConfigSchema,
  type MetricsErrorCategory,
  type NodeMetrics,
  type NodeMetricsCollectorConfig,
  type OnFailureRateThresholdCallback,
  type OnLatencyThresholdCallback,
  type SerializedMetrics,
  type ThresholdConfig,
} from './metrics.js'

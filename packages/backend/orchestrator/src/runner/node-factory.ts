/**
 * Node factory for creating LangGraph-compatible nodes.
 *
 * AC-1: createNode() factory with error handling, logging, retry wrappers.
 * AC-2: Node signature matches (state, config?) => Promise<Partial<GraphState>>.
 * AC-4: Error handler captures exceptions to state.errors.
 * AC-9: Supports both sync and async node implementations.
 * AC-12: Full type inference for state input/output.
 */

import type { RunnableConfig } from '@langchain/core/runnables'
import type { GraphState } from '../state/index.js'
import { NodeCircuitBreaker } from './circuit-breaker.js'
import { getErrorCategory, isRetryableNodeError } from './error-classification.js'
import { NodeCircuitOpenError, NodeRetryExhaustedError, normalizeError } from './errors.js'
import { createNodeLogger, createNodeLoggerWithContext } from './logger.js'
import type { MetricsErrorCategory, NodeMetricsCollector } from './metrics.js'
import { withNodeRetry } from './retry.js'
import { createBlockedUpdate, createErrorUpdate, type StateUpdate } from './state-helpers.js'
import { withTimeout } from './timeout.js'
import {
  createNodeExecutionContext,
  DEFAULT_RETRY_CONFIG,
  type NodeConfigInput,
  type NodeExecutionContext,
  type NodeRetryConfig,
} from './types.js'

/**
 * Node implementation function signature.
 * AC-2: Matches LangGraph pattern.
 */
export type NodeImplementation = (
  state: GraphState,
  config?: RunnableConfig,
) => Promise<Partial<GraphState>> | Partial<GraphState>

/**
 * LangGraph-compatible node function signature.
 */
export type NodeFunction = (
  state: GraphState,
  config?: RunnableConfig,
) => Promise<Partial<GraphState>>

/**
 * Internal node config after processing.
 * WRKF-1021: Added metricsCollector for optional metrics capture.
 */
interface InternalNodeConfig {
  name: string
  retry?: Partial<NodeRetryConfig>
  circuitBreaker?: { failureThreshold?: number; recoveryTimeoutMs?: number }
  onTimeout?: (nodeName: string, context: NodeExecutionContext) => void
  onRetryAttempt?: (attempt: number, error: Error, delayMs: number) => void
  metricsCollector?: NodeMetricsCollector
}

/**
 * Options for node execution.
 */
interface ExecuteNodeOptions {
  state: GraphState
  config?: RunnableConfig
  nodeConfig: InternalNodeConfig
  implementation: NodeImplementation
  retryConfig: NodeRetryConfig
  circuitBreaker?: NodeCircuitBreaker
  metricsCollector?: NodeMetricsCollector
}

/**
 * Creates a LangGraph-compatible node with infrastructure wrappers.
 *
 * AC-1: Factory with error handling, logging, retry wrappers.
 * AC-2: Returns node with signature (state, config?) => Promise<Partial<GraphState>>.
 * AC-3: Entry/exit logging with node name, story ID, duration.
 * AC-4: Error handler captures exceptions to state.errors.
 * AC-5: Configurable retry with maxAttempts and backoff.
 * AC-6: Retry exhaustion sets routingFlags to blocked.
 * AC-9: Supports sync and async implementations.
 * AC-15: Optional timeout with NodeTimeoutError.
 * AC-17: AbortSignal support via RunnableConfig.signal.
 * AC-21: Optional circuit breaker.
 *
 * @param nodeConfigInput - Node configuration
 * @param implementation - The node implementation function
 * @returns A LangGraph-compatible node function
 */
export function createNode(
  nodeConfigInput: NodeConfigInput,
  implementation: NodeImplementation,
): NodeFunction {
  // Validate node name
  if (!nodeConfigInput.name || nodeConfigInput.name.trim() === '') {
    throw new Error('Node name is required')
  }

  // Validate retry config if provided
  if (nodeConfigInput.retry) {
    if (nodeConfigInput.retry.maxAttempts !== undefined && nodeConfigInput.retry.maxAttempts < 1) {
      throw new Error('Invalid retry configuration: maxAttempts must be at least 1')
    }
    if (nodeConfigInput.retry.backoffMs !== undefined && nodeConfigInput.retry.backoffMs < 0) {
      throw new Error('Invalid retry configuration: backoffMs must be non-negative')
    }
  }

  const nodeConfig: InternalNodeConfig = {
    name: nodeConfigInput.name,
    retry: nodeConfigInput.retry,
    circuitBreaker: nodeConfigInput.circuitBreaker,
    onTimeout: nodeConfigInput.onTimeout,
    onRetryAttempt: nodeConfigInput.onRetryAttempt,
    metricsCollector: nodeConfigInput.metricsCollector,
  }

  // Merge retry config with defaults
  const retryConfig: NodeRetryConfig = {
    ...DEFAULT_RETRY_CONFIG,
    ...nodeConfigInput.retry,
  }

  // Create circuit breaker if configured
  const circuitBreaker = nodeConfig.circuitBreaker
    ? new NodeCircuitBreaker(nodeConfig.circuitBreaker)
    : undefined

  // Return the wrapped node function
  return async function wrappedNode(
    state: GraphState,
    config?: RunnableConfig,
  ): Promise<Partial<GraphState>> {
    const logger = createNodeLogger(nodeConfig.name)
    const startTime = Date.now()

    // Log entry
    logger.logEntry(state.storyId)

    try {
      // Check circuit breaker
      if (circuitBreaker && !circuitBreaker.canExecute()) {
        const status = circuitBreaker.getStatus()
        const error = new NodeCircuitOpenError(
          nodeConfig.name,
          status.failures,
          status.timeUntilRecovery,
        )
        logger.logError(error)
        circuitBreaker.recordFailure()

        const durationMs = Date.now() - startTime
        logger.logExit(state.storyId, durationMs, false)

        return createBlockedUpdate(state, {
          nodeId: nodeConfig.name,
          error,
          code: 'CIRCUIT_OPEN',
        })
      }

      // Execute with retry wrapper
      const result = await executeWithRetry({
        state,
        config,
        nodeConfig,
        implementation,
        retryConfig,
        circuitBreaker,
        metricsCollector: nodeConfig.metricsCollector,
      })

      // Record success
      circuitBreaker?.recordSuccess()

      const durationMs = Date.now() - startTime

      // Record success metrics (WRKF-1021: AC-6)
      nodeConfig.metricsCollector?.recordSuccess(nodeConfig.name, durationMs)

      logger.logExit(state.storyId, durationMs, true)

      return result
    } catch (error) {
      // Record failure
      circuitBreaker?.recordFailure()

      const normalizedError = normalizeError(error)
      const durationMs = Date.now() - startTime

      // Record failure metrics (WRKF-1021: AC-6)
      const errorCategory = mapErrorCategoryToMetrics(getErrorCategory(error))
      nodeConfig.metricsCollector?.recordFailure(nodeConfig.name, durationMs, error, errorCategory)

      logger.logError(normalizedError)
      logger.logExit(state.storyId, durationMs, false)

      // Handle retry exhausted
      if (error instanceof NodeRetryExhaustedError) {
        return createBlockedUpdate(state, {
          nodeId: nodeConfig.name,
          error: error.lastError,
          code: 'RETRY_EXHAUSTED',
        })
      }

      // For non-retryable errors, return error in state
      if (!isRetryableNodeError(error)) {
        return createErrorUpdate(state, {
          nodeId: nodeConfig.name,
          error,
          recoverable: false,
        })
      }

      // Default: return blocked state
      return createBlockedUpdate(state, {
        nodeId: nodeConfig.name,
        error,
      })
    }
  }
}

/**
 * Executes the node implementation with retry logic.
 */
async function executeWithRetry(options: ExecuteNodeOptions): Promise<StateUpdate> {
  const { state, config, nodeConfig, implementation, retryConfig } = options

  // Create execution context
  const executionContext = createNodeExecutionContext({
    storyId: state.storyId,
    maxRetryAttempts: retryConfig.maxAttempts,
  })

  const contextLogger = createNodeLoggerWithContext(nodeConfig.name, executionContext)

  // If no retry configured (maxAttempts = 1), execute directly
  if (retryConfig.maxAttempts === 1) {
    return executeOnce({
      state,
      config,
      nodeConfig,
      implementation,
      retryConfig,
      executionContext,
    })
  }

  // Execute with retry wrapper
  const result = await withNodeRetry(
    async () => {
      return executeOnce({
        state,
        config,
        nodeConfig,
        implementation,
        retryConfig,
        executionContext,
      })
    },
    {
      config: retryConfig,
      nodeName: nodeConfig.name,
      onRetryAttempt: (attempt, error, delayMs) => {
        contextLogger.logRetry(attempt, retryConfig.maxAttempts, delayMs, error)
        // Record retry metrics (WRKF-1021: AC-6)
        nodeConfig.metricsCollector?.recordRetry(nodeConfig.name, attempt)
        nodeConfig.onRetryAttempt?.(attempt, error, delayMs)
      },
    },
  )

  return result.value
}

/**
 * Executes the node implementation once, with optional timeout.
 */
async function executeOnce(options: {
  state: GraphState
  config?: RunnableConfig
  nodeConfig: InternalNodeConfig
  implementation: NodeImplementation
  retryConfig: NodeRetryConfig
  executionContext: NodeExecutionContext
}): Promise<StateUpdate> {
  const { state, config, nodeConfig, implementation, retryConfig, executionContext } = options

  // Wrap implementation to handle sync/async
  const execute = async (): Promise<Partial<GraphState>> => {
    const result = implementation(state, config)
    return result instanceof Promise ? result : Promise.resolve(result)
  }

  // Apply timeout if configured
  if (retryConfig.timeoutMs && retryConfig.timeoutMs > 0) {
    const result = await withTimeout(execute, {
      timeoutMs: retryConfig.timeoutMs,
      nodeName: nodeConfig.name,
      signal: config?.signal,
      onTimeout: nodeConfig.onTimeout,
      context: executionContext,
    })
    return validateResult(result, nodeConfig.name)
  }

  // Execute without timeout
  const result = await execute()
  return validateResult(result, nodeConfig.name)
}

/**
 * Validates the node result.
 */
function validateResult(result: Partial<GraphState> | undefined, nodeName: string): StateUpdate {
  if (result === undefined) {
    throw new Error(`Node "${nodeName}" handler must return a state update, received undefined`)
  }
  return result
}

/**
 * Creates a simple node without retry or circuit breaker.
 * Useful for nodes that should not retry (validation, etc).
 *
 * @param name - Node name
 * @param implementation - Node implementation
 * @returns A LangGraph-compatible node function
 */
export function createSimpleNode(name: string, implementation: NodeImplementation): NodeFunction {
  return createNode(
    {
      name,
      retry: { maxAttempts: 1 },
    },
    implementation,
  )
}

/**
 * Creates a node with LLM preset configuration.
 * Higher retries, longer timeout, suitable for LLM calls.
 *
 * @param name - Node name
 * @param implementation - Node implementation
 * @returns A LangGraph-compatible node function
 */
export function createLLMNode(name: string, implementation: NodeImplementation): NodeFunction {
  return createNode(
    {
      name,
      retry: {
        maxAttempts: 5,
        backoffMs: 2000,
        backoffMultiplier: 2,
        maxBackoffMs: 60000,
        timeoutMs: 60000,
        jitterFactor: 0.25,
      },
    },
    implementation,
  )
}

/**
 * Creates a node with tool preset configuration.
 * Lower retries, shorter timeout, suitable for tool/API calls.
 *
 * @param name - Node name
 * @param implementation - Node implementation
 * @returns A LangGraph-compatible node function
 */
export function createToolNode(name: string, implementation: NodeImplementation): NodeFunction {
  return createNode(
    {
      name,
      retry: {
        maxAttempts: 2,
        backoffMs: 500,
        backoffMultiplier: 2,
        maxBackoffMs: 10000,
        timeoutMs: 10000,
        jitterFactor: 0.25,
      },
    },
    implementation,
  )
}

/**
 * Maps ErrorCategory from error-classification to MetricsErrorCategory.
 * WRKF-1021: Helper for recording failure metrics with error category.
 */
function mapErrorCategoryToMetrics(
  category: ReturnType<typeof getErrorCategory>,
): MetricsErrorCategory {
  switch (category) {
    case 'timeout':
      return 'timeout'
    case 'validation':
      return 'validation'
    case 'network':
      return 'network'
    default:
      // programming, cancellation, circuit_open, rate_limit, unknown -> 'other'
      return 'other'
  }
}

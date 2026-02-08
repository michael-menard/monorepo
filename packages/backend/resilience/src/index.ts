/**
 * @repo/resilience
 *
 * Resilience patterns for protecting external service calls.
 * Provides circuit breaker (opossum), rate limiter (bottleneck), and timeout utilities.
 *
 * @example
 * ```typescript
 * import { getOpenAIPolicy, createServicePolicy } from '@repo/resilience'
 *
 * // Use pre-built policy
 * const result = await getOpenAIPolicy().execute(
 *   (signal) => openai.embeddings.create({ ... }, { signal }),
 * )
 *
 * // Or create custom policy
 * const customPolicy = createServicePolicy({
 *   name: 'my-service',
 *   circuitBreaker: { timeout: 5000 },
 *   rateLimiter: { maxConcurrent: 10 },
 * })
 * ```
 */

// Circuit Breaker
export {
  createCircuitBreaker,
  getCircuitBreakerStatus,
  registerCircuitBreaker,
  getRegisteredCircuitBreakers,
  getAllCircuitBreakerStatuses,
  resetAllCircuitBreakers,
  // Types
  type CircuitBreakerConfig,
  type CircuitBreakerInput,
  type CircuitBreakerStatus,
  type CircuitState,
  type CircuitBreakerEvent,
  // Schemas
  CircuitBreakerConfigSchema,
  CircuitStateSchema,
  CircuitBreakerStatusSchema,
  CircuitBreakerEventSchema,
} from './circuit-breaker/index.js'

// Rate Limiter
export {
  createRateLimiter,
  getRateLimiterStatus,
  registerRateLimiter,
  getRegisteredRateLimiters,
  getAllRateLimiterStatuses,
  RATE_LIMITER_PRESETS,
  // Types
  type RateLimiterConfig,
  type RateLimiterInput,
  type RateLimiterStatus,
  // Schemas
  RateLimiterConfigSchema,
  RateLimiterStatusSchema,
} from './rate-limiter/index.js'

// Timeout Utilities
export {
  createTimeoutSignal,
  createTimeoutController,
  withTimeout,
  combineSignals,
  createDeadlineSignal,
  TimeoutError,
  isTimeoutError,
  isAbortError,
} from './timeout/index.js'

// Service Policies
export {
  createServicePolicy,
  type ServicePolicy,
  type ServicePolicyConfig,
  type ServicePolicyInput,
  type ServicePolicyStats,
  ServicePolicyConfigSchema,
  // Pre-built policies
  createOpenAIPolicy,
  getOpenAIPolicy,
  createOpenAIEmbeddingsPolicy,
  createCognitoPolicy,
  getCognitoPolicy,
  createCognitoAdminPolicy,
  createS3Policy,
  getS3Policy,
  createS3UploadPolicy,
  createS3DownloadPolicy,
  createPostgresPolicy,
  getPostgresPolicy,
  createPostgresFastQueryPolicy,
  createPostgresSlowQueryPolicy,
  createRedisPolicy,
  getRedisPolicy,
  createRedisCachePolicy,
  createRedisSessionPolicy,
} from './policies/index.js'

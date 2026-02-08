/**
 * @repo/resilience - OpenAI Policy
 *
 * Pre-configured resilience policy for OpenAI API calls.
 * Handles rate limiting (60 RPM) and circuit breaking for embeddings/completions.
 */

import { createCircuitBreaker, registerCircuitBreaker } from '../circuit-breaker/index.js'
import { createRateLimiter, registerRateLimiter } from '../rate-limiter/index.js'
import { withTimeout } from '../timeout/index.js'
import { createServicePolicy, type ServicePolicy } from './index.js'

/**
 * OpenAI-specific circuit breaker configuration.
 * Tuned for typical OpenAI API behavior.
 */
const OPENAI_CIRCUIT_BREAKER_CONFIG = {
  name: 'openai',
  timeout: 30000, // 30s - OpenAI can be slow
  errorThresholdPercentage: 50,
  resetTimeout: 60000, // 1 minute recovery
  volumeThreshold: 3, // Open after 3 failures
  enabled: true,
}

/**
 * OpenAI rate limiter configuration.
 * Standard tier: 60 RPM, 10 concurrent
 */
const OPENAI_RATE_LIMITER_CONFIG = {
  name: 'openai',
  maxConcurrent: 10,
  reservoir: 60,
  reservoirRefreshAmount: 60,
  reservoirRefreshInterval: 60000, // Refill every minute
  enabled: true,
}

/**
 * Pre-built OpenAI service policy.
 */
export function createOpenAIPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'openai',
    circuitBreaker: OPENAI_CIRCUIT_BREAKER_CONFIG,
    rateLimiter: OPENAI_RATE_LIMITER_CONFIG,
    timeoutMs: 30000,
  })
}

/**
 * Singleton instance of OpenAI policy.
 * Use this for all OpenAI API calls.
 */
let openAIPolicyInstance: ServicePolicy | null = null

export function getOpenAIPolicy(): ServicePolicy {
  if (!openAIPolicyInstance) {
    openAIPolicyInstance = createOpenAIPolicy()
  }
  return openAIPolicyInstance
}

/**
 * OpenAI embeddings-specific policy with longer timeout.
 */
export function createOpenAIEmbeddingsPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'openai-embeddings',
    circuitBreaker: {
      ...OPENAI_CIRCUIT_BREAKER_CONFIG,
      name: 'openai-embeddings',
      timeout: 60000, // 60s for batch embeddings
    },
    rateLimiter: {
      ...OPENAI_RATE_LIMITER_CONFIG,
      name: 'openai-embeddings',
      maxConcurrent: 5, // Lower concurrency for embeddings
    },
    timeoutMs: 60000,
  })
}

/**
 * @repo/resilience - Cognito Policy
 *
 * Pre-configured resilience policy for AWS Cognito API calls.
 * Handles authentication and user management operations.
 */

import { createServicePolicy, type ServicePolicy } from './index.js'

/**
 * Cognito-specific circuit breaker configuration.
 * Tuned for typical AWS Cognito behavior.
 */
const COGNITO_CIRCUIT_BREAKER_CONFIG = {
  name: 'cognito',
  timeout: 10000, // 10s - Cognito is usually fast
  errorThresholdPercentage: 50,
  resetTimeout: 30000, // 30s recovery
  volumeThreshold: 5,
  enabled: true,
}

/**
 * Cognito rate limiter configuration.
 * AWS default quota: 100 RPS (we'll be more conservative)
 */
const COGNITO_RATE_LIMITER_CONFIG = {
  name: 'cognito',
  maxConcurrent: 50,
  minTime: 10, // 10ms between requests
  enabled: true,
}

/**
 * Pre-built Cognito service policy.
 */
export function createCognitoPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'cognito',
    circuitBreaker: COGNITO_CIRCUIT_BREAKER_CONFIG,
    rateLimiter: COGNITO_RATE_LIMITER_CONFIG,
    timeoutMs: 10000,
  })
}

/**
 * Singleton instance of Cognito policy.
 */
let cognitoPolicyInstance: ServicePolicy | null = null

export function getCognitoPolicy(): ServicePolicy {
  if (!cognitoPolicyInstance) {
    cognitoPolicyInstance = createCognitoPolicy()
  }
  return cognitoPolicyInstance
}

/**
 * Cognito admin operations policy (stricter rate limiting).
 */
export function createCognitoAdminPolicy(): ServicePolicy {
  return createServicePolicy({
    name: 'cognito-admin',
    circuitBreaker: {
      ...COGNITO_CIRCUIT_BREAKER_CONFIG,
      name: 'cognito-admin',
    },
    rateLimiter: {
      ...COGNITO_RATE_LIMITER_CONFIG,
      name: 'cognito-admin',
      maxConcurrent: 10, // Lower for admin operations
      minTime: 50,
    },
    timeoutMs: 15000,
  })
}

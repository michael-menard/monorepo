/**
 * Health Service Schemas
 *
 * Zod-first schemas for pipeline supervisor health check responses.
 * No HTTP knowledge — pure domain types.
 *
 * APIP-2030: Graceful Shutdown, Health Check, and Deployment Hardening
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Circuit Breaker State
// ─────────────────────────────────────────────────────────────────────────────

export const CircuitBreakerStateSchema = z.enum(['CLOSED', 'OPEN', 'HALF_OPEN'])
export type CircuitBreakerState = z.infer<typeof CircuitBreakerStateSchema>

export const CircuitBreakerSummarySchema = z.object({
  elaboration: CircuitBreakerStateSchema,
  storyCreation: CircuitBreakerStateSchema,
  implementation: CircuitBreakerStateSchema,
  review: CircuitBreakerStateSchema,
  qa: CircuitBreakerStateSchema,
})
export type CircuitBreakerSummary = z.infer<typeof CircuitBreakerSummarySchema>

// ─────────────────────────────────────────────────────────────────────────────
// Supervisor Health Status
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Status values:
 * - healthy: supervisor running normally, Redis reachable, circuit breakers CLOSED
 * - draining: SIGTERM received — supervisor finishing in-flight jobs before exit
 * - unhealthy: Redis unreachable or circuit breaker OPEN
 */
export const SupervisorStatusSchema = z.enum(['healthy', 'draining', 'unhealthy'])
export type SupervisorStatus = z.infer<typeof SupervisorStatusSchema>

/**
 * Full health response body for GET /health.
 */
export const SupervisorHealthSchema = z.object({
  status: SupervisorStatusSchema,
  draining: z.boolean(),
  activeJobs: z.number().int().min(0),
  circuitBreakerState: CircuitBreakerSummarySchema,
  uptimeMs: z.number().int().min(0),
})
export type SupervisorHealth = z.infer<typeof SupervisorHealthSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Health Context Callback
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Context provider callback — injected into health service to read live supervisor state.
 * Returns the minimal information needed to compute health status.
 */
export const HealthContextSchema = z.object({
  draining: z.boolean(),
  activeJobs: z.number().int().min(0),
  circuitBreakerState: CircuitBreakerSummarySchema,
  startTimeMs: z.number().int().positive(),
  /** Optional: Redis ping result — if false, status → unhealthy */
  redisReachable: z.boolean().optional(),
})
export type HealthContext = z.infer<typeof HealthContextSchema>

export type HealthContextProvider = () => HealthContext

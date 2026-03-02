/**
 * Health Service
 *
 * Pure functions for computing supervisor health status.
 * NO HTTP knowledge — delegates to the node:http adapter in server.ts.
 *
 * Pattern: mirrors apps/api/lego-api/domains/health/application/services.ts
 * but adapted for BullMQ/Redis supervisor context.
 *
 * APIP-2030: Graceful Shutdown, Health Check, and Deployment Hardening
 */

import type { HealthContext, SupervisorHealth, SupervisorStatus } from './__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Health Status Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine the supervisor status from the health context.
 *
 * Priority order (highest to lowest):
 * 1. unhealthy — Redis unreachable (redisReachable === false)
 * 2. draining  — SIGTERM received, finishing in-flight jobs
 * 3. healthy   — normal operation
 *
 * Note: A supervisor can be BOTH draining AND unhealthy (e.g. Redis went down
 * during drain). In that case, unhealthy takes priority so the load balancer
 * or Kubernetes readiness probe removes it from rotation.
 */
export function computeSupervisorStatus(ctx: HealthContext): SupervisorStatus {
  if (ctx.redisReachable === false) {
    return 'unhealthy'
  }
  if (ctx.draining) {
    return 'draining'
  }
  return 'healthy'
}

/**
 * Build the full SupervisorHealth response from the given context.
 *
 * AC-3: Returns status, draining, activeJobs, circuitBreakerState, uptimeMs.
 * AC-4: Returns 'draining' status when drain mode is active.
 */
export function getSupervisorHealth(ctx: HealthContext): SupervisorHealth {
  const status = computeSupervisorStatus(ctx)
  const uptimeMs = Date.now() - ctx.startTimeMs

  return {
    status,
    draining: ctx.draining,
    activeJobs: ctx.activeJobs,
    circuitBreakerState: ctx.circuitBreakerState,
    uptimeMs: Math.max(0, uptimeMs),
  }
}

/**
 * Liveness check — always returns true as long as the Node.js process is running.
 * Used by GET /live (Docker HEALTHCHECK CMD).
 *
 * AC-5: /live returns 200 as long as the process is alive.
 */
export function getLivenessStatus(): { status: 'ok' } {
  return { status: 'ok' }
}

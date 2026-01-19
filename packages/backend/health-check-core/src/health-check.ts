/**
 * Core health check business logic
 * Platform-agnostic - no AWS, Vercel, or platform-specific dependencies
 */

import type { HealthCheckDeps, HealthCheckResult, HealthStatus } from './__types__/index.js'

/**
 * Perform health check
 *
 * Tests database connectivity and determines overall system health.
 * Returns structured health data with service status.
 *
 * @param deps - Dependencies for testing connections (injected for testability)
 * @param version - Application version (default: "1.0.0")
 * @returns Health check result with status, services, timestamp, version
 */
export async function performHealthCheck(
  deps: HealthCheckDeps,
  version: string = '1.0.0',
): Promise<HealthCheckResult> {
  const timestamp = new Date().toISOString()

  // Test PostgreSQL connection
  const postgresHealthy = await deps.testPostgresConnection()

  // Determine overall health status
  const status = determineHealthStatus(postgresHealthy)

  return {
    status,
    services: {
      postgres: postgresHealthy ? 'connected' : 'disconnected',
      opensearch: 'not_monitored', // Explicitly deferred per STORY-001
    },
    timestamp,
    version,
  }
}

/**
 * Determine overall health status
 *
 * Rules:
 * - PostgreSQL is critical - if down, system is unhealthy
 * - OpenSearch is not monitored in STORY-001 (deferred)
 *
 * @param postgres - PostgreSQL connection status
 * @returns Health status: healthy | degraded | unhealthy
 */
export function determineHealthStatus(postgres: boolean): HealthStatus {
  // PostgreSQL is critical - if down, system is unhealthy
  if (!postgres) {
    return 'unhealthy'
  }

  // If PostgreSQL is up, system is healthy
  // (OpenSearch monitoring deferred to future story)
  return 'healthy'
}

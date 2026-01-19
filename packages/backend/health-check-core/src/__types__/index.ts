/**
 * Type definitions for health check core logic
 * Using Zod schemas per CLAUDE.md requirements
 */

import { z } from 'zod'

/**
 * Health status enum
 */
export const HealthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy'])
export type HealthStatus = z.infer<typeof HealthStatusSchema>

/**
 * Service connection status
 */
export const ServiceStatusSchema = z.enum(['connected', 'disconnected', 'not_monitored'])
export type ServiceStatus = z.infer<typeof ServiceStatusSchema>

/**
 * Services health status
 */
export const ServicesHealthSchema = z.object({
  postgres: ServiceStatusSchema,
  opensearch: ServiceStatusSchema,
})
export type ServicesHealth = z.infer<typeof ServicesHealthSchema>

/**
 * Complete health check result
 */
export const HealthCheckResultSchema = z.object({
  status: HealthStatusSchema,
  services: ServicesHealthSchema,
  timestamp: z.string().datetime(),
  version: z.string(),
})
export type HealthCheckResult = z.infer<typeof HealthCheckResultSchema>

/**
 * Dependencies for health check
 * Platform-agnostic interface for testing connections
 */
export const HealthCheckDepsSchema = z.object({
  testPostgresConnection: z.function().returns(z.promise(z.boolean())),
})
export type HealthCheckDeps = z.infer<typeof HealthCheckDepsSchema>

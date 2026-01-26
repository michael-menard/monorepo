import { z } from 'zod'

/**
 * Health Domain Types
 *
 * Zod schemas for validation + type inference
 */

// ─────────────────────────────────────────────────────────────────────────
// Service Status
// ─────────────────────────────────────────────────────────────────────────

export const ServiceStatusSchema = z.enum(['up', 'down', 'unknown'])

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>

// ─────────────────────────────────────────────────────────────────────────
// Liveness Response
// ─────────────────────────────────────────────────────────────────────────

export const LivenessResponseSchema = z.object({
  status: z.literal('ok'),
})

export type LivenessResponse = z.infer<typeof LivenessResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Readiness Response
// ─────────────────────────────────────────────────────────────────────────

export const ReadinessCheckSchema = z.object({
  database: z.enum(['ok', 'error']),
})

export type ReadinessCheck = z.infer<typeof ReadinessCheckSchema>

export const ReadinessResponseSchema = z.object({
  status: z.enum(['ready', 'not_ready']),
  checks: ReadinessCheckSchema,
})

export type ReadinessResponse = z.infer<typeof ReadinessResponseSchema>

// ─────────────────────────────────────────────────────────────────────────
// Health Status (detailed)
// ─────────────────────────────────────────────────────────────────────────

export const HealthServicesSchema = z.object({
  database: z.enum(['connected', 'disconnected']),
})

export type HealthServices = z.infer<typeof HealthServicesSchema>

export const HealthStatusSchema = z.object({
  status: z.enum(['healthy', 'degraded', 'unhealthy']),
  version: z.string(),
  environment: z.string(),
  timestamp: z.string().datetime(),
  services: HealthServicesSchema,
})

export type HealthStatus = z.infer<typeof HealthStatusSchema>

// ─────────────────────────────────────────────────────────────────────────
// Config Types
// ─────────────────────────────────────────────────────────────────────────

export const ApiInfoSchema = z.object({
  name: z.string(),
  version: z.string(),
  environment: z.string(),
})

export type ApiInfo = z.infer<typeof ApiInfoSchema>

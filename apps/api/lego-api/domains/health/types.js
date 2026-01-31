import { z } from 'zod';
/**
 * Health Domain Types
 *
 * Zod schemas for validation + type inference
 */
// ─────────────────────────────────────────────────────────────────────────
// Service Status
// ─────────────────────────────────────────────────────────────────────────
export const ServiceStatusSchema = z.enum(['up', 'down', 'unknown']);
// ─────────────────────────────────────────────────────────────────────────
// Liveness Response
// ─────────────────────────────────────────────────────────────────────────
export const LivenessResponseSchema = z.object({
    status: z.literal('ok'),
});
// ─────────────────────────────────────────────────────────────────────────
// Readiness Response
// ─────────────────────────────────────────────────────────────────────────
export const ReadinessCheckSchema = z.object({
    database: z.enum(['ok', 'error']),
});
export const ReadinessResponseSchema = z.object({
    status: z.enum(['ready', 'not_ready']),
    checks: ReadinessCheckSchema,
});
// ─────────────────────────────────────────────────────────────────────────
// Health Status (detailed)
// ─────────────────────────────────────────────────────────────────────────
export const HealthServicesSchema = z.object({
    database: z.enum(['connected', 'disconnected']),
});
export const HealthStatusSchema = z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    version: z.string(),
    environment: z.string(),
    timestamp: z.string().datetime(),
    services: HealthServicesSchema,
});
// ─────────────────────────────────────────────────────────────────────────
// Config Types
// ─────────────────────────────────────────────────────────────────────────
export const ApiInfoSchema = z.object({
    name: z.string(),
    version: z.string(),
    environment: z.string(),
});

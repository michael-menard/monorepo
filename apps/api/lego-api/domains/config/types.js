import { z } from 'zod';
/**
 * Feature Flag Domain Types (WISH-2009)
 *
 * Zod schemas for validation + type inference
 */
// ─────────────────────────────────────────────────────────────────────────
// Feature Flag Schemas
// ─────────────────────────────────────────────────────────────────────────
/**
 * Feature flag from database
 */
export const FeatureFlagSchema = z.object({
    id: z.string().uuid(),
    flagKey: z.string().min(1).max(100),
    enabled: z.boolean(),
    rolloutPercentage: z.number().int().min(0).max(100),
    description: z.string().nullable(),
    environment: z.string().default('production'),
    createdAt: z.date(),
    updatedAt: z.date(),
});
/**
 * Create feature flag input
 */
export const CreateFeatureFlagInputSchema = z.object({
    flagKey: z
        .string()
        .min(1, 'Flag key is required')
        .max(100, 'Flag key must be less than 100 characters'),
    enabled: z.boolean().default(false),
    rolloutPercentage: z.number().int().min(0).max(100).default(0),
    description: z.string().max(500).optional(),
    environment: z.string().max(20).default('production'),
});
/**
 * Update feature flag input (admin endpoint)
 */
export const UpdateFeatureFlagInputSchema = z.object({
    enabled: z.boolean().optional(),
    rolloutPercentage: z.number().int().min(0).max(100).optional(),
    description: z.string().max(500).optional(),
});
// ─────────────────────────────────────────────────────────────────────────
// Response Schemas
// ─────────────────────────────────────────────────────────────────────────
/**
 * GET /api/config/flags response - all flags as object
 */
export const FeatureFlagsResponseSchema = z.record(z.string(), z.boolean());
/**
 * GET /api/config/flags/:flagKey response - single flag with metadata
 */
export const FeatureFlagDetailResponseSchema = z.object({
    key: z.string(),
    enabled: z.boolean(),
    rolloutPercentage: z.number().int().min(0).max(100),
    description: z.string().nullable(),
});

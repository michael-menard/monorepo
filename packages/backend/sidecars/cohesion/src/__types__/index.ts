/**
 * Zod Schemas for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 *
 * Imports FrankenFeatureItemSchema from @repo/mcp-tools (OPP-01: avoid type drift).
 * CohesionCheckResult.capabilityCoverage uses booleans (ARCH-002: different from
 * CapabilityCoverageOutput which uses counts).
 */

import { z } from 'zod'
import { FrankenFeatureItemSchema } from '@repo/mcp-tools'

// ============================================================================
// Request Schemas
// ============================================================================

/**
 * Input schema for POST /cohesion/audit
 * packageName is optional — if omitted, all packages are audited
 */
export const CohesionAuditRequestSchema = z.object({
  packageName: z.string().max(255, 'packageName cannot exceed 255 characters').optional(),
})

export type CohesionAuditRequest = z.infer<typeof CohesionAuditRequestSchema>

/**
 * Input schema for POST /cohesion/check
 * featureId is required — UUID of the feature to check
 */
export const CohesionCheckRequestSchema = z.object({
  featureId: z.string().min(1, 'featureId must not be empty'),
})

export type CohesionCheckRequest = z.infer<typeof CohesionCheckRequestSchema>

// ============================================================================
// Result Schemas
// ============================================================================

/**
 * Coverage summary for audit results
 */
export const CoverageSummarySchema = z.object({
  totalFeatures: z.number().int().min(0),
  completeCount: z.number().int().min(0),
  incompleteCount: z.number().int().min(0),
})

export type CoverageSummary = z.infer<typeof CoverageSummarySchema>

/**
 * Result schema for computeAudit / POST /cohesion/audit
 * frankenFeatures is the array of features with incomplete CRUD capabilities.
 * Imports FrankenFeatureItemSchema from @repo/mcp-tools (OPP-01).
 */
export const CohesionAuditResultSchema = z.object({
  frankenFeatures: z.array(FrankenFeatureItemSchema),
  coverageSummary: CoverageSummarySchema,
})

export type CohesionAuditResult = z.infer<typeof CohesionAuditResultSchema>

/**
 * Capability coverage breakdown using booleans per AC-4 HTTP contract.
 * (ARCH-002: Different from CapabilityCoverageOutput.capabilities which uses counts)
 */
export const CapabilityCoverageSchema = z.object({
  create: z.boolean(),
  read: z.boolean(),
  update: z.boolean(),
  delete: z.boolean(),
})

export type CapabilityCoverage = z.infer<typeof CapabilityCoverageSchema>

/**
 * Result schema for computeCheck / POST /cohesion/check
 * status: complete=all 4 CRUD stages present, incomplete=some missing, unknown=feature not found
 */
export const CohesionCheckResultSchema = z.object({
  featureId: z.string(),
  status: z.enum(['complete', 'incomplete', 'unknown']),
  violations: z.array(z.string()),
  capabilityCoverage: CapabilityCoverageSchema,
})

export type CohesionCheckResult = z.infer<typeof CohesionCheckResultSchema>

// ============================================================================
// HTTP Response Schemas (discriminated union)
// ============================================================================

/**
 * HTTP response schema for POST /cohesion/audit
 */
export const CohesionAuditHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: CohesionAuditResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    details: z.unknown().optional(),
  }),
])

export type CohesionAuditHttpResponse = z.infer<typeof CohesionAuditHttpResponseSchema>

/**
 * HTTP response schema for POST /cohesion/check
 */
export const CohesionCheckHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: CohesionCheckResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    details: z.unknown().optional(),
  }),
])

export type CohesionCheckHttpResponse = z.infer<typeof CohesionCheckHttpResponseSchema>

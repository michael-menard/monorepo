/**
 * Zod Schemas for Cohesion Sidecar
 * WINT-4010: Create Cohesion Sidecar
 *
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 * AC-7: All types defined via z.object(), z.enum(), z.discriminatedUnion() — no interface keywords.
 */

import { z } from 'zod'
import { FrankenFeatureItemSchema } from '@repo/mcp-tools'

// ============================================================================
// Re-export FrankenFeatureItemSchema for use in compute functions
// ARCH-002: Import from @repo/mcp-tools (confirmed exportable) per OPP-01
// ============================================================================

export { FrankenFeatureItemSchema }
export type FrankenFeatureItem = z.infer<typeof FrankenFeatureItemSchema>

// ============================================================================
// POST /cohesion/audit — Request / Response schemas
// AC-3: Optional packageName filter
// ============================================================================

export const CohesionAuditRequestSchema = z.object({
  packageName: z
    .string()
    .max(255, 'packageName cannot exceed 255 characters')
    .optional()
    .nullable(),
})

export type CohesionAuditRequest = z.infer<typeof CohesionAuditRequestSchema>

/**
 * Coverage summary across all features in the graph
 */
export const CoverageSummarySchema = z.object({
  totalFeatures: z.number().int().min(0),
  completeCount: z.number().int().min(0),
  incompleteCount: z.number().int().min(0),
})

export type CoverageSummary = z.infer<typeof CoverageSummarySchema>

/**
 * Full audit result — franken-features list + coverage summary
 * AC-3: data shape for POST /cohesion/audit 200 response
 */
export const CohesionAuditResultSchema = z.object({
  frankenFeatures: z.array(FrankenFeatureItemSchema),
  coverageSummary: CoverageSummarySchema,
})

export type CohesionAuditResult = z.infer<typeof CohesionAuditResultSchema>

// ============================================================================
// POST /cohesion/check — Request / Response schemas
// AC-4: Required featureId
// ============================================================================

export const CohesionCheckRequestSchema = z.object({
  featureId: z.string({ required_error: 'featureId is required' }).min(1, 'featureId is required'),
})

export type CohesionCheckRequest = z.infer<typeof CohesionCheckRequestSchema>

/**
 * Per-feature cohesion check result
 * AC-4: status (complete | incomplete | unknown), violations, capabilityCoverage (boolean per stage)
 *
 * ARCH-002: capabilityCoverage uses booleans (not counts like CapabilityCoverageOutput)
 * per the HTTP contract in AC-4 and WINT-4010.md HTTP Contract section.
 */
export const CapabilityCoverageSchema = z.object({
  create: z.boolean().optional(),
  read: z.boolean().optional(),
  update: z.boolean().optional(),
  delete: z.boolean().optional(),
})

export type CapabilityCoverage = z.infer<typeof CapabilityCoverageSchema>

export const CohesionStatusSchema = z.enum(['complete', 'incomplete', 'unknown'])

export type CohesionStatus = z.infer<typeof CohesionStatusSchema>

export const CohesionCheckResultSchema = z.object({
  featureId: z.string(),
  status: CohesionStatusSchema,
  violations: z.array(z.string()),
  capabilityCoverage: CapabilityCoverageSchema,
})

export type CohesionCheckResult = z.infer<typeof CohesionCheckResultSchema>

// ============================================================================
// HTTP Response discriminated unions (AC-5)
// Pattern: { ok: true, data: T } | { ok: false, error: string }
// ============================================================================

export const CohesionAuditHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: CohesionAuditResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
])

export type CohesionAuditHttpResponse = z.infer<typeof CohesionAuditHttpResponseSchema>

export const CohesionCheckHttpResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: CohesionCheckResultSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
])

export type CohesionCheckHttpResponse = z.infer<typeof CohesionCheckHttpResponseSchema>

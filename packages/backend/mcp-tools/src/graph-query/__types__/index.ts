/**
 * Zod Input Schemas for Graph Query MCP Tools
 * WINT-0130: Create Graph Query MCP Tools
 *
 * These schemas define and validate inputs for all 4 graph query MCP tools.
 * Uses Zod-first approach per CLAUDE.md - no TypeScript interfaces.
 *
 * Security: AC-1 (Explicit Input Validation Requirements Documented)
 * All schemas enforce UUID format, string length limits, enum values, and nullable/optional fields.
 */

import { z } from 'zod'

/**
 * Feature ID Schema (Dual ID Support)
 * Accepts either UUID or feature name string
 * Pattern: Reused from StoryIdSchema in story-management
 */
export const FeatureIdSchema = z
  .string()
  .uuid('featureId must be a valid UUID')
  .or(z.string().min(1, 'featureId must not be empty'))

/**
 * Graph Check Cohesion Input Schema
 * Validates feature cohesion against active cohesion rules
 *
 * AC-6: graph_check_cohesion Tool Implementation
 */
export const GraphCheckCohesionInputSchema = z.object({
  featureId: FeatureIdSchema,
})

export type GraphCheckCohesionInput = z.infer<typeof GraphCheckCohesionInputSchema>

/**
 * Graph Check Cohesion Output Schema
 * Return type for cohesion validation
 */
export const GraphCheckCohesionOutputSchema = z.object({
  status: z.enum(['complete', 'incomplete', 'unknown']),
  violations: z.array(z.string()).optional(),
})

export type GraphCheckCohesionOutput = z.infer<typeof GraphCheckCohesionOutputSchema>

/**
 * Graph Get Franken Features Input Schema
 * Identifies features with incomplete CRUD capabilities
 *
 * AC-7: graph_get_franken_features Tool Implementation
 * Franken-feature definition: feature with < 4 CRUD capabilities
 */
export const GraphGetFrankenFeaturesInputSchema = z.object({
  packageName: z.string().max(255, 'packageName cannot exceed 255 characters').optional(),
})

export type GraphGetFrankenFeaturesInput = z.infer<typeof GraphGetFrankenFeaturesInputSchema>

/**
 * Franken Feature Output Item Schema
 */
export const FrankenFeatureItemSchema = z.object({
  featureId: z.string().uuid(),
  featureName: z.string(),
  missingCapabilities: z.array(z.string()),
})

export type FrankenFeatureItem = z.infer<typeof FrankenFeatureItemSchema>

/**
 * Capability Coverage Schema
 * Per-feature CRUD stage coverage (boolean per stage).
 * Distinct from CapabilityCoverageOutputSchema which uses counts.
 * Used by CohesionCheckResultSchema and cohesion-check LangGraph node.
 */
export const CapabilityCoverageSchema = z.object({
  create: z.boolean().optional(),
  read: z.boolean().optional(),
  update: z.boolean().optional(),
  delete: z.boolean().optional(),
})

export type CapabilityCoverage = z.infer<typeof CapabilityCoverageSchema>

/**
 * Cohesion Status Schema
 * Represents the result of a per-feature cohesion check.
 */
export const CohesionStatusSchema = z.enum(['complete', 'incomplete', 'unknown'])

export type CohesionStatus = z.infer<typeof CohesionStatusSchema>

/**
 * Cohesion Check Result Schema
 * Per-feature cohesion check result with status, violations, and CRUD coverage.
 */
export const CohesionCheckResultSchema = z.object({
  featureId: z.string(),
  status: CohesionStatusSchema,
  violations: z.array(z.string()),
  capabilityCoverage: CapabilityCoverageSchema,
})

export type CohesionCheckResult = z.infer<typeof CohesionCheckResultSchema>

/**
 * Coverage Summary Schema
 * Aggregate coverage across all features in an audit.
 */
export const CoverageSummarySchema = z.object({
  totalFeatures: z.number().int().min(0),
  completeCount: z.number().int().min(0),
  incompleteCount: z.number().int().min(0),
})

export type CoverageSummary = z.infer<typeof CoverageSummarySchema>

/**
 * Cohesion Audit Result Schema
 * Full audit result — franken-features list + coverage summary.
 */
export const CohesionAuditResultSchema = z.object({
  frankenFeatures: z.array(FrankenFeatureItemSchema),
  coverageSummary: CoverageSummarySchema,
})

export type CohesionAuditResult = z.infer<typeof CohesionAuditResultSchema>

/**
 * Graph Get Capability Coverage Input Schema
 * Queries capability coverage breakdown per feature
 *
 * AC-8: graph_get_capability_coverage Tool Implementation
 */
export const GraphGetCapabilityCoverageInputSchema = z.object({
  featureId: FeatureIdSchema,
})

export type GraphGetCapabilityCoverageInput = z.infer<typeof GraphGetCapabilityCoverageInputSchema>

/**
 * Capability Coverage Output Schema
 * Breakdown by lifecycle stage and maturity level
 */
export const CapabilityCoverageOutputSchema = z.object({
  featureId: z.string().uuid(),
  capabilities: z.object({
    create: z.number().int().min(0),
    read: z.number().int().min(0),
    update: z.number().int().min(0),
    delete: z.number().int().min(0),
  }),
  maturityLevels: z.record(z.string(), z.number().int().min(0)),
  totalCount: z.number().int().min(0),
})

export type CapabilityCoverageOutput = z.infer<typeof CapabilityCoverageOutputSchema>

/**
 * Rule Type Enum (from cohesionRules.ruleType)
 * AC-9: graph_apply_rules Tool Implementation
 */
export const RuleTypeEnum = z.enum([
  'package_cohesion',
  'feature_completeness',
  'relationship_consistency',
])

export type RuleType = z.infer<typeof RuleTypeEnum>

/**
 * Graph Apply Rules Input Schema
 * Applies active cohesion rules and returns violations
 *
 * AC-9: graph_apply_rules Tool Implementation
 */
export const GraphApplyRulesInputSchema = z.object({
  ruleType: RuleTypeEnum.optional(),
})

export type GraphApplyRulesInput = z.infer<typeof GraphApplyRulesInputSchema>

/**
 * Rule Violation Item Schema
 */
export const RuleViolationItemSchema = z.object({
  featureId: z.string().uuid(),
  description: z.string(),
})

export type RuleViolationItem = z.infer<typeof RuleViolationItemSchema>

/**
 * Rule Violations Output Schema
 */
export const RuleViolationsOutputSchema = z.object({
  ruleId: z.string().uuid(),
  ruleName: z.string(),
  severity: z.string(),
  violations: z.array(RuleViolationItemSchema),
})

export type RuleViolationsOutput = z.infer<typeof RuleViolationsOutputSchema>

/**
 * JSONB Condition Type for Cohesion Rules
 * Used for type-safe parsing of cohesionRules.conditions JSONB field
 *
 * MVP Scope: Basic pattern matching (substring include/exclude)
 * Deferred: Advanced regex, wildcards, glob patterns
 */
export type RuleConditions = {
  featurePatterns?: {
    include: string[]
    exclude?: string[]
  }
  packagePatterns?: {
    include: string[]
    exclude?: string[]
  }
  relationshipTypes?: string[]
}

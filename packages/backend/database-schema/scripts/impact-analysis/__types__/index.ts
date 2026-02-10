/**
 * Zod schemas for Schema Change Impact Analysis Tool
 * WISH-20210
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────────
// Change Type Enums
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Types of database schema changes that can be analyzed
 */
export const ChangeTypeSchema = z.enum([
  'add-column',
  'drop-column',
  'rename-column',
  'change-type',
  'add-value',
  'remove-value',
  'rename-value',
  'add-index',
  'add-fk',
  'modify-constraint',
])

export type ChangeType = z.infer<typeof ChangeTypeSchema>

// ─────────────────────────────────────────────────────────────────────────────
// CLI Options
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CLI command options schema
 * @example
 * pnpm db:impact-analysis --table wishlist_items --change add-column:priority:text
 */
export const CliOptionsSchema = z.object({
  table: z.string().optional(),
  enum: z.string().optional(),
  change: z.string().min(1, { message: 'Change specification is required' }),
  format: z.enum(['md', 'json']).default('md'),
  dryRun: z.boolean().default(false),
})

export type CliOptions = z.infer<typeof CliOptionsSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Parsed Change
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parsed change operation from CLI input
 * @example
 * Input: "add-column:priority:text"
 * Output: { operation: 'add-column', target: 'priority', newName: undefined, newType: 'text' }
 */
export const ParsedChangeSchema = z.object({
  operation: ChangeTypeSchema,
  target: z.string().min(1, { message: 'Target (column/enum/value name) is required' }),
  newName: z.string().optional(),
  newType: z.string().optional(),
})

export type ParsedChange = z.infer<typeof ParsedChangeSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Impact Categories
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Categories for grouping impact findings
 */
export const ImpactCategorySchema = z.enum([
  'backend-service',
  'repository',
  'zod-schema',
  'frontend-component',
  'api-hook',
  'test',
  'db-schema',
])

export type ImpactCategory = z.infer<typeof ImpactCategorySchema>

/**
 * Confidence level for impact findings
 */
export const ConfidenceLevelSchema = z.enum(['high', 'medium', 'low'])

export type ConfidenceLevel = z.infer<typeof ConfidenceLevelSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Impact Finding
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single impact finding representing an affected file or code location
 */
export const ImpactFindingSchema = z.object({
  file: z.string().min(1, { message: 'File path is required' }),
  category: ImpactCategorySchema,
  confidence: ConfidenceLevelSchema,
  description: z.string().min(1, { message: 'Description is required' }),
  recommendation: z.string().min(1, { message: 'Recommendation is required' }),
})

export type ImpactFinding = z.infer<typeof ImpactFindingSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Risk Assessment
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Risk assessment for the proposed schema change
 */
export const RiskAssessmentSchema = z.object({
  breaking: z.boolean(),
  backwardCompatible: z.boolean(),
  rollbackSafe: z.boolean(),
  deploymentOrder: z.array(z.string()),
})

export type RiskAssessment = z.infer<typeof RiskAssessmentSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Impact Result
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete impact analysis result
 */
export const ImpactResultSchema = z.object({
  changeSummary: z.object({
    operation: ChangeTypeSchema,
    target: z.string(),
    description: z.string(),
  }),
  findingsByCategory: z.record(ImpactCategorySchema, z.array(ImpactFindingSchema)),
  riskAssessment: RiskAssessmentSchema,
  recommendations: z.array(z.string()),
  effortEstimate: z.enum(['Low', 'Medium', 'High']),
})

export type ImpactResult = z.infer<typeof ImpactResultSchema>

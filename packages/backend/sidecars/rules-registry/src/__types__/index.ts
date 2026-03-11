/**
 * Zod Schemas for Rules Registry Sidecar Service
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Uses Zod-first approach per CLAUDE.md — no TypeScript interfaces.
 *
 * AC-5: All endpoint schemas defined as Zod schemas.
 * AC-6: All HTTP responses use discriminated union pattern.
 */

import { z } from 'zod'

// ============================================================================
// Domain Enums
// ============================================================================

/**
 * Valid rule type values.
 * gate = gates execution, lint = linting rule, prompt_injection = injected into prompts
 */
export const RuleTypeSchema = z.enum(['gate', 'lint', 'prompt_injection'], {
  errorMap: () => ({ message: 'rule_type must be gate|lint|prompt_injection' }),
})

export type RuleType = z.infer<typeof RuleTypeSchema>

/**
 * Valid severity values.
 */
export const RuleSeveritySchema = z.enum(['error', 'warning', 'info'], {
  errorMap: () => ({ message: 'severity must be error|warning|info' }),
})

export type RuleSeverity = z.infer<typeof RuleSeveritySchema>

/**
 * Valid status values.
 */
export const RuleStatusSchema = z.enum(['proposed', 'active', 'deprecated'], {
  errorMap: () => ({ message: 'status must be proposed|active|deprecated' }),
})

export type RuleStatus = z.infer<typeof RuleStatusSchema>

// ============================================================================
// Core Rule Schema
// ============================================================================

/**
 * Full rule record as returned from DB.
 */
export const RuleSchema = z.object({
  id: z.string().uuid(),
  rule_text: z.string().min(1),
  rule_type: RuleTypeSchema,
  scope: z.string().min(1),
  severity: RuleSeveritySchema,
  status: RuleStatusSchema,
  source_story_id: z.string().nullable(),
  source_lesson_id: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
})

export type Rule = z.infer<typeof RuleSchema>

// ============================================================================
// Input Schemas
// ============================================================================

/**
 * Query parameters for GET /rules
 * AC-2: type, scope, status filters
 */
export const GetRulesQuerySchema = z.object({
  type: RuleTypeSchema.optional(),
  scope: z.string().min(1).optional(),
  status: RuleStatusSchema.optional(),
})

export type GetRulesQuery = z.infer<typeof GetRulesQuerySchema>

/**
 * Body for POST /rules — propose a new rule
 * AC-3: rule_text, rule_type, scope, severity, source refs
 */
export const ProposeRuleInputSchema = z.object({
  rule_text: z.string().min(1, { message: 'Validation error: rule_text is required' }),
  rule_type: RuleTypeSchema,
  scope: z.string().min(1).default('global'),
  severity: RuleSeveritySchema,
  source_story_id: z.string().optional(),
  source_lesson_id: z.string().optional(),
})

export type ProposeRuleInput = z.infer<typeof ProposeRuleInputSchema>

/**
 * Body for POST /rules/:id/promote — promote proposed to active
 * AC-4: requires source_story_id or source_lesson_id
 */
export const PromoteRuleInputSchema = z.object({
  source_story_id: z.string().optional(),
  source_lesson_id: z.string().optional(),
})

export type PromoteRuleInput = z.infer<typeof PromoteRuleInputSchema>

// ============================================================================
// HTTP Response Schemas (AC-6: discriminated union)
// ============================================================================

/**
 * GET /rules — list of rules
 */
export const RulesListResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: z.array(RuleSchema),
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
])

export type RulesListResponse = z.infer<typeof RulesListResponseSchema>

/**
 * POST /rules — created rule
 */
export const RuleCreateResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: RuleSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
    conflicting_ids: z.array(z.string()).optional(),
  }),
])

export type RuleCreateResponse = z.infer<typeof RuleCreateResponseSchema>

/**
 * POST /rules/:id/promote — promoted rule
 */
export const RulePromoteResponseSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    data: RuleSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: z.string(),
  }),
])

export type RulePromoteResponse = z.infer<typeof RulePromoteResponseSchema>

/**
 * Generic error response — used for 404, 400, etc.
 */
export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
})

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>

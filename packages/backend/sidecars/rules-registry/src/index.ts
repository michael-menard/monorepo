/**
 * Rules Registry Sidecar — Public API
 * WINT-4020: Create Rules Registry Sidecar
 *
 * This is the package entry point, NOT a barrel file.
 * Per project conventions, barrel files (index.ts that merely re-export everything)
 * are prohibited. This file intentionally and selectively exports only the public API
 * surface of the rules-registry sidecar: compute functions, conflict detection,
 * and Zod schemas/types. Internal implementation details are not re-exported.
 *
 * Exports compute functions for direct-call by MCP wrappers (ARCH-001).
 */

// Core compute functions
export { getRules, proposeRule, promoteRule, normalizeRuleText } from './rules-registry.js'
export type { ProposeRuleResult, PromoteRuleResult } from './rules-registry.js'

// Conflict detection (exported for testability)
export { detectConflicts } from './conflict-detector.js'

// Zod schemas and types
export {
  RuleTypeSchema,
  RuleSeveritySchema,
  RuleStatusSchema,
  RuleSchema,
  GetRulesQuerySchema,
  ProposeRuleInputSchema,
  PromoteRuleInputSchema,
  RulesListResponseSchema,
  RuleCreateResponseSchema,
  RulePromoteResponseSchema,
  type RuleType,
  type RuleSeverity,
  type RuleStatus,
  type Rule,
  type GetRulesQuery,
  type ProposeRuleInput,
  type PromoteRuleInput,
} from './__types__/index.js'

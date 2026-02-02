/**
 * token-budget.ts
 *
 * Zod schemas for token budget enforcement with configurable thresholds
 * and enforcement levels.
 *
 * Enforcement levels:
 * - advisory: Log only, continue execution
 * - warning: Log + display warning, continue
 * - soft_gate: Log + require confirmation, pause
 * - hard_gate: Log + fail phase, stop execution
 *
 * @module utils/token-budget
 */

import { z } from 'zod'

// ============================================================================
// Enforcement Levels
// ============================================================================

/**
 * Token budget enforcement levels.
 */
export const EnforcementLevelSchema = z.enum([
  'advisory',   // Log to TOKEN-LOG.md, continue
  'warning',    // Log + display warning to user, continue
  'soft_gate',  // Log + require user confirmation to continue
  'hard_gate',  // Log + FAIL phase, require budget increase
])

export type EnforcementLevel = z.infer<typeof EnforcementLevelSchema>

// ============================================================================
// Phase Limits
// ============================================================================

/**
 * Token limits for a single phase.
 */
export const PhaseLimitSchema = z.object({
  /** Warning threshold (advisory message) */
  warning: z.number().int().min(0),
  /** Hard limit (triggers enforcement) */
  hard: z.number().int().min(0),
})

export type PhaseLimit = z.infer<typeof PhaseLimitSchema>

/**
 * Token limits for all workflow phases.
 */
export const PhaseTokenLimitsSchema = z.object({
  pm_story: PhaseLimitSchema,
  elaboration: PhaseLimitSchema,
  dev_implementation: PhaseLimitSchema,
  code_review: PhaseLimitSchema,
  qa_verification: PhaseLimitSchema,
})

export type PhaseTokenLimits = z.infer<typeof PhaseTokenLimitsSchema>

/**
 * Default token limits per phase.
 */
export const DEFAULT_LIMITS: PhaseTokenLimits = {
  pm_story: { warning: 50000, hard: 100000 },
  elaboration: { warning: 30000, hard: 60000 },
  dev_implementation: { warning: 200000, hard: 500000 },
  code_review: { warning: 50000, hard: 100000 },
  qa_verification: { warning: 50000, hard: 100000 },
}

// ============================================================================
// Budget Configuration
// ============================================================================

/**
 * Token budget configuration for a story.
 * Can be set in story frontmatter.
 */
export const TokenBudgetConfigSchema = z.object({
  /** Enforcement level for this story */
  enforcement: EnforcementLevelSchema.default('warning'),

  /** Multiplier for default thresholds (0.5 - 5.0) */
  multiplier: z.number().min(0.5).max(5).default(1.0),

  /** Custom limits (overrides defaults) */
  customLimits: PhaseTokenLimitsSchema.partial().optional(),
})

export type TokenBudgetConfig = z.infer<typeof TokenBudgetConfigSchema>

// ============================================================================
// Budget Check Result
// ============================================================================

/**
 * Result of a token budget check.
 */
export const BudgetCheckResultSchema = z.object({
  /** Phase being checked */
  phase: z.string(),

  /** Tokens used so far */
  tokensUsed: z.number().int().min(0),

  /** Effective warning threshold (with multiplier) */
  warningThreshold: z.number().int().min(0),

  /** Effective hard limit (with multiplier) */
  hardLimit: z.number().int().min(0),

  /** Whether warning threshold was exceeded */
  warningExceeded: z.boolean(),

  /** Whether hard limit was exceeded */
  exceeded: z.boolean(),

  /** Percentage of hard limit used */
  percentUsed: z.number().min(0),

  /** Human-readable message */
  message: z.string(),

  /** Recommended action based on enforcement level */
  action: z.enum(['continue', 'warn', 'confirm', 'fail']),
})

export type BudgetCheckResult = z.infer<typeof BudgetCheckResultSchema>

// ============================================================================
// Token Usage
// ============================================================================

/**
 * Token usage for a single operation.
 */
export const TokenUsageSchema = z.object({
  /** Input tokens */
  input: z.number().int().min(0),

  /** Output tokens */
  output: z.number().int().min(0),

  /** Total tokens (input + output) */
  total: z.number().int().min(0),

  /** Cache read tokens (if applicable) */
  cacheRead: z.number().int().min(0).optional(),

  /** Cache write tokens (if applicable) */
  cacheWrite: z.number().int().min(0).optional(),
})

export type TokenUsage = z.infer<typeof TokenUsageSchema>

/**
 * Token usage summary for a phase.
 */
export const PhaseTokenSummarySchema = z.object({
  /** Phase name */
  phase: z.string(),

  /** Story ID */
  storyId: z.string(),

  /** Total token usage */
  usage: TokenUsageSchema,

  /** Number of API calls */
  apiCalls: z.number().int().min(0),

  /** Timestamp when phase started */
  startedAt: z.string().datetime(),

  /** Timestamp when phase completed */
  completedAt: z.string().datetime().optional(),

  /** Budget check result */
  budgetCheck: BudgetCheckResultSchema.optional(),
})

export type PhaseTokenSummary = z.infer<typeof PhaseTokenSummarySchema>

// ============================================================================
// Check Functions
// ============================================================================

type PhaseKey = keyof PhaseTokenLimits

/**
 * Checks token usage against budget limits.
 */
export function checkTokenBudget(params: {
  phase: PhaseKey
  tokensUsed: number
  enforcement?: EnforcementLevel
  multiplier?: number
  customLimits?: Partial<PhaseTokenLimits>
}): BudgetCheckResult {
  const {
    phase,
    tokensUsed,
    enforcement = 'warning',
    multiplier = 1.0,
    customLimits,
  } = params

  // Get limits for this phase
  const baseLimits = customLimits?.[phase] ?? DEFAULT_LIMITS[phase]
  const warningThreshold = Math.floor(baseLimits.warning * multiplier)
  const hardLimit = Math.floor(baseLimits.hard * multiplier)

  const warningExceeded = tokensUsed >= warningThreshold
  const exceeded = tokensUsed >= hardLimit
  const percentUsed = hardLimit > 0 ? (tokensUsed / hardLimit) * 100 : 0

  // Determine action based on enforcement level
  let action: 'continue' | 'warn' | 'confirm' | 'fail'
  let message: string

  if (exceeded) {
    switch (enforcement) {
      case 'advisory':
        action = 'continue'
        message = `Token budget exceeded (${tokensUsed.toLocaleString()}/${hardLimit.toLocaleString()}) - advisory only`
        break
      case 'warning':
        action = 'warn'
        message = `⚠️ Token budget exceeded (${tokensUsed.toLocaleString()}/${hardLimit.toLocaleString()})`
        break
      case 'soft_gate':
        action = 'confirm'
        message = `🛑 Token budget exceeded (${tokensUsed.toLocaleString()}/${hardLimit.toLocaleString()}) - confirmation required`
        break
      case 'hard_gate':
        action = 'fail'
        message = `❌ Token budget exceeded (${tokensUsed.toLocaleString()}/${hardLimit.toLocaleString()}) - phase failed`
        break
    }
  } else if (warningExceeded) {
    action = enforcement === 'advisory' ? 'continue' : 'warn'
    message = `Token usage at ${percentUsed.toFixed(0)}% (${tokensUsed.toLocaleString()}/${hardLimit.toLocaleString()})`
  } else {
    action = 'continue'
    message = `Token usage OK (${percentUsed.toFixed(0)}%)`
  }

  return BudgetCheckResultSchema.parse({
    phase,
    tokensUsed,
    warningThreshold,
    hardLimit,
    warningExceeded,
    exceeded,
    percentUsed,
    message,
    action,
  })
}

/**
 * Calculates total tokens from input/output.
 */
export function calculateTotalTokens(usage: Partial<TokenUsage>): number {
  return (usage.input ?? 0) + (usage.output ?? 0)
}

/**
 * Merges multiple token usages.
 */
export function mergeTokenUsage(usages: TokenUsage[]): TokenUsage {
  return TokenUsageSchema.parse({
    input: usages.reduce((sum, u) => sum + u.input, 0),
    output: usages.reduce((sum, u) => sum + u.output, 0),
    total: usages.reduce((sum, u) => sum + u.total, 0),
    cacheRead: usages.reduce((sum, u) => sum + (u.cacheRead ?? 0), 0),
    cacheWrite: usages.reduce((sum, u) => sum + (u.cacheWrite ?? 0), 0),
  })
}

/**
 * Creates a token usage from input/output counts.
 */
export function createTokenUsage(input: number, output: number): TokenUsage {
  return TokenUsageSchema.parse({
    input,
    output,
    total: input + output,
  })
}

/**
 * Formats token usage for display.
 */
export function formatTokenUsage(usage: TokenUsage): string {
  const parts = [`${usage.total.toLocaleString()} total`]
  parts.push(`(${usage.input.toLocaleString()} in`)
  parts.push(`${usage.output.toLocaleString()} out)`)

  if (usage.cacheRead && usage.cacheRead > 0) {
    parts.push(`[${usage.cacheRead.toLocaleString()} cache]`)
  }

  return parts.join(' ')
}

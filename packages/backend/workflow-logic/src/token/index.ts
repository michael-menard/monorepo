/**
 * Token usage tracking business logic
 *
 * Pure functions for estimating and formatting token usage.
 * No I/O — all functions are deterministic and side-effect free.
 *
 * AC-4: TokenUsageSchema, estimateTokenCount, formatTokenSummary
 *
 * Source: _shared/token-tracking.md
 */

import { z } from 'zod'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Token usage record for a single phase or operation.
 *
 * Constraints per elaboration opp-2:
 * - inputTokens: non-negative integer (z.number().int().min(0))
 * - outputTokens: non-negative integer (z.number().int().min(0))
 * - phase: optional string identifier for the phase
 */
export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  phase: z.string().optional(),
})
export type TokenUsage = z.infer<typeof TokenUsageSchema>

// ============================================================================
// Public API
// ============================================================================

/**
 * Estimates the token count from a byte count.
 *
 * Uses the standard approximation: 1 token ≈ 4 bytes.
 * Result is rounded to the nearest integer.
 *
 * Per token-tracking.md: "In: ~X (bytes read / 4)"
 *
 * @param bytes - Number of bytes to estimate token count for
 * @returns Estimated token count (bytes / 4, rounded)
 */
export function estimateTokenCount(bytes: number): number {
  return Math.round(bytes / 4)
}

/**
 * Formats a TokenUsage record into a human-readable summary string.
 *
 * Format per token-tracking.md:
 *   "In: ~X Out: ~Y"
 *
 * If phase is provided:
 *   "In: ~X Out: ~Y (phase)"
 *
 * @param usage - The TokenUsage record to format
 * @returns Human-readable token summary string
 */
export function formatTokenSummary(usage: TokenUsage): string {
  const base = `In: ~${usage.inputTokens} Out: ~${usage.outputTokens}`

  if (usage.phase) {
    return `${base} (${usage.phase})`
  }

  return base
}

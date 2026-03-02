/**
 * budget-accumulator.ts
 *
 * Per-story cumulative token budget accumulator.
 * Tracks total tokens consumed across all model calls for a given storyId.
 *
 * Uses direct numeric comparison against hardBudgetCap — does NOT call
 * checkTokenBudget() which is phase-key-typed and incompatible.
 *
 * @module pipeline/budget-accumulator
 */

import { logger } from '@repo/logger'
import { BudgetExhaustedError } from './__types__/index.js'

// ============================================================================
// BudgetAccumulator Class
// ============================================================================

/**
 * Per-story token budget accumulator.
 * Maintains an in-memory Map<storyId, number> tracking cumulative tokens.
 *
 * @example
 * ```typescript
 * const acc = new BudgetAccumulator()
 * acc.record('STORY-001', 500)
 * acc.checkBudget('STORY-001', 1000, 5000) // OK: total 1500 < 5000
 * acc.checkBudget('STORY-001', 4000, 5000) // throws BudgetExhaustedError (total would be 5500)
 * ```
 */
export class BudgetAccumulator {
  private readonly usage: Map<string, number> = new Map()

  /**
   * Record token usage for a story.
   * Adds `tokens` to the running cumulative total for `storyId`.
   *
   * @param storyId - Story/task identifier
   * @param tokens - Number of tokens to add (must be >= 0)
   */
  record(storyId: string, tokens: number): void {
    const current = this.usage.get(storyId) ?? 0
    const updated = current + tokens
    this.usage.set(storyId, updated)

    logger.debug('budget_accumulator', {
      event: 'tokens_recorded',
      storyId,
      tokens,
      total: updated,
    })
  }

  /**
   * Get the current cumulative token usage for a story.
   *
   * @param storyId - Story/task identifier
   * @returns Total tokens used so far (0 if no usage recorded)
   */
  getStoryUsage(storyId: string): number {
    return this.usage.get(storyId) ?? 0
  }

  /**
   * Check if adding `newTokens` would exceed `hardBudgetCap` for `storyId`.
   * Throws BudgetExhaustedError if the cap would be exceeded.
   *
   * Uses direct numeric comparison — do NOT use checkTokenBudget() which
   * requires a PhaseKey and is incompatible with cross-story accumulation.
   *
   * @param storyId - Story/task identifier
   * @param newTokens - Tokens about to be consumed
   * @param hardBudgetCap - Maximum allowed cumulative tokens for this story
   * @throws BudgetExhaustedError if current + newTokens > hardBudgetCap
   */
  checkBudget(storyId: string, newTokens: number, hardBudgetCap: number): void {
    const current = this.getStoryUsage(storyId)
    const projected = current + newTokens

    if (projected > hardBudgetCap) {
      logger.warn('budget_accumulator', {
        event: 'budget_exceeded',
        storyId,
        current,
        newTokens,
        projected,
        hardBudgetCap,
      })
      throw new BudgetExhaustedError({
        storyId,
        tokensUsed: projected,
        budgetCap: hardBudgetCap,
      })
    }

    logger.debug('budget_accumulator', {
      event: 'budget_ok',
      storyId,
      current,
      newTokens,
      projected,
      hardBudgetCap,
    })
  }

  /**
   * Reset usage for all stories (useful for testing).
   */
  reset(): void {
    this.usage.clear()
  }
}

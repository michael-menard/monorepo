import { z } from 'zod'
import { logger } from '@repo/logger'
import type { DecisionCallback, DecisionRequest, DecisionResponse } from './types.js'

/**
 * Decision rule schema for automated decision making
 */
export const DecisionRuleSchema = z.object({
  name: z.string(),
  condition: z.custom<(context: Record<string, unknown>) => boolean>(),
  answer: z.union([z.string(), z.array(z.string())]),
  rationale: z.string(),
})
export type DecisionRule = z.infer<typeof DecisionRuleSchema>

/**
 * Automated decision callback with configurable rule engine
 * Matches rules based on context and returns predefined answers
 */
export class AutoDecisionCallback implements DecisionCallback {
  constructor(
    private rules: DecisionRule[],
    private defaultAnswer?: string,
  ) {}

  async ask(request: DecisionRequest): Promise<DecisionResponse> {
    const { id, context = {}, options } = request

    // Find first matching rule
    const matchedRule = this.rules.find(rule => {
      try {
        return rule.condition(context)
      } catch (error) {
        logger.warn('Rule condition evaluation failed', {
          rule: rule.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
        return false
      }
    })

    const answer = matchedRule?.answer ?? this.defaultAnswer ?? options[0]?.value ?? ''

    const rationale = matchedRule?.rationale ?? 'Default fallback'

    logger.info('Auto-decision made', {
      id,
      answer,
      rationale,
      rule: matchedRule?.name ?? 'default',
    })

    return {
      id,
      answer,
      cancelled: false,
      timedOut: false,
      timestamp: new Date().toISOString(),
    }
  }

  cleanup(): void {
    // No resources to clean up
  }
}

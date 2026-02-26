/**
 * pipeline/__types__/index.ts
 *
 * Zod schemas for PipelineModelRouter typed errors and dispatch interface.
 *
 * @module pipeline/__types__
 */

import { z } from 'zod'
import type { BaseMessage } from '@langchain/core/messages'

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when the per-story token budget has been exhausted.
 * Use direct numeric comparison against hardBudgetCap — do NOT use checkTokenBudget().
 */
export class BudgetExhaustedError extends Error {
  readonly storyId: string
  readonly tokensUsed: number
  readonly budgetCap: number

  constructor(params: { storyId: string; tokensUsed: number; budgetCap: number }) {
    super(
      `Token budget exhausted for story '${params.storyId}': used ${params.tokensUsed}, cap ${params.budgetCap}`,
    )
    this.name = 'BudgetExhaustedError'
    this.storyId = params.storyId
    this.tokensUsed = params.tokensUsed
    this.budgetCap = params.budgetCap
    // Restore prototype chain for instanceof checks across TypeScript transpilation
    Object.setPrototypeOf(this, BudgetExhaustedError.prototype)
  }
}

export const BudgetExhaustedErrorSchema = z.object({
  name: z.literal('BudgetExhaustedError'),
  message: z.string(),
  storyId: z.string(),
  tokensUsed: z.number().int().nonnegative(),
  budgetCap: z.number().int().positive(),
})

/**
 * Error thrown when a provider's rate limit is exceeded and max wait was reached.
 */
export class RateLimitExceededError extends Error {
  readonly provider: string

  constructor(params: { provider: string; waitMs: number }) {
    super(
      `Rate limit exceeded for provider '${params.provider}': max wait ${params.waitMs}ms reached`,
    )
    this.name = 'RateLimitExceededError'
    this.provider = params.provider
    Object.setPrototypeOf(this, RateLimitExceededError.prototype)
  }
}

export const RateLimitExceededErrorSchema = z.object({
  name: z.literal('RateLimitExceededError'),
  message: z.string(),
  provider: z.string(),
})

/**
 * Error thrown when all providers in the escalation chain have been exhausted.
 */
export class ProviderChainExhaustedError extends Error {
  readonly storyId: string
  readonly providers: string[]
  readonly reasons: string[]

  constructor(params: { storyId: string; providers: string[]; reasons: string[] }) {
    super(
      `All providers exhausted for story '${params.storyId}': tried [${params.providers.join(', ')}]`,
    )
    this.name = 'ProviderChainExhaustedError'
    this.storyId = params.storyId
    this.providers = params.providers
    this.reasons = params.reasons
    Object.setPrototypeOf(this, ProviderChainExhaustedError.prototype)
  }
}

export const ProviderChainExhaustedErrorSchema = z.object({
  name: z.literal('ProviderChainExhaustedError'),
  message: z.string(),
  storyId: z.string(),
  providers: z.array(z.string()),
  reasons: z.array(z.string()),
})

// ============================================================================
// Dispatch Interface
// ============================================================================

/**
 * Options for dispatching a pipeline task to a model.
 * messages is typed as BaseMessage[] (LangChain type).
 */
export const PipelineDispatchOptionsSchema = z.object({
  /** The story/task identifier for per-story budget tracking */
  storyId: z.string().min(1),

  /** The agent identifier for model assignment lookup */
  agentId: z.string().min(1),

  /** LangChain messages to pass to the model */
  messages: z.custom<BaseMessage[]>(val => Array.isArray(val)),
})

export type PipelineDispatchOptions = z.infer<typeof PipelineDispatchOptionsSchema>

/**
 * Result returned from a pipeline dispatch call.
 */
export const PipelineDispatchResultSchema = z.object({
  /** The model's response text */
  response: z.string(),

  /** Input tokens consumed by this call */
  inputTokens: z.number().int().nonnegative(),

  /** Output tokens produced by this call */
  outputTokens: z.number().int().nonnegative(),
})

export type PipelineDispatchResult = z.infer<typeof PipelineDispatchResultSchema>

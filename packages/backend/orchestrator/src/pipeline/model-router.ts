/**
 * model-router.ts
 *
 * PipelineModelRouter — escalation-chain model dispatcher for the autonomous pipeline.
 * Wraps ModelRouterFactory to resolve providers. Implements three-provider escalation:
 * ollama → openrouter → anthropic.
 *
 * Key behaviors:
 * - Calls provider.getModel(modelString).invoke(messages) (LangChain BaseChatModel API)
 * - Extracts token usage from AIMessage.usage_metadata
 * - Per-provider TokenBucket rate limiting
 * - Per-story BudgetAccumulator with hard cap enforcement
 * - DB-backed model_assignments override (cached, invalidatable)
 * - Affinity-based routing: reads wint.model_affinity profiles per (change_type, file_type)
 * - Reads API keys from environment only
 * - Structured logging via @repo/logger with domain 'pipeline_model_router'
 *
 * @module pipeline/model-router
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { BaseMessage } from '@langchain/core/messages'
import type { AIMessage } from '@langchain/core/messages'
import { ModelRouterFactory } from '../models/unified-interface.js'
import { TokenBucket } from './token-bucket.js'
import { BudgetAccumulator } from './budget-accumulator.js'
import {
  BudgetExhaustedError,
  ProviderChainExhaustedError,
  type AffinityProfile,
  type AffinityReader,
  type PipelineDispatchOptions,
  type PipelineDispatchResult,
} from './__types__/index.js'

// ============================================================================
// Constants
// ============================================================================

/**
 * Escalation chain: providers tried in order.
 * ollama (local/free) → openrouter (external) → anthropic (direct)
 */
const ESCALATION_CHAIN = ['ollama', 'openrouter', 'anthropic'] as const
type EscalationProvider = (typeof ESCALATION_CHAIN)[number]

/**
 * Default model strings per provider.
 * These are used as fallback when DB model_assignments don't have an entry.
 */
const DEFAULT_MODELS: Record<EscalationProvider, string> = {
  ollama: 'ollama/qwen2.5-coder:7b',
  openrouter: 'openrouter/anthropic/claude-3.5-haiku',
  anthropic: 'anthropic/claude-haiku-3.5',
}

/**
 * Default rate limit config per provider.
 */
const DEFAULT_RATE_LIMIT: Record<
  EscalationProvider,
  { capacity: number; refillRate: number; maxWaitMs: number }
> = {
  ollama: { capacity: 10, refillRate: 2, maxWaitMs: 30000 },
  openrouter: { capacity: 5, refillRate: 1, maxWaitMs: 30000 },
  anthropic: { capacity: 3, refillRate: 0.5, maxWaitMs: 30000 },
}

/**
 * Default hard budget cap per story (tokens).
 * Can be overridden at dispatch time.
 */
const DEFAULT_HARD_BUDGET_CAP = 500_000

/**
 * Default minimum success rate threshold for affinity routing.
 */
const DEFAULT_AFFINITY_SUCCESS_RATE_THRESHOLD = 0.85

/**
 * Default minimum sample size for affinity routing.
 */
const DEFAULT_AFFINITY_MIN_SAMPLE_SIZE = 20

// ============================================================================
// DB Model Assignment Schema
// ============================================================================

export const ModelAssignmentSchema = z.object({
  agentPattern: z.string(),
  provider: z.string(),
  model: z.string(),
  tier: z.number().int(),
})

export type ModelAssignment = z.infer<typeof ModelAssignmentSchema>

// ============================================================================
// Router Config Schema
// ============================================================================

export const PipelineModelRouterConfigSchema = z.object({
  hardBudgetCap: z.number().int().positive().optional(),
  affinityReader: z.any().optional(),
  affinitySuccessRateThreshold: z.number().min(0).max(1).optional(),
  affinityMinSampleSize: z.number().int().nonnegative().optional(),
})

export type PipelineModelRouterConfig = {
  hardBudgetCap?: number
  affinityReader?: AffinityReader
  affinitySuccessRateThreshold?: number
  affinityMinSampleSize?: number
}

// ============================================================================
// PipelineModelRouter
// ============================================================================

/**
 * PipelineModelRouter — dispatches messages through the escalation chain.
 * Implements three-tier routing:
 *   Tier 1: DB model_assignments override
 *   Tier 2: Affinity-based routing (wint.model_affinity profiles)
 *   Tier 3: Static escalation chain (ollama → openrouter → anthropic)
 *
 * Instantiated by PipelineModelRouterFactory.
 */
export class PipelineModelRouter {
  private readonly hardBudgetCap: number
  private readonly budgetAccumulator: BudgetAccumulator
  private readonly tokenBuckets: Map<EscalationProvider, TokenBucket> = new Map()
  private assignmentsCache: ModelAssignment[] | null = null
  private readonly affinityReader: AffinityReader | undefined
  private readonly affinitySuccessRateThreshold: number
  private readonly affinityMinSampleSize: number
  private readonly affinityCache: Map<string, AffinityProfile | null> = new Map()

  constructor(config?: PipelineModelRouterConfig | number) {
    // Support legacy single-number constructor for backward compat
    if (typeof config === 'number') {
      this.hardBudgetCap = config
      this.affinityReader = undefined
      this.affinitySuccessRateThreshold = DEFAULT_AFFINITY_SUCCESS_RATE_THRESHOLD
      this.affinityMinSampleSize = DEFAULT_AFFINITY_MIN_SAMPLE_SIZE
    } else {
      this.hardBudgetCap = config?.hardBudgetCap ?? DEFAULT_HARD_BUDGET_CAP
      this.affinityReader = config?.affinityReader
      this.affinitySuccessRateThreshold =
        config?.affinitySuccessRateThreshold ?? DEFAULT_AFFINITY_SUCCESS_RATE_THRESHOLD
      this.affinityMinSampleSize =
        config?.affinityMinSampleSize ?? DEFAULT_AFFINITY_MIN_SAMPLE_SIZE
    }

    this.budgetAccumulator = new BudgetAccumulator()
    // Initialize per-provider rate limiters
    for (const provider of ESCALATION_CHAIN) {
      this.tokenBuckets.set(provider, new TokenBucket(DEFAULT_RATE_LIMIT[provider]))
    }
  }

  /**
   * Dispatch messages through three-tier routing:
   *   1. DB assignment override
   *   2. Affinity-based routing
   *   3. Static escalation chain (ollama → openrouter → anthropic)
   *
   * @param options - Dispatch options (storyId, agentId, messages, changeType, fileType)
   * @returns PipelineDispatchResult with response and token counts
   * @throws BudgetExhaustedError if story budget would be exceeded
   * @throws ProviderChainExhaustedError if all providers fail
   */
  async dispatch(options: PipelineDispatchOptions): Promise<PipelineDispatchResult> {
    const {
      storyId,
      agentId,
      messages,
      changeType = 'unknown',
      fileType = 'unknown',
    } = options

    // -------------------------------------------------------------------------
    // Tier 1: Check DB assignment override for this agentId
    // -------------------------------------------------------------------------
    const dbModel = this._resolveDbAssignment(agentId)
    if (dbModel) {
      const provider = dbModel.split('/')[0] as EscalationProvider
      const result = await this._invokeModel(provider, dbModel, storyId, messages)

      logger.info('pipeline_model_router', {
        event: 'routing_decision',
        source: 'db_assignment',
        model: dbModel,
        provider,
        change_type: changeType,
        file_type: fileType,
        confidence_level: null,
        success_rate: null,
        sample_size: null,
      })

      return result
    }

    // -------------------------------------------------------------------------
    // Tier 2: Affinity-based routing
    // -------------------------------------------------------------------------
    if (this.affinityReader) {
      try {
        const profile = await this._queryAffinityProfile(changeType, fileType)

        if (
          profile !== null &&
          profile.success_rate >= this.affinitySuccessRateThreshold &&
          profile.confidence_level !== 'none' &&
          profile.confidence_level !== 'low' &&
          profile.sample_size >= this.affinityMinSampleSize
        ) {
          const modelString = profile.model
          const provider = modelString.split('/')[0] as EscalationProvider
          const result = await this._invokeModel(provider, modelString, storyId, messages)

          logger.info('pipeline_model_router', {
            event: 'routing_decision',
            source: 'affinity',
            model: modelString,
            provider,
            change_type: changeType,
            file_type: fileType,
            confidence_level: profile.confidence_level,
            success_rate: profile.success_rate,
            sample_size: profile.sample_size,
          })

          return result
        }
      } catch (err) {
        logger.warn('pipeline_model_router', {
          event: 'affinity_query_failed',
          changeType,
          fileType,
          reason: err instanceof Error ? err.message : String(err),
        })
        // Fall through to Tier 3
      }
    }

    // -------------------------------------------------------------------------
    // Tier 3: Static escalation chain (ollama → openrouter → anthropic)
    // -------------------------------------------------------------------------
    const triedProviders: string[] = []
    const reasons: string[] = []

    for (const provider of ESCALATION_CHAIN) {
      const modelString = this._resolveModel(provider, agentId)

      try {
        // Check budget before consuming rate limit tokens
        this.budgetAccumulator.checkBudget(storyId, 0, this.hardBudgetCap)

        // Consume rate limit token for this provider
        const bucket = this.tokenBuckets.get(provider)!
        await bucket.consume(1, provider)

        // Invoke model via LangChain BaseChatModel API
        const modelInstance = await this._getModelInstance(provider, modelString)
        const aiMessage = (await modelInstance.invoke(messages)) as AIMessage

        // Extract token usage from usage_metadata
        const inputTokens = aiMessage.usage_metadata?.input_tokens ?? 0
        const outputTokens = aiMessage.usage_metadata?.output_tokens ?? 0
        const totalTokens = inputTokens + outputTokens

        // Record usage in accumulator
        this.budgetAccumulator.record(storyId, totalTokens)

        const responseText =
          typeof aiMessage.content === 'string'
            ? aiMessage.content
            : JSON.stringify(aiMessage.content)

        logger.info('pipeline_model_router', {
          event: 'dispatch_success',
          storyId,
          agentId,
          provider,
          model: modelString,
          inputTokens,
          outputTokens,
        })

        logger.info('pipeline_model_router', {
          event: 'routing_decision',
          source: 'fallback',
          model: modelString,
          provider,
          change_type: changeType,
          file_type: fileType,
          confidence_level: null,
          success_rate: null,
          sample_size: null,
        })

        return {
          response: responseText,
          inputTokens,
          outputTokens,
        }
      } catch (err) {
        // BudgetExhaustedError is not recoverable — rethrow immediately
        if (err instanceof BudgetExhaustedError) {
          throw err
        }

        // Log failure and try next provider
        const reason = err instanceof Error ? err.message : String(err)
        triedProviders.push(provider)
        reasons.push(reason)

        logger.warn('pipeline_model_router', {
          event: 'provider_failure',
          storyId,
          agentId,
          provider,
          model: modelString,
          reason,
        })
      }
    }

    // All providers failed
    throw new ProviderChainExhaustedError({
      storyId,
      providers: triedProviders,
      reasons,
    })
  }

  /**
   * Query the affinity profile for a (changeType, fileType) pair.
   * Checks the in-memory cache first; on miss, calls affinityReader.query.
   */
  private async _queryAffinityProfile(
    changeType: string,
    fileType: string,
  ): Promise<AffinityProfile | null> {
    const cacheKey = `${changeType}:${fileType}`

    if (this.affinityCache.has(cacheKey)) {
      return this.affinityCache.get(cacheKey) ?? null
    }

    const profile = await this.affinityReader!.query(
      changeType,
      fileType,
      this.affinitySuccessRateThreshold,
      this.affinityMinSampleSize,
    )

    this.affinityCache.set(cacheKey, profile)
    return profile
  }

  /**
   * Invalidate the affinity cache.
   * Forces next dispatch to re-query the DB.
   */
  invalidateAffinityCache(): void {
    this.affinityCache.clear()
    logger.info('pipeline_model_router', {
      event: 'affinity_cache_invalidated',
    })
  }

  /**
   * Invoke a model directly (used by Tier 1 DB override and Tier 2 affinity routing).
   * Handles budget check, rate limiting, token recording, and response extraction.
   */
  private async _invokeModel(
    provider: EscalationProvider,
    modelString: string,
    storyId: string,
    messages: BaseMessage[],
  ): Promise<PipelineDispatchResult> {
    // Check budget before call
    this.budgetAccumulator.checkBudget(storyId, 0, this.hardBudgetCap)

    // Consume rate limit token if bucket exists for this provider
    const bucket = this.tokenBuckets.get(provider)
    if (bucket) {
      await bucket.consume(1, provider)
    }

    const modelInstance = await this._getModelInstance(provider, modelString)
    const aiMessage = (await modelInstance.invoke(messages)) as AIMessage

    const inputTokens = aiMessage.usage_metadata?.input_tokens ?? 0
    const outputTokens = aiMessage.usage_metadata?.output_tokens ?? 0
    const totalTokens = inputTokens + outputTokens

    this.budgetAccumulator.record(storyId, totalTokens)

    const responseText =
      typeof aiMessage.content === 'string'
        ? aiMessage.content
        : JSON.stringify(aiMessage.content)

    logger.info('pipeline_model_router', {
      event: 'dispatch_success',
      storyId,
      provider,
      model: modelString,
      inputTokens,
      outputTokens,
    })

    return { response: responseText, inputTokens, outputTokens }
  }

  /**
   * Resolve model string from DB assignment for this agentId (Tier 1 only).
   * Returns null if no DB override found.
   */
  private _resolveDbAssignment(agentId: string): string | null {
    if (!this.assignmentsCache) return null

    // Try each provider in escalation order to find a DB match
    for (const provider of ESCALATION_CHAIN) {
      const assignment = this.assignmentsCache.find(
        a => a.provider === provider && this._matchesPattern(a.agentPattern, agentId),
      )
      if (assignment) {
        return `${assignment.provider}/${assignment.model}`
      }
    }
    return null
  }

  /**
   * Resolve model string for a provider, checking DB cache first.
   * Falls back to DEFAULT_MODELS if no DB assignment found.
   */
  private _resolveModel(provider: EscalationProvider, agentId: string): string {
    if (this.assignmentsCache) {
      const assignment = this.assignmentsCache.find(
        a => a.provider === provider && this._matchesPattern(a.agentPattern, agentId),
      )
      if (assignment) {
        return `${assignment.provider}/${assignment.model}`
      }
    }
    return DEFAULT_MODELS[provider]
  }

  /**
   * Check if an agentId matches a pattern (simple glob: '*' matches all).
   */
  private _matchesPattern(pattern: string, agentId: string): boolean {
    if (pattern === '*') return true
    if (pattern === agentId) return true
    // Support basic prefix wildcard e.g. 'dev-*'
    if (pattern.endsWith('*')) {
      return agentId.startsWith(pattern.slice(0, -1))
    }
    return false
  }

  /**
   * Get a LangChain BaseChatModel instance for the given provider and model string.
   */
  private async _getModelInstance(provider: EscalationProvider, modelString: string) {
    const router = await ModelRouterFactory.getInstance()
    const llmProvider = await router.getProvider(modelString)
    return llmProvider.getModel(modelString)
  }

  /**
   * Load DB model assignments into cache.
   * Called lazily on first dispatch.
   */
  async loadAssignmentsCache(assignments: ModelAssignment[]): Promise<void> {
    this.assignmentsCache = assignments
    logger.info('pipeline_model_router', {
      event: 'assignments_cache_loaded',
      count: assignments.length,
    })
  }

  /**
   * Invalidate the DB assignments cache.
   * Forces next dispatch to reload from DB.
   */
  invalidateAssignmentsCache(): void {
    this.assignmentsCache = null
    logger.info('pipeline_model_router', {
      event: 'assignments_cache_invalidated',
    })
  }

  /**
   * Get current story token usage.
   */
  getStoryUsage(storyId: string): number {
    return this.budgetAccumulator.getStoryUsage(storyId)
  }
}

// ============================================================================
// PipelineModelRouterFactory (Singleton)
// ============================================================================

/**
 * Singleton factory for PipelineModelRouter.
 * Ensures a single instance is shared across the process.
 */
export class PipelineModelRouterFactory {
  private static _instance: PipelineModelRouter | null = null

  /**
   * Get or create the singleton PipelineModelRouter instance.
   */
  static getInstance(): PipelineModelRouter {
    if (!PipelineModelRouterFactory._instance) {
      PipelineModelRouterFactory._instance = new PipelineModelRouter()
      logger.info('pipeline_model_router', {
        event: 'factory_instance_created',
      })
    }
    return PipelineModelRouterFactory._instance
  }

  /**
   * Clear the singleton instance (for testing).
   */
  static clearInstance(): void {
    PipelineModelRouterFactory._instance = null
    logger.info('pipeline_model_router', {
      event: 'factory_instance_cleared',
    })
  }
}

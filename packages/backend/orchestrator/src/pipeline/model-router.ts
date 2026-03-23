/**
 * model-router.ts
 *
 * PipelineModelRouter — escalation-chain model dispatcher for the autonomous pipeline.
 * Wraps ModelRouterFactory to resolve providers.
 *
 * Routing modes:
 *
 * 1. Four-tier mode (affinityReader + hasAnyQualifyingProfile configured — APIP-3070):
 *    Tier 1: DB override
 *    Tier 2: Affinity (confidence gate: medium/high)
 *    Tier 3: Exploration slot (10% random Ollama for telemetry)
 *    Tier 4: Conservative OpenRouter default
 *    Cold-start shortcut: if hasAnyQualifyingProfile() returns false,
 *    skip tiers 2+3, go directly to tier 4.
 *
 * 2. Three-tier affinity mode (affinityReader configured, no hasAnyQualifyingProfile — APIP-3040 compat):
 *    Tier 1: DB override
 *    Tier 2: Affinity (none/low filtered out, medium/high accepted)
 *    Tier 3: Static escalation chain (ollama → openrouter → anthropic)
 *
 * 3. Legacy mode (no affinityReader — APIP-0040 compat):
 *    Tier 1: DB override
 *    Tier 2: Static escalation chain (ollama → openrouter → anthropic)
 *
 * Key behaviors:
 * - Calls provider.getModel(modelString).invoke(messages) (LangChain BaseChatModel API)
 * - Extracts token usage from AIMessage.usage_metadata
 * - Per-provider TokenBucket rate limiting
 * - Per-story BudgetAccumulator with hard cap enforcement
 * - DB-backed model_assignments override (cached, invalidatable)
 * - Affinity-based routing: reads model affinity profiles per (change_type, file_type)
 * - Reads API keys from environment only
 * - Structured logging via @repo/logger with domain 'pipeline_model_router'
 *
 * @module pipeline/model-router
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { BaseMessage, AIMessage } from '@langchain/core/messages'
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
import {
  PROVIDER_CHAIN,
  ESCALATION_CHAIN,
  DEFAULT_MODELS,
  DEFAULT_RATE_LIMIT,
  CONFIDENCE_THRESHOLDS as _CONFIDENCE_THRESHOLDS,
} from '../config/pipeline-providers.js'

// ============================================================================
// Re-export CONFIDENCE_THRESHOLDS for backward compat
// ============================================================================

export { CONFIDENCE_THRESHOLDS } from '../config/pipeline-providers.js'

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
  // AC-1: Cold-start / exploration fields (APIP-3070)
  conservativeOpenRouterModel: z.string().min(1).default('openrouter/anthropic/claude-3-haiku'),
  explorationBudgetFraction: z.number().min(0).max(1).default(0.1),
  explorationMinSuccessRateFloor: z.number().min(0).max(1).default(0.3),
  manualSeedEnabled: z.boolean().default(false),
  randomFn: z.function().optional(),
  // Cold-start detector: when provided, enables four-tier mode (APIP-3070)
  hasAnyQualifyingProfile: z.function().optional(),
})

export type PipelineModelRouterConfig = {
  hardBudgetCap?: number
  affinityReader?: AffinityReader
  affinitySuccessRateThreshold?: number
  affinityMinSampleSize?: number
  conservativeOpenRouterModel?: string
  explorationBudgetFraction?: number
  explorationMinSuccessRateFloor?: number
  manualSeedEnabled?: boolean
  randomFn?: () => number
  hasAnyQualifyingProfile?: () => Promise<boolean>
}

// ============================================================================
// Default constants (kept local but derived from PROVIDER_CHAIN config)
// ============================================================================

const DEFAULT_HARD_BUDGET_CAP = 500_000
const DEFAULT_AFFINITY_SUCCESS_RATE_THRESHOLD = 0.85
const DEFAULT_AFFINITY_MIN_SAMPLE_SIZE = 20

// ============================================================================
// PipelineModelRouter
// ============================================================================

/**
 * PipelineModelRouter — dispatches messages through multi-tier routing.
 * See module-level doc for routing mode description.
 */
export class PipelineModelRouter {
  private readonly hardBudgetCap: number
  private readonly budgetAccumulator: BudgetAccumulator
  private readonly tokenBuckets: Map<string, TokenBucket> = new Map()
  private assignmentsCache: ModelAssignment[] | null = null
  private readonly affinityReader: AffinityReader | undefined
  private readonly affinitySuccessRateThreshold: number
  private readonly affinityMinSampleSize: number
  private readonly affinityCache: Map<string, AffinityProfile | null> = new Map()
  // AC-1 new fields (APIP-3070)
  private readonly conservativeOpenRouterModel: string
  private readonly explorationBudgetFraction: number
  private readonly explorationMinSuccessRateFloor: number
  private readonly randomFn: () => number
  private readonly hasAnyQualifyingProfile: (() => Promise<boolean>) | undefined
  // AC-2: cold-start flag (null = not yet evaluated)
  private _hasAnyHighConfidenceProfile: boolean | null = null

  constructor(config?: PipelineModelRouterConfig | number) {
    // Support legacy single-number constructor for backward compat
    if (typeof config === 'number') {
      this.hardBudgetCap = config
      this.affinityReader = undefined
      this.affinitySuccessRateThreshold = DEFAULT_AFFINITY_SUCCESS_RATE_THRESHOLD
      this.affinityMinSampleSize = DEFAULT_AFFINITY_MIN_SAMPLE_SIZE
      this.conservativeOpenRouterModel = 'openrouter/anthropic/claude-3-haiku'
      this.explorationBudgetFraction = 0.1
      this.explorationMinSuccessRateFloor = 0.3
      this.randomFn = Math.random
      this.hasAnyQualifyingProfile = undefined
    } else {
      this.hardBudgetCap = config?.hardBudgetCap ?? DEFAULT_HARD_BUDGET_CAP
      this.affinityReader = config?.affinityReader
      this.affinitySuccessRateThreshold =
        config?.affinitySuccessRateThreshold ?? DEFAULT_AFFINITY_SUCCESS_RATE_THRESHOLD
      this.affinityMinSampleSize = config?.affinityMinSampleSize ?? DEFAULT_AFFINITY_MIN_SAMPLE_SIZE
      this.conservativeOpenRouterModel =
        config?.conservativeOpenRouterModel ?? 'openrouter/anthropic/claude-3-haiku'
      this.explorationBudgetFraction = config?.explorationBudgetFraction ?? 0.1
      this.explorationMinSuccessRateFloor = config?.explorationMinSuccessRateFloor ?? 0.3
      this.randomFn = config?.randomFn ?? Math.random
      this.hasAnyQualifyingProfile = config?.hasAnyQualifyingProfile
    }

    this.budgetAccumulator = new BudgetAccumulator()
    // Initialize per-provider rate limiters from PROVIDER_CHAIN config
    for (const provider of ESCALATION_CHAIN) {
      this.tokenBuckets.set(provider, new TokenBucket(DEFAULT_RATE_LIMIT[provider]))
    }
  }

  /**
   * Dispatch messages through the appropriate routing mode.
   *
   * @param options - Dispatch options (storyId, agentId, messages, changeType, fileType)
   * @returns PipelineDispatchResult with response and token counts
   * @throws BudgetExhaustedError if story budget would be exceeded
   * @throws ProviderChainExhaustedError if all providers fail
   */
  async dispatch(options: PipelineDispatchOptions): Promise<PipelineDispatchResult> {
    const { storyId, agentId, messages, changeType = 'unknown', fileType = 'unknown' } = options

    // -------------------------------------------------------------------------
    // Tier 1: Check DB assignment override for this agentId (all modes)
    // -------------------------------------------------------------------------
    const dbModel = this._resolveDbAssignment(agentId)
    if (dbModel) {
      const provider = dbModel.split('/')[0]
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
    // Route to appropriate mode based on configuration
    // -------------------------------------------------------------------------

    // Four-tier mode: affinityReader + hasAnyQualifyingProfile (APIP-3070)
    if (this.affinityReader && this.hasAnyQualifyingProfile) {
      return await this._dispatchFourTier(storyId, agentId, messages, changeType, fileType)
    }

    // Three-tier affinity mode: affinityReader only (APIP-3040 compat)
    if (this.affinityReader) {
      return await this._dispatchThreeTierAffinity(storyId, agentId, messages, changeType, fileType)
    }

    // Legacy escalation mode: no affinityReader (APIP-0040 compat)
    return await this._dispatchLegacyEscalation(storyId, agentId, messages, changeType, fileType)
  }

  // ============================================================================
  // Four-tier mode (APIP-3070)
  // ============================================================================

  /**
   * Four-tier dispatch (requires affinityReader + hasAnyQualifyingProfile).
   * Implements AC-2, AC-3, AC-4, AC-7.
   */
  private async _dispatchFourTier(
    storyId: string,
    _agentId: string,
    messages: BaseMessage[],
    changeType: string,
    fileType: string,
  ): Promise<PipelineDispatchResult> {
    // -------------------------------------------------------------------------
    // AC-2: Cold-start check — evaluate lazily and cache the result
    // -------------------------------------------------------------------------
    if (this._hasAnyHighConfidenceProfile === null) {
      try {
        this._hasAnyHighConfidenceProfile = await this.hasAnyQualifyingProfile!()
      } catch (_err) {
        // If the check fails, conservatively assume cold-start
        this._hasAnyHighConfidenceProfile = false
      }
    }

    if (!this._hasAnyHighConfidenceProfile) {
      // Cold-start: skip tiers 2 and 3, go straight to tier 4
      return await this._dispatchTier4ColdStart(storyId, messages, changeType, fileType)
    }

    // -------------------------------------------------------------------------
    // Tier 2: Affinity-based routing (with confidence gate: medium/high only)
    // -------------------------------------------------------------------------
    try {
      const profile = await this._queryAffinityProfile(changeType, fileType)

      if (
        profile !== null &&
        profile.success_rate >= this.affinitySuccessRateThreshold &&
        (profile.confidence_level === 'medium' || profile.confidence_level === 'high') &&
        profile.sample_size >= this.affinityMinSampleSize
      ) {
        const modelString = profile.model
        const provider = modelString.split('/')[0]
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

    // -------------------------------------------------------------------------
    // Tier 3: Exploration slot (10% random Ollama routing for telemetry)
    // -------------------------------------------------------------------------
    const explorationResult = await this._tryExplorationSlot(
      storyId,
      messages,
      changeType,
      fileType,
    )
    if (explorationResult !== null) {
      return explorationResult
    }

    // -------------------------------------------------------------------------
    // Tier 4: Conservative OpenRouter default
    // -------------------------------------------------------------------------
    return await this._dispatchTier4Conservative(storyId, messages, changeType, fileType)
  }

  // ============================================================================
  // Three-tier affinity mode (APIP-3040 compat)
  // ============================================================================

  /**
   * Three-tier dispatch with affinity (APIP-3040 backward compat).
   * Falls back to static escalation chain when affinity fails.
   */
  private async _dispatchThreeTierAffinity(
    storyId: string,
    agentId: string,
    messages: BaseMessage[],
    changeType: string,
    fileType: string,
  ): Promise<PipelineDispatchResult> {
    // Tier 2: Affinity-based routing
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
        const provider = modelString.split('/')[0]
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
      // Fall through to escalation chain
    }

    // Tier 3 (legacy): Static escalation chain
    return await this._dispatchLegacyEscalation(storyId, agentId, messages, changeType, fileType)
  }

  // ============================================================================
  // Shared tier implementations
  // ============================================================================

  /**
   * Tier 3: Attempt exploration slot.
   * Returns null if exploration does not fire (let caller fall through to Tier 4).
   */
  private async _tryExplorationSlot(
    storyId: string,
    messages: BaseMessage[],
    changeType: string,
    fileType: string,
  ): Promise<PipelineDispatchResult | null> {
    // explorationBudgetFraction = 0 disables exploration entirely
    if (this.explorationBudgetFraction <= 0) {
      return null
    }

    // AC-4(a): Check if any affinity entry for (changeType, fileType) has
    // success_rate < explorationMinSuccessRateFloor AND sample_size > 0
    try {
      const profile = await this._queryAffinityProfile(changeType, fileType)
      if (
        profile !== null &&
        profile.sample_size > 0 &&
        profile.success_rate < this.explorationMinSuccessRateFloor
      ) {
        // Skip exploration — known bad route
        return null
      }
    } catch (_err) {
      // If we can't check, skip exploration conservatively
      return null
    }

    // Random gate: fire exploration if random() < explorationBudgetFraction
    const roll = this.randomFn()
    if (roll >= this.explorationBudgetFraction) {
      return null
    }

    // AC-4(b): Use exploration-capable provider from PROVIDER_CHAIN config
    const explorationProvider =
      PROVIDER_CHAIN.find(p => p.isExplorationCapable) ?? PROVIDER_CHAIN[0]
    const ollamaModel = explorationProvider.defaultModel

    try {
      const result = await this._invokeModel(
        explorationProvider.name,
        ollamaModel,
        storyId,
        messages,
      )

      // AC-7: Exploration slot structured log
      logger.info('pipeline_model_router', {
        event: 'routing_decision',
        source: 'exploration',
        model: ollamaModel,
        provider: explorationProvider.name,
        change_type: changeType,
        file_type: fileType,
        exploration_fraction: this.explorationBudgetFraction,
      })

      return result
    } catch (_err) {
      // Exploration provider unavailable — fall through to tier 4
      return null
    }
  }

  /**
   * Tier 4 (cold-start path): route to conservative OpenRouter model.
   * Used when no qualifying profiles exist (cold-start detection).
   * AC-7: structured log with source: 'cold_start'.
   */
  private async _dispatchTier4ColdStart(
    storyId: string,
    messages: BaseMessage[],
    changeType: string,
    fileType: string,
  ): Promise<PipelineDispatchResult> {
    const model = this.conservativeOpenRouterModel
    const provider = model.split('/')[0]

    const result = await this._invokeModel(provider, model, storyId, messages)

    logger.info('pipeline_model_router', {
      event: 'routing_decision',
      source: 'cold_start',
      model,
      provider: 'openrouter',
      change_type: changeType,
      file_type: fileType,
      reason: 'no_qualifying_profiles',
    })

    return result
  }

  /**
   * Tier 4 (conservative fallthrough path): route to conservative OpenRouter model.
   * Used when affinity and exploration both fail to route.
   */
  private async _dispatchTier4Conservative(
    storyId: string,
    messages: BaseMessage[],
    changeType: string,
    fileType: string,
  ): Promise<PipelineDispatchResult> {
    const model = this.conservativeOpenRouterModel
    const provider = model.split('/')[0]

    try {
      const result = await this._invokeModel(provider, model, storyId, messages)

      logger.info('pipeline_model_router', {
        event: 'routing_decision',
        source: 'fallback',
        model,
        provider,
        change_type: changeType,
        file_type: fileType,
        confidence_level: null,
        success_rate: null,
        sample_size: null,
      })

      return result
    } catch (err) {
      // Conservative model failed — throw ProviderChainExhaustedError
      const reason = err instanceof Error ? err.message : String(err)
      throw new ProviderChainExhaustedError({
        storyId,
        providers: [provider],
        reasons: [reason],
      })
    }
  }

  /**
   * Legacy static escalation chain (ollama → openrouter → anthropic).
   * Used when affinityReader is not configured (APIP-0040 compat)
   * or as fallback from three-tier affinity mode (APIP-3040 compat).
   */
  private async _dispatchLegacyEscalation(
    storyId: string,
    agentId: string,
    messages: BaseMessage[],
    changeType: string,
    fileType: string,
  ): Promise<PipelineDispatchResult> {
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

  // ============================================================================
  // Cache and affinity helpers
  // ============================================================================

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
   * AC-8: also resets the cold-start flag (_hasAnyHighConfidenceProfile).
   */
  invalidateAffinityCache(): void {
    this.affinityCache.clear()
    this._hasAnyHighConfidenceProfile = null
    logger.info('pipeline_model_router', {
      event: 'affinity_cache_invalidated',
    })
  }

  /**
   * Invoke a model directly (used by Tier 1 DB override and Tier 2 affinity routing).
   * Handles budget check, rate limiting, token recording, and response extraction.
   */
  private async _invokeModel(
    provider: string,
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
      typeof aiMessage.content === 'string' ? aiMessage.content : JSON.stringify(aiMessage.content)

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
  private _resolveModel(provider: string, agentId: string): string {
    if (this.assignmentsCache) {
      const assignment = this.assignmentsCache.find(
        a => a.provider === provider && this._matchesPattern(a.agentPattern, agentId),
      )
      if (assignment) {
        return `${assignment.provider}/${assignment.model}`
      }
    }
    return DEFAULT_MODELS[provider] ?? `${provider}/unknown`
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
  private async _getModelInstance(_provider: string, modelString: string) {
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

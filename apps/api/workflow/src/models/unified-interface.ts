/**
 * unified-interface.ts
 *
 * Unified model router implementing WINT-0220 tier-based selection strategy.
 * Provides tier selection, escalation logic, fallback chains, and provider integration.
 *
 * @module models/unified-interface
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ILLMProvider } from '../providers/base.js'
import { getProviderForModel } from '../config/llm-provider.js'
import { loadStrategy, type Strategy } from './strategy-loader.js'
import type { TaskContract } from './__types__/task-contract.js'
import { selectModelForTask } from './task-selector.js'
import type { QualityEvaluation } from './__types__/quality-evaluation.js'
import { evaluateQuality as evaluateQualityFn } from './quality-evaluator.js'

// ============================================================================
// Zod Schemas (CLAUDE.md compliant)
// ============================================================================

/**
 * Tier selection result.
 */
export const TierSelectionSchema = z.object({
  tier: z.number().int().min(0).max(3),
  model: z.string().min(1), // Format: provider/model (e.g., anthropic/claude-sonnet-4.5)
  provider: z.string().min(1),
  cost_per_1m_tokens: z.number().nonnegative(),
  fallbackChain: z.array(z.string()),
})

export type TierSelection = z.infer<typeof TierSelectionSchema>

/**
 * Escalation context for trigger evaluation.
 */
export const EscalationContextSchema = z.object({
  trigger: z.enum(['quality', 'cost', 'failure', 'human']),
  currentTier: z.number().int().min(0).max(3),
  retries: z.number().int().nonnegative().optional(),
  budgetUsed: z.number().nonnegative().optional(),
  confidence: z.number().nonnegative().optional(),
  reason: z.string().optional(),
})

export type EscalationContext = z.infer<typeof EscalationContextSchema>

/**
 * Escalation result.
 */
export const EscalationResultSchema = z.object({
  newTier: z.number().int().min(0).max(3),
  requiresHuman: z.boolean(),
  reason: z.string().min(1),
  action: z.string().min(1),
})

export type EscalationResult = z.infer<typeof EscalationResultSchema>

/**
 * Agent selection context (optional overrides).
 * Extended with optional TaskContract for task-based selection.
 */
export const AgentSelectionContextSchema = z.object({
  complexity: z.enum(['low', 'medium', 'high']).optional(),
  taskType: z.string().optional(),
  budgetRemaining: z.number().nonnegative().optional(),
  taskContract: z.custom<TaskContract>().optional(),
})

export type AgentSelectionContext = z.infer<typeof AgentSelectionContextSchema>

/**
 * Strategy version metadata.
 */
export const StrategyVersionSchema = z.object({
  version: z.string().min(1),
  effectiveDate: z.string().min(1),
  reviewDate: z.string().optional(),
})

export type StrategyVersion = z.infer<typeof StrategyVersionSchema>

// ============================================================================
// Model Router Implementation
// ============================================================================

/**
 * Unified model router implementing WINT-0220 tier-based selection.
 * Handles tier selection, escalation, fallbacks, and provider integration.
 */
export class ModelRouter {
  private strategy: Strategy | null = null
  private providerCache: Map<string, ILLMProvider> = new Map()
  private legacyModelToTier: Record<string, number> = {
    opus: 0,
    'claude-opus-4.6': 0,
    sonnet: 1,
    'claude-sonnet-4.5': 1,
    haiku: 2,
    'claude-haiku-3.5': 2,
    ollama: 3,
  }

  /**
   * Initialize router and load strategy.
   */
  async initialize(): Promise<void> {
    this.strategy = await loadStrategy()
    logger.info('model_router', {
      event: 'model_router_initialized',
      version: this.strategy.strategy_version,
    })
  }

  /**
   * Select model for an agent invocation.
   * Supports both agent-based selection (legacy) and task-based selection (via TaskContract).
   *
   * Migration path:
   * - No context: Uses agent name → task type → tier mapping (legacy)
   * - With context.taskContract: Uses task-based selection (new)
   * - With context.complexity: Uses complexity escalation (existing)
   *
   * @param agentName - Agent name (e.g., 'story-fanout-pm')
   * @param context - Optional context for escalation/override or TaskContract
   * @returns Tier selection with model and provider
   *
   * @example Legacy agent-based selection
   * ```typescript
   * const selection = await router.selectModelForAgent('dev-implement-story')
   * // → Uses agent → tier mapping from strategy
   * ```
   *
   * @example Task-based selection with contract
   * ```typescript
   * const selection = await router.selectModelForAgent('dev-implement-story', {
   *   taskContract: {
   *     taskType: 'simple_code_generation',
   *     complexity: 'high',
   *     qualityRequirement: 'critical',
   *     requiresReasoning: false,
   *     securitySensitive: false,
   *     allowOllama: false,
   *   },
   * })
   * // → Uses task contract → tier selection logic
   * ```
   */
  async selectModelForAgent(
    agentName: string,
    context?: AgentSelectionContext,
  ): Promise<TierSelection> {
    if (!this.strategy) {
      await this.initialize()
    }

    logger.info('model_router', { event: 'model_selection_start', agent: agentName, context })

    // NEW: Task-based selection (if contract provided)
    if (context?.taskContract) {
      logger.info('model_router', {
        event: 'task_based_selection',
        agent: agentName,
        task_type: context.taskContract.taskType,
      })
      return selectModelForTask(context.taskContract)
    }

    // EXISTING: Strategy-based selection (check task type mapping)
    const taskType = context?.taskType || this.inferTaskTypeFromAgentName(agentName)
    const strategyTier = this.getTierForTaskType(taskType)

    if (strategyTier !== null) {
      // Context-based escalation (complexity override)
      let selectedTier = strategyTier
      if (context?.complexity === 'high' && strategyTier > 0) {
        selectedTier = Math.max(0, strategyTier - 1)
        logger.info('model_router', {
          event: 'complexity_escalation',
          from_tier: strategyTier,
          to_tier: selectedTier,
          agent: agentName,
        })
      }

      return this.getModelForTier(selectedTier)
    }

    // Legacy model assignment fallback (via model-assignments.ts)
    const legacyTier = this.getLegacyTierForAgent()
    if (legacyTier !== null) {
      logger.info('model_router', {
        event: 'legacy_model_fallback',
        agent: agentName,
        tier: legacyTier,
      })
      return this.getModelForTier(legacyTier)
    }

    // Default fallback (Tier 1 for unknown agents)
    logger.warn('Agent not found in strategy, using default tier', {
      event: 'agent_not_found_in_strategy',
      agent: agentName,
      using_default_tier: 1,
    })
    return this.getModelForTier(1)
  }

  /**
   * Get model configuration for a specific tier.
   * Handles Ollama availability checking and fallback to Haiku.
   *
   * @param tier - Tier number (0-3)
   * @param attemptIndex - Current fallback attempt (for loop prevention)
   * @returns Tier selection with primary or fallback model
   */
  async getModelForTier(tier: number, attemptIndex: number = 0): Promise<TierSelection> {
    if (!this.strategy) {
      await this.initialize()
    }

    const MAX_FALLBACK_ATTEMPTS = 3
    if (attemptIndex >= MAX_FALLBACK_ATTEMPTS) {
      logger.error('Fallback chain exhausted', {
        event: 'fallback_exhausted',
        tier,
        attempts: attemptIndex,
      })
      throw new Error(
        `Fallback chain exhausted after ${MAX_FALLBACK_ATTEMPTS} attempts for tier ${tier}`,
      )
    }

    const tierDef = this.strategy!.tiers.find(t => t.tier === tier)
    if (!tierDef) {
      throw new Error(`Invalid tier: ${tier}`)
    }

    // Try primary models first
    for (const model of tierDef.models.primary) {
      if (model.provider === 'ollama') {
        const available = await this.checkOllamaAvailability()
        if (!available) {
          logger.warn('Ollama unavailable, falling back', {
            event: 'ollama_unavailable',
            tier,
            falling_back_to_haiku: true,
          })
          continue // Try next primary or fallback
        }
      }

      const modelString = `${model.provider}/${model.model}`
      const fallbackChain = tierDef.models.fallback.map(m => `${m.provider}/${m.model}`)

      return {
        tier,
        model: modelString,
        provider: model.provider,
        cost_per_1m_tokens: model.cost_per_1m_tokens,
        fallbackChain,
      }
    }

    // Try fallback models
    for (const model of tierDef.models.fallback) {
      const modelString = `${model.provider}/${model.model}`
      logger.info('model_router', {
        event: 'using_fallback_model',
        tier,
        model: modelString,
        reason: 'primary_unavailable',
      })

      return {
        tier,
        model: modelString,
        provider: model.provider,
        cost_per_1m_tokens: model.cost_per_1m_tokens,
        fallbackChain: [],
      }
    }

    // Ultimate fallback: Haiku
    logger.warn('Using ultimate fallback to Haiku', {
      event: 'ultimate_fallback',
      tier,
      using_haiku: true,
    })
    return {
      tier,
      model: 'anthropic/claude-haiku-3.5',
      provider: 'anthropic',
      cost_per_1m_tokens: 0.25,
      fallbackChain: [],
    }
  }

  /**
   * Handle escalation triggers (quality, cost, failure, human).
   *
   * @param context - Escalation context with trigger and current state
   * @returns Escalation result with new tier and human-in-loop flag
   */
  async escalate(context: EscalationContext): Promise<EscalationResult> {
    if (!this.strategy) {
      await this.initialize()
    }

    logger.info('model_router', { event: 'escalation_triggered', context })

    const { trigger, currentTier, retries = 0, budgetUsed = 0 } = context

    // Quality escalation
    if (trigger === 'quality') {
      if (retries >= 3) {
        return {
          newTier: currentTier,
          requiresHuman: true,
          reason: 'Max retries exhausted',
          action: 'Escalate to human review',
        }
      }

      const newTier = Math.max(0, currentTier - 1)
      return {
        newTier,
        requiresHuman: newTier === 0 && retries >= 2,
        reason: 'Quality gate failure',
        action: `Escalate from Tier ${currentTier} to Tier ${newTier}`,
      }
    }

    // Cost de-escalation
    if (trigger === 'cost') {
      if (budgetUsed >= 0.95) {
        return {
          newTier: currentTier,
          requiresHuman: true,
          reason: 'Budget critical (95% used)',
          action: 'Pause workflow, require human approval',
        }
      }

      if (budgetUsed >= 0.8) {
        const newTier = Math.min(2, currentTier + 1) // Don't de-escalate critical tasks to Tier 3
        return {
          newTier,
          requiresHuman: false,
          reason: 'Budget warning (80% used)',
          action: `De-escalate from Tier ${currentTier} to Tier ${newTier}`,
        }
      }
    }

    // Failure escalation
    if (trigger === 'failure') {
      if (retries >= 3) {
        return {
          newTier: 0,
          requiresHuman: true,
          reason: 'Failure retry exhaustion',
          action: 'Escalate to Tier 0 or human review',
        }
      }

      const newTier = Math.max(0, currentTier - 1)
      return {
        newTier,
        requiresHuman: false,
        reason: 'Task failure',
        action: `Escalate from Tier ${currentTier} to Tier ${newTier}`,
      }
    }

    // Human-in-loop triggers
    if (trigger === 'human') {
      return {
        newTier: currentTier,
        requiresHuman: true,
        reason: context.reason || 'Human review required',
        action: 'Pause workflow for human review',
      }
    }

    // Default: no escalation
    return {
      newTier: currentTier,
      requiresHuman: false,
      reason: 'No escalation needed',
      action: 'Continue with current tier',
    }
  }

  /**
   * Get provider instance for a model string.
   * Wraps MODL-0010 provider factory and caches instances.
   *
   * @param modelString - Model string (e.g., 'anthropic/claude-sonnet-4.5')
   * @returns ILLMProvider instance
   */
  async getProvider(modelString: string): Promise<ILLMProvider> {
    // Check cache
    if (this.providerCache.has(modelString)) {
      return this.providerCache.get(modelString)!
    }

    // Create provider via MODL-0010 factory
    const provider = await getProviderForModel(modelString)

    // Cache instance
    this.providerCache.set(modelString, provider)

    logger.info('model_router', { event: 'provider_cached', model: modelString })
    return provider
  }

  /**
   * Check if Ollama is available.
   * Results are cached with 30s TTL (via provider checkAvailability).
   *
   * @returns True if Ollama is available, false otherwise
   */
  private async checkOllamaAvailability(): Promise<boolean> {
    try {
      const ollamaProvider = await getProviderForModel('ollama/qwen2.5-coder:7b')
      return await ollamaProvider.checkAvailability(5000, false) // Use cache
    } catch (error) {
      logger.warn('Ollama availability check failed', { event: 'ollama_check_failed', error })
      return false
    }
  }

  /**
   * Infer task type from agent name (heuristic).
   */
  private inferTaskTypeFromAgentName(agentName: string): string {
    if (agentName.includes('setup')) return 'setup_validation'
    if (agentName.includes('completion')) return 'completion_reporting'
    if (
      agentName.includes('fanout-pm') ||
      agentName.includes('fanout-ux') ||
      agentName.includes('fanout-qa')
    ) {
      return 'gap_analysis'
    }
    if (agentName.includes('attack')) return 'attack_analysis'
    if (agentName.includes('synthesize')) return 'synthesis'
    if (agentName.includes('score')) return 'readiness_scoring'
    if (agentName.includes('implement-contracts') || agentName.includes('implement-playwright')) {
      return 'simple_code_generation'
    }
    if (agentName.includes('implement-backend') || agentName.includes('implement-frontend')) {
      return 'complex_code_generation'
    }
    if (agentName.includes('lint') || agentName.includes('syntax')) return 'lint_and_syntax'
    if (agentName.includes('security')) return 'security_review'
    if (agentName.includes('planner')) return 'implementation_planning'
    if (agentName.includes('epic')) return 'epic_planning'
    if (agentName.includes('gate')) return 'commitment_gate'
    if (agentName.includes('triage')) return 'triage'

    return 'unknown'
  }

  /**
   * Get tier for a task type from strategy.
   */
  private getTierForTaskType(taskType: string): number | null {
    if (!this.strategy || taskType === 'unknown') return null

    const mapping = this.strategy.task_types.find(t => t.type === taskType)
    return mapping ? mapping.recommended_tier : null
  }

  /**
   * Get legacy tier for an agent (backward compatibility).
   * Integrates with model-assignments.ts via dynamic import.
   */
  private getLegacyTierForAgent(): number | null {
    // For MVP, return null to force strategy-based selection
    // In production, would dynamically import from model-assignments.ts
    return null
  }

  // ============================================================================
  // Quality Evaluation (MODL-0030)
  // ============================================================================

  /**
   * Evaluate the quality of a model output against a task contract.
   *
   * Wraps the synchronous evaluateQuality() function in an async interface
   * for consistency with other ModelRouter async methods.
   * This allows future replacement with an async LLM-as-judge strategy.
   *
   * @param contract - Task contract used for model selection
   * @param tier - Selected tier string (e.g., 'tier-1')
   * @param output - Model output to evaluate
   * @returns Promise<QualityEvaluation> with scores and mismatch detection
   *
   * @example
   * ```typescript
   * const router = new ModelRouter()
   * const contract = createTaskContract({ taskType: 'code_generation' })
   * const evaluation = await router.evaluateQuality(contract, 'tier-1', outputString)
   * console.log(evaluation.qualityScore)
   * ```
   */
  async evaluateQuality(
    contract: TaskContract,
    tier: string,
    output: string,
  ): Promise<QualityEvaluation> {
    logger.info('model_router', {
      event: 'evaluate_quality_requested',
      task_type: contract.taskType,
      tier,
    })

    return evaluateQualityFn(contract, tier, output)
  }

  // ============================================================================
  // Configuration API (AC-7)
  // ============================================================================

  /**
   * Get strategy version metadata.
   */
  getStrategyVersion(): StrategyVersion {
    if (!this.strategy) {
      throw new Error('Strategy not loaded. Call initialize() first.')
    }

    return {
      version: this.strategy.strategy_version,
      effectiveDate: this.strategy.effective_date,
      reviewDate: this.strategy.review_date,
    }
  }

  /**
   * Get recommended tier for an agent.
   */
  getTierForAgent(agentName: string): number {
    const taskType = this.inferTaskTypeFromAgentName(agentName)
    const tier = this.getTierForTaskType(taskType)

    if (tier !== null) return tier

    // Legacy fallback
    const legacyTier = this.getLegacyTierForAgent()
    if (legacyTier !== null) return legacyTier

    return 1 // Default
  }

  /**
   * Get primary model for a tier (optional provider filter).
   */
  getModelForTierSync(tier: number, providerFilter?: string): string {
    if (!this.strategy) {
      throw new Error('Strategy not loaded. Call initialize() first.')
    }

    const tierDef = this.strategy.tiers.find(t => t.tier === tier)
    if (!tierDef) {
      throw new Error(`Invalid tier: ${tier}`)
    }

    const primaryModels = providerFilter
      ? tierDef.models.primary.filter(m => m.provider === providerFilter)
      : tierDef.models.primary

    if (primaryModels.length === 0) {
      throw new Error(`No models found for tier ${tier} with provider filter ${providerFilter}`)
    }

    const model = primaryModels[0]
    return `${model.provider}/${model.model}`
  }

  /**
   * Get escalation trigger configuration.
   */
  getEscalationTriggers() {
    if (!this.strategy) {
      throw new Error('Strategy not loaded. Call initialize() first.')
    }

    return {
      quality: this.strategy.escalation_triggers.quality,
      cost: this.strategy.escalation_triggers.cost,
      failure: this.strategy.escalation_triggers.failure,
      human: this.strategy.escalation_triggers.human,
    }
  }
}

// ============================================================================
// Factory (AC-11)
// ============================================================================

/**
 * Singleton factory for ModelRouter.
 */
export class ModelRouterFactory {
  private static instance: ModelRouter | null = null

  /**
   * Get singleton ModelRouter instance.
   *
   * @param options - Factory options
   * @returns ModelRouter instance
   */
  static async getInstance(options: { forceReload?: boolean } = {}): Promise<ModelRouter> {
    if (!this.instance || options.forceReload) {
      this.instance = new ModelRouter()
      await this.instance.initialize()
      logger.info('model_router', {
        event: 'model_router_factory_created',
        force_reload: options.forceReload,
      })
    }

    return this.instance
  }

  /**
   * Clear singleton instance (for testing).
   */
  static clearInstance(): void {
    this.instance = null
  }
}

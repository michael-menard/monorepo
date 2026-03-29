/**
 * task-selector.ts
 *
 * Task-based model selector implementing contract-driven tier selection.
 * Extends WINT-0230 ModelRouter with task-level granularity for model routing.
 *
 * Selection logic:
 * 1. Load task type default tier from WINT-0220-STRATEGY.yaml
 * 2. Apply escalation rules (security > quality > complexity)
 * 3. Apply de-escalation rules (budget constraints)
 * 4. Validate fallback chain (filter Ollama if prohibited)
 * 5. Return TierSelection with model, provider, fallbackChain
 *
 * @module models/task-selector
 */

import { logger } from '@repo/logger'
import type { TaskContract } from './__types__/task-contract.js'
import { ModelRouter, type TierSelection } from './unified-interface.js'
import { loadStrategy } from './strategy-loader.js'

// ============================================================================
// Task-Based Model Selector
// ============================================================================

/**
 * Select model for a task based on contract characteristics.
 * Implements tier selection logic with escalation/de-escalation rules.
 *
 * Escalation precedence (highest to lowest):
 * 1. Security: securitySensitive=true → Tier 0/1 (no Ollama)
 * 2. Quality: qualityRequirement='critical' → Tier 0
 * 3. Complexity: complexity='high' → escalate by 1 tier
 * 4. Budget: budgetTokens constraint → de-escalate if quality permits
 *
 * @param contract - Task contract with characteristics
 * @returns TierSelection with model, provider, and fallback chain
 * @throws Error if task type unknown or no valid model available
 *
 * @example Simple task
 * ```typescript
 * const selection = await selectModelForTask({
 *   taskType: 'code_generation',
 *   complexity: 'low',
 *   qualityRequirement: 'adequate',
 *   requiresReasoning: false,
 *   securitySensitive: false,
 *   allowOllama: true,
 * })
 * // → { tier: 3, model: 'ollama/qwen2.5-coder:7b', ... }
 * ```
 *
 * @example Critical task
 * ```typescript
 * const selection = await selectModelForTask({
 *   taskType: 'security_analysis',
 *   complexity: 'high',
 *   qualityRequirement: 'critical',
 *   requiresReasoning: true,
 *   securitySensitive: true,
 *   allowOllama: false,
 * })
 * // → { tier: 0, model: 'anthropic/claude-opus-4.6', ... }
 * ```
 */
export async function selectModelForTask(contract: TaskContract): Promise<TierSelection> {
  logger.info('task_selector', {
    event: 'task_selection_start',
    contract,
  })

  // Load strategy for task type taxonomy
  const strategy = await loadStrategy()

  // Step 1: Get default tier for task type
  const taskTypeConfig = strategy.task_types.find(t => t.type === contract.taskType)
  if (!taskTypeConfig) {
    const availableTypes = strategy.task_types.map(t => t.type).join(', ')
    const errorMsg = `Task type '${contract.taskType}' not found in strategy. Available types: ${availableTypes}`
    logger.error('Invalid task type', {
      event: 'task_type_not_found',
      task_type: contract.taskType,
      available_types: strategy.task_types.map(t => t.type),
    })
    throw new Error(errorMsg)
  }

  let selectedTier = taskTypeConfig.recommended_tier

  logger.info('task_selector', {
    event: 'default_tier_selected',
    task_type: contract.taskType,
    tier: selectedTier,
  })

  // Step 2: Apply escalation rules (security > quality > complexity)

  // Security escalation (highest precedence)
  if (contract.securitySensitive) {
    if (selectedTier > 1) {
      logger.info('task_selector', {
        event: 'tier_escalation',
        reason: 'security_sensitive',
        from_tier: selectedTier,
        to_tier: 1,
      })
      selectedTier = 1 // Security tasks require Tier 0/1 (no Ollama)
    }
  }

  // Quality escalation
  if (contract.qualityRequirement === 'critical') {
    if (selectedTier > 0) {
      logger.info('task_selector', {
        event: 'tier_escalation',
        reason: 'critical_quality',
        from_tier: selectedTier,
        to_tier: 0,
      })
      selectedTier = 0 // Critical quality requires Opus
    }
  } else if (contract.qualityRequirement === 'high') {
    if (selectedTier > 1) {
      logger.info('task_selector', {
        event: 'tier_escalation',
        reason: 'high_quality',
        from_tier: selectedTier,
        to_tier: Math.max(0, selectedTier - 1),
      })
      selectedTier = Math.max(0, selectedTier - 1)
    }
  }

  // Complexity escalation
  if (contract.complexity === 'high') {
    if (selectedTier > 0) {
      const newTier = Math.max(0, selectedTier - 1)
      logger.info('task_selector', {
        event: 'tier_escalation',
        reason: 'high_complexity',
        from_tier: selectedTier,
        to_tier: newTier,
      })
      selectedTier = newTier
    }
  }

  // Step 3: Apply de-escalation rules (budget constraints)
  if (contract.budgetTokens !== undefined) {
    // Budget de-escalation only if quality permits (not critical/high)
    if (contract.qualityRequirement === 'adequate' || contract.qualityRequirement === 'good') {
      // Estimate tokens needed for tier (rough heuristic)
      const tierTokenEstimates = [5000, 3000, 1500, 800] // Tier 0-3 avg tokens
      const estimatedTokens = tierTokenEstimates[selectedTier]

      if (estimatedTokens > contract.budgetTokens && selectedTier < 3) {
        const newTier = Math.min(3, selectedTier + 1)
        logger.info('task_selector', {
          event: 'tier_deescalation',
          reason: 'budget_constraint',
          from_tier: selectedTier,
          to_tier: newTier,
          budget_tokens: contract.budgetTokens,
          estimated_tokens: estimatedTokens,
        })
        selectedTier = newTier
      } else if (estimatedTokens > contract.budgetTokens) {
        logger.warn('Budget constraint cannot be satisfied', {
          event: 'budget_constraint_ignored',
          reason: 'quality_requirement_prevents_deescalation',
          tier: selectedTier,
          budget_tokens: contract.budgetTokens,
          estimated_tokens: estimatedTokens,
        })
      }
    } else {
      logger.warn('Budget constraint ignored due to quality requirement', {
        event: 'budget_constraint_ignored',
        reason: 'high_or_critical_quality_required',
        tier: selectedTier,
        quality: contract.qualityRequirement,
      })
    }
  }

  // Step 4: Get model for selected tier
  const router = new ModelRouter()
  await router.initialize()
  const tierSelection = await router.getModelForTier(selectedTier)

  // Step 5: Validate and filter fallback chain
  let finalFallbackChain = tierSelection.fallbackChain

  if (!contract.allowOllama) {
    // Filter out Ollama models from fallback chain
    const originalChainLength = finalFallbackChain.length
    finalFallbackChain = finalFallbackChain.filter(model => !model.toLowerCase().includes('ollama'))

    if (originalChainLength > finalFallbackChain.length) {
      logger.info('task_selector', {
        event: 'fallback_chain_filtered',
        reason: 'ollama_prohibited',
        original_count: originalChainLength,
        filtered_count: finalFallbackChain.length,
      })
    }

    // Ensure at least one non-Ollama fallback exists
    const primaryIsOllama = tierSelection.provider.toLowerCase() === 'ollama'
    if (primaryIsOllama && finalFallbackChain.length === 0) {
      const errorMsg =
        'No valid fallback model available (Ollama prohibited, no Anthropic fallback)'
      logger.error('Fallback validation failed', {
        event: 'no_valid_fallback',
        tier: selectedTier,
        primary_model: tierSelection.model,
        reason: 'ollama_prohibited_no_anthropic_fallback',
      })
      throw new Error(errorMsg)
    }
  }

  // Return final selection
  const finalSelection: TierSelection = {
    ...tierSelection,
    fallbackChain: finalFallbackChain,
  }

  logger.info('task_selector', {
    event: 'task_selection_complete',
    tier: finalSelection.tier,
    model: finalSelection.model,
    provider: finalSelection.provider,
    fallback_count: finalSelection.fallbackChain.length,
  })

  return finalSelection
}

/**
 * Get tier for a task type from strategy.
 * Utility function for extracting default tier without full selection logic.
 *
 * @param taskType - Task type from WINT-0220 taxonomy
 * @returns Recommended tier (0-3)
 * @throws Error if task type not found in strategy
 */
export async function getTierForTaskType(taskType: string): Promise<number> {
  const strategy = await loadStrategy()
  const taskTypeConfig = strategy.task_types.find(t => t.type === taskType)

  if (!taskTypeConfig) {
    const availableTypes = strategy.task_types.map(t => t.type).join(', ')
    throw new Error(
      `Task type '${taskType}' not found in strategy. Available types: ${availableTypes}`,
    )
  }

  return taskTypeConfig.recommended_tier
}

/**
 * Validate fallback chain for a tier selection.
 * Checks that at least one valid fallback exists based on contract constraints.
 *
 * @param tierSelection - Tier selection with fallback chain
 * @param allowOllama - Whether Ollama models are permitted
 * @returns True if fallback chain is valid, false otherwise
 */
export function validateFallbackChain(tierSelection: TierSelection, allowOllama: boolean): boolean {
  if (allowOllama) {
    // No filtering needed - any fallback is valid
    return tierSelection.fallbackChain.length > 0
  }

  // Filter out Ollama models
  const nonOllamaFallbacks = tierSelection.fallbackChain.filter(
    model => !model.toLowerCase().includes('ollama'),
  )

  // If primary is Ollama, we need at least one non-Ollama fallback
  const primaryIsOllama = tierSelection.provider.toLowerCase() === 'ollama'
  if (primaryIsOllama && nonOllamaFallbacks.length === 0) {
    return false
  }

  return true
}

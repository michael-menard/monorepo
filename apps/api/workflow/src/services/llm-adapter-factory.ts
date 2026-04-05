/**
 * LLM Adapter Factory
 *
 * Builds LLM adapter functions for each subgraph based on the orchestrator's
 * modelConfig. Supports Ollama (local dev) and Anthropic (production/escalation)
 * via the existing createLlmAdapter infrastructure.
 *
 * The factory is injectable for testing — pass stub adapters in the config
 * overrides and they will be used instead of the real ones.
 *
 * @module services/llm-adapter-factory
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { ModelConfig } from '../state/pipeline-orchestrator-v2-state.js'
import type { DevImplementV2GraphConfig } from '../graphs/dev-implement-v2.js'
import type { ReviewV2GraphConfig } from '../graphs/review-v2.js'
import type { QAVerifyV2GraphConfig } from '../graphs/qa-verify-v2.js'
import type { PlanRefinementV2GraphConfig } from '../graphs/plan-refinement-v2.js'
import type { StoryGenerationV2GraphConfig } from '../graphs/story-generation-v2.js'
import { createLlmAdapter } from './llm-adapters.js'
import type { SimpleMessage, LlmResponse } from './llm-adapters.js'

// ============================================================================
// Schemas
// ============================================================================

export const LlmAdapterFactoryConfigSchema = z.object({
  ollamaBaseUrl: z.string().default('http://localhost:11434'),
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
})

export type LlmAdapterFactoryConfig = z.infer<typeof LlmAdapterFactoryConfigSchema>

/**
 * Generic LLM adapter function type — matches all subgraph node adapters.
 */
export type GenericLlmAdapterFn = (messages: SimpleMessage[]) => Promise<LlmResponse>

// ============================================================================
// Factory
// ============================================================================

/**
 * Creates an LLM adapter factory that builds adapters for each subgraph
 * based on the orchestrator's modelConfig.
 *
 * @param factoryConfig - Base configuration (URLs, API keys)
 * @returns Object with builder methods for each subgraph's adapters
 */
export function createLlmAdapterFactory(factoryConfig: Partial<LlmAdapterFactoryConfig> = {}) {
  const _config = LlmAdapterFactoryConfigSchema.parse(factoryConfig)

  /**
   * Creates an Ollama adapter for the given model name.
   * Model string format: `ollama:<model>` (e.g. `ollama:qwen2.5-coder:14b`)
   */
  function createOllamaAdapter(model: string): GenericLlmAdapterFn {
    const modelString = model.startsWith('ollama:') ? model : `ollama:${model}`
    logger.debug('llm_adapter_factory: creating Ollama adapter', { modelString })
    return createLlmAdapter({ modelString })
  }

  /**
   * Creates an Anthropic adapter for the given model name.
   * Model string format: `claude-code/<model>` (e.g. `claude-code/sonnet`)
   */
  function createAnthropicAdapter(model: string): GenericLlmAdapterFn {
    const modelString = model.startsWith('claude-code/') ? model : `claude-code/${model}`
    logger.debug('llm_adapter_factory: creating Anthropic adapter', { modelString })
    return createLlmAdapter({ modelString })
  }

  /**
   * Selects the appropriate adapter based on model config and Ollama availability.
   * Prefers Ollama for local dev; falls back to Anthropic primary.
   */
  function selectAdapter(
    modelConfig: ModelConfig,
    ollamaAvailable: boolean,
    role: string,
  ): GenericLlmAdapterFn {
    if (ollamaAvailable && modelConfig.ollamaModel) {
      logger.debug('llm_adapter_factory: using Ollama for role', {
        role,
        model: modelConfig.ollamaModel,
      })
      return createOllamaAdapter(modelConfig.ollamaModel)
    }

    logger.debug('llm_adapter_factory: using Anthropic primary for role', {
      role,
      model: modelConfig.primaryModel,
    })
    return createAnthropicAdapter(modelConfig.primaryModel)
  }

  /**
   * Builds the adapter config for the dev-implement-v2 subgraph.
   */
  function buildDevImplementAdapters(
    modelConfig: ModelConfig,
    ollamaAvailable = false,
  ): Pick<DevImplementV2GraphConfig, 'plannerLlmAdapter' | 'executorLlmAdapter'> {
    return {
      plannerLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'dev-planner'),
      executorLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'dev-executor'),
    }
  }

  /**
   * Builds the adapter config for the review-v2 subgraph.
   */
  function buildReviewAdapters(
    modelConfig: ModelConfig,
    ollamaAvailable = false,
  ): Pick<ReviewV2GraphConfig, 'riskLlmAdapter' | 'reviewLlmAdapter'> {
    return {
      riskLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'review-risk'),
      reviewLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'review-agent'),
    }
  }

  /**
   * Builds the adapter config for the qa-verify-v2 subgraph.
   */
  function buildQAVerifyAdapters(
    modelConfig: ModelConfig,
    ollamaAvailable = false,
  ): Pick<QAVerifyV2GraphConfig, 'strategyLlmAdapter' | 'interpreterLlmAdapter'> {
    return {
      strategyLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'qa-strategy'),
      interpreterLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'qa-interpreter'),
    }
  }

  /**
   * Builds the LLM adapter config for the plan-refinement-v2 subgraph.
   */
  function buildPlanRefinementAdapters(
    modelConfig: ModelConfig,
    ollamaAvailable = false,
  ): Pick<PlanRefinementV2GraphConfig, 'llmAdapter'> {
    return {
      llmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'plan-refinement'),
    }
  }

  /**
   * Builds the LLM adapter config for the story-generation-v2 subgraph.
   */
  function buildStoryGenerationAdapters(
    modelConfig: ModelConfig,
    ollamaAvailable = false,
  ): Pick<
    StoryGenerationV2GraphConfig,
    'slicerLlmAdapter' | 'enricherLlmAdapter' | 'dependencyWirerLlmAdapter'
  > {
    return {
      slicerLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'story-slicer'),
      enricherLlmAdapter: selectAdapter(modelConfig, ollamaAvailable, 'story-enricher'),
      dependencyWirerLlmAdapter: selectAdapter(
        modelConfig,
        ollamaAvailable,
        'story-dependency-wirer',
      ),
    }
  }

  return {
    createOllamaAdapter,
    createAnthropicAdapter,
    selectAdapter,
    buildDevImplementAdapters,
    buildReviewAdapters,
    buildQAVerifyAdapters,
    buildPlanRefinementAdapters,
    buildStoryGenerationAdapters,
  }
}

export type LlmAdapterFactory = ReturnType<typeof createLlmAdapterFactory>

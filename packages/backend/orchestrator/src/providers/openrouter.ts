/**
 * openrouter.ts
 *
 * OpenRouter provider adapter for accessing 200+ models via unified API.
 * OpenRouter provides access to Claude, GPT, Llama, Mistral, Qwen, DeepSeek, and more.
 *
 * @module providers/openrouter
 */

import { z } from 'zod'
import { ChatOpenAI } from '@langchain/openai'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { logger } from '@repo/logger'
import type { AvailabilityCache } from '../config/llm-provider.js'
import { BaseProvider, checkEndpointAvailability } from './base.js'
import { secretsClient } from '../secrets/index.js'

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * OpenRouter-specific configuration schema.
 */
export const OpenRouterConfigSchema = z.object({
  /** OpenRouter API key */
  apiKey: z.string().min(1),

  /** OpenRouter base URL */
  baseURL: z.string().url().default('https://openrouter.ai/api/v1'),

  /** Default temperature */
  temperature: z.number().min(0).max(2).default(0),

  /** Request timeout in milliseconds */
  timeoutMs: z.number().positive().default(60000),

  /** Cache TTL for availability checks (ms) */
  availabilityCacheTtlMs: z.number().positive().default(30000),
})

export type OpenRouterConfig = z.infer<typeof OpenRouterConfigSchema>

// ============================================================================
// OpenRouter Provider Adapter (MODL-0011: Refactored to extend BaseProvider)
// ============================================================================

/**
 * OpenRouter provider implementation extending BaseProvider.
 * Implements abstract methods for OpenRouter-specific behavior while inheriting
 * common caching and lifecycle logic from BaseProvider.
 *
 * **Implements**:
 * - `parseModelName()`: Removes 'openrouter/' prefix
 * - `loadConfig()`: Loads OpenRouter API key and configuration via SecretsClient
 * - `createModel()`: Creates ChatOpenAI instances configured for OpenRouter
 * - `checkAvailability()`: Checks OpenRouter API availability
 */
export class OpenRouterProvider extends BaseProvider {
  protected static configCache: OpenRouterConfig | null = null
  protected static instanceCache = new Map<string, ChatOpenAI>()
  protected static availabilityCache: AvailabilityCache | null = null

  /**
   * Parses OpenRouter model name by removing 'openrouter/' prefix.
   * Example: 'openrouter/claude-3-5-sonnet' => 'claude-3-5-sonnet'
   */
  protected parseModelName(modelName: string): string {
    return modelName.startsWith('openrouter/') ? modelName.replace('openrouter/', '') : modelName
  }

  /**
   * Loads OpenRouter configuration from SecretsClient (env or AWS Secrets Manager).
   * Configuration is cached after first load.
   */
  loadConfig(): OpenRouterConfig {
    if (OpenRouterProvider.configCache) {
      return OpenRouterProvider.configCache
    }

    const apiKey = secretsClient.getSync('OPENROUTER_API_KEY')

    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY environment variable is required. Get your API key at https://openrouter.ai/keys',
      )
    }

    OpenRouterProvider.configCache = OpenRouterConfigSchema.parse({
      apiKey,
      baseURL: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1',
      temperature: process.env.OPENROUTER_TEMPERATURE
        ? parseFloat(process.env.OPENROUTER_TEMPERATURE)
        : 0,
      timeoutMs: process.env.OPENROUTER_TIMEOUT_MS
        ? parseInt(process.env.OPENROUTER_TIMEOUT_MS, 10)
        : 60000,
      availabilityCacheTtlMs: 30000,
    })

    return OpenRouterProvider.configCache
  }

  /**
   * Creates a ChatOpenAI instance configured for OpenRouter.
   * Called by BaseProvider.getModel() template method.
   */
  protected createModel(modelName: string, config: unknown): BaseChatModel {
    const openRouterConfig = OpenRouterConfigSchema.parse(config)

    const llm = new ChatOpenAI({
      modelName,
      openAIApiKey: openRouterConfig.apiKey,
      configuration: {
        baseURL: openRouterConfig.baseURL,
      },
      temperature: openRouterConfig.temperature,
      timeout: openRouterConfig.timeoutMs,
    })

    logger.debug('Created ChatOpenAI instance for OpenRouter', { model: modelName })
    return llm
  }

  /**
   * Checks if OpenRouter API is available.
   * Results are cached for 30 seconds by default.
   */
  async checkAvailability(timeout = 5000, forceCheck = false): Promise<boolean> {
    const config = this.loadConfig()

    return checkEndpointAvailability({
      url: `${config.baseURL}/models`,
      timeout,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
      },
      cacheTtlMs: config.availabilityCacheTtlMs,
      forceCheck,
      cache: {
        get: () => OpenRouterProvider.availabilityCache,
        set: (value: AvailabilityCache) => {
          OpenRouterProvider.availabilityCache = value
        },
      },
      logger,
      logContext: { baseURL: config.baseURL },
    })
  }

  /**
   * Retrieves a cached ChatOpenAI instance if one exists.
   * NOTE: Cannot be static due to abstract method signature.
   */
  getCachedInstance(configHash: string): BaseChatModel | null {
    const cached = OpenRouterProvider.instanceCache.get(configHash)
    if (cached) {
      logger.debug('OpenRouter cache hit', { configHash })
    }
    return cached ?? null
  }

  /**
   * Clears all caches (for testing).
   */
  static clearCaches(): void {
    OpenRouterProvider.configCache = null
    OpenRouterProvider.instanceCache.clear()
    OpenRouterProvider.availabilityCache = null
  }
}

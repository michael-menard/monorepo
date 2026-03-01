/**
 * anthropic.ts
 *
 * Anthropic provider adapter for direct Claude API access.
 * Provides official Anthropic API as alternative to Claude Code integration.
 *
 * @module providers/anthropic
 */

import { z } from 'zod'
import { ChatAnthropic } from '@langchain/anthropic'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { logger } from '@repo/logger'
import type { AvailabilityCache } from '../config/llm-provider.js'
import { BaseProvider, checkEndpointAvailability } from './base.js'
import { secretsClient } from '../secrets/index.js'

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Anthropic-specific configuration schema.
 */
export const AnthropicConfigSchema = z.object({
  /** Anthropic API key */
  apiKey: z.string().min(1),

  /** Default temperature */
  temperature: z.number().min(0).max(2).default(0),

  /** Request timeout in milliseconds */
  timeoutMs: z.number().positive().default(60000),

  /** Cache TTL for availability checks (ms) */
  availabilityCacheTtlMs: z.number().positive().default(30000),
})

export type AnthropicConfig = z.infer<typeof AnthropicConfigSchema>

// ============================================================================
// Anthropic Provider Adapter (MODL-0011: Refactored to extend BaseProvider)
// ============================================================================

/**
 * Anthropic provider implementation extending BaseProvider.
 * Implements abstract methods for Anthropic-specific behavior while inheriting
 * common caching and lifecycle logic from BaseProvider.
 *
 * **Implements**:
 * - `parseModelName()`: Removes 'anthropic/' prefix
 * - `loadConfig()`: Loads Anthropic API key and configuration via SecretsClient
 * - `createModel()`: Creates ChatAnthropic instances
 * - `checkAvailability()`: Checks Anthropic API availability
 */
export class AnthropicProvider extends BaseProvider {
  protected static configCache: AnthropicConfig | null = null
  protected static instanceCache = new Map<string, ChatAnthropic>()
  protected static availabilityCache: AvailabilityCache | null = null

  /**
   * Parses Anthropic model name by removing 'anthropic/' prefix.
   * Example: 'anthropic/claude-opus-4' => 'claude-opus-4'
   */
  protected parseModelName(modelName: string): string {
    return modelName.startsWith('anthropic/') ? modelName.replace('anthropic/', '') : modelName
  }

  /**
   * Loads Anthropic configuration from SecretsClient (env or AWS Secrets Manager).
   * Configuration is cached after first load.
   */
  loadConfig(): AnthropicConfig {
    if (AnthropicProvider.configCache) {
      return AnthropicProvider.configCache
    }

    const apiKey = secretsClient.getSync('ANTHROPIC_API_KEY')

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required. Get your API key at https://console.anthropic.com/',
      )
    }

    AnthropicProvider.configCache = AnthropicConfigSchema.parse({
      apiKey,
      temperature: process.env.ANTHROPIC_TEMPERATURE
        ? parseFloat(process.env.ANTHROPIC_TEMPERATURE)
        : 0,
      timeoutMs: process.env.ANTHROPIC_TIMEOUT_MS
        ? parseInt(process.env.ANTHROPIC_TIMEOUT_MS, 10)
        : 60000,
      availabilityCacheTtlMs: 30000,
    })

    return AnthropicProvider.configCache
  }

  /**
   * Creates a ChatAnthropic instance with the given configuration.
   * Called by BaseProvider.getModel() template method.
   */
  protected createModel(modelName: string, config: unknown): BaseChatModel {
    const anthropicConfig = AnthropicConfigSchema.parse(config)

    const llm = new ChatAnthropic({
      modelName,
      anthropicApiKey: anthropicConfig.apiKey,
      temperature: anthropicConfig.temperature,
      // timeout: anthropicConfig.timeoutMs, // Not supported in this version
    })

    logger.debug('Created ChatAnthropic instance', { model: modelName })
    return llm
  }

  /**
   * Checks if Anthropic API is available.
   * Results are cached for 30 seconds by default.
   * Anthropic returns 400/401 for root endpoint, which indicates service is up.
   */
  async checkAvailability(timeout = 5000, forceCheck = false): Promise<boolean> {
    const config = this.loadConfig()

    return checkEndpointAvailability({
      url: 'https://api.anthropic.com',
      timeout,
      headers: {
        'anthropic-version': '2023-06-01',
      },
      acceptableStatuses: [200, 400, 401], // Service is up if we get these
      cacheTtlMs: config.availabilityCacheTtlMs,
      forceCheck,
      cache: {
        get: () => AnthropicProvider.availabilityCache,
        set: (value: AvailabilityCache) => {
          AnthropicProvider.availabilityCache = value
        },
      },
      logger,
    })
  }

  /**
   * Retrieves a cached ChatAnthropic instance if one exists.
   * NOTE: Cannot be static due to abstract method signature.
   */
  getCachedInstance(configHash: string): BaseChatModel | null {
    const cached = AnthropicProvider.instanceCache.get(configHash)
    if (cached) {
      logger.debug('Anthropic cache hit', { configHash })
    }
    return cached ?? null
  }

  /**
   * Clears all caches (for testing).
   */
  static clearCaches(): void {
    AnthropicProvider.configCache = null
    AnthropicProvider.instanceCache.clear()
    AnthropicProvider.availabilityCache = null
  }
}

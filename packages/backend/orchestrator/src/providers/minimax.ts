/**
 * minimax.ts
 *
 * MiniMax provider adapter for LangGraph orchestrator.
 * Provides access to MiniMax models (abab5.5, abab5.5s, abab6 families).
 *
 * MiniMax is a Chinese AI startup with 200M+ users, providing NLP models
 * via API at https://api.minimax.chat
 *
 * @module providers/minimax
 */

import { ChatMinimax } from '@langchain/community/chat_models/minimax'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { logger } from '@repo/logger'
import type { AvailabilityCache } from '../config/llm-provider.js'
import { BaseProvider, checkEndpointAvailability } from './base.js'
import { MinimaxConfigSchema, type MinimaxConfig } from './__types__/minimax.js'

// ============================================================================
// MiniMax Provider Adapter
// ============================================================================

/**
 * MiniMax LLM provider adapter.
 *
 * Integrates MiniMax API (https://api.minimax.chat) with LangGraph orchestrator.
 * Uses ChatMinimax from @langchain/community for LangChain compatibility.
 *
 * Configuration:
 * - MINIMAX_API_KEY (required): MiniMax API key
 * - MINIMAX_GROUP_ID (required): MiniMax group ID
 * - MINIMAX_TEMPERATURE (optional): Default temperature (0-2, default: 0)
 * - MINIMAX_TIMEOUT_MS (optional): Request timeout (default: 60000ms)
 *
 * Supported Models:
 * - abab5.5-chat
 * - abab5.5s-chat
 * - abab6-chat
 *
 * Usage:
 *   const provider = new MinimaxProvider()
 *   const model = provider.getModel('minimax/abab5.5-chat')
 *
 * @see MODL-0050 for implementation details
 * @see BaseProvider for inherited caching and lifecycle logic
 */
export class MinimaxProvider extends BaseProvider {
  protected static configCache: MinimaxConfig | null = null
  protected static instanceCache = new Map<string, ChatMinimax>()
  protected static availabilityCache: AvailabilityCache | null = null

  /**
   * Parses MiniMax model name by removing 'minimax/' prefix.
   * Example: 'minimax/abab5.5-chat' => 'abab5.5-chat'
   */
  protected parseModelName(modelName: string): string {
    return modelName.startsWith('minimax/') ? modelName.replace('minimax/', '') : modelName
  }

  /**
   * Loads MiniMax configuration from environment variables.
   * Configuration is cached after first load.
   *
   * @throws Error if MINIMAX_API_KEY or MINIMAX_GROUP_ID missing
   */
  loadConfig(): MinimaxConfig {
    if (MinimaxProvider.configCache) {
      return MinimaxProvider.configCache
    }

    const apiKey = process.env.MINIMAX_API_KEY
    const groupId = process.env.MINIMAX_GROUP_ID

    if (!apiKey || !groupId) {
      throw new Error(
        'MiniMax configuration error: MINIMAX_API_KEY and MINIMAX_GROUP_ID environment variables are required.\n\n' +
          'Setup instructions:\n' +
          '1. Create MiniMax account at https://api.minimax.chat\n' +
          '2. Obtain API key and Group ID from account dashboard\n' +
          '3. Set environment variables:\n' +
          '   export MINIMAX_API_KEY=your-api-key-here\n' +
          '   export MINIMAX_GROUP_ID=your-group-id-here',
      )
    }

    MinimaxProvider.configCache = MinimaxConfigSchema.parse({
      apiKey,
      groupId,
      temperature: process.env.MINIMAX_TEMPERATURE
        ? parseFloat(process.env.MINIMAX_TEMPERATURE)
        : 0,
      timeoutMs: process.env.MINIMAX_TIMEOUT_MS
        ? parseInt(process.env.MINIMAX_TIMEOUT_MS, 10)
        : 60000,
      availabilityCacheTtlMs: 30000,
    })

    return MinimaxProvider.configCache
  }

  /**
   * Creates a ChatMinimax instance with the given configuration.
   * Called by BaseProvider.getModel() template method.
   */
  protected createModel(modelName: string, config: unknown): BaseChatModel {
    const minimaxConfig = config as MinimaxConfig

    const llm = new ChatMinimax({
      minimaxApiKey: minimaxConfig.apiKey,
      minimaxGroupId: minimaxConfig.groupId,
      modelName: modelName,
      temperature: minimaxConfig.temperature,
    })

    logger.debug('Created ChatMinimax instance', { model: modelName })
    return llm
  }

  /**
   * Checks if MiniMax API is available.
   * Results are cached for 30 seconds by default.
   *
   * Uses the MiniMax API base URL for health checking.
   * Note: MiniMax may return 400/401 for root endpoint, which indicates service is up.
   */
  async checkAvailability(timeout = 5000, forceCheck = false): Promise<boolean> {
    const config = this.loadConfig()

    return checkEndpointAvailability({
      url: 'https://api.minimax.chat',
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
      acceptableStatuses: [200, 400, 401], // Service is up if we get these
      cacheTtlMs: config.availabilityCacheTtlMs,
      forceCheck,
      cache: {
        get: () => MinimaxProvider.availabilityCache,
        set: (value: AvailabilityCache) => {
          MinimaxProvider.availabilityCache = value
        },
      },
      logger,
    })
  }

  /**
   * Retrieves a cached ChatMinimax instance if one exists.
   * NOTE: Cannot be static due to abstract method signature.
   */
  getCachedInstance(configHash: string): BaseChatModel | null {
    const cached = MinimaxProvider.instanceCache.get(configHash)
    if (cached) {
      logger.debug('MiniMax cache hit', { configHash })
    }
    return cached ?? null
  }

  /**
   * Clears all caches (for testing).
   */
  static clearCaches(): void {
    MinimaxProvider.configCache = null
    MinimaxProvider.instanceCache.clear()
    MinimaxProvider.availabilityCache = null
  }
}

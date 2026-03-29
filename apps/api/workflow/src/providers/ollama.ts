/**
 * ollama.ts
 *
 * Ollama provider adapter for local model execution.
 * Maintains backward compatibility with existing getLLMForAgent() pattern.
 *
 * @module providers/ollama
 */

import { z } from 'zod'
import { ChatOllama } from '@langchain/ollama'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { logger } from '@repo/logger'
import type { AvailabilityCache } from '../config/llm-provider.js'
import { BaseProvider, checkEndpointAvailability } from './base.js'

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Ollama-specific configuration schema.
 */
export const OllamaConfigSchema = z.object({
  /** Ollama server base URL */
  baseUrl: z.string().url().default('http://127.0.0.1:11434'),

  /** Default temperature for Ollama models */
  temperature: z.number().min(0).max(2).default(0),

  /** Request timeout in milliseconds */
  timeoutMs: z.number().positive().default(60000),

  /** Cache TTL for availability checks (ms) */
  availabilityCacheTtlMs: z.number().positive().default(30000),
})

export type OllamaConfig = z.infer<typeof OllamaConfigSchema>

// ============================================================================
// Ollama Provider Adapter (MODL-0011: Refactored to extend BaseProvider)
// ============================================================================

/**
 * Ollama provider implementation extending BaseProvider.
 * Implements abstract methods for Ollama-specific behavior while inheriting
 * common caching and lifecycle logic from BaseProvider.
 *
 * **Implements**:
 * - `parseModelName()`: Supports both 'ollama:' (legacy) and 'ollama/' prefixes
 * - `loadConfig()`: Loads Ollama configuration from environment variables
 * - `createModel()`: Creates ChatOllama instances
 * - `checkAvailability()`: Checks Ollama server availability
 */
export class OllamaProvider extends BaseProvider {
  protected static configCache: OllamaConfig | null = null
  protected static instanceCache = new Map<string, ChatOllama>()
  protected static availabilityCache: AvailabilityCache | null = null

  /**
   * Parses Ollama model name, supporting both legacy and new formats.
   * Legacy: 'ollama:qwen2.5-coder:7b' => 'qwen2.5-coder:7b'
   * New: 'ollama/qwen2.5-coder:7b' => 'qwen2.5-coder:7b'
   */
  protected parseModelName(modelName: string): string {
    if (modelName.startsWith('ollama:')) {
      return modelName.replace('ollama:', '')
    } else if (modelName.startsWith('ollama/')) {
      return modelName.replace('ollama/', '')
    }
    return modelName
  }

  /**
   * Loads Ollama configuration from environment variables.
   * Configuration is cached after first load.
   */
  loadConfig(): OllamaConfig {
    if (OllamaProvider.configCache) {
      return OllamaProvider.configCache
    }

    OllamaProvider.configCache = OllamaConfigSchema.parse({
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
      temperature: process.env.OLLAMA_TEMPERATURE ? parseFloat(process.env.OLLAMA_TEMPERATURE) : 0,
      timeoutMs: process.env.OLLAMA_TIMEOUT_MS
        ? parseInt(process.env.OLLAMA_TIMEOUT_MS, 10)
        : 60000,
      availabilityCacheTtlMs: 30000,
    })

    return OllamaProvider.configCache
  }

  /**
   * Creates a ChatOllama instance with the given configuration.
   * Called by BaseProvider.getModel() template method.
   */
  protected createModel(modelName: string, config: unknown): BaseChatModel {
    const ollamaConfig = config as OllamaConfig

    const llm = new ChatOllama({
      model: modelName,
      baseUrl: ollamaConfig.baseUrl,
      temperature: ollamaConfig.temperature,
    })

    logger.debug('Created ChatOllama instance', { model: modelName })
    return llm
  }

  /**
   * Checks if Ollama server is available.
   * Results are cached for 30 seconds by default.
   */
  async checkAvailability(timeout = 5000, forceCheck = false): Promise<boolean> {
    const config = this.loadConfig()

    return checkEndpointAvailability({
      url: `${config.baseUrl}/api/tags`,
      timeout,
      cacheTtlMs: config.availabilityCacheTtlMs,
      forceCheck,
      cache: {
        get: () => OllamaProvider.availabilityCache,
        set: (value: AvailabilityCache) => {
          OllamaProvider.availabilityCache = value
        },
      },
      logger,
      logContext: { baseUrl: config.baseUrl },
    })
  }

  /**
   * Retrieves a cached ChatOllama instance if one exists.
   * NOTE: Cannot be static due to abstract method signature.
   */
  getCachedInstance(configHash: string): BaseChatModel | null {
    const cached = OllamaProvider.instanceCache.get(configHash)
    if (cached) {
      logger.debug('Ollama cache hit', { configHash })
    }
    return cached ?? null
  }

  /**
   * Clears all caches (for testing).
   */
  static clearCaches(): void {
    OllamaProvider.configCache = null
    OllamaProvider.instanceCache.clear()
    OllamaProvider.availabilityCache = null
  }
}

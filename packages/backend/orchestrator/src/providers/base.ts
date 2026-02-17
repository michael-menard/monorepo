/**
 * base.ts
 *
 * Base provider interface and configuration schema for unified LLM provider abstraction.
 * All provider adapters (OpenRouter, Ollama, Anthropic) implement this interface.
 *
 * @module providers/base
 */

import { createHash } from 'node:crypto'
import { z } from 'zod'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import type { AvailabilityCache } from '../config/llm-provider.js'

// ============================================================================
// Base Configuration Schema
// ============================================================================

/**
 * Base configuration shared across all providers.
 */
export const BaseProviderConfigSchema = z.object({
  /** Provider type */
  provider: z.enum(['openrouter', 'ollama', 'anthropic', 'minimax']),

  /** Model name (without provider prefix) */
  modelName: z.string().min(1),

  /** Temperature for generation (0 = deterministic, 2 = maximum randomness) */
  temperature: z.number().min(0).max(2).default(0),

  /** Request timeout in milliseconds */
  timeoutMs: z.number().positive().default(60000),

  /** Cache TTL for availability checks (ms) */
  availabilityCacheTtlMs: z.number().positive().default(30000),
})

export type BaseProviderConfig = z.infer<typeof BaseProviderConfigSchema>

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Common interface that all LLM provider adapters must implement.
 *
 * NOTE: This is an internal implementation detail, not part of the public contract.
 * External consumers should use the provider factory (getProviderForModel) and
 * access models via the getModel() method only.
 *
 * This interface provides a unified abstraction for:
 * - OpenRouter (200+ model catalog)
 * - Ollama (local models)
 * - Anthropic Direct (official Claude API)
 *
 * MVP ASSUMPTION: Instance cache is unbounded (no eviction policy).
 * This is acceptable because typical usage involves 3-5 unique provider configurations.
 * Cache invalidation happens on process restart only.
 * TODO(MODL-0020): Implement LRU cache with eviction policy for production use.
 */
export interface ILLMProvider {
  /**
   * Gets a configured LangChain chat model instance.
   * Returns a cached instance if available, otherwise creates a new one.
   *
   * @param modelName - Full model name with provider prefix (e.g., 'openrouter/claude-3-5-sonnet')
   * @returns Configured BaseChatModel instance
   * @throws Error if configuration is invalid or model not supported
   */
  getModel(modelName: string): BaseChatModel

  /**
   * Checks if the provider service is available.
   * Results are cached for performance (default 30s TTL).
   *
   * @param timeout - Optional timeout in milliseconds (default: 5000ms)
   * @param forceCheck - Skip cache and perform fresh check (default: false)
   * @returns Promise resolving to true if available, false otherwise
   */
  checkAvailability(timeout?: number, forceCheck?: boolean): Promise<boolean>

  /**
   * Loads provider-specific configuration from environment variables.
   * Configuration is cached after first load.
   *
   * @returns Provider-specific configuration object
   * @throws Error if required environment variables are missing
   */
  loadConfig(): unknown
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Re-export AvailabilityCache from llm-provider to avoid duplication.
 * The canonical definition is in llm-provider.ts for backward compatibility.
 */
export type { AvailabilityCache } from '../config/llm-provider.js'

/**
 * Parsed model information schema.
 */
export const ParsedModelSchema = z.object({
  provider: z.enum(['openrouter', 'ollama', 'anthropic', 'minimax']),
  modelName: z.string(),
  fullName: z.string(),
})

export type ParsedModel = z.infer<typeof ParsedModelSchema>

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Parses a model string into provider and model name components.
 *
 * @param modelString - Full model string (e.g., 'openrouter/claude-3-5-sonnet')
 * @returns Parsed model information or null if invalid format
 *
 * @example
 * parseModelString('openrouter/claude-3-5-sonnet')
 * // => { provider: 'openrouter', modelName: 'claude-3-5-sonnet', fullName: 'openrouter/claude-3-5-sonnet' }
 */
export function parseModelString(modelString: string): ParsedModel | null {
  if (typeof modelString !== 'string' || !modelString.includes('/')) {
    return null
  }

  const [provider, ...modelParts] = modelString.split('/')
  const modelName = modelParts.join('/')

  if (!modelName || !['openrouter', 'ollama', 'anthropic', 'minimax'].includes(provider)) {
    return null
  }

  return {
    provider: provider as 'openrouter' | 'ollama' | 'anthropic' | 'minimax',
    modelName,
    fullName: modelString,
  }
}

/**
 * Generates a configuration hash for cache key generation.
 * Uses SHA-256 hashing for security and performance.
 * Excludes sensitive fields (apiKey) from the hash.
 *
 * @param config - Configuration object
 * @returns Hash string for cache key (16 characters)
 */
export function generateConfigHash(config: Record<string, unknown>): string {
  // Create a sanitized config without sensitive fields
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { apiKey, groupId, ...sanitizedConfig } = config

  // Generate SHA-256 hash and take first 16 characters
  return createHash('sha256').update(JSON.stringify(sanitizedConfig)).digest('hex').substring(0, 16)
}

/**
 * Shared availability check implementation to eliminate duplication across providers.
 * This consolidates the pattern from llm-provider.ts isOllamaAvailable() and
 * reusability across Ollama/Anthropic/OpenRouter providers.
 *
 * @param options - Check configuration
 * @returns Promise resolving to true if endpoint is available
 */
export async function checkEndpointAvailability(options: {
  url: string
  timeout: number
  headers?: Record<string, string>
  acceptableStatuses?: number[]
  cacheTtlMs: number
  forceCheck: boolean
  cache: { get: () => AvailabilityCache | null; set: (value: AvailabilityCache) => void }
  logger: {
    debug: (msg: string, meta?: Record<string, unknown>) => void
    warn: (msg: string, meta?: Record<string, unknown>) => void
  }
  logContext?: Record<string, unknown>
}): Promise<boolean> {
  const {
    url,
    timeout,
    headers,
    acceptableStatuses,
    cacheTtlMs,
    forceCheck,
    cache,
    logger,
    logContext,
  } = options

  // Check cache
  const cachedResult = cache.get()
  if (!forceCheck && cachedResult && Date.now() - cachedResult.checkedAt < cacheTtlMs) {
    return cachedResult.available
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      signal: controller.signal,
      headers,
    })

    clearTimeout(timeoutId)

    // Default acceptable statuses: 200-299 or custom list
    const isAcceptable = acceptableStatuses
      ? acceptableStatuses.includes(response.status)
      : response.ok

    const available = isAcceptable
    cache.set({ available, checkedAt: Date.now() })

    if (available) {
      logger.debug('Endpoint is available', { url, ...logContext })
    } else {
      logger.warn('Endpoint returned non-acceptable status', {
        url,
        status: response.status,
        ...logContext,
      })
    }

    return available
  } catch (error) {
    cache.set({ available: false, checkedAt: Date.now() })
    logger.warn('Endpoint is not available', {
      url,
      error: error instanceof Error ? error.message : 'Unknown error',
      ...logContext,
    })
    return false
  }
}

// ============================================================================
// Abstract Base Provider (MODL-0011)
// ============================================================================

/**
 * Abstract base class for LLM provider implementations.
 * Implements the Template Method pattern to eliminate code duplication across providers.
 *
 * This class extracts common caching and lifecycle logic that was duplicated across
 * OllamaProvider, OpenRouterProvider, and AnthropicProvider (MODL-0010).
 *
 * **Template Method Pattern**:
 * - Base class defines the algorithm structure (caching, config loading, model creation)
 * - Subclasses implement provider-specific steps via abstract methods
 * - Common code lives here, provider-specific code lives in concrete implementations
 *
 * **Responsibilities**:
 * - Provide template method for getModel() with consistent caching behavior
 * - Define abstract methods that concrete providers must implement
 * - Manage static caches (inherited pattern from MODL-0010)
 *
 * **Abstract Methods** (must be implemented by subclasses):
 * - `loadConfig()`: Load provider-specific configuration from environment variables
 * - `createModel()`: Instantiate provider-specific chat model (ChatOllama, ChatOpenAI, etc.)
 * - `checkAvailability()`: Check if provider service is available
 *
 * **Static Methods** (implemented by each provider):
 * - `getCachedInstance()`: Retrieve cached model instance
 * - `clearCaches()`: Clear all caches for testing
 *
 * NOTE: Static methods cannot be abstract in TypeScript, so each provider must implement
 * its own static cache methods. This is unavoidable due to language constraints.
 *
 * @see MODL-0011 for refactoring details
 * @see MODL-0010 for original provider implementation
 */
export abstract class BaseProvider implements ILLMProvider {
  /**
   * Static cache for provider configuration.
   * Each provider overrides with its own typed cache.
   */
  protected static configCache: unknown | null = null

  /**
   * Static cache for model instances (by config hash).
   * Each provider overrides with its own typed cache.
   */
  protected static instanceCache = new Map<string, BaseChatModel>()

  /**
   * Static cache for availability check results.
   * Each provider overrides with its own cache.
   */
  protected static availabilityCache: AvailabilityCache | null = null

  /**
   * Template method for getting a configured model instance.
   * Implements consistent caching behavior across all providers.
   *
   * **Algorithm**:
   * 1. Parse model name (provider-specific)
   * 2. Load configuration (provider-specific via loadConfig())
   * 3. Generate cache hash (common)
   * 4. Check cache (common via getCachedInstance())
   * 5. Create model if not cached (provider-specific via createModel())
   * 6. Store in cache (common)
   *
   * This method eliminates 24 lines of duplicated cache logic from MODL-0010.
   *
   * @param modelName - Full model name with provider prefix
   * @returns Configured BaseChatModel instance
   */
  getModel(modelName: string): BaseChatModel {
    // Step 1: Parse model name (provider-specific - kept in subclasses)
    const parsedModel = this.parseModelName(modelName)

    // Step 2: Load config (provider-specific via abstract method)
    const config = this.loadConfig()

    // Step 3: Generate cache hash (common)
    const configHash = generateConfigHash({
      model: parsedModel,
      ...(config as Record<string, unknown>),
    })

    // Step 4: Check cache (common)
    const cached = this.getCachedInstance(configHash)
    if (cached) {
      return cached
    }

    // Step 5: Create model (provider-specific via abstract method)
    const model = this.createModel(parsedModel, config)

    // Step 6: Store in cache (common)
    // Access static cache via constructor to get provider-specific cache
    ;(this.constructor as typeof BaseProvider).instanceCache.set(configHash, model)

    return model
  }

  /**
   * Parse model name to extract provider-specific model identifier.
   * Each provider has different prefix conventions (ollama:, openrouter/, anthropic/).
   *
   * @param modelName - Full model name with provider prefix
   * @returns Parsed model name without prefix
   */
  protected abstract parseModelName(modelName: string): string

  /**
   * Load provider-specific configuration from environment variables.
   * Configuration is cached after first load.
   *
   * @returns Provider-specific configuration object
   * @throws Error if required environment variables are missing
   */
  abstract loadConfig(): unknown

  /**
   * Create a provider-specific chat model instance.
   * Called by template method when no cached instance exists.
   *
   * @param modelName - Parsed model name (without provider prefix)
   * @param config - Provider-specific configuration
   * @returns Configured chat model instance
   */
  protected abstract createModel(modelName: string, config: unknown): BaseChatModel

  /**
   * Check if the provider service is available.
   * Results should be cached for performance.
   *
   * @param timeout - Optional timeout in milliseconds (default: 5000ms)
   * @param forceCheck - Skip cache and perform fresh check (default: false)
   * @returns Promise resolving to true if available, false otherwise
   */
  abstract checkAvailability(timeout?: number, forceCheck?: boolean): Promise<boolean>

  /**
   * Retrieve a cached model instance if one exists.
   * Each provider implements this with access to its own static cache.
   *
   * NOTE: This cannot be abstract due to TypeScript static method limitations.
   * Each provider must implement its own version.
   *
   * @param configHash - Configuration hash for cache key
   * @returns Cached model instance or null
   */
  abstract getCachedInstance(configHash: string): BaseChatModel | null
}

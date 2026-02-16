/**
 * index.ts
 *
 * Provider factory for dynamic provider selection based on model prefix.
 * Routes to correct adapter: openrouter/*, ollama/*, anthropic/*
 *
 * @module providers
 */

import { logger } from '@repo/logger'
import type { ILLMProvider } from './base.js'
import { parseModelString } from './base.js'
import { OllamaProvider } from './ollama.js'
import { OpenRouterProvider } from './openrouter.js'
import { AnthropicProvider } from './anthropic.js'

// NOTE: No barrel file re-exports per CLAUDE.md requirements.
// Import types and utilities directly from source files:
// - ./base.ts for ILLMProvider, schemas, utilities
// - ./ollama.ts for OllamaProvider, OllamaConfig, etc.
// - ./openrouter.ts for OpenRouterProvider, OpenRouterConfig, etc.
// - ./anthropic.ts for AnthropicProvider, AnthropicConfig, etc.

// ============================================================================
// Provider Factory
// ============================================================================

/**
 * Provider registry cache to avoid creating multiple instances.
 */
const providerRegistry = new Map<string, ILLMProvider>()

/**
 * Gets the appropriate provider adapter for a given model name.
 *
 * Routes based on model prefix:
 * - `openrouter/*` → OpenRouterProvider
 * - `ollama/*` or `ollama:*` → OllamaProvider
 * - `anthropic/*` → AnthropicProvider
 *
 * @param modelName - Full model name with provider prefix
 * @returns Provider adapter instance
 * @throws Error if provider prefix is unsupported
 *
 * @example
 * ```typescript
 * const provider = getProviderForModel('openrouter/claude-3-5-sonnet')
 * const llm = provider.getModel('openrouter/claude-3-5-sonnet')
 * ```
 */
export function getProviderForModel(modelName: string): ILLMProvider {
  // Parse model string to extract provider
  const parsed = parseModelString(modelName)

  // Handle legacy ollama:model:tag format
  const isLegacyOllama = modelName.startsWith('ollama:')

  if (!parsed && !isLegacyOllama) {
    const error = new Error(
      `Unsupported model format: "${modelName}". ` +
        `Expected format: <provider>/<model-name>. ` +
        `Supported providers: openrouter, ollama, anthropic. ` +
        `Example: "openrouter/claude-3-5-sonnet"`,
    )
    logger.error('Invalid model format', { modelName, error: error.message })
    throw error
  }

  const provider = isLegacyOllama ? 'ollama' : parsed!.provider

  // Check registry cache
  if (providerRegistry.has(provider)) {
    logger.debug('Provider cache hit', { provider })
    return providerRegistry.get(provider)!
  }

  // Create and cache provider instance
  let providerInstance: ILLMProvider

  switch (provider) {
    case 'openrouter': {
      providerInstance = new OpenRouterProvider()
      break
    }

    case 'ollama': {
      providerInstance = new OllamaProvider()
      break
    }

    case 'anthropic': {
      providerInstance = new AnthropicProvider()
      break
    }

    default: {
      const error = new Error(
        `Unsupported provider: "${provider}". ` +
          `Supported providers: openrouter, ollama, anthropic. ` +
          `Use format: <provider>/<model-name>`,
      )
      logger.error('Unsupported provider', { provider, modelName, error: error.message })
      throw error
    }
  }

  providerRegistry.set(provider, providerInstance)
  logger.debug('Created provider instance', { provider })

  return providerInstance
}

/**
 * Clears the provider registry cache (for testing).
 */
export function clearProviderRegistry(): void {
  providerRegistry.clear()
}

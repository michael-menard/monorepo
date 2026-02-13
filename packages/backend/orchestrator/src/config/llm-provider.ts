/**
 * llm-provider.ts
 *
 * LLM Provider Factory for hybrid Claude/Ollama support.
 * Provides local Ollama models for fast/simple tasks while
 * preserving Claude models for complex reasoning.
 *
 * @module config/llm-provider
 */

import { z } from 'zod'
import { ChatOllama } from '@langchain/ollama'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { logger } from '@repo/logger'
import {
  getModelForAgent,
  isOllamaModel,
  parseOllamaModel,
  type ClaudeModel,
  type Model,
  type ParsedOllamaModel,
} from './model-assignments.js'

// ============================================================================
// Configuration Schema
// ============================================================================

/**
 * Environment-based configuration for LLM providers.
 */
export const LLMProviderConfigSchema = z.object({
  /** Ollama server base URL */
  baseUrl: z.string().url().default('http://127.0.0.1:11434'),

  /** Default temperature for Ollama models */
  temperature: z.number().min(0).max(2).default(0),

  /** Request timeout in milliseconds */
  timeoutMs: z.number().positive().default(60000),

  /** Enable fallback to Claude when Ollama unavailable */
  enableFallback: z.boolean().default(true),

  /** Fallback Claude model when Ollama unavailable */
  fallbackModel: z.enum(['haiku', 'sonnet', 'opus']).default('haiku'),

  /** Cache TTL for availability checks (ms) */
  availabilityCacheTtlMs: z.number().positive().default(30000),
})

export type LLMProviderConfig = z.infer<typeof LLMProviderConfigSchema>

// ============================================================================
// Configuration Loading
// ============================================================================

let cachedConfig: LLMProviderConfig | null = null

/**
 * Loads LLM provider configuration from environment variables.
 */
export function loadLLMProviderConfig(): LLMProviderConfig {
  if (cachedConfig) {
    return cachedConfig
  }

  cachedConfig = LLMProviderConfigSchema.parse({
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    temperature: process.env.OLLAMA_TEMPERATURE ? parseFloat(process.env.OLLAMA_TEMPERATURE) : 0,
    timeoutMs: process.env.OLLAMA_TIMEOUT_MS ? parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) : 60000,
    enableFallback: process.env.OLLAMA_ENABLE_FALLBACK !== 'false',
    fallbackModel: process.env.OLLAMA_FALLBACK_MODEL ?? 'haiku',
    availabilityCacheTtlMs: 30000,
  })

  return cachedConfig
}

/**
 * Clears the cached configuration (for testing).
 */
export function clearLLMProviderConfigCache(): void {
  cachedConfig = null
}

// ============================================================================
// Ollama Availability Check
// ============================================================================

interface AvailabilityCache {
  available: boolean
  checkedAt: number
}

let availabilityCache: AvailabilityCache | null = null

/**
 * Checks if Ollama server is available.
 * Results are cached for 30 seconds by default.
 */
export async function isOllamaAvailable(forceCheck = false): Promise<boolean> {
  const config = loadLLMProviderConfig()

  // Check cache
  if (
    !forceCheck &&
    availabilityCache &&
    Date.now() - availabilityCache.checkedAt < config.availabilityCacheTtlMs
  ) {
    return availabilityCache.available
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(`${config.baseUrl}/api/tags`, {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const available = response.ok
    availabilityCache = { available, checkedAt: Date.now() }

    if (available) {
      logger.debug('Ollama server is available', { baseUrl: config.baseUrl })
    } else {
      logger.warn('Ollama server returned non-OK status', {
        baseUrl: config.baseUrl,
        status: response.status,
      })
    }

    return available
  } catch (error) {
    availabilityCache = { available: false, checkedAt: Date.now() }
    logger.warn('Ollama server is not available', {
      baseUrl: config.baseUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return false
  }
}

/**
 * Clears the availability cache (for testing).
 */
export function clearOllamaAvailabilityCache(): void {
  availabilityCache = null
}

// ============================================================================
// LLM Instance Cache
// ============================================================================

const ollamaInstanceCache = new Map<string, ChatOllama>()

/**
 * Creates or retrieves a cached ChatOllama instance.
 */
export function createOllamaLLM(parsedModel: ParsedOllamaModel): ChatOllama {
  const cacheKey = parsedModel.fullName
  const cached = ollamaInstanceCache.get(cacheKey)

  if (cached) {
    return cached
  }

  const config = loadLLMProviderConfig()

  const llm = new ChatOllama({
    model: parsedModel.fullName,
    baseUrl: config.baseUrl,
    temperature: config.temperature,
  })

  ollamaInstanceCache.set(cacheKey, llm)
  logger.debug('Created ChatOllama instance', { model: parsedModel.fullName })

  return llm
}

/**
 * Clears the LLM instance cache (for testing).
 */
export function clearOllamaLLMCache(): void {
  ollamaInstanceCache.clear()
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Result of getLLMForAgent.
 */
export type LLMResult =
  | {
      provider: 'ollama'
      llm: BaseChatModel
      model: ParsedOllamaModel
    }
  | {
      provider: 'claude'
      llm: null
      model: ClaudeModel
    }

/**
 * Gets the LLM for an agent.
 *
 * For Ollama models: Returns a ChatOllama instance (or falls back to Claude if unavailable).
 * For Claude models: Returns model info only (Claude is invoked externally via Claude Code).
 *
 * @param agentName - Name of the agent
 * @param options - Optional configuration
 */
export async function getLLMForAgent(
  agentName: string,
  options?: {
    /** Override the model from assignments */
    modelOverride?: Model
    /** Skip availability check (for testing) */
    skipAvailabilityCheck?: boolean
  },
): Promise<LLMResult> {
  const model = options?.modelOverride ?? getModelForAgent(agentName)
  const config = loadLLMProviderConfig()

  // Handle Claude models
  if (!isOllamaModel(model)) {
    return {
      provider: 'claude',
      llm: null,
      model: model,
    }
  }

  // Parse Ollama model
  const parsedModel = parseOllamaModel(model)
  if (!parsedModel) {
    logger.error('Failed to parse Ollama model', { model })
    return {
      provider: 'claude',
      llm: null,
      model: config.fallbackModel,
    }
  }

  // Check Ollama availability
  const skipCheck = options?.skipAvailabilityCheck ?? false
  const available = skipCheck || (await isOllamaAvailable())

  if (!available) {
    if (config.enableFallback) {
      logger.info('Falling back to Claude model', {
        agent: agentName,
        requestedModel: parsedModel.fullName,
        fallbackModel: config.fallbackModel,
      })
      return {
        provider: 'claude',
        llm: null,
        model: config.fallbackModel,
      }
    }

    throw new Error(`Ollama is not available and fallback is disabled`)
  }

  // Create and return Ollama LLM
  const llm = createOllamaLLM(parsedModel)

  return {
    provider: 'ollama',
    llm,
    model: parsedModel,
  }
}

/**
 * Synchronous version that returns Claude model info without checking Ollama.
 * Useful for cases where you just need the model assignment.
 */
export function getModelInfoForAgent(agentName: string): {
  model: Model
  provider: 'claude' | 'ollama'
  parsedOllama: ParsedOllamaModel | null
} {
  const model = getModelForAgent(agentName)
  const provider = isOllamaModel(model) ? 'ollama' : 'claude'
  const parsedOllama = isOllamaModel(model) ? parseOllamaModel(model) : null

  return { model, provider, parsedOllama }
}

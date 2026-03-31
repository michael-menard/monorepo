/**
 * LLM Adapters
 *
 * Provides LLM adapter implementations that connect LangGraph workflow nodes
 * to the MODL-0010 provider factory for actual model invocations.
 *
 * These adapters bridge the gap between:
 * - Node interfaces (simple {role, content} messages)
 * - LangChain interfaces (BaseMessage, AIMessage with usage_metadata)
 *
 * @module services/llm-adapters
 */

import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages'
import type { BaseMessage } from '@langchain/core/messages'
import { logger } from '@repo/logger'
import { getProviderForModel } from '../providers/index.js'
import { getModelForAgent } from '../config/model-assignments.js'
import type { LlmAdapterFn } from '../nodes/dev-implement-v2/implementation-executor.js'
import type { LlmAdapterFn as PlannerLlmAdapterFn } from '../nodes/dev-implement-v2/implementation-planner.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Simple message format used by node adapters.
 */
export type SimpleMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * LLM response with token usage.
 */
export type LlmResponse = {
  content: string
  inputTokens: number
  outputTokens: number
}

/**
 * Configuration for creating LLM adapters.
 */
export type LlmAdapterConfig = {
  /** Model string (e.g., 'ollama:qwen2.5-coder:7b', 'ollama/qwen2.5-coder:7b') */
  modelString?: string
  /** Agent name for model assignment lookup */
  agentName?: string
  /** Timeout in milliseconds */
  timeoutMs?: number
}

// ============================================================================
// Message Conversion
// ============================================================================

/**
 * Converts simple messages to LangChain BaseMessage format.
 */
export function convertToLangChainMessages(messages: SimpleMessage[]): BaseMessage[] {
  return messages.map(msg => {
    switch (msg.role) {
      case 'system':
        return new SystemMessage(msg.content)
      case 'user':
        return new HumanMessage(msg.content)
      case 'assistant':
        return new AIMessage(msg.content)
      default:
        return new HumanMessage(msg.content)
    }
  })
}

/**
 * Extracts token usage from AIMessage.
 * LangChain puts this in usage_metadata for most providers.
 */
export function extractTokenUsage(aiMessage: AIMessage): {
  inputTokens: number
  outputTokens: number
} {
  // Check usage_metadata (standard LangChain location)
  const usageMetadata = aiMessage.usage_metadata
  if (usageMetadata) {
    return {
      inputTokens: usageMetadata.input_tokens ?? 0,
      outputTokens: usageMetadata.output_tokens ?? 0,
    }
  }

  // Fallback: check response_metadata (some providers put it here)
  const responseMetadata = aiMessage.response_metadata
  if (responseMetadata?.usage) {
    const usage = responseMetadata.usage as Record<string, number>
    return {
      inputTokens: usage.prompt_tokens ?? usage.input_tokens ?? 0,
      outputTokens: usage.completion_tokens ?? usage.output_tokens ?? 0,
    }
  }

  // No usage info available
  return { inputTokens: 0, outputTokens: 0 }
}

// ============================================================================
// LLM Adapter Factory
// ============================================================================

/**
 * Creates an LLM adapter function for a given model.
 *
 * The adapter:
 * 1. Takes simple {role, content} messages
 * 2. Converts to LangChain format
 * 3. Invokes the model via MODL-0010 provider
 * 4. Extracts content and token usage
 * 5. Returns in the format nodes expect
 *
 * @param config - Adapter configuration
 * @returns LLM adapter function compatible with node interfaces
 *
 * @example
 * ```typescript
 * // Using explicit model string
 * const adapter = createLlmAdapter({ modelString: 'ollama:qwen2.5-coder:7b' })
 *
 * // Using agent name for model lookup
 * const adapter = createLlmAdapter({ agentName: 'dev-implement-backend-coder' })
 *
 * // Call the adapter
 * const response = await adapter([
 *   { role: 'system', content: 'You are a helpful assistant.' },
 *   { role: 'user', content: 'Hello!' }
 * ])
 * ```
 */
export function createLlmAdapter(config: LlmAdapterConfig = {}): LlmAdapterFn {
  // Resolve model string
  const modelString =
    config.modelString ?? getModelForAgent(config.agentName ?? 'dev-implement-backend-coder')

  logger.debug('Creating LLM adapter', { modelString, agentName: config.agentName })

  return async (messages: SimpleMessage[]): Promise<LlmResponse> => {
    const startTime = Date.now()

    try {
      // Get provider via MODL-0010 factory
      const provider = getProviderForModel(modelString)

      // Check availability first (cached, fast)
      const available = await provider.checkAvailability()
      if (!available) {
        throw new Error(`Provider for ${modelString} is not available`)
      }

      // Get the model instance
      const model = provider.getModel(modelString)

      // Convert messages to LangChain format
      const langChainMessages = convertToLangChainMessages(messages)

      // Invoke the model
      const response = await model.invoke(langChainMessages)
      const aiMessage = response as AIMessage

      // Extract content (handle both string and structured content)
      let content: string
      if (typeof aiMessage.content === 'string') {
        content = aiMessage.content
      } else if (Array.isArray(aiMessage.content)) {
        // Handle structured content (text blocks, etc.)
        content = aiMessage.content
          .map(block => {
            if (typeof block === 'string') return block
            if (typeof block === 'object' && 'text' in block) return block.text
            return JSON.stringify(block)
          })
          .join('')
      } else {
        content = String(aiMessage.content)
      }

      // Extract token usage
      const usage = extractTokenUsage(aiMessage)

      const durationMs = Date.now() - startTime
      logger.debug('LLM adapter call completed', {
        modelString,
        durationMs,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        contentLength: content.length,
      })

      return {
        content,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
      }
    } catch (err) {
      const durationMs = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : String(err)

      logger.error('LLM adapter call failed', {
        modelString,
        durationMs,
        error: errorMessage,
      })

      throw err
    }
  }
}

// ============================================================================
// Pre-configured Adapters
// ============================================================================

/**
 * Default executor adapter using the model assigned to 'dev-implement-backend-coder'.
 * This is typically ollama:deepseek-coder-v2:33b or similar.
 */
export function createExecutorLlmAdapter(): LlmAdapterFn {
  return createLlmAdapter({ agentName: 'dev-implement-backend-coder' })
}

/**
 * Default planner adapter using the model assigned to 'dev-implement-planner'.
 * This is typically sonnet for strategic planning.
 */
export function createPlannerLlmAdapter(): PlannerLlmAdapterFn {
  return createLlmAdapter({ agentName: 'dev-implement-planner' })
}

/**
 * Qwen-specific adapter for fast code generation.
 * Uses qwen2.5-coder:7b for quick tasks.
 */
export function createQwenAdapter(): LlmAdapterFn {
  return createLlmAdapter({ modelString: 'ollama:qwen2.5-coder:7b' })
}

/**
 * DeepSeek adapter for complex code generation.
 * Uses deepseek-coder-v2:33b (or :16b for lower RAM).
 */
export function createDeepSeekAdapter(size: '33b' | '16b' = '33b'): LlmAdapterFn {
  return createLlmAdapter({ modelString: `ollama:deepseek-coder-v2:${size}` })
}

// ============================================================================
// Composite Adapter Config
// ============================================================================

/**
 * Returns a complete set of LLM adapters for all graph nodes.
 * Uses model assignments from model-assignments.yaml.
 */
export function createLlmAdapters() {
  return {
    // Dev Implement V2
    executorLlmAdapter: createExecutorLlmAdapter(),
    plannerLlmAdapter: createPlannerLlmAdapter(),

    // Quick Qwen adapter for testing
    qwenAdapter: createQwenAdapter(),
  }
}

export type LlmAdapters = ReturnType<typeof createLlmAdapters>

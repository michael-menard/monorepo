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
import { ClaudeCodeProvider, getClaudeCodeProvider } from '../providers/claude-code.js'
import type { LlmAdapterFn } from '../nodes/dev-implement-v2/implementation-executor.js'
import type { LlmAdapterFn as PlannerLlmAdapterFn } from '../nodes/dev-implement-v2/implementation-planner.js'
import type { LlmAdapterFn as RefinementLlmAdapterFn } from '../nodes/plan-refinement-v2/refinement-agent.js'
import type { SlicerLlmAdapterFn } from '../nodes/story-generation-v2/story-slicer-agent.js'
import type { EnricherLlmAdapterFn } from '../nodes/story-generation-v2/story-enricher-agent.js'
import type { DependencyWirerLlmAdapterFn } from '../nodes/story-generation-v2/dependency-wirer-agent.js'
import type { LlmAdapterFn as ReviewLlmAdapterFn } from '../nodes/review-v2/review-agent.js'
import type { LlmAdapterFn as RiskLlmAdapterFn } from '../nodes/review-v2/risk-assessor.js'

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

  // claude-code/* routes through `claude -p` subprocess — no API key needed.
  // Format: "claude-code/sonnet", "claude-code/haiku", "claude-code/opus"
  if (modelString.startsWith('claude-code/')) {
    const claudeModel = modelString.replace('claude-code/', '')
    const claudeProvider = getClaudeCodeProvider({ model: claudeModel })

    return async (messages: SimpleMessage[]): Promise<LlmResponse> => {
      const startTime = Date.now()
      // Flatten messages into a single prompt for claude -p.
      // Always end with a hard reminder to respond with ONLY a JSON tool call.
      const systemMsg = messages.find(m => m.role === 'system')?.content ?? ''
      const nonSystem = messages.filter(m => m.role !== 'system')
      const historyParts = nonSystem.map(m => {
        const label = m.role === 'assistant' ? 'ASSISTANT' : 'USER'
        return `[${label}]\n${m.content}`
      })
      // If there are no prior assistant turns, this is the first call —
      // tell the model to start with write_file, not complete.
      const hasAssistantTurn = nonSystem.some(m => m.role === 'assistant')
      const reminder = hasAssistantTurn
        ? '\n\n[REMINDER] Respond with ONLY a single valid JSON tool call object. No markdown, no prose.'
        : '\n\n[REMINDER] Your FIRST response must call write_file for the first file to create. Do NOT call complete yet. Respond with ONLY a single JSON tool call.'
      const parts = [systemMsg, ...historyParts].filter(Boolean)
      const prompt = parts.join('\n\n') + reminder

      try {
        const response = await claudeProvider.invoke(prompt)
        const durationMs = Date.now() - startTime
        logger.debug('LLM adapter call completed (claude-code)', {
          modelString,
          durationMs,
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          contentLength: response.content.length,
        })
        return response
      } catch (err) {
        const durationMs = Date.now() - startTime
        const errorMessage = err instanceof Error ? err.message : String(err)
        logger.error('LLM adapter call failed (claude-code)', {
          modelString,
          durationMs,
          error: errorMessage,
        })
        throw err
      }
    }
  }

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
// Claude Code Adapters (claude -p subprocess with MCP)
// ============================================================================

/**
 * Plan refinement adapter.
 * The refinement agent already builds structured prompts and expects a JSON tool
 * call response — we pass the prompt straight through.
 */
export function createRefinementLlmAdapter(model = 'sonnet'): RefinementLlmAdapterFn {
  const provider = getClaudeCodeProvider({ model })
  return async messages => {
    const prompt = messages.map(m => `[${m.role.toUpperCase()}]\n${m.content}`).join('\n\n')
    const response = await provider.invoke(prompt)
    return {
      content: response.content,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
    }
  }
}

/**
 * Story slicer adapter.
 * Expects a JSON response with { slices: [...] }.
 */
export function createSlicerLlmAdapter(model = 'sonnet'): SlicerLlmAdapterFn {
  const provider = getClaudeCodeProvider({ model })
  return async prompt => {
    const response = await provider.invoke(
      `${prompt}\n\nRespond ONLY with a valid JSON object matching this shape: { "slices": [{ "flowId": string, "stepIndices": number[], "scopeDescription": string, "rationale": string }] }`,
    )
    try {
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.content.trim()
      const parsed = JSON.parse(jsonStr)
      return {
        slices: parsed.slices ?? [],
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      }
    } catch {
      logger.warn('createSlicerLlmAdapter: failed to parse JSON response, returning empty slices')
      return { slices: [], inputTokens: response.inputTokens, outputTokens: response.outputTokens }
    }
  }
}

/**
 * Story enricher adapter.
 * Expects a JSON response matching LlmEnrichment shape.
 */
export function createEnricherLlmAdapter(model = 'sonnet'): EnricherLlmAdapterFn {
  // Enricher needs longer timeout — stories + codebase context can be large
  const provider = new ClaudeCodeProvider({ model, timeoutMs: 600_000 })
  return async prompt => {
    const response = await provider.invoke(
      `${prompt}\n\nRespond ONLY with a valid JSON object matching this shape: { "relevantFiles": string[], "relevantFunctions": string[], "implementationHints": string[], "scopeBoundary": { "inScope": string[], "outOfScope": string[] }, "acceptance_criteria": string[], "subtasks": string[], "acFlowTraceability": [{ "acIndex": number, "flowStepRef": string }] }`,
    )
    try {
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.content.trim()
      const parsed = JSON.parse(jsonStr)
      return {
        relevantFiles: parsed.relevantFiles ?? [],
        relevantFunctions: parsed.relevantFunctions ?? [],
        implementationHints: parsed.implementationHints ?? [],
        scopeBoundary: parsed.scopeBoundary ?? { inScope: [], outOfScope: [] },
        acceptance_criteria: parsed.acceptance_criteria ?? [],
        subtasks: parsed.subtasks ?? [],
        acFlowTraceability: parsed.acFlowTraceability ?? [],
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      }
    } catch {
      logger.warn(
        'createEnricherLlmAdapter: failed to parse JSON response, returning empty enrichment',
      )
      return {
        relevantFiles: [],
        relevantFunctions: [],
        implementationHints: [],
        scopeBoundary: { inScope: [], outOfScope: [] },
        acceptance_criteria: [],
        subtasks: [],
        acFlowTraceability: [],
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      }
    }
  }
}

/**
 * Claude Code executor adapter.
 *
 * Instead of simulating a JSON ReAct loop (which Claude refuses as prompt injection),
 * this adapter sends a single "do everything" prompt with --dangerously-skip-permissions
 * so Claude can write files using its own native tools. On completion, it synthesizes
 * a `complete` tool call JSON from the prose result report.
 *
 * Only used for the executor node (writes files). Planner still uses the standard
 * claude-code/* path via createLlmAdapter.
 */
export function createClaudeCodeExecutorAdapter(model = 'sonnet'): LlmAdapterFn {
  return async (messages: SimpleMessage[]): Promise<LlmResponse> => {
    const startTime = Date.now()

    // Extract the system message which contains the plan details
    const systemMsg = messages.find(m => m.role === 'system')?.content ?? ''

    // The target directory for all file writes — read lazily so env override in run scripts works.
    // MONOREPO_ROOT is set by the run script to point at the feature worktree.
    const targetRoot =
      process.env.MONOREPO_ROOT ??
      (process.env.HOME
        ? `${process.env.HOME}/Development/monorepo`
        : '/Users/michaelmenard/Development/monorepo')

    // Create a fresh provider per call so cwd reflects the current MONOREPO_ROOT
    const provider = new ClaudeCodeProvider({
      model,
      allowDangerousPermissions: true,
      timeoutMs: 600_000, // 10 min for full implementation
      cwd: targetRoot, // Claude subprocess runs from the target worktree
    })

    // Check if there are previous assistant turns (subsequent iterations)
    const assistantTurns = messages.filter(m => m.role === 'assistant')

    // If this is a retry/subsequent iteration, summarize prior work
    const previousContext =
      assistantTurns.length > 0
        ? `\n\nPREVIOUS ACTIONS TAKEN:\n${assistantTurns.map((m, i) => `[Turn ${i + 1}]\n${m.content.slice(0, 500)}`).join('\n\n')}`
        : ''

    // Build a comprehensive implementation prompt
    const prompt = `${systemMsg}${previousContext}

TARGET DIRECTORY: ${targetRoot}
All file paths in "FILES TO CREATE" and "FILES TO MODIFY" above are relative to: ${targetRoot}
For example, "apps/api/notifications-server/src/index.ts" means the absolute path is:
  ${targetRoot}/apps/api/notifications-server/src/index.ts

IMPORTANT: You have permission to write files directly to disk. Use your native file-writing tools to implement ALL files listed in the plan above. Write files to their full absolute paths (${targetRoot}/<relative-path>).

Work through the implementation step by step:
1. Create each file listed in FILES TO CREATE with complete, production-ready content
2. Modify each file listed in FILES TO MODIFY
3. For new packages/servers: do NOT run tests (they require a running environment)
4. For existing packages: run the tests after implementing

When completely done, output a JSON summary on a NEW LINE in this EXACT format (no markdown, one line):
COMPLETION_REPORT: {"filesCreated":["apps/api/notifications-server/src/index.ts"],"filesModified":[],"testsRan":false,"testsPassed":false,"testOutput":"","notes":"brief summary"}`

    try {
      const response = await provider.invoke(prompt)
      const durationMs = Date.now() - startTime

      logger.debug('ClaudeCodeExecutorAdapter: invocation complete', {
        durationMs,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        contentLength: response.content.length,
      })

      // Parse the COMPLETION_REPORT from Claude's output.
      // Use balanced-brace walk instead of regex to handle nested JSON correctly.
      let reportJsonStr: string | null = null
      const reportPrefix = response.content.indexOf('COMPLETION_REPORT:')
      if (reportPrefix !== -1) {
        const afterPrefix = response.content
          .slice(reportPrefix + 'COMPLETION_REPORT:'.length)
          .trimStart()
        const firstBrace = afterPrefix.indexOf('{')
        if (firstBrace !== -1) {
          let depth = 0
          let end = firstBrace
          for (let i = firstBrace; i < afterPrefix.length; i++) {
            if (afterPrefix[i] === '{') depth++
            if (afterPrefix[i] === '}') {
              depth--
              if (depth === 0) {
                end = i
                break
              }
            }
          }
          reportJsonStr = afterPrefix.slice(firstBrace, end + 1)
        }
      }
      const reportMatch = reportJsonStr ? [null, reportJsonStr] : null

      let completionJson: string
      if (reportMatch && reportJsonStr) {
        try {
          const report = JSON.parse(reportJsonStr)
          completionJson = JSON.stringify({
            tool: 'complete',
            args: {
              filesCreated: report.filesCreated ?? [],
              filesModified: report.filesModified ?? [],
              testsRan: report.testsRan ?? false,
              testsPassed: report.testsPassed ?? false,
              testOutput: report.testOutput ?? '',
              acVerification: [],
            },
          })
        } catch {
          // Report found but malformed — treat as complete with unknown files
          completionJson = JSON.stringify({
            tool: 'complete',
            args: {
              filesCreated: [],
              filesModified: [],
              testsRan: false,
              testsPassed: false,
              testOutput: response.content.slice(-500),
              acVerification: [],
            },
          })
        }
      } else {
        // No structured report — check if Claude mentioned errors
        const lowerContent = response.content.toLowerCase()
        const seemsStuck =
          lowerContent.includes('cannot') ||
          lowerContent.includes('error') ||
          lowerContent.includes('failed') ||
          lowerContent.includes('unable')

        if (seemsStuck) {
          completionJson = JSON.stringify({
            tool: 'stuck',
            args: {
              diagnosis: `Claude Code completed but reported issues: ${response.content.slice(-300)}`,
              filesCreated: [],
              filesModified: [],
            },
          })
        } else {
          // Assume success — Claude wrote files but didn't output the structured report
          completionJson = JSON.stringify({
            tool: 'complete',
            args: {
              filesCreated: [],
              filesModified: [],
              testsRan: false,
              testsPassed: false,
              testOutput: response.content.slice(-500),
              acVerification: [],
            },
          })
        }
      }

      return {
        content: completionJson,
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      }
    } catch (err) {
      const durationMs = Date.now() - startTime
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('ClaudeCodeExecutorAdapter: invocation failed', {
        durationMs,
        error: errorMessage,
      })
      throw err
    }
  }
}

/**
 * Dependency wirer adapter.
 * Expects a JSON response with { edges: [...], minimumPath: [...] }.
 */
export function createDependencyWirerLlmAdapter(model = 'sonnet'): DependencyWirerLlmAdapterFn {
  const provider = getClaudeCodeProvider({ model })
  return async prompt => {
    const response = await provider.invoke(
      `${prompt}\n\nRespond ONLY with a valid JSON object matching this shape: { "edges": [{ "from": string, "to": string, "type": string, "rationale": string }], "minimumPath": string[] }`,
    )
    try {
      const jsonMatch = response.content.match(/```(?:json)?\s*([\s\S]*?)```/)
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.content.trim()
      const parsed = JSON.parse(jsonStr)
      return {
        edges: parsed.edges ?? [],
        minimumPath: parsed.minimumPath ?? [],
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      }
    } catch {
      logger.warn(
        'createDependencyWirerLlmAdapter: failed to parse JSON response, returning empty edges',
      )
      return {
        edges: [],
        minimumPath: [],
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
      }
    }
  }
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

    // Plan Refinement V2 + Story Generation V2 (via claude -p)
    refinementLlmAdapter: createRefinementLlmAdapter(),
    slicerLlmAdapter: createSlicerLlmAdapter(),
    enricherLlmAdapter: createEnricherLlmAdapter(),
    dependencyWirerLlmAdapter: createDependencyWirerLlmAdapter(),
  }
}

export type LlmAdapters = ReturnType<typeof createLlmAdapters>

/**
 * implementation_planner Node (dev-implement-v2) — AGENTIC (LLM)
 *
 * Receives story grounding context, decides implementation approach,
 * files to create/modify, test strategy, and risks.
 *
 * Internal ReAct loop (max 3 iterations) with tool belt.
 * Postconditions checked before advancing.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  StoryGroundingContext,
  ImplementationPlan,
  TokenUsage,
  DevImplementV2State,
} from '../../state/dev-implement-v2-state.js'
import type { PostconditionResult } from '../../state/plan-refinement-v2-state.js'

// ============================================================================
// Injectable Adapter Types
// ============================================================================

export type LlmAdapterFn = (
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
) => Promise<{
  content: string
  inputTokens: number
  outputTokens: number
}>

export type QueryKbFn = (query: string) => Promise<string>
export type SearchCodebaseFn = (pattern: string) => Promise<string>
export type ReadFileFn = (path: string) => Promise<string>
export type ListDirectoryFn = (path: string) => Promise<string>

// ============================================================================
// Config
// ============================================================================

export type ImplementationPlannerConfig = {
  llmAdapter?: LlmAdapterFn
  queryKb?: QueryKbFn
  searchCodebase?: SearchCodebaseFn
  readFile?: ReadFileFn
  listDirectory?: ListDirectoryFn
  maxInternalIterations?: number
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Builds the planner system prompt.
 */
export function buildPlannerPrompt(
  groundingContext: StoryGroundingContext,
  previousFailures: Array<{ check: string; reason: string }> = [],
): string {
  const acList = groundingContext.acceptanceCriteria.map((ac, i) => `  ${i}. ${ac}`).join('\n')

  const subtaskList = groundingContext.subtasks.map((s, i) => `  ${i}. ${s}`).join('\n')

  const filesSection =
    groundingContext.relevantFiles.length > 0
      ? groundingContext.relevantFiles.join('\n  ')
      : '(none found)'

  const functionsSection =
    groundingContext.relevantFunctions.length > 0
      ? groundingContext.relevantFunctions.map(f => `  ${f.file}: ${f.name}()`).join('\n')
      : '(none found)'

  const failureSection =
    previousFailures.length > 0
      ? `\nPREVIOUS ATTEMPT FAILURES:\n${previousFailures.map(f => `  - [${f.check}] ${f.reason}`).join('\n')}\n`
      : ''

  return `You are a senior engineer planning the implementation of a user story.

STORY: ${groundingContext.storyTitle}
STORY ID: ${groundingContext.storyId}

ACCEPTANCE CRITERIA:
${acList || '  (none)'}

SUBTASKS:
${subtaskList || '  (none)'}

CODEBASE CONTEXT:
Relevant files:
  ${filesSection}

Relevant functions:
${functionsSection || '  (none)'}

Existing patterns: ${groundingContext.existingPatterns.join(', ') || 'none'}
${failureSection}
IMPORTANT: All file paths MUST be full monorepo-relative paths from the repo root.
For example: "apps/api/notifications-server/src/index.ts" NOT "src/index.ts".
Test files go under the same package, e.g.: "apps/api/notifications-server/src/__tests__/health.test.ts".

POSTCONDITIONS your plan MUST satisfy:
1. files_planned: filesToCreate or filesToModify must be non-empty
2. tests_planned: testFilesToCreate must be non-empty (always write tests)
3. approach_documented: approach must be non-empty string

AVAILABLE TOOLS (respond with JSON):
- query_kb: { tool: "query_kb", args: { query: string } }
- search_codebase: { tool: "search_codebase", args: { pattern: string } }
- read_file: { tool: "read_file", args: { path: string } }
- list_directory: { tool: "list_directory", args: { path: string } }
- complete: { tool: "complete", args: { plan: { approach, filesToCreate, filesToModify, testFilesToCreate, estimatedSubtasks, risks } } }

Respond ONLY with a valid JSON tool call.`
}

/**
 * Parses a tool call from the LLM response.
 * Uses multiple extraction strategies to handle various LLM output formats.
 */
export function parseToolCall(
  response: string,
): { tool: string; args: Record<string, unknown> } | null {
  try {
    const responseContent = response.trim()
    const candidates: string[] = []

    // Strategy 1: Extract from markdown code blocks (```json ... ``` or ``` ... ```)
    const codeBlockMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      candidates.push(codeBlockMatch[1].trim())
    }

    // Strategy 2: Find any JSON object with balanced braces (handles nested JSON correctly)
    const firstBrace = responseContent.indexOf('{')
    if (firstBrace !== -1) {
      let braceCount = 0
      let lastBrace = firstBrace
      for (let i = firstBrace; i < responseContent.length; i++) {
        if (responseContent[i] === '{') braceCount++
        if (responseContent[i] === '}') {
          braceCount--
          if (braceCount === 0) {
            lastBrace = i
            break
          }
        }
      }
      candidates.push(responseContent.slice(firstBrace, lastBrace + 1))
    }

    // Strategy 3: Try the whole response as JSON
    candidates.push(responseContent)

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate)
        if (parsed && typeof parsed.tool === 'string') {
          return parsed as { tool: string; args: Record<string, unknown> }
        }
      } catch {
        // try next candidate
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Checks postconditions for the implementation plan.
 */
export function checkPlannerPostconditions(plan: ImplementationPlan): PostconditionResult {
  const failures: PostconditionResult['failures'] = []

  if (plan.filesToCreate.length === 0 && plan.filesToModify.length === 0) {
    failures.push({
      check: 'files_planned',
      reason: 'Plan must specify at least one file to create or modify',
    })
  }

  if (plan.testFilesToCreate.length === 0) {
    failures.push({
      check: 'tests_planned',
      reason: 'Plan must specify at least one test file to create',
    })
  }

  if (!plan.approach || plan.approach.trim().length === 0) {
    failures.push({
      check: 'approach_documented',
      reason: 'Plan must document the implementation approach',
    })
  }

  return {
    passed: failures.length === 0,
    failures,
    evidence: {
      filesPlanned: `${plan.filesToCreate.length} to create, ${plan.filesToModify.length} to modify`,
      testsPlanned: `${plan.testFilesToCreate.length} test files`,
      approach: plan.approach?.slice(0, 100) ?? '',
    },
  }
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

const defaultLlmAdapter: LlmAdapterFn = async _messages => ({
  content: JSON.stringify({
    tool: 'complete',
    args: {
      plan: {
        approach: 'No-op stub plan',
        filesToCreate: ['src/stub.ts'],
        filesToModify: [],
        testFilesToCreate: ['src/stub.test.ts'],
        estimatedSubtasks: [],
        risks: [],
      },
    },
  }),
  inputTokens: 0,
  outputTokens: 0,
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the implementation_planner LangGraph node.
 */
export function createImplementationPlannerNode(config: ImplementationPlannerConfig = {}) {
  const maxInternalIterations = config.maxInternalIterations ?? 3
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter

  return async (state: DevImplementV2State): Promise<Partial<DevImplementV2State>> => {
    const { storyGroundingContext } = state

    logger.info(`implementation_planner: starting`, {
      storyId: state.storyId,
      hasGrounding: !!storyGroundingContext,
      maxInternalIterations,
    })

    if (!storyGroundingContext) {
      logger.warn('implementation_planner: no grounding context — using empty context')
    }

    const grounding: StoryGroundingContext = storyGroundingContext ?? {
      storyId: state.storyId,
      storyTitle: state.storyId,
      acceptanceCriteria: [],
      subtasks: [],
      relevantFiles: [],
      relevantFunctions: [],
      existingPatterns: [],
      relatedStories: [],
    }

    const allTokenUsage: TokenUsage[] = []
    let plan: ImplementationPlan | null = null
    let iterationsUsed = 0

    // Build initial system prompt and conversation history
    const systemPrompt = buildPlannerPrompt(grounding, [])
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ]

    for (let iteration = 0; iteration < maxInternalIterations; iteration++) {
      iterationsUsed = iteration + 1
      let llmResponse: { content: string; inputTokens: number; outputTokens: number }
      try {
        llmResponse = await llmAdapter(messages)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`implementation_planner: LLM threw on iteration ${iteration}`, { error: msg })
        allTokenUsage.push({ nodeId: 'implementation_planner', inputTokens: 0, outputTokens: 0 })
        break
      }

      allTokenUsage.push({
        nodeId: 'implementation_planner',
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
      })

      // Add assistant response to conversation
      messages.push({ role: 'assistant', content: llmResponse.content })

      // Parse tool call - robust extraction for various LLM output formats
      const parsed = parseToolCall(llmResponse.content)

      if (!parsed) {
        logger.warn(`implementation_planner: failed to parse response on iteration ${iteration}`, {
          responsePreview: llmResponse.content.slice(0, 200),
        })
        messages.push({
          role: 'user',
          content: 'ERROR: Response was not valid JSON. Respond ONLY with a JSON tool call.',
        })
        continue
      }

      logger.debug(`implementation_planner: parsed tool=${parsed.tool} on iteration ${iteration}`)

      // Handle 'complete' tool - terminal
      if (parsed.tool === 'complete' && parsed.args['plan']) {
        const rawPlan = parsed.args['plan'] as Record<string, unknown>
        plan = {
          approach: String(rawPlan['approach'] ?? ''),
          filesToCreate: (rawPlan['filesToCreate'] as string[] | undefined) ?? [],
          filesToModify: (rawPlan['filesToModify'] as string[] | undefined) ?? [],
          testFilesToCreate: (rawPlan['testFilesToCreate'] as string[] | undefined) ?? [],
          risks: (rawPlan['risks'] as string[] | undefined) ?? [],
        }

        const postconditionResult = checkPlannerPostconditions(plan!)
        if (postconditionResult.passed) {
          logger.info('implementation_planner: postconditions passed', { iteration })
          break
        }
        // Postconditions failed - tell the LLM to fix the plan
        const failures = postconditionResult.failures
          .map(f => `[${f.check}] ${f.reason}`)
          .join(', ')
        messages.push({
          role: 'user',
          content: `POSTCONDITION FAILED: ${failures}. Fix the plan and call complete again.`,
        })
        plan = null
        continue
      }

      // Handle tool calls with actual execution
      let toolResult: string
      try {
        const { tool, args } = parsed
        if (tool === 'query_kb' && config.queryKb) {
          toolResult = await config.queryKb(String(args['query'] ?? ''))
        } else if (tool === 'search_codebase' && config.searchCodebase) {
          toolResult = await config.searchCodebase(String(args['pattern'] ?? ''))
        } else if (tool === 'read_file' && config.readFile) {
          toolResult = await config.readFile(String(args['path'] ?? ''))
        } else if (tool === 'list_directory' && config.listDirectory) {
          toolResult = await config.listDirectory(String(args['path'] ?? '.'))
        } else {
          toolResult = `Tool '${tool}' not available or not configured. Available: complete, query_kb, search_codebase, read_file, list_directory.`
        }
      } catch (err) {
        toolResult = `ERROR: ${err instanceof Error ? err.message : String(err)}`
      }

      // Add tool result as user message for next iteration
      messages.push({
        role: 'user',
        content: `Tool result for ${parsed.tool}: ${toolResult.slice(0, 5000)}`,
      })
      logger.info(`implementation_planner: executed tool=${parsed.tool}`, { iteration })
    }

    // Use stub plan if agent didn't produce one
    if (!plan) {
      plan = {
        approach: 'Stub plan (planner could not produce valid plan)',
        filesToCreate: ['src/stub.ts'],
        filesToModify: [],
        testFilesToCreate: ['src/stub.test.ts'],
        risks: ['Plan generation failed after max iterations'],
      }
    }

    const finalPostconditions = checkPlannerPostconditions(plan)

    logger.info('implementation_planner: complete', {
      storyId: state.storyId,
      passed: finalPostconditions.passed,
      iterations: iterationsUsed,
    })

    return {
      implementationPlan: plan,
      postconditionResult: finalPostconditions,
      tokenUsage: allTokenUsage,
      devImplementV2Phase: 'implementation_executor',
    }
  }
}

/**
 * implementation_executor Node (dev-implement-v2) — AGENTIC (LLM, ReAct loop)
 *
 * Executes the implementation plan. Test-running lives INSIDE this node's tool
 * belt — the agent decides WHEN to run tests, interprets the output, and either
 * fixes the issue within its internal ReAct loop or calls 'stuck' with a specific
 * diagnosis.
 *
 * Terminal calls:
 *   complete(outcome) — tests passed, work is done
 *   stuck(diagnosis)  — cannot proceed, explains why
 *
 * The graph does NOT retry on 'stuck' — it fails clean and lets the escalation
 * chain (Sonnet → Opus → human) handle tier changes.
 *
 * Internal ReAct loop bounded by maxInternalIterations (default 5).
 * Token usage tracked per iteration.
 */

import { logger } from '@repo/logger'
import type {
  ImplementationPlan,
  StoryGroundingContext,
  ExecutorOutcome,
  TokenUsage,
  DevImplementV2State,
} from '../../state/dev-implement-v2-state.js'

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

export type ReadFileFn = (path: string) => Promise<string>
export type WriteFileFn = (path: string, content: string) => Promise<void>
export type SearchCodebaseFn = (pattern: string) => Promise<string>
export type RunTestsFn = (
  filter: string,
) => Promise<{ passed: boolean; output: string; failures: string[] }>
export type QueryKbFn = (topic: string) => Promise<string>

// ============================================================================
// Config
// ============================================================================

export type ImplementationExecutorConfig = {
  llmAdapter?: LlmAdapterFn
  readFile?: ReadFileFn
  writeFile?: WriteFileFn
  searchCodebase?: SearchCodebaseFn
  runTests?: RunTestsFn
  queryKb?: QueryKbFn
  maxInternalIterations?: number
}

// ============================================================================
// Tool Schema Types
// ============================================================================

export type ToolDefinition = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Builds the executor system prompt for the LLM.
 */
export function buildExecutorSystemPrompt(
  plan: ImplementationPlan,
  grounding: StoryGroundingContext,
): string {
  return `You are a senior engineer implementing a user story.

STORY: ${grounding.storyTitle}
APPROACH: ${plan.approach}

FILES TO CREATE: ${plan.filesToCreate.join(', ') || 'none'}
FILES TO MODIFY: ${plan.filesToModify.join(', ') || 'none'}
TEST FILES TO CREATE: ${plan.testFilesToCreate.join(', ') || 'none'}
RISKS: ${plan.risks.join(', ') || 'none'}

ACCEPTANCE CRITERIA:
${grounding.acceptanceCriteria.map((ac, i) => `  ${i}. ${ac}`).join('\n') || '  (none)'}

AVAILABLE TOOLS (call one per response as JSON):
- read_file:       { "tool": "read_file", "args": { "path": "<string>" } }
- write_file:      { "tool": "write_file", "args": { "path": "<string>", "content": "<string>" } }
- search_codebase: { "tool": "search_codebase", "args": { "pattern": "<string>" } }
- run_tests:       { "tool": "run_tests", "args": { "filter": "<string>" } }
- query_kb:        { "tool": "query_kb", "args": { "topic": "<string>" } }
- complete:        { "tool": "complete", "args": { "filesCreated": [], "filesModified": [], "testsRan": true, "testsPassed": true, "testOutput": "<string>", "acVerification": [{ "acIndex": 0, "acText": "<string>", "verified": true, "evidence": "<string>" }] } }
- stuck:           { "tool": "stuck", "args": { "diagnosis": "<specific reason>", "filesCreated": [], "filesModified": [] } }

WORKFLOW:
1. Read relevant files for context
2. Implement the changes (write_file)
3. Run tests to verify (run_tests)
4. Interpret output — fix within remaining iterations if possible
5. Call complete when tests pass, or stuck with a specific diagnosis if you cannot proceed

You MUST call complete or stuck before running out of iterations.
Respond ONLY with valid JSON.`
}

/**
 * Returns the tool definitions for the executor's tool belt.
 */
export function buildExecutorTools(): ToolDefinition[] {
  return [
    {
      name: 'read_file',
      description: 'Read file contents from the codebase',
      parameters: { path: 'string' },
    },
    {
      name: 'write_file',
      description: 'Write or overwrite a file',
      parameters: { path: 'string', content: 'string' },
    },
    {
      name: 'search_codebase',
      description: 'Search codebase for a pattern',
      parameters: { pattern: 'string' },
    },
    {
      name: 'run_tests',
      description: 'Run tests with a filter',
      parameters: { filter: 'string' },
    },
    {
      name: 'query_kb',
      description: 'Query the knowledge base for context',
      parameters: { topic: 'string' },
    },
    {
      name: 'complete',
      description: 'Mark implementation complete — tests have passed',
      parameters: {
        filesCreated: 'string[]',
        filesModified: 'string[]',
        testsRan: 'boolean',
        testsPassed: 'boolean',
        testOutput: 'string',
        acVerification: 'array',
      },
    },
    {
      name: 'stuck',
      description: 'Report a blocker with specific diagnosis',
      parameters: { diagnosis: 'string', filesCreated: 'string[]', filesModified: 'string[]' },
    },
  ]
}

/**
 * Parses a tool call from the LLM response.
 */
export function parseExecutorToolCall(
  response: string,
): { tool: string; args: Record<string, unknown> } | null {
  try {
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim()
    const parsed = JSON.parse(jsonStr)
    if (parsed && typeof parsed.tool === 'string')
      return parsed as { tool: string; args: Record<string, unknown> }
    return null
  } catch {
    return null
  }
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

const defaultLlmAdapter: LlmAdapterFn = async _messages => ({
  content: JSON.stringify({
    tool: 'complete',
    args: {
      filesCreated: ['src/stub.ts', 'src/stub.test.ts'],
      filesModified: [],
      testsRan: true,
      testsPassed: true,
      testOutput: 'All tests pass (no-op)',
      acVerification: [],
    },
  }),
  inputTokens: 0,
  outputTokens: 0,
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the implementation_executor LangGraph node.
 *
 * The agent owns test-running — run_tests is in the tool belt.
 * Exits via 'complete' (tests passed) or 'stuck' (diagnosis attached).
 */
export function createImplementationExecutorNode(config: ImplementationExecutorConfig = {}) {
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter
  const maxInternalIterations = config.maxInternalIterations ?? 5

  return async (state: DevImplementV2State): Promise<Partial<DevImplementV2State>> => {
    logger.info(`implementation_executor: starting`, { storyId: state.storyId })

    const plan = state.implementationPlan
    const grounding = state.storyGroundingContext

    if (!plan) {
      logger.warn('implementation_executor: no implementation plan in state')
      return {
        errors: ['implementation_executor: no implementation plan'],
        devImplementV2Phase: 'error',
      }
    }

    const groundingCtx: StoryGroundingContext = grounding ?? {
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
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: buildExecutorSystemPrompt(plan, groundingCtx) },
    ]

    let outcome: ExecutorOutcome | null = null

    for (let i = 0; i < maxInternalIterations; i++) {
      let llmResponse: { content: string; inputTokens: number; outputTokens: number }

      try {
        llmResponse = await llmAdapter(messages)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`implementation_executor: LLM threw on iteration ${i}`, { error: msg })
        allTokenUsage.push({ nodeId: 'implementation_executor', inputTokens: 0, outputTokens: 0 })
        outcome = {
          verdict: 'stuck',
          filesCreated: [],
          filesModified: [],
          testsRan: false,
          testsPassed: false,
          testOutput: '',
          diagnosis: `LLM threw: ${msg}`,
          acVerification: [],
        }
        break
      }

      allTokenUsage.push({
        nodeId: 'implementation_executor',
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
      })

      messages.push({ role: 'assistant', content: llmResponse.content })

      const toolCall = parseExecutorToolCall(llmResponse.content)
      if (!toolCall) {
        logger.warn(`implementation_executor: failed to parse tool call on iteration ${i}`)
        messages.push({
          role: 'user',
          content: 'ERROR: Response was not valid JSON. Respond ONLY with a JSON tool call.',
        })
        continue
      }

      const { tool, args } = toolCall

      // ── Terminal tools ────────────────────────────────────────────────────

      if (tool === 'complete') {
        outcome = {
          verdict: 'complete',
          filesCreated: (args['filesCreated'] as string[] | undefined) ?? [],
          filesModified: (args['filesModified'] as string[] | undefined) ?? [],
          testsRan: Boolean(args['testsRan']),
          testsPassed: Boolean(args['testsPassed']),
          testOutput: String(args['testOutput'] ?? ''),
          diagnosis: '',
          acVerification:
            (args['acVerification'] as ExecutorOutcome['acVerification'] | undefined) ?? [],
        }
        logger.info('implementation_executor: agent called complete', { storyId: state.storyId })
        break
      }

      if (tool === 'stuck') {
        outcome = {
          verdict: 'stuck',
          filesCreated: (args['filesCreated'] as string[] | undefined) ?? [],
          filesModified: (args['filesModified'] as string[] | undefined) ?? [],
          testsRan: false,
          testsPassed: false,
          testOutput: '',
          diagnosis: String(args['diagnosis'] ?? 'Agent reported stuck without diagnosis'),
          acVerification: [],
        }
        logger.warn('implementation_executor: agent called stuck', {
          diagnosis: outcome.diagnosis,
        })
        break
      }

      // ── Tool execution ────────────────────────────────────────────────────

      let toolResult: string
      try {
        if (tool === 'read_file' && config.readFile) {
          toolResult = await config.readFile(String(args['path'] ?? ''))
        } else if (tool === 'write_file' && config.writeFile) {
          await config.writeFile(String(args['path'] ?? ''), String(args['content'] ?? ''))
          toolResult = `Written: ${args['path']}`
        } else if (tool === 'search_codebase' && config.searchCodebase) {
          toolResult = await config.searchCodebase(String(args['pattern'] ?? ''))
        } else if (tool === 'run_tests' && config.runTests) {
          const testRes = await config.runTests(String(args['filter'] ?? ''))
          toolResult = JSON.stringify(testRes)
        } else if (tool === 'query_kb' && config.queryKb) {
          toolResult = await config.queryKb(String(args['topic'] ?? ''))
        } else {
          toolResult = `Tool '${tool}' executed (no-op adapter)`
        }
      } catch (err) {
        toolResult = `ERROR: ${err instanceof Error ? err.message : String(err)}`
      }

      messages.push({ role: 'user', content: `Tool result for ${tool}: ${toolResult}` })
    }

    // ── Exhaustion guard ──────────────────────────────────────────────────────

    if (!outcome) {
      outcome = {
        verdict: 'stuck',
        filesCreated: [],
        filesModified: [],
        testsRan: false,
        testsPassed: false,
        testOutput: '',
        diagnosis: 'Agent exhausted all iterations without calling complete or stuck',
        acVerification: [],
      }
      logger.warn('implementation_executor: exhausted iterations without terminal call')
    }

    const nextPhase: DevImplementV2State['devImplementV2Phase'] =
      outcome.verdict === 'complete' ? 'evidence_collector' : 'error'

    return {
      executorOutcome: outcome,
      tokenUsage: allTokenUsage,
      devImplementV2Phase: nextPhase,
      ...(outcome.verdict === 'stuck'
        ? { errors: [`implementation_executor stuck: ${outcome.diagnosis}`] }
        : {}),
    }
  }
}

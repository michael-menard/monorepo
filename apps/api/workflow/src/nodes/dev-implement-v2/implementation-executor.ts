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
  RetryFeedback,
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
export type ListDirectoryFn = (path: string) => Promise<string>

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
  listDirectory?: ListDirectoryFn
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
 * When retryFeedback is provided, the prompt includes explicit retry guidance
 * with the specific findings/failures from the prior attempt.
 */
export function buildExecutorSystemPrompt(
  plan: ImplementationPlan,
  grounding: StoryGroundingContext,
  retryFeedback?: RetryFeedback | null,
): string {
  // HEAL: build retry feedback block if this is a retry attempt
  let retryBlock = ''
  if (retryFeedback) {
    const source = retryFeedback.source
    if (source === 'review' && retryFeedback.reviewFindings.length > 0) {
      const findingsText = retryFeedback.reviewFindings
        .slice(0, 10)
        .map(
          (f, i) =>
            `${i + 1}. [${f.severity}] ${f.file}${f.line ? ':' + f.line : ''}\n   ${f.description}${f.suggestion ? '\n   Suggestion: ' + f.suggestion : ''}\n   Evidence: ${f.evidence}`,
        )
        .join('\n\n')
      retryBlock = `

RETRY MODE — Attempt ${retryFeedback.attempt} — A previous implementation was REJECTED by code review.

CODE REVIEW FINDINGS — you MUST fix ALL of these:
${findingsText}

IMPORTANT:
- Read the files mentioned in the findings FIRST
- Make TARGETED fixes — do NOT rewrite files from scratch
- Address every finding listed above
- Run tests after fixing to verify
- Call complete when all issues are resolved, or stuck if you cannot fix them
`
    } else if (source === 'qa' && retryFeedback.failedACs.length > 0) {
      const failedText = retryFeedback.failedACs
        .slice(0, 10)
        .map(
          (f, i) =>
            `${i + 1}. AC${f.acIndex}: ${f.acText}\n   Verdict: ${f.verdict}\n   Evidence: ${f.evidence}${f.testOutput ? '\n   Test output: ' + f.testOutput.slice(0, 200) : ''}`,
        )
        .join('\n\n')
      retryBlock = `

RETRY MODE — Attempt ${retryFeedback.attempt} — A previous implementation FAILED QA verification.

FAILED ACCEPTANCE CRITERIA — these must pass:
${failedText}

IMPORTANT:
- Focus on fixing the specific ACs that failed
- Do NOT rewrite unrelated code
- Run tests after fixing to verify each AC
- Call complete when all failed ACs pass, or stuck if you cannot fix them
`
    }
  }

  return `You are a senior engineer implementing a user story.
${retryBlock}
STORY: ${grounding.storyTitle}
APPROACH: ${plan.approach}

FILES TO CREATE: ${Array.isArray(plan.filesToCreate) ? plan.filesToCreate.join(', ') : plan.filesToCreate || 'none'}
FILES TO MODIFY: ${Array.isArray(plan.filesToModify) ? plan.filesToModify.join(', ') : plan.filesToModify || 'none'}
TEST FILES TO CREATE: ${Array.isArray(plan.testFilesToCreate) ? plan.testFilesToCreate.join(', ') : plan.testFilesToCreate || 'none'}
RISKS: ${Array.isArray(plan.risks) ? plan.risks.join(', ') : plan.risks || 'none'}

ACCEPTANCE CRITERIA:
${Array.isArray(grounding.acceptanceCriteria) ? grounding.acceptanceCriteria.map((ac, i) => `  ${i}. ${ac}`).join('\n') : '  (none)'}

AVAILABLE TOOLS (call one per response as JSON):
- read_file:       { "tool": "read_file", "args": { "path": "<string>" } }
- write_file:      { "tool": "write_file", "args": { "path": "<string>", "content": "<string>" } }
- search_codebase: { "tool": "search_codebase", "args": { "pattern": "<string>" } }
- list_directory:  { "tool": "list_directory", "args": { "path": "<string>" } }
- run_tests:       { "tool": "run_tests", "args": { "filter": "<string>" } }
- query_kb:        { "tool": "query_kb", "args": { "topic": "<string>" } }
- complete:        { "tool": "complete", "args": { "filesCreated": [], "filesModified": [], "testsRan": true, "testsPassed": true, "testOutput": "<string>", "acVerification": [{ "acIndex": 0, "acText": "<string>", "verified": true, "evidence": "<string>" }] } }
- stuck:           { "tool": "stuck", "args": { "diagnosis": "<specific reason>", "filesCreated": [], "filesModified": [] } }

IMPORTANT: All file paths MUST be full monorepo-relative paths from the repo root.
For example: "apps/api/notifications-server/src/index.ts" NOT "src/index.ts".
The run_tests filter should match the package directory, e.g.: "apps/api/notifications-server".
If the package doesn't exist yet (new scaffold), skip run_tests and call complete with testsRan: false.

WORKFLOW:
1. Read relevant files for context if needed
2. Implement all files from the plan (write_file) using full monorepo-relative paths
3. For new packages: call complete with testsRan: false once all files are written
4. For existing packages: run_tests then call complete or stuck based on result

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
      name: 'list_directory',
      description: 'List contents of a directory to explore codebase structure',
      parameters: { path: 'string' },
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
 * Uses multiple extraction strategies to handle various LLM output formats.
 */
export function parseExecutorToolCall(
  response: string,
): { tool: string; args: Record<string, unknown> } | null {
  try {
    let responseContent = response.trim()

    // Strip <think>...</think> blocks that some models produce (Qwen, DeepSeek)
    responseContent = responseContent.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

    // Try multiple JSON extraction strategies
    let jsonStr: string | null = null

    // Collect candidate strings in priority order, try parsing each in turn
    const candidates: string[] = []

    // Strategy 1: Extract from markdown code blocks (```json ... ``` or ``` ... ```)
    const codeBlockMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      candidates.push(codeBlockMatch[1].trim())
    }

    // Strategy 2: Find any JSON object with balanced braces (most reliable for nested JSON)
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

    let parsed: unknown = null
    for (const candidate of candidates) {
      try {
        const p = JSON.parse(candidate)
        if (p && typeof p.tool === 'string') {
          parsed = p
          break
        }
      } catch {
        // try next candidate
      }
    }
    if (parsed && typeof (parsed as Record<string, unknown>).tool === 'string')
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
    // HEAL: read retryFeedback from state (null on first attempt)
    const retryFeedback = state.retryFeedback ?? null
    if (retryFeedback) {
      logger.info('implementation_executor: retry mode', {
        storyId: state.storyId,
        source: retryFeedback.source,
        attempt: retryFeedback.attempt,
        findingCount:
          retryFeedback.source === 'review'
            ? retryFeedback.reviewFindings.length
            : retryFeedback.failedACs.length,
      })
    }
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: buildExecutorSystemPrompt(plan, groundingCtx, retryFeedback) },
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
        logger.warn(`implementation_executor: failed to parse tool call on iteration ${i}`, {
          responsePreview: llmResponse.content.slice(0, 500),
        })
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
        } else if (tool === 'list_directory' && config.listDirectory) {
          toolResult = await config.listDirectory(String(args['path'] ?? '.'))
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

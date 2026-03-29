/**
 * test_strategy_agent Node (qa-verify-v2) — AGENTIC (LLM)
 *
 * Receives parsedACs + implementation evidence from dev-implement.
 * Decides which test files to run, filter, E2E patterns.
 * Documents which ACs need manual review.
 *
 * Postcondition: unitTestFilter non-empty if unit ACs exist.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  ParsedAC,
  TestStrategy,
  TokenUsage,
  QAVerifyV2State,
} from '../../state/qa-verify-v2-state.js'

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

// ============================================================================
// Config
// ============================================================================

export type TestStrategyAgentConfig = {
  llmAdapter?: LlmAdapterFn
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Builds the test strategy prompt.
 */
export function buildStrategyPrompt(parsedACs: ParsedAC[], storyId: string): string {
  const acList = parsedACs
    .map(
      ac =>
        `  ${ac.index}. [${ac.testType}] ${ac.testableAssertion}\n     hints: ${ac.testHints.join(', ') || 'none'}`,
    )
    .join('\n')

  const unitACs = parsedACs.filter(a => a.testType === 'unit')
  const e2eACs = parsedACs.filter(a => a.testType === 'e2e')
  const manualACs = parsedACs.filter(a => a.testType === 'manual')

  return `You are a QA engineer designing a test execution strategy.

STORY: ${storyId}

ACCEPTANCE CRITERIA (${parsedACs.length} total):
${acList || '  (none)'}

SUMMARY: ${unitACs.length} unit, ${e2eACs.length} e2e, ${manualACs.length} manual

Design a test strategy:
- unitTestFilter: pnpm vitest filter string (e.g. "src/auth" or specific test file path)
  - MUST be non-empty if unit ACs exist
  - Use story ID or relevant file names from AC hints
- e2eTestPattern: playwright pattern (e.g. "auth/registration.spec.ts")
  - Empty string if no e2e ACs
- manualCheckItems: list of manual verification steps for manual ACs
- skipReasons: why any AC types were skipped

Respond with JSON:
{
  "unitTestFilter": "...",
  "e2eTestPattern": "...",
  "manualCheckItems": ["..."],
  "skipReasons": ["..."]
}

Return ONLY valid JSON.`
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

const defaultLlmAdapter: LlmAdapterFn = async _messages => ({
  content: JSON.stringify({
    unitTestFilter: 'src/',
    e2eTestPattern: '',
    manualCheckItems: [],
    skipReasons: ['no-op adapter'],
  }),
  inputTokens: 0,
  outputTokens: 0,
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the test_strategy_agent LangGraph node.
 */
export function createTestStrategyAgentNode(config: TestStrategyAgentConfig = {}) {
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter

  return async (state: QAVerifyV2State): Promise<Partial<QAVerifyV2State>> => {
    const { storyId, parsedACs } = state

    logger.info(`test_strategy_agent: starting for story ${storyId}`, {
      acCount: parsedACs.length,
    })

    const allTokenUsage: TokenUsage[] = []

    const prompt = buildStrategyPrompt(parsedACs, storyId)
    const messages = [{ role: 'system' as const, content: prompt }]

    let testStrategy: TestStrategy = {
      unitTestFilter: '',
      e2eTestPattern: '',
      manualCheckItems: [],
      skipReasons: [],
    }

    try {
      const llmResponse = await llmAdapter(messages)
      allTokenUsage.push({
        nodeId: 'test_strategy_agent',
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
      })

      try {
        const jsonMatch = llmResponse.content.match(/```(?:json)?\s*([\s\S]*?)```/)
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmResponse.content.trim()
        const parsed = JSON.parse(jsonStr)
        testStrategy = {
          unitTestFilter: String(parsed['unitTestFilter'] ?? ''),
          e2eTestPattern: String(parsed['e2eTestPattern'] ?? ''),
          manualCheckItems: (parsed['manualCheckItems'] as string[] | undefined) ?? [],
          skipReasons: (parsed['skipReasons'] as string[] | undefined) ?? [],
        }
      } catch {
        logger.warn('test_strategy_agent: failed to parse LLM response')
        testStrategy.unitTestFilter = storyId
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`test_strategy_agent: LLM threw`, { error: msg })
      allTokenUsage.push({ nodeId: 'test_strategy_agent', inputTokens: 0, outputTokens: 0 })
      testStrategy.unitTestFilter = storyId
    }

    // Postcondition: ensure unitTestFilter is set if unit ACs exist
    const hasUnitACs = parsedACs.some(a => a.testType === 'unit')
    if (hasUnitACs && !testStrategy.unitTestFilter) {
      testStrategy.unitTestFilter = storyId
    }

    logger.info('test_strategy_agent: complete', {
      storyId,
      unitTestFilter: testStrategy.unitTestFilter,
      e2eTestPattern: testStrategy.e2eTestPattern,
      manualItems: testStrategy.manualCheckItems.length,
    })

    return {
      testStrategy,
      tokenUsage: allTokenUsage,
      qaVerifyV2Phase: 'test_executor',
    }
  }
}

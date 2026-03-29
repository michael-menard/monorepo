/**
 * result_interpreter Node (qa-verify-v2) — AGENTIC (LLM)
 *
 * Receives parsedACs, testStrategy, unitTestResult, e2eTestResult.
 * Maps test results back to AC indices.
 * For each AC: determines verdict (pass/fail/skip/manual) with evidence.
 *
 * Postcondition: every parsedAC has a corresponding ACVerificationResult.
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  ParsedAC,
  ACVerificationResult,
  TestStrategy,
  TokenUsage,
  QAVerifyV2State,
} from '../../state/qa-verify-v2-state.js'
import type { TestRunResult } from '../../state/dev-implement-v2-state.js'

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

export type ResultInterpreterConfig = {
  llmAdapter?: LlmAdapterFn
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Builds the result interpreter prompt.
 */
export function buildInterpreterPrompt(
  parsedACs: ParsedAC[],
  unitTestResult: TestRunResult | null,
  e2eTestResult: TestRunResult | null,
  previousFailures: Array<{ check: string; reason: string }> = [],
): string {
  const acList = parsedACs
    .map(ac => `  ${ac.index}. [${ac.testType}] ${ac.testableAssertion}`)
    .join('\n')

  const unitSummary = unitTestResult
    ? `${unitTestResult.passedCount} passed, ${unitTestResult.failedCount} failed`
    : 'not run'

  const unitFailures =
    unitTestResult?.failures
      .slice(0, 5)
      .map(f => `  - ${f.testName}: ${f.error}`)
      .join('\n') ?? ''

  const e2eSummary = e2eTestResult
    ? `${e2eTestResult.passedCount} passed, ${e2eTestResult.failedCount} failed`
    : 'not run'

  const failureSection =
    previousFailures.length > 0
      ? `\nPREVIOUS ATTEMPT FAILURES:\n${previousFailures.map(f => `  - [${f.check}] ${f.reason}`).join('\n')}\n`
      : ''

  return `You are a QA engineer mapping test results to acceptance criteria.

ACCEPTANCE CRITERIA:
${acList || '  (none)'}

UNIT TEST RESULTS: ${unitSummary}
${unitFailures ? `Failures:\n${unitFailures}` : ''}

E2E TEST RESULTS: ${e2eSummary}
${failureSection}
For each AC, determine:
- verdict: "pass" (test covers and passes), "fail" (test exists and fails), "skip" (not testable or infrastructure issue), "manual" (needs manual verification)
- evidence: test name, output snippet, or manual verification step
${
  parsedACs.some(a => a.testType === 'manual')
    ? '- For manual ACs: provide a specific, actionable manual checklist item'
    : ''
}

POSTCONDITION: every AC index must have a result.

Respond with JSON:
{
  "results": [
    { "acIndex": 0, "acText": "...", "verdict": "pass|fail|skip|manual", "evidence": "..." }
  ]
}

Return ONLY valid JSON.`
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

const defaultLlmAdapter: LlmAdapterFn = async _messages => ({
  content: JSON.stringify({ results: [] }),
  inputTokens: 0,
  outputTokens: 0,
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the result_interpreter LangGraph node.
 */
export function createResultInterpreterNode(config: ResultInterpreterConfig = {}) {
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter

  return async (state: QAVerifyV2State): Promise<Partial<QAVerifyV2State>> => {
    const { storyId, parsedACs, testStrategy, unitTestResult, e2eTestResult, retryCount } = state

    logger.info(`result_interpreter: starting for story ${storyId}`, {
      acCount: parsedACs.length,
      retryCount,
    })

    const allTokenUsage: TokenUsage[] = []
    let acVerificationResults: ACVerificationResult[] = []

    const previousFailures: Array<{ check: string; reason: string }> = []

    const prompt = buildInterpreterPrompt(
      parsedACs,
      unitTestResult,
      e2eTestResult,
      previousFailures,
    )
    const messages = [{ role: 'system' as const, content: prompt }]

    try {
      const llmResponse = await llmAdapter(messages)
      allTokenUsage.push({
        nodeId: 'result_interpreter',
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
      })

      try {
        const jsonMatch = llmResponse.content.match(/```(?:json)?\s*([\s\S]*?)```/)
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmResponse.content.trim()
        const parsed = JSON.parse(jsonStr)
        acVerificationResults = (
          (parsed['results'] as Array<Record<string, unknown>> | undefined) ?? []
        ).map(r => ({
          acIndex: Number(r['acIndex'] ?? 0),
          acText: String(r['acText'] ?? ''),
          verdict: (r['verdict'] as ACVerificationResult['verdict']) ?? 'skip',
          evidence: String(r['evidence'] ?? ''),
          testOutput: r['testOutput'] as string | undefined,
        }))
      } catch {
        logger.warn('result_interpreter: failed to parse LLM response')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`result_interpreter: LLM threw`, { error: msg })
      allTokenUsage.push({ nodeId: 'result_interpreter', inputTokens: 0, outputTokens: 0 })
    }

    // Ensure every parsedAC has a result (fill in skips for missing)
    const coveredIndices = new Set(acVerificationResults.map(r => r.acIndex))
    for (const ac of parsedACs) {
      if (!coveredIndices.has(ac.index)) {
        acVerificationResults.push({
          acIndex: ac.index,
          acText: ac.original,
          verdict: ac.testType === 'manual' ? 'manual' : 'skip',
          evidence:
            ac.testType === 'manual'
              ? 'Requires manual verification'
              : 'Not covered by automated tests',
        })
      }
    }

    logger.info('result_interpreter: complete', {
      storyId,
      resultsCount: acVerificationResults.length,
      passed: acVerificationResults.filter(r => r.verdict === 'pass').length,
      failed: acVerificationResults.filter(r => r.verdict === 'fail').length,
    })

    return {
      acVerificationResults,
      tokenUsage: allTokenUsage,
      qaVerifyV2Phase: 'evidence_assembler',
    }
  }
}

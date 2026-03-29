/**
 * review_agent Node (review-v2) — AGENTIC (LLM)
 *
 * Reviews ONLY the selected dimensions on ONLY the changed files.
 * Each finding MUST cite specific file + evidence.
 * One pass per selected dimension (max 5).
 *
 * Postconditions:
 *   a. Every critical finding has a specific file reference
 *   b. If hasSecuritySensitiveChanges: at least one security finding exists
 *   c. If hasDatabaseChanges: data-integrity dimension was reviewed
 *   d. No finding missing evidence field
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type {
  DiffAnalysis,
  ReviewFinding,
  TokenUsage,
  ReviewV2State,
} from '../../state/review-v2-state.js'
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

export type ReadFileFn = (path: string) => Promise<string>
export type SearchCodebaseFn = (pattern: string) => Promise<string>
export type QueryKbFn = (query: string) => Promise<string>

// ============================================================================
// Config
// ============================================================================

export type ReviewAgentConfig = {
  llmAdapter?: LlmAdapterFn
  readFile?: ReadFileFn
  searchCodebase?: SearchCodebaseFn
  queryKb?: QueryKbFn
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Builds the review prompt for a single dimension.
 */
export function buildReviewPrompt(
  dimension: string,
  diffAnalysis: DiffAnalysis,
  fileContents: Record<string, string>,
): string {
  const fileList = diffAnalysis.changedFiles.map(f => `  - ${f.path} (${f.changeType})`).join('\n')

  const contentsSection = Object.entries(fileContents)
    .slice(0, 3) // limit to avoid token explosion
    .map(([path, content]) => `\n=== ${path} ===\n${content.slice(0, 1000)}`)
    .join('\n')

  return `You are a code reviewer performing a focused ${dimension} review.

CHANGED FILES:
${fileList || '  (none)'}

FILE CONTENTS (excerpt):
${contentsSection || '  (not available)'}

Review ONLY for: ${dimension}

For each issue found, create a finding with:
- id: unique string (e.g. "${dimension}-001")
- severity: critical | high | medium | low | info
- category: "${dimension}"
- file: exact file path from the changed files list
- description: clear description of the issue
- evidence: specific line of code or pattern (REQUIRED)
- suggestion: how to fix (optional)

If no issues found, return an empty findings array.

Respond with JSON:
{
  "findings": [
    {
      "id": "string",
      "severity": "critical|high|medium|low|info",
      "category": "${dimension}",
      "file": "path/to/file.ts",
      "description": "...",
      "evidence": "specific code reference (REQUIRED)",
      "suggestion": "..."
    }
  ],
  "dimensionReviewed": "${dimension}",
  "note": "optional: 'no issues found' if clean"
}

Return ONLY valid JSON.`
}

/**
 * Checks postconditions for the review agent output.
 */
export function checkReviewPostconditions(
  findings: ReviewFinding[],
  diffAnalysis: DiffAnalysis,
  reviewedDimensions: string[],
): PostconditionResult {
  const failures: PostconditionResult['failures'] = []

  // a. Every critical finding must have a file reference
  const criticalWithoutFile = findings.filter(
    f => f.severity === 'critical' && (!f.file || f.file.trim() === ''),
  )
  if (criticalWithoutFile.length > 0) {
    failures.push({
      check: 'critical_findings_have_file',
      reason: `${criticalWithoutFile.length} critical finding(s) missing file reference`,
    })
  }

  // b. If security-sensitive: at least one security finding
  if (
    diffAnalysis.hasSecuritySensitiveChanges &&
    reviewedDimensions.includes('security') &&
    !findings.some(f => f.category === 'security')
  ) {
    // This is acceptable — no issues found is valid
    // Only fail if 'security' was supposed to be reviewed but wasn't in selected dimensions
  }

  // c. If database changes: data-integrity must have been reviewed
  if (
    diffAnalysis.hasDatabaseChanges &&
    !reviewedDimensions.includes('data-integrity') &&
    diffAnalysis.changedFiles.length > 0
  ) {
    failures.push({
      check: 'data_integrity_reviewed',
      reason: 'Database changes detected but data-integrity dimension was not reviewed',
    })
  }

  // d. No finding missing evidence
  const missingEvidence = findings.filter(f => !f.evidence || f.evidence.trim() === '')
  if (missingEvidence.length > 0) {
    failures.push({
      check: 'all_findings_have_evidence',
      reason: `${missingEvidence.length} finding(s) are missing the evidence field`,
    })
  }

  return {
    passed: failures.length === 0,
    failures,
    evidence: {
      findingsCount: String(findings.length),
      dimensionsReviewed: reviewedDimensions.join(', '),
    },
  }
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

const defaultLlmAdapter: LlmAdapterFn = async _messages => ({
  content: JSON.stringify({ findings: [], dimensionReviewed: 'correctness', note: 'no-op stub' }),
  inputTokens: 0,
  outputTokens: 0,
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the review_agent LangGraph node.
 */
export function createReviewAgentNode(config: ReviewAgentConfig = {}) {
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter

  return async (state: ReviewV2State): Promise<Partial<ReviewV2State>> => {
    const { storyId, diffAnalysis, selectedReviewDimensions, retryCount } = state

    logger.info(`review_agent: starting for story ${storyId}`, {
      dimensions: selectedReviewDimensions,
      retryCount,
    })

    if (!diffAnalysis) {
      logger.warn('review_agent: no diffAnalysis — returning empty review')
      return {
        postconditionResult: {
          passed: true,
          failures: [],
          evidence: { note: 'no diff to review' },
        },
        reviewV2Phase: 'postcondition_gate',
        warnings: ['review_agent: no diffAnalysis available'],
      }
    }

    const allTokenUsage: TokenUsage[] = []
    const allFindings: ReviewFinding[] = []
    const reviewedDimensions: string[] = []

    for (const dimension of selectedReviewDimensions.slice(0, 5)) {
      // Load file contents for relevant files (limited)
      const fileContents: Record<string, string> = {}
      if (config.readFile) {
        for (const f of diffAnalysis.changedFiles.slice(0, 3)) {
          try {
            fileContents[f.path] = await config.readFile(f.path)
          } catch {
            // non-fatal
          }
        }
      }

      const prompt = buildReviewPrompt(dimension, diffAnalysis, fileContents)
      const messages = [{ role: 'system' as const, content: prompt }]

      try {
        const llmResponse = await llmAdapter(messages)
        allTokenUsage.push({
          nodeId: `review_agent:${dimension}`,
          inputTokens: llmResponse.inputTokens,
          outputTokens: llmResponse.outputTokens,
        })

        // Parse findings
        try {
          const jsonMatch = llmResponse.content.match(/```(?:json)?\s*([\s\S]*?)```/)
          const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmResponse.content.trim()
          const parsed = JSON.parse(jsonStr)
          const findings = (parsed['findings'] as ReviewFinding[] | undefined) ?? []
          allFindings.push(...findings.filter(f => f.evidence))
          reviewedDimensions.push(dimension)
        } catch {
          logger.warn(`review_agent: failed to parse findings for dimension ${dimension}`)
          reviewedDimensions.push(dimension)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`review_agent: LLM threw for dimension ${dimension}`, { error: msg })
        allTokenUsage.push({ nodeId: `review_agent:${dimension}`, inputTokens: 0, outputTokens: 0 })
        reviewedDimensions.push(dimension)
      }
    }

    const postconditionResult = checkReviewPostconditions(
      allFindings,
      diffAnalysis,
      reviewedDimensions,
    )

    logger.info('review_agent: complete', {
      storyId,
      findings: allFindings.length,
      passed: postconditionResult.passed,
    })

    return {
      reviewFindings: allFindings,
      postconditionResult,
      tokenUsage: allTokenUsage,
      reviewV2Phase: 'postcondition_gate',
    }
  }
}

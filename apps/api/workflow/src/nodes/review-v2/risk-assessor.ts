/**
 * risk_assessor Node (review-v2) — AGENTIC (LLM)
 *
 * Receives DiffAnalysis and decides which review dimensions to apply.
 * Bounded output — pure decision node. No retry needed.
 *
 * Always includes: correctness
 * Conditional: security (if hasSecuritySensitiveChanges), performance (backend),
 *              accessibility (frontend), data-integrity (db), api-contract (api),
 *              test-coverage
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { DiffAnalysis, TokenUsage, ReviewV2State } from '../../state/review-v2-state.js'

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

export type RiskAssessorConfig = {
  llmAdapter?: LlmAdapterFn
}

// ============================================================================
// Exported Pure Functions
// ============================================================================

/**
 * Builds the risk assessor system prompt.
 */
export function buildRiskAssessorPrompt(diffAnalysis: DiffAnalysis): string {
  const fileList = diffAnalysis.changedFiles
    .map(f => `  - ${f.path} (${f.changeType}, +${f.linesAdded}/-${f.linesRemoved})`)
    .join('\n')

  return `You are a risk assessment agent for code reviews.

DIFF SUMMARY:
Files changed: ${diffAnalysis.changedFiles.length}
Risk surface: ${diffAnalysis.riskSurface}
Affected domains: ${diffAnalysis.affectedDomains.join(', ') || 'unknown'}
Has security-sensitive changes: ${diffAnalysis.hasSecuritySensitiveChanges}
Has database changes: ${diffAnalysis.hasDatabaseChanges}
Has API changes: ${diffAnalysis.hasApiChanges}

CHANGED FILES:
${fileList || '  (none)'}

Select which review dimensions to apply. Rules:
- ALWAYS include: correctness
- IF hasSecuritySensitiveChanges: ALSO include security
- IF backend domain present: consider performance
- IF frontend domain present: consider accessibility
- IF database changes: ALSO include data-integrity
- IF api changes: ALSO include api-contract
- IF test files changed or missing: consider test-coverage
- Maximum 5 dimensions total

Available dimensions: correctness, security, performance, accessibility, data-integrity, api-contract, test-coverage

Respond with JSON:
{ "selectedDimensions": ["correctness", ...] }

Return ONLY valid JSON.`
}

/**
 * Parses selected dimensions from LLM response.
 * Ensures 'correctness' is always present.
 */
export function parseSelectedDimensions(llmResponse: string): string[] {
  const VALID_DIMENSIONS = [
    'correctness',
    'security',
    'performance',
    'accessibility',
    'data-integrity',
    'api-contract',
    'test-coverage',
  ]

  try {
    const jsonMatch = llmResponse.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : llmResponse.trim()
    const parsed = JSON.parse(jsonStr)
    const dims = (parsed['selectedDimensions'] as string[] | undefined) ?? []
    const valid = dims.filter(d => VALID_DIMENSIONS.includes(d))
    // Always ensure correctness is present
    if (!valid.includes('correctness')) {
      valid.unshift('correctness')
    }
    return valid.slice(0, 5) // max 5
  } catch {
    return ['correctness']
  }
}

/**
 * Deterministically derives dimensions from diff analysis (fallback).
 */
export function deriveDimensionsFromDiff(diffAnalysis: DiffAnalysis): string[] {
  const dims: string[] = ['correctness']

  if (diffAnalysis.hasSecuritySensitiveChanges) dims.push('security')
  if (diffAnalysis.affectedDomains.includes('backend')) dims.push('performance')
  if (diffAnalysis.affectedDomains.includes('frontend')) dims.push('accessibility')
  if (diffAnalysis.hasDatabaseChanges) dims.push('data-integrity')
  if (diffAnalysis.hasApiChanges) dims.push('api-contract')
  if (diffAnalysis.affectedDomains.includes('tests')) dims.push('test-coverage')

  return dims.slice(0, 5)
}

// ============================================================================
// Default No-op Adapter
// ============================================================================

const defaultLlmAdapter: LlmAdapterFn = async _messages => ({
  content: JSON.stringify({ selectedDimensions: ['correctness'] }),
  inputTokens: 0,
  outputTokens: 0,
})

// ============================================================================
// Node Factory
// ============================================================================

/**
 * Creates the risk_assessor LangGraph node.
 */
export function createRiskAssessorNode(config: RiskAssessorConfig = {}) {
  const llmAdapter = config.llmAdapter ?? defaultLlmAdapter

  return async (state: ReviewV2State): Promise<Partial<ReviewV2State>> => {
    const { storyId, diffAnalysis } = state

    logger.info(`risk_assessor: starting for story ${storyId}`)

    if (!diffAnalysis) {
      logger.warn('risk_assessor: no diffAnalysis — using empty diff')
      const emptyDiff: DiffAnalysis = {
        changedFiles: [],
        affectedDomains: [],
        riskSurface: 'low',
        hasSecuritySensitiveChanges: false,
        hasDatabaseChanges: false,
        hasApiChanges: false,
      }
      return {
        selectedReviewDimensions: ['correctness'],
        reviewV2Phase: 'review_agent',
        warnings: ['risk_assessor: no diffAnalysis, defaulting to correctness only'],
      }
    }

    const allTokenUsage: TokenUsage[] = []

    const prompt = buildRiskAssessorPrompt(diffAnalysis)
    const messages = [{ role: 'system' as const, content: prompt }]

    let selectedDimensions: string[]

    try {
      const llmResponse = await llmAdapter(messages)
      allTokenUsage.push({
        nodeId: 'risk_assessor',
        inputTokens: llmResponse.inputTokens,
        outputTokens: llmResponse.outputTokens,
      })
      selectedDimensions = parseSelectedDimensions(llmResponse.content)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`risk_assessor: LLM threw — falling back to deterministic derivation`, {
        error: msg,
      })
      selectedDimensions = deriveDimensionsFromDiff(diffAnalysis)
      allTokenUsage.push({ nodeId: 'risk_assessor', inputTokens: 0, outputTokens: 0 })
    }

    // Postcondition: always include correctness
    if (!selectedDimensions.includes('correctness')) {
      selectedDimensions.unshift('correctness')
    }

    logger.info('risk_assessor: complete', {
      storyId,
      selectedDimensions,
    })

    return {
      selectedReviewDimensions: selectedDimensions,
      tokenUsage: allTokenUsage,
      reviewV2Phase: 'review_agent',
    }
  }
}

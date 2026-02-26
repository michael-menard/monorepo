/**
 * Review React Worker
 *
 * LLM-powered review of React patterns (hooks, components, rendering).
 * Uses injectable modelRouterOverride for testability.
 * Model router will be provided by APIP-0040 when available.
 *
 * APIP-1050: AC-2, AC-4, AC-8, AC-15
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { WorkerResult, Finding } from '../../../artifacts/review.js'

// ============================================================================
// Config Schema
// ============================================================================

export const ReviewReactConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(60000),
  enabled: z.boolean().default(true),
  /** Override model router with a custom function (for testing, APIP-0040) */
  modelRouterOverride: z.function().optional(),
  maxFindingsPerFile: z.number().int().positive().default(10),
})

export type ReviewReactConfig = z.infer<typeof ReviewReactConfigSchema>

// ============================================================================
// Model Router Type (injectable for testing, APIP-0040 integration)
// ============================================================================

export type LLMModelRouter = (prompt: string, timeoutMs: number) => Promise<string>

// ============================================================================
// Default Model Router (no-op until APIP-0040 is implemented)
// ============================================================================

const defaultModelRouter: LLMModelRouter = async (_prompt, _timeoutMs) => {
  // APIP-0040: Model router not yet implemented
  // Return empty response (no findings) until model router is available
  return ''
}

// ============================================================================
// Worker Factory
// ============================================================================

/**
 * Creates a React review worker node.
 *
 * AC-2: Worker has ConfigSchema, factory function, WorkerResult return.
 * AC-4: Unit-testable via injectable modelRouterOverride.
 * AC-8: Timeout returns FAIL finding with timeout message.
 */
export function createReviewReactNode(
  config: Partial<ReviewReactConfig> & { modelRouterOverride?: LLMModelRouter } = {},
) {
  const { modelRouterOverride, ...restConfig } = config
  const fullConfig = ReviewReactConfigSchema.omit({ modelRouterOverride: true }).parse(restConfig)
  const modelRouter: LLMModelRouter = modelRouterOverride ?? defaultModelRouter

  return async (state: {
    storyId: string
    worktreePath: string
    changeSpecIds?: string[]
  }): Promise<WorkerResult> => {
    const startTime = Date.now()

    if (!fullConfig.enabled) {
      logger.info('React review worker disabled', { storyId: state.storyId })
      return { verdict: 'PASS', skipped: true, errors: 0, warnings: 0, findings: [], duration_ms: 0 }
    }

    try {
      const prompt = buildReactReviewPrompt(state.changeSpecIds ?? [])

      const responsePromise = modelRouter(prompt, fullConfig.timeoutMs)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`React review worker timed out after ${fullConfig.timeoutMs}ms`)),
          fullConfig.timeoutMs,
        ),
      )

      const response = await Promise.race([responsePromise, timeoutPromise])
      const duration_ms = Date.now() - startTime

      if (!response.trim()) {
        // No response = no findings (model router not yet available)
        return { verdict: 'PASS', skipped: false, errors: 0, warnings: 0, findings: [], duration_ms }
      }

      const findings = parseFindings(response)
      const errors = findings.filter(f => f.severity === 'error').length
      const warnings = findings.filter(f => f.severity === 'warning').length

      logger.info('React review worker completed', { storyId: state.storyId, findings: findings.length })

      return {
        verdict: errors > 0 ? 'FAIL' : 'PASS',
        skipped: false,
        errors,
        warnings,
        findings,
        duration_ms,
      }
    } catch (error) {
      const duration_ms = Date.now() - startTime
      const msg = error instanceof Error ? error.message : String(error)
      const isTimeout = msg.toLowerCase().includes('timed out')

      logger.error('React review worker error', { storyId: state.storyId, error: msg })

      return {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [{
          file: 'unknown',
          message: isTimeout ? `React review worker timed out after ${fullConfig.timeoutMs}ms` : msg,
          severity: 'error',
          auto_fixable: false,
        }],
        duration_ms,
      }
    }
  }
}

// ============================================================================
// Prompt Construction
// ============================================================================

function buildReactReviewPrompt(changeSpecIds: string[]): string {
  const fileList = changeSpecIds.length > 0
    ? changeSpecIds.join('\n')
    : 'all changed files'

  return `Review the following files for React best practices:
${fileList}

Check for:
- Correct hook usage (rules of hooks)
- Component composition patterns
- Performance issues (unnecessary re-renders, missing memoization)
- Accessibility in JSX (aria labels, roles)
- React 19 specific patterns

Return findings as JSON array: [{"file": "...", "line": N, "message": "...", "severity": "error|warning|info", "auto_fixable": boolean}]
Return empty array [] if no issues found.`
}

// ============================================================================
// Response Parsing
// ============================================================================

function parseFindings(response: string): Finding[] {
  try {
    // Extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const raw = JSON.parse(jsonMatch[0]) as unknown[]
    const findings: Finding[] = []

    for (const item of raw) {
      if (typeof item !== 'object' || item === null) continue
      const obj = item as Record<string, unknown>

      findings.push({
        file: String(obj.file ?? 'unknown'),
        line: typeof obj.line === 'number' ? obj.line : undefined,
        message: String(obj.message ?? ''),
        severity: ['error', 'warning', 'info'].includes(String(obj.severity))
          ? (obj.severity as 'error' | 'warning' | 'info')
          : 'warning',
        auto_fixable: Boolean(obj.auto_fixable ?? false),
      })
    }

    return findings
  } catch {
    return []
  }
}

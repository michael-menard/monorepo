/**
 * Review Reusability Worker
 *
 * LLM-powered review of component reusability and composition.
 * Uses injectable modelRouterOverride for testability.
 *
 * APIP-1050: AC-2, AC-4, AC-8, AC-15
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { WorkerResult, Finding } from '../../../artifacts/review.js'

export const ReviewReusabilityConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(60000),
  enabled: z.boolean().default(true),
  modelRouterOverride: z.function().optional(),
})

export type ReviewReusabilityConfig = z.infer<typeof ReviewReusabilityConfigSchema>

export type LLMModelRouter = (prompt: string, timeoutMs: number) => Promise<string>

const defaultModelRouter: LLMModelRouter = async (_prompt, _timeoutMs) => ''

export function createReviewReusabilityNode(
  config: Partial<ReviewReusabilityConfig> & { modelRouterOverride?: LLMModelRouter } = {},
) {
  const { modelRouterOverride, ...restConfig } = config
  const fullConfig = ReviewReusabilityConfigSchema.omit({ modelRouterOverride: true }).parse(restConfig)
  const modelRouter: LLMModelRouter = modelRouterOverride ?? defaultModelRouter

  return async (state: {
    storyId: string
    worktreePath: string
    changeSpecIds?: string[]
  }): Promise<WorkerResult> => {
    const startTime = Date.now()

    if (!fullConfig.enabled) {
      logger.info('Reusability review worker disabled', { storyId: state.storyId })
      return { verdict: 'PASS', skipped: true, errors: 0, warnings: 0, findings: [], duration_ms: 0 }
    }

    try {
      const prompt = buildReusabilityReviewPrompt(state.changeSpecIds ?? [])

      const responsePromise = modelRouter(prompt, fullConfig.timeoutMs)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Reusability review worker timed out after ${fullConfig.timeoutMs}ms`)),
          fullConfig.timeoutMs,
        ),
      )

      const response = await Promise.race([responsePromise, timeoutPromise])
      const duration_ms = Date.now() - startTime

      if (!response.trim()) {
        return { verdict: 'PASS', skipped: false, errors: 0, warnings: 0, findings: [], duration_ms }
      }

      const findings = parseFindings(response)
      const errors = findings.filter(f => f.severity === 'error').length
      const warnings = findings.filter(f => f.severity === 'warning').length

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

      return {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [{
          file: 'unknown',
          message: isTimeout
            ? `Reusability review worker timed out after ${fullConfig.timeoutMs}ms`
            : msg,
          severity: 'error',
          auto_fixable: false,
        }],
        duration_ms,
      }
    }
  }
}

function buildReusabilityReviewPrompt(changeSpecIds: string[]): string {
  const fileList = changeSpecIds.length > 0 ? changeSpecIds.join('\n') : 'all changed files'
  return `Review the following files for reusability and composition quality:
${fileList}

Check for:
- Hardcoded values that should be props
- Tight coupling between components
- Missing abstraction opportunities
- Proper separation of concerns
- Configurable vs opinionated components

Return findings as JSON array: [{"file": "...", "line": N, "message": "...", "severity": "error|warning|info", "auto_fixable": boolean}]
Return empty array [] if no issues found.`
}

function parseFindings(response: string): Finding[] {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const raw = JSON.parse(jsonMatch[0]) as unknown[]
    return raw.filter(Boolean).map(item => {
      const obj = item as Record<string, unknown>
      return {
        file: String(obj.file ?? 'unknown'),
        line: typeof obj.line === 'number' ? obj.line : undefined,
        message: String(obj.message ?? ''),
        severity: ['error', 'warning', 'info'].includes(String(obj.severity))
          ? (obj.severity as 'error' | 'warning' | 'info')
          : 'warning',
        auto_fixable: Boolean(obj.auto_fixable ?? false),
      }
    })
  } catch {
    return []
  }
}

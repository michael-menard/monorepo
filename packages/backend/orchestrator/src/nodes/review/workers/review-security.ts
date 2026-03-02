/**
 * Review Security Worker
 *
 * Claude-tier LLM review for security vulnerabilities.
 * Wraps the Claude call with NodeCircuitBreaker for fault tolerance.
 * Performs per-story token budget check before dispatching to Claude.
 * Gracefully returns FAIL (not throw) when budget is exceeded or circuit is open.
 *
 * APIP-1050: AC-2, AC-5, AC-8, AC-15
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { NodeCircuitBreaker } from '../../../runner/circuit-breaker.js'
import type { WorkerResult, Finding } from '../../../artifacts/review.js'

export const ReviewSecurityConfigSchema = z.object({
  timeoutMs: z.number().int().positive().default(90000),
  enabled: z.boolean().default(true),
  /** Token budget per story (default: 50000 tokens) */
  tokenBudget: z.number().int().positive().default(50000),
  modelRouterOverride: z.function().optional(),
})

export type ReviewSecurityConfig = z.infer<typeof ReviewSecurityConfigSchema>

export type LLMModelRouter = (prompt: string, timeoutMs: number) => Promise<string>

const defaultModelRouter: LLMModelRouter = async (_prompt, _timeoutMs) => ''

/**
 * Per-instance circuit breaker state.
 * Each call to createReviewSecurityNode creates a fresh breaker.
 */
export type TokenBudgetChecker = (storyId: string, budget: number) => Promise<boolean>

const defaultTokenBudgetChecker: TokenBudgetChecker = async (_storyId, _budget) => true

export function createReviewSecurityNode(
  config: Partial<ReviewSecurityConfig> & {
    modelRouterOverride?: LLMModelRouter
    tokenBudgetChecker?: TokenBudgetChecker
    circuitBreaker?: NodeCircuitBreaker
  } = {},
) {
  const { modelRouterOverride, tokenBudgetChecker, circuitBreaker, ...restConfig } = config
  const fullConfig = ReviewSecurityConfigSchema.omit({ modelRouterOverride: true }).parse(
    restConfig,
  )
  const modelRouter: LLMModelRouter = modelRouterOverride ?? defaultModelRouter
  const budgetChecker: TokenBudgetChecker = tokenBudgetChecker ?? defaultTokenBudgetChecker

  // AC-5: NodeCircuitBreaker wraps the Claude call (not the budget check)
  const breaker: NodeCircuitBreaker =
    circuitBreaker ?? new NodeCircuitBreaker({ failureThreshold: 3, recoveryTimeoutMs: 60000 })

  return async (state: {
    storyId: string
    worktreePath: string
    changeSpecIds?: string[]
  }): Promise<WorkerResult> => {
    const startTime = Date.now()

    if (!fullConfig.enabled) {
      logger.info('Security review worker disabled', { storyId: state.storyId })
      return {
        verdict: 'PASS',
        skipped: true,
        errors: 0,
        warnings: 0,
        findings: [],
        duration_ms: 0,
      }
    }

    // AC-5: Per-story token budget check (runs before circuit breaker gate)
    let withinBudget: boolean
    try {
      withinBudget = await budgetChecker(state.storyId, fullConfig.tokenBudget)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn('Token budget check failed, treating as exceeded', {
        storyId: state.storyId,
        error: msg,
      })
      withinBudget = false
    }

    if (!withinBudget) {
      const duration_ms = Date.now() - startTime
      logger.warn('Security review skipped: token budget exceeded', { storyId: state.storyId })
      // AC-5: graceful FAIL (not throw) on budget exceeded
      return {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [
          {
            file: 'unknown',
            message: `Security review skipped: token budget exceeded (budget: ${fullConfig.tokenBudget})`,
            severity: 'error',
            auto_fixable: false,
          },
        ],
        duration_ms,
      }
    }

    // AC-5: Circuit breaker gates the Claude call
    if (!breaker.canExecute()) {
      const duration_ms = Date.now() - startTime
      const status = breaker.getStatus()
      logger.warn('Security review skipped: circuit breaker open', {
        storyId: state.storyId,
        failures: status.failures,
        timeUntilRecovery: status.timeUntilRecovery,
      })
      // AC-5: graceful FAIL (not throw) on circuit open
      return {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [
          {
            file: 'unknown',
            message: `Security review unavailable: circuit breaker open (${status.failures} failures)`,
            severity: 'error',
            auto_fixable: false,
          },
        ],
        duration_ms,
      }
    }

    try {
      const prompt = buildSecurityReviewPrompt(state.changeSpecIds ?? [])

      const responsePromise = modelRouter(prompt, fullConfig.timeoutMs)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`Security review worker timed out after ${fullConfig.timeoutMs}ms`)),
          fullConfig.timeoutMs,
        ),
      )

      const response = await Promise.race([responsePromise, timeoutPromise])
      const duration_ms = Date.now() - startTime

      // Record success with circuit breaker
      breaker.recordSuccess()

      if (!response.trim()) {
        return {
          verdict: 'PASS',
          skipped: false,
          errors: 0,
          warnings: 0,
          findings: [],
          duration_ms,
        }
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

      // Record failure with circuit breaker (only for non-timeout errors — timeouts are expected)
      if (!isTimeout) {
        breaker.recordFailure()
      }

      return {
        verdict: 'FAIL',
        skipped: false,
        errors: 1,
        warnings: 0,
        findings: [
          {
            file: 'unknown',
            message: isTimeout
              ? `Security review worker timed out after ${fullConfig.timeoutMs}ms`
              : msg,
            severity: 'error',
            auto_fixable: false,
          },
        ],
        duration_ms,
      }
    }
  }
}

function buildSecurityReviewPrompt(changeSpecIds: string[]): string {
  const fileList = changeSpecIds.length > 0 ? changeSpecIds.join('\n') : 'all changed files'
  return `Review the following files for security vulnerabilities:
${fileList}

Check for:
- SQL injection / NoSQL injection risks
- XSS vulnerabilities (unescaped user input, dangerouslySetInnerHTML)
- Authentication/authorization bypasses
- Sensitive data exposure (API keys, PII in logs/responses)
- Insecure dependencies or imports
- CSRF vulnerabilities
- Path traversal / directory traversal risks
- Hardcoded secrets or credentials

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

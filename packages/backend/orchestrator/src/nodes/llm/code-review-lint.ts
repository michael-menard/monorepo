/**
 * code-review-lint.ts
 *
 * Example LLM-powered node demonstrating hybrid Ollama/Claude usage.
 * Performs lint-focused code review using local Ollama models for speed,
 * with fallback to Claude when Ollama is unavailable.
 *
 * @module nodes/llm/code-review-lint
 */

import { z } from 'zod'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import { logger } from '@repo/logger'
import type { GraphState } from '../../state/index.js'
import { createLLMPoweredNode, type LLMRunnableConfig } from '../../runner/node-factory.js'

// ============================================================================
// Schemas
// ============================================================================

/**
 * Lint issue found in code.
 */
export const LintIssueSchema = z.object({
  file: z.string(),
  line: z.number().optional(),
  severity: z.enum(['error', 'warning', 'info']),
  rule: z.string(),
  message: z.string(),
  suggestion: z.string().optional(),
})

export type LintIssue = z.infer<typeof LintIssueSchema>

/**
 * Result of lint review.
 */
export const LintReviewResultSchema = z.object({
  issues: z.array(LintIssueSchema),
  summary: z.string(),
  passesLint: z.boolean(),
  modelUsed: z.string(),
  provider: z.enum(['ollama', 'claude']),
})

export type LintReviewResult = z.infer<typeof LintReviewResultSchema>

// ============================================================================
// Prompts
// ============================================================================

const SYSTEM_PROMPT = `You are a code lint reviewer. Analyze the provided code for common linting issues including:

- Unused variables and imports
- Missing type annotations (in TypeScript)
- Inconsistent formatting
- Console statements in production code
- Magic numbers without constants
- Missing error handling
- Overly complex functions

Respond in JSON format:
{
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "severity": "warning",
      "rule": "no-unused-vars",
      "message": "Variable 'foo' is declared but never used",
      "suggestion": "Remove the unused variable or use it"
    }
  ],
  "summary": "Brief summary of findings",
  "passesLint": true/false
}`

// ============================================================================
// Node Implementation
// ============================================================================

/**
 * Extended GraphState with lint review fields.
 */
export interface GraphStateWithLintReview extends GraphState {
  codeToReview?: string
  lintReviewResult?: LintReviewResult
  pendingClaudeCall?: {
    model: string
    systemPrompt: string
    userPrompt: string
    nodeId: string
  }
}

/**
 * Code review lint node.
 *
 * When using Ollama:
 * - Directly invokes the local model and returns results.
 *
 * When using Claude:
 * - Returns a pendingClaudeCall signal for external invocation.
 *   The orchestrator should detect this and invoke Claude Code.
 */
async function codeReviewLintImpl(
  state: GraphStateWithLintReview,
  config: LLMRunnableConfig,
): Promise<Partial<GraphStateWithLintReview>> {
  const llmResult = config.configurable?.llm

  if (!llmResult) {
    logger.error('No LLM result in config', { nodeId: 'code-review-lint' })
    return {
      errors: [
        ...(state.errors ?? []),
        {
          nodeId: 'code-review-lint',
          message: 'LLM not configured',
          code: 'LLM_NOT_CONFIGURED',
          timestamp: new Date().toISOString(),
          recoverable: false,
        },
      ],
    }
  }

  const codeToReview = state.codeToReview ?? ''

  if (!codeToReview) {
    return {
      lintReviewResult: {
        issues: [],
        summary: 'No code provided for review',
        passesLint: true,
        modelUsed: llmResult.provider === 'ollama' ? llmResult.model.fullName : llmResult.model,
        provider: llmResult.provider,
      },
    }
  }

  // Ollama path - invoke directly
  if (llmResult.provider === 'ollama') {
    logger.info('Using Ollama for lint review', {
      model: llmResult.model.fullName,
      codeLength: codeToReview.length,
    })

    try {
      const response = await llmResult.llm.invoke([
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(`Please review this code:\n\n${codeToReview}`),
      ])

      const content = typeof response.content === 'string' ? response.content : ''

      // Parse JSON response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Failed to parse JSON response from model')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        lintReviewResult: {
          issues: parsed.issues ?? [],
          summary: parsed.summary ?? 'Review complete',
          passesLint: parsed.passesLint ?? true,
          modelUsed: llmResult.model.fullName,
          provider: 'ollama',
        },
      }
    } catch (error) {
      logger.error('Ollama lint review failed', {
        model: llmResult.model.fullName,
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      return {
        errors: [
          ...(state.errors ?? []),
          {
            nodeId: 'code-review-lint',
            message: `Ollama invocation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'OLLAMA_INVOCATION_FAILED',
            timestamp: new Date().toISOString(),
            recoverable: true, // Can retry with fallback model
          },
        ],
      }
    }
  }

  // Claude path - return signal for external invocation
  logger.info('Deferring to Claude for lint review', {
    model: llmResult.model,
    codeLength: codeToReview.length,
  })

  return {
    pendingClaudeCall: {
      model: llmResult.model,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt: `Please review this code:\n\n${codeToReview}`,
      nodeId: 'code-review-lint',
    },
  }
}

/**
 * Code review lint node - exported factory.
 */
export const codeReviewLintNode = createLLMPoweredNode(
  { name: 'code-review-lint' },
  codeReviewLintImpl,
)

/**
 * Creates a configured code review lint node.
 */
export function createCodeReviewLintNode(options?: {
  modelOverride?: string
}) {
  return createLLMPoweredNode(
    {
      name: 'code-review-lint',
      modelOverride: options?.modelOverride,
    },
    codeReviewLintImpl,
  )
}

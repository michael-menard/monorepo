/**
 * parity-harness.ts
 *
 * Core parity harness for WINT-9120.
 *
 * Accepts a claudeCodeRunner and langGraphRunner, runs both against the same
 * fixture input, compares outputs using a shared Zod schema, and produces a
 * ParityResult (matching | divergent | error).
 *
 * Design principles:
 * - All external services (AI/LLM calls, DB writes, git) are injected — no real network calls
 * - Structured diff uses Zod schema path notation (e.g. 'synthesizedStory.title')
 * - Known divergences can be documented to allow tests to pass with divergent verdict
 *
 * @module __tests__/parity/parity-harness
 */

import { z } from 'zod'

// ============================================================================
// ParityResult Schema
// ============================================================================

/**
 * A single field-level difference between the two execution paths.
 */
export const ParityDiffItemSchema = z.object({
  /** Zod schema path notation (e.g. 'synthesizedStory.title', 'docSync.filesChanged') */
  fieldPath: z.string().min(1),
  /** Value produced by the Claude Code path */
  claudeCodeValue: z.unknown(),
  /** Value produced by the LangGraph path */
  langGraphValue: z.unknown(),
})

export type ParityDiffItem = z.infer<typeof ParityDiffItemSchema>

/**
 * Error detail when one of the runners throws.
 */
export const ParityErrorSchema = z.object({
  /** Which execution path threw the error */
  source: z.enum(['claudeCode', 'langGraph']),
  /** Error message */
  message: z.string(),
})

export type ParityError = z.infer<typeof ParityErrorSchema>

/**
 * The result of a parity comparison between two execution paths.
 */
export const ParityResultSchema = z.object({
  /** Overall verdict */
  verdict: z.enum(['matching', 'divergent', 'error']),
  /** Field-level diff when verdict is 'divergent' */
  diff: z.array(ParityDiffItemSchema).default([]),
  /** Known divergences documented as acceptable behavioral differences */
  knownDivergences: z.array(z.string()).optional(),
  /** Error details when verdict is 'error' */
  error: ParityErrorSchema.optional(),
})

export type ParityResult = z.infer<typeof ParityResultSchema>

// ============================================================================
// Runner types
// ============================================================================

/**
 * A runner is an async function that accepts an input fixture and returns an output.
 * Runners must be injectable (no hardcoded external calls).
 */
export type Runner<TInput, TOutput> = (input: TInput) => Promise<TOutput>

/**
 * Options for runParity.
 * Non-generic base schema for structural validation; generic type alias preserves TInput/TOutput safety.
 */
export const RunParityOptionsSchema = z.object({
  /** Fixture input passed to both runners */
  input: z.unknown(),
  /** Claude Code execution path runner */
  claudeCodeRunner: z.unknown(),
  /** LangGraph execution path runner */
  langGraphRunner: z.unknown(),
  /** Zod schema to validate and parse outputs before comparison */
  outputSchema: z.unknown(),
  /** Known divergences to document (prevents test failure for documented differences) */
  knownDivergences: z.array(z.string()).optional(),
  /** Custom field comparator override (uses deep equality by default) */
  compareFields: z.unknown().optional(),
})

/**
 * Generic typed options for runParity — preserves TInput/TOutput type safety at call sites.
 */
export type RunParityOptions<TInput, TOutput> = {
  input: TInput
  claudeCodeRunner: Runner<TInput, TOutput>
  langGraphRunner: Runner<TInput, TOutput>
  outputSchema: z.ZodType<TOutput>
  knownDivergences?: string[]
  compareFields?: (ccValue: unknown, lgValue: unknown, fieldPath: string) => boolean
}

// ============================================================================
// Deep diff utility
// ============================================================================

/**
 * Recursively diffs two plain objects and returns field-level differences.
 * Uses Zod schema path notation (dot-separated paths).
 */
function deepDiff(
  a: unknown,
  b: unknown,
  path = '',
  diffs: ParityDiffItem[] = [],
  compareFn?: (cc: unknown, lg: unknown, fp: string) => boolean,
): ParityDiffItem[] {
  // Custom comparator takes precedence
  if (compareFn && compareFn(a, b, path)) {
    return diffs
  }

  // Primitive equality
  if (a === b) {
    return diffs
  }

  // Both null/undefined
  if (a == null && b == null) {
    return diffs
  }

  // One null/undefined
  if (a == null || b == null) {
    diffs.push({ fieldPath: path || '(root)', claudeCodeValue: a, langGraphValue: b })
    return diffs
  }

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      diffs.push({
        fieldPath: `${path || '(root)'}.length`,
        claudeCodeValue: a.length,
        langGraphValue: b.length,
      })
      return diffs
    }
    for (let i = 0; i < a.length; i++) {
      deepDiff(a[i], b[i], path ? `${path}[${i}]` : `[${i}]`, diffs, compareFn)
    }
    return diffs
  }

  // Object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    const aObj = a as Record<string, unknown>
    const bObj = b as Record<string, unknown>
    const allKeys = new Set([...Object.keys(aObj), ...Object.keys(bObj)])

    for (const key of allKeys) {
      const fieldPath = path ? `${path}.${key}` : key
      deepDiff(aObj[key], bObj[key], fieldPath, diffs, compareFn)
    }
    return diffs
  }

  // Scalar mismatch
  diffs.push({ fieldPath: path || '(root)', claudeCodeValue: a, langGraphValue: b })
  return diffs
}

// ============================================================================
// runParity
// ============================================================================

/**
 * Runs both execution paths against the same input and compares outputs.
 *
 * @returns ParityResult with verdict (matching | divergent | error) and structured diff
 *
 * @example
 * ```typescript
 * const result = await runParity({
 *   input: fixture,
 *   claudeCodeRunner: mockClaudeRunner,
 *   langGraphRunner: mockLangGraphRunner,
 *   outputSchema: DocSyncResultSchema,
 * })
 * expect(result.verdict).toBe('matching')
 * ```
 */
export async function runParity<TInput, TOutput>(
  options: RunParityOptions<TInput, TOutput>,
): Promise<ParityResult> {
  const {
    input,
    claudeCodeRunner,
    langGraphRunner,
    outputSchema,
    knownDivergences,
    compareFields,
  } = options

  // Run Claude Code path
  let claudeCodeOutput: TOutput
  try {
    claudeCodeOutput = await claudeCodeRunner(input)
  } catch (err) {
    return ParityResultSchema.parse({
      verdict: 'error',
      diff: [],
      knownDivergences,
      error: {
        source: 'claudeCode',
        message: err instanceof Error ? err.message : String(err),
      },
    })
  }

  // Run LangGraph path
  let langGraphOutput: TOutput
  try {
    langGraphOutput = await langGraphRunner(input)
  } catch (err) {
    return ParityResultSchema.parse({
      verdict: 'error',
      diff: [],
      knownDivergences,
      error: {
        source: 'langGraph',
        message: err instanceof Error ? err.message : String(err),
      },
    })
  }

  // Validate both outputs through the shared schema
  let parsedClaudeCode: unknown
  let parsedLangGraph: unknown
  const validationDiffs: ParityDiffItem[] = []

  try {
    parsedClaudeCode = outputSchema.parse(claudeCodeOutput)
  } catch (err) {
    validationDiffs.push({
      fieldPath: '(schema-validation.claudeCode)',
      claudeCodeValue: err instanceof Error ? err.message : String(err),
      langGraphValue: null,
    })
  }

  try {
    parsedLangGraph = outputSchema.parse(langGraphOutput)
  } catch (err) {
    validationDiffs.push({
      fieldPath: '(schema-validation.langGraph)',
      claudeCodeValue: null,
      langGraphValue: err instanceof Error ? err.message : String(err),
    })
  }

  if (validationDiffs.length > 0) {
    return ParityResultSchema.parse({
      verdict: 'divergent',
      diff: validationDiffs,
      knownDivergences,
    })
  }

  // Deep diff the two parsed outputs
  const diffs = deepDiff(parsedClaudeCode, parsedLangGraph, '', [], compareFields)

  if (diffs.length === 0) {
    return ParityResultSchema.parse({
      verdict: 'matching',
      diff: [],
      knownDivergences,
    })
  }

  return ParityResultSchema.parse({
    verdict: 'divergent',
    diff: diffs,
    knownDivergences,
  })
}

// ============================================================================
// Fixture factories
// ============================================================================

/**
 * Creates a minimal matching parity result for test assertions.
 */
export function createMatchingResult(knownDivergences?: string[]): ParityResult {
  return ParityResultSchema.parse({
    verdict: 'matching',
    diff: [],
    knownDivergences,
  })
}

/**
 * Creates a divergent parity result for test assertions.
 */
export function createDivergentResult(
  diffs: ParityDiffItem[],
  knownDivergences?: string[],
): ParityResult {
  return ParityResultSchema.parse({
    verdict: 'divergent',
    diff: diffs,
    knownDivergences,
  })
}

/**
 * Creates an error parity result for test assertions.
 */
export function createErrorResult(
  source: 'claudeCode' | 'langGraph',
  message: string,
): ParityResult {
  return ParityResultSchema.parse({
    verdict: 'error',
    diff: [],
    error: { source, message },
  })
}

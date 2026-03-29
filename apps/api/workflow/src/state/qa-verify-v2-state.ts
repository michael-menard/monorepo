/**
 * QA Verify V2 Graph State
 *
 * Standalone state annotation for the qa-verify-v2 agentic LangGraph.
 * Uses ac-parser → test-strategy-agent → test-executor → result-interpreter
 *   → evidence-assembler → postcondition-gate.
 *
 * Designed for bake-off comparison against v1 (tag: 'v2-agentic').
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'
import { TokenUsageSchema } from './plan-refinement-v2-state.js'
import type { TokenUsage, PostconditionResult } from './plan-refinement-v2-state.js'
import { TestRunResultSchema } from './dev-implement-v2-state.js'

export type { TokenUsage, PostconditionResult }

// ============================================================================
// ParsedAC Schema
// ============================================================================

export const ParsedACSchema = z.object({
  index: z.number().int().min(0),
  original: z.string(),
  testableAssertion: z.string(),
  testType: z.enum(['unit', 'integration', 'e2e', 'manual']),
  testHints: z.array(z.string()).default([]),
})

export type ParsedAC = z.infer<typeof ParsedACSchema>

// ============================================================================
// TestStrategy Schema
// ============================================================================

export const TestStrategySchema = z.object({
  unitTestFilter: z.string().default(''),
  e2eTestPattern: z.string().default(''),
  manualCheckItems: z.array(z.string()).default([]),
  skipReasons: z.array(z.string()).default([]),
})

export type TestStrategy = z.infer<typeof TestStrategySchema>

// ============================================================================
// ACVerificationResult Schema
// ============================================================================

export const ACVerificationResultSchema = z.object({
  acIndex: z.number().int().min(0),
  acText: z.string(),
  verdict: z.enum(['pass', 'fail', 'skip', 'manual']),
  evidence: z.string(),
  testOutput: z.string().optional(),
})

export type ACVerificationResult = z.infer<typeof ACVerificationResultSchema>

// ============================================================================
// QAVerifyV2Phase Enum
// ============================================================================

export const QAVerifyV2PhaseSchema = z.enum([
  'ac_parser',
  'test_strategy_agent',
  'test_executor',
  'result_interpreter',
  'evidence_assembler',
  'postcondition_gate',
  'complete',
  'error',
])

export type QAVerifyV2Phase = z.infer<typeof QAVerifyV2PhaseSchema>

// Re-export for use in nodes
export { TokenUsageSchema, TestRunResultSchema }
export type { TestRunResult } from './dev-implement-v2-state.js'

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/** Append reducer for arrays */
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

/**
 * QAVerifyV2StateAnnotation
 *
 * Standalone state for the qa-verify-v2 agentic LangGraph.
 * Story-centric (storyId).
 */
export const QAVerifyV2StateAnnotation = Annotation.Root({
  /** Story ID (primary identifier) */
  storyId: Annotation<string>(),

  /** Parsed acceptance criteria from ac_parser */
  parsedACs: Annotation<ParsedAC[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Test strategy from test_strategy_agent */
  testStrategy: Annotation<TestStrategy | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Unit test run result from test_executor */
  unitTestResult: Annotation<import('./dev-implement-v2-state.js').TestRunResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** E2E test run result from test_executor */
  e2eTestResult: Annotation<import('./dev-implement-v2-state.js').TestRunResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** AC verification results (append reducer) */
  acVerificationResults: Annotation<ACVerificationResult[]>({
    reducer: append,
    default: () => [],
  }),

  /** Final QA verdict */
  qaVerdict: Annotation<'pass' | 'fail' | 'conditional_pass' | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Postcondition check result */
  postconditionResult: Annotation<PostconditionResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current v2 phase */
  qaVerifyV2Phase: Annotation<QAVerifyV2Phase>({
    reducer: overwrite,
    default: () => 'ac_parser',
  }),

  /** Outer retry count */
  retryCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Maximum retries */
  maxRetries: Annotation<number>({
    reducer: overwrite,
    default: () => 1,
  }),

  /** Token usage accumulated across nodes (append reducer) */
  tokenUsage: Annotation<TokenUsage[]>({
    reducer: append,
    default: () => [],
  }),

  /** Bake-off version tag */
  bakeOffVersion: Annotation<string>({
    reducer: overwrite,
    default: () => 'v2-agentic',
  }),

  /** Accumulated warnings (append reducer) */
  warnings: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),

  /** Accumulated errors (append reducer) */
  errors: Annotation<string[]>({
    reducer: append,
    default: () => [],
  }),
})

/** TypeScript type for qa-verify v2 state */
export type QAVerifyV2State = typeof QAVerifyV2StateAnnotation.State

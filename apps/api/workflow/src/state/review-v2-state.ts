/**
 * Review V2 Graph State
 *
 * Standalone state annotation for the review-v2 agentic LangGraph.
 * Uses diff-analyzer → risk-assessor → review-agent → postcondition-gate.
 *
 * Designed for bake-off comparison against v1 (tag: 'v2-agentic').
 */

import { z } from 'zod'
import { Annotation } from '@langchain/langgraph'
import { TokenUsageSchema } from './plan-refinement-v2-state.js'
import type { TokenUsage, PostconditionResult } from './plan-refinement-v2-state.js'

export type { TokenUsage, PostconditionResult }

// ============================================================================
// DiffAnalysis Schema
// ============================================================================

export const DiffAnalysisSchema = z.object({
  changedFiles: z
    .array(
      z.object({
        path: z.string(),
        changeType: z.enum(['created', 'modified', 'deleted']),
        linesAdded: z.number().int().min(0).default(0),
        linesRemoved: z.number().int().min(0).default(0),
        summary: z.string().default(''),
      }),
    )
    .default([]),
  affectedDomains: z
    .array(z.enum(['frontend', 'backend', 'database', 'tests', 'config', 'types']))
    .default([]),
  riskSurface: z.enum(['low', 'medium', 'high']).default('medium'),
  hasSecuritySensitiveChanges: z.boolean().default(false),
  hasDatabaseChanges: z.boolean().default(false),
  hasApiChanges: z.boolean().default(false),
})

export type DiffAnalysis = z.infer<typeof DiffAnalysisSchema>

// ============================================================================
// ReviewFinding Schema
// ============================================================================

export const ReviewFindingSchema = z.object({
  id: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  category: z.string(),
  file: z.string(),
  line: z.number().int().optional(),
  description: z.string(),
  suggestion: z.string().optional(),
  /** Specific code cited as evidence */
  evidence: z.string(),
})

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>

// ============================================================================
// ReviewV2Phase Enum
// ============================================================================

export const ReviewV2PhaseSchema = z.enum([
  'diff_analyzer',
  'risk_assessor',
  'review_agent',
  'postcondition_gate',
  'complete',
  'error',
])

export type ReviewV2Phase = z.infer<typeof ReviewV2PhaseSchema>

// Re-export TokenUsageSchema for use in nodes
export { TokenUsageSchema }

// ============================================================================
// State Annotation
// ============================================================================

/** Overwrite reducer for most fields */
const overwrite = <T>(_: T, b: T): T => b

/** Append reducer for arrays */
const append = <T>(current: T[], update: T[]): T[] => [...current, ...update]

/**
 * ReviewV2StateAnnotation
 *
 * Standalone state for the review-v2 agentic LangGraph.
 */
export const ReviewV2StateAnnotation = Annotation.Root({
  /** Story ID */
  storyId: Annotation<string>(),

  /** Path to the git worktree with changed files */
  worktreePath: Annotation<string>({
    reducer: overwrite,
    default: () => '',
  }),

  /** Diff analysis from diff_analyzer */
  diffAnalysis: Annotation<DiffAnalysis | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Review dimensions selected by risk_assessor */
  selectedReviewDimensions: Annotation<string[]>({
    reducer: overwrite,
    default: () => [],
  }),

  /** Findings produced by review_agent (append reducer) */
  reviewFindings: Annotation<ReviewFinding[]>({
    reducer: append,
    default: () => [],
  }),

  /** Final review verdict */
  reviewVerdict: Annotation<'pass' | 'fail' | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Postcondition check result */
  postconditionResult: Annotation<PostconditionResult | null>({
    reducer: overwrite,
    default: () => null,
  }),

  /** Current v2 phase */
  reviewV2Phase: Annotation<ReviewV2Phase>({
    reducer: overwrite,
    default: () => 'diff_analyzer',
  }),

  /** Outer retry count */
  retryCount: Annotation<number>({
    reducer: overwrite,
    default: () => 0,
  }),

  /** Maximum retries */
  maxRetries: Annotation<number>({
    reducer: overwrite,
    default: () => 2,
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

/** TypeScript type for review v2 state */
export type ReviewV2State = typeof ReviewV2StateAnnotation.State

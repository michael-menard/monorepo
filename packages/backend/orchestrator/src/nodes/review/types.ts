/**
 * Review Worker Types
 *
 * Shared types and schemas for the review graph worker nodes.
 * APIP-1050: Review Graph with Parallel Fan-Out Workers
 */

import { z } from 'zod'

/**
 * Enumeration of all review worker names.
 * Used for dispatcher Send API and state tracking.
 *
 * AC-1: ReviewWorkerNameSchema z.enum
 */
export const ReviewWorkerNameSchema = z.enum([
  'lint',
  'style',
  'syntax',
  'typecheck',
  'build',
  'react',
  'typescript',
  'reusability',
  'accessibility',
  'security',
])

export type ReviewWorkerName = z.infer<typeof ReviewWorkerNameSchema>

/**
 * All 10 worker names as a constant array.
 */
export const ALL_REVIEW_WORKERS: ReviewWorkerName[] = [
  'lint',
  'style',
  'syntax',
  'typecheck',
  'build',
  'react',
  'typescript',
  'reusability',
  'accessibility',
  'security',
]

/**
 * Input passed to each worker node via the Send API.
 * Contains the worker name and all context needed to run.
 */
export const ReviewWorkerInputSchema = z.object({
  /** The worker to execute */
  workerName: ReviewWorkerNameSchema,
  /** Story ID being reviewed */
  storyId: z.string().min(1),
  /** Absolute path to the worktree for this story */
  worktreePath: z.string().min(1),
  /** ChangeSpec IDs from APIP-1020 (opaque strings for now per ARCH-002) */
  changeSpecIds: z.array(z.string()).default([]),
  /** Review iteration number */
  iteration: z.number().int().positive().default(1),
  /** Feature directory for output path construction */
  featureDir: z.string().min(1),
})

export type ReviewWorkerInput = z.infer<typeof ReviewWorkerInputSchema>

/**
 * Per-worker state entry within the review graph.
 * Appended by each worker node via the append reducer.
 */
export const WorkerStateEntrySchema = z.object({
  workerName: ReviewWorkerNameSchema,
  verdict: z.enum(['PASS', 'FAIL']),
  skipped: z.boolean().default(false),
  errors: z.number().int().min(0).default(0),
  warnings: z.number().int().min(0).default(0),
  findings: z
    .array(
      z.object({
        file: z.string(),
        line: z.number().int().positive().optional(),
        column: z.number().int().positive().optional(),
        message: z.string(),
        rule: z.string().optional(),
        severity: z.enum(['error', 'warning', 'info']),
        auto_fixable: z.boolean().default(false),
      }),
    )
    .default([]),
  duration_ms: z.number().int().min(0).optional(),
})

export type WorkerStateEntry = z.infer<typeof WorkerStateEntrySchema>

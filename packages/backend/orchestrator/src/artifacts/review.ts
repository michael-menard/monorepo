import { z } from 'zod'

/**
 * REVIEW.yaml Schema
 *
 * Aggregated code review results from all workers.
 * Written by review-aggregate-leader, read by fix agent and QA.
 */

export const FindingSchema = z.object({
  file: z.string(),
  line: z.number().int().positive().optional(),
  column: z.number().int().positive().optional(),
  message: z.string(),
  rule: z.string().optional(),
  severity: z.enum(['error', 'warning', 'info']),
  auto_fixable: z.boolean().default(false),
})

export type Finding = z.infer<typeof FindingSchema>

export const WorkerResultSchema = z.object({
  verdict: z.enum(['PASS', 'FAIL']),
  skipped: z.boolean().default(false),
  errors: z.number().int().min(0).default(0),
  warnings: z.number().int().min(0).default(0),
  findings: z.array(FindingSchema).default([]),
  duration_ms: z.number().int().min(0).optional(),
})

export type WorkerResult = z.infer<typeof WorkerResultSchema>

export const RankedPatchSchema = z.object({
  priority: z.number().int().positive(),
  file: z.string(),
  issue: z.string(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  auto_fixable: z.boolean().default(false),
  worker: z.string(),
})

export type RankedPatch = z.infer<typeof RankedPatchSchema>

export const ReviewSchema = z.object({
  schema: z.literal(1),
  story_id: z.string(),
  timestamp: z.string().datetime(),
  iteration: z.number().int().positive(),

  // Overall verdict
  verdict: z.enum(['PASS', 'FAIL']),

  // Which workers ran this iteration
  workers_run: z.array(z.string()),

  // Which workers were skipped (carried forward from previous PASS)
  workers_skipped: z.array(z.string()).default([]),

  // Ranked patches for the fix agent (top 3 must-fix first)
  ranked_patches: z.array(RankedPatchSchema).default([]),

  // Individual worker results
  findings: z.object({
    lint: WorkerResultSchema.optional(),
    style: WorkerResultSchema.optional(),
    syntax: WorkerResultSchema.optional(),
    security: WorkerResultSchema.optional(),
    typecheck: WorkerResultSchema.optional(),
    build: WorkerResultSchema.optional(),
    reusability: WorkerResultSchema.optional(),
    react: WorkerResultSchema.optional(),
    typescript: WorkerResultSchema.optional(),
    accessibility: WorkerResultSchema.optional(),
  }),

  // Summary counts
  total_errors: z.number().int().min(0).default(0),
  total_warnings: z.number().int().min(0).default(0),
  auto_fixable_count: z.number().int().min(0).default(0),

  // Token usage for review phase
  tokens: z
    .object({
      in: z.number().int().min(0),
      out: z.number().int().min(0),
    })
    .optional(),
})

export type Review = z.infer<typeof ReviewSchema>

/**
 * Create a new review for a story
 */
export function createReview(storyId: string, iteration: number = 1): Review {
  return {
    schema: 1,
    story_id: storyId,
    timestamp: new Date().toISOString(),
    iteration,
    verdict: 'PASS',
    workers_run: [],
    workers_skipped: [],
    ranked_patches: [],
    findings: {},
    total_errors: 0,
    total_warnings: 0,
    auto_fixable_count: 0,
  }
}

/**
 * Add a worker result to the review
 */
export function addWorkerResult(review: Review, workerName: string, result: WorkerResult): Review {
  const findings = { ...review.findings, [workerName]: result }
  const workersRun = [...review.workers_run, workerName]

  // Recalculate totals
  let totalErrors = 0
  let totalWarnings = 0
  let autoFixable = 0

  for (const r of Object.values(findings)) {
    if (r) {
      totalErrors += r.errors
      totalWarnings += r.warnings
      autoFixable += r.findings.filter(f => f.auto_fixable).length
    }
  }

  // Determine verdict
  const anyFail = Object.values(findings).some(r => r?.verdict === 'FAIL')

  return {
    ...review,
    timestamp: new Date().toISOString(),
    findings,
    workers_run: workersRun,
    verdict: anyFail ? 'FAIL' : 'PASS',
    total_errors: totalErrors,
    total_warnings: totalWarnings,
    auto_fixable_count: autoFixable,
  }
}

/**
 * Carry forward a worker result from previous iteration
 */
export function carryForwardWorker(
  review: Review,
  workerName: string,
  previousResult: WorkerResult,
): Review {
  const findings = {
    ...review.findings,
    [workerName]: { ...previousResult, skipped: true },
  }
  const workersSkipped = [...review.workers_skipped, workerName]

  return {
    ...review,
    findings,
    workers_skipped: workersSkipped,
  }
}

/**
 * Generate ranked patches from findings
 */
export function generateRankedPatches(review: Review): RankedPatch[] {
  const patches: RankedPatch[] = []

  for (const [worker, result] of Object.entries(review.findings)) {
    if (!result || result.verdict === 'PASS') continue

    for (const finding of result.findings) {
      if (finding.severity === 'error') {
        patches.push({
          priority: patches.length + 1,
          file: finding.file,
          issue: finding.message,
          severity: finding.severity === 'error' ? 'high' : 'medium',
          auto_fixable: finding.auto_fixable,
          worker,
        })
      }
    }
  }

  // Sort by severity then by priority
  return patches.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    const aSev = severityOrder[a.severity]
    const bSev = severityOrder[b.severity]
    if (aSev !== bSev) return aSev - bSev
    return a.priority - b.priority
  })
}

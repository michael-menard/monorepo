import { z } from 'zod'

/**
 * MERGE.yaml Schema
 *
 * Records the complete outcome of a merge operation for a story.
 * Written by the write-merge-artifact node, read by the supervisor and operator CLI.
 *
 * AC-10, AC-16
 */

export const MergeArtifactSchema = z.object({
  schema: z.literal(1),
  story_id: z.string(),
  timestamp: z.string().datetime(),
  verdict: z.enum(['MERGE_COMPLETE', 'MERGE_FAIL', 'MERGE_BLOCKED']),
  pr_number: z.number().int().nullable(),
  pr_url: z.string().nullable(),
  merge_commit_sha: z.string().nullable(),
  ci_status: z.enum(['pass', 'fail', 'timeout']).nullable(),
  ci_poll_count: z.number().int().min(0),
  ci_duration_ms: z.number().int().min(0),
  rebase_success: z.boolean().nullable(),
  worktree_cleaned_up: z.boolean(),
  learnings_persisted: z.boolean(),
  block_reason: z.string().nullable(),
  error: z.string().nullable(),
})

export type MergeArtifact = z.infer<typeof MergeArtifactSchema>

/**
 * Helper to create a MergeArtifact with all required fields from graph state.
 */
export function createMergeArtifact(params: {
  storyId: string
  verdict: 'MERGE_COMPLETE' | 'MERGE_FAIL' | 'MERGE_BLOCKED'
  prNumber: number | null
  prUrl: string | null
  mergeCommitSha: string | null
  ciStatus: 'pass' | 'fail' | 'timeout' | null
  ciPollCount: number
  ciDurationMs: number
  rebaseSuccess: boolean | null
  worktreeCleanedUp: boolean
  learningsPersisted: boolean
  blockReason: string | null
  error: string | null
}): MergeArtifact {
  return MergeArtifactSchema.parse({
    schema: 1,
    story_id: params.storyId,
    timestamp: new Date().toISOString(),
    verdict: params.verdict,
    pr_number: params.prNumber,
    pr_url: params.prUrl,
    merge_commit_sha: params.mergeCommitSha,
    ci_status: params.ciStatus,
    ci_poll_count: params.ciPollCount,
    ci_duration_ms: params.ciDurationMs,
    rebase_success: params.rebaseSuccess,
    worktree_cleaned_up: params.worktreeCleanedUp,
    learnings_persisted: params.learningsPersisted,
    block_reason: params.blockReason,
    error: params.error,
  })
}

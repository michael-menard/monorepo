/**
 * Monitor Domain - Repository Adapters
 *
 * Raw SQL read queries against workflow.* and analytics.* tables via Drizzle sql template tag.
 *
 * Schema:
 * - workflow.stories: story_id (text PK), feature, state, title, priority, created_at, updated_at
 * - workflow.story_details: story_id, blocked_reason, blocked_by_story, started_at, completed_at
 * - workflow.story_dependencies: story_id, depends_on_id, dependency_type
 * - analytics.story_token_usage: story_id, feature, phase, input_tokens, output_tokens, total_tokens
 *
 * Story: APIP-2020, AUDIT-7
 */

import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { z } from 'zod'
import { logger } from '@repo/logger'

// ============================================================================
// Zod Schemas (CLAUDE.md: Zod-first types)
// ============================================================================

export const PipelineStorySchema = z.object({
  story_id: z.string(),
  title: z.string(),
  feature: z.string(),
  state: z.string(),
  priority: z.string().nullable(),
  blocked_by: z.string().nullable(),
  updated_at: z.string(),
})

export type PipelineStory = z.infer<typeof PipelineStorySchema>

export const CostSummaryRowSchema = z.object({
  story_id: z.string(),
  phase: z.string(),
  total_tokens: z.number(),
  tokens_input: z.number(),
  tokens_output: z.number(),
})

export type CostSummaryRow = z.infer<typeof CostSummaryRowSchema>

export const BlockedStorySchema = z.object({
  story_id: z.string(),
  title: z.string(),
  state: z.string(),
  blocked_by: z.string().nullable(),
})

export type BlockedStory = z.infer<typeof BlockedStorySchema>

// Stories needing human attention: failed_code_review, failed_qa, blocked
export const NeedsAttentionStorySchema = z.object({
  story_id: z.string(),
  title: z.string(),
  feature: z.string(),
  state: z.string(),
  priority: z.string().nullable(),
  blocked_reason: z.string().nullable(),
  updated_at: z.string(),
})

export type NeedsAttentionStory = z.infer<typeof NeedsAttentionStorySchema>

export const PipelineDashboardResponseSchema = z.object({
  pipeline_view: z.array(PipelineStorySchema),
  cost_summary: z.array(CostSummaryRowSchema),
  blocked_queue: z.array(BlockedStorySchema),
  needs_attention: z.array(NeedsAttentionStorySchema),
  generated_at: z.string(),
})

export type PipelineDashboardResponse = z.infer<typeof PipelineDashboardResponseSchema>

// ============================================================================
// Monitor Repository Interface
// ============================================================================

export interface MonitorRepository {
  getPipelineDashboard(): Promise<PipelineDashboardResponse>
}

// ============================================================================
// Repository Implementation using Drizzle raw SQL
// ============================================================================

export function createMonitorRepository(db: NodePgDatabase<any>): MonitorRepository {
  return {
    async getPipelineDashboard(): Promise<PipelineDashboardResponse> {
      try {
        logger.info('MonitorRepository: fetching pipeline dashboard')

        // ── Pipeline view: active states only, sorted by state priority then priority ──
        // Covers: ready, in_progress, code review (multi-name variants), QA states
        const pipelineResult = await db.execute(sql`
          SELECT
            s.story_id,
            s.title,
            s.feature,
            s.state,
            s.priority,
            sd.blocked_reason AS blocked_by,
            s.updated_at
          FROM workflow.stories s
          LEFT JOIN workflow.story_details sd ON sd.story_id = s.story_id
          WHERE s.state IN (
            'ready',
            'in_progress',
            'needs_code_review',
            'in_review',
            'ready_for_review',
            'ready_for_qa',
            'in_qa'
          )
          ORDER BY
            CASE s.state
              WHEN 'in_progress'        THEN 1
              WHEN 'needs_code_review'  THEN 2
              WHEN 'in_review'          THEN 2
              WHEN 'ready_for_review'   THEN 2
              WHEN 'ready_for_qa'       THEN 3
              WHEN 'in_qa'              THEN 3
              WHEN 'ready'              THEN 4
              ELSE 5
            END ASC,
            CASE s.priority
              WHEN 'P1' THEN 1 WHEN 'critical' THEN 1 WHEN 'high' THEN 1
              WHEN 'P2' THEN 2 WHEN 'medium' THEN 2
              WHEN 'P3' THEN 3 WHEN 'low' THEN 3
              ELSE 4
            END ASC,
            s.updated_at DESC
        `)

        // ── Cost summary: token usage per story/phase ──
        // analytics.story_token_usage uses input_tokens/output_tokens (not tokens_input/tokens_output)
        const costResult = await db.execute(sql`
          SELECT
            stu.story_id,
            stu.phase,
            COALESCE(SUM(stu.total_tokens), 0)  AS total_tokens,
            COALESCE(SUM(stu.input_tokens), 0)  AS tokens_input,
            COALESCE(SUM(stu.output_tokens), 0) AS tokens_output
          FROM analytics.story_token_usage stu
          GROUP BY stu.story_id, stu.phase
          ORDER BY stu.story_id ASC, stu.phase ASC
        `)

        // ── Blocked queue: stories currently in 'blocked' state ──
        const blockedResult = await db.execute(sql`
          SELECT
            s.story_id,
            s.title,
            s.state,
            sd.blocked_reason AS blocked_by
          FROM workflow.stories s
          LEFT JOIN workflow.story_details sd ON sd.story_id = s.story_id
          WHERE s.state = 'blocked'
          ORDER BY
            CASE s.priority
              WHEN 'P1' THEN 1 WHEN 'critical' THEN 1 WHEN 'high' THEN 1
              WHEN 'P2' THEN 2 WHEN 'medium' THEN 2
              WHEN 'P3' THEN 3 WHEN 'low' THEN 3
              ELSE 4
            END ASC,
            s.updated_at DESC
        `)

        // ── Needs attention: failed_code_review, failed_qa, blocked ──
        // These require human intervention before pipeline can resume.
        const needsAttentionResult = await db.execute(sql`
          SELECT
            s.story_id,
            s.title,
            s.feature,
            s.state,
            s.priority,
            sd.blocked_reason,
            s.updated_at
          FROM workflow.stories s
          LEFT JOIN workflow.story_details sd ON sd.story_id = s.story_id
          WHERE s.state IN ('failed_code_review', 'failed_qa', 'blocked')
          ORDER BY
            CASE s.state
              WHEN 'failed_qa'          THEN 1
              WHEN 'failed_code_review' THEN 2
              WHEN 'blocked'            THEN 3
              ELSE 4
            END ASC,
            CASE s.priority
              WHEN 'P1' THEN 1 WHEN 'critical' THEN 1 WHEN 'high' THEN 1
              WHEN 'P2' THEN 2 WHEN 'medium' THEN 2
              WHEN 'P3' THEN 3 WHEN 'low' THEN 3
              ELSE 4
            END ASC,
            s.updated_at DESC
        `)

        const pipeline_view = (pipelineResult.rows as unknown[]).map(row => {
          const r = row as Record<string, unknown>
          return PipelineStorySchema.parse({
            story_id: r['story_id'],
            title: r['title'],
            feature: r['feature'] ?? '',
            state: r['state'],
            priority: r['priority'] ?? null,
            blocked_by: r['blocked_by'] ?? null,
            updated_at:
              r['updated_at'] instanceof Date
                ? (r['updated_at'] as Date).toISOString()
                : String(r['updated_at']),
          })
        })

        const cost_summary = (costResult.rows as unknown[]).map(row => {
          const r = row as Record<string, unknown>
          return CostSummaryRowSchema.parse({
            story_id: r['story_id'],
            phase: r['phase'],
            total_tokens: Number(r['total_tokens']),
            tokens_input: Number(r['tokens_input']),
            tokens_output: Number(r['tokens_output']),
          })
        })

        const blocked_queue = (blockedResult.rows as unknown[]).map(row => {
          const r = row as Record<string, unknown>
          return BlockedStorySchema.parse({
            story_id: r['story_id'],
            title: r['title'],
            state: r['state'],
            blocked_by: r['blocked_by'] ?? null,
          })
        })

        const needs_attention = (needsAttentionResult.rows as unknown[]).map(row => {
          const r = row as Record<string, unknown>
          return NeedsAttentionStorySchema.parse({
            story_id: r['story_id'],
            title: r['title'],
            feature: r['feature'] ?? '',
            state: r['state'],
            priority: r['priority'] ?? null,
            blocked_reason: r['blocked_reason'] ?? null,
            updated_at:
              r['updated_at'] instanceof Date
                ? (r['updated_at'] as Date).toISOString()
                : String(r['updated_at']),
          })
        })

        return PipelineDashboardResponseSchema.parse({
          pipeline_view,
          cost_summary,
          blocked_queue,
          needs_attention,
          generated_at: new Date().toISOString(),
        })
      } catch (error) {
        logger.error('MonitorRepository: failed to get pipeline dashboard', {
          error: error instanceof Error ? error.message : String(error),
        })
        throw error
      }
    },
  }
}

/**
 * Monitor Domain - Repository Adapters
 *
 * Raw SQL read queries against wint.* tables via Drizzle sql template tag.
 * Adapts to the actual dev database schema.
 *
 * Schema notes:
 * - wint.stories: id (uuid), story_id (text), title, state (enum), priority (enum),
 *   metadata (jsonb), created_at, updated_at
 * - wint.story_blockers: id, story_id (uuid FK), blocker_type, blocker_description,
 *   detected_at, resolved_at, severity, created_at, updated_at
 * - wint.token_usage: id, story_id (uuid FK), phase, tokens_input, tokens_output,
 *   total_tokens, model, agent_name, created_at
 *
 * NOTE: state and priority are PostgreSQL enum types, so comparisons need ::text cast.
 *
 * Story: APIP-2020
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

export const PipelineDashboardResponseSchema = z.object({
  pipeline_view: z.array(PipelineStorySchema),
  cost_summary: z.array(CostSummaryRowSchema),
  blocked_queue: z.array(BlockedStorySchema),
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

        // Pipeline view: active stories with blocker info
        // Cast state::text for comparison since state is an enum type
        // Sorted in-progress first (AC-1)
        const pipelineResult = await db.execute(sql`
          SELECT
            s.story_id,
            s.title,
            s.state::text AS state,
            s.priority::text AS priority,
            sb.blocker_description AS blocked_by,
            s.updated_at
          FROM wint.stories s
          LEFT JOIN wint.story_blockers sb
            ON sb.story_id = s.id
            AND sb.resolved_at IS NULL
          WHERE s.state::text NOT IN ('done', 'cancelled')
          ORDER BY
            CASE s.state::text
              WHEN 'in-progress' THEN 1
              WHEN 'in_progress' THEN 1
              WHEN 'ready-to-work' THEN 2
              WHEN 'ready_to_work' THEN 2
              WHEN 'ready-for-qa' THEN 3
              WHEN 'ready_for_qa' THEN 3
              WHEN 'uat' THEN 4
              WHEN 'backlog' THEN 5
              WHEN 'draft' THEN 6
              ELSE 7
            END ASC,
            CASE s.priority::text
              WHEN 'P0' THEN 1 WHEN 'p0' THEN 1 WHEN 'critical' THEN 1
              WHEN 'P1' THEN 2 WHEN 'p1' THEN 2 WHEN 'high' THEN 2
              WHEN 'P2' THEN 3 WHEN 'p2' THEN 3 WHEN 'medium' THEN 3
              WHEN 'P3' THEN 4 WHEN 'p3' THEN 4 WHEN 'low' THEN 4
              ELSE 5
            END ASC,
            s.updated_at DESC
        `)

        // Cost summary: SUM(total_tokens) grouped by story_id and phase (AC-2)
        // JOINs UUID FK with wint.stories to get human-readable story_id
        const costResult = await db.execute(sql`
          SELECT
            s.story_id,
            tu.phase,
            COALESCE(SUM(tu.total_tokens), 0) AS total_tokens,
            COALESCE(SUM(tu.tokens_input), 0) AS tokens_input,
            COALESCE(SUM(tu.tokens_output), 0) AS tokens_output
          FROM wint.token_usage tu
          JOIN wint.stories s ON tu.story_id = s.id
          GROUP BY s.story_id, tu.phase
          ORDER BY s.story_id ASC, tu.phase ASC
        `)

        // Blocked queue: stories with active (unresolved) blockers (AC-3)
        const blockedResult = await db.execute(sql`
          SELECT
            s.story_id,
            s.title,
            s.state::text AS state,
            sb.blocker_description AS blocked_by
          FROM wint.stories s
          JOIN wint.story_blockers sb ON sb.story_id = s.id
          WHERE sb.resolved_at IS NULL
          ORDER BY
            CASE s.priority::text
              WHEN 'P0' THEN 1 WHEN 'p0' THEN 1 WHEN 'critical' THEN 1
              WHEN 'P1' THEN 2 WHEN 'p1' THEN 2 WHEN 'high' THEN 2
              WHEN 'P2' THEN 3 WHEN 'p2' THEN 3 WHEN 'medium' THEN 3
              WHEN 'P3' THEN 4 WHEN 'p3' THEN 4 WHEN 'low' THEN 4
              ELSE 5
            END ASC,
            s.updated_at DESC
        `)

        const pipeline_view = (pipelineResult.rows as unknown[]).map(row => {
          const r = row as Record<string, unknown>
          return PipelineStorySchema.parse({
            story_id: r['story_id'],
            title: r['title'],
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

        return PipelineDashboardResponseSchema.parse({
          pipeline_view,
          cost_summary,
          blocked_queue,
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

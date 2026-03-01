/**
 * PipelineReadService
 *
 * Shared read service for pipeline monitoring.
 * Provides getPipelineView(), getCostSummary(), and getBlockedQueue() methods.
 *
 * Uses raw SQL via DbClient interface (same pattern as StoryRepository).
 * Consumed by the monitor API domain and future CLI tools (APIP-5005).
 *
 * Story: APIP-2020
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import { type DbClient } from '../db/story-repository.js'

// ============================================================================
// Zod Schemas (CLAUDE.md requirement: Zod-first types)
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
// Raw DB row types (for query results before Zod parsing)
// ============================================================================

interface PipelineStoryRow {
  story_id: string
  title: string
  state: string
  priority: string | null
  blocked_by: string | null
  updated_at: Date
}

interface CostSummaryRawRow {
  story_id: string
  phase: string
  total_tokens: string | number
  tokens_input: string | number
  tokens_output: string | number
}

interface BlockedStoryRow {
  story_id: string
  title: string
  state: string
  blocked_by: string | null
}

// ============================================================================
// PipelineReadService
// ============================================================================

/**
 * Read service for pipeline monitoring data.
 *
 * Uses raw SQL via DbClient for reliability against the wint.* schema.
 * All queries are optimised to use existing indexes:
 *   - stories_state_idx on wint.stories.state
 *   - token_usage_story_id_idx on wint.token_usage.story_id
 */
export class PipelineReadService {
  constructor(private client: DbClient) {}

  /**
   * Get all stories for the pipeline view, sorted in-progress first then by state/priority.
   *
   * AC-1: in-progress stories appear first.
   */
  async getPipelineView(): Promise<PipelineStory[]> {
    try {
      const result = await this.client.query<PipelineStoryRow>(
        `SELECT
          story_id,
          title,
          state,
          priority,
          blocked_by,
          updated_at
        FROM wint.stories
        WHERE state NOT IN ('done', 'cancelled')
        ORDER BY
          CASE state
            WHEN 'in-progress' THEN 1
            WHEN 'ready-to-work' THEN 2
            WHEN 'ready-for-qa' THEN 3
            WHEN 'uat' THEN 4
            WHEN 'backlog' THEN 5
            WHEN 'draft' THEN 6
            ELSE 7
          END ASC,
          CASE priority
            WHEN 'p0' THEN 1
            WHEN 'p1' THEN 2
            WHEN 'p2' THEN 3
            WHEN 'p3' THEN 4
            ELSE 5
          END ASC,
          updated_at DESC`,
      )

      return result.rows.map(row =>
        PipelineStorySchema.parse({
          story_id: row.story_id,
          title: row.title,
          state: row.state,
          priority: row.priority,
          blocked_by: row.blocked_by,
          updated_at: row.updated_at.toISOString(),
        }),
      )
    } catch (error) {
      logger.error('PipelineReadService: failed to get pipeline view', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get per-story token cost summary, aggregated by story_id and phase.
   *
   * AC-2: SUM(total_tokens) grouped by story_id and phase.
   * JOINs wint.token_usage (UUID FK) with wint.stories to get human-readable story_id.
   */
  async getCostSummary(): Promise<CostSummaryRow[]> {
    try {
      const result = await this.client.query<CostSummaryRawRow>(
        `SELECT
          s.story_id,
          tu.phase,
          SUM(tu.total_tokens) AS total_tokens,
          SUM(tu.tokens_input) AS tokens_input,
          SUM(tu.tokens_output) AS tokens_output
        FROM wint.token_usage tu
        JOIN wint.stories s ON tu.story_id = s.id
        GROUP BY s.story_id, tu.phase
        ORDER BY s.story_id ASC, tu.phase ASC`,
      )

      return result.rows.map(row =>
        CostSummaryRowSchema.parse({
          story_id: row.story_id,
          phase: row.phase,
          total_tokens: Number(row.total_tokens),
          tokens_input: Number(row.tokens_input),
          tokens_output: Number(row.tokens_output),
        }),
      )
    } catch (error) {
      logger.error('PipelineReadService: failed to get cost summary', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Get blocked stories queue.
   *
   * AC-3: Stories where blocked_by IS NOT NULL, with the blocked_by reason.
   */
  async getBlockedQueue(): Promise<BlockedStory[]> {
    try {
      const result = await this.client.query<BlockedStoryRow>(
        `SELECT
          story_id,
          title,
          state,
          blocked_by
        FROM wint.stories
        WHERE blocked_by IS NOT NULL
        ORDER BY
          CASE priority
            WHEN 'p0' THEN 1
            WHEN 'p1' THEN 2
            WHEN 'p2' THEN 3
            WHEN 'p3' THEN 4
            ELSE 5
          END ASC,
          updated_at DESC`,
      )

      return result.rows.map(row =>
        BlockedStorySchema.parse({
          story_id: row.story_id,
          title: row.title,
          state: row.state,
          blocked_by: row.blocked_by,
        }),
      )
    } catch (error) {
      logger.error('PipelineReadService: failed to get blocked queue', {
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Aggregate all three views into a single dashboard response.
   *
   * AC-4: PipelineDashboardResponseSchema-compliant payload.
   */
  async getPipelineDashboard(): Promise<PipelineDashboardResponse> {
    const [pipeline_view, cost_summary, blocked_queue] = await Promise.all([
      this.getPipelineView(),
      this.getCostSummary(),
      this.getBlockedQueue(),
    ])

    return PipelineDashboardResponseSchema.parse({
      pipeline_view,
      cost_summary,
      blocked_queue,
      generated_at: new Date().toISOString(),
    })
  }
}

/**
 * Factory function to create a PipelineReadService instance.
 */
export function createPipelineReadService(client: DbClient): PipelineReadService {
  return new PipelineReadService(client)
}

/**
 * SchedulerLoop
 *
 * Polls the KB for eligible 'ready' stories and dispatches them to BullMQ.
 *
 * F001: Implement scheduler poll loop
 * F005: Finish-before-new-start ordering (stories from plans with in_progress siblings first)
 * F006: Atomic dispatch — advance KB state to in_progress before enqueuing
 * F008: Abort on drain signal
 *
 * Design:
 * - Runs until stop() is called (sets AbortController signal)
 * - Each poll cycle checks BullMQ slot availability before querying KB
 * - Uses direct Drizzle queries (same pattern as story-crud-operations.ts)
 */

import type { Queue } from 'bullmq'
import { eq, and, inArray, notInArray, sql, asc, isNull } from 'drizzle-orm'
import { logger } from '@repo/logger'
import type { StoryCrudDeps } from '@repo/knowledge-base'
import { kb_update_story_status } from '@repo/knowledge-base'
import { ImplementationJobDataSchema } from '@repo/pipeline-queue'
import type { SchedulerConfig } from './__types__/index.js'
import { SchedulerConfigSchema } from './__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type StoryRow = {
  storyId: string
  title: string
  description: string | null
  feature: string
  state: string | null
  priority: string | null
  blockedByStory: string | null
  createdAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// SchedulerLoop
// ─────────────────────────────────────────────────────────────────────────────

export class SchedulerLoop {
  private readonly config: SchedulerConfig
  private abortController: AbortController
  private running = false

  constructor(
    private readonly queue: Queue,
    private readonly kbDeps: StoryCrudDeps,
    config: Partial<SchedulerConfig> = {},
  ) {
    this.config = SchedulerConfigSchema.parse(config)
    this.abortController = new AbortController()
  }

  /**
   * Start the poll loop. Runs until stop() is called.
   * Returns a Promise that resolves when the loop exits.
   */
  async start(): Promise<void> {
    if (this.running) {
      logger.warn('SchedulerLoop already running — ignoring duplicate start()')
      return
    }

    this.running = true
    const signal = this.abortController.signal

    logger.info('scheduler_started', {
      event: 'scheduler_started',
      pollIntervalMs: this.config.pollIntervalMs,
      maxConcurrent: this.config.maxConcurrent,
    })

    while (!signal.aborted) {
      try {
        await this.runOnce()
      } catch (err) {
        logger.error('scheduler_poll_error', {
          event: 'scheduler_poll_error',
          error: err instanceof Error ? err.message : String(err),
        })
      }

      // Wait for next poll or abort
      await this.sleep(this.config.pollIntervalMs, signal)
    }

    this.running = false
    logger.info('scheduler_stopped', { event: 'scheduler_stopped' })
  }

  /**
   * Stop the poll loop. The loop exits after the current poll cycle completes.
   */
  stop(): void {
    logger.info('scheduler_stop_requested', { event: 'scheduler_stop_requested' })
    this.abortController.abort()
  }

  /**
   * Run a single poll cycle. Internal — called by start().
   */
  async runOnce(): Promise<void> {
    // 1. Check BullMQ slot availability
    const activeCount = await this.queue.getActiveCount()
    const waitingCount = await this.queue.getWaitingCount()
    const inFlight = activeCount + waitingCount
    const slotsAvailable = Math.max(0, this.config.maxConcurrent - inFlight)

    if (slotsAvailable === 0) {
      logger.debug('scheduler_no_slots', {
        event: 'scheduler_no_slots',
        activeCount,
        waitingCount,
        maxConcurrent: this.config.maxConcurrent,
      })
      return
    }

    // 2. Get eligible ready stories from KB
    const eligible = await this.getEligibleStories(slotsAvailable * 2)

    if (eligible.length === 0) {
      logger.debug('scheduler_no_eligible', { event: 'scheduler_no_eligible' })
      return
    }

    // 3. Apply finish-before-new-start ordering
    const ordered = this.config.finishBeforeNewStart
      ? await this.applyFinishBeforeNewStart(eligible)
      : eligible

    // 4. Dispatch up to slotsAvailable
    const toDispatch = ordered.slice(0, slotsAvailable)
    for (const story of toDispatch) {
      await this.dispatchStory(story, 1)
    }
  }

  /**
   * Query KB for eligible 'ready' stories with no unresolved dependencies.
   * F001: Uses direct Drizzle query — same pattern as story-crud-operations.ts
   * F007 fix is in kb_update_story_status (UAT counts as satisfied dep)
   */
  async getEligibleStories(limit: number): Promise<StoryRow[]> {
    const db = this.kbDeps.db

    // Drizzle doesn't have a great CTE API for this query — use raw SQL subquery
    const result = await db.execute<StoryRow>(sql`
      WITH unresolved_deps AS (
        SELECT sd.story_id
        FROM workflow.story_dependencies sd
        JOIN workflow.stories dep ON dep.story_id = sd.depends_on_id
        WHERE sd.dependency_type IN ('depends_on', 'blocked_by')
          AND dep.state NOT IN ('completed', 'UAT')
        GROUP BY sd.story_id
      )
      SELECT
        s.story_id AS "storyId",
        s.title,
        s.description,
        s.feature,
        s.state,
        s.priority,
        s.blocked_by_story AS "blockedByStory",
        s.created_at AS "createdAt"
      FROM workflow.stories s
      LEFT JOIN unresolved_deps ud ON ud.story_id = s.story_id
      WHERE s.state = 'ready'
        AND s.blocked_by_story IS NULL
        AND ud.story_id IS NULL
      ORDER BY
        CASE s.priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        s.created_at ASC
      LIMIT ${limit}
    `)

    return result.rows
  }

  /**
   * F005: Reorder eligible stories so that stories from plans that already have
   * in_progress siblings come first (finish-before-new-start).
   */
  private async applyFinishBeforeNewStart(eligible: StoryRow[]): Promise<StoryRow[]> {
    if (eligible.length <= 1) return eligible

    const db = this.kbDeps.db
    const storyIds = eligible.map(s => s.storyId)

    // Find plans that contain any of the eligible stories AND have other in_progress stories
    const result = await db.execute<{ storyId: string }>(sql`
      SELECT psl.story_id AS "storyId"
      FROM workflow.plan_story_links psl
      WHERE psl.story_id = ANY(${sql.raw(`ARRAY[${storyIds.map(id => `'${id}'`).join(',')}]`)})
        AND EXISTS (
          SELECT 1
          FROM workflow.plan_story_links psl2
          JOIN workflow.stories s2 ON s2.story_id = psl2.story_id
          WHERE psl2.plan_id = psl.plan_id
            AND s2.state = 'in_progress'
            AND psl2.story_id != psl.story_id
        )
    `)

    const hasSiblingInProgress = new Set(result.rows.map(r => r.storyId))

    // Stories with in_progress siblings go first
    const priority: StoryRow[] = []
    const rest: StoryRow[] = []

    for (const story of eligible) {
      if (hasSiblingInProgress.has(story.storyId)) {
        priority.push(story)
      } else {
        rest.push(story)
      }
    }

    return [...priority, ...rest]
  }

  /**
   * F006: Dispatch a story atomically.
   * Advances KB state to in_progress BEFORE enqueuing to prevent double-dispatch.
   * If KB advance fails, we skip enqueue (story stays ready, picked up next poll).
   */
  async dispatchStory(story: StoryRow, attemptNumber: number): Promise<void> {
    // Advance to in_progress BEFORE enqueuing (F006 Option A)
    const advanceResult = await kb_update_story_status(this.kbDeps, {
      story_id: story.storyId,
      state: 'in_progress',
    })

    if (!advanceResult.updated) {
      logger.warn('scheduler_advance_skipped', {
        event: 'scheduler_advance_skipped',
        storyId: story.storyId,
        message: advanceResult.message,
      })
      return
    }

    const jobData = ImplementationJobDataSchema.parse({
      storyId: story.storyId,
      stage: 'implementation' as const,
      attemptNumber,
      payload: {
        storyId: story.storyId,
        title: story.title,
        description: story.description ?? '',
        feature: story.feature,
        state: 'in_progress',
      },
      touchedPathPrefixes: [],
    })

    await this.queue.add(`story-${story.storyId}`, jobData)

    logger.info('scheduler_dispatched', {
      event: 'scheduler_dispatched',
      storyId: story.storyId,
      stage: 'implementation',
      attemptNumber,
    })
  }

  /**
   * Sleep for a given number of milliseconds, or return early if signal is aborted.
   */
  private sleep(ms: number, signal: AbortSignal): Promise<void> {
    return new Promise(resolve => {
      const timer = setTimeout(resolve, ms)
      signal.addEventListener('abort', () => {
        clearTimeout(timer)
        resolve()
      })
    })
  }
}

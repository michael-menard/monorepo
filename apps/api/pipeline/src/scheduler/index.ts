/**
 * SchedulerLoop
 *
 * Polls the KB for eligible stories and dispatches them to BullMQ.
 *
 * F001: Implement scheduler poll loop
 * F005: Finish-before-new-start ordering (stories from plans with in_progress siblings first)
 * F006: Atomic dispatch — advance KB state before enqueuing
 * F008: Abort on drain signal
 *
 * Design:
 * - Runs until stop() is called (sets AbortController signal)
 * - Each poll cycle checks BullMQ slot availability before querying KB
 * - Uses direct Drizzle queries (same pattern as story-crud-operations.ts)
 * - Dispatches three stages per cycle: implementation → review → QA (shared slot ceiling)
 */

import type { Queue } from 'bullmq'
import { sql } from 'drizzle-orm'
import { logger } from '@repo/logger'
import type { StoryCrudDeps } from '@repo/knowledge-base'
import { kb_update_story_status } from '@repo/knowledge-base'
import {
  ImplementationJobDataSchema,
  ReviewJobDataSchema,
  QaJobDataSchema,
} from '@repo/pipeline-queue'
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
   *
   * Dispatches three stages per cycle with a shared slot ceiling:
   *   1. Implementation (state: ready)
   *   2. Review (state: ready_for_qa)
   *   3. QA (state: in_qa)
   *
   * Slots consumed by earlier stages reduce slots available for later stages.
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

    let slotsRemaining = slotsAvailable

    // ── Stage 1: Implementation dispatch ─────────────────────────────────────

    const eligible = await this.getEligibleStories(slotsRemaining * 2)

    if (eligible.length === 0) {
      logger.debug('scheduler_no_eligible', { event: 'scheduler_no_eligible' })
    } else {
      const filtered = this.config.strictFinishBeforeNewStart
        ? await this.applyStrictFinishFilter(eligible)
        : eligible

      const ordered = this.config.finishBeforeNewStart
        ? await this.applyFinishBeforeNewStart(filtered)
        : filtered

      const toDispatch = ordered.slice(0, slotsRemaining)
      for (const story of toDispatch) {
        await this.dispatchStory(story, 1)
      }
      slotsRemaining = Math.max(0, slotsRemaining - toDispatch.length)
    }

    if (slotsRemaining === 0) return

    // ── Stage 2: Review dispatch ──────────────────────────────────────────────

    const eligibleReview = await this.getEligibleReviewStories(slotsRemaining * 2)

    if (eligibleReview.length === 0) {
      logger.debug('scheduler_no_eligible_review', { event: 'scheduler_no_eligible_review' })
    } else {
      const filteredReview = this.config.strictFinishBeforeNewStart
        ? await this.applyStrictFinishFilter(eligibleReview)
        : eligibleReview

      const orderedReview = this.config.finishBeforeNewStart
        ? await this.applyFinishBeforeNewStart(filteredReview)
        : filteredReview

      const toDispatchReview = orderedReview.slice(0, slotsRemaining)
      for (const story of toDispatchReview) {
        await this.dispatchReviewStory(story, 1)
      }
      slotsRemaining = Math.max(0, slotsRemaining - toDispatchReview.length)
    }

    if (slotsRemaining === 0) return

    // ── Stage 3: QA dispatch ──────────────────────────────────────────────────

    const eligibleQa = await this.getEligibleQaStories(slotsRemaining * 2)

    if (eligibleQa.length === 0) {
      logger.debug('scheduler_no_eligible_qa', { event: 'scheduler_no_eligible_qa' })
    } else {
      const filteredQa = this.config.strictFinishBeforeNewStart
        ? await this.applyStrictFinishFilter(eligibleQa)
        : eligibleQa

      const orderedQa = this.config.finishBeforeNewStart
        ? await this.applyFinishBeforeNewStart(filteredQa)
        : filteredQa

      const toDispatchQa = orderedQa.slice(0, slotsRemaining)
      for (const story of toDispatchQa) {
        await this.dispatchQaStory(story, 1)
      }
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
   * AC-1: Query KB for eligible 'ready_for_qa' stories with no unresolved dependencies.
   * Same CTE structure as getEligibleStories() — only WHERE state clause differs.
   */
  async getEligibleReviewStories(limit: number): Promise<StoryRow[]> {
    const db = this.kbDeps.db

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
      WHERE s.state = 'ready_for_qa'
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
   * AC-3/AC-4: Query KB for eligible 'in_qa' stories with no unresolved dependencies.
   * Same CTE structure as getEligibleStories() — only WHERE state clause differs.
   *
   * Stories in in_qa are polled for QA dispatch. BullMQ jobId deduplication
   * ({storyId}:qa:{attempt}) serves as the idempotency fence — see dispatchQaStory().
   */
  async getEligibleQaStories(limit: number): Promise<StoryRow[]> {
    const db = this.kbDeps.db

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
      WHERE s.state = 'in_qa'
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

    const hasSiblingInProgress = await this.getStoriesWithInProgressSiblings(eligible)

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
   * Strict finish-before-new-start filter: if any plan has in_progress work,
   * only stories from those active plans are eligible in this cycle.
   * Stories from plans with no in_progress siblings are deferred.
   */
  private async applyStrictFinishFilter(eligible: StoryRow[]): Promise<StoryRow[]> {
    if (eligible.length === 0) return eligible

    const hasSiblingInProgress = await this.getStoriesWithInProgressSiblings(eligible)

    // If no plan has active in_progress work, all eligible stories can proceed
    if (hasSiblingInProgress.size === 0) return eligible

    // Only stories that belong to plans with in_progress siblings are allowed
    return eligible.filter(story => hasSiblingInProgress.has(story.storyId))
  }

  /**
   * Shared helper: queries plan_story_links to find which of the given eligible
   * stories belong to a plan that has at least one other story currently in_progress.
   * Returns a Set of storyIds that have in_progress plan siblings.
   */
  private async getStoriesWithInProgressSiblings(eligible: StoryRow[]): Promise<Set<string>> {
    const db = this.kbDeps.db
    const storyIds = eligible.map(s => s.storyId)

    // Find plans that contain any of the eligible stories AND have other in_progress stories
    const result = await db.execute<{ storyId: string }>(sql`
      SELECT psl.story_id AS "storyId"
      FROM workflow.plan_story_links psl
      WHERE psl.story_id = ANY(${storyIds})
        AND EXISTS (
          SELECT 1
          FROM workflow.plan_story_links psl2
          JOIN workflow.stories s2 ON s2.story_id = psl2.story_id
          WHERE psl2.plan_id = psl.plan_id
            AND s2.state = 'in_progress'
            AND psl2.story_id != psl.story_id
        )
    `)

    return new Set(result.rows.map(r => r.storyId))
  }

  /**
   * F006: Dispatch an implementation story atomically.
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

    await this.queue.add(`story-${story.storyId}`, jobData, {
      jobId: `${story.storyId}:implementation:${attemptNumber}`,
    })

    logger.info('scheduler_dispatched', {
      event: 'scheduler_dispatched',
      storyId: story.storyId,
      stage: 'implementation',
      attemptNumber,
    })
  }

  /**
   * AC-2: Dispatch a review story atomically.
   *
   * F006 pattern: advance KB state ready_for_qa → in_qa BEFORE enqueuing.
   * The canonical transition is a single hop (ready_for_qa → in_qa per story-state-machine.ts).
   * If KB advance returns updated:false, log warning and return early (skip enqueue).
   *
   * JobId format: '{storyId}:review:{attemptNumber}' (ADR APIP-0020 thread ID convention).
   */
  async dispatchReviewStory(story: StoryRow, attemptNumber: number): Promise<void> {
    // Advance ready_for_qa → in_qa BEFORE enqueuing (F006 Option A)
    const advanceResult = await kb_update_story_status(this.kbDeps, {
      story_id: story.storyId,
      state: 'in_qa',
    })

    if (!advanceResult.updated) {
      logger.warn('scheduler_advance_skipped_review', {
        event: 'scheduler_advance_skipped_review',
        storyId: story.storyId,
        message: advanceResult.message,
      })
      return
    }

    const jobData = ReviewJobDataSchema.parse({
      storyId: story.storyId,
      stage: 'review' as const,
      attemptNumber,
      payload: {
        storyId: story.storyId,
        title: story.title,
        description: story.description ?? '',
        feature: story.feature,
        state: 'in_qa',
        worktreePath: '',
        featureDir: '',
      },
      touchedPathPrefixes: [],
    })

    await this.queue.add(`story-${story.storyId}`, jobData, {
      jobId: `${story.storyId}:review:${attemptNumber}`,
    })

    logger.info('scheduler_dispatched_review', {
      event: 'scheduler_dispatched_review',
      storyId: story.storyId,
      stage: 'review',
      attemptNumber,
    })
  }

  /**
   * AC-5: Dispatch a QA story.
   *
   * DEVIATION FROM F006 (PIPE-2050 AC-14 / ARCH-001):
   * This method does NOT advance KB state before enqueuing. The canonical state
   * machine has no valid intermediate 'qa_dispatching' state between in_qa and
   * completed/failed_qa/blocked. Adding a new state would require a DB migration
   * (out of scope for this story).
   *
   * IDEMPOTENCY FENCE: BullMQ jobId deduplication ('{storyId}:qa:{attempt}')
   * prevents double-dispatch. BullMQ rejects duplicate jobIds on subsequent
   * scheduler polls. This is the idempotency guarantee for MVP.
   *
   * FUTURE FIX: PIPE-2030 will implement proper completion callbacks that advance
   * state out of in_qa. Until then, the QA dispatch branch relies on BullMQ dedup.
   *
   * JobId format: '{storyId}:qa:{attemptNumber}' (ADR APIP-0020 thread ID convention).
   */
  async dispatchQaStory(story: StoryRow, attemptNumber: number): Promise<void> {
    // NOTE: No kb_update_story_status call here — see F006 deviation comment above.

    const jobData = QaJobDataSchema.parse({
      storyId: story.storyId,
      stage: 'qa' as const,
      attemptNumber,
      payload: {
        storyId: story.storyId,
        title: story.title,
        description: story.description ?? '',
        feature: story.feature,
        state: 'in_qa',
      },
      touchedPathPrefixes: [],
    })

    await this.queue.add(`story-${story.storyId}`, jobData, {
      jobId: `${story.storyId}:qa:${attemptNumber}`,
    })

    logger.info('scheduler_dispatched_qa', {
      event: 'scheduler_dispatched_qa',
      storyId: story.storyId,
      stage: 'qa',
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

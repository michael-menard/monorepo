/**
 * Emergency Pipeline Controls (AUDIT-8)
 *
 * Provides pause-all, drain, and per-story quarantine capabilities that must
 * exist before the first automated pipeline run.
 *
 * All functions are callable without a full deployment — they connect to Redis
 * and the KB DB directly via env vars.
 *
 * Functions:
 *   pausePipeline(queue, worker?)  — stops new jobs from being picked up
 *   drainPipeline(queue)           — removes all waiting jobs from the queue
 *   quarantineStory(...)           — blocks a story and removes its queued job
 *
 * AUDIT-8: Emergency Controls
 */

import type { Queue, Worker } from 'bullmq'
import { logger } from '@repo/logger'
import type { StoryCrudDeps } from '@repo/knowledge-base'
import { kb_update_story_status } from '@repo/knowledge-base'

// ─────────────────────────────────────────────────────────────────────────────
// Result types
// ─────────────────────────────────────────────────────────────────────────────

export interface PausePipelineResult {
  queuePaused: boolean
  workerPaused: boolean
}

export interface DrainPipelineResult {
  /** Number of waiting jobs removed from the queue */
  jobsRemoved: number
}

export interface QuarantineStoryResult {
  storyBlocked: boolean
  jobRemoved: boolean
  jobsSearched: number
}

// ─────────────────────────────────────────────────────────────────────────────
// pausePipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pause the BullMQ pipeline queue.
 *
 * Calls `queue.pause()` which is a server-side pause — no new jobs will be
 * picked up by ANY worker connected to this queue. In-flight (active) jobs
 * continue to completion.
 *
 * Optionally pauses the local Worker instance as well (stops it from
 * picking up any stalled jobs if the queue-level pause is delayed).
 *
 * To resume: call `queue.resume()` directly.
 *
 * AUDIT-8 Task 1
 */
export async function pausePipeline(queue: Queue, worker?: Worker): Promise<PausePipelineResult> {
  let queuePaused = false
  let workerPaused = false

  // Queue-level pause: affects all workers connected to this queue
  try {
    await queue.pause()
    queuePaused = true
    logger.info('emergency_pause_queue', {
      event: 'emergency_pause_queue',
      queueName: queue.name,
    })
  } catch (err) {
    logger.error('emergency_pause_queue_failed', {
      event: 'emergency_pause_queue_failed',
      queueName: queue.name,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // Worker-level pause: stops this local worker from picking up additional jobs
  if (worker) {
    try {
      await worker.pause()
      workerPaused = true
      logger.info('emergency_pause_worker', {
        event: 'emergency_pause_worker',
        queueName: queue.name,
      })
    } catch (err) {
      logger.error('emergency_pause_worker_failed', {
        event: 'emergency_pause_worker_failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  logger.warn('pipeline_paused', {
    event: 'pipeline_paused',
    queuePaused,
    workerPaused,
    message: 'No new jobs will be dispatched. Call queue.resume() to restart.',
  })

  return { queuePaused, workerPaused }
}

// ─────────────────────────────────────────────────────────────────────────────
// drainPipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Drain all waiting jobs from the BullMQ queue.
 *
 * Calls `queue.drain()` which removes all waiting (not active) jobs.
 * Active jobs continue to completion. Does NOT affect delayed jobs unless
 * `delayed: true` is passed (default: waiting only).
 *
 * Typical usage: call pausePipeline() first, then drainPipeline() to clear
 * the backlog before a full stop.
 *
 * AUDIT-8 Task 1
 */
export async function drainPipeline(queue: Queue): Promise<DrainPipelineResult> {
  // Count waiting jobs before drain so we can report how many were removed
  let waitingCount = 0
  try {
    waitingCount = await queue.getWaitingCount()
  } catch {
    // Non-fatal — proceed with drain even if count fails
  }

  try {
    await queue.drain()
    logger.warn('pipeline_drained', {
      event: 'pipeline_drained',
      queueName: queue.name,
      jobsRemoved: waitingCount,
    })
    return { jobsRemoved: waitingCount }
  } catch (err) {
    logger.error('emergency_drain_failed', {
      event: 'emergency_drain_failed',
      queueName: queue.name,
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// quarantineStory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Quarantine a story: block it in KB and remove its BullMQ job (if any).
 *
 * Steps:
 * 1. Set story state to 'blocked' in KB with the provided reason.
 *    This automatically prevents re-dispatch — the scheduler only dispatches
 *    stories in `state='ready'` with `blocked_by_story IS NULL`.
 * 2. Search waiting and delayed BullMQ jobs for a job belonging to this story
 *    and remove it so it does not get processed even if the queue is resumed.
 *
 * Note: Active (in-flight) jobs for this story cannot be cancelled here.
 * If the story is currently being processed, it will reach the `complete` node
 * which reads the KB state — finding the story blocked, it will skip state
 * advancement.
 *
 * AUDIT-8 Task 2
 */
export async function quarantineStory(
  kbDeps: StoryCrudDeps,
  queue: Queue,
  storyId: string,
  reason: string,
): Promise<QuarantineStoryResult> {
  let storyBlocked = false
  let jobRemoved = false
  let jobsSearched = 0

  // Step 1: Block story in KB
  try {
    await kb_update_story_status(kbDeps, {
      story_id: storyId,
      blocked_reason: reason,
    })
    storyBlocked = true
    logger.warn('story_quarantined_kb', {
      event: 'story_quarantined_kb',
      storyId,
      reason,
    })
  } catch (err) {
    logger.error('story_quarantine_kb_failed', {
      event: 'story_quarantine_kb_failed',
      storyId,
      error: err instanceof Error ? err.message : String(err),
    })
    // Continue to BullMQ removal even if KB update fails
  }

  // Step 2: Find and remove any waiting/delayed BullMQ job for this story
  try {
    const jobs = await queue.getJobs(['waiting', 'delayed'])
    jobsSearched = jobs.length

    for (const job of jobs) {
      const jobStoryId =
        (job.data?.storyId as string | undefined) ??
        (job.data?.payload?.storyId as string | undefined)

      if (jobStoryId === storyId) {
        try {
          await job.remove()
          jobRemoved = true
          logger.warn('story_quarantine_job_removed', {
            event: 'story_quarantine_job_removed',
            storyId,
            jobId: job.id,
            jobName: job.name,
          })
        } catch (removeErr) {
          logger.error('story_quarantine_job_remove_failed', {
            event: 'story_quarantine_job_remove_failed',
            storyId,
            jobId: job.id,
            error: removeErr instanceof Error ? removeErr.message : String(removeErr),
          })
        }
        // Only remove first match — should be at most one job per story
        break
      }
    }

    if (!jobRemoved) {
      logger.info('story_quarantine_no_job_found', {
        event: 'story_quarantine_no_job_found',
        storyId,
        jobsSearched,
        message: 'No waiting/delayed job found for this story (may be active or already removed)',
      })
    }
  } catch (err) {
    logger.error('story_quarantine_bullmq_failed', {
      event: 'story_quarantine_bullmq_failed',
      storyId,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return { storyBlocked, jobRemoved, jobsSearched }
}

#!/usr/bin/env npx tsx
/**
 * Pipeline CLI
 *
 * Operator tool for querying BullMQ pipeline queue status.
 *
 * Usage:
 *   npx tsx apps/api/pipeline/src/cli/index.ts <command> [options]
 *
 * Commands:
 *   queue status              Show queue job counts (waiting/active/completed/failed/delayed)
 *   queue jobs [--status <s>] List jobs with tabular output; optional --status filter
 *   supervisor status         Show supervisor state (idle/processing) with active/last jobs
 *   graph status              Show job counts grouped by pipeline phase
 *   emergency pause           STOP: pause queue — no new jobs dispatched (active jobs finish)
 *   emergency drain           STOP: drain all waiting jobs from the queue
 *   emergency quarantine <storyId> <reason>  Block a story and remove its queued job
 *
 * Options:
 *   --help                    Print this help message and exit 0
 */

import { z } from 'zod'
import {
  createPipelineConnection,
  createPipelineQueue,
  PIPELINE_QUEUE_NAME,
} from '@repo/pipeline-queue'
import type { PipelinePhase } from '@repo/pipeline-queue'
import { pausePipeline, drainPipeline, quarantineStory } from '../emergency-controls.js'

// ─────────────────────────────────────────────────────────────────────────────
// Help text
// ─────────────────────────────────────────────────────────────────────────────

const HELP_TEXT = `
Pipeline CLI — operator tool for querying BullMQ pipeline queue status.

Usage:
  npx tsx apps/api/pipeline/src/cli/index.ts <command> [options]

Commands:
  queue status              Show queue job counts
  queue jobs [--status <s>] List jobs (optional --status filter: waiting|active|completed|failed|delayed)
  supervisor status         Show supervisor state and recent jobs
  graph status              Show job counts by pipeline phase
  emergency pause           STOP: pause queue — no new jobs dispatched (active jobs finish)
  emergency drain           STOP: drain all waiting jobs from the queue
  emergency quarantine <storyId> <reason>  Block a story and remove its queued job

Emergency controls require REDIS_URL (and KB_DB_PASSWORD for quarantine).

Options:
  --help                    Print this help message and exit 0
`.trim()

const USAGE_TEXT = `
Usage: pipeline-cli <command> [options]
  queue status | queue jobs [--status <s>] | supervisor status | graph status | --help
`.trim()

// ─────────────────────────────────────────────────────────────────────────────
// Utility: get Redis URL from environment
// ─────────────────────────────────────────────────────────────────────────────

function getRedisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379'
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: sanitize Redis URL for safe logging (strips credentials)
// ─────────────────────────────────────────────────────────────────────────────

function sanitizeRedisUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    parsed.username = ''
    parsed.password = ''
    return parsed.toString()
  } catch {
    // If URL parsing fails, return a safe placeholder rather than the raw URL
    return 'redis://<host>:<port>'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: queue status
// ─────────────────────────────────────────────────────────────────────────────

async function cmdQueueStatus(): Promise<void> {
  const redisUrl = getRedisUrl()
  const conn = createPipelineConnection(redisUrl)
  const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)
  try {
    const counts = await pq.bullQueue.getJobCounts(
      'waiting',
      'active',
      'completed',
      'failed',
      'delayed',
    )
    console.log('queue status:')
    console.log(`  waiting:   ${counts.waiting ?? 0}`)
    console.log(`  active:    ${counts.active ?? 0}`)
    console.log(`  completed: ${counts.completed ?? 0}`)
    console.log(`  failed:    ${counts.failed ?? 0}`)
    console.log(`  delayed:   ${counts.delayed ?? 0}`)
  } finally {
    await pq.bullQueue.close()
    await conn.quit()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: queue jobs
// ─────────────────────────────────────────────────────────────────────────────

const JobStatusSchema = z.enum(['waiting', 'active', 'completed', 'failed', 'delayed'])

type JobStatus = z.infer<typeof JobStatusSchema>

async function cmdQueueJobs(statusFilter?: JobStatus): Promise<void> {
  const redisUrl = getRedisUrl()
  const conn = createPipelineConnection(redisUrl)
  const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)
  try {
    const statuses: JobStatus[] = statusFilter
      ? [statusFilter]
      : ['waiting', 'active', 'completed', 'failed', 'delayed']
    const jobs = await pq.bullQueue.getJobs(statuses, 0, 100)

    if (jobs.length === 0) {
      console.log('No jobs found.')
      return
    }

    // Print tabular header
    const header = padRow('jobId', 'storyId', 'phase', 'attempts', 'status', 'age')
    const divider = '-'.repeat(header.length)
    console.log(header)
    console.log(divider)

    const now = Date.now()
    for (const job of jobs) {
      const jobId = String(job.id ?? 'N/A')
      const storyId = job.data?.storyId ?? 'N/A'
      const phase = job.data?.phase ?? 'N/A'
      const attempts = String(job.attemptsMade ?? 0)
      const jobStatus = await job.getState()
      const ageMs = job.timestamp ? now - job.timestamp : 0
      const age = formatAge(ageMs)
      console.log(padRow(jobId, storyId, phase, attempts, jobStatus, age))
    }
  } finally {
    await pq.bullQueue.close()
    await conn.quit()
  }
}

function padRow(
  jobId: string,
  storyId: string,
  phase: string,
  attempts: string,
  status: string,
  age: string,
): string {
  return [
    jobId.padEnd(12),
    storyId.padEnd(16),
    phase.padEnd(16),
    attempts.padEnd(10),
    status.padEnd(12),
    age,
  ].join(' ')
}

function formatAge(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h`
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: supervisor status
// ─────────────────────────────────────────────────────────────────────────────

async function cmdSupervisorStatus(): Promise<void> {
  const redisUrl = getRedisUrl()
  const conn = createPipelineConnection(redisUrl)
  const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)
  try {
    const [activeJobs, completedJobs, failedJobs] = await Promise.all([
      pq.bullQueue.getActive(),
      pq.bullQueue.getCompleted(0, 0),
      pq.bullQueue.getFailed(0, 0),
    ])

    const state = activeJobs.length > 0 ? 'processing' : 'idle'
    console.log(`supervisor state: ${state}`)

    if (activeJobs.length > 0) {
      const active = activeJobs[0]
      const storyId = active.data?.storyId ?? 'N/A'
      const phase = active.data?.phase ?? 'N/A'
      const threadId = (active.data?.metadata as Record<string, unknown> | undefined)?.threadId
      console.log(
        `  active job:  storyId=${storyId}  phase=${phase}  threadId=${threadId ?? 'N/A'}`,
      )
    } else {
      console.log('  active job:  none')
    }

    if (completedJobs.length > 0) {
      const last = completedJobs[0]
      const storyId = last.data?.storyId ?? 'N/A'
      const returnValue = last.returnvalue
      const outcome = returnValue ? JSON.stringify(returnValue).slice(0, 60) : 'N/A'
      console.log(`  last completed: storyId=${storyId}  outcome=${outcome}`)
    } else {
      console.log('  last completed: none')
    }

    if (failedJobs.length > 0) {
      const last = failedJobs[0]
      const storyId = last.data?.storyId ?? 'N/A'
      const reason = last.failedReason ?? 'N/A'
      console.log(`  last failed:    storyId=${storyId}  reason=${reason}`)
    } else {
      console.log('  last failed:    none')
    }
  } finally {
    await pq.bullQueue.close()
    await conn.quit()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Command: graph status
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES: PipelinePhase[] = ['elaboration', 'implementation', 'review', 'qa', 'merge']

async function cmdGraphStatus(): Promise<void> {
  const redisUrl = getRedisUrl()
  const conn = createPipelineConnection(redisUrl)
  const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)
  try {
    const jobs = await pq.bullQueue.getJobs(
      ['waiting', 'active', 'completed', 'failed', 'delayed'],
      0,
      1000,
    )

    // Group by phase
    const counts: Record<PipelinePhase, number> = {
      elaboration: 0,
      'story-creation': 0,
      implementation: 0,
      review: 0,
      qa: 0,
      merge: 0,
    }
    for (const job of jobs) {
      const phase = job.data?.phase
      if (phase && phase in counts) {
        counts[phase as PipelinePhase]++
      }
    }

    console.log('graph status:')
    for (const stage of PIPELINE_STAGES) {
      const count = counts[stage]
      if (stage === 'merge' && count === 0) {
        console.log(`  ${stage.padEnd(16)}: N/A (pending APIP-1070)`)
      } else {
        console.log(`  ${stage.padEnd(16)}: ${count}`)
      }
    }
  } finally {
    await pq.bullQueue.close()
    await conn.quit()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

function handleRedisError(err: unknown): void {
  const msg = err instanceof Error ? err.message : String(err)
  if (msg.includes('ECONNREFUSED') || msg.includes('connect ECONNREFUSED')) {
    const safeUrl = sanitizeRedisUrl(getRedisUrl())
    console.error(`Error: Cannot connect to Redis at ${safeUrl}. Is the pipeline server running?`)
  } else {
    console.error(`Error: ${msg}`)
  }
  process.exit(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// Emergency commands (AUDIT-8)
// ─────────────────────────────────────────────────────────────────────────────

async function cmdEmergencyPause(): Promise<void> {
  const redisUrl = getRedisUrl()
  const conn = createPipelineConnection(redisUrl)
  const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)
  try {
    const result = await pausePipeline(pq.bullQueue)
    console.log('Pipeline paused.')
    console.log(`  queue paused:  ${result.queuePaused}`)
    console.log(`  worker paused: ${result.workerPaused}`)
    console.log('To resume: run `queue.resume()` or restart the supervisor process.')
  } finally {
    await pq.bullQueue.close()
    await conn.quit()
  }
}

async function cmdEmergencyDrain(): Promise<void> {
  const redisUrl = getRedisUrl()
  const conn = createPipelineConnection(redisUrl)
  const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)
  try {
    const result = await drainPipeline(pq.bullQueue)
    console.log('Pipeline drained.')
    console.log(`  waiting jobs removed: ${result.jobsRemoved}`)
  } finally {
    await pq.bullQueue.close()
    await conn.quit()
  }
}

async function cmdEmergencyQuarantine(storyId: string, reason: string): Promise<void> {
  if (!process.env.KB_DB_PASSWORD) {
    console.error(
      'Error: KB_DB_PASSWORD is required for quarantine (needs to update story state in KB)',
    )
    process.exit(1)
  }

  const { getDbClient } = await import('@repo/knowledge-base')
  const kbDeps = { db: getDbClient() }

  const redisUrl = getRedisUrl()
  const conn = createPipelineConnection(redisUrl)
  const pq = createPipelineQueue(conn as any, PIPELINE_QUEUE_NAME)

  try {
    const result = await quarantineStory(kbDeps, pq.bullQueue, storyId, reason)
    console.log(`Story ${storyId} quarantined.`)
    console.log(`  KB blocked:  ${result.storyBlocked}`)
    console.log(`  job removed: ${result.jobRemoved}`)
    console.log(`  jobs searched: ${result.jobsSearched}`)
  } finally {
    await pq.bullQueue.close()
    await conn.quit()
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main dispatcher
// ─────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(HELP_TEXT)
    process.exit(0)
  }

  const [group, subcommand, ...rest] = args

  if (group === 'queue') {
    if (subcommand === 'status') {
      await cmdQueueStatus()
      return
    }
    if (subcommand === 'jobs') {
      const statusIdx = rest.indexOf('--status')
      if (statusIdx !== -1) {
        const rawStatus = rest[statusIdx + 1]
        const parsed = JobStatusSchema.safeParse(rawStatus)
        if (!parsed.success) {
          console.error(
            `Error: Invalid --status value "${rawStatus}". Must be one of: waiting, active, completed, failed, delayed`,
          )
          process.exit(1)
        }
        await cmdQueueJobs(parsed.data)
      } else {
        await cmdQueueJobs()
      }
      return
    }
  }

  if (group === 'supervisor') {
    if (subcommand === 'status') {
      await cmdSupervisorStatus()
      return
    }
  }

  if (group === 'graph') {
    if (subcommand === 'status') {
      await cmdGraphStatus()
      return
    }
  }

  if (group === 'emergency') {
    if (subcommand === 'pause') {
      await cmdEmergencyPause()
      return
    }
    if (subcommand === 'drain') {
      await cmdEmergencyDrain()
      return
    }
    if (subcommand === 'quarantine') {
      const [storyId, ...reasonParts] = rest
      if (!storyId || reasonParts.length === 0) {
        console.error('Usage: emergency quarantine <storyId> <reason>')
        console.error('  Example: emergency quarantine ORCH-2010 "runaway agent detected"')
        process.exit(1)
      }
      await cmdEmergencyQuarantine(storyId, reasonParts.join(' '))
      return
    }
  }

  console.error(`Unknown command: ${args.join(' ')}`)
  console.error(USAGE_TEXT)
  process.exit(1)
}

export { main, handleRedisError }

// Auto-run when executed directly (not imported by tests)
// Vitest sets process.env.VITEST to a truthy value during test runs
if (!process.env.VITEST) {
  main().catch(handleRedisError)
}

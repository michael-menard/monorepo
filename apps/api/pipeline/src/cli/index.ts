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
 *
 * Options:
 *   --help                    Print this help message and exit 0
 */

import {
  createPipelineConnection,
  createPipelineQueue,
  PIPELINE_QUEUE_NAME,
} from '@repo/pipeline-queue'
import type { PipelinePhase } from '@repo/pipeline-queue'

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

type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'

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
    const counts: Record<string, number> = {}
    for (const stage of PIPELINE_STAGES) {
      counts[stage] = 0
    }
    for (const job of jobs) {
      const phase = job.data?.phase
      if (phase && phase in counts) {
        counts[phase]++
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
    const redisUrl = getRedisUrl()
    console.error(`Error: Cannot connect to Redis at ${redisUrl}. Is the pipeline server running?`)
  } else {
    console.error(`Error: ${msg}`)
  }
  process.exit(1)
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
      const statusFilter = statusIdx !== -1 ? (rest[statusIdx + 1] as JobStatus) : undefined
      await cmdQueueJobs(statusFilter)
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

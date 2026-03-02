/**
 * Dep Audit Cron Job
 *
 * Registers the DepAuditCronTask with the APIP-3090 cron infrastructure.
 * Until APIP-3090 ships, the run method is a stub that logs the payload.
 *
 * Fires after any post-merge job that includes a package.json or pnpm-lock.yaml change.
 *
 * Story: APIP-4030 - Dependency Auditor
 *
 * AC-13: registered with cron infrastructure
 * AC-17: DepAuditCronTaskSchema defines the interface contract
 */

import { z } from 'zod'
import { logger } from '@repo/logger'
import type { CronJobDefinition } from '../schemas.js'
import { LOCK_KEYS } from '../constants.js'

// ============================================================================
// DepAuditCronTask Schema (AC-17)
// ============================================================================

/**
 * Payload accepted by the dep audit cron task's run method.
 */
export const DepAuditRunPayloadSchema = z.object({
  storyId: z.string(),
  changedFiles: z.array(z.string()),
  commitSha: z.string(),
})

export type DepAuditRunPayload = z.infer<typeof DepAuditRunPayloadSchema>

/**
 * DepAuditCronTask Zod schema.
 *
 * Defines the contract for the dep audit cron task:
 * - taskId: unique identifier
 * - trigger: 'post-merge' — fires after a merge that changes package dependencies
 * - changedFilesFilter: files that must be present in changedFiles to trigger this task
 * - run: accepts { storyId, changedFiles, commitSha }, returns Promise<void>
 *
 * The run method is validated structurally via z.function().
 * TypeScript enforces the full signature at compile time.
 */
export const DepAuditCronTaskSchema = z.object({
  taskId: z.string().min(1),
  trigger: z.literal('post-merge'),
  changedFilesFilter: z.array(z.string()).default(['package.json', 'pnpm-lock.yaml']),
  run: z.function().args(DepAuditRunPayloadSchema).returns(z.promise(z.void())),
})

export type DepAuditCronTask = z.infer<typeof DepAuditCronTaskSchema>

// ============================================================================
// Task Implementation
// ============================================================================

/**
 * Dep audit cron task implementation.
 *
 * STUB: Until APIP-3090 ships, the run method logs the payload via @repo/logger.
 * Wire to runDepAudit() when APIP-3090 cron infrastructure is available.
 */
export const depAuditCronTask: Omit<DepAuditCronTask, 'run'> & {
  run: (payload: DepAuditRunPayload) => Promise<void>
} = {
  taskId: 'dep-audit',
  trigger: 'post-merge',
  changedFilesFilter: ['package.json', 'pnpm-lock.yaml'],

  async run(payload: DepAuditRunPayload): Promise<void> {
    const validatedPayload = DepAuditRunPayloadSchema.parse(payload)

    // Check if any of the changed files match the filter
    const matchingFiles = validatedPayload.changedFiles.filter(f =>
      depAuditCronTask.changedFilesFilter.some(
        pattern => f === pattern || f.endsWith(`/${pattern}`),
      ),
    )

    if (matchingFiles.length === 0) {
      logger.debug('dep-audit.job: no matching changed files, skipping', {
        storyId: validatedPayload.storyId,
        commitSha: validatedPayload.commitSha,
        changedFiles: validatedPayload.changedFiles,
      })
      return
    }

    // STUB: Log payload until APIP-3090 cron infrastructure is wired
    logger.info('dep-audit.job: would run dep audit (APIP-3090 stub)', {
      taskId: depAuditCronTask.taskId,
      storyId: validatedPayload.storyId,
      commitSha: validatedPayload.commitSha,
      matchingFiles,
      lockKey: LOCK_KEYS.DEP_AUDIT,
      message: 'Wire to runDepAudit() when APIP-3090 cron infrastructure is available',
    })

    // TODO (APIP-3090): Replace stub with:
    // const db = getDepAuditDbClient()
    // await runDepAudit({
    //   storyId: validatedPayload.storyId,
    //   commitSha: validatedPayload.commitSha,
    //   prevSnapshot: ..., // load from git
    //   currentSnapshot: ..., // load from workspace
    //   workspaceRoot: process.cwd(),
    // }, db)
  },
}

// ============================================================================
// CronJobDefinition Registration
// ============================================================================

/**
 * Dep audit cron job definition for APIP-3090 scheduler.
 *
 * Schedule: every 30 minutes (covers post-merge window)
 * Timeout: 10 minutes
 * Lock: PostgreSQL advisory lock (LOCK_KEYS.DEP_AUDIT = 42002)
 *
 * STUB: runFn logs payload until APIP-3090 + real DB wiring is complete.
 */
export const depAuditJob: CronJobDefinition = {
  jobName: 'dep-audit',
  schedule: '*/30 * * * *',
  timeoutMs: 10 * 60 * 1000,
  runFn: async () => {
    logger.info(
      'dep-audit.cron: triggered (APIP-3090 stub — no payload context in scheduled run)',
      {
        lockKey: LOCK_KEYS.DEP_AUDIT,
        message:
          'Post-merge trigger via depAuditCronTask.run() is the primary invocation path; ' +
          'scheduled run is a fallback for missed triggers',
      },
    )
  },
}

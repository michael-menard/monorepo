/**
 * PipelineSupervisor
 *
 * Plain TypeScript supervisor process that consumes jobs from the BullMQ work queue
 * and dispatches to the appropriate LangGraph worker graph.
 *
 * NOT a Lambda handler. Runs as a long-lived Node.js process (APIP-ADR-001 Decision 4).
 * No LangGraph graph — dispatcher pattern only (APIP-ADR-001 Decision 2).
 *
 * APIP-0020: Supervisor Loop (Plain TypeScript)
 * APIP-2030: Graceful Shutdown, Health Check, and Deployment Hardening
 * APIP-2010: Blocker Notification wiring (Worker event listeners, onCircuitOpen callback)
 */

import { Worker, type Job } from 'bullmq'
import { Redis } from 'ioredis'
import { logger } from '@repo/logger'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import {
  PipelineJobDataSchema,
  type PipelineSupervisorConfig,
  PipelineSupervisorConfigSchema,
} from './__types__/index.js'
import { dispatchJob, getCircuitBreakerSummary } from './dispatch-router.js'
import { createHealthServer, type HealthServer } from './health/server.js'
import { registerDrainHandlers } from './drain/index.js'
import { createBlockerNotificationModule } from './blocker-notification/index.js'

// Use ioredis Redis type directly — same underlying type as RedisClient in lego-api
export type RedisClient = Redis

// Re-export config type for external use
export type { PipelineSupervisorConfig }

/**
 * PipelineSupervisor wraps a BullMQ Worker with graceful lifecycle management.
 *
 * APIP-0020:
 *   AC-1: Exports start() and stop(); stop() triggers graceful BullMQ Worker shutdown.
 *   AC-2: BullMQ Worker with concurrency:1.
 *
 * APIP-2030:
 *   AC-1: SIGTERM → drain mode → clean exit (process.exit(0)) or timeout exit (process.exit(1)).
 *   AC-3: GET /health returns 200 with health JSON.
 *   AC-4: GET /health returns draining:true during drain.
 *   AC-5: GET /live returns 200 while process is alive.
 *   AC-5: Health server lifecycle — starts before BullMQ Worker, stops after Worker.close().
 *   AC-6: SIGINT triggers identical drain behavior to SIGTERM.
 *
 * APIP-2010:
 *   AC-9: Worker 'failed' and 'completed' event listeners registered in start().
 *   AC-11: Webhook calls are fire-and-forget (not awaited from drain path).
 *
 * Usage:
 *   const supervisor = new PipelineSupervisor(redisClient, config)
 *   await supervisor.start()
 *   // on SIGTERM: drain() is called automatically
 */
export class PipelineSupervisor {
  private worker: Worker | null = null
  private readonly redisClient: RedisClient
  private readonly config: PipelineSupervisorConfig

  private readonly db: NodePgDatabase<any> | null

  // APIP-2030: Drain mode state
  private _draining = false
  private _activeJobs = 0
  private readonly startTimeMs: number

  // APIP-2030: Health server
  private healthServer: HealthServer | null = null

  constructor(
    redisClient: RedisClient,
    config: Partial<PipelineSupervisorConfig> = {},

    db: NodePgDatabase<any> | null = null,
  ) {
    this.redisClient = redisClient
    this.config = PipelineSupervisorConfigSchema.parse(config)
    this.db = db
    this.startTimeMs = Date.now()

    // Warn if drain timeout < stage timeout (APIP-2030 risk)
    if (this.config.drainTimeoutMs < this.config.stageTimeoutMs) {
      logger.warn('drain_timeout_lt_stage_timeout', {
        event: 'drain_timeout_lt_stage_timeout',
        drainTimeoutMs: this.config.drainTimeoutMs,
        stageTimeoutMs: this.config.stageTimeoutMs,
        warning:
          'drainTimeoutMs is less than stageTimeoutMs — in-flight jobs may be aborted mid-execution on SIGTERM',
      })
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // APIP-2030: Active job tracking accessors
  // ─────────────────────────────────────────────────────────────────────────

  get activeJobCount(): number {
    return this._activeJobs
  }

  get isDraining(): boolean {
    return this._draining
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Start the supervisor. Idempotent — calling twice does nothing (AC-2/ED-2).
   *
   * APIP-2030: Health server starts BEFORE BullMQ Worker (HP-6).
   * APIP-2030: Registers SIGTERM/SIGINT drain handlers (idempotent).
   * APIP-2010: Registers Worker 'failed' and 'completed' event listeners for blocker tracking.
   */
  async start(): Promise<void> {
    // AC-2/ED-2: idempotency guard — do not create a second Worker if already started
    if (this.worker !== null) {
      logger.info('PipelineSupervisor already started — ignoring duplicate start()', {
        queueName: this.config.queueName,
      })
      return
    }

    logger.info('PipelineSupervisor starting', {
      queueName: this.config.queueName,
      stageTimeoutMs: this.config.stageTimeoutMs,
      drainTimeoutMs: this.config.drainTimeoutMs,
      healthPort: this.config.healthPort,
      circuitBreakerFailureThreshold: this.config.circuitBreakerFailureThreshold,
    })

    // APIP-2030 AC-5, HP-6: Start health server BEFORE BullMQ Worker
    this.healthServer = createHealthServer(this.config.healthPort, () => ({
      draining: this._draining,
      activeJobs: this._activeJobs,
      circuitBreakerState: getCircuitBreakerSummary(this.config),
      startTimeMs: this.startTimeMs,
    }))
    await this.healthServer.start()

    // APIP-2010: Create BlockerNotificationModule if db is available
    const notificationModule =
      this.db !== null ? createBlockerNotificationModule(this.db, this.config) : null

    // AC-2: concurrency: 1 enforces single-story-at-a-time constraint (Phase 0)
    this.worker = new Worker(
      this.config.queueName,
      async (job: Job) => {
        await this.processJob(job)
      },
      {
        connection: this.redisClient as any,
        concurrency: 1,
      },
    )

    this.worker.on('completed', job => {
      logger.info('Worker job completed', { jobId: job.id })

      // APIP-2010 AC-4, AC-9: Resolve blocker on successful completion (fire-and-forget)
      if (notificationModule !== null) {
        const storyId = job.data?.storyId as string | undefined
        if (storyId) {
          notificationModule.resolveBlocker(storyId).catch(err => {
            logger.warn('blocker_resolve_failed', {
              event: 'blocker_resolve_failed',
              storyId,
              error: err instanceof Error ? err.message : String(err),
            })
          })
        }
      }
    })

    this.worker.on('failed', (job, error) => {
      logger.error('Worker job failed', {
        jobId: job?.id,
        error: error instanceof Error ? error.message : String(error),
      })

      // APIP-2010 AC-1, AC-2, AC-9: Insert blocker on PERMANENT failure (fire-and-forget)
      // Only insert on final failure (attemptsMade >= maxAttempts), not transient retries
      if (notificationModule !== null && job !== undefined) {
        const storyId = job.data?.storyId as string | undefined
        const isFinalFailure = job.attemptsMade >= (job.opts?.attempts ?? 1)

        if (storyId && isFinalFailure) {
          notificationModule.insertBlocker(storyId, error, job.data).catch(err => {
            logger.warn('blocker_insert_failed', {
              event: 'blocker_insert_failed',
              storyId,
              error: err instanceof Error ? err.message : String(err),
            })
          })
        }
      }
    })

    this.worker.on('error', error => {
      logger.error('Worker error', {
        error: error instanceof Error ? error.message : String(error),
      })
    })

    // APIP-2030 AC-1, AC-2, AC-6: Register idempotent SIGTERM/SIGINT drain handlers
    registerDrainHandlers({
      pauseWorker: async () => {
        if (this.worker) await this.worker.pause()
      },
      closeWorker: async () => {
        await this.stop()
      },
      stopHealthServer: async () => {
        if (this.healthServer) await this.healthServer.stop()
      },
      getActiveJobCount: () => this._activeJobs,
      drainTimeoutMs: this.config.drainTimeoutMs,
    })

    this._draining = false

    logger.info('PipelineSupervisor started', { queueName: this.config.queueName })
  }

  /**
   * Stop the supervisor gracefully.
   * Waits for the active job to complete before shutting down (AC-1).
   *
   * Note: APIP-2030 drain() calls stop() internally after waiting for in-flight jobs.
   * This method is also available for explicit teardown in tests.
   */
  async stop(): Promise<void> {
    if (this.worker === null) {
      logger.info('PipelineSupervisor not running — nothing to stop')
      return
    }

    logger.info('PipelineSupervisor stopping...', { queueName: this.config.queueName })

    await this.worker.close()
    this.worker = null

    logger.info('PipelineSupervisor stopped')
  }

  /**
   * Enter drain mode.
   *
   * Sets draining flag immediately (reflected in GET /health) then delegates
   * to the drain state machine which handles timeouts and process.exit().
   *
   * APIP-2030 AC-1: Triggered by SIGTERM via registerDrainHandlers().
   */
  enterDrainMode(): void {
    this._draining = true
    logger.info('drain_mode_activated', {
      event: 'drain_mode_activated',
      activeJobs: this._activeJobs,
    })
  }

  /**
   * Process a single BullMQ job. Delegates to dispatch router.
   *
   * APIP-2030: Tracks active job count for drain mode.
   * APIP-2010: Passes onCircuitOpen callback to dispatchJob().
   */
  private async processJob(job: Job): Promise<void> {
    // APIP-2030: Increment active job counter
    this._activeJobs++

    // APIP-2010: Create BlockerNotificationModule if db is available (for onCircuitOpen)
    const notificationModule =
      this.db !== null ? createBlockerNotificationModule(this.db, this.config) : null

    try {
      // Validate job payload with Zod before dispatching (AC-2)
      const parseResult = PipelineJobDataSchema.safeParse(job.data)

      if (!parseResult.success) {
        logger.error('Invalid job payload — Zod validation failed', {
          jobId: job.id,
          error: parseResult.error.message,
          data: job.data,
        })
        // Re-throw ZodError so BullMQ marks job as failed (PERMANENT — AC-7)
        throw parseResult.error
      }

      // APIP-2010 AC-3, AC-9: Pass onCircuitOpen callback to dispatchJob (fire-and-forget)
      const onCircuitOpen =
        notificationModule !== null
          ? (stage: string, storyId: string) => {
              notificationModule.insertDependencyBlocker(storyId, stage).catch(err => {
                logger.warn('circuit_blocker_insert_failed', {
                  event: 'circuit_blocker_insert_failed',
                  storyId,
                  stage,
                  error: err instanceof Error ? err.message : String(err),
                })
              })
            }
          : undefined

      await dispatchJob(job, parseResult.data, this.config, undefined, onCircuitOpen)
    } finally {
      // APIP-2030: Always decrement, even on error
      this._activeJobs = Math.max(0, this._activeJobs - 1)
    }
  }

  /**
   * Returns the underlying BullMQ Worker (for testing purposes).
   */
  getWorker(): Worker | null {
    return this.worker
  }

  /**
   * Returns the health server instance (for testing purposes).
   */
  getHealthServer(): HealthServer | null {
    return this.healthServer
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Standalone Process Entry Point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Redis client with production-ready settings.
 *
 * ARCH-002: Modeled on apps/api/lego-api/core/cache/redis-client.ts pattern.
 */
let _redisInstance: Redis | null = null

export function getOrCreateRedisClient(): Redis {
  const url = process.env.REDIS_URL
  if (!url) {
    throw new Error(
      'PipelineSupervisor: Redis unavailable — REDIS_URL environment variable not set',
    )
  }

  if (!_redisInstance) {
    _redisInstance = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 2000,
      lazyConnect: false,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 100, 2000)
        logger.info('Redis connection retry', { attempt: times, delayMs: delay })
        return delay
      },
    })

    _redisInstance.on('connect', () => logger.info('Redis connected'))
    _redisInstance.on('ready', () => logger.info('Redis ready'))
    _redisInstance.on('error', err => logger.error('Redis error', { error: err.message }))
    _redisInstance.on('close', () => logger.info('Redis connection closed'))
    _redisInstance.on('reconnecting', () => logger.info('Redis reconnecting'))
  }

  return _redisInstance
}

/**
 * Bootstrap the supervisor as a standalone Node.js process.
 *
 * APIP-2030: Health server and drain handlers are registered by supervisor.start().
 * APIP-2010: Reads notification env vars and passes to config.
 */
export async function bootstrap(): Promise<void> {
  const redisClient = getOrCreateRedisClient()

  const supervisor = new PipelineSupervisor(redisClient, {
    queueName: process.env.PIPELINE_QUEUE_NAME ?? 'pipeline',
    stageTimeoutMs: process.env.PIPELINE_STAGE_TIMEOUT_MS
      ? parseInt(process.env.PIPELINE_STAGE_TIMEOUT_MS, 10)
      : undefined,
    drainTimeoutMs: process.env.SUPERVISOR_DRAIN_TIMEOUT_MS
      ? parseInt(process.env.SUPERVISOR_DRAIN_TIMEOUT_MS, 10)
      : undefined,
    healthPort: process.env.SUPERVISOR_HEALTH_PORT
      ? parseInt(process.env.SUPERVISOR_HEALTH_PORT, 10)
      : undefined,
    // APIP-2010 AC-8: Notification config from env vars
    webhookUrl: process.env.PIPELINE_NOTIFICATION_WEBHOOK_URL ?? undefined,
    slackToken: process.env.NOTIFICATION_SLACK_TOKEN ?? undefined,
    notificationThreshold: process.env.PIPELINE_NOTIFICATION_THRESHOLD
      ? parseInt(process.env.PIPELINE_NOTIFICATION_THRESHOLD, 10)
      : undefined,
  })

  await supervisor.start()

  logger.info('PipelineSupervisor bootstrap complete — waiting for jobs')
}

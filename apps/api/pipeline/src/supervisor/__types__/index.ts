/**
 * Supervisor Job Payload Schemas
 *
 * Zod-first schemas for BullMQ job payloads consumed by PipelineSupervisor.
 * Each job encodes the story object at enqueue time (producer responsibility, AC-13).
 *
 * APIP-0020: Supervisor Loop (Plain TypeScript)
 * APIP-2030: Added drainTimeoutMs and healthPort config fields
 * APIP-2010: Added webhookUrl, slackToken, notificationThreshold notification config fields
 */

import { z } from 'zod'
import { ConcurrencyConfigSchema, DEFAULT_CONCURRENCY_CONFIG } from './concurrency-config.js'

// ─────────────────────────────────────────────────────────────────────────────
// Re-export job payload schemas from @repo/pipeline-queue (canonical source).
// F002: pipeline-queue is now the single source of truth for job schemas.
// ─────────────────────────────────────────────────────────────────────────────

export {
  PipelineJobDataSchema,
  ElaborationJobDataSchema,
  StoryCreationJobDataSchema,
  ImplementationJobDataSchema,
  ReviewJobDataSchema,
  QaJobDataSchema,
  StorySnapshotPayloadSchema,
} from '@repo/pipeline-queue'

export type {
  PipelineJobData,
  ElaborationJobData,
  StoryCreationJobData,
  ImplementationJobData,
  ReviewJobData,
  QaJobData,
  StorySnapshotPayload,
} from '@repo/pipeline-queue'

// ─────────────────────────────────────────────────────────────────────────────
// Local payload type aliases (preserved for dispatch-router internal use)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Minimal SynthesizedStory shape required by runElaboration().
 * Full type is from packages/backend/orchestrator/src/nodes/story/synthesize.ts.
 */
export const SynthesizedStoryPayloadSchema = z
  .object({
    storyId: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    domain: z.string().min(1),
    synthesizedAt: z.string().datetime(),
    acceptanceCriteria: z.array(z.unknown()).default([]),
    readinessScore: z.number().int().min(0).max(100),
    isReady: z.boolean(),
  })
  .passthrough()

export type SynthesizedStoryPayload = z.infer<typeof SynthesizedStoryPayloadSchema>

/**
 * Minimal StoryRequest shape required by runStoryCreation().
 * Full type is from packages/backend/orchestrator/src/nodes/story/seed.ts.
 */
export const StoryRequestPayloadSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().min(1),
    domain: z.string().min(1),
    tags: z.array(z.string()).default([]),
  })
  .passthrough()

export type StoryRequestPayload = z.infer<typeof StoryRequestPayloadSchema>

// ─────────────────────────────────────────────────────────────────────────────
// Supervisor Configuration Schema
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Configuration for PipelineSupervisor.
 */
export const PipelineSupervisorConfigSchema = z.object({
  /** BullMQ queue name — injected to avoid coupling to APIP-0010 constant */
  queueName: z.string().min(1).default('pipeline'),
  /** Wall clock timeout for graph execution in ms (default: 10 minutes) */
  stageTimeoutMs: z.number().int().positive().default(600_000),
  /** Circuit breaker failure threshold before opening */
  circuitBreakerFailureThreshold: z.number().int().min(1).default(3),
  /** Circuit breaker recovery timeout in ms */
  circuitBreakerRecoveryTimeoutMs: z.number().int().min(0).default(30_000),
  /**
   * Maximum time to wait for in-flight jobs to drain on SIGTERM (ms).
   * APIP-2030 AC-1: Default 600_000ms (matches stageTimeoutMs so a running job
   * can complete before the supervisor exits).
   * Set via SUPERVISOR_DRAIN_TIMEOUT_MS env var.
   */
  drainTimeoutMs: z.number().int().positive().default(600_000),
  /**
   * Port for the health HTTP server (GET /health, GET /live).
   * APIP-2030 AC-3, AC-5: Default 9091 (confirmed free in compose environment).
   * Set via SUPERVISOR_HEALTH_PORT env var.
   */
  healthPort: z.number().int().min(1).max(65535).default(9091),
  /**
   * Webhook URL for blocker notifications (HTTP POST on PERMANENT failure or circuit OPEN).
   * APIP-2010 AC-7, AC-8: Optional. Set via PIPELINE_NOTIFICATION_WEBHOOK_URL env var.
   * If absent, no webhook calls are made.
   */
  webhookUrl: z.string().url().optional(),
  /**
   * Slack token for future Slack notification integration.
   * APIP-2010 AC-8: Reserved for future use — implementation is webhook-only for MVP.
   * Set via NOTIFICATION_SLACK_TOKEN env var.
   */
  slackToken: z.string().optional(),
  /**
   * Minimum number of active blockers before a notification is sent.
   * APIP-2010 AC-8: Reserved for future threshold-based notification suppression.
   * Default: 1 (notify on every blocker).
   */
  notificationThreshold: z.number().int().min(1).optional(),
  /**
   * APIP-3080: Absolute path to git repository root for worktree creation.
   * Required when concurrency.maxWorktrees > 1. Optional for serial mode.
   */
  repoRoot: z.string().min(1).optional(),
  /**
   * APIP-3080: Concurrency configuration for parallel worktree dispatch.
   * Default maxWorktrees:1 preserves APIP-0020 serial behavior (AC-12).
   */
  concurrency: ConcurrencyConfigSchema.default(DEFAULT_CONCURRENCY_CONFIG).optional(),
})

export type PipelineSupervisorConfig = z.infer<typeof PipelineSupervisorConfigSchema>

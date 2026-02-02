/**
 * idempotency.ts
 *
 * Schemas for idempotency modes and phase locking to prevent
 * concurrent execution and define re-run behavior.
 *
 * @module utils/idempotency
 */

import { z } from 'zod'

// ============================================================================
// Idempotency Modes
// ============================================================================

/**
 * Idempotency modes for command execution.
 */
export const IdempotencyModeSchema = z.enum([
  'error',    // Fail if already complete
  'skip',     // Skip if already complete (no error)
  'resume',   // Auto-detect and resume from last checkpoint
  'rerun',    // Always re-run (for checks that should always execute)
  'force',    // Force overwrite existing artifacts
])

export type IdempotencyMode = z.infer<typeof IdempotencyModeSchema>

/**
 * Default idempotency mode per command.
 */
export const COMMAND_IDEMPOTENCY_DEFAULTS: Record<string, IdempotencyMode> = {
  '/pm-story generate': 'error',
  '/elab-story': 'skip',
  '/dev-implement-story': 'resume',
  '/dev-code-review': 'rerun',
  '/qa-verify-story': 'skip',
  '/qa-gate': 'rerun',
  '/wt-finish': 'error',
}

// ============================================================================
// Idempotency Configuration
// ============================================================================

/**
 * Idempotency configuration for a command execution.
 */
export const IdempotencyConfigSchema = z.object({
  /** Idempotency mode */
  mode: IdempotencyModeSchema.default('resume'),

  /** Lock timeout in milliseconds (default: 1 hour) */
  lockTimeoutMs: z.number().int().min(0).default(3600000),

  /** Whether to check for stale locks */
  checkStaleLocks: z.boolean().default(true),

  /** Age in ms after which a lock is considered stale */
  staleLockAgeMs: z.number().int().min(0).default(3600000),

  /** Force flag from command line */
  forceOverwrite: z.boolean().default(false),
})

export type IdempotencyConfig = z.infer<typeof IdempotencyConfigSchema>

// ============================================================================
// Phase Lock
// ============================================================================

/**
 * Phase lock written to _implementation/.phase-lock
 */
export const PhaseLockSchema = z.object({
  /** Phase being executed */
  phase: z.string().min(1),

  /** Command that acquired the lock */
  command: z.string().min(1),

  /** ISO timestamp when lock was acquired */
  startedAt: z.string().datetime(),

  /** Process ID (optional, for debugging) */
  pid: z.number().int().optional(),

  /** Hostname (optional, for distributed systems) */
  host: z.string().optional(),

  /** Session ID (optional, for tracking) */
  sessionId: z.string().optional(),

  /** Expected duration in ms (optional, for timeout estimation) */
  expectedDurationMs: z.number().int().min(0).optional(),
})

export type PhaseLock = z.infer<typeof PhaseLockSchema>

// ============================================================================
// Idempotency Check Result
// ============================================================================

/**
 * Result of an idempotency check.
 */
export const IdempotencyCheckResultSchema = z.object({
  /** Recommended action */
  action: z.enum(['proceed', 'skip', 'error', 'resume']),

  /** Reason for the action */
  reason: z.string(),

  /** Existing artifacts found */
  existingArtifacts: z.array(z.string()).optional(),

  /** Active lock if found */
  activeLock: PhaseLockSchema.optional(),

  /** Checkpoint to resume from (if action is 'resume') */
  resumeCheckpoint: z.string().optional(),

  /** Whether force flag would override this result */
  overridableWithForce: z.boolean(),
})

export type IdempotencyCheckResult = z.infer<typeof IdempotencyCheckResultSchema>

// ============================================================================
// Command Behavior Table
// ============================================================================

/**
 * Documents idempotency behavior for each command.
 */
export const COMMAND_IDEMPOTENCY_BEHAVIOR: Record<
  string,
  {
    ifComplete: string
    defaultMode: IdempotencyMode
    forceFlag: string
    artifacts: string[]
  }
> = {
  '/pm-story generate': {
    ifComplete: 'ERROR: "Story already exists. Use --force to overwrite."',
    defaultMode: 'error',
    forceFlag: '--force',
    artifacts: ['STORY-XXX.md', '_pm/TEST-PLAN.md', '_pm/DEV-FEASIBILITY.md'],
  },
  '/elab-story': {
    ifComplete: 'SKIP: "Already elaborated. Use --force to re-run."',
    defaultMode: 'skip',
    forceFlag: '--force',
    artifacts: ['ELAB-STORY-XXX.md', '_implementation/ANALYSIS.md'],
  },
  '/dev-implement-story': {
    ifComplete: 'RESUME: Auto-detect stage, continue from there',
    defaultMode: 'resume',
    forceFlag: '--force (restart from scratch)',
    artifacts: ['CHECKPOINT.md', 'PROOF-STORY-XXX.md', 'VERIFICATION.yaml'],
  },
  '/dev-code-review': {
    ifComplete: 'RE-RUN: Always re-runs (code may have changed)',
    defaultMode: 'rerun',
    forceFlag: 'N/A (always re-runs)',
    artifacts: ['VERIFICATION.yaml'],
  },
  '/qa-verify-story': {
    ifComplete: 'SKIP: "Already verified."',
    defaultMode: 'skip',
    forceFlag: '--force',
    artifacts: ['VERIFICATION.yaml (qa_verify section)'],
  },
  '/qa-gate': {
    ifComplete: 'RE-RUN: Always re-runs (may have new evidence)',
    defaultMode: 'rerun',
    forceFlag: 'N/A (always re-runs)',
    artifacts: ['QA-GATE-STORY-XXX.yaml'],
  },
  '/wt-finish': {
    ifComplete: 'ERROR: "Already merged."',
    defaultMode: 'error',
    forceFlag: 'N/A (cannot force merge twice)',
    artifacts: [],
  },
}

// ============================================================================
// Check Functions
// ============================================================================

/**
 * Checks idempotency for a command execution.
 */
export function checkIdempotency(params: {
  command: string
  storyPath: string
  phase: string
  config?: Partial<IdempotencyConfig>
  existingArtifacts?: string[]
  activeLock?: PhaseLock | null
  checkpoint?: string | null
}): IdempotencyCheckResult {
  const {
    command,
    existingArtifacts = [],
    activeLock,
    checkpoint,
  } = params

  const config = IdempotencyConfigSchema.parse(params.config ?? {})
  const defaultMode = COMMAND_IDEMPOTENCY_DEFAULTS[command] ?? 'resume'
  const effectiveMode = config.forceOverwrite ? 'force' : (config.mode ?? defaultMode)

  // Check for active lock
  if (activeLock) {
    const lockAge = Date.now() - new Date(activeLock.startedAt).getTime()
    const isStale = config.checkStaleLocks && lockAge > config.staleLockAgeMs

    if (!isStale) {
      return IdempotencyCheckResultSchema.parse({
        action: 'error',
        reason: `Phase "${activeLock.phase}" is currently in progress (started ${formatDuration(lockAge)} ago)`,
        activeLock,
        overridableWithForce: false,
      })
    }
  }

  // Check for existing artifacts
  const hasArtifacts = existingArtifacts.length > 0

  if (!hasArtifacts) {
    return IdempotencyCheckResultSchema.parse({
      action: 'proceed',
      reason: 'No existing artifacts found, proceeding with execution',
      overridableWithForce: false,
    })
  }

  // Determine action based on mode
  switch (effectiveMode) {
    case 'error':
      return IdempotencyCheckResultSchema.parse({
        action: 'error',
        reason: 'Artifacts already exist. Use --force to overwrite.',
        existingArtifacts,
        overridableWithForce: true,
      })

    case 'skip':
      return IdempotencyCheckResultSchema.parse({
        action: 'skip',
        reason: 'Already complete, skipping execution',
        existingArtifacts,
        overridableWithForce: true,
      })

    case 'resume':
      return IdempotencyCheckResultSchema.parse({
        action: 'resume',
        reason: checkpoint
          ? `Resuming from checkpoint: ${checkpoint}`
          : 'Resuming from existing artifacts',
        existingArtifacts,
        resumeCheckpoint: checkpoint ?? undefined,
        overridableWithForce: true,
      })

    case 'rerun':
      return IdempotencyCheckResultSchema.parse({
        action: 'proceed',
        reason: 'Re-running (artifacts will be updated)',
        existingArtifacts,
        overridableWithForce: false,
      })

    case 'force':
      return IdempotencyCheckResultSchema.parse({
        action: 'proceed',
        reason: 'Force flag set, overwriting existing artifacts',
        existingArtifacts,
        overridableWithForce: false,
      })
  }
}

/**
 * Creates a phase lock.
 */
export function createPhaseLock(params: {
  phase: string
  command: string
  sessionId?: string
  expectedDurationMs?: number
}): PhaseLock {
  return PhaseLockSchema.parse({
    phase: params.phase,
    command: params.command,
    startedAt: new Date().toISOString(),
    pid: typeof process !== 'undefined' ? process.pid : undefined,
    host: typeof process !== 'undefined' ? (process.env.HOSTNAME ?? process.env.HOST) : undefined,
    sessionId: params.sessionId,
    expectedDurationMs: params.expectedDurationMs,
  })
}

/**
 * Checks if a lock is stale.
 */
export function isLockStale(lock: PhaseLock, maxAgeMs: number = 3600000): boolean {
  const lockAge = Date.now() - new Date(lock.startedAt).getTime()
  return lockAge > maxAgeMs
}

/**
 * Formats duration in human-readable format.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m`
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`
}

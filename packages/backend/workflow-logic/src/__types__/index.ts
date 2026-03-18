/**
 * Canonical type definitions for workflow-logic package.
 *
 * WorkflowStoryStatus: 17-value hyphenated model (source of truth for agent/orchestrator layer)
 * DbStoryStatus: canonical 13-state snake_case model (maps to database storage)
 *
 * @module __types__
 */

import { z } from 'zod'

// ============================================================================
// WorkflowStoryStatus — 17-value hyphenated model
// Source: packages/backend/orchestrator/src/state/story-state-machine.ts
// ============================================================================

/**
 * All possible story statuses in the workflow layer.
 * These are the canonical hyphenated values used by agents and orchestrators.
 */
export const WorkflowStoryStatusSchema = z.enum([
  // Backlog statuses
  'pending',
  'generated',

  // Elaboration statuses
  'in-elaboration',
  'needs-refinement',
  'needs-split',

  // Ready for development
  'ready-to-work',

  // Development statuses
  'in-progress',
  'ready-for-code-review',
  'code-review-failed',

  // QA statuses
  'ready-for-qa',
  'in-qa',
  'needs-work',
  'uat',

  // Terminal statuses
  'completed',
  'blocked',
  'cancelled',
  'superseded',
])

export type WorkflowStoryStatus = z.infer<typeof WorkflowStoryStatusSchema>

// ============================================================================
// DbStoryStatus — canonical 13-state snake_case model
// Source: packages/backend/orchestrator/src/state/enums/story-state.ts
// ============================================================================

/**
 * Story status values as stored in the database.
 * These are the canonical snake_case values used by the DB layer.
 */
export const DbStoryStatusSchema = z.enum([
  // Pre-development
  'backlog',
  'created',
  'elab',
  'ready',
  // Development
  'in_progress',
  'needs_code_review',
  // QA
  'ready_for_qa',
  'in_qa',
  'completed',
  // Recovery
  'failed_code_review',
  'failed_qa',
  // Operational
  'blocked',
  'cancelled',
])

export type DbStoryStatus = z.infer<typeof DbStoryStatusSchema>

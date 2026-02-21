/**
 * Canonical type definitions for workflow-logic package.
 *
 * WorkflowStoryStatus: 17-value hyphenated model (source of truth for agent/orchestrator layer)
 * DbStoryStatus: 8-value snake_case model (maps to database storage)
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
// DbStoryStatus — 8-value snake_case model
// Source: packages/backend/mcp-tools/src/story-management/__types__/index.ts
// ============================================================================

/**
 * Story status values as stored in the database.
 * These are the snake_case values used by the DB layer.
 */
export const DbStoryStatusSchema = z.enum([
  'backlog',
  'ready_to_work',
  'in_progress',
  'ready_for_qa',
  'in_qa',
  'blocked',
  'done',
  'cancelled',
])

export type DbStoryStatus = z.infer<typeof DbStoryStatusSchema>

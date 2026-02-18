/**
 * Status adapter: maps WorkflowStoryStatus (17-value hyphenated) to
 * DbStoryStatus (8-value snake_case) for database persistence.
 *
 * This is a pure total function — every WorkflowStoryStatus maps to
 * exactly one DbStoryStatus.
 *
 * @module adapter
 */

import {
  WorkflowStoryStatusSchema,
  DbStoryStatusSchema,
  type WorkflowStoryStatus,
  type DbStoryStatus,
} from '../__types__/index.js'

// ============================================================================
// Mapping Record (exhaustive — TypeScript enforces all 17 values are covered)
// Source: WINT-9010 KNOWLEDGE-CONTEXT.yaml toDbStoryStatus_mapping
// ============================================================================

const WORKFLOW_TO_DB: Record<WorkflowStoryStatus, DbStoryStatus> = {
  // Backlog group → backlog
  pending: 'backlog',
  generated: 'backlog',
  'in-elaboration': 'backlog',
  'needs-refinement': 'backlog',
  'needs-split': 'backlog',

  // Ready for development → ready_to_work
  'ready-to-work': 'ready_to_work',

  // Development statuses → in_progress
  'in-progress': 'in_progress',
  'ready-for-code-review': 'in_progress',
  'code-review-failed': 'in_progress',
  'needs-work': 'in_progress',

  // QA statuses → ready_for_qa / in_qa
  'ready-for-qa': 'ready_for_qa',
  'in-qa': 'in_qa',
  uat: 'in_qa',

  // Terminal statuses
  completed: 'done',
  blocked: 'blocked',
  cancelled: 'cancelled',
  superseded: 'cancelled',
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Converts a WorkflowStoryStatus to its corresponding DbStoryStatus.
 *
 * This is a pure total function — every WorkflowStoryStatus value maps
 * to exactly one DbStoryStatus value.
 *
 * @param status - The WorkflowStoryStatus to convert (validated via Zod)
 * @returns The corresponding DbStoryStatus for database storage
 * @throws ZodError if status is not a valid WorkflowStoryStatus
 */
export function toDbStoryStatus(status: string): DbStoryStatus {
  const parsed = WorkflowStoryStatusSchema.parse(status)
  const dbStatus = WORKFLOW_TO_DB[parsed]
  // Validate the output against DbStoryStatusSchema for runtime safety
  return DbStoryStatusSchema.parse(dbStatus)
}

/**
 * Status adapter: maps WorkflowStoryStatus (17-value hyphenated) to
 * DbStoryStatus (canonical 13-state snake_case) for database persistence.
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
  'in-elaboration': 'elab',
  'needs-refinement': 'elab',
  'needs-split': 'elab',

  // Ready for development → ready
  'ready-to-work': 'ready',

  // Development statuses
  'in-progress': 'in_progress',
  'ready-for-code-review': 'needs_code_review',
  'code-review-failed': 'failed_code_review',
  'needs-work': 'in_progress',

  // QA statuses → ready_for_qa / in_qa
  'ready-for-qa': 'ready_for_qa',
  'in-qa': 'in_qa',
  uat: 'completed',

  // Terminal statuses
  completed: 'completed',
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

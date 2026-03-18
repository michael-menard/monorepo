/**
 * Unit tests for toDbStoryStatus
 *
 * Verifies that all 17 WorkflowStoryStatus values map to the correct
 * DbStoryStatus (canonical 13-state model), and that invalid inputs throw.
 */

import { describe, it, expect } from 'vitest'
import { toDbStoryStatus } from '../adapter/index.js'

describe('toDbStoryStatus', () => {
  // =========================================================================
  // Backlog group → 'backlog'
  // =========================================================================

  it('pending → backlog', () => {
    expect(toDbStoryStatus('pending')).toBe('backlog')
  })

  it('generated → backlog', () => {
    expect(toDbStoryStatus('generated')).toBe('backlog')
  })

  // =========================================================================
  // Elaboration group → 'elab'
  // =========================================================================

  it('in-elaboration → elab', () => {
    expect(toDbStoryStatus('in-elaboration')).toBe('elab')
  })

  it('needs-refinement → elab', () => {
    expect(toDbStoryStatus('needs-refinement')).toBe('elab')
  })

  it('needs-split → elab', () => {
    expect(toDbStoryStatus('needs-split')).toBe('elab')
  })

  // =========================================================================
  // Ready for development → 'ready'
  // =========================================================================

  it('ready-to-work → ready', () => {
    expect(toDbStoryStatus('ready-to-work')).toBe('ready')
  })

  // =========================================================================
  // Development statuses
  // =========================================================================

  it('in-progress → in_progress', () => {
    expect(toDbStoryStatus('in-progress')).toBe('in_progress')
  })

  it('ready-for-code-review → needs_code_review', () => {
    expect(toDbStoryStatus('ready-for-code-review')).toBe('needs_code_review')
  })

  it('code-review-failed → failed_code_review', () => {
    expect(toDbStoryStatus('code-review-failed')).toBe('failed_code_review')
  })

  it('needs-work → in_progress', () => {
    expect(toDbStoryStatus('needs-work')).toBe('in_progress')
  })

  // =========================================================================
  // QA statuses → 'ready_for_qa' / 'in_qa'
  // =========================================================================

  it('ready-for-qa → ready_for_qa', () => {
    expect(toDbStoryStatus('ready-for-qa')).toBe('ready_for_qa')
  })

  it('in-qa → in_qa', () => {
    expect(toDbStoryStatus('in-qa')).toBe('in_qa')
  })

  it('uat → completed', () => {
    expect(toDbStoryStatus('uat')).toBe('completed')
  })

  // =========================================================================
  // Terminal statuses
  // =========================================================================

  it('completed → completed', () => {
    expect(toDbStoryStatus('completed')).toBe('completed')
  })

  it('blocked → blocked', () => {
    expect(toDbStoryStatus('blocked')).toBe('blocked')
  })

  it('cancelled → cancelled', () => {
    expect(toDbStoryStatus('cancelled')).toBe('cancelled')
  })

  it('superseded → cancelled', () => {
    expect(toDbStoryStatus('superseded')).toBe('cancelled')
  })

  // =========================================================================
  // Total mapping: all 17 WorkflowStoryStatus values accounted for
  // =========================================================================

  it('covers all 17 WorkflowStoryStatus values', () => {
    const allStatuses = [
      'pending', 'generated', 'in-elaboration', 'needs-refinement', 'needs-split',
      'ready-to-work', 'in-progress', 'ready-for-code-review', 'code-review-failed',
      'ready-for-qa', 'in-qa', 'needs-work', 'uat',
      'completed', 'blocked', 'cancelled', 'superseded',
    ]
    expect(allStatuses).toHaveLength(17)
    // Every status should return a valid DbStoryStatus (not throw)
    for (const status of allStatuses) {
      expect(() => toDbStoryStatus(status)).not.toThrow()
    }
  })

  // =========================================================================
  // Edge cases: invalid input
  // =========================================================================

  it('throws ZodError for unknown status', () => {
    expect(() => toDbStoryStatus('invalid-status')).toThrow()
  })

  it('throws ZodError for empty string', () => {
    expect(() => toDbStoryStatus('')).toThrow()
  })

  it('throws ZodError for snake_case db status (not a WorkflowStoryStatus)', () => {
    expect(() => toDbStoryStatus('in_progress')).toThrow()
  })

  it('throws ZodError for partial prefix match', () => {
    expect(() => toDbStoryStatus('in-')).toThrow()
  })
})

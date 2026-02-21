/**
 * Unit tests for toDbStoryStatus
 *
 * Verifies that all 17 WorkflowStoryStatus values map to the correct
 * DbStoryStatus (8 snake_case values), and that invalid inputs throw.
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

  it('in-elaboration → backlog', () => {
    expect(toDbStoryStatus('in-elaboration')).toBe('backlog')
  })

  it('needs-refinement → backlog', () => {
    expect(toDbStoryStatus('needs-refinement')).toBe('backlog')
  })

  it('needs-split → backlog', () => {
    expect(toDbStoryStatus('needs-split')).toBe('backlog')
  })

  // =========================================================================
  // Ready for development → 'ready_to_work'
  // =========================================================================

  it('ready-to-work → ready_to_work', () => {
    expect(toDbStoryStatus('ready-to-work')).toBe('ready_to_work')
  })

  // =========================================================================
  // Development statuses → 'in_progress'
  // =========================================================================

  it('in-progress → in_progress', () => {
    expect(toDbStoryStatus('in-progress')).toBe('in_progress')
  })

  it('ready-for-code-review → in_progress', () => {
    expect(toDbStoryStatus('ready-for-code-review')).toBe('in_progress')
  })

  it('code-review-failed → in_progress', () => {
    expect(toDbStoryStatus('code-review-failed')).toBe('in_progress')
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

  it('uat → in_qa', () => {
    expect(toDbStoryStatus('uat')).toBe('in_qa')
  })

  // =========================================================================
  // Terminal statuses
  // =========================================================================

  it('completed → done', () => {
    expect(toDbStoryStatus('completed')).toBe('done')
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

/**
 * Unit tests for getValidTransitions
 *
 * Covers all 17 WorkflowStoryStatus values and verifies that the
 * returned transition arrays match the canonical validTransitions record
 * from story-state-machine.ts.
 */

import { describe, it, expect } from 'vitest'
import { getValidTransitions } from '../transitions/index.js'

describe('getValidTransitions', () => {
  // =========================================================================
  // Backlog statuses
  // =========================================================================

  it('pending → [generated]', () => {
    expect(getValidTransitions('pending')).toEqual(['generated'])
  })

  it('generated → [in-elaboration]', () => {
    expect(getValidTransitions('generated')).toEqual(['in-elaboration'])
  })

  // =========================================================================
  // Elaboration statuses
  // =========================================================================

  it('in-elaboration → multiple outcomes', () => {
    const transitions = getValidTransitions('in-elaboration')
    expect(transitions).toEqual([
      'ready-to-work',
      'needs-refinement',
      'needs-split',
      'blocked',
      'cancelled',
    ])
  })

  it('needs-refinement → [generated, cancelled]', () => {
    expect(getValidTransitions('needs-refinement')).toEqual(['generated', 'cancelled'])
  })

  it('needs-split → [generated, superseded, cancelled]', () => {
    expect(getValidTransitions('needs-split')).toEqual(['generated', 'superseded', 'cancelled'])
  })

  // =========================================================================
  // Development statuses
  // =========================================================================

  it('ready-to-work → [in-progress, blocked, cancelled]', () => {
    expect(getValidTransitions('ready-to-work')).toEqual(['in-progress', 'blocked', 'cancelled'])
  })

  it('in-progress → multiple outcomes', () => {
    const transitions = getValidTransitions('in-progress')
    expect(transitions).toEqual([
      'ready-for-code-review',
      'ready-for-qa',
      'blocked',
      'cancelled',
    ])
  })

  it('ready-for-code-review → [ready-for-qa, code-review-failed, blocked]', () => {
    expect(getValidTransitions('ready-for-code-review')).toEqual([
      'ready-for-qa',
      'code-review-failed',
      'blocked',
    ])
  })

  it('code-review-failed → [in-progress, blocked, cancelled]', () => {
    expect(getValidTransitions('code-review-failed')).toEqual([
      'in-progress',
      'blocked',
      'cancelled',
    ])
  })

  // =========================================================================
  // QA statuses
  // =========================================================================

  it('ready-for-qa → [in-qa, blocked]', () => {
    expect(getValidTransitions('ready-for-qa')).toEqual(['in-qa', 'blocked'])
  })

  it('in-qa → [uat, needs-work, blocked]', () => {
    expect(getValidTransitions('in-qa')).toEqual(['uat', 'needs-work', 'blocked'])
  })

  it('needs-work → [in-progress, blocked, cancelled]', () => {
    expect(getValidTransitions('needs-work')).toEqual(['in-progress', 'blocked', 'cancelled'])
  })

  it('uat → [completed, in-progress, blocked]', () => {
    expect(getValidTransitions('uat')).toEqual(['completed', 'in-progress', 'blocked'])
  })

  // =========================================================================
  // Terminal statuses (no valid transitions out)
  // =========================================================================

  it('completed → [] (terminal)', () => {
    expect(getValidTransitions('completed')).toEqual([])
  })

  it('cancelled → [] (terminal)', () => {
    expect(getValidTransitions('cancelled')).toEqual([])
  })

  it('superseded → [] (terminal)', () => {
    expect(getValidTransitions('superseded')).toEqual([])
  })

  // =========================================================================
  // blocked — special recovery status (not terminal)
  // =========================================================================

  it('blocked → [in-progress, ready-to-work, in-elaboration, cancelled]', () => {
    expect(getValidTransitions('blocked')).toEqual([
      'in-progress',
      'ready-to-work',
      'in-elaboration',
      'cancelled',
    ])
  })

  // =========================================================================
  // Edge cases: invalid input
  // =========================================================================

  it('throws ZodError for unknown status', () => {
    expect(() => getValidTransitions('unknown-status')).toThrow()
  })

  it('throws ZodError for empty string', () => {
    expect(() => getValidTransitions('')).toThrow()
  })

  it('throws ZodError for snake_case db status', () => {
    expect(() => getValidTransitions('in_progress')).toThrow()
  })

  it('returns array (not mutated by caller)', () => {
    const transitions = getValidTransitions('pending')
    const copy = [...transitions]
    transitions.push('cancelled' as any)
    // Next call should return original value unchanged
    expect(getValidTransitions('pending')).toEqual(copy)
  })
})

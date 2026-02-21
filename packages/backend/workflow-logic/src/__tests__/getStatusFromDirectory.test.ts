/**
 * Unit tests for getStatusFromDirectory
 *
 * Verifies that all 7 known swim-lane directories return the correct
 * WorkflowStoryStatus, and unknown directories return null.
 */

import { describe, it, expect } from 'vitest'
import { getStatusFromDirectory } from '../directory/index.js'

describe('getStatusFromDirectory', () => {
  // =========================================================================
  // Known swim-lane directories (AC-3: 7 directories)
  // =========================================================================

  it('backlog → pending', () => {
    expect(getStatusFromDirectory('backlog')).toBe('pending')
  })

  it('elaboration → in-elaboration', () => {
    expect(getStatusFromDirectory('elaboration')).toBe('in-elaboration')
  })

  it('ready-to-work → ready-to-work', () => {
    expect(getStatusFromDirectory('ready-to-work')).toBe('ready-to-work')
  })

  it('in-progress → in-progress', () => {
    expect(getStatusFromDirectory('in-progress')).toBe('in-progress')
  })

  it('ready-for-qa → ready-for-qa', () => {
    expect(getStatusFromDirectory('ready-for-qa')).toBe('ready-for-qa')
  })

  it('UAT → uat (case-sensitive: directory is named UAT)', () => {
    expect(getStatusFromDirectory('UAT')).toBe('uat')
  })

  it('done → completed', () => {
    expect(getStatusFromDirectory('done')).toBe('completed')
  })

  // =========================================================================
  // Unknown directories → null
  // =========================================================================

  it('returns null for unknown directory', () => {
    expect(getStatusFromDirectory('unknown-dir')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getStatusFromDirectory('')).toBeNull()
  })

  it('returns null for "uat" (lowercase — not the UAT directory name)', () => {
    expect(getStatusFromDirectory('uat')).toBeNull()
  })

  it('returns null for "Backlog" (wrong case)', () => {
    expect(getStatusFromDirectory('Backlog')).toBeNull()
  })

  it('returns null for "blocked" (DB-only state, no directory)', () => {
    expect(getStatusFromDirectory('blocked')).toBeNull()
  })

  it('returns null for "cancelled" (DB-only state, no directory)', () => {
    expect(getStatusFromDirectory('cancelled')).toBeNull()
  })

  it('returns null for "in-elaboration" (status name, not directory name)', () => {
    expect(getStatusFromDirectory('in-elaboration')).toBeNull()
  })

  // =========================================================================
  // All 7 known directories return a WorkflowStoryStatus (not null)
  // =========================================================================

  it('all 7 known directories return a non-null status', () => {
    const knownDirs = [
      'backlog',
      'elaboration',
      'ready-to-work',
      'in-progress',
      'ready-for-qa',
      'UAT',
      'done',
    ]
    for (const dir of knownDirs) {
      expect(getStatusFromDirectory(dir)).not.toBeNull()
    }
  })
})

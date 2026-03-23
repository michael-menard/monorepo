/**
 * Unit tests for artifact/ module
 *
 * Tests getArtifactPhase for all artifact types.
 * Tests isValidArtifactForPhase for valid and invalid combos.
 */

import { describe, it, expect } from 'vitest'
import {
  getArtifactPhase,
  isValidArtifactForPhase,
  ArtifactTypeSchema,
  ArtifactPhaseSchema,
} from '../artifact/index.js'
import type { ArtifactType, ArtifactPhase } from '../artifact/index.js'

describe('getArtifactPhase', () => {
  // =========================================================================
  // Setup phase artifacts
  // =========================================================================

  it('checkpoint → setup', () => {
    expect(getArtifactPhase('checkpoint')).toBe('setup')
  })

  it('scope → setup', () => {
    expect(getArtifactPhase('scope')).toBe('setup')
  })

  it('fix_summary → setup', () => {
    expect(getArtifactPhase('fix_summary')).toBe('setup')
  })

  // =========================================================================
  // Planning phase artifacts
  // =========================================================================

  it('plan → planning', () => {
    expect(getArtifactPhase('plan')).toBe('planning')
  })

  it('context → planning', () => {
    expect(getArtifactPhase('context')).toBe('planning')
  })

  // =========================================================================
  // Implementation phase artifacts
  // =========================================================================

  it('evidence → implementation', () => {
    expect(getArtifactPhase('evidence')).toBe('implementation')
  })

  // =========================================================================
  // Code review phase artifacts
  // =========================================================================

  it('review → code_review', () => {
    expect(getArtifactPhase('review')).toBe('code_review')
  })

  // =========================================================================
  // Analysis phase artifacts
  // =========================================================================

  it('analysis → analysis', () => {
    expect(getArtifactPhase('analysis')).toBe('analysis')
  })

  it('story_seed → analysis', () => {
    expect(getArtifactPhase('story_seed')).toBe('analysis')
  })

  it('test_plan → analysis', () => {
    expect(getArtifactPhase('test_plan')).toBe('analysis')
  })

  it('uiux_notes → analysis', () => {
    expect(getArtifactPhase('uiux_notes')).toBe('analysis')
  })

  it('dev_feasibility → analysis', () => {
    expect(getArtifactPhase('dev_feasibility')).toBe('analysis')
  })

  // =========================================================================
  // QA verification phase artifacts
  // =========================================================================

  it('verification → qa_verification', () => {
    expect(getArtifactPhase('verification')).toBe('qa_verification')
  })

  // =========================================================================
  // Covers all schema values (no missing entries)
  // =========================================================================

  it('covers all ArtifactType enum values', () => {
    const allTypes = ArtifactTypeSchema.options
    for (const t of allTypes) {
      expect(() => getArtifactPhase(t)).not.toThrow()
      const phase = getArtifactPhase(t)
      // Result must be a valid ArtifactPhase
      expect(ArtifactPhaseSchema.safeParse(phase).success).toBe(true)
    }
  })
})

describe('isValidArtifactForPhase', () => {
  // =========================================================================
  // Valid combinations
  // =========================================================================

  it('checkpoint + setup → true', () => {
    expect(isValidArtifactForPhase('checkpoint', 'setup')).toBe(true)
  })

  it('scope + setup → true', () => {
    expect(isValidArtifactForPhase('scope', 'setup')).toBe(true)
  })

  it('plan + planning → true', () => {
    expect(isValidArtifactForPhase('plan', 'planning')).toBe(true)
  })

  it('evidence + implementation → true', () => {
    expect(isValidArtifactForPhase('evidence', 'implementation')).toBe(true)
  })

  it('review + code_review → true', () => {
    expect(isValidArtifactForPhase('review', 'code_review')).toBe(true)
  })

  it('verification + qa_verification → true', () => {
    expect(isValidArtifactForPhase('verification', 'qa_verification')).toBe(true)
  })

  it('analysis + analysis → true', () => {
    expect(isValidArtifactForPhase('analysis', 'analysis')).toBe(true)
  })

  // =========================================================================
  // Invalid combinations — wrong phase for artifact type
  // =========================================================================

  it('checkpoint + planning → false (wrong phase)', () => {
    expect(isValidArtifactForPhase('checkpoint', 'planning')).toBe(false)
  })

  it('plan + setup → false (wrong phase)', () => {
    expect(isValidArtifactForPhase('plan', 'setup')).toBe(false)
  })

  it('evidence + qa_verification → false (wrong phase)', () => {
    expect(isValidArtifactForPhase('evidence', 'qa_verification')).toBe(false)
  })

  it('review + implementation → false (wrong phase)', () => {
    expect(isValidArtifactForPhase('review', 'implementation')).toBe(false)
  })

  it('verification + code_review → false (wrong phase)', () => {
    expect(isValidArtifactForPhase('verification', 'code_review')).toBe(false)
  })

  it('story_seed + setup → false (wrong phase, should be analysis)', () => {
    expect(isValidArtifactForPhase('story_seed', 'setup')).toBe(false)
  })

  // =========================================================================
  // Type safety
  // =========================================================================

  it('accepts typed ArtifactType and ArtifactPhase values', () => {
    const t: ArtifactType = 'checkpoint'
    const p: ArtifactPhase = 'setup'
    expect(isValidArtifactForPhase(t, p)).toBe(true)
  })

  // =========================================================================
  // All valid types are valid for their own phase
  // =========================================================================

  it('every artifact type is valid for its canonical phase', () => {
    const allTypes = ArtifactTypeSchema.options
    for (const t of allTypes) {
      const canonicalPhase = getArtifactPhase(t)
      expect(isValidArtifactForPhase(t, canonicalPhase)).toBe(true)
    }
  })
})

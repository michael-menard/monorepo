/**
 * Unit tests for decision/ module
 *
 * Tests classifyDecisionTier for each tier keyword match and unknown input safe default.
 * Tests shouldEscalate for every cell of the 3x4 decision matrix
 * (3 autonomy levels x 4 non-Tier-4 tiers + Tier-4 always escalates = 13 cases).
 */

import { describe, it, expect } from 'vitest'
import {
  classifyDecisionTier,
  shouldEscalate,
} from '../decision/index.js'
import type { DecisionTier, AutonomyLevel } from '../decision/index.js'

describe('classifyDecisionTier', () => {
  // =========================================================================
  // Tier 4: Destructive — always escalate keywords
  // =========================================================================

  it('classifies "delete the user directory" as tier-4', () => {
    expect(classifyDecisionTier('delete the user directory')).toBe('tier-4')
  })

  it('classifies "drop the table" as tier-4', () => {
    expect(classifyDecisionTier('drop the table')).toBe('tier-4')
  })

  it('classifies "hard reset to origin" as tier-4', () => {
    expect(classifyDecisionTier('hard reset to origin')).toBe('tier-4')
  })

  it('classifies "production deployment" as tier-4', () => {
    expect(classifyDecisionTier('production deployment')).toBe('tier-4')
  })

  it('classifies "wipe the database" as tier-4', () => {
    expect(classifyDecisionTier('wipe the database')).toBe('tier-4')
  })

  // =========================================================================
  // Tier 5: External dependency keywords
  // =========================================================================

  it('classifies "install the axios npm package" as tier-5', () => {
    expect(classifyDecisionTier('install the axios npm package')).toBe('tier-5')
  })

  it('classifies "add external api for payments" as tier-5', () => {
    expect(classifyDecisionTier('add external api for payments')).toBe('tier-5')
  })

  it('classifies "infrastructure change to add CDN" as tier-5', () => {
    expect(classifyDecisionTier('infrastructure change to add CDN')).toBe('tier-5')
  })

  it('classifies "add dependency on lodash" as tier-5', () => {
    expect(classifyDecisionTier('add dependency on lodash')).toBe('tier-5')
  })

  // =========================================================================
  // Tier 3: Ambiguous scope keywords
  // =========================================================================

  it('classifies "add validation to the form" as tier-3', () => {
    expect(classifyDecisionTier('add validation to the form')).toBe('tier-3')
  })

  it('classifies "improve performance of the query" as tier-3', () => {
    expect(classifyDecisionTier('improve performance of the query')).toBe('tier-3')
  })

  it('classifies "multiple ways to implement this" as tier-3', () => {
    expect(classifyDecisionTier('multiple ways to implement this')).toBe('tier-3')
  })

  // =========================================================================
  // Tier 2: Preference keywords
  // =========================================================================

  it('classifies "prefer zustand for state management" as tier-2', () => {
    expect(classifyDecisionTier('prefer zustand for state management')).toBe('tier-2')
  })

  it('classifies "choose the api format for responses" as tier-2', () => {
    expect(classifyDecisionTier('choose the api format for responses')).toBe('tier-2')
  })

  it('classifies "component library selection" as tier-2', () => {
    expect(classifyDecisionTier('component library selection')).toBe('tier-2')
  })

  // =========================================================================
  // Tier 1: Clarification keywords
  // =========================================================================

  it('classifies "file name convention for tests" as tier-1', () => {
    expect(classifyDecisionTier('file name convention for tests')).toBe('tier-1')
  })

  it('classifies "import order in the module" as tier-1', () => {
    expect(classifyDecisionTier('import order in the module')).toBe('tier-1')
  })

  it('classifies "naming the component" as tier-1', () => {
    expect(classifyDecisionTier('naming the component')).toBe('tier-1')
  })

  // =========================================================================
  // Safe default for unknown input
  // =========================================================================

  it('defaults to tier-1 for unrecognized description', () => {
    expect(classifyDecisionTier('something completely unrecognized xyz')).toBe('tier-1')
  })

  it('defaults to tier-1 for empty string', () => {
    expect(classifyDecisionTier('')).toBe('tier-1')
  })

  it('is case-insensitive — uppercase DELETE is tier-4', () => {
    expect(classifyDecisionTier('DELETE all records')).toBe('tier-4')
  })

  // =========================================================================
  // Priority: tier-4 takes precedence over other tiers
  // =========================================================================

  it('tier-4 takes precedence when mixed with tier-2 keywords', () => {
    // Both "delete" (tier-4) and "prefer" (tier-2) appear — tier-4 wins
    expect(classifyDecisionTier('prefer to delete the old folder')).toBe('tier-4')
  })
})

describe('shouldEscalate', () => {
  // =========================================================================
  // Tier 1 (Clarification) decision matrix
  // conservative → escalate, moderate → auto, aggressive → auto
  // =========================================================================

  it('tier-1 + conservative → escalate', () => {
    expect(shouldEscalate('tier-1', 'conservative')).toBe(true)
  })

  it('tier-1 + moderate → auto-accept', () => {
    expect(shouldEscalate('tier-1', 'moderate')).toBe(false)
  })

  it('tier-1 + aggressive → auto-accept', () => {
    expect(shouldEscalate('tier-1', 'aggressive')).toBe(false)
  })

  // =========================================================================
  // Tier 2 (Preference) decision matrix
  // conservative → escalate, moderate → escalate, aggressive → auto
  // =========================================================================

  it('tier-2 + conservative → escalate', () => {
    expect(shouldEscalate('tier-2', 'conservative')).toBe(true)
  })

  it('tier-2 + moderate → escalate', () => {
    expect(shouldEscalate('tier-2', 'moderate')).toBe(true)
  })

  it('tier-2 + aggressive → auto-accept', () => {
    expect(shouldEscalate('tier-2', 'aggressive')).toBe(false)
  })

  // =========================================================================
  // Tier 3 (Ambiguous) decision matrix
  // conservative → escalate, moderate → auto, aggressive → auto
  // =========================================================================

  it('tier-3 + conservative → escalate', () => {
    expect(shouldEscalate('tier-3', 'conservative')).toBe(true)
  })

  it('tier-3 + moderate → auto-accept', () => {
    expect(shouldEscalate('tier-3', 'moderate')).toBe(false)
  })

  it('tier-3 + aggressive → auto-accept', () => {
    expect(shouldEscalate('tier-3', 'aggressive')).toBe(false)
  })

  // =========================================================================
  // Tier 4 (Destructive) — ALWAYS escalate at every autonomy level
  // =========================================================================

  it('tier-4 + conservative → ALWAYS escalate', () => {
    expect(shouldEscalate('tier-4', 'conservative')).toBe(true)
  })

  it('tier-4 + moderate → ALWAYS escalate', () => {
    expect(shouldEscalate('tier-4', 'moderate')).toBe(true)
  })

  it('tier-4 + aggressive → ALWAYS escalate (no exceptions)', () => {
    expect(shouldEscalate('tier-4', 'aggressive')).toBe(true)
  })

  // =========================================================================
  // Tier 5 (External Dependency)
  // conservative → escalate, moderate → escalate, aggressive → auto
  // =========================================================================

  it('tier-5 + conservative → escalate', () => {
    expect(shouldEscalate('tier-5', 'conservative')).toBe(true)
  })

  it('tier-5 + moderate → escalate', () => {
    expect(shouldEscalate('tier-5', 'moderate')).toBe(true)
  })

  it('tier-5 + aggressive → auto-accept (low-risk)', () => {
    expect(shouldEscalate('tier-5', 'aggressive')).toBe(false)
  })

  // =========================================================================
  // Type safety: function accepts valid enum values
  // =========================================================================

  it('accepts DecisionTier and AutonomyLevel typed values', () => {
    const tier: DecisionTier = 'tier-4'
    const level: AutonomyLevel = 'moderate'
    expect(shouldEscalate(tier, level)).toBe(true)
  })
})

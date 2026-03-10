/**
 * Unit Tests: Cohesion Rules Seed Script
 * WINT-4050: Seed Initial Cohesion Rules into the Rules Registry
 *
 * Tests seedCohesionRules() with mocked proposeRule/promoteRule.
 *
 * AC-4: Unit tests cover happy path, idempotency, and promote failure paths
 * AC-7: All tests pass TypeScript strict mode and ESLint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '@repo/logger'
import type { ProposeRuleResult, PromoteRuleResult } from '../../rules-registry.js'
import { seedCohesionRules, COHESION_RULE_DEFINITIONS, SeedResultSchema } from '../cohesion-rules.js'
import { proposeRule, promoteRule } from '../../rules-registry.js'

// ============================================================================
// Mocks
// ============================================================================

// Mock the rules-registry module (proposeRule and promoteRule)
vi.mock('../../rules-registry.js', () => ({
  proposeRule: vi.fn(),
  promoteRule: vi.fn(),
  normalizeRuleText: vi.fn((text: string) => text.toLowerCase().trim()),
}))

// Mock @repo/logger to suppress output and track calls
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// Helpers
// ============================================================================

function makeProposedRule(id: string, ruleText: string) {
  return {
    id,
    rule_text: ruleText,
    rule_type: 'gate' as const,
    scope: 'global',
    severity: 'error' as const,
    status: 'proposed' as const,
    source_story_id: 'WINT-4050',
    source_lesson_id: null,
    created_at: new Date('2026-03-08'),
    updated_at: new Date('2026-03-08'),
  }
}

function makePromotedRule(id: string, ruleText: string) {
  return {
    ...makeProposedRule(id, ruleText),
    status: 'active' as const,
  }
}

function makeConflictResult(ids: string[]): ProposeRuleResult {
  return { ok: false, error: 'Conflict: rule already exists', conflicting_ids: ids }
}

function makePromoteErrorResult(error: string): PromoteRuleResult {
  return { ok: false, error, status: 422 }
}

// ============================================================================
// COHESION_RULE_DEFINITIONS export
// ============================================================================

describe('COHESION_RULE_DEFINITIONS', () => {
  it('exports exactly 4 rule definitions', () => {
    expect(COHESION_RULE_DEFINITIONS).toHaveLength(4)
  })

  it('has 3 gate rules and 1 prompt_injection rule', () => {
    const gates = COHESION_RULE_DEFINITIONS.filter(r => r.rule_type === 'gate')
    const promptInjections = COHESION_RULE_DEFINITIONS.filter(r => r.rule_type === 'prompt_injection')
    expect(gates).toHaveLength(3)
    expect(promptInjections).toHaveLength(1)
  })

  it('has 2 error severity and 2 warning severity rules', () => {
    const errors = COHESION_RULE_DEFINITIONS.filter(r => r.severity === 'error')
    const warnings = COHESION_RULE_DEFINITIONS.filter(r => r.severity === 'warning')
    expect(errors).toHaveLength(2)
    expect(warnings).toHaveLength(2)
  })

  it('all rules have source_story_id WINT-4050', () => {
    expect(COHESION_RULE_DEFINITIONS.every(r => r.source_story_id === 'WINT-4050')).toBe(true)
  })

  it('all rules have scope global', () => {
    expect(COHESION_RULE_DEFINITIONS.every(r => r.scope === 'global')).toBe(true)
  })

  it('upload/replace rule is stored as prompt_injection with severity warning (AC-5)', () => {
    const uploadRule = COHESION_RULE_DEFINITIONS.find(r =>
      r.rule_text.toLowerCase().includes('upload'),
    )
    expect(uploadRule).toBeDefined()
    expect(uploadRule?.rule_type).toBe('prompt_injection')
    expect(uploadRule?.severity).toBe('warning')
  })

  it('create→delete rule is gate with severity error', () => {
    const rule = COHESION_RULE_DEFINITIONS.find(r =>
      r.rule_text.toLowerCase().includes('create') && r.rule_text.toLowerCase().includes('delete'),
    )
    expect(rule).toBeDefined()
    expect(rule?.rule_type).toBe('gate')
    expect(rule?.severity).toBe('error')
  })

  it('delete→create rule is gate with severity error', () => {
    const rule = COHESION_RULE_DEFINITIONS.find(r =>
      r.rule_text.toLowerCase().includes('delete') && r.rule_text.toLowerCase().includes('create'),
    )
    expect(rule).toBeDefined()
    expect(rule?.rule_type).toBe('gate')
    expect(rule?.severity).toBe('error')
  })

  it('update→read rule is gate with severity warning', () => {
    const rule = COHESION_RULE_DEFINITIONS.find(r =>
      r.rule_text.toLowerCase().includes('update') && r.rule_text.toLowerCase().includes('read'),
    )
    expect(rule).toBeDefined()
    expect(rule?.rule_type).toBe('gate')
    expect(rule?.severity).toBe('warning')
  })
})

// ============================================================================
// SeedResultSchema
// ============================================================================

describe('SeedResultSchema', () => {
  it('validates a valid result', () => {
    const result = SeedResultSchema.safeParse({ proposed: 4, promoted: 4, conflicts: 0, failures: 0 })
    expect(result.success).toBe(true)
  })

  it('validates a partial result (conflicts only)', () => {
    const result = SeedResultSchema.safeParse({ proposed: 0, promoted: 0, conflicts: 4, failures: 0 })
    expect(result.success).toBe(true)
  })

  it('rejects non-number fields', () => {
    const result = SeedResultSchema.safeParse({ proposed: 'four', promoted: 4, conflicts: 0, failures: 0 })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// HP-1: Happy path — all 4 rules proposed and promoted (AC-4)
// ============================================================================

describe('seedCohesionRules — happy path (HP-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls proposeRule for each of the 4 canonical rules', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    // All 4 propose succeed
    mockPropose.mockImplementation(async input => ({
      ok: true,
      data: makeProposedRule(`uuid-${input.rule_text.slice(0, 10)}`, input.rule_text),
    }))

    // All 4 promote succeed
    mockPromote.mockImplementation(async (id, _input) => ({
      ok: true,
      data: makePromotedRule(id, 'some rule'),
    }))

    await seedCohesionRules()

    expect(mockPropose).toHaveBeenCalledTimes(4)
  })

  it('calls promoteRule for each successfully proposed rule', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    mockPropose.mockImplementation(async input => ({
      ok: true,
      data: makeProposedRule(`uuid-${input.rule_text.slice(0, 10)}`, input.rule_text),
    }))

    mockPromote.mockImplementation(async (id, _input) => ({
      ok: true,
      data: makePromotedRule(id, 'some rule'),
    }))

    await seedCohesionRules()

    expect(mockPromote).toHaveBeenCalledTimes(4)
  })

  it('returns proposed=4, promoted=4, conflicts=0, failures=0 on full success', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    mockPropose.mockImplementation(async input => ({
      ok: true,
      data: makeProposedRule(`uuid-${Math.random()}`, input.rule_text),
    }))

    mockPromote.mockImplementation(async (id, _input) => ({
      ok: true,
      data: makePromotedRule(id, 'some rule'),
    }))

    const result = await seedCohesionRules()

    expect(result.proposed).toBe(4)
    expect(result.promoted).toBe(4)
    expect(result.conflicts).toBe(0)
    expect(result.failures).toBe(0)
  })

  it('calls promoteRule with source_story_id WINT-4050 (AC-3)', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    mockPropose.mockImplementation(async input => ({
      ok: true,
      data: makeProposedRule('some-uuid', input.rule_text),
    }))

    mockPromote.mockResolvedValue({ ok: true, data: makePromotedRule('some-uuid', 'rule') })

    await seedCohesionRules()

    for (const call of mockPromote.mock.calls) {
      expect(call[1]).toMatchObject({ source_story_id: 'WINT-4050' })
    }
  })

  it('accepts custom rule definitions array', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    const customRules = [COHESION_RULE_DEFINITIONS[0]]

    mockPropose.mockResolvedValue({ ok: true, data: makeProposedRule('uuid-1', 'rule') })
    mockPromote.mockResolvedValue({ ok: true, data: makePromotedRule('uuid-1', 'rule') })

    const result = await seedCohesionRules(customRules)

    expect(result.proposed).toBe(1)
    expect(result.promoted).toBe(1)
    expect(mockPropose).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// EC-1: Idempotency — all rules already exist (AC-4)
// ============================================================================

describe('seedCohesionRules — idempotency (EC-1)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call promoteRule when all rules already exist (conflict)', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    mockPropose.mockResolvedValue(makeConflictResult(['existing-uuid-1']))

    await seedCohesionRules()

    expect(mockPromote).not.toHaveBeenCalled()
  })

  it('returns conflicts=4, proposed=0, promoted=0 when all rules exist', async () => {
    const mockPropose = vi.mocked(proposeRule)

    mockPropose.mockResolvedValue(makeConflictResult(['existing-uuid-1']))

    const result = await seedCohesionRules()

    expect(result.proposed).toBe(0)
    expect(result.promoted).toBe(0)
    expect(result.conflicts).toBe(4)
    expect(result.failures).toBe(0)
  })

  it('logs conflict info via logger.info (not warning)', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockLogger = vi.mocked(logger)

    mockPropose.mockResolvedValue(makeConflictResult(['existing-uuid-1', 'existing-uuid-2']))

    await seedCohesionRules([COHESION_RULE_DEFINITIONS[0]])

    const infoCalls = mockLogger.info.mock.calls.map(c => c[0])
    expect(infoCalls.some(msg => String(msg).includes('already exists'))).toBe(true)
    // Should NOT warn on idempotency — conflicts are expected/normal
    const warnCalls = mockLogger.warn.mock.calls.map(c => c[0])
    expect(warnCalls.some(msg => String(msg).includes('already exists'))).toBe(false)
  })

  it('does not throw on conflict response', async () => {
    const mockPropose = vi.mocked(proposeRule)

    mockPropose.mockResolvedValue(makeConflictResult(['existing-id']))

    await expect(seedCohesionRules()).resolves.not.toThrow()
  })
})

// ============================================================================
// EC-2: Promote failure — promoteRule returns error (AC-4)
// ============================================================================

describe('seedCohesionRules — promote failure (EC-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs warning when promoteRule fails', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)
    const mockLogger = vi.mocked(logger)

    mockPropose.mockResolvedValue({ ok: true, data: makeProposedRule('uuid-1', 'rule') })
    mockPromote.mockResolvedValue(makePromoteErrorResult('source_story_id missing'))

    await seedCohesionRules([COHESION_RULE_DEFINITIONS[0]])

    const warnCalls = mockLogger.warn.mock.calls.map(c => c[0])
    expect(warnCalls.some(msg => String(msg).includes('Failed to promote'))).toBe(true)
  })

  it('returns failures=1 when one promoteRule fails', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    mockPropose.mockResolvedValue({ ok: true, data: makeProposedRule('uuid-1', 'rule') })
    mockPromote.mockResolvedValue(makePromoteErrorResult('source_story_id missing'))

    const result = await seedCohesionRules([COHESION_RULE_DEFINITIONS[0]])

    expect(result.proposed).toBe(1)
    expect(result.promoted).toBe(0)
    expect(result.failures).toBe(1)
  })

  it('does not throw when promoteRule fails — execution continues (AC-4)', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    mockPropose.mockResolvedValue({ ok: true, data: makeProposedRule('uuid-1', 'rule') })
    mockPromote.mockResolvedValue(makePromoteErrorResult('some error'))

    await expect(seedCohesionRules([COHESION_RULE_DEFINITIONS[0]])).resolves.not.toThrow()
  })

  it('continues processing remaining rules after a promote failure (ED-2)', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)

    // All 4 rules propose successfully
    mockPropose.mockImplementation(async input => ({
      ok: true,
      data: makeProposedRule(`uuid-${Math.random()}`, input.rule_text),
    }))

    // Only 3rd rule fails promote
    let promoteCallCount = 0
    mockPromote.mockImplementation(async (id, _input) => {
      promoteCallCount++
      if (promoteCallCount === 3) {
        return makePromoteErrorResult('DB error on 3rd rule')
      }
      return { ok: true, data: makePromotedRule(id, 'rule') }
    })

    const result = await seedCohesionRules()

    expect(result.proposed).toBe(4)
    expect(result.promoted).toBe(3)
    expect(result.failures).toBe(1)
    expect(mockPromote).toHaveBeenCalledTimes(4) // all 4 attempted
  })
})

// ============================================================================
// Summary log
// ============================================================================

describe('seedCohesionRules — summary log', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('logs a seed complete summary at the end', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)
    const mockLogger = vi.mocked(logger)

    mockPropose.mockResolvedValue({ ok: true, data: makeProposedRule('uuid-1', 'rule') })
    mockPromote.mockResolvedValue({ ok: true, data: makePromotedRule('uuid-1', 'rule') })

    await seedCohesionRules([COHESION_RULE_DEFINITIONS[0]])

    const infoCalls = mockLogger.info.mock.calls.map(c => c[0])
    expect(infoCalls.some(msg => String(msg).includes('Seed complete'))).toBe(true)
  })

  it('summary log includes proposed, promoted, conflicts, failures counts', async () => {
    const mockPropose = vi.mocked(proposeRule)
    const mockPromote = vi.mocked(promoteRule)
    const mockLogger = vi.mocked(logger)

    mockPropose.mockResolvedValue({ ok: true, data: makeProposedRule('uuid-1', 'rule') })
    mockPromote.mockResolvedValue({ ok: true, data: makePromotedRule('uuid-1', 'rule') })

    await seedCohesionRules([COHESION_RULE_DEFINITIONS[0]])

    const summaryCall = mockLogger.info.mock.calls.find(c => String(c[0]).includes('Seed complete'))
    expect(summaryCall).toBeDefined()
    const summaryData = summaryCall?.[1] as Record<string, number>
    expect(summaryData).toMatchObject({
      proposed: 1,
      promoted: 1,
      conflicts: 0,
      failures: 0,
    })
  })
})

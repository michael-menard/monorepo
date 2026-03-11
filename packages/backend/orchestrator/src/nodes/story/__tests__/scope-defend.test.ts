/**
 * Unit tests for the scope-defend node.
 *
 * Coverage:
 * - HP-1: 5 non-critical ACs → challenges produced, truncated=false
 * - HP-2: 8 non-critical ACs → 5 challenges, truncated=true
 * - HP-3: 1 MVP-critical AC excluded
 * - EC-1: gap_analysis=null → warning_count >= 1
 * - EC-2: role_pack_path=null → warning_count >= 1
 * - EC-3: Idempotent overwrite (call twice)
 * - ED-1: Zero ACs → challenges=[]
 * - ED-2: All ACs MVP-critical → challenges=[]
 *
 * WINT-9040: LangGraph Story Node - Scope Defend
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../../state/index.js'
import {
  applyDAChallenges,
  identifyCandidates,
  scopeDefendNode,
  type AcceptanceCriterionItem,
  type GapAnalysis,
  type GraphStateWithScopeDefend,
} from '../scope-defend.js'

// ============================================================================
// Mocks — vi.mock is hoisted; use vi.fn() inline to avoid TDZ issues
// ============================================================================

vi.mock('@repo/logger', () => {
  const mockLogFn = vi.fn()
  const mockLogger = {
    info: mockLogFn,
    warn: mockLogFn,
    error: mockLogFn,
    debug: mockLogFn,
  }
  return {
    logger: mockLogger,
    createLogger: vi.fn(() => mockLogger),
  }
})

vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}))

// ============================================================================
// Fixtures
// ============================================================================

function makeAC(id: string, description: string, mvpCritical?: boolean): AcceptanceCriterionItem {
  const ac: AcceptanceCriterionItem = { id, description }
  if (mvpCritical !== undefined) {
    ac.mvp_critical = mvpCritical
  }
  return ac
}

const fixtures = {
  /** 5 non-critical ACs suitable for challenging */
  complete: [
    makeAC('AC-1', 'Export report as CSV download'),
    makeAC('AC-2', 'Send email notification when process completes'),
    makeAC('AC-3', 'Full audit trail for all deferrals'),
    makeAC('AC-4', 'Paginate results with infinite scroll'),
    makeAC('AC-5', 'Show animated transition between views'),
  ],

  /** 8 non-critical ACs — will be truncated to 5 */
  largeAC: [
    makeAC('AC-1', 'Export report as CSV download'),
    makeAC('AC-2', 'Send email notification when process completes'),
    makeAC('AC-3', 'Full audit trail for all deferrals'),
    makeAC('AC-4', 'Paginate results with infinite scroll'),
    makeAC('AC-5', 'Show animated transition between views'),
    makeAC('AC-6', 'Filter results by date range'),
    makeAC('AC-7', 'Bulk delete selected items'),
    makeAC('AC-8', 'Show analytics dashboard'),
  ],

  /** 1 MVP-critical AC + 1 regular — only the regular is challenged */
  mvpCritical: [
    makeAC('AC-1', 'User can login securely', true),
    makeAC('AC-2', 'Export report as CSV download'),
  ],
}

const gapAnalysis: GapAnalysis = {
  mvp_critical_ids: ['AC-1'],
  blocking_ids: [],
}

function makeBaseState(
  overrides: Partial<GraphStateWithScopeDefend> = {},
): GraphStateWithScopeDefend {
  const base = createInitialState({ epicPrefix: 'wint', storyId: 'wint-9040' })
  return {
    ...base,
    story_brief: {
      title: 'Port scope-defender to LangGraph node',
      goal: 'Produce scope-challenges.json from state fields',
      context: 'Phase 4 elaboration workflow',
    },
    acceptance_criteria: fixtures.complete,
    gap_analysis: gapAnalysis,
    role_pack_path: '.claude/prompts/role-packs/da.md',
    ...overrides,
  } as GraphStateWithScopeDefend
}

// ============================================================================
// afterEach cleanup
// ============================================================================

afterEach(() => {
  vi.restoreAllMocks()
})

// ============================================================================
// identifyCandidates unit tests
// ============================================================================

describe('identifyCandidates', () => {
  it('returns all ACs when no gap analysis provided', () => {
    const result = identifyCandidates(fixtures.complete, null)
    expect(result).toHaveLength(5)
  })

  it('excludes MVP-critical IDs from gap analysis', () => {
    const gap: GapAnalysis = { mvp_critical_ids: ['AC-1', 'AC-2'] }
    const result = identifyCandidates(fixtures.complete, gap)
    expect(result).toHaveLength(3)
    expect(result.map(a => a.id)).not.toContain('AC-1')
    expect(result.map(a => a.id)).not.toContain('AC-2')
  })

  it('excludes blocking IDs from gap analysis', () => {
    const gap: GapAnalysis = { blocking_ids: ['AC-3'] }
    const result = identifyCandidates(fixtures.complete, gap)
    expect(result).toHaveLength(4)
    expect(result.map(a => a.id)).not.toContain('AC-3')
  })

  it('excludes ACs with mvp_critical=true', () => {
    const result = identifyCandidates(fixtures.mvpCritical, null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('AC-2')
  })

  it('returns empty array for empty AC list', () => {
    const result = identifyCandidates([], null)
    expect(result).toHaveLength(0)
  })
})

// ============================================================================
// applyDAChallenges unit tests
// ============================================================================

describe('applyDAChallenges', () => {
  it('produces up to 5 challenges', () => {
    const result = applyDAChallenges(fixtures.largeAC, 'wint-9040', [])
    expect(result.challenges.length).toBeLessThanOrEqual(5)
  })

  it('sets truncated=true when more than 5 candidates', () => {
    const result = applyDAChallenges(fixtures.largeAC, 'wint-9040', [])
    expect(result.truncated).toBe(true)
    expect(result.total_candidates_reviewed).toBe(8)
  })

  it('sets truncated=false when 5 or fewer candidates', () => {
    const result = applyDAChallenges(fixtures.complete, 'wint-9040', [])
    expect(result.truncated).toBe(false)
    expect(result.total_candidates_reviewed).toBe(5)
  })

  it('assigns sequential IDs DA-001 through DA-005', () => {
    const result = applyDAChallenges(fixtures.complete, 'wint-9040', [])
    result.challenges.forEach((c, i) => {
      expect(c.id).toBe(`DA-${String(i + 1).padStart(3, '0')}`)
    })
  })

  it('propagates warnings into output', () => {
    const result = applyDAChallenges(fixtures.complete, 'wint-9040', ['gap_analysis_missing'])
    expect(result.warnings).toContain('gap_analysis_missing')
    expect(result.warning_count).toBe(1)
  })

  it('returns empty challenges for empty candidate list', () => {
    const result = applyDAChallenges([], 'wint-9040', [])
    expect(result.challenges).toHaveLength(0)
    expect(result.truncated).toBe(false)
    expect(result.total_candidates_reviewed).toBe(0)
  })
})

// ============================================================================
// scopeDefendNode integration tests
// ============================================================================

describe('scopeDefendNode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // HP-1: 5 non-critical ACs → challenges produced, truncated=false
  it('HP-1: 5 non-critical ACs → challenges produced, truncated=false', async () => {
    const state = makeBaseState()
    const result = await scopeDefendNode(state)
    const output = (result as GraphStateWithScopeDefend).scope_defend_output

    expect(output).not.toBeNull()
    expect(output?.challenges.length).toBeGreaterThan(0)
    expect(output?.challenges.length).toBeLessThanOrEqual(5)
    expect(output?.truncated).toBe(false)
    expect(output?.story_id).toBe('wint-9040')
  })

  // HP-2: 8 non-critical ACs → 5 challenges, truncated=true
  it('HP-2: 8 non-critical ACs → 5 challenges, truncated=true', async () => {
    const state = makeBaseState({ acceptance_criteria: fixtures.largeAC, gap_analysis: null })
    const result = await scopeDefendNode(state)
    const output = (result as GraphStateWithScopeDefend).scope_defend_output

    expect(output?.challenges).toHaveLength(5)
    expect(output?.truncated).toBe(true)
    expect(output?.total_candidates_reviewed).toBe(8)
  })

  // HP-3: 1 MVP-critical AC excluded
  it('HP-3: MVP-critical AC in gap analysis is excluded from challenges', async () => {
    const state = makeBaseState({
      acceptance_criteria: fixtures.mvpCritical,
      gap_analysis: { mvp_critical_ids: ['AC-1'] },
    })
    const result = await scopeDefendNode(state)
    const output = (result as GraphStateWithScopeDefend).scope_defend_output

    // Only AC-2 is challengeable
    expect(output?.challenges.every(c => c.target !== 'AC-1')).toBe(true)
    expect(output?.total_candidates_reviewed).toBe(1)
  })

  // EC-1: gap_analysis=null → warning_count >= 1
  it('EC-1: gap_analysis=null → warning_count >= 1', async () => {
    const state = makeBaseState({ gap_analysis: null })
    const result = await scopeDefendNode(state)
    const output = (result as GraphStateWithScopeDefend).scope_defend_output

    expect(output?.warnings).toContain('gap_analysis_missing')
    expect(output?.warning_count).toBeGreaterThanOrEqual(1)
    const stateResult = result as GraphStateWithScopeDefend
    expect(stateResult.warning_count).toBeGreaterThanOrEqual(1)
  })

  // EC-2: role_pack_path=null → warning_count >= 1
  it('EC-2: role_pack_path=null → warning_count >= 1', async () => {
    const state = makeBaseState({ role_pack_path: null })
    const result = await scopeDefendNode(state)
    const output = (result as GraphStateWithScopeDefend).scope_defend_output

    expect(output?.warnings).toContain('role_pack_missing')
    expect(output?.warning_count).toBeGreaterThanOrEqual(1)
    const stateResult = result as GraphStateWithScopeDefend
    expect(stateResult.warning_count).toBeGreaterThanOrEqual(1)
  })

  // EC-3: Idempotent overwrite (call twice)
  it('EC-3: calling twice produces same challenge count (idempotent)', async () => {
    const state = makeBaseState()
    const result1 = await scopeDefendNode(state)
    const result2 = await scopeDefendNode(state)

    const out1 = (result1 as GraphStateWithScopeDefend).scope_defend_output
    const out2 = (result2 as GraphStateWithScopeDefend).scope_defend_output

    expect(out1?.challenges.length).toBe(out2?.challenges.length)
    expect(out1?.truncated).toBe(out2?.truncated)
  })

  // ED-1: Zero ACs → challenges=[]
  it('ED-1: Zero ACs → challenges=[], truncated=false', async () => {
    const state = makeBaseState({ acceptance_criteria: [] })
    const result = await scopeDefendNode(state)
    const output = (result as GraphStateWithScopeDefend).scope_defend_output

    expect(output?.challenges).toHaveLength(0)
    expect(output?.truncated).toBe(false)
    expect(output?.total_candidates_reviewed).toBe(0)
  })

  // ED-2: All ACs MVP-critical → challenges=[]
  it('ED-2: All ACs MVP-critical → challenges=[]', async () => {
    const allCritical = [
      makeAC('AC-1', 'User auth is required', true),
      makeAC('AC-2', 'Data must be persisted', true),
    ]
    const state = makeBaseState({ acceptance_criteria: allCritical, gap_analysis: null })
    const result = await scopeDefendNode(state)
    const output = (result as GraphStateWithScopeDefend).scope_defend_output

    expect(output?.challenges).toHaveLength(0)
    expect(output?.total_candidates_reviewed).toBe(0)
  })

  // Blocking: story_brief missing → scope_defend_output=null
  it('BLOCKED: missing story_brief → scope_defend_output=null', async () => {
    const state = makeBaseState({ story_brief: null })
    const result = await scopeDefendNode(state)
    const stateResult = result as GraphStateWithScopeDefend

    expect(stateResult.scope_defend_output).toBeNull()
  })
})

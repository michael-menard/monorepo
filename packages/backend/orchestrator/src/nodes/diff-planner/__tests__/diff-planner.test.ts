/**
 * Unit Test Suite: Diff Planner Node
 *
 * Covers:
 *   HP-1..5  — Happy path scenarios
 *   EC-1..5  — Error/edge case scenarios (DB errors, parse failures, cold-start)
 *   ED-1..4  — Edge case scenarios (threshold boundaries, empty specs, etc.)
 *
 * APIP-3030: Learning-Aware Diff Planner
 */

import { describe, it, expect, vi } from 'vitest'

// ============================================================================
// Mocks — vi.mock is hoisted, factory must not reference top-level variables
// ============================================================================

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock pg — unit tests do not use a real DB
vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
  })),
}))

// ============================================================================
// Imports — after mocks are declared
// ============================================================================

import { logger } from '@repo/logger'
import {
  meetsConfidenceThreshold,
  buildAffinityPromptFragment,
  annotateEscalations,
  assembleAffinityContext,
} from '../prompt-assembly.js'
import { queryAffinityProfile, queryAffinityProfilesByModel } from '../affinity-query.js'
import type { DbClient } from '../affinity-query.js'
import {
  DiffPlannerOutputSchema,
  PlaceholderChangeSpecSchema,
  createFallbackOutput,
} from '../../../artifacts/diff-planner-output.js'
import {
  AFFINITY_CONFIDENCE_MIN,
  MAX_WEAK_PATTERNS_INJECTED,
  MAX_STRONG_PATTERNS_INJECTED,
  ESCALATION_MODEL_DEFAULT,
} from '../__types__/index.js'
import type { AffinityProfile } from '../__types__/index.js'
import type { PlaceholderChangeSpec } from '../../../artifacts/diff-planner-output.js'

// ============================================================================
// Fixtures
// ============================================================================

/**
 * Creates a valid AffinityProfile fixture.
 * TODO (APIP-1020): Update change_type values when ChangeTypeEnum is defined.
 */
function createAffinityProfile(overrides: Partial<AffinityProfile> = {}): AffinityProfile {
  return {
    model_id: 'claude-sonnet-4-6',
    change_type: 'schema_migration',
    success_rate: 0.85,
    confidence: 0.9,
    sample_count: 50,
    strong_patterns: ['Use explicit column types', 'Add indexes before data migration'],
    weak_patterns: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Creates a valid PlaceholderChangeSpec fixture.
 * TODO (APIP-1020): Replace with ChangeSpec fixtures from APIP-1020.
 */
function createChangeSpec(overrides: Partial<PlaceholderChangeSpec> = {}): PlaceholderChangeSpec {
  return PlaceholderChangeSpecSchema.parse({
    id: 'spec-001',
    change_type: 'schema_migration',
    description: 'Add model_affinity table to wint schema',
    complexity: 'medium',
    escalation_model: null,
    ...overrides,
  })
}

/**
 * Creates a mock DB client.
 */
function createMockDbClient(rows: Record<string, unknown>[] = []): DbClient {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  }
}

// ============================================================================
// HP-1: Happy path — profile found, high confidence, weak patterns injected
// ============================================================================

describe('HP-1: Profile found with weak patterns', () => {
  it('injects weak patterns into prompt fragment when success_rate < WEAKNESS_THRESHOLD', () => {
    const profiles: AffinityProfile[] = [
      createAffinityProfile({
        success_rate: 0.4,
        confidence: 0.9,
        change_type: 'api_refactor',
        weak_patterns: ['Avoid breaking changes', 'Add deprecation notices'],
        strong_patterns: [],
      }),
    ]

    const { fragment, weakCount, strongCount } = buildAffinityPromptFragment(profiles)

    expect(weakCount).toBeGreaterThan(0)
    expect(strongCount).toBe(0)
    expect(fragment).toContain('CAUTION')
    expect(fragment).toContain('api_refactor')
    expect(fragment).toContain('Avoid breaking changes')
  })
})

// ============================================================================
// HP-2: Happy path — profile found, high confidence, strong patterns injected
// ============================================================================

describe('HP-2: Profile found with strong patterns', () => {
  it('injects strong patterns into prompt fragment when success_rate >= WEAKNESS_THRESHOLD', () => {
    const profiles: AffinityProfile[] = [
      createAffinityProfile({
        success_rate: 0.9,
        confidence: 0.85,
        strong_patterns: ['Use explicit column types', 'Add indexes before data migration'],
        weak_patterns: [],
      }),
    ]

    const { fragment, weakCount, strongCount } = buildAffinityPromptFragment(profiles)

    expect(weakCount).toBe(0)
    expect(strongCount).toBeGreaterThan(0)
    expect(fragment).toContain('STRENGTH')
    expect(fragment).toContain('Use explicit column types')
  })
})

// ============================================================================
// HP-3: Happy path — escalation pre-assigned for weak change type
// ============================================================================

describe('HP-3: Escalation pre-assignment for weak change type', () => {
  it('annotates change specs with escalation_model when success_rate < WEAKNESS_THRESHOLD', () => {
    const weakProfile = createAffinityProfile({
      change_type: 'schema_migration',
      success_rate: 0.4,
      confidence: 0.9,
    })
    const spec = createChangeSpec({ change_type: 'schema_migration' })

    const { enrichedSpecs, escalationCount } = annotateEscalations([spec], [weakProfile])

    expect(escalationCount).toBe(1)
    expect(enrichedSpecs[0].escalation_model).toBe(ESCALATION_MODEL_DEFAULT)
    expect(enrichedSpecs[0].affinity_notes).toContain('Pre-assigned escalation')
  })

  it('does not annotate specs when success_rate >= WEAKNESS_THRESHOLD', () => {
    const strongProfile = createAffinityProfile({
      change_type: 'schema_migration',
      success_rate: 0.8,
      confidence: 0.9,
    })
    const spec = createChangeSpec({ change_type: 'schema_migration' })

    const { enrichedSpecs, escalationCount } = annotateEscalations([spec], [strongProfile])

    expect(escalationCount).toBe(0)
    expect(enrichedSpecs[0].escalation_model).toBeNull()
  })
})

// ============================================================================
// HP-4: Happy path — queryAffinityProfile returns valid profile
// ============================================================================

describe('HP-4: queryAffinityProfile returns valid profile from DB', () => {
  it('returns a parsed AffinityProfile when DB returns a valid row', async () => {
    const dbRow = {
      model_id: 'claude-sonnet-4-6',
      change_type: 'schema_migration',
      success_rate: 0.85,
      confidence: 0.9,
      sample_count: 50,
      strong_patterns: ['Explicit types'],
      weak_patterns: [],
      updated_at: new Date().toISOString(),
    }
    const db = createMockDbClient([dbRow])

    const result = await queryAffinityProfile(db, 'claude-sonnet-4-6', 'schema_migration')

    expect(result).not.toBeNull()
    expect(result?.model_id).toBe('claude-sonnet-4-6')
    expect(result?.success_rate).toBe(0.85)
  })
})

// ============================================================================
// HP-5: Happy path — assembleAffinityContext produces valid output metadata
// ============================================================================

describe('HP-5: assembleAffinityContext produces valid output', () => {
  it('returns a valid profile_metadata when profiles are available', () => {
    const profiles: AffinityProfile[] = [
      createAffinityProfile({
        success_rate: 0.4,
        confidence: 0.9,
        change_type: 'schema_migration',
        weak_patterns: ['pattern A'],
        strong_patterns: [],
      }),
    ]
    const specs = [createChangeSpec({ change_type: 'schema_migration' })]

    const { affinityPromptFragment, enrichedSpecs, profileMetadata } = assembleAffinityContext(
      'claude-sonnet-4-6',
      profiles,
      specs,
    )

    expect(profileMetadata.profile_used).toBe(true)
    expect(profileMetadata.model_id).toBe('claude-sonnet-4-6')
    expect(profileMetadata.escalation_preassigned).toBe(true)
    expect(affinityPromptFragment).toContain('Model Affinity Context')
    expect(enrichedSpecs[0].escalation_model).toBe(ESCALATION_MODEL_DEFAULT)
  })
})

// ============================================================================
// EC-1: Error case — DB error returns null (queryAffinityProfile)
// ============================================================================

describe('EC-1: DB error returns null from queryAffinityProfile', () => {
  it('returns null when db.query throws', async () => {
    const db: DbClient = {
      query: vi.fn().mockRejectedValue(new Error('Connection timeout')),
    }

    const result = await queryAffinityProfile(db, 'claude-sonnet-4-6', 'schema_migration')

    expect(result).toBeNull()
  })

  it('logs a warning when DB query throws', async () => {
    vi.mocked(logger.warn).mockClear()

    const db: DbClient = {
      query: vi.fn().mockRejectedValue(new Error('Connection refused')),
    }

    await queryAffinityProfile(db, 'my-model', 'my-change-type')

    expect(logger.warn).toHaveBeenCalledWith(
      'diff-planner:affinity-query',
      expect.objectContaining({ event: 'db_error' }),
    )
  })
})

// ============================================================================
// EC-2: Error case — No rows returns null (cold-start)
// ============================================================================

describe('EC-2: No rows returns null (cold-start)', () => {
  it('returns null when DB has no rows for the given pair', async () => {
    const db = createMockDbClient([])

    const result = await queryAffinityProfile(db, 'new-model', 'unseen-change-type')

    expect(result).toBeNull()
  })
})

// ============================================================================
// EC-3: Error case — Zod parse failure returns null
// ============================================================================

describe('EC-3: Zod parse failure returns null', () => {
  it('returns null when DB row fails schema validation', async () => {
    const invalidRow = {
      model_id: 'claude-sonnet-4-6',
      change_type: 'schema_migration',
      // Missing required fields: success_rate, confidence, sample_count
    }
    const db = createMockDbClient([invalidRow])

    const result = await queryAffinityProfile(db, 'claude-sonnet-4-6', 'schema_migration')

    expect(result).toBeNull()
  })

  it('logs a warning when parse fails', async () => {
    vi.mocked(logger.warn).mockClear()

    const invalidRow = { model_id: 'x', change_type: 'y' } // invalid — missing required fields
    const db = createMockDbClient([invalidRow])

    await queryAffinityProfile(db, 'x', 'y')

    expect(logger.warn).toHaveBeenCalledWith(
      'diff-planner:affinity-query',
      expect.objectContaining({ event: 'parse_error' }),
    )
  })
})

// ============================================================================
// EC-4: Error case — DB error in queryAffinityProfilesByModel returns []
// ============================================================================

describe('EC-4: DB error in queryAffinityProfilesByModel returns empty array', () => {
  it('returns empty array when db.query throws', async () => {
    const db: DbClient = {
      query: vi.fn().mockRejectedValue(new Error('DB unavailable')),
    }

    const result = await queryAffinityProfilesByModel(db, 'claude-sonnet-4-6')

    expect(result).toEqual([])
  })
})

// ============================================================================
// EC-5: Error case — createFallbackOutput produces valid Zod-compliant output
// ============================================================================

describe('EC-5: createFallbackOutput produces valid DiffPlannerOutput', () => {
  it('returns output that passes DiffPlannerOutputSchema validation', () => {
    const specs = [createChangeSpec()]
    const output = createFallbackOutput('APIP-3030', specs, 'No affinity data')

    expect(() => DiffPlannerOutputSchema.parse(output)).not.toThrow()
    expect(output.schema).toBe(1)
    expect(output.story_id).toBe('APIP-3030')
    expect(output.profile_metadata).toBeNull()
    expect(output.success).toBe(true)
  })

  it('returns output with empty affinity_prompt_fragment on fallback', () => {
    const output = createFallbackOutput('APIP-3030', [])

    expect(output.affinity_prompt_fragment).toBe('')
    expect(output.change_specs).toHaveLength(0)
  })
})

// ============================================================================
// ED-1: Edge case — confidence exactly at threshold is accepted
// ============================================================================

describe('ED-1: Confidence threshold boundary', () => {
  it('accepts profile with confidence exactly equal to AFFINITY_CONFIDENCE_MIN', () => {
    const profile = createAffinityProfile({ confidence: AFFINITY_CONFIDENCE_MIN })

    const passes = meetsConfidenceThreshold(profile)

    expect(passes).toBe(true)
  })

  it('rejects profile with confidence just below AFFINITY_CONFIDENCE_MIN', () => {
    const profile = createAffinityProfile({ confidence: AFFINITY_CONFIDENCE_MIN - 0.01 })

    const passes = meetsConfidenceThreshold(profile)

    expect(passes).toBe(false)
  })
})

// ============================================================================
// ED-2: Edge case — weak patterns capped at MAX_WEAK_PATTERNS_INJECTED
// ============================================================================

describe('ED-2: Weak patterns injection cap', () => {
  it('injects at most MAX_WEAK_PATTERNS_INJECTED weak patterns', () => {
    const manyWeakPatterns = Array.from({ length: 10 }, (_, i) => `weak pattern ${i + 1}`)
    const profiles: AffinityProfile[] = [
      createAffinityProfile({
        success_rate: 0.3,
        confidence: 0.9,
        weak_patterns: manyWeakPatterns,
        strong_patterns: [],
      }),
    ]

    const { weakCount } = buildAffinityPromptFragment(profiles)

    expect(weakCount).toBeLessThanOrEqual(MAX_WEAK_PATTERNS_INJECTED)
  })
})

// ============================================================================
// ED-3: Edge case — strong patterns capped at MAX_STRONG_PATTERNS_INJECTED
// ============================================================================

describe('ED-3: Strong patterns injection cap', () => {
  it('injects at most MAX_STRONG_PATTERNS_INJECTED strong patterns', () => {
    const manyStrongPatterns = Array.from({ length: 10 }, (_, i) => `strong pattern ${i + 1}`)
    const profiles: AffinityProfile[] = [
      createAffinityProfile({
        success_rate: 0.9,
        confidence: 0.9,
        strong_patterns: manyStrongPatterns,
        weak_patterns: [],
      }),
    ]

    const { strongCount } = buildAffinityPromptFragment(profiles)

    expect(strongCount).toBeLessThanOrEqual(MAX_STRONG_PATTERNS_INJECTED)
  })
})

// ============================================================================
// ED-4: Edge case — empty profiles produce no-op output
// ============================================================================

describe('ED-4: Empty profiles produce no-op output', () => {
  it('returns empty fragment and unmodified specs when profiles are empty', () => {
    const specs = [createChangeSpec()]

    const { affinityPromptFragment, enrichedSpecs, profileMetadata } = assembleAffinityContext(
      'claude-sonnet-4-6',
      [],
      specs,
    )

    expect(affinityPromptFragment).toBe('')
    expect(enrichedSpecs[0].escalation_model).toBeNull()
    expect(profileMetadata.profile_used).toBe(false)
    expect(profileMetadata.confidence_level).toBeNull()
    expect(profileMetadata.escalation_count).toBe(0)
  })

  it('produces profile_metadata with all-zero counts on empty profiles', () => {
    const { profileMetadata } = assembleAffinityContext('my-model', [], [])

    expect(profileMetadata.weak_patterns_injected).toBe(0)
    expect(profileMetadata.strong_patterns_injected).toBe(0)
    expect(profileMetadata.escalation_preassigned).toBe(false)
  })
})

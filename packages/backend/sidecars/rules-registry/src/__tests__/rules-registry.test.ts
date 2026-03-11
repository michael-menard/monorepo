/**
 * Unit Tests for Rules Registry Core Compute Functions
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Tests getRules, proposeRule, promoteRule with mocked DB.
 * Tests conflict-detector normalizeRuleText logic.
 *
 * AC-11: Unit tests achieve minimum 45% coverage; target 80%+ for core compute.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { normalizeRuleText } from '../conflict-detector.js'

// ============================================================================
// normalizeRuleText — pure function, no DB needed
// ============================================================================

describe('normalizeRuleText', () => {
  it('lowercases the text', () => {
    expect(normalizeRuleText('DO NOT USE INTERFACES')).toBe('do not use interfaces')
  })

  it('trims whitespace from both ends', () => {
    expect(normalizeRuleText('  No barrel files  ')).toBe('no barrel files')
  })

  it('lowercases and trims combined', () => {
    expect(normalizeRuleText('  NO BARREL FILES  ')).toBe('no barrel files')
  })

  it('handles already-normalized text', () => {
    expect(normalizeRuleText('use zod schemas')).toBe('use zod schemas')
  })

  it('handles internal whitespace (not trimmed, per spec)', () => {
    expect(normalizeRuleText('use  zod  schemas')).toBe('use  zod  schemas')
  })

  it('handles empty string', () => {
    expect(normalizeRuleText('')).toBe('')
  })

  it('handles single character', () => {
    expect(normalizeRuleText('A')).toBe('a')
  })
})

// ============================================================================
// Zod schema validation
// ============================================================================

import {
  GetRulesQuerySchema,
  ProposeRuleInputSchema,
  PromoteRuleInputSchema,
  RuleTypeSchema,
  RuleSeveritySchema,
  RuleStatusSchema,
} from '../__types__/index.js'

describe('GetRulesQuerySchema', () => {
  it('parses empty object (no filters)', () => {
    const result = GetRulesQuerySchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('parses valid type filter', () => {
    const result = GetRulesQuerySchema.safeParse({ type: 'gate' })
    expect(result.success).toBe(true)
    expect(result.data?.type).toBe('gate')
  })

  it('parses all three filters combined', () => {
    const result = GetRulesQuerySchema.safeParse({
      type: 'lint',
      scope: 'global',
      status: 'active',
    })
    expect(result.success).toBe(true)
  })

  it('fails on invalid type', () => {
    const result = GetRulesQuerySchema.safeParse({ type: 'invalid_type' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('rule_type must be gate|lint|prompt_injection')
  })

  it('fails on invalid status', () => {
    const result = GetRulesQuerySchema.safeParse({ status: 'unknown_status' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('status must be proposed|active|deprecated')
  })

  it('accepts all valid rule types', () => {
    for (const type of ['gate', 'lint', 'prompt_injection']) {
      const result = GetRulesQuerySchema.safeParse({ type })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid statuses', () => {
    for (const status of ['proposed', 'active', 'deprecated']) {
      const result = GetRulesQuerySchema.safeParse({ status })
      expect(result.success).toBe(true)
    }
  })
})

describe('ProposeRuleInputSchema', () => {
  const validInput = {
    rule_text: 'Do not use TypeScript interfaces',
    rule_type: 'lint',
    scope: 'global',
    severity: 'error',
  }

  it('parses valid input', () => {
    const result = ProposeRuleInputSchema.safeParse(validInput)
    expect(result.success).toBe(true)
  })

  it('fails when rule_text is missing', () => {
    const result = ProposeRuleInputSchema.safeParse({ ...validInput, rule_text: undefined })
    expect(result.success).toBe(false)
  })

  it('fails when rule_text is empty string', () => {
    const result = ProposeRuleInputSchema.safeParse({ ...validInput, rule_text: '' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toContain('rule_text is required')
  })

  it('fails when rule_type is invalid', () => {
    const result = ProposeRuleInputSchema.safeParse({ ...validInput, rule_type: 'invalid_type' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('rule_type must be gate|lint|prompt_injection')
  })

  it('fails when severity is invalid', () => {
    const result = ProposeRuleInputSchema.safeParse({ ...validInput, severity: 'critical' })
    expect(result.success).toBe(false)
  })

  it('defaults scope to global when not provided', () => {
    const { scope: _scope, ...inputWithoutScope } = validInput
    const result = ProposeRuleInputSchema.safeParse(inputWithoutScope)
    expect(result.success).toBe(true)
    expect(result.data?.scope).toBe('global')
  })

  it('accepts optional source_story_id', () => {
    const result = ProposeRuleInputSchema.safeParse({
      ...validInput,
      source_story_id: 'WINT-4020',
    })
    expect(result.success).toBe(true)
    expect(result.data?.source_story_id).toBe('WINT-4020')
  })

  it('accepts all valid rule_types', () => {
    for (const rule_type of ['gate', 'lint', 'prompt_injection']) {
      const result = ProposeRuleInputSchema.safeParse({ ...validInput, rule_type })
      expect(result.success).toBe(true)
    }
  })

  it('accepts all valid severities', () => {
    for (const severity of ['error', 'warning', 'info']) {
      const result = ProposeRuleInputSchema.safeParse({ ...validInput, severity })
      expect(result.success).toBe(true)
    }
  })
})

describe('PromoteRuleInputSchema', () => {
  it('parses empty body (no source refs)', () => {
    const result = PromoteRuleInputSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('parses with source_story_id only', () => {
    const result = PromoteRuleInputSchema.safeParse({ source_story_id: 'WINT-4020' })
    expect(result.success).toBe(true)
  })

  it('parses with source_lesson_id only', () => {
    const result = PromoteRuleInputSchema.safeParse({ source_lesson_id: 'lesson-123' })
    expect(result.success).toBe(true)
  })

  it('parses with both source refs', () => {
    const result = PromoteRuleInputSchema.safeParse({
      source_story_id: 'WINT-4020',
      source_lesson_id: 'lesson-123',
    })
    expect(result.success).toBe(true)
  })
})

describe('RuleTypeSchema', () => {
  it('accepts gate', () => expect(RuleTypeSchema.safeParse('gate').success).toBe(true))
  it('accepts lint', () => expect(RuleTypeSchema.safeParse('lint').success).toBe(true))
  it('accepts prompt_injection', () =>
    expect(RuleTypeSchema.safeParse('prompt_injection').success).toBe(true))
  it('rejects unknown', () =>
    expect(RuleTypeSchema.safeParse('unknown').success).toBe(false))
})

describe('RuleSeveritySchema', () => {
  it('accepts error', () => expect(RuleSeveritySchema.safeParse('error').success).toBe(true))
  it('accepts warning', () => expect(RuleSeveritySchema.safeParse('warning').success).toBe(true))
  it('accepts info', () => expect(RuleSeveritySchema.safeParse('info').success).toBe(true))
  it('rejects critical', () => expect(RuleSeveritySchema.safeParse('critical').success).toBe(false))
})

describe('RuleStatusSchema', () => {
  it('accepts proposed', () => expect(RuleStatusSchema.safeParse('proposed').success).toBe(true))
  it('accepts active', () => expect(RuleStatusSchema.safeParse('active').success).toBe(true))
  it('accepts deprecated', () =>
    expect(RuleStatusSchema.safeParse('deprecated').success).toBe(true))
  it('rejects pending', () => expect(RuleStatusSchema.safeParse('pending').success).toBe(false))
})

// ============================================================================
// promoteRule — source reference validation (unit-testable without DB)
// ============================================================================

import { promoteRule } from '../rules-registry.js'

// Mock @repo/db for unit tests
vi.mock('@repo/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}))

// Mock @repo/database-schema
vi.mock('@repo/database-schema', () => ({
  rules: {
    id: 'id',
    ruleText: 'rule_text',
    ruleType: 'rule_type',
    scope: 'scope',
    severity: 'severity',
    status: 'status',
    sourceStoryId: 'source_story_id',
    sourceLessonId: 'source_lesson_id',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  ruleTypeEnum: {},
  ruleSeverityEnum: {},
  ruleStatusEnum: {},
  insertRuleSchema: {},
  selectRuleSchema: {},
}))

describe('promoteRule — source reference validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 422 when neither source_story_id nor source_lesson_id provided', async () => {
    const result = await promoteRule('some-uuid', {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(422)
      expect(result.error).toBe('source_story_id or source_lesson_id required to promote')
    }
  })

  it('returns 422 when body has empty values (both undefined)', async () => {
    const result = await promoteRule('some-uuid', {
      source_story_id: undefined,
      source_lesson_id: undefined,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(422)
    }
  })
})

// ============================================================================
// getRules — with mocked DB
// ============================================================================

import { getRules } from '../rules-registry.js'
import { db } from '@repo/db'

describe('getRules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array when DB returns no rows', async () => {
    const mockDb = db as any
    // When conditions.length === 0, code calls db.select().from(rules) — needs direct thenable
    mockDb.select.mockReturnValue({
      from: vi.fn().mockResolvedValue([]),
    })

    const result = await getRules({})
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('returns empty array with status filter when DB returns no rows', async () => {
    const mockDb = db as any
    // With conditions, code calls db.select().from(rules).where(and(...))
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    })

    const result = await getRules({ status: 'active' })
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('returns mapped rules when DB returns rows (no filter)', async () => {
    const mockRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ruleText: 'Use Zod schemas',
      ruleType: 'lint',
      scope: 'global',
      severity: 'error',
      status: 'active',
      sourceStoryId: 'WINT-4020',
      sourceLessonId: null,
      createdAt: new Date('2026-03-07'),
      updatedAt: new Date('2026-03-07'),
    }

    const mockDb = db as any
    mockDb.select.mockReturnValue({
      from: vi.fn().mockResolvedValue([mockRow]),
    })

    const result = await getRules({})
    expect(result).toHaveLength(1)
    expect(result[0].rule_text).toBe('Use Zod schemas')
    expect(result[0].rule_type).toBe('lint')
  })
})

// ============================================================================
// proposeRule — conflict detection (mocked detectConflicts)
// ============================================================================

import { proposeRule } from '../rules-registry.js'
import * as conflictDetector from '../conflict-detector.js'

describe('proposeRule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns conflict result when duplicates found', async () => {
    vi.spyOn(conflictDetector, 'detectConflicts').mockResolvedValue([
      '123e4567-e89b-12d3-a456-426614174000',
    ])

    const result = await proposeRule({
      rule_text: 'Use Zod schemas',
      rule_type: 'lint',
      scope: 'global',
      severity: 'error',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('Conflict: rule already exists')
      expect(result.conflicting_ids).toHaveLength(1)
    }
  })

  it('inserts rule when no conflicts found', async () => {
    vi.spyOn(conflictDetector, 'detectConflicts').mockResolvedValue([])

    const mockInserted = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      ruleText: 'Use Zod schemas',
      ruleType: 'lint',
      scope: 'global',
      severity: 'error',
      status: 'proposed',
      sourceStoryId: 'WINT-4020',
      sourceLessonId: null,
      createdAt: new Date('2026-03-07'),
      updatedAt: new Date('2026-03-07'),
    }

    const mockDb = db as any
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockInserted]),
      }),
    })

    const result = await proposeRule({
      rule_text: 'Use Zod schemas',
      rule_type: 'lint',
      scope: 'global',
      severity: 'error',
      source_story_id: 'WINT-4020',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rule_text).toBe('Use Zod schemas')
      expect(result.data.status).toBe('proposed')
    }
  })
})

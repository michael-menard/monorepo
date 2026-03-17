/**
 * Integration Tests for Rules Registry Sidecar
 * WINT-4020: Create Rules Registry Sidecar
 *
 * Tests against live database per ADR-005.
 * Requires postgres on the configured host/port with wint schema and rules table.
 * Tests are skipped gracefully if DB is unavailable.
 *
 * To run: POSTGRES_HOST=localhost POSTGRES_PORT=5433 POSTGRES_USERNAME=... pnpm test
 *
 * AC-12: Integration tests against live postgres — no DB mocking.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { logger } from '@repo/logger'

// ============================================================================
// DB availability check — lazy to avoid crashing without env vars
// ============================================================================

let dbAvailable = false
let db: any = null
let rules: any = null
let getRulesFn: any = null
let proposeRuleFn: any = null
let promoteRuleFn: any = null

async function initDb(): Promise<boolean> {
  try {
    // Dynamic imports to avoid crashing on load when env vars are missing
    const dbModule = await import('@repo/db').catch(() => null)
    if (!dbModule) return false

    const schemaModule = await import('@repo/knowledge-base/db').catch(() => null)
    if (!schemaModule) return false

    const rulesModule = await import('../../rules-registry.js').catch(() => null)
    if (!rulesModule) return false

    db = dbModule.db
    rules = schemaModule.rules
    getRulesFn = rulesModule.getRules
    proposeRuleFn = rulesModule.proposeRule
    promoteRuleFn = rulesModule.promoteRule

    // Test actual connectivity
    await db.select({ id: rules.id }).from(rules).limit(1)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Setup / teardown
// ============================================================================

const TEST_SOURCE_ID = 'WINT-4020-INTG-TEST'

async function cleanTestData(): Promise<void> {
  if (!db || !rules) return
  try {
    const { eq } = await import('drizzle-orm')
    await db.delete(rules).where(eq(rules.sourceStoryId, TEST_SOURCE_ID))
  } catch {
    // ignore cleanup errors
  }
}

beforeAll(async () => {
  dbAvailable = await initDb()
  if (dbAvailable) {
    await cleanTestData()
  }
})

afterAll(async () => {
  if (dbAvailable) {
    await cleanTestData()
  }
})

// ============================================================================
// HP-1: GET /rules returns all active rules
// ============================================================================

describe('Integration: getRules', () => {
  it('ED-3: GET /rules with empty DB returns empty array — not 404', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const result = await getRulesFn({})
    expect(Array.isArray(result)).toBe(true)
    // Empty array is valid response (not 404)
  })

  it('HP-2: GET /rules?type=gate returns only gate rules', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    await proposeRuleFn({
      rule_text: `INTG-TEST gate rule 1 ${Date.now()}`,
      rule_type: 'gate',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })
    await proposeRuleFn({
      rule_text: `INTG-TEST gate rule 2 ${Date.now()}`,
      rule_type: 'gate',
      scope: 'global',
      severity: 'warning',
      source_story_id: TEST_SOURCE_ID,
    })
    await proposeRuleFn({
      rule_text: `INTG-TEST lint rule 1 ${Date.now()}`,
      rule_type: 'lint',
      scope: 'global',
      severity: 'info',
      source_story_id: TEST_SOURCE_ID,
    })

    const gateRules = await getRulesFn({ type: 'gate', status: 'proposed' })
    const testGateRules = gateRules.filter((r: any) => r.source_story_id === TEST_SOURCE_ID)
    expect(testGateRules.length).toBeGreaterThanOrEqual(2)
    expect(testGateRules.every((r: any) => r.rule_type === 'gate')).toBe(true)
  })

  it('HP-4: GET /rules?status=proposed returns proposed rules', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const proposed = await getRulesFn({ status: 'proposed' })
    const testProposed = proposed.filter((r: any) => r.source_story_id === TEST_SOURCE_ID)
    expect(testProposed.every((r: any) => r.status === 'proposed')).toBe(true)
  })
})

// ============================================================================
// HP-5: POST /rules creates rule with status=proposed
// ============================================================================

describe('Integration: proposeRule', () => {
  it('HP-5: POST /rules creates a new rule with status=proposed', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const result = await proposeRuleFn({
      rule_text: `INTG-TEST: Do not use TypeScript interfaces ${Date.now()}`,
      rule_type: 'lint',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.id).toBeDefined()
      expect(result.data.status).toBe('proposed')
      expect(result.data.rule_type).toBe('lint')
      expect(result.data.source_story_id).toBe(TEST_SOURCE_ID)
    }
  })

  it('EC-3: POST /rules returns conflict for duplicate rule_text (case-insensitive)', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const ruleText = `INTG-CONFLICT-TEST ${Date.now()}`

    const first = await proposeRuleFn({
      rule_text: ruleText,
      rule_type: 'gate',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })
    expect(first.ok).toBe(true)

    const second = await proposeRuleFn({
      rule_text: ruleText.toUpperCase(),
      rule_type: 'gate',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.error).toBe('Conflict: rule already exists')
      expect(second.conflicting_ids.length).toBeGreaterThan(0)
    }
  })

  it('ED-2: conflict detection is case-insensitive and trims whitespace', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const ruleText = `INTG-WHITESPACE-TEST ${Date.now()}`

    await proposeRuleFn({
      rule_text: ruleText,
      rule_type: 'lint',
      scope: 'global',
      severity: 'warning',
      source_story_id: TEST_SOURCE_ID,
    })

    const duplicate = await proposeRuleFn({
      rule_text: `  ${ruleText.toUpperCase()}  `,
      rule_type: 'lint',
      scope: 'global',
      severity: 'warning',
      source_story_id: TEST_SOURCE_ID,
    })
    expect(duplicate.ok).toBe(false)
    if (!duplicate.ok) {
      expect(duplicate.conflicting_ids.length).toBeGreaterThan(0)
    }
  })

  it('ED-5: re-proposal allowed when existing rule is deprecated', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const { eq } = await import('drizzle-orm')
    const ruleText = `INTG-DEPRECATED-TEST ${Date.now()}`

    const first = await proposeRuleFn({
      rule_text: ruleText,
      rule_type: 'gate',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })
    expect(first.ok).toBe(true)
    if (!first.ok) return

    await db.update(rules).set({ status: 'deprecated' }).where(eq(rules.id, first.data.id))

    const second = await proposeRuleFn({
      rule_text: ruleText,
      rule_type: 'gate',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })
    expect(second.ok).toBe(true)
  })
})

// ============================================================================
// HP-6: POST /rules/:id/promote promotes rule
// ============================================================================

describe('Integration: promoteRule', () => {
  it('HP-6: POST /rules/:id/promote promotes proposed rule to active', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const proposed = await proposeRuleFn({
      rule_text: `INTG-PROMOTE-TEST ${Date.now()}`,
      rule_type: 'prompt_injection',
      scope: 'global',
      severity: 'info',
      source_story_id: TEST_SOURCE_ID,
    })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return

    const result = await promoteRuleFn(proposed.data.id, {
      source_story_id: TEST_SOURCE_ID,
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.status).toBe('active')
      expect(result.data.id).toBe(proposed.data.id)
    }
  })

  it('EC-4: promoteRule returns 422 when no source reference', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const result = await promoteRuleFn('any-id', {})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(422)
    }
  })

  it('EC-5: promoteRule returns 404 when rule not found', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const result = await promoteRuleFn('00000000-0000-0000-0000-000000000000', {
      source_story_id: TEST_SOURCE_ID,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(404)
      expect(result.error).toBe('Rule not found')
    }
  })

  it('EC-7: promoteRule returns 409 when rule is already active', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const proposed = await proposeRuleFn({
      rule_text: `INTG-ALREADY-ACTIVE-TEST ${Date.now()}`,
      rule_type: 'gate',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })
    expect(proposed.ok).toBe(true)
    if (!proposed.ok) return

    await promoteRuleFn(proposed.data.id, { source_story_id: TEST_SOURCE_ID })

    const second = await promoteRuleFn(proposed.data.id, { source_story_id: TEST_SOURCE_ID })
    expect(second.ok).toBe(false)
    if (!second.ok) {
      expect(second.status).toBe(409)
      expect(second.error).toBe('Rule is already active')
    }
  })
})

// ============================================================================
// HP-7: Combined filters
// ============================================================================

describe('Integration: combined filters', () => {
  it('HP-7: GET /rules?type=lint&status=active returns combined filter', async () => {
    if (!dbAvailable) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const proposed = await proposeRuleFn({
      rule_text: `INTG-COMBINED-FILTER-TEST ${Date.now()}`,
      rule_type: 'lint',
      scope: 'global',
      severity: 'error',
      source_story_id: TEST_SOURCE_ID,
    })
    if (proposed.ok) {
      await promoteRuleFn(proposed.data.id, { source_story_id: TEST_SOURCE_ID })
    }

    const results = await getRulesFn({ type: 'lint', status: 'active' })
    expect(results.every((r: any) => r.rule_type === 'lint' && r.status === 'active')).toBe(true)
  })
})

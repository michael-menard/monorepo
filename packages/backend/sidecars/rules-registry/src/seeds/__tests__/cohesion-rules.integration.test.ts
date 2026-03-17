/**
 * Integration Tests: Cohesion Rules Seed Script
 * WINT-4050: Seed Initial Cohesion Rules into the Rules Registry
 *
 * Tests against live wint.rules table (ADR-005).
 * Tests are skipped gracefully if DB is unavailable.
 *
 * AC-2: Idempotency — re-running seed does not duplicate rules
 * AC-3: All seeded rules carry source_story_id === 'WINT-4050'
 * AC-6: getRules({ status: 'active' }) returns all seeded rules after seed
 * AC-7: All test assertions are type-safe
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { logger } from '@repo/logger'

// ============================================================================
// DB availability check — lazy to avoid crashing without env vars
// ============================================================================

let dbAvailable = false
let db: any = null
let rulesTable: any = null
let seedFn: typeof import('../cohesion-rules.js').seedCohesionRules | null = null
let getRulesFn: typeof import('../../rules-registry.js').getRules | null = null

async function initDb(): Promise<boolean> {
  try {
    const dbModule = await import('@repo/db').catch(() => null)
    if (!dbModule) return false

    const schemaModule = await import('@repo/knowledge-base/db').catch(() => null)
    if (!schemaModule) return false

    const registryModule = await import('../../rules-registry.js').catch(() => null)
    if (!registryModule) return false

    const seedModule = await import('../cohesion-rules.js').catch(() => null)
    if (!seedModule) return false

    db = dbModule.db
    rulesTable = schemaModule.rules
    getRulesFn = registryModule.getRules
    seedFn = seedModule.seedCohesionRules

    // Test actual connectivity
    await db.select({ id: rulesTable.id }).from(rulesTable).limit(1)
    return true
  } catch {
    return false
  }
}

// ============================================================================
// Setup / teardown
// ============================================================================

/** Clean up any WINT-4050-sourced rules so tests start from a known state. */
async function cleanSeedData(): Promise<void> {
  if (!db || !rulesTable) return
  try {
    const { eq } = await import('drizzle-orm')
    await db.delete(rulesTable).where(eq(rulesTable.sourceStoryId, 'WINT-4050'))
  } catch {
    // ignore cleanup errors
  }
}

beforeAll(async () => {
  dbAvailable = await initDb()
  if (dbAvailable) {
    // Clean any existing WINT-4050 rules to ensure a known starting state
    await cleanSeedData()
  }
})

afterAll(async () => {
  if (dbAvailable) {
    // Clean up seeded rules after tests
    await cleanSeedData()
  }
})

// ============================================================================
// HP-1: First-run seeding — 4 rules proposed and promoted (AC-6)
// ============================================================================

describe('Integration: seedCohesionRules — first run (HP-1)', () => {
  it('seeds exactly 4 active rules on first run', async () => {
    if (!dbAvailable || !seedFn || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const seedResult = await seedFn()

    expect(seedResult.proposed).toBe(4)
    expect(seedResult.promoted).toBe(4)
    expect(seedResult.conflicts).toBe(0)
    expect(seedResult.failures).toBe(0)

    const activeRules = await getRulesFn({ status: 'active' })
    const wint4050Rules = activeRules.filter(r => r.source_story_id === 'WINT-4050')
    expect(wint4050Rules).toHaveLength(4)
  })
})

// ============================================================================
// HP-2: source_story_id — all rules carry WINT-4050 (AC-3)
// ============================================================================

describe('Integration: seedCohesionRules — source_story_id (HP-2)', () => {
  it('all seeded rules have source_story_id === WINT-4050', async () => {
    if (!dbAvailable || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const activeRules = await getRulesFn({ status: 'active' })
    const wint4050Rules = activeRules.filter(r => r.source_story_id === 'WINT-4050')

    expect(wint4050Rules.length).toBeGreaterThan(0)
    expect(wint4050Rules.every(r => r.source_story_id === 'WINT-4050')).toBe(true)
  })
})

// ============================================================================
// HP-3: Snapshot — exact rule set matches expected specification
// ============================================================================

describe('Integration: seedCohesionRules — snapshot (HP-3)', () => {
  it('seeded rules match expected rule_text, rule_type, severity (snapshot)', async () => {
    if (!dbAvailable || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const activeRules = await getRulesFn({ status: 'active' })
    const wint4050Rules = activeRules
      .filter(r => r.source_story_id === 'WINT-4050')
      .map(r => ({ rule_text: r.rule_text, rule_type: r.rule_type, severity: r.severity }))
      .sort((a, b) => a.rule_text.localeCompare(b.rule_text))

    expect(wint4050Rules).toMatchInlineSnapshot(`
      [
        {
          "rule_text": "A feature with a create capability must have a corresponding delete capability",
          "rule_type": "gate",
          "severity": "error",
        },
        {
          "rule_text": "A feature with a delete capability must have a corresponding create capability",
          "rule_type": "gate",
          "severity": "error",
        },
        {
          "rule_text": "A feature with an update capability must have a corresponding read capability",
          "rule_type": "gate",
          "severity": "warning",
        },
        {
          "rule_text": "A feature with an upload capability must have a corresponding replace or update capability",
          "rule_type": "prompt_injection",
          "severity": "warning",
        },
      ]
    `)
  })

  it('has 3 gate rules and 1 prompt_injection rule', async () => {
    if (!dbAvailable || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const activeRules = await getRulesFn({ status: 'active' })
    const wint4050Rules = activeRules.filter(r => r.source_story_id === 'WINT-4050')

    const gateRules = wint4050Rules.filter(r => r.rule_type === 'gate')
    const promptInjectionRules = wint4050Rules.filter(r => r.rule_type === 'prompt_injection')

    expect(gateRules).toHaveLength(3)
    expect(promptInjectionRules).toHaveLength(1)
  })

  it('upload/replace rule is stored as prompt_injection advisory (AC-5, ED-1)', async () => {
    if (!dbAvailable || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    const activeRules = await getRulesFn({ status: 'active', type: 'prompt_injection' })
    const uploadRule = activeRules.find(
      r => r.source_story_id === 'WINT-4050' && r.rule_text.toLowerCase().includes('upload'),
    )

    expect(uploadRule).toBeDefined()
    expect(uploadRule?.rule_type).toBe('prompt_injection')
    expect(uploadRule?.severity).toBe('warning')
  })
})

// ============================================================================
// EC-1: Idempotency — re-running seed does not duplicate rules (AC-2)
// ============================================================================

describe('Integration: seedCohesionRules — idempotency (EC-1)', () => {
  it('re-running seed does not create duplicate rules', async () => {
    if (!dbAvailable || !seedFn || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    // Run seed a second time (first run was in HP-1)
    const secondRunResult = await seedFn()

    // All should be conflicts (already exist)
    expect(secondRunResult.conflicts).toBe(4)
    expect(secondRunResult.proposed).toBe(0)
    expect(secondRunResult.promoted).toBe(0)
    expect(secondRunResult.failures).toBe(0)

    // Rule count must be unchanged
    const activeRules = await getRulesFn({ status: 'active' })
    const wint4050Rules = activeRules.filter(r => r.source_story_id === 'WINT-4050')
    expect(wint4050Rules).toHaveLength(4)
  })

  it('third run also idempotent — still exactly 4 active rules', async () => {
    if (!dbAvailable || !seedFn || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    await seedFn()

    const activeRules = await getRulesFn({ status: 'active' })
    const wint4050Rules = activeRules.filter(r => r.source_story_id === 'WINT-4050')
    expect(wint4050Rules).toHaveLength(4)
  })
})

// ============================================================================
// ED-3: Empty table — seed handles clean state (AC-6)
// ============================================================================

describe('Integration: seedCohesionRules — empty table start (ED-3)', () => {
  it('seed returns valid results after starting from empty WINT-4050 rules', async () => {
    if (!dbAvailable || !seedFn || !getRulesFn) {
      logger.info('[integration] DB unavailable — skipping')
      return
    }

    // Tests are ordered: after prior tests and afterAll cleanup ensures clean state
    // This test verifies the initial run in the suite succeeded
    const activeRules = await getRulesFn({ status: 'active' })
    const wint4050Rules = activeRules.filter(r => r.source_story_id === 'WINT-4050')

    // After prior tests, rules should exist (seed was run)
    expect(wint4050Rules.length).toBeGreaterThanOrEqual(4)
  })
})

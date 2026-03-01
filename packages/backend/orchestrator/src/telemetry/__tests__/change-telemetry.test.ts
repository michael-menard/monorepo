/**
 * Unit Tests: change-telemetry.ts
 *
 * Story: APIP-3010 - Change Telemetry Table and Instrumentation
 *
 * ACs covered:
 * - AC-8: DB failure does not throw, logger.warn called once
 * - AC-9: All 4 outcome types produce valid ChangeTelemetrySchema records;
 *         nullable fields accept null
 *
 * Test strategy:
 * - Mock the pg-compatible db client (query method)
 * - Mock @repo/logger to capture warn calls
 * - All tests are pure unit tests — no real DB required
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ChangeTelemetrySchema, writeTelemetry, type ChangeTelemetry } from '../change-telemetry.js'

// ============================================================================
// Mock @repo/logger
// ============================================================================

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import after mock registration so we get the mocked version
import { logger } from '@repo/logger'

// ============================================================================
// Test fixtures
// ============================================================================

/**
 * Minimal valid ChangeTelemetry record for 'pass' outcome.
 * Used as baseline; individual tests override specific fields.
 */
function baseRecord(overrides: Partial<ChangeTelemetry> = {}): ChangeTelemetry {
  return {
    storyId: 'APIP-3010',
    modelId: 'claude-sonnet-4-5',
    affinityKey: 'ts:backend',
    changeType: 'unknown',
    fileType: 'unknown',
    outcome: 'pass',
    tokensIn: 1000,
    tokensOut: 500,
    escalatedTo: null,
    retryCount: 0,
    errorCode: null,
    errorMessage: null,
    durationMs: null,
    ...overrides,
  }
}

/**
 * Create a mock db with a successful query() stub.
 */
function mockDb() {
  return {
    query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
  }
}

/**
 * Create a mock db whose query() rejects with an error.
 */
function mockFailingDb(error: Error = new Error('Connection refused')) {
  return {
    query: vi.fn().mockRejectedValue(error),
  }
}

// ============================================================================
// AC-8: DB failure does not throw, logger.warn called once
// ============================================================================

describe('writeTelemetry — AC-8: error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('EC-1: does not throw when DB query rejects', async () => {
    const db = mockFailingDb()
    const record = baseRecord()

    // Must resolve (not reject) even when DB fails
    await expect(writeTelemetry(record, db)).resolves.toBeUndefined()
  })

  it('EC-1: calls logger.warn exactly once when DB query rejects', async () => {
    const db = mockFailingDb(new Error('ECONNREFUSED'))
    const record = baseRecord({ storyId: 'APIP-3010', outcome: 'fail' })

    await writeTelemetry(record, db)

    expect(logger.warn).toHaveBeenCalledTimes(1)
  })

  it('EC-1: logger.warn receives error and context object', async () => {
    const dbError = new Error('DB timeout')
    const db = mockFailingDb(dbError)
    const record = baseRecord({ storyId: 'APIP-TEST', outcome: 'abort' })

    await writeTelemetry(record, db)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ err: dbError.message, storyId: 'APIP-TEST' }),
    )
  })

  it('EC-1: does not call logger.warn on successful write', async () => {
    const db = mockDb()
    const record = baseRecord()

    await writeTelemetry(record, db)

    expect(logger.warn).not.toHaveBeenCalled()
  })
})

// ============================================================================
// AC-9: All 4 outcome types produce valid ChangeTelemetrySchema records
// ============================================================================

describe('ChangeTelemetrySchema — AC-9: outcome type validation', () => {
  const validOutcomes = ['pass', 'fail', 'abort', 'budget_exhausted'] as const

  it('ED-3: all 4 outcome values are accepted by ChangeTelemetrySchema', () => {
    validOutcomes.forEach(outcome => {
      const result = ChangeTelemetrySchema.safeParse(baseRecord({ outcome }))
      expect(result.success, `outcome '${outcome}' should be valid`).toBe(true)
    })
  })

  it('ED-3: invalid outcome value is rejected by ChangeTelemetrySchema', () => {
    const invalidRecord = { ...baseRecord(), outcome: 'unknown' }
    const result = ChangeTelemetrySchema.safeParse(invalidRecord)
    expect(result.success).toBe(false)
  })

  it('HP-1: pass outcome — writeTelemetry calls db.query once', async () => {
    const db = mockDb()
    await writeTelemetry(baseRecord({ outcome: 'pass' }), db)
    expect(db.query).toHaveBeenCalledTimes(1)
  })

  it('HP-2: budget_exhausted outcome — writeTelemetry calls db.query once', async () => {
    const db = mockDb()
    await writeTelemetry(baseRecord({ outcome: 'budget_exhausted', escalatedTo: 'claude' }), db)
    expect(db.query).toHaveBeenCalledTimes(1)
  })

  it('HP-2: budget_exhausted + escalatedTo round-trip — params include escalatedTo value', async () => {
    const db = mockDb()
    await writeTelemetry(
      baseRecord({ outcome: 'budget_exhausted', escalatedTo: 'claude-opus-4' }),
      db,
    )

    const [_sql, params] = db.query.mock.calls[0]
    expect(params).toContain('claude-opus-4')
  })
})

// ============================================================================
// AC-9: Nullable fields accept null
// ============================================================================

describe('ChangeTelemetrySchema — AC-9: nullable fields', () => {
  it('ED-1: escalatedTo accepts null', () => {
    const result = ChangeTelemetrySchema.safeParse(baseRecord({ escalatedTo: null }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.escalatedTo).toBeNull()
  })

  it('ED-1: errorCode accepts null', () => {
    const result = ChangeTelemetrySchema.safeParse(baseRecord({ errorCode: null }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.errorCode).toBeNull()
  })

  it('ED-1: errorMessage accepts null', () => {
    const result = ChangeTelemetrySchema.safeParse(baseRecord({ errorMessage: null }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.errorMessage).toBeNull()
  })

  it('ED-1: durationMs accepts null', () => {
    const result = ChangeTelemetrySchema.safeParse(baseRecord({ durationMs: null }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.durationMs).toBeNull()
  })

  it('ED-1: nullable fields accept non-null values', () => {
    const result = ChangeTelemetrySchema.safeParse(
      baseRecord({
        escalatedTo: 'claude-opus-4',
        errorCode: 'BUDGET_CAP',
        errorMessage: 'Token budget exceeded',
        durationMs: 4200,
      }),
    )
    expect(result.success).toBe(true)
  })
})

// ============================================================================
// ChangeTelemetrySchema field validation
// ============================================================================

describe('ChangeTelemetrySchema — field validation', () => {
  it('requires storyId to be non-empty', () => {
    const result = ChangeTelemetrySchema.safeParse(baseRecord({ storyId: '' }))
    expect(result.success).toBe(false)
  })

  it('requires modelId to be non-empty', () => {
    const result = ChangeTelemetrySchema.safeParse(baseRecord({ modelId: '' }))
    expect(result.success).toBe(false)
  })

  it('requires affinityKey to be non-empty', () => {
    const result = ChangeTelemetrySchema.safeParse(baseRecord({ affinityKey: '' }))
    expect(result.success).toBe(false)
  })

  it('changeType defaults to unknown when not provided', () => {
    const { changeType: _changeType, ...record } = baseRecord()
    const result = ChangeTelemetrySchema.safeParse(record)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.changeType).toBe('unknown')
  })

  it('fileType defaults to unknown when not provided', () => {
    const { fileType: _fileType, ...record } = baseRecord()
    const result = ChangeTelemetrySchema.safeParse(record)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.fileType).toBe('unknown')
  })

  it('tokensIn and tokensOut default to 0 when not provided', () => {
    const { tokensIn: _tokensIn, tokensOut: _tokensOut, ...record } = baseRecord()
    const result = ChangeTelemetrySchema.safeParse(record)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.tokensIn).toBe(0)
      expect(result.data.tokensOut).toBe(0)
    }
  })
})

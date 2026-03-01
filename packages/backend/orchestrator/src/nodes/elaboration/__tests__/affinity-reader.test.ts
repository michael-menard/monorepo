/**
 * Unit tests for affinity-reader.ts
 *
 * APIP-3050 AC-11: 6 unit test scenarios covering HP, EC, ED paths.
 * Tests are arranged around the following scenarios:
 *   HP-1: Normal path — affinity rows found, map populated
 *   HP-2: Multiple items with same (changeType, fileType) pair — deduplication
 *   HP-3: AffinityGuidanceSchema validates correct shape
 *   EC-1: DB error thrown → logger.warn called, fallbackUsed:true
 *   EC-5: db is null → logger.warn called, fallbackUsed:true
 *   EC-6: All pairs return 0 rows (cold-start) → fallbackUsed:true
 *   ED-1: Empty items list → empty map returned, fallbackUsed:false
 *   ED-2: fileType derived from filePath extension
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  readAffinityProfiles,
  extractFileType,
  AffinityGuidanceSchema,
} from '../affinity-reader.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock @repo/database-schema/schema/wint
const mockModelAffinity = { changeType: 'changeType', fileType: 'fileType' }
vi.mock('@repo/database-schema/schema/wint', () => ({
  modelAffinity: mockModelAffinity,
}))

// Mock drizzle-orm
const mockAnd = vi.fn((...args) => ({ type: 'and', args }))
const mockEq = vi.fn((col, val) => ({ type: 'eq', col, val }))
vi.mock('drizzle-orm', () => ({
  and: mockAnd,
  eq: mockEq,
}))

// ============================================================================
// Fixtures
// ============================================================================

function makeAffinityRow(overrides: Partial<{
  modelId: string
  changeType: string
  fileType: string
  successRate: string | number
  sampleCount: number
  confidenceLevel: string
}> = {}) {
  return {
    modelId: 'haiku',
    changeType: 'create',
    fileType: 'tsx',
    successRate: '0.92',
    sampleCount: 45,
    confidenceLevel: 'high',
    ...overrides,
  }
}

function makeDb(rows: ReturnType<typeof makeAffinityRow>[] = [makeAffinityRow()]) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    }),
  }
}

// ============================================================================
// extractFileType tests
// ============================================================================

describe('extractFileType', () => {
  it('extracts tsx extension', () => {
    expect(extractFileType('src/components/Feature.tsx')).toBe('tsx')
  })

  it('extracts ts extension', () => {
    expect(extractFileType('src/handlers/auth.ts')).toBe('ts')
  })

  it('extracts sql extension', () => {
    expect(extractFileType('src/db/migrations/0001.sql')).toBe('sql')
  })

  it('returns unknown for no extension', () => {
    expect(extractFileType('Makefile')).toBe('unknown')
  })

  it('handles multiple dots in path', () => {
    expect(extractFileType('src/my.component.test.ts')).toBe('ts')
  })
})

// ============================================================================
// AffinityGuidanceSchema tests (HP-3)
// ============================================================================

describe('AffinityGuidanceSchema (HP-3)', () => {
  it('validates a complete AffinityGuidance object', () => {
    const guidance = {
      modelId: 'haiku',
      changeType: 'create',
      fileType: 'tsx',
      preferredChangePattern: 'create-new-file',
      successRate: 0.92,
      sampleCount: 45,
      confidence: 0.9,
    }
    expect(() => AffinityGuidanceSchema.parse(guidance)).not.toThrow()
    const parsed = AffinityGuidanceSchema.parse(guidance)
    expect(parsed.preferredChangePattern).toBe('create-new-file')
    expect(parsed.confidence).toBe(0.9)
  })

  it('rejects missing required fields', () => {
    expect(() =>
      AffinityGuidanceSchema.parse({ modelId: 'haiku', changeType: 'create' }),
    ).toThrow()
  })

  it('rejects confidence > 1.0', () => {
    expect(() =>
      AffinityGuidanceSchema.parse({
        modelId: 'haiku',
        changeType: 'create',
        fileType: 'tsx',
        preferredChangePattern: 'create-new-file',
        successRate: 0.9,
        sampleCount: 10,
        confidence: 1.5,
      }),
    ).toThrow()
  })

  it('rejects successRate < 0', () => {
    expect(() =>
      AffinityGuidanceSchema.parse({
        modelId: 'haiku',
        changeType: 'create',
        fileType: 'tsx',
        preferredChangePattern: 'create-new-file',
        successRate: -0.1,
        sampleCount: 10,
        confidence: 0.9,
      }),
    ).toThrow()
  })
})

// ============================================================================
// readAffinityProfiles — Happy Path
// ============================================================================

describe('readAffinityProfiles — HP-1: normal affinity data returned', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns populated map when DB returns rows', async () => {
    const db = makeDb([makeAffinityRow({ modelId: 'haiku', changeType: 'create', fileType: 'tsx' })])

    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/components/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db, 'test-story')

    expect(result.fallbackUsed).toBe(false)
    expect(result.map.get('CO-1')).not.toBeNull()
    const guidance = result.map.get('CO-1')!
    expect(guidance.modelId).toBe('haiku')
    expect(guidance.changeType).toBe('create')
    expect(guidance.fileType).toBe('tsx')
    expect(guidance.preferredChangePattern).toBe('create-new-file')
    expect(guidance.confidence).toBe(0.9) // 'high' → 0.9
  })

  it('maps confidence_level: medium to 0.6', async () => {
    const db = makeDb([makeAffinityRow({ confidenceLevel: 'medium', successRate: '0.75' })])
    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/components/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db)
    const guidance = result.map.get('CO-1')!
    expect(guidance.confidence).toBe(0.6)
  })

  it('maps confidence_level: low to 0.3', async () => {
    const db = makeDb([makeAffinityRow({ confidenceLevel: 'low' })])
    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/components/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db)
    const guidance = result.map.get('CO-1')!
    expect(guidance.confidence).toBe(0.3)
  })

  it('maps confidence_level: unknown to 0.0', async () => {
    const db = makeDb([makeAffinityRow({ confidenceLevel: 'unknown' })])
    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/components/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db)
    const guidance = result.map.get('CO-1')!
    expect(guidance.confidence).toBe(0.0)
  })
})

describe('readAffinityProfiles — HP-2: query deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries DB once for two items with same (changeType, fileType) pair', async () => {
    const mockWhere = vi.fn().mockResolvedValue([makeAffinityRow()])
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    const db = { select: mockSelect }

    const items = [
      { id: 'CO-1', changeType: 'create', filePath: 'src/components/A.tsx' },
      { id: 'CO-2', changeType: 'create', filePath: 'src/components/B.tsx' },
    ]

    const result = await readAffinityProfiles(items, db, 'test-story')

    // DB queried only once (one pair: create/tsx)
    expect(mockWhere).toHaveBeenCalledTimes(1)
    // Both items should have guidance from the single query
    expect(result.map.get('CO-1')).not.toBeNull()
    expect(result.map.get('CO-2')).not.toBeNull()
  })

  it('queries DB twice for items with different (changeType, fileType) pairs', async () => {
    const mockWhere = vi.fn().mockResolvedValue([makeAffinityRow()])
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
    const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })
    const db = { select: mockSelect }

    const items = [
      { id: 'CO-1', changeType: 'create', filePath: 'src/components/A.tsx' },
      { id: 'CO-2', changeType: 'modify', filePath: 'src/handlers/auth.ts' },
    ]

    await readAffinityProfiles(items, db, 'test-story')

    // DB queried twice (two pairs: create/tsx, modify/ts)
    expect(mockWhere).toHaveBeenCalledTimes(2)
  })
})

// ============================================================================
// readAffinityProfiles — EC-1: DB error
// ============================================================================

describe('readAffinityProfiles — EC-1: DB error thrown', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls logger.warn and returns fallbackUsed:true on DB error', async () => {
    const { logger } = await import('@repo/logger')

    const mockWhere = vi.fn().mockRejectedValue(new Error('DB connection failed'))
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({ where: mockWhere }),
      }),
    }

    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db, 'test-story')

    // Query-level error: continues with null, all-null → cold-start fallback
    // The query error results in null for that pair; all items are null → fallbackUsed
    expect(result.fallbackUsed).toBe(true)
    // Logger.warn should have been called (either for query error or cold-start)
    expect(logger.warn).toHaveBeenCalled()
  })

  it('returns all null guidance when DB throws', async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('timeout')),
        }),
      }),
    }

    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db, 'test-story')

    expect(result.map.get('CO-1')).toBeNull()
  })
})

// ============================================================================
// readAffinityProfiles — EC-5: null db
// ============================================================================

describe('readAffinityProfiles — EC-5: null db', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns fallbackUsed:true and logs warn when db is null', async () => {
    const { logger } = await import('@repo/logger')

    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/Feature.tsx' }]
    const result = await readAffinityProfiles(items, null, 'test-story')

    expect(result.fallbackUsed).toBe(true)
    expect(result.fallbackReason).toBe('db-null')
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('db is null/undefined'),
      expect.objectContaining({ storyId: 'test-story' }),
    )
  })

  it('returns all null map entries when db is null', async () => {
    const items = [
      { id: 'CO-1', changeType: 'create', filePath: 'src/A.tsx' },
      { id: 'CO-2', changeType: 'modify', filePath: 'src/B.ts' },
    ]
    const result = await readAffinityProfiles(items, null)
    expect(result.map.get('CO-1')).toBeNull()
    expect(result.map.get('CO-2')).toBeNull()
  })
})

// ============================================================================
// readAffinityProfiles — EC-6 / ED-1: cold-start (empty rows)
// ============================================================================

describe('readAffinityProfiles — ED-1/EC-6: cold-start (no rows)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns fallbackUsed:true and logs info when all queries return empty rows', async () => {
    const { logger } = await import('@repo/logger')

    const db = makeDb([]) // empty rows

    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db, 'test-story')

    expect(result.fallbackUsed).toBe(true)
    expect(result.fallbackReason).toBe('cold-start')
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('cold-start'),
      expect.any(Object),
    )
  })

  it('returns empty map when input items is empty list', async () => {
    const db = makeDb()
    const result = await readAffinityProfiles([], db, 'test-story')

    expect(result.map.size).toBe(0)
    expect(result.fallbackUsed).toBe(false)
  })
})

// ============================================================================
// readAffinityProfiles — best row selection
// ============================================================================

describe('readAffinityProfiles — best row selection', () => {
  it('picks the highest-confidence row when multiple rows returned', async () => {
    const rows = [
      makeAffinityRow({ modelId: 'sonnet', confidenceLevel: 'low' }),
      makeAffinityRow({ modelId: 'haiku', confidenceLevel: 'high' }),
      makeAffinityRow({ modelId: 'opus', confidenceLevel: 'medium' }),
    ]
    const db = makeDb(rows)

    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db)

    const guidance = result.map.get('CO-1')!
    expect(guidance.confidence).toBe(0.9) // 'high'
    expect(guidance.modelId).toBe('haiku')
  })

  it('converts successRate string to float', async () => {
    const db = makeDb([makeAffinityRow({ successRate: '0.85' })])
    const items = [{ id: 'CO-1', changeType: 'create', filePath: 'src/Feature.tsx' }]
    const result = await readAffinityProfiles(items, db)
    const guidance = result.map.get('CO-1')!
    expect(guidance.successRate).toBe(0.85)
  })
})

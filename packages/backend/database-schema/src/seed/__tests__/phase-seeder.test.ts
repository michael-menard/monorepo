import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock local schema
vi.mock('../schema/index.js', () => ({
  phases: { name: 'phases' },
  insertPhaseSchema: {
    safeParse: (data: any) => {
      if (data.id !== undefined && data.phaseName) {
        return { success: true, data }
      }
      return {
        success: false,
        error: { message: 'Validation failed', errors: [{ message: 'Required' }] },
      }
    },
  },
}))

// Mock index-parser
vi.mock('../parsers/index-parser.js', () => ({
  parseStoriesIndex: vi.fn().mockResolvedValue([
    { id: 0, phaseName: 'Bootstrap', description: 'Bootstrap phase', phaseOrder: 0 },
    { id: 1, phaseName: 'Foundation', description: 'Foundation phase', phaseOrder: 1 },
    { id: 2, phaseName: 'Context Cache', description: 'Context cache phase', phaseOrder: 2 },
    { id: 3, phaseName: 'Telemetry', description: 'Telemetry phase', phaseOrder: 3 },
    { id: 4, phaseName: 'Graph', description: 'Graph phase', phaseOrder: 4 },
    { id: 5, phaseName: 'ML Pipeline', description: 'ML pipeline phase', phaseOrder: 5 },
    { id: 6, phaseName: 'Batch Mode', description: 'Batch mode phase', phaseOrder: 6 },
    { id: 7, phaseName: 'Migration', description: 'Migration phase', phaseOrder: 7 },
  ]),
}))

describe('seedPhases', () => {
  let mockTx: any

  beforeEach(() => {
    // Create mock transaction
    const _insertedRows: any[] = []
    mockTx = {
      delete: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(
            Array.from({ length: 8 }, (_, i) => ({
              id: i,
              phaseName: `Phase ${i}`,
              phaseOrder: i,
            })),
          ),
        }),
      }),
    }
  })

  it('seeds 8 phases successfully', async () => {
    const { seedPhases } = await import('../phase-seeder.js')
    const indexPath = path.resolve(
      import.meta.dirname,
      '../../../../../../plans/future/platform/wint/stories.index.md',
    )

    const result = await seedPhases(mockTx, indexPath)

    expect(result.success).toBe(true)
    expect(result.rowCount).toBe(8)
    expect(result.warnings).toHaveLength(0)
    expect(mockTx.delete).toHaveBeenCalled()
    expect(mockTx.insert).toHaveBeenCalled()
  })

  it('reports warnings for invalid phase data but does not fail', async () => {
    // Override the mock to return invalid data
    const { parseStoriesIndex } = await import('../parsers/index-parser.js')
    vi.mocked(parseStoriesIndex).mockResolvedValueOnce([
      { id: 0, phaseName: 'Bootstrap', description: 'OK', phaseOrder: 0 },
      { id: undefined as any, phaseName: undefined as any, description: null, phaseOrder: 1 }, // invalid
    ])

    const { seedPhases } = await import('../phase-seeder.js')
    const indexPath = 'dummy/path'

    // With 1 valid phase, should succeed
    const result = await seedPhases(mockTx, indexPath)
    expect(result.success).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'

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
  capabilities: { name: 'capabilities' },
  insertCapabilitySchema: {
    safeParse: (data: any) => {
      if (data.capabilityName && data.capabilityType && data.maturityLevel) {
        return { success: true, data }
      }
      return {
        success: false,
        error: { message: 'Validation failed', errors: [{ message: 'Required' }] },
      }
    },
  },
}))

describe('seedCapabilities', () => {
  let mockTx: any

  beforeEach(() => {
    const CAPABILITY_COUNT = 7
    mockTx = {
      delete: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue(undefined) }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue(
            Array.from({ length: CAPABILITY_COUNT }, (_, i) => ({
              capabilityName: ['create', 'read', 'edit', 'delete', 'upload', 'replace', 'download'][
                i
              ],
            })),
          ),
        }),
      }),
    }
  })

  it('seeds 7 capabilities successfully', async () => {
    const { seedCapabilities } = await import('../capability-seeder.js')

    const result = await seedCapabilities(mockTx)

    expect(result.success).toBe(true)
    expect(result.rowCount).toBe(7)
    expect(result.warnings).toHaveLength(0)
    expect(mockTx.delete).toHaveBeenCalled()
    expect(mockTx.insert).toHaveBeenCalled()
  })

  it('inserts all 7 CRUD capabilities', async () => {
    const { seedCapabilities } = await import('../capability-seeder.js')

    await seedCapabilities(mockTx)

    // Verify the values passed to insert contain all 7 capabilities
    const _insertCall = mockTx.insert.mock.calls[0]
    const valuesCall = mockTx.insert.mock.results[0].value.values.mock.calls[0][0]

    expect(valuesCall).toHaveLength(7)

    const capabilityNames = valuesCall.map((c: any) => c.capabilityName)
    expect(capabilityNames).toContain('create')
    expect(capabilityNames).toContain('read')
    expect(capabilityNames).toContain('edit')
    expect(capabilityNames).toContain('delete')
    expect(capabilityNames).toContain('upload')
    expect(capabilityNames).toContain('replace')
    expect(capabilityNames).toContain('download')
  })
})

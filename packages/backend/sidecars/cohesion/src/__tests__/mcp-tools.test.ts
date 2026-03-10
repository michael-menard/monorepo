/**
 * Unit Tests for MCP Tool Wrappers
 * WINT-4010: Create Cohesion Sidecar
 *
 * AC-9: cohesion_audit and cohesion_check exported from index.ts
 * AC-10: ≥80% branch coverage
 * HP-5: cohesion_audit returns typed CohesionAuditResult
 * HP-6: cohesion_check returns typed CohesionCheckResult
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the compute functions BEFORE importing MCP wrappers
vi.mock('../compute-audit.js', () => ({
  computeAudit: vi.fn(),
}))

vi.mock('../compute-check.js', () => ({
  computeCheck: vi.fn(),
}))

import { computeAudit } from '../compute-audit.js'
import { computeCheck } from '../compute-check.js'
import { cohesion_audit } from '../mcp-tools/cohesion-audit.js'
import { cohesion_check } from '../mcp-tools/cohesion-check.js'

const mockComputeAudit = vi.mocked(computeAudit)
const mockComputeCheck = vi.mocked(computeCheck)

describe('cohesion_audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HP-5: is exported from index.ts', async () => {
    const indexExports = await import('../index.js')
    expect(typeof indexExports.cohesion_audit).toBe('function')
  })

  it('HP-5: returns CohesionAuditResult on success', async () => {
    const mockResult = {
      frankenFeatures: [{ featureId: 'uuid-1', featureName: 'wish', missingCapabilities: ['delete'] }],
      coverageSummary: { totalFeatures: 1, completeCount: 0, incompleteCount: 1 },
    }
    mockComputeAudit.mockResolvedValueOnce(mockResult)

    const result = await cohesion_audit({})

    expect(result).not.toBeNull()
    expect(result!.frankenFeatures).toHaveLength(1)
    expect(result!.coverageSummary.totalFeatures).toBe(1)
  })

  it('HP-5: returns null when computeAudit throws', async () => {
    mockComputeAudit.mockRejectedValueOnce(new Error('DB error'))

    const result = await cohesion_audit({})

    expect(result).toBeNull()
  })

  it('passes packageName filter to computeAudit', async () => {
    const mockResult = {
      frankenFeatures: [],
      coverageSummary: { totalFeatures: 0, completeCount: 0, incompleteCount: 0 },
    }
    mockComputeAudit.mockResolvedValueOnce(mockResult)

    await cohesion_audit({ packageName: '@repo/wint' })

    expect(mockComputeAudit).toHaveBeenCalledWith(
      { packageName: '@repo/wint' },
      expect.anything(),
    )
  })

  it('works with default empty input', async () => {
    const mockResult = {
      frankenFeatures: [],
      coverageSummary: { totalFeatures: 0, completeCount: 0, incompleteCount: 0 },
    }
    mockComputeAudit.mockResolvedValueOnce(mockResult)

    const result = await cohesion_audit()

    expect(result).not.toBeNull()
    expect(mockComputeAudit).toHaveBeenCalledWith({}, expect.anything())
  })
})

describe('cohesion_check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HP-6: is exported from index.ts', async () => {
    const indexExports = await import('../index.js')
    expect(typeof indexExports.cohesion_check).toBe('function')
  })

  it('HP-6: returns CohesionCheckResult on success', async () => {
    const mockResult = {
      featureId: 'uuid-wish',
      status: 'complete' as const,
      violations: [],
      capabilityCoverage: { create: true, read: true, update: true, delete: true },
    }
    mockComputeCheck.mockResolvedValueOnce(mockResult)

    const result = await cohesion_check({ featureId: 'uuid-wish' })

    expect(result).not.toBeNull()
    expect(result!.status).toBe('complete')
    expect(result!.featureId).toBe('uuid-wish')
  })

  it('HP-6: returns null when computeCheck throws', async () => {
    mockComputeCheck.mockRejectedValueOnce(new Error('DB error'))

    const result = await cohesion_check({ featureId: 'any' })

    expect(result).toBeNull()
  })

  it('passes featureId to computeCheck', async () => {
    const mockResult = {
      featureId: 'uuid-wint',
      status: 'incomplete' as const,
      violations: ['missing delete capability'],
      capabilityCoverage: { create: true, read: true, update: true, delete: false },
    }
    mockComputeCheck.mockResolvedValueOnce(mockResult)

    await cohesion_check({ featureId: 'uuid-wint' })

    expect(mockComputeCheck).toHaveBeenCalledWith('uuid-wint', expect.anything())
  })
})

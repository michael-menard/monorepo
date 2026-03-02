/**
 * Unit tests for checkOverlap()
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: HP-2 (match), HP-3 (no-match), EC-3 (missing config graceful fallback)
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import { checkOverlap } from '../check-overlap.js'
import { logger } from '@repo/logger'

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

// Path to real dep-equivalences.yaml for integration-style unit tests
const REAL_CONFIG_PATH = new URL(
  '../../../config/dep-equivalences.yaml',
  import.meta.url,
).pathname

describe('checkOverlap', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('HP-2: flags a new package with a known functional equivalent', () => {
    const findings = checkOverlap(['dayjs'], {
      configPath: REAL_CONFIG_PATH,
      installedPackages: { 'date-fns': '2.0.0', lodash: '4.17.21' },
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      package: 'dayjs',
      overlapsWith: 'date-fns',
      severity: 'high',
    })
    expect(findings[0]?.groupName).toBe('date-and-time')
  })

  it('HP-3: returns empty when no overlap exists', () => {
    const findings = checkOverlap(['zod'], {
      configPath: REAL_CONFIG_PATH,
      installedPackages: { 'date-fns': '2.0.0' },
    })

    // zod might be in schema-validation group but no equivalent installed
    expect(findings.filter(f => f.package === 'zod' && f.overlapsWith !== 'zod')).toHaveLength(0)
  })

  it('HP-3: returns empty when no new packages are provided', () => {
    const findings = checkOverlap([], {
      configPath: REAL_CONFIG_PATH,
      installedPackages: { lodash: '4.17.21' },
    })

    expect(findings).toEqual([])
  })

  it('EC-3: gracefully returns empty when config file does not exist', () => {
    const findings = checkOverlap(['dayjs'], {
      configPath: '/nonexistent/path/dep-equivalences.yaml',
      installedPackages: { 'date-fns': '2.0.0' },
    })

    expect(findings).toEqual([])
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('equivalence config file not found'),
      expect.objectContaining({ configPath: '/nonexistent/path/dep-equivalences.yaml' }),
    )
  })

  it('does not flag a package when no equivalent is installed', () => {
    const findings = checkOverlap(['dayjs'], {
      configPath: REAL_CONFIG_PATH,
      installedPackages: { lodash: '4.17.21' }, // no date library installed
    })

    // dayjs is in date-and-time group but no other member is installed
    expect(findings).toEqual([])
  })

  it('detects overlap from multiple new packages', () => {
    const findings = checkOverlap(['dayjs', 'ramda'], {
      configPath: REAL_CONFIG_PATH,
      installedPackages: { 'date-fns': '2.0.0', lodash: '4.17.21' },
    })

    expect(findings).toHaveLength(2)
    const packages = findings.map(f => f.package)
    expect(packages).toContain('dayjs')
    expect(packages).toContain('ramda')
  })

  it('deduplicates: only reports first overlap per new package', () => {
    // Both moment and date-fns are equivalents of dayjs; should only report once
    const findings = checkOverlap(['dayjs'], {
      configPath: REAL_CONFIG_PATH,
      installedPackages: { 'date-fns': '2.0.0', moment: '2.29.0' },
    })

    expect(findings.filter(f => f.package === 'dayjs')).toHaveLength(1)
  })
})

/**
 * Unit tests for detectNewPackages()
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: HP-1 (add/update/remove), ED-1 (empty diff)
 */

import { describe, expect, it } from 'vitest'
import { detectNewPackages, PackageChangeSummarySchema } from '../detect-new-packages.js'

describe('detectNewPackages', () => {
  it('HP-1: returns correct add/update/remove diff', () => {
    const prev = { lodash: '4.0.0', 'date-fns': '2.0.0' }
    const current = { lodash: '4.17.21', 'date-fns': '2.0.0', dayjs: '1.11.0' }

    const result = detectNewPackages(prev, current)

    expect(result.added).toEqual(['dayjs@1.11.0'])
    expect(result.updated).toEqual(['lodash@4.17.21'])
    expect(result.removed).toEqual([])
    // Zod validation succeeds
    expect(() => PackageChangeSummarySchema.parse(result)).not.toThrow()
  })

  it('HP-1: detects removed packages', () => {
    const prev = { lodash: '4.17.21', 'date-fns': '2.0.0' }
    const current = { lodash: '4.17.21' }

    const result = detectNewPackages(prev, current)

    expect(result.added).toEqual([])
    expect(result.updated).toEqual([])
    expect(result.removed).toEqual(['date-fns'])
  })

  it('ED-1: returns empty diff when snapshots are identical', () => {
    const snap = { lodash: '4.17.21', dayjs: '1.11.0' }

    const result = detectNewPackages(snap, snap)

    expect(result.added).toEqual([])
    expect(result.updated).toEqual([])
    expect(result.removed).toEqual([])
    expect(() => PackageChangeSummarySchema.parse(result)).not.toThrow()
  })

  it('returns empty diff for two empty snapshots', () => {
    const result = detectNewPackages({}, {})

    expect(result.added).toEqual([])
    expect(result.updated).toEqual([])
    expect(result.removed).toEqual([])
  })

  it('handles empty previous snapshot (all packages are new)', () => {
    const result = detectNewPackages({}, { zod: '3.0.0', react: '19.0.0' })

    expect(result.added).toHaveLength(2)
    expect(result.added).toContain('zod@3.0.0')
    expect(result.added).toContain('react@19.0.0')
    expect(result.removed).toEqual([])
  })

  it('handles empty current snapshot (all packages removed)', () => {
    const result = detectNewPackages({ lodash: '4.0.0', react: '18.0.0' }, {})

    expect(result.removed).toHaveLength(2)
    expect(result.added).toEqual([])
    expect(result.updated).toEqual([])
  })
})

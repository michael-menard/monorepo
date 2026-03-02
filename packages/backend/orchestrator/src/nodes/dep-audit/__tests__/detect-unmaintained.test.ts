/**
 * Unit tests for detectUnmaintained()
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: HP-5 (stale flagged), recent not flagged, EC-5 (npm 404 graceful)
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import { detectUnmaintained } from '../detect-unmaintained.js'
import { logger } from '@repo/logger'

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

// Helper to make a date string N days ago
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

function makeNpmResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      name: 'test-package',
      'dist-tags': { latest: '1.0.0' },
      time: {
        created: daysAgo(800),
        modified: daysAgo(400),
        '1.0.0': daysAgo(400),
      },
      ...overrides,
    }),
  }
}

describe('detectUnmaintained', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('HP-5: flags a stale package with no release in 12+ months', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeNpmResponse({
        name: 'old-package',
        'dist-tags': { latest: '0.5.0' },
        time: {
          created: daysAgo(900),
          '0.5.0': daysAgo(800),
        },
      }),
    )

    const findings = await detectUnmaintained(['old-package'], {
      fetchFn: mockFetch as any,
      unmaintainedAgeDays: 365,
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      package: 'old-package',
      reason: 'stale',
    })
    expect(findings[0]?.daysSincePublish).toBeGreaterThanOrEqual(365)
  })

  it('does not flag a recently published package', async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      makeNpmResponse({
        name: 'recent-package',
        'dist-tags': { latest: '2.0.0' },
        time: {
          '2.0.0': daysAgo(30),
        },
      }),
    )

    const findings = await detectUnmaintained(['recent-package'], {
      fetchFn: mockFetch as any,
      unmaintainedAgeDays: 365,
    })

    expect(findings).toEqual([])
  })

  it('flags a deprecated package', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        name: 'deprecated-pkg',
        deprecated: 'Use new-package instead',
        'dist-tags': { latest: '1.0.0' },
        time: { '1.0.0': daysAgo(100) },
      }),
    })

    const findings = await detectUnmaintained(['deprecated-pkg'], {
      fetchFn: mockFetch as any,
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]).toMatchObject({
      package: 'deprecated-pkg',
      reason: 'deprecated',
      deprecationMessage: 'Use new-package instead',
    })
  })

  it('EC-5: gracefully handles npm registry 404', async () => {
    const mock404Fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    })

    const findings = await detectUnmaintained(['private-pkg'], {
      fetchFn: mock404Fetch as any,
    })

    expect(findings).toEqual([])
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.stringContaining('package not found in npm registry'),
      expect.any(Object),
    )
  })

  it('EC-5: gracefully handles network error', async () => {
    const networkErrorFetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))

    const findings = await detectUnmaintained(['some-pkg'], {
      fetchFn: networkErrorFetch as any,
    })

    expect(findings).toEqual([])
    expect(vi.mocked(logger.warn)).toHaveBeenCalled()
  })

  it('returns empty array for empty package list', async () => {
    const mockFetch = vi.fn()
    const findings = await detectUnmaintained([], { fetchFn: mockFetch as any })
    expect(findings).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('checks multiple packages independently', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: 'stale-pkg',
          'dist-tags': { latest: '1.0.0' },
          time: { '1.0.0': daysAgo(500) },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          name: 'fresh-pkg',
          'dist-tags': { latest: '2.0.0' },
          time: { '2.0.0': daysAgo(10) },
        }),
      })

    const findings = await detectUnmaintained(['stale-pkg', 'fresh-pkg'], {
      fetchFn: mockFetch as any,
      unmaintainedAgeDays: 365,
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]?.package).toBe('stale-pkg')
  })
})

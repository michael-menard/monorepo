/**
 * Unit tests for estimateBundleImpact()
 *
 * Story: APIP-4030 - Dependency Auditor
 * Covers: success case, EC-4 (network error -> null)
 */

import { describe, expect, it, vi, afterEach } from 'vitest'
import { estimateBundleImpact } from '../estimate-bundle-impact.js'
import { logger } from '@repo/logger'

vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

describe('estimateBundleImpact', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns estimated byte count on success', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        name: 'lodash',
        version: '4.17.21',
        size: 70000,
        gzip: 24000,
      }),
    })

    const results = await estimateBundleImpact(['lodash'], { fetchFn: mockFetch as any })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      package: 'lodash',
      estimatedBytes: 24000,
    })
  })

  it('EC-4: returns null on network error without throwing', async () => {
    const failingFetch = vi.fn().mockRejectedValue(new Error('Network timeout'))

    const results = await estimateBundleImpact(['lodash'], {
      fetchFn: failingFetch as any,
      retryDelayMs: 0,
    })

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      package: 'lodash',
      estimatedBytes: null,
    })
    // No unhandled rejection
  })

  it('EC-4: returns null on 404 (private package)', async () => {
    const mock404 = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    })

    const results = await estimateBundleImpact(['private-package'], {
      fetchFn: mock404 as any,
      retryDelayMs: 0,
    })

    expect(results[0]).toMatchObject({
      package: 'private-package',
      estimatedBytes: null,
    })
  })

  it('returns one result per package', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'zod', version: '3.0.0', size: 20000, gzip: 8000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'dayjs', version: '1.11.0', size: 6700, gzip: 2600 }),
      })

    const results = await estimateBundleImpact(['zod', 'dayjs'], {
      fetchFn: mockFetch as any,
      retryDelayMs: 0,
    })

    expect(results).toHaveLength(2)
    expect(results[0]?.package).toBe('zod')
    expect(results[1]?.package).toBe('dayjs')
  })

  it('returns empty array for empty package list', async () => {
    const mockFetch = vi.fn()
    const results = await estimateBundleImpact([], { fetchFn: mockFetch as any })
    expect(results).toEqual([])
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('retries once on HTTP 500 error', async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ name: 'lodash', version: '4.17.21', size: 70000, gzip: 24000 }),
      })

    const results = await estimateBundleImpact(['lodash'], {
      fetchFn: mockFetch as any,
      retryDelayMs: 0,
    })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(results[0]?.estimatedBytes).toBe(24000)
  })
})

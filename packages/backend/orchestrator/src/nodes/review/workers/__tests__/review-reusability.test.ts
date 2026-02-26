/**
 * Review Reusability Worker Tests
 *
 * APIP-1050: AC-4, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewReusabilityNode, ReviewReusabilityConfigSchema } from '../review-reusability.js'

describe('createReviewReusabilityNode', () => {
  it('returns PASS when model router returns no findings (AC-4)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewReusabilityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.findings).toHaveLength(0)
    expect(mockRouter).toHaveBeenCalledOnce()
  })

  it('returns FAIL when model router returns error findings (AC-4)', async () => {
    const findings = JSON.stringify([
      { file: 'src/Button.tsx', message: 'Hardcoded color should be a prop', severity: 'error', auto_fixable: false },
    ])
    const mockRouter = vi.fn().mockResolvedValue(findings)
    const worker = createReviewReusabilityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.errors).toBe(1)
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRouter = vi.fn().mockRejectedValue(
      new Error('Reusability review worker timed out after 60000ms'),
    )
    const worker = createReviewReusabilityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRouter = vi.fn()
    const worker = createReviewReusabilityNode({ modelRouterOverride: mockRouter, enabled: false })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRouter).not.toHaveBeenCalled()
  })

  it('uses injected modelRouterOverride (AC-4, AC-15)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewReusabilityNode({ modelRouterOverride: mockRouter })

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test', changeSpecIds: ['src/Button.tsx'] })

    expect(mockRouter).toHaveBeenCalledWith(
      expect.stringContaining('src/Button.tsx'),
      expect.any(Number),
    )
  })

  it('validates config with ReviewReusabilityConfigSchema', () => {
    const config = ReviewReusabilityConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(60000)
  })
})

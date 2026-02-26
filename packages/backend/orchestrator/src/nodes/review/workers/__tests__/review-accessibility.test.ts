/**
 * Review Accessibility Worker Tests
 *
 * APIP-1050: AC-4, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewAccessibilityNode, ReviewAccessibilityConfigSchema } from '../review-accessibility.js'

describe('createReviewAccessibilityNode', () => {
  it('returns PASS when model router returns no findings (AC-4)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewAccessibilityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.findings).toHaveLength(0)
    expect(mockRouter).toHaveBeenCalledOnce()
  })

  it('returns FAIL when model router returns a11y error findings (AC-4)', async () => {
    const findings = JSON.stringify([
      { file: 'src/Modal.tsx', line: 12, message: 'Missing aria-label on button', severity: 'error', auto_fixable: true },
    ])
    const mockRouter = vi.fn().mockResolvedValue(findings)
    const worker = createReviewAccessibilityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.errors).toBe(1)
    expect(result.findings[0]?.auto_fixable).toBe(true)
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRouter = vi.fn().mockRejectedValue(
      new Error('Accessibility review worker timed out after 60000ms'),
    )
    const worker = createReviewAccessibilityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRouter = vi.fn()
    const worker = createReviewAccessibilityNode({ modelRouterOverride: mockRouter, enabled: false })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRouter).not.toHaveBeenCalled()
  })

  it('uses injected modelRouterOverride (AC-4, AC-15)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewAccessibilityNode({ modelRouterOverride: mockRouter })

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test', changeSpecIds: ['src/Modal.tsx'] })

    expect(mockRouter).toHaveBeenCalledWith(
      expect.stringContaining('src/Modal.tsx'),
      expect.any(Number),
    )
  })

  it('validates config with ReviewAccessibilityConfigSchema', () => {
    const config = ReviewAccessibilityConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(60000)
  })
})

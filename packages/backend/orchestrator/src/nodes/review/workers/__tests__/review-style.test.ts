/**
 * Review Style Worker Tests
 *
 * APIP-1050: AC-3, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewStyleNode, ReviewStyleConfigSchema } from '../review-style.js'

describe('createReviewStyleNode', () => {
  it('returns PASS when prettier exits with code 0 (AC-3)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewStyleNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(false)
    expect(result.errors).toBe(0)
    expect(mockRunner).toHaveBeenCalledOnce()
  })

  it('returns FAIL when prettier exits with non-zero code (AC-3)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({
      stdout: '[warn] src/foo.ts\nChecking formatting...\n[warn] src/bar.ts',
      stderr: '',
      exitCode: 1,
    })
    const worker = createReviewStyleNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRunner = vi.fn().mockRejectedValue(new Error('Style worker timed out after 30000ms'))
    const worker = createReviewStyleNode({ timeoutMs: 30000 }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
    expect(result.findings[0]?.auto_fixable).toBe(true)
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRunner = vi.fn()
    const worker = createReviewStyleNode({ enabled: false }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRunner).not.toHaveBeenCalled()
  })

  it('uses injected mock toolRunner (AC-15)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewStyleNode({ prettierBin: 'custom-prettier' }, mockRunner)

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/custom' })

    expect(mockRunner).toHaveBeenCalledWith('custom-prettier', '/tmp/custom', expect.any(Number))
  })

  it('validates config with ReviewStyleConfigSchema', () => {
    const config = ReviewStyleConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(30000)
  })
})

/**
 * Review Syntax Worker Tests
 *
 * APIP-1050: AC-3, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewSyntaxNode, ReviewSyntaxConfigSchema } from '../review-syntax.js'

describe('createReviewSyntaxNode', () => {
  it('returns PASS when tsc exits with code 0 (AC-3)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewSyntaxNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(false)
    expect(result.errors).toBe(0)
    expect(mockRunner).toHaveBeenCalledOnce()
  })

  it('returns FAIL with type errors when tsc exits non-zero (AC-3)', async () => {
    const tscOutput = 'src/foo.ts(10,5): error TS2304: Cannot find name \'bar\'.'
    const mockRunner = vi.fn().mockResolvedValue({
      stdout: tscOutput,
      stderr: '',
      exitCode: 1,
    })
    const worker = createReviewSyntaxNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.findings[0]?.file).toBe('src/foo.ts')
    expect(result.findings[0]?.line).toBe(10)
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRunner = vi.fn().mockRejectedValue(new Error('Syntax worker timed out after 60000ms'))
    const worker = createReviewSyntaxNode({ timeoutMs: 60000 }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRunner = vi.fn()
    const worker = createReviewSyntaxNode({ enabled: false }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRunner).not.toHaveBeenCalled()
  })

  it('uses injected mock toolRunner (AC-15)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewSyntaxNode({ tscBin: 'custom-tsc' }, mockRunner)

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/custom' })

    expect(mockRunner).toHaveBeenCalledWith('custom-tsc', '/tmp/custom', expect.any(Number))
  })

  it('validates config with ReviewSyntaxConfigSchema', () => {
    const config = ReviewSyntaxConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(60000)
  })
})

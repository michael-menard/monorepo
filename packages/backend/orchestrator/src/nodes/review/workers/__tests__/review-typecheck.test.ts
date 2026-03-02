/**
 * Review Typecheck Worker Tests
 *
 * APIP-1050: AC-3, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewTypecheckNode, ReviewTypecheckConfigSchema } from '../review-typecheck.js'

describe('createReviewTypecheckNode', () => {
  it('returns PASS when typecheck exits with code 0 (AC-3)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewTypecheckNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(false)
    expect(result.errors).toBe(0)
    expect(mockRunner).toHaveBeenCalledOnce()
  })

  it('returns FAIL with type errors (AC-3)', async () => {
    const tscOutput = 'packages/foo/src/bar.ts(5,3): error TS2322: Type string is not assignable.'
    const mockRunner = vi.fn().mockResolvedValue({
      stdout: tscOutput,
      stderr: '',
      exitCode: 2,
    })
    const worker = createReviewTypecheckNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings.length).toBeGreaterThan(0)
    expect(result.findings[0]?.file).toBe('packages/foo/src/bar.ts')
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRunner = vi.fn().mockRejectedValue(
      new Error('Typecheck worker timed out after 120000ms'),
    )
    const worker = createReviewTypecheckNode({ timeoutMs: 120000 }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRunner = vi.fn()
    const worker = createReviewTypecheckNode({ enabled: false }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRunner).not.toHaveBeenCalled()
  })

  it('uses injected mock toolRunner (AC-15)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewTypecheckNode({ typecheckBin: 'custom-check-types' }, mockRunner)

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/custom' })

    expect(mockRunner).toHaveBeenCalledWith('custom-check-types', '/tmp/custom', expect.any(Number))
  })

  it('validates config with ReviewTypecheckConfigSchema', () => {
    const config = ReviewTypecheckConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(120000)
  })
})

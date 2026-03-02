/**
 * Review Build Worker Tests
 *
 * APIP-1050: AC-3, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewBuildNode, ReviewBuildConfigSchema } from '../review-build.js'

describe('createReviewBuildNode', () => {
  it('returns PASS when build exits with code 0 (AC-3)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewBuildNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(false)
    expect(result.errors).toBe(0)
    expect(mockRunner).toHaveBeenCalledOnce()
  })

  it('returns FAIL when build exits with non-zero code (AC-3)', async () => {
    const buildOutput = 'src/index.ts(1,1): error TS6133: Build failed'
    const mockRunner = vi.fn().mockResolvedValue({
      stdout: buildOutput,
      stderr: '',
      exitCode: 1,
    })
    const worker = createReviewBuildNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings.length).toBeGreaterThan(0)
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRunner = vi.fn().mockRejectedValue(
      new Error('Build worker timed out after 300000ms'),
    )
    const worker = createReviewBuildNode({ timeoutMs: 300000 }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRunner = vi.fn()
    const worker = createReviewBuildNode({ enabled: false }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRunner).not.toHaveBeenCalled()
  })

  it('uses injected mock toolRunner (AC-15)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewBuildNode({ buildBin: 'custom-build' }, mockRunner)

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/custom' })

    expect(mockRunner).toHaveBeenCalledWith('custom-build', '/tmp/custom', expect.any(Number))
  })

  it('validates config with ReviewBuildConfigSchema', () => {
    const config = ReviewBuildConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(300000)
  })
})

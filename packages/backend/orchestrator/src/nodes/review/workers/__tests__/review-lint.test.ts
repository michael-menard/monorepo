/**
 * Review Lint Worker Tests
 *
 * APIP-1050: AC-3, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewLintNode, ReviewLintConfigSchema } from '../review-lint.js'

describe('createReviewLintNode', () => {
  // ---------------------------------------------------------------------------
  // PASS case
  // ---------------------------------------------------------------------------

  it('returns PASS when linter exits with code 0 (AC-3)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewLintNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(false)
    expect(result.errors).toBe(0)
    expect(result.findings).toHaveLength(0)
    expect(mockRunner).toHaveBeenCalledOnce()
  })

  // ---------------------------------------------------------------------------
  // FAIL case
  // ---------------------------------------------------------------------------

  it('returns FAIL when linter exits with non-zero code (AC-3)', async () => {
    const lintOutput = 'src/foo.ts:10:5: error No unused vars (no-unused-vars)'
    const mockRunner = vi.fn().mockResolvedValue({
      stdout: lintOutput,
      stderr: '',
      exitCode: 1,
    })
    const worker = createReviewLintNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.errors).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // Timeout case (AC-8)
  // ---------------------------------------------------------------------------

  it('returns FAIL with timeout message when tool runner times out (AC-8)', async () => {
    const mockRunner = vi.fn().mockRejectedValue(new Error('Lint worker timed out after 30000ms'))
    const worker = createReviewLintNode({ timeoutMs: 30000 }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
    expect(result.errors).toBe(1)
  })

  // ---------------------------------------------------------------------------
  // Disabled case (AC-15)
  // ---------------------------------------------------------------------------

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRunner = vi.fn()
    const worker = createReviewLintNode({ enabled: false }, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRunner).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------------------------
  // Mock injection (AC-15)
  // ---------------------------------------------------------------------------

  it('uses injected mock toolRunner (AC-15)', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewLintNode({ eslintBin: 'custom-lint' }, mockRunner)

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/custom' })

    expect(mockRunner).toHaveBeenCalledWith('custom-lint', '/tmp/custom', expect.any(Number))
  })

  // ---------------------------------------------------------------------------
  // ConfigSchema validation
  // ---------------------------------------------------------------------------

  it('validates config with ReviewLintConfigSchema', () => {
    const config = ReviewLintConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(30000)
    expect(config.eslintBin).toBeDefined()
  })

  // ---------------------------------------------------------------------------
  // Error handling
  // ---------------------------------------------------------------------------

  it('returns FAIL with error message when tool runner throws non-timeout error', async () => {
    const mockRunner = vi.fn().mockRejectedValue(new Error('Command not found: pnpm'))
    const worker = createReviewLintNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('Command not found')
  })

  it('returns duration_ms in result', async () => {
    const mockRunner = vi.fn().mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 })
    const worker = createReviewLintNode({}, mockRunner)

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(typeof result.duration_ms).toBe('number')
    expect(result.duration_ms).toBeGreaterThanOrEqual(0)
  })
})

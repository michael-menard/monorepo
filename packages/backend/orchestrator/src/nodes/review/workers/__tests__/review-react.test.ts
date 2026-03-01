/**
 * Review React Worker Tests
 *
 * APIP-1050: AC-4, AC-8, AC-15
 */

import { describe, it, expect, vi } from 'vitest'
import { createReviewReactNode, ReviewReactConfigSchema } from '../review-react.js'

describe('createReviewReactNode', () => {
  it('returns PASS when model router returns no findings (AC-4)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewReactNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(false)
    expect(result.findings).toHaveLength(0)
    expect(mockRouter).toHaveBeenCalledOnce()
  })

  it('returns FAIL when model router returns error findings (AC-4)', async () => {
    const findings = JSON.stringify([
      { file: 'src/Foo.tsx', line: 5, message: 'Missing key prop in list', severity: 'error', auto_fixable: false },
    ])
    const mockRouter = vi.fn().mockResolvedValue(findings)
    const worker = createReviewReactNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.errors).toBe(1)
    expect(result.findings[0]?.file).toBe('src/Foo.tsx')
  })

  it('returns PASS when model router returns empty string (no-op router) (AC-4)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('')
    const worker = createReviewReactNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.findings).toHaveLength(0)
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRouter = vi.fn().mockImplementation(
      () =>
        new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('React review worker timed out after 60000ms')), 50),
        ),
    )
    const worker = createReviewReactNode({ modelRouterOverride: mockRouter, timeoutMs: 50 })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRouter = vi.fn()
    const worker = createReviewReactNode({ modelRouterOverride: mockRouter, enabled: false })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRouter).not.toHaveBeenCalled()
  })

  it('uses injected modelRouterOverride (AC-4, AC-15)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewReactNode({ modelRouterOverride: mockRouter })

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test', changeSpecIds: ['src/Foo.tsx'] })

    expect(mockRouter).toHaveBeenCalledWith(expect.stringContaining('src/Foo.tsx'), expect.any(Number))
  })

  it('validates config with ReviewReactConfigSchema', () => {
    const config = ReviewReactConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(60000)
  })

  it('handles warning findings (returns PASS with warnings)', async () => {
    const findings = JSON.stringify([
      { file: 'src/Foo.tsx', message: 'Consider memoizing', severity: 'warning', auto_fixable: false },
    ])
    const mockRouter = vi.fn().mockResolvedValue(findings)
    const worker = createReviewReactNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.warnings).toBe(1)
    expect(result.errors).toBe(0)
  })
})

/**
 * Review Security Worker Tests
 *
 * APIP-1050: AC-5, AC-8, AC-15
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createReviewSecurityNode, ReviewSecurityConfigSchema } from '../review-security.js'
import { NodeCircuitBreaker } from '../../../../runner/circuit-breaker.js'

describe('createReviewSecurityNode', () => {
  it('returns PASS when model router returns no findings (happy path)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewSecurityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.findings).toHaveLength(0)
    expect(mockRouter).toHaveBeenCalledOnce()
  })

  it('returns FAIL when model router returns security error findings (AC-5)', async () => {
    const findings = JSON.stringify([
      {
        file: 'src/api.ts',
        line: 42,
        message: 'SQL injection risk: user input not sanitized',
        severity: 'error',
        auto_fixable: false,
      },
    ])
    const mockRouter = vi.fn().mockResolvedValue(findings)
    const worker = createReviewSecurityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.errors).toBe(1)
    expect(result.findings[0]?.file).toBe('src/api.ts')
  })

  it('returns FAIL (not throw) when token budget is exceeded (AC-5)', async () => {
    const mockRouter = vi.fn()
    const mockBudgetChecker = vi.fn().mockResolvedValue(false)
    const worker = createReviewSecurityNode({
      modelRouterOverride: mockRouter,
      tokenBudgetChecker: mockBudgetChecker,
    })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('token budget exceeded')
    // model router must NOT be called when budget is exceeded
    expect(mockRouter).not.toHaveBeenCalled()
  })

  it('returns FAIL (not throw) when circuit breaker is open (AC-5)', async () => {
    const mockRouter = vi.fn()
    // Create an already-open circuit breaker by recording failures
    const breaker = new NodeCircuitBreaker({ failureThreshold: 1, recoveryTimeoutMs: 60000 })
    breaker.recordFailure() // trips the breaker (threshold = 1)

    const worker = createReviewSecurityNode({
      modelRouterOverride: mockRouter,
      circuitBreaker: breaker,
    })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('circuit breaker open')
    // model router must NOT be called when circuit is open
    expect(mockRouter).not.toHaveBeenCalled()
  })

  it('returns FAIL with timeout message on timeout (AC-8)', async () => {
    const mockRouter = vi.fn().mockRejectedValue(
      new Error('Security review worker timed out after 90000ms'),
    )
    const worker = createReviewSecurityNode({ modelRouterOverride: mockRouter })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('timed out')
  })

  it('returns PASS skipped when disabled (AC-15)', async () => {
    const mockRouter = vi.fn()
    const worker = createReviewSecurityNode({ modelRouterOverride: mockRouter, enabled: false })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('PASS')
    expect(result.skipped).toBe(true)
    expect(mockRouter).not.toHaveBeenCalled()
  })

  it('uses injected modelRouterOverride and includes changeSpecIds in prompt (AC-15)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const worker = createReviewSecurityNode({ modelRouterOverride: mockRouter })

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test', changeSpecIds: ['src/api.ts'] })

    expect(mockRouter).toHaveBeenCalledWith(
      expect.stringContaining('src/api.ts'),
      expect.any(Number),
    )
  })

  it('records circuit breaker success on happy path (AC-5)', async () => {
    const mockRouter = vi.fn().mockResolvedValue('[]')
    const breaker = new NodeCircuitBreaker()
    const worker = createReviewSecurityNode({ modelRouterOverride: mockRouter, circuitBreaker: breaker })

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(breaker.getStatus().failures).toBe(0)
    expect(breaker.getState()).toBe('CLOSED')
  })

  it('records circuit breaker failure on model error (non-timeout) (AC-5)', async () => {
    const mockRouter = vi.fn().mockRejectedValue(new Error('Connection refused'))
    const breaker = new NodeCircuitBreaker({ failureThreshold: 5, recoveryTimeoutMs: 60000 })
    const worker = createReviewSecurityNode({ modelRouterOverride: mockRouter, circuitBreaker: breaker })

    await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(breaker.getStatus().failures).toBe(1)
  })

  it('validates config with ReviewSecurityConfigSchema', () => {
    const config = ReviewSecurityConfigSchema.parse({})
    expect(config.enabled).toBe(true)
    expect(config.timeoutMs).toBe(90000)
    expect(config.tokenBudget).toBe(50000)
  })

  it('handles budget check failure gracefully (treats as budget exceeded)', async () => {
    const mockRouter = vi.fn()
    const mockBudgetChecker = vi.fn().mockRejectedValue(new Error('Budget service unavailable'))
    const worker = createReviewSecurityNode({
      modelRouterOverride: mockRouter,
      tokenBudgetChecker: mockBudgetChecker,
    })

    const result = await worker({ storyId: 'APIP-9999', worktreePath: '/tmp/test' })

    expect(result.verdict).toBe('FAIL')
    expect(result.findings[0]?.message).toContain('token budget exceeded')
    expect(mockRouter).not.toHaveBeenCalled()
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AutoDecisionCallback } from '../auto-callback.js'
import type { DecisionRequest, DecisionRule } from '../auto-callback.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '@repo/logger'

describe('AutoDecisionCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ask()', () => {
    it('should match first rule and return predefined answer', async () => {
      const rules: DecisionRule[] = [
        {
          name: 'rule1',
          condition: (ctx) => ctx.type === 'feature',
          answer: 'answer1',
          rationale: 'Feature type detected',
        },
        {
          name: 'rule2',
          condition: (ctx) => ctx.type === 'bugfix',
          answer: 'answer2',
          rationale: 'Bugfix type detected',
        },
      ]

      const callback = new AutoDecisionCallback(rules)

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'single-choice',
        question: 'What type?',
        options: [
          { value: 'answer1', label: 'Answer 1' },
          { value: 'answer2', label: 'Answer 2' },
        ],
        context: { type: 'feature' },
        timeout_ms: 5000,
      }

      const response = await callback.ask(request)

      expect(response.id).toBe(request.id)
      expect(response.answer).toBe('answer1')
      expect(response.cancelled).toBe(false)
      expect(response.timedOut).toBe(false)
      expect(logger.info).toHaveBeenCalledWith('Auto-decision made', {
        id: request.id,
        answer: 'answer1',
        rationale: 'Feature type detected',
        rule: 'rule1',
      })
    })

    it('should use default answer when no rules match', async () => {
      const rules: DecisionRule[] = [
        {
          name: 'rule1',
          condition: (ctx) => ctx.type === 'feature',
          answer: 'answer1',
          rationale: 'Feature type detected',
        },
      ]

      const callback = new AutoDecisionCallback(rules, 'default-answer')

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'single-choice',
        question: 'What type?',
        options: [{ value: 'opt1', label: 'Option 1' }],
        context: { type: 'unknown' },
        timeout_ms: 5000,
      }

      const response = await callback.ask(request)

      expect(response.answer).toBe('default-answer')
      expect(logger.info).toHaveBeenCalledWith('Auto-decision made', {
        id: request.id,
        answer: 'default-answer',
        rationale: 'Default fallback',
        rule: 'default',
      })
    })

    it('should use first option when no rules match and no default', async () => {
      const callback = new AutoDecisionCallback([])

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        type: 'single-choice',
        question: 'What option?',
        options: [
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second' },
        ],
        timeout_ms: 5000,
      }

      const response = await callback.ask(request)

      expect(response.answer).toBe('first')
    })

    it('should handle multi-select answers', async () => {
      const rules: DecisionRule[] = [
        {
          name: 'multi-rule',
          condition: (ctx) => ctx.selectMultiple === true,
          answer: ['opt1', 'opt3'],
          rationale: 'Multi-select mode',
        },
      ]

      const callback = new AutoDecisionCallback(rules)

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        type: 'multi-select',
        question: 'Select options',
        options: [
          { value: 'opt1', label: 'Option 1' },
          { value: 'opt2', label: 'Option 2' },
          { value: 'opt3', label: 'Option 3' },
        ],
        context: { selectMultiple: true },
        timeout_ms: 5000,
      }

      const response = await callback.ask(request)

      expect(response.answer).toEqual(['opt1', 'opt3'])
    })

    it('should handle rule condition errors gracefully', async () => {
      const rules: DecisionRule[] = [
        {
          name: 'throwing-rule',
          condition: () => {
            throw new Error('Condition evaluation failed')
          },
          answer: 'bad-answer',
          rationale: 'Should not be used',
        },
        {
          name: 'valid-rule',
          condition: (ctx) => ctx.type === 'valid',
          answer: 'good-answer',
          rationale: 'Valid condition',
        },
      ]

      const callback = new AutoDecisionCallback(rules)

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        type: 'single-choice',
        question: 'What type?',
        options: [{ value: 'good-answer', label: 'Good' }],
        context: { type: 'valid' },
        timeout_ms: 5000,
      }

      const response = await callback.ask(request)

      expect(response.answer).toBe('good-answer')
      expect(logger.warn).toHaveBeenCalledWith(
        'Rule condition evaluation failed',
        expect.objectContaining({
          rule: 'throwing-rule',
          error: 'Condition evaluation failed',
        }),
      )
    })

    it('should complete synchronously (no async delays)', async () => {
      const rules: DecisionRule[] = [
        {
          name: 'sync-rule',
          condition: () => true,
          answer: 'sync-answer',
          rationale: 'Synchronous execution',
        },
      ]

      const callback = new AutoDecisionCallback(rules)

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        type: 'single-choice',
        question: 'What?',
        options: [{ value: 'sync-answer', label: 'Sync' }],
        timeout_ms: 5000,
      }

      const startTime = Date.now()
      await callback.ask(request)
      const duration = Date.now() - startTime

      // Should complete in less than 10ms
      expect(duration).toBeLessThan(10)
    })

    it('should handle empty context', async () => {
      const rules: DecisionRule[] = [
        {
          name: 'rule1',
          condition: (ctx) => Object.keys(ctx).length === 0,
          answer: 'empty-context',
          rationale: 'Empty context detected',
        },
      ]

      const callback = new AutoDecisionCallback(rules)

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174006',
        type: 'single-choice',
        question: 'What?',
        options: [{ value: 'empty-context', label: 'Empty' }],
        timeout_ms: 5000,
      }

      const response = await callback.ask(request)

      expect(response.answer).toBe('empty-context')
    })
  })

  describe('cleanup()', () => {
    it('should not throw error when called', () => {
      const callback = new AutoDecisionCallback([])
      expect(() => callback.cleanup()).not.toThrow()
    })
  })
})

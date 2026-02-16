import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CLIDecisionCallback } from '../cli-callback.js'
import type { DecisionRequest } from '../types.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

import inquirer from 'inquirer'
import { logger } from '@repo/logger'

describe('CLIDecisionCallback', () => {
  let callback: CLIDecisionCallback

  beforeEach(() => {
    callback = new CLIDecisionCallback()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('ask()', () => {
    it('should return user selection for single-choice question', async () => {
      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        type: 'single-choice',
        question: 'Select an option',
        options: [
          { value: 'opt1', label: 'Option 1' },
          { value: 'opt2', label: 'Option 2' },
        ],
        timeout_ms: 5000,
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ answer: 'opt1' })

      const response = await callback.ask(request)

      expect(response.id).toBe(request.id)
      expect(response.answer).toBe('opt1')
      expect(response.cancelled).toBe(false)
      expect(response.timedOut).toBe(false)
      expect(logger.info).toHaveBeenCalledWith('Presenting decision to user', {
        id: request.id,
        question: request.question,
      })
    })

    it('should return timeout response when timeout is reached', async () => {
      vi.useFakeTimers()

      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        type: 'single-choice',
        question: 'Select an option',
        options: [{ value: 'default', label: 'Default' }],
        timeout_ms: 100,
      }

      // Mock prompt to never resolve (simulating user not responding)
      vi.mocked(inquirer.prompt).mockImplementation(
        () => new Promise(() => {}),
      )

      const responsePromise = callback.ask(request)

      // Fast-forward time past timeout
      await vi.advanceTimersByTimeAsync(150)

      const response = await responsePromise

      expect(response.id).toBe(request.id)
      expect(response.timedOut).toBe(true)
      expect(response.cancelled).toBe(false)
      expect(response.answer).toBe('default')
      expect(logger.warn).toHaveBeenCalledWith('Decision timeout', {
        id: request.id,
        timeout_ms: 100,
      })

      vi.useRealTimers()
    })

    it('should handle cancellation via Ctrl+C', async () => {
      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        type: 'single-choice',
        question: 'Select an option',
        options: [{ value: 'opt1', label: 'Option 1' }],
        timeout_ms: 5000,
      }

      // Mock prompt to throw error (simulating Ctrl+C)
      vi.mocked(inquirer.prompt).mockRejectedValue(new Error('User interrupted'))

      const response = await callback.ask(request)

      expect(response.id).toBe(request.id)
      expect(response.cancelled).toBe(true)
      expect(response.timedOut).toBe(false)
      expect(response.answer).toBe('')
      expect(logger.info).toHaveBeenCalledWith('Decision cancelled by user', {
        id: request.id,
      })
    })

    it('should handle multi-select questions', async () => {
      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        type: 'multi-select',
        question: 'Select multiple options',
        options: [
          { value: 'opt1', label: 'Option 1' },
          { value: 'opt2', label: 'Option 2' },
          { value: 'opt3', label: 'Option 3' },
        ],
        timeout_ms: 5000,
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({
        answer: ['opt1', 'opt3'],
      })

      const response = await callback.ask(request)

      expect(response.id).toBe(request.id)
      expect(response.answer).toEqual(['opt1', 'opt3'])
      expect(response.cancelled).toBe(false)
      expect(response.timedOut).toBe(false)
    })

    it('should handle text-input questions', async () => {
      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        type: 'text-input',
        question: 'Enter your name',
        options: [{ value: '', label: '' }],
        timeout_ms: 5000,
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ answer: 'John Doe' })

      const response = await callback.ask(request)

      expect(response.id).toBe(request.id)
      expect(response.answer).toBe('John Doe')
      expect(response.cancelled).toBe(false)
      expect(response.timedOut).toBe(false)
    })

    it('should include recommended flag in option display', async () => {
      const request: DecisionRequest = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        type: 'single-choice',
        question: 'Select deployment strategy',
        options: [
          { value: 'standard', label: 'Standard' },
          {
            value: 'blue-green',
            label: 'Blue-Green',
            description: 'Zero downtime',
            recommended: true,
          },
        ],
        timeout_ms: 5000,
      }

      vi.mocked(inquirer.prompt).mockResolvedValue({ answer: 'blue-green' })

      await callback.ask(request)

      expect(vi.mocked(inquirer.prompt)).toHaveBeenCalledWith([
        expect.objectContaining({
          type: 'list',
          message: request.question,
          choices: expect.arrayContaining([
            expect.objectContaining({
              name: 'Standard',
              value: 'standard',
            }),
            expect.objectContaining({
              name: 'Blue-Green - Zero downtime (recommended)',
              value: 'blue-green',
            }),
          ]),
        }),
      ])
    })
  })

  describe('cleanup()', () => {
    it('should not throw error when called', () => {
      expect(() => callback.cleanup()).not.toThrow()
    })
  })
})

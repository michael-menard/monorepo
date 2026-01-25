import { describe, expect, it } from 'vitest'
import { ZodError, z } from 'zod'
import {
  NodeCancellationError,
  NodeCircuitOpenError,
  NodeTimeoutError,
} from '../errors.js'
import {
  classifyError,
  getErrorCategory,
  isRetryableNodeError,
} from '../error-classification.js'

describe('isRetryableNodeError', () => {
  describe('non-retryable errors', () => {
    it('returns false for ZodError', () => {
      const schema = z.string()
      try {
        schema.parse(123)
      } catch (error) {
        expect(isRetryableNodeError(error)).toBe(false)
      }
    })

    it('returns false for ZodError with empty issues', () => {
      const error = new ZodError([])
      expect(isRetryableNodeError(error)).toBe(false)
    })

    it('returns false for TypeError', () => {
      const error = new TypeError('Cannot read property of undefined')
      expect(isRetryableNodeError(error)).toBe(false)
    })

    it('returns false for ReferenceError', () => {
      const error = new ReferenceError('x is not defined')
      expect(isRetryableNodeError(error)).toBe(false)
    })

    it('returns false for SyntaxError', () => {
      const error = new SyntaxError('Unexpected token')
      expect(isRetryableNodeError(error)).toBe(false)
    })

    it('returns false for NodeCancellationError', () => {
      const error = new NodeCancellationError('test-node')
      expect(isRetryableNodeError(error)).toBe(false)
    })

    it('returns false for NodeCircuitOpenError', () => {
      const error = new NodeCircuitOpenError('test-node', 5, 60000)
      expect(isRetryableNodeError(error)).toBe(false)
    })
  })

  describe('retryable errors', () => {
    it('returns true for NodeTimeoutError', () => {
      const error = new NodeTimeoutError('test-node', 5000)
      expect(isRetryableNodeError(error)).toBe(true)
    })

    it('returns true for generic Error', () => {
      const error = new Error('Something went wrong')
      expect(isRetryableNodeError(error)).toBe(true)
    })

    it('returns true for null', () => {
      expect(isRetryableNodeError(null)).toBe(true)
    })

    it('returns true for undefined', () => {
      expect(isRetryableNodeError(undefined)).toBe(true)
    })

    it('returns true for network errors', () => {
      expect(isRetryableNodeError(new Error('ECONNREFUSED'))).toBe(true)
      expect(isRetryableNodeError(new Error('ECONNRESET'))).toBe(true)
      expect(isRetryableNodeError(new Error('ENOTFOUND'))).toBe(true)
      expect(isRetryableNodeError(new Error('fetch failed'))).toBe(true)
      expect(isRetryableNodeError(new Error('network error'))).toBe(true)
      expect(isRetryableNodeError(new Error('socket hang up'))).toBe(true)
    })

    it('returns true for rate limit errors', () => {
      expect(isRetryableNodeError(new Error('Rate limit exceeded'))).toBe(true)
      expect(isRetryableNodeError(new Error('Too many requests'))).toBe(true)
      expect(isRetryableNodeError(new Error('429 Too Many Requests'))).toBe(true)
      expect(isRetryableNodeError(new Error('Quota exceeded'))).toBe(true)
      expect(isRetryableNodeError(new Error('Request was throttled'))).toBe(true)
    })
  })
})

describe('classifyError', () => {
  describe('validation errors', () => {
    it('classifies ZodError correctly', () => {
      const error = new ZodError([])
      const result = classifyError(error)

      expect(result.isRetryable).toBe(false)
      expect(result.category).toBe('validation')
      expect(result.action).toBe('fail')
      expect(result.reason).toContain('Validation error')
    })
  })

  describe('programming errors', () => {
    it('classifies TypeError correctly', () => {
      const error = new TypeError('test')
      const result = classifyError(error)

      expect(result.isRetryable).toBe(false)
      expect(result.category).toBe('programming')
      expect(result.action).toBe('fail')
    })

    it('classifies ReferenceError correctly', () => {
      const error = new ReferenceError('test')
      const result = classifyError(error)

      expect(result.isRetryable).toBe(false)
      expect(result.category).toBe('programming')
      expect(result.action).toBe('fail')
    })

    it('classifies SyntaxError correctly', () => {
      const error = new SyntaxError('test')
      const result = classifyError(error)

      expect(result.isRetryable).toBe(false)
      expect(result.category).toBe('programming')
      expect(result.action).toBe('fail')
    })
  })

  describe('timeout errors', () => {
    it('classifies NodeTimeoutError correctly', () => {
      const error = new NodeTimeoutError('test-node', 5000)
      const result = classifyError(error)

      expect(result.isRetryable).toBe(true)
      expect(result.category).toBe('timeout')
      expect(result.action).toBe('retry')
    })
  })

  describe('cancellation errors', () => {
    it('classifies NodeCancellationError correctly', () => {
      const error = new NodeCancellationError('test-node')
      const result = classifyError(error)

      expect(result.isRetryable).toBe(false)
      expect(result.category).toBe('cancellation')
      expect(result.action).toBe('cancel')
    })
  })

  describe('circuit breaker errors', () => {
    it('classifies NodeCircuitOpenError correctly', () => {
      const error = new NodeCircuitOpenError('test-node', 5, 60000)
      const result = classifyError(error)

      expect(result.isRetryable).toBe(false)
      expect(result.category).toBe('circuit_open')
      expect(result.action).toBe('fail')
    })
  })

  describe('network errors', () => {
    it('classifies network errors correctly', () => {
      const error = new Error('Connection refused ECONNREFUSED')
      const result = classifyError(error)

      expect(result.isRetryable).toBe(true)
      expect(result.category).toBe('network')
      expect(result.action).toBe('retry')
    })
  })

  describe('rate limit errors', () => {
    it('classifies rate limit errors correctly', () => {
      const error = new Error('Too many requests')
      const result = classifyError(error)

      expect(result.isRetryable).toBe(true)
      expect(result.category).toBe('rate_limit')
      expect(result.action).toBe('retry')
    })
  })

  describe('unknown errors', () => {
    it('classifies unknown errors as retryable', () => {
      const error = new Error('Something unexpected happened')
      const result = classifyError(error)

      expect(result.isRetryable).toBe(true)
      expect(result.category).toBe('unknown')
      expect(result.action).toBe('retry')
    })

    it('classifies null as retryable', () => {
      const result = classifyError(null)

      expect(result.isRetryable).toBe(true)
      expect(result.category).toBe('unknown')
    })

    it('classifies undefined as retryable', () => {
      const result = classifyError(undefined)

      expect(result.isRetryable).toBe(true)
      expect(result.category).toBe('unknown')
    })
  })
})

describe('getErrorCategory', () => {
  it('returns correct category for ZodError', () => {
    const error = new ZodError([])
    expect(getErrorCategory(error)).toBe('validation')
  })

  it('returns correct category for TypeError', () => {
    const error = new TypeError('test')
    expect(getErrorCategory(error)).toBe('programming')
  })

  it('returns correct category for NodeTimeoutError', () => {
    const error = new NodeTimeoutError('test-node', 5000)
    expect(getErrorCategory(error)).toBe('timeout')
  })

  it('returns correct category for network error', () => {
    const error = new Error('ECONNREFUSED')
    expect(getErrorCategory(error)).toBe('network')
  })

  it('returns correct category for rate limit error', () => {
    const error = new Error('Rate limit exceeded')
    expect(getErrorCategory(error)).toBe('rate_limit')
  })

  it('returns unknown for generic errors', () => {
    const error = new Error('Something happened')
    expect(getErrorCategory(error)).toBe('unknown')
  })
})

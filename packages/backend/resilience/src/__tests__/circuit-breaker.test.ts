import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCircuitBreaker, CircuitBreakerConfigSchema } from '../circuit-breaker/index.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Circuit Breaker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('CircuitBreakerConfigSchema', () => {
    it('should validate a complete config', () => {
      const config = {
        name: 'test-breaker',
        timeout: 5000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
        volumeThreshold: 5,
        enabled: true,
      }

      const result = CircuitBreakerConfigSchema.parse(config)
      expect(result).toEqual(config)
    })

    it('should apply defaults for optional fields', () => {
      const config = { name: 'test-breaker' }

      const result = CircuitBreakerConfigSchema.parse(config)
      expect(result.timeout).toBe(10000)
      expect(result.errorThresholdPercentage).toBe(50)
      expect(result.resetTimeout).toBe(30000)
      expect(result.volumeThreshold).toBe(5)
      expect(result.enabled).toBe(true)
    })

    it('should reject invalid config', () => {
      const config = { name: '' }

      expect(() => CircuitBreakerConfigSchema.parse(config)).toThrow()
    })
  })

  describe('createCircuitBreaker', () => {
    it('should create a circuit breaker and execute successfully', async () => {
      const action = vi.fn().mockResolvedValue('success')

      const breaker = createCircuitBreaker(action, {
        name: 'test-breaker',
        timeout: 5000,
      })

      const result = await breaker.fire()
      expect(result).toBe('success')
      expect(action).toHaveBeenCalledTimes(1)
    })

    it('should pass arguments to the action', async () => {
      const action = vi.fn().mockResolvedValue('success')

      const breaker = createCircuitBreaker(action, {
        name: 'test-breaker',
        timeout: 5000,
      })

      await breaker.fire()
      expect(action).toHaveBeenCalled()
    })

    it('should create a passthrough breaker when disabled', async () => {
      const action = vi.fn().mockResolvedValue('success')

      const breaker = createCircuitBreaker(action, {
        name: 'test-breaker',
        enabled: false,
      })

      const result = await breaker.fire()
      expect(result).toBe('success')
    })

    it('should handle rejections', async () => {
      const error = new Error('Test error')
      const action = vi.fn().mockRejectedValue(error)

      const breaker = createCircuitBreaker(action, {
        name: 'test-breaker',
        timeout: 5000,
      })

      await expect(breaker.fire()).rejects.toThrow('Test error')
    })
  })
})

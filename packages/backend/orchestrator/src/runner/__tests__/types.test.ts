import { describe, expect, it } from 'vitest'
import {
  CircuitBreakerConfigSchema,
  createNodeExecutionContext,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_RETRY_CONFIG,
  generateGraphExecutionId,
  generateTraceId,
  NodeConfigSchema,
  NodeExecutionContextSchema,
  NodeRetryConfigSchema,
  RETRY_PRESETS,
} from '../types.js'

describe('NodeRetryConfigSchema', () => {
  it('applies defaults for empty object', () => {
    const result = NodeRetryConfigSchema.parse({})

    expect(result.maxAttempts).toBe(3)
    expect(result.backoffMs).toBe(1000)
    expect(result.backoffMultiplier).toBe(2)
    expect(result.maxBackoffMs).toBe(30000)
    expect(result.jitterFactor).toBe(0.25)
    expect(result.timeoutMs).toBeUndefined()
  })

  it('accepts valid configuration', () => {
    const result = NodeRetryConfigSchema.parse({
      maxAttempts: 5,
      backoffMs: 2000,
      backoffMultiplier: 3,
      maxBackoffMs: 60000,
      timeoutMs: 10000,
      jitterFactor: 0.5,
    })

    expect(result.maxAttempts).toBe(5)
    expect(result.backoffMs).toBe(2000)
    expect(result.backoffMultiplier).toBe(3)
    expect(result.maxBackoffMs).toBe(60000)
    expect(result.timeoutMs).toBe(10000)
    expect(result.jitterFactor).toBe(0.5)
  })

  it('rejects invalid maxAttempts', () => {
    expect(() => NodeRetryConfigSchema.parse({ maxAttempts: 0 })).toThrow()
    expect(() => NodeRetryConfigSchema.parse({ maxAttempts: -1 })).toThrow()
    expect(() => NodeRetryConfigSchema.parse({ maxAttempts: 1.5 })).toThrow()
  })

  it('rejects invalid backoffMs', () => {
    expect(() => NodeRetryConfigSchema.parse({ backoffMs: -1 })).toThrow()
  })

  it('rejects invalid backoffMultiplier', () => {
    expect(() => NodeRetryConfigSchema.parse({ backoffMultiplier: 0.5 })).toThrow()
  })

  it('rejects invalid jitterFactor', () => {
    expect(() => NodeRetryConfigSchema.parse({ jitterFactor: -0.1 })).toThrow()
    expect(() => NodeRetryConfigSchema.parse({ jitterFactor: 1.1 })).toThrow()
  })
})

describe('CircuitBreakerConfigSchema', () => {
  it('applies defaults for empty object', () => {
    const result = CircuitBreakerConfigSchema.parse({})

    expect(result.failureThreshold).toBe(5)
    expect(result.recoveryTimeoutMs).toBe(60000)
  })

  it('accepts valid configuration', () => {
    const result = CircuitBreakerConfigSchema.parse({
      failureThreshold: 10,
      recoveryTimeoutMs: 30000,
    })

    expect(result.failureThreshold).toBe(10)
    expect(result.recoveryTimeoutMs).toBe(30000)
  })

  it('rejects invalid failureThreshold', () => {
    expect(() => CircuitBreakerConfigSchema.parse({ failureThreshold: 0 })).toThrow()
    expect(() => CircuitBreakerConfigSchema.parse({ failureThreshold: -1 })).toThrow()
  })
})

describe('NodeExecutionContextSchema', () => {
  it('validates complete context', () => {
    const result = NodeExecutionContextSchema.parse({
      traceId: 'trace-123',
      graphExecutionId: 'exec-456',
      retryAttempt: 1,
      maxRetryAttempts: 3,
      startTime: Date.now(),
      storyId: 'wrkf-1020',
    })

    expect(result.traceId).toBe('trace-123')
    expect(result.graphExecutionId).toBe('exec-456')
    expect(result.retryAttempt).toBe(1)
    expect(result.maxRetryAttempts).toBe(3)
    expect(result.storyId).toBe('wrkf-1020')
    expect(result.parentNodeId).toBeUndefined()
  })

  it('accepts optional parentNodeId', () => {
    const result = NodeExecutionContextSchema.parse({
      traceId: 'trace-123',
      graphExecutionId: 'exec-456',
      retryAttempt: 1,
      maxRetryAttempts: 3,
      startTime: Date.now(),
      storyId: 'wrkf-1020',
      parentNodeId: 'parent-node',
    })

    expect(result.parentNodeId).toBe('parent-node')
  })

  it('rejects empty traceId', () => {
    expect(() =>
      NodeExecutionContextSchema.parse({
        traceId: '',
        graphExecutionId: 'exec-456',
        startTime: Date.now(),
        storyId: 'wrkf-1020',
      }),
    ).toThrow()
  })

  it('rejects empty storyId', () => {
    expect(() =>
      NodeExecutionContextSchema.parse({
        traceId: 'trace-123',
        graphExecutionId: 'exec-456',
        startTime: Date.now(),
        storyId: '',
      }),
    ).toThrow()
  })
})

describe('NodeConfigSchema', () => {
  it('validates minimal config', () => {
    const result = NodeConfigSchema.parse({
      name: 'test-node',
    })

    expect(result.name).toBe('test-node')
    expect(result.retry).toBeUndefined()
    expect(result.circuitBreaker).toBeUndefined()
  })

  it('validates config with retry', () => {
    const result = NodeConfigSchema.parse({
      name: 'test-node',
      retry: { maxAttempts: 5 },
    })

    expect(result.name).toBe('test-node')
    expect(result.retry?.maxAttempts).toBe(5)
    expect(result.retry?.backoffMs).toBe(1000) // default
  })

  it('validates config with circuit breaker', () => {
    const result = NodeConfigSchema.parse({
      name: 'test-node',
      circuitBreaker: { failureThreshold: 3 },
    })

    expect(result.circuitBreaker?.failureThreshold).toBe(3)
    expect(result.circuitBreaker?.recoveryTimeoutMs).toBe(60000) // default
  })

  it('rejects empty name', () => {
    expect(() => NodeConfigSchema.parse({ name: '' })).toThrow()
  })
})

describe('DEFAULT_RETRY_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3)
    expect(DEFAULT_RETRY_CONFIG.backoffMs).toBe(1000)
    expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2)
    expect(DEFAULT_RETRY_CONFIG.maxBackoffMs).toBe(30000)
    expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.25)
  })
})

describe('RETRY_PRESETS', () => {
  it('llm preset has correct values', () => {
    expect(RETRY_PRESETS.llm.maxAttempts).toBe(5)
    expect(RETRY_PRESETS.llm.backoffMs).toBe(2000)
    expect(RETRY_PRESETS.llm.timeoutMs).toBe(60000)
  })

  it('tool preset has correct values', () => {
    expect(RETRY_PRESETS.tool.maxAttempts).toBe(2)
    expect(RETRY_PRESETS.tool.backoffMs).toBe(500)
    expect(RETRY_PRESETS.tool.timeoutMs).toBe(10000)
  })

  it('validation preset has correct values', () => {
    expect(RETRY_PRESETS.validation.maxAttempts).toBe(1)
    expect(RETRY_PRESETS.validation.backoffMs).toBe(0)
    expect(RETRY_PRESETS.validation.timeoutMs).toBe(5000)
    expect(RETRY_PRESETS.validation.jitterFactor).toBe(0)
  })
})

describe('DEFAULT_CIRCUIT_BREAKER_CONFIG', () => {
  it('has expected default values', () => {
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.failureThreshold).toBe(5)
    expect(DEFAULT_CIRCUIT_BREAKER_CONFIG.recoveryTimeoutMs).toBe(60000)
  })
})

describe('generateTraceId', () => {
  it('generates unique IDs', () => {
    const id1 = generateTraceId()
    const id2 = generateTraceId()

    expect(id1).not.toBe(id2)
  })

  it('generates non-empty string', () => {
    const id = generateTraceId()

    expect(id.length).toBeGreaterThan(0)
  })
})

describe('generateGraphExecutionId', () => {
  it('generates unique IDs', () => {
    const id1 = generateGraphExecutionId()
    const id2 = generateGraphExecutionId()

    expect(id1).not.toBe(id2)
  })

  it('generates non-empty string', () => {
    const id = generateGraphExecutionId()

    expect(id.length).toBeGreaterThan(0)
  })
})

describe('createNodeExecutionContext', () => {
  it('creates context with minimal params', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
    })

    expect(context.storyId).toBe('wrkf-1020')
    expect(context.traceId.length).toBeGreaterThan(0)
    expect(context.graphExecutionId.length).toBeGreaterThan(0)
    expect(context.retryAttempt).toBe(1)
    expect(context.maxRetryAttempts).toBe(3)
    expect(context.startTime).toBeGreaterThan(0)
    expect(context.parentNodeId).toBeUndefined()
  })

  it('uses provided traceId and graphExecutionId', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      traceId: 'custom-trace',
      graphExecutionId: 'custom-exec',
    })

    expect(context.traceId).toBe('custom-trace')
    expect(context.graphExecutionId).toBe('custom-exec')
  })

  it('uses provided parentNodeId', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      parentNodeId: 'parent-node',
    })

    expect(context.parentNodeId).toBe('parent-node')
  })

  it('uses provided maxRetryAttempts', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      maxRetryAttempts: 5,
    })

    expect(context.maxRetryAttempts).toBe(5)
  })
})

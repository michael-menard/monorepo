import { describe, expect, it } from 'vitest'
import {
  NodeCircuitOpenError,
  NodeCancellationError,
  NodeErrorCodes,
  NodeErrorMessages,
  NodeExecutionError,
  NodeRetryExhaustedError,
  NodeTimeoutError,
  normalizeError,
  sanitizeStackTrace,
} from '../errors.js'

describe('NodeErrorCodes', () => {
  it('defines all required error codes', () => {
    expect(NodeErrorCodes.NODE_TIMEOUT).toBe('NODE_TIMEOUT')
    expect(NodeErrorCodes.RETRY_EXHAUSTED).toBe('RETRY_EXHAUSTED')
    expect(NodeErrorCodes.VALIDATION_FAILED).toBe('VALIDATION_FAILED')
    expect(NodeErrorCodes.CANCELLED).toBe('CANCELLED')
    expect(NodeErrorCodes.CIRCUIT_OPEN).toBe('CIRCUIT_OPEN')
    expect(NodeErrorCodes.UNKNOWN).toBe('UNKNOWN')
  })
})

describe('NodeErrorMessages', () => {
  it('generates correct timeout message', () => {
    const message = NodeErrorMessages[NodeErrorCodes.NODE_TIMEOUT]('test-node', 5000)
    expect(message).toBe('Node "test-node" execution exceeded timeout of 5000ms')
  })

  it('generates correct retry exhausted message', () => {
    const message = NodeErrorMessages[NodeErrorCodes.RETRY_EXHAUSTED]('test-node', 3)
    expect(message).toBe('Node "test-node" failed after 3 attempts')
  })

  it('generates correct validation failed message', () => {
    const message = NodeErrorMessages[NodeErrorCodes.VALIDATION_FAILED]('test-node', 'invalid input')
    expect(message).toBe('Node "test-node" validation failed: invalid input')
  })

  it('generates correct cancelled message', () => {
    const message = NodeErrorMessages[NodeErrorCodes.CANCELLED]('test-node')
    expect(message).toBe('Node "test-node" execution was cancelled')
  })

  it('generates correct circuit open message', () => {
    const message = NodeErrorMessages[NodeErrorCodes.CIRCUIT_OPEN]('test-node')
    expect(message).toBe('Node "test-node" circuit breaker is open, execution blocked')
  })

  it('generates correct unknown error message', () => {
    const message = NodeErrorMessages[NodeErrorCodes.UNKNOWN]('test-node', 'something went wrong')
    expect(message).toBe('Node "test-node" encountered an error: something went wrong')
  })
})

describe('NodeExecutionError', () => {
  it('creates error with correct properties', () => {
    const error = new NodeExecutionError('test message', NodeErrorCodes.UNKNOWN, 'test-node')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(NodeExecutionError)
    expect(error.name).toBe('NodeExecutionError')
    expect(error.message).toBe('test message')
    expect(error.code).toBe(NodeErrorCodes.UNKNOWN)
    expect(error.nodeName).toBe('test-node')
    expect(error.timestamp).toBeDefined()
    expect(new Date(error.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('serializes to JSON correctly', () => {
    const error = new NodeExecutionError('test message', NodeErrorCodes.UNKNOWN, 'test-node')
    const json = error.toJSON()

    expect(json.name).toBe('NodeExecutionError')
    expect(json.message).toBe('test message')
    expect(json.code).toBe(NodeErrorCodes.UNKNOWN)
    expect(json.nodeName).toBe('test-node')
    expect(json.timestamp).toBeDefined()
    expect(json.stack).toBeDefined()
  })
})

describe('NodeTimeoutError', () => {
  it('creates error with correct properties', () => {
    const error = new NodeTimeoutError('test-node', 5000)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(NodeExecutionError)
    expect(error).toBeInstanceOf(NodeTimeoutError)
    expect(error.name).toBe('NodeTimeoutError')
    expect(error.message).toBe('Node "test-node" execution exceeded timeout of 5000ms')
    expect(error.code).toBe(NodeErrorCodes.NODE_TIMEOUT)
    expect(error.nodeName).toBe('test-node')
    expect(error.timeoutMs).toBe(5000)
  })

  it('serializes to JSON correctly', () => {
    const error = new NodeTimeoutError('test-node', 5000)
    const json = error.toJSON()

    expect(json.name).toBe('NodeTimeoutError')
    expect(json.timeoutMs).toBe(5000)
  })
})

describe('NodeCancellationError', () => {
  it('creates error with correct properties', () => {
    const error = new NodeCancellationError('test-node')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(NodeExecutionError)
    expect(error).toBeInstanceOf(NodeCancellationError)
    expect(error.name).toBe('NodeCancellationError')
    expect(error.message).toBe('Node "test-node" execution was cancelled')
    expect(error.code).toBe(NodeErrorCodes.CANCELLED)
    expect(error.nodeName).toBe('test-node')
  })
})

describe('NodeCircuitOpenError', () => {
  it('creates error with correct properties', () => {
    const error = new NodeCircuitOpenError('test-node', 5, 60000)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(NodeExecutionError)
    expect(error).toBeInstanceOf(NodeCircuitOpenError)
    expect(error.name).toBe('NodeCircuitOpenError')
    expect(error.message).toBe('Node "test-node" circuit breaker is open, execution blocked')
    expect(error.code).toBe(NodeErrorCodes.CIRCUIT_OPEN)
    expect(error.nodeName).toBe('test-node')
    expect(error.failureCount).toBe(5)
    expect(error.recoveryTimeMs).toBe(60000)
  })

  it('serializes to JSON correctly', () => {
    const error = new NodeCircuitOpenError('test-node', 5, 60000)
    const json = error.toJSON()

    expect(json.name).toBe('NodeCircuitOpenError')
    expect(json.failureCount).toBe(5)
    expect(json.recoveryTimeMs).toBe(60000)
  })
})

describe('NodeRetryExhaustedError', () => {
  it('creates error with correct properties', () => {
    const originalError = new Error('original error')
    const error = new NodeRetryExhaustedError('test-node', 3, originalError)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(NodeExecutionError)
    expect(error).toBeInstanceOf(NodeRetryExhaustedError)
    expect(error.name).toBe('NodeRetryExhaustedError')
    expect(error.message).toBe('Node "test-node" failed after 3 attempts')
    expect(error.code).toBe(NodeErrorCodes.RETRY_EXHAUSTED)
    expect(error.nodeName).toBe('test-node')
    expect(error.attempts).toBe(3)
    expect(error.lastError).toBe(originalError)
  })

  it('serializes to JSON correctly', () => {
    const originalError = new Error('original error')
    const error = new NodeRetryExhaustedError('test-node', 3, originalError)
    const json = error.toJSON()

    expect(json.name).toBe('NodeRetryExhaustedError')
    expect(json.attempts).toBe(3)
    expect(json.lastError.name).toBe('Error')
    expect(json.lastError.message).toBe('original error')
  })
})

describe('sanitizeStackTrace', () => {
  const sampleStack = `Error: test error
    at Object.<anonymous> (/Users/dev/project/src/runner/node-factory.ts:50:11)
    at Module._compile (node_modules/ts-node/src/index.ts:1618:23)
    at Object.Module._extensions..js (node_modules/ts-node/src/index.ts:1621:10)
    at Module.load (node:internal/modules/cjs/loader:998:32)
    at Function.Module._load (node:internal/modules/cjs/loader:839:12)
    at require (node:internal/modules/cjs/helpers:102:18)`

  it('returns undefined for undefined input', () => {
    expect(sanitizeStackTrace(undefined)).toBeUndefined()
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeStackTrace('')).toBeUndefined()
  })

  it('filters out node_modules frames by default', () => {
    const result = sanitizeStackTrace(sampleStack)

    expect(result).not.toContain('node_modules')
    expect(result).toContain('node-factory.ts')
  })

  it('preserves node_modules frames when filterNodeModules is false', () => {
    const result = sanitizeStackTrace(sampleStack, { filterNodeModules: false })

    expect(result).toContain('node_modules')
  })

  it('truncates long stack traces', () => {
    const longStack = 'a'.repeat(3000)
    const result = sanitizeStackTrace(longStack, { maxStackLength: 100 })

    expect(result?.length).toBeLessThanOrEqual(120) // 100 + truncation message
    expect(result).toContain('... (truncated)')
  })

  it('converts absolute paths to relative when basePath provided', () => {
    const result = sanitizeStackTrace(sampleStack, {
      relativePaths: true,
      basePath: '/Users/dev/project',
    })

    expect(result).toContain('./src/runner/node-factory.ts')
    expect(result).not.toContain('/Users/dev/project')
  })
})

describe('normalizeError', () => {
  it('returns Error objects unchanged', () => {
    const error = new Error('test error')
    expect(normalizeError(error)).toBe(error)
  })

  it('wraps string into Error', () => {
    const result = normalizeError('string error')
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('string error')
  })

  it('wraps object with message property', () => {
    const result = normalizeError({ message: 'object error', code: 123 })
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('object error')
  })

  it('wraps object without message property', () => {
    const result = normalizeError({ code: 123, details: 'test' })
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toContain('123')
    expect(result.message).toContain('test')
  })

  it('wraps null', () => {
    const result = normalizeError(null)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('null')
  })

  it('wraps undefined', () => {
    const result = normalizeError(undefined)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('undefined')
  })

  it('wraps numbers', () => {
    const result = normalizeError(42)
    expect(result).toBeInstanceOf(Error)
    expect(result.message).toBe('42')
  })

  it('preserves custom error types', () => {
    const error = new NodeTimeoutError('test-node', 5000)
    expect(normalizeError(error)).toBe(error)
  })
})

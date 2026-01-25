import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { createNodeLogger, createNodeLoggerWithContext } from '../logger.js'
import { createNodeExecutionContext } from '../types.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

import { createLogger } from '@repo/logger'

describe('createNodeLogger', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createLogger).mockReturnValue(mockLogger as any)
  })

  it('creates logger with correct context name', () => {
    createNodeLogger('test-node')
    expect(createLogger).toHaveBeenCalledWith('orchestrator:node:test-node')
  })

  describe('logEntry', () => {
    it('logs node entry with story ID', () => {
      const logger = createNodeLogger('test-node')
      logger.logEntry('wrkf-1020')

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Node execution started',
        expect.objectContaining({
          nodeName: 'test-node',
          storyId: 'wrkf-1020',
          timestamp: expect.any(String),
        }),
      )
    })
  })

  describe('logExit', () => {
    it('logs successful exit with duration', () => {
      const logger = createNodeLogger('test-node')
      logger.logExit('wrkf-1020', 150, true)

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Node execution completed',
        expect.objectContaining({
          nodeName: 'test-node',
          storyId: 'wrkf-1020',
          durationMs: 150,
          success: true,
        }),
      )
    })

    it('logs failed exit as warning', () => {
      const logger = createNodeLogger('test-node')
      logger.logExit('wrkf-1020', 150, false)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Node execution completed',
        expect.objectContaining({
          success: false,
        }),
      )
    })
  })

  describe('logError', () => {
    it('logs error with context', () => {
      const logger = createNodeLogger('test-node')
      const error = new Error('Test error')
      logger.logError(error, { extra: 'context' })

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Node execution error',
        error,
        expect.objectContaining({
          nodeName: 'test-node',
          errorName: 'Error',
          errorMessage: 'Test error',
          extra: 'context',
        }),
      )
    })
  })

  describe('logRetry', () => {
    it('logs retry attempt', () => {
      const logger = createNodeLogger('test-node')
      const error = new Error('Retry error')
      logger.logRetry(1, 3, 1000, error)

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Node retry scheduled',
        expect.objectContaining({
          nodeName: 'test-node',
          attempt: 1,
          maxAttempts: 3,
          delayMs: 1000,
          errorMessage: 'Retry error',
        }),
      )
    })
  })

  describe('debug', () => {
    it('logs debug message with node name', () => {
      const logger = createNodeLogger('test-node')
      logger.debug('Debug message', { key: 'value' })

      expect(mockLogger.debug).toHaveBeenCalledWith('Debug message', {
        nodeName: 'test-node',
        key: 'value',
      })
    })
  })

  describe('info', () => {
    it('logs info message with node name', () => {
      const logger = createNodeLogger('test-node')
      logger.info('Info message', { key: 'value' })

      expect(mockLogger.info).toHaveBeenCalledWith('Info message', {
        nodeName: 'test-node',
        key: 'value',
      })
    })
  })

  describe('warn', () => {
    it('logs warning message with node name', () => {
      const logger = createNodeLogger('test-node')
      logger.warn('Warning message', { key: 'value' })

      expect(mockLogger.warn).toHaveBeenCalledWith('Warning message', {
        nodeName: 'test-node',
        key: 'value',
      })
    })
  })
})

describe('createNodeLoggerWithContext', () => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createLogger).mockReturnValue(mockLogger as any)
  })

  it('includes execution context in logs', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      traceId: 'trace-123',
      graphExecutionId: 'exec-456',
    })

    const logger = createNodeLoggerWithContext('test-node', context)
    logger.logEntry('wrkf-1020')

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Node execution started',
      expect.objectContaining({
        storyId: 'wrkf-1020',
        traceId: 'trace-123',
        graphExecutionId: 'exec-456',
      }),
    )
  })

  it('includes trace ID in exit log', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      traceId: 'trace-123',
      graphExecutionId: 'exec-456',
    })

    const logger = createNodeLoggerWithContext('test-node', context)
    logger.logExit('wrkf-1020', 100, true)

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Node execution completed',
      expect.objectContaining({
        traceId: 'trace-123',
        graphExecutionId: 'exec-456',
      }),
    )
  })

  it('includes trace ID in error log', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      traceId: 'trace-123',
      graphExecutionId: 'exec-456',
    })

    const logger = createNodeLoggerWithContext('test-node', context)
    logger.logError(new Error('test'))

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Node execution error',
      expect.any(Error),
      expect.objectContaining({
        traceId: 'trace-123',
        graphExecutionId: 'exec-456',
      }),
    )
  })

  it('includes parent node ID when present', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      parentNodeId: 'parent-node',
    })

    const logger = createNodeLoggerWithContext('test-node', context)
    logger.logEntry('wrkf-1020')

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Node execution started',
      expect.objectContaining({
        parentNodeId: 'parent-node',
      }),
    )
  })

  it('includes retry attempt info', () => {
    const context = createNodeExecutionContext({
      storyId: 'wrkf-1020',
      maxRetryAttempts: 5,
    })

    const logger = createNodeLoggerWithContext('test-node', context)
    logger.logEntry('wrkf-1020')

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Node execution started',
      expect.objectContaining({
        retryAttempt: 1,
        maxRetryAttempts: 5,
      }),
    )
  })
})

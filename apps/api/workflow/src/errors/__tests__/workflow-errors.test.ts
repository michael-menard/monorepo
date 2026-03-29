import { describe, it, expect } from 'vitest'
import {
  WorkflowErrorTypeSchema,
  WorkflowErrorSchema,
  ErrorRetryConfigSchema,
  ErrorLogSchema,
  CircuitBreakerStateSchema,
  CircuitBreakerConfigSchema,
  ERROR_RETRY_DEFAULTS,
  ERROR_RECOVERY_DEFAULTS,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  createWorkflowError,
  createErrorLog,
  shouldOpenCircuit,
  getRetryDelay,
} from '../workflow-errors.js'

describe('WorkflowErrorTypeSchema', () => {
  it('should validate all error types', () => {
    const errorTypes = [
      'AGENT_SPAWN_FAILED',
      'AGENT_TIMEOUT',
      'MALFORMED_OUTPUT',
      'PRECONDITION_FAILED',
      'EXTERNAL_SERVICE_DOWN',
    ]

    for (const type of errorTypes) {
      expect(() => WorkflowErrorTypeSchema.parse(type)).not.toThrow()
    }
  })

  it('should reject invalid error types', () => {
    expect(() => WorkflowErrorTypeSchema.parse('INVALID_TYPE')).toThrow()
    expect(() => WorkflowErrorTypeSchema.parse('')).toThrow()
    expect(() => WorkflowErrorTypeSchema.parse(123)).toThrow()
  })
})

describe('WorkflowErrorSchema', () => {
  it('should validate a complete error', () => {
    const error = {
      type: 'AGENT_SPAWN_FAILED',
      phase: 'dev-implementation',
      node: 'dev-implement-backend-coder',
      message: 'Failed to spawn agent',
      retryable: true,
      retryCount: 0,
      maxRetries: 1,
      timestamp: '2026-02-01T12:00:00.000Z',
    }

    expect(() => WorkflowErrorSchema.parse(error)).not.toThrow()
    const parsed = WorkflowErrorSchema.parse(error)
    expect(parsed.type).toBe('AGENT_SPAWN_FAILED')
    expect(parsed.retryable).toBe(true)
  })

  it('should apply defaults for optional fields', () => {
    const error = {
      type: 'AGENT_TIMEOUT',
      phase: 'qa-verify',
      node: 'qa-verify-leader',
      message: 'Agent exceeded timeout',
      retryable: false,
      timestamp: '2026-02-01T12:00:00.000Z',
    }

    const parsed = WorkflowErrorSchema.parse(error)
    expect(parsed.retryCount).toBe(0)
    expect(parsed.maxRetries).toBe(3)
  })

  it('should include optional context', () => {
    const error = {
      type: 'PRECONDITION_FAILED',
      phase: 'dev-setup',
      node: 'dev-setup-leader',
      message: 'Missing required input',
      retryable: false,
      timestamp: '2026-02-01T12:00:00.000Z',
      context: {
        missingFile: 'STORY-001.md',
        expectedPath: 'plans/stories/STORY-001/',
      },
    }

    const parsed = WorkflowErrorSchema.parse(error)
    expect(parsed.context).toEqual({
      missingFile: 'STORY-001.md',
      expectedPath: 'plans/stories/STORY-001/',
    })
  })

  it('should reject invalid timestamps', () => {
    const error = {
      type: 'AGENT_TIMEOUT',
      phase: 'qa-verify',
      node: 'qa-verify-leader',
      message: 'Agent exceeded timeout',
      retryable: false,
      timestamp: 'not-a-timestamp',
    }

    expect(() => WorkflowErrorSchema.parse(error)).toThrow()
  })
})

describe('ERROR_RETRY_DEFAULTS', () => {
  it('should have configuration for all error types', () => {
    const errorTypes = WorkflowErrorTypeSchema.options

    for (const type of errorTypes) {
      expect(ERROR_RETRY_DEFAULTS[type]).toBeDefined()
      expect(typeof ERROR_RETRY_DEFAULTS[type].retryable).toBe('boolean')
      expect(typeof ERROR_RETRY_DEFAULTS[type].maxRetries).toBe('number')
    }
  })

  it('should mark AGENT_SPAWN_FAILED as retryable once', () => {
    const config = ERROR_RETRY_DEFAULTS.AGENT_SPAWN_FAILED
    expect(config.retryable).toBe(true)
    expect(config.maxRetries).toBe(1)
  })

  it('should mark AGENT_TIMEOUT as not retryable', () => {
    const config = ERROR_RETRY_DEFAULTS.AGENT_TIMEOUT
    expect(config.retryable).toBe(false)
    expect(config.maxRetries).toBe(0)
  })

  it('should use exponential backoff for EXTERNAL_SERVICE_DOWN', () => {
    const config = ERROR_RETRY_DEFAULTS.EXTERNAL_SERVICE_DOWN
    expect(config.exponentialBackoff).toBe(true)
    expect(config.maxRetries).toBe(3)
  })
})

describe('ERROR_RECOVERY_DEFAULTS', () => {
  it('should have recovery action for all error types', () => {
    const errorTypes = WorkflowErrorTypeSchema.options

    for (const type of errorTypes) {
      expect(ERROR_RECOVERY_DEFAULTS[type]).toBeDefined()
    }
  })

  it('should recommend RETRY for spawn failures', () => {
    expect(ERROR_RECOVERY_DEFAULTS.AGENT_SPAWN_FAILED).toBe('RETRY')
  })

  it('should recommend FAIL_PHASE for timeouts', () => {
    expect(ERROR_RECOVERY_DEFAULTS.AGENT_TIMEOUT).toBe('FAIL_PHASE')
  })

  it('should recommend FALLBACK for external service down', () => {
    expect(ERROR_RECOVERY_DEFAULTS.EXTERNAL_SERVICE_DOWN).toBe('FALLBACK')
  })
})

describe('createWorkflowError', () => {
  it('should create error with proper defaults', () => {
    const error = createWorkflowError({
      type: 'AGENT_SPAWN_FAILED',
      phase: 'dev-implementation',
      node: 'dev-implement-backend-coder',
      message: 'Failed to spawn agent',
    })

    expect(error.type).toBe('AGENT_SPAWN_FAILED')
    expect(error.phase).toBe('dev-implementation')
    expect(error.node).toBe('dev-implement-backend-coder')
    expect(error.retryable).toBe(true)
    expect(error.maxRetries).toBe(1)
    expect(error.retryCount).toBe(0)
    expect(error.recovery).toBe('RETRY')
    expect(error.timestamp).toBeDefined()
  })

  it('should include optional context', () => {
    const error = createWorkflowError({
      type: 'PRECONDITION_FAILED',
      phase: 'dev-setup',
      node: 'dev-setup-leader',
      message: 'Missing story file',
      context: { storyId: 'STORY-001' },
    })

    expect(error.context).toEqual({ storyId: 'STORY-001' })
  })
})

describe('createErrorLog', () => {
  it('should create empty error log', () => {
    const log = createErrorLog({
      storyId: 'STORY-001',
      phase: 'dev-implementation',
    })

    expect(log.storyId).toBe('STORY-001')
    expect(log.phase).toBe('dev-implementation')
    expect(log.errors).toEqual([])
    expect(log.requiresIntervention).toBe(false)
    expect(log.createdAt).toBeDefined()
    expect(log.updatedAt).toBeDefined()
  })

  it('should include provided errors', () => {
    const error = createWorkflowError({
      type: 'AGENT_TIMEOUT',
      phase: 'dev-implementation',
      node: 'dev-implement-backend-coder',
      message: 'Timeout',
    })

    const log = createErrorLog({
      storyId: 'STORY-001',
      phase: 'dev-implementation',
      errors: [error],
    })

    expect(log.errors).toHaveLength(1)
    expect(log.errors[0].type).toBe('AGENT_TIMEOUT')
  })
})

describe('shouldOpenCircuit', () => {
  it('should return false for no errors', () => {
    expect(shouldOpenCircuit([])).toBe(false)
  })

  it('should return false for errors below threshold', () => {
    const errors = [
      createWorkflowError({
        type: 'AGENT_SPAWN_FAILED',
        phase: 'test',
        node: 'test-node',
        message: 'Error 1',
      }),
      createWorkflowError({
        type: 'AGENT_SPAWN_FAILED',
        phase: 'test',
        node: 'test-node',
        message: 'Error 2',
      }),
    ]

    expect(shouldOpenCircuit(errors)).toBe(false)
  })

  it('should return true when reaching threshold', () => {
    const errors = [
      createWorkflowError({
        type: 'AGENT_SPAWN_FAILED',
        phase: 'test',
        node: 'test-node',
        message: 'Error 1',
      }),
      createWorkflowError({
        type: 'AGENT_SPAWN_FAILED',
        phase: 'test',
        node: 'test-node',
        message: 'Error 2',
      }),
      createWorkflowError({
        type: 'AGENT_SPAWN_FAILED',
        phase: 'test',
        node: 'test-node',
        message: 'Error 3',
      }),
    ]

    expect(shouldOpenCircuit(errors)).toBe(true)
  })

  it('should respect custom threshold', () => {
    const errors = [
      createWorkflowError({
        type: 'AGENT_SPAWN_FAILED',
        phase: 'test',
        node: 'test-node',
        message: 'Error 1',
      }),
    ]

    expect(
      shouldOpenCircuit(errors, { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, failureThreshold: 1 }),
    ).toBe(true)
  })
})

describe('getRetryDelay', () => {
  it('should return 0 for non-retryable errors', () => {
    expect(getRetryDelay('AGENT_TIMEOUT', 0)).toBe(0)
    expect(getRetryDelay('PRECONDITION_FAILED', 0)).toBe(0)
  })

  it('should return base delay for retryable errors', () => {
    expect(getRetryDelay('AGENT_SPAWN_FAILED', 0)).toBe(2000)
  })

  it('should return 0 when max retries exceeded', () => {
    // AGENT_SPAWN_FAILED has maxRetries: 1
    expect(getRetryDelay('AGENT_SPAWN_FAILED', 1)).toBe(0)
    expect(getRetryDelay('AGENT_SPAWN_FAILED', 2)).toBe(0)
  })

  it('should use exponential backoff when configured', () => {
    // EXTERNAL_SERVICE_DOWN has exponentialBackoff: true, baseDelayMs: 5000
    expect(getRetryDelay('EXTERNAL_SERVICE_DOWN', 0)).toBe(5000)
    expect(getRetryDelay('EXTERNAL_SERVICE_DOWN', 1)).toBe(10000)
    expect(getRetryDelay('EXTERNAL_SERVICE_DOWN', 2)).toBe(20000)
  })

  it('should cap delay at maxDelayMs', () => {
    // EXTERNAL_SERVICE_DOWN has maxDelayMs: 60000
    // At attempt 4: 5000 * 2^4 = 80000, should cap at 60000
    const delay = getRetryDelay('EXTERNAL_SERVICE_DOWN', 4)
    expect(delay).toBeLessThanOrEqual(60000)
  })
})

describe('CircuitBreakerConfigSchema', () => {
  it('should validate default config', () => {
    expect(() => CircuitBreakerConfigSchema.parse(DEFAULT_CIRCUIT_BREAKER_CONFIG)).not.toThrow()
  })

  it('should apply defaults', () => {
    const config = CircuitBreakerConfigSchema.parse({})
    expect(config.failureThreshold).toBe(3)
    expect(config.recoveryTimeMs).toBe(60000)
    expect(config.successThreshold).toBe(1)
    expect(config.failureWindowMs).toBe(300000)
  })
})

describe('ErrorLogSchema', () => {
  it('should validate complete error log', () => {
    const log = {
      storyId: 'STORY-001',
      phase: 'dev-implementation',
      createdAt: '2026-02-01T12:00:00.000Z',
      updatedAt: '2026-02-01T12:00:00.000Z',
      errors: [],
      requiresIntervention: false,
    }

    expect(() => ErrorLogSchema.parse(log)).not.toThrow()
  })

  it('should include circuit state', () => {
    const log = {
      storyId: 'STORY-001',
      phase: 'dev-implementation',
      createdAt: '2026-02-01T12:00:00.000Z',
      updatedAt: '2026-02-01T12:00:00.000Z',
      errors: [],
      circuitState: 'OPEN',
      requiresIntervention: true,
      resolutionNotes: 'Waiting for KB service to recover',
    }

    const parsed = ErrorLogSchema.parse(log)
    expect(parsed.circuitState).toBe('OPEN')
    expect(parsed.requiresIntervention).toBe(true)
    expect(parsed.resolutionNotes).toBe('Waiting for KB service to recover')
  })
})

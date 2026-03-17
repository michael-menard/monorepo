/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'
/* eslint-enable import/order */

// Hoist mock functions (no function calls at hoist time)
const { mockReturning, mockValues, mockInsert, mockWarn } = vi.hoisted(() => ({
  mockReturning: vi.fn(),
  mockValues: vi.fn(),
  mockInsert: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: {
    insert: mockInsert,
  },
}))

vi.mock('@repo/knowledge-base/db', () => ({
  agentInvocations: {
    id: 'id',
    invocationId: 'invocation_id',
    agentName: 'agent_name',
    storyId: 'story_id',
    phase: 'phase',
    status: 'status',
    inputTokens: 'input_tokens',
    outputTokens: 'output_tokens',
    cachedTokens: 'cached_tokens',
    durationMs: 'duration_ms',
    modelName: 'model_name',
    errorMessage: 'error_message',
    startedAt: 'started_at',
    createdAt: 'created_at',
  },
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { logInvocation } from '../workflow-log-invocation'

describe('logInvocation', () => {
  const validInvocationInput = {
    agentName: 'pm-bootstrap-workflow',
    storyId: 'WINT-3020',
    phase: 'execute' as const,
    status: 'success' as const,
    inputTokens: 1200,
    outputTokens: 400,
    cachedTokens: 0,
    durationMs: 4200,
    modelName: 'claude-sonnet-4-6',
    invocationId: 'test-uuid-001',
  }

  const defaultRow = {
    id: randomUUID(),
    invocationId: 'test-uuid-001',
    agentName: 'pm-bootstrap-workflow',
    storyId: 'WINT-3020',
    phase: 'execute',
    status: 'success',
    inputTokens: 1200,
    outputTokens: 400,
    cachedTokens: 0,
    durationMs: 4200,
    modelName: 'claude-sonnet-4-6',
    errorMessage: null,
    startedAt: new Date(),
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockReturning.mockResolvedValue([defaultRow])
    mockValues.mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })
  })

  // HP-1: Valid full-field insert — returns row
  it('HP-1: should insert a row with all fields and return the inserted row', async () => {
    const result = await logInvocation(validInvocationInput)

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        invocationId: 'test-uuid-001',
        agentName: 'pm-bootstrap-workflow',
        storyId: 'WINT-3020',
        phase: 'execute',
        status: 'success',
        inputTokens: 1200,
        outputTokens: 400,
        cachedTokens: 0,
        durationMs: 4200,
        modelName: 'claude-sonnet-4-6',
      }),
    )
    expect(result).toEqual(defaultRow)
  })

  // EC-1: DB failure returns null and logs warning
  it('EC-1: should return null and call logger.warn when DB insert throws', async () => {
    mockReturning.mockRejectedValue(new Error('Connection refused'))

    const result = await logInvocation(validInvocationInput)

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("pm-bootstrap-workflow"),
      expect.stringContaining('Connection refused'),
    )
  })

  // EC-2: Missing required field agentName throws ZodError
  it('EC-2: should throw ZodError with path agentName when agentName is missing', async () => {
    await expect(logInvocation({ status: 'success' })).rejects.toThrow(ZodError)

    try {
      await logInvocation({ status: 'success' })
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError)
      const zodErr = err as ZodError
      expect(zodErr.issues.some(issue => issue.path.includes('agentName'))).toBe(true)
    }
  })

  // EC-3: Invalid status value rejected by Zod
  it('EC-3: should throw ZodError with path status for invalid status value', async () => {
    await expect(logInvocation({ agentName: 'foo', status: 'invalid_status' })).rejects.toThrow(
      ZodError,
    )

    try {
      await logInvocation({ agentName: 'foo', status: 'invalid_status' })
    } catch (err) {
      expect(err).toBeInstanceOf(ZodError)
      const zodErr = err as ZodError
      expect(zodErr.issues.some(issue => issue.path.includes('status'))).toBe(true)
    }
  })

  // ED-1: Optional fields omitted — defaults applied
  it('ED-1: should insert row with defaults when optional fields are omitted', async () => {
    const minimalInput = {
      agentName: 'test-agent',
      status: 'success' as const,
      invocationId: 'min-uuid',
    }

    const minimalRow = {
      id: randomUUID(),
      invocationId: 'min-uuid',
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      status: 'success',
      inputTokens: null,
      outputTokens: null,
      cachedTokens: 0,
      durationMs: null,
      modelName: null,
      errorMessage: null,
      startedAt: new Date(),
      createdAt: new Date(),
    }
    mockReturning.mockResolvedValue([minimalRow])

    const result = await logInvocation(minimalInput)

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        invocationId: 'min-uuid',
        agentName: 'test-agent',
        storyId: null,
        phase: null,
        status: 'success',
        cachedTokens: 0,
      }),
    )
    expect(result).toEqual(minimalRow)
  })

  // ED-2: status: 'partial' is accepted
  it('ED-2: should accept status partial and insert row', async () => {
    const partialInput = {
      agentName: 'agent',
      status: 'partial' as const,
      invocationId: 'partial-uuid',
    }

    const partialRow = {
      ...defaultRow,
      invocationId: 'partial-uuid',
      agentName: 'agent',
      status: 'partial',
      storyId: null,
      phase: null,
    }
    mockReturning.mockResolvedValue([partialRow])

    const result = await logInvocation(partialInput)

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'partial',
      }),
    )
    expect(result).toEqual(partialRow)
  })

  // EC-4: Duplicate invocationId fails gracefully
  it('EC-4: should return null and call logger.warn when duplicate invocationId causes DB constraint error', async () => {
    mockReturning.mockRejectedValue(
      new Error(
        'duplicate key value violates unique constraint "agent_invocations_invocation_id_idx"',
      ),
    )

    const result = await logInvocation({
      agentName: 'test-agent',
      status: 'success',
      invocationId: 'dup-uuid-001',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledTimes(1)
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('dup-uuid-001'),
      expect.stringContaining('duplicate key'),
    )
  })

  // Additional: auto-generates invocationId when not provided
  it('should auto-generate invocationId when not provided', async () => {
    await logInvocation({
      agentName: 'test-agent',
      status: 'success',
    })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        invocationId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      }),
    )
  })
})

/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions so vi.mock factory can access them
const { mockOnConflictDoNothing, mockValues, mockInsert, mockWarn } = vi.hoisted(() => {
  const mockOnConflictDoNothing = vi.fn().mockResolvedValue(undefined)
  const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing })
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
  const mockWarn = vi.fn()
  return { mockOnConflictDoNothing, mockValues, mockInsert, mockWarn }
})

vi.mock('../client', () => ({
  db: {
    insert: mockInsert,
  },
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { insertWorkflowEvent } from '../workflow-events'
import type { WorkflowEventInput } from '../workflow-events'

describe('insertWorkflowEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnConflictDoNothing.mockResolvedValue(undefined)
    mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing })
    mockInsert.mockReturnValue({ values: mockValues })
    mockWarn.mockClear()
  })

  it('should insert a minimal event (event_id + event_type only)', async () => {
    const eventId = randomUUID()
    await insertWorkflowEvent({
      eventId,
      eventType: 'step_completed',
    })

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId,
        eventType: 'step_completed',
        eventVersion: 1,
        runId: null,
        itemId: null,
        workflowName: null,
        agentRole: null,
        status: null,
        payload: null,
      }),
    )
    expect(mockOnConflictDoNothing).toHaveBeenCalled()
  })

  it('should insert an event with all fields populated', async () => {
    const eventId = randomUUID()
    const ts = new Date('2026-02-13T12:00:00Z')
    const event: WorkflowEventInput = {
      eventId,
      eventType: 'item_state_changed',
      eventVersion: 2,
      ts,
      runId: 'run-123',
      itemId: 'INFR-0040',
      workflowName: 'dev-implement-story',
      agentRole: 'dev-implementation-leader',
      status: 'in-progress',
      payload: { from: 'backlog', to: 'in-progress', reason: 'started implementation' },
    }

    await insertWorkflowEvent(event)

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId,
        eventType: 'item_state_changed',
        eventVersion: 2,
        ts,
        runId: 'run-123',
        itemId: 'INFR-0040',
        workflowName: 'dev-implement-story',
        agentRole: 'dev-implementation-leader',
        status: 'in-progress',
        payload: { from: 'backlog', to: 'in-progress', reason: 'started implementation' },
      }),
    )
  })

  it('should use ON CONFLICT DO NOTHING for idempotency (AC-4)', async () => {
    const eventId = randomUUID()

    await insertWorkflowEvent({ eventId, eventType: 'gap_found' })
    await insertWorkflowEvent({ eventId, eventType: 'gap_found' })

    expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(2)
  })

  it('should handle NULL optional fields correctly', async () => {
    const eventId = randomUUID()
    await insertWorkflowEvent({
      eventId,
      eventType: 'flow_issue',
      runId: null,
      itemId: null,
      payload: null,
    })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: null,
        itemId: null,
        payload: null,
      }),
    )
  })

  it('should handle empty JSONB payload', async () => {
    const eventId = randomUUID()
    await insertWorkflowEvent({
      eventId,
      eventType: 'step_completed',
      payload: {},
    })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: {},
      }),
    )
  })

  it('should handle large JSONB payload', async () => {
    const eventId = randomUUID()
    const largePayload: Record<string, unknown> = {}
    for (let i = 0; i < 1000; i++) {
      largePayload[`key_${i}`] = `value_${i}_${'x'.repeat(100)}`
    }

    await insertWorkflowEvent({
      eventId,
      eventType: 'step_completed',
      payload: largePayload,
    })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: largePayload,
      }),
    )
  })

  it('should throw validation error if event_id is missing (AC-13)', async () => {
    await expect(
      // @ts-expect-error - testing missing required field
      insertWorkflowEvent({ eventType: 'step_completed' }),
    ).rejects.toThrow()
  })

  it('should throw validation error if event_type is missing', async () => {
    await expect(
      // @ts-expect-error - testing missing required field
      insertWorkflowEvent({ eventId: randomUUID() }),
    ).rejects.toThrow()
  })

  it('should throw validation error for invalid event_type', async () => {
    await expect(
      insertWorkflowEvent({
        eventId: randomUUID(),
        // @ts-expect-error - testing invalid enum value
        eventType: 'invalid_type',
      }),
    ).rejects.toThrow()
  })

  it('should throw validation error for invalid UUID format', async () => {
    await expect(
      insertWorkflowEvent({
        eventId: 'not-a-uuid',
        eventType: 'step_completed',
      }),
    ).rejects.toThrow()
  })

  it('should catch DB errors and log warning instead of throwing (AC-10)', async () => {
    mockOnConflictDoNothing.mockRejectedValue(new Error('Connection refused'))

    // Should NOT throw
    const eventId = randomUUID()
    await insertWorkflowEvent({
      eventId,
      eventType: 'step_completed',
    })

    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('[telemetry] Failed to insert workflow event'),
      expect.stringContaining('Connection refused'),
    )
  })

  it('should accept all 5 event types', async () => {
    const eventTypes = [
      'item_state_changed',
      'step_completed',
      'story_changed',
      'gap_found',
      'flow_issue',
    ] as const

    for (const eventType of eventTypes) {
      vi.clearAllMocks()
      mockOnConflictDoNothing.mockResolvedValue(undefined)
      mockValues.mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing })
      mockInsert.mockReturnValue({ values: mockValues })

      await insertWorkflowEvent({
        eventId: randomUUID(),
        eventType,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
    }
  })

  it('should default eventVersion to 1 when not provided', async () => {
    const eventId = randomUUID()
    await insertWorkflowEvent({ eventId, eventType: 'step_completed' })

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        eventVersion: 1,
      }),
    )
  })
})

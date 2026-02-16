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
      payload: {
        from_state: 'backlog',
        to_state: 'in-progress',
        item_id: 'INFR-0040',
        item_type: 'story',
        reason: 'started implementation',
      },
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
        payload: {
          from_state: 'backlog',
          to_state: 'in-progress',
          item_id: 'INFR-0040',
          item_type: 'story',
          reason: 'started implementation',
        },
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
    // Empty payload is now invalid - must have required fields or be null
    // This test now validates that we reject empty payloads
    await expect(
      insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        payload: {},
      }),
    ).rejects.toThrow(/Invalid payload for event_type 'step_completed'/)
  })

  it('should handle large JSONB payload with valid schema', async () => {
    const eventId = randomUUID()
    // Create a large but valid payload for step_completed
    const largePayload = {
      step_name: 'test-step-with-long-name-' + 'x'.repeat(100),
      duration_ms: 123456789,
      tokens_used: 999999,
      model: 'claude-sonnet-4.5-with-long-identifier-' + 'x'.repeat(100),
      status: 'success' as const,
      error_message: 'A very long error message: ' + 'x'.repeat(1000),
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

  // INFR-0041 AC-14: Tests for payload validation and new metadata columns

  describe('INFR-0041: Payload Validation (AC-9)', () => {
    it('should validate item_state_changed payload successfully', async () => {
      const eventId = randomUUID()
      const payload = {
        from_state: 'backlog',
        to_state: 'in-progress',
        item_id: 'INFR-0041',
        item_type: 'story',
        reason: 'user action',
      }

      await insertWorkflowEvent({
        eventId,
        eventType: 'item_state_changed',
        payload,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          payload,
        }),
      )
    })

    it('should validate step_completed payload successfully', async () => {
      const eventId = randomUUID()
      const payload = {
        step_name: 'elab-story',
        duration_ms: 45000,
        tokens_used: 12500,
        model: 'claude-sonnet-4.5',
        status: 'success',
      }

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        payload,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should validate story_changed payload successfully', async () => {
      const eventId = randomUUID()
      const payload = {
        change_type: 'updated',
        field_changed: 'status',
        old_value: 'backlog',
        new_value: 'in-progress',
        item_id: 'INFR-0041',
      }

      await insertWorkflowEvent({
        eventId,
        eventType: 'story_changed',
        payload,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should validate gap_found payload successfully', async () => {
      const eventId = randomUUID()
      const payload = {
        gap_type: 'missing_ac',
        gap_description: 'No AC for error handling',
        severity: 'high',
        item_id: 'INFR-0041',
        workflow_name: 'elab-story',
      }

      await insertWorkflowEvent({
        eventId,
        eventType: 'gap_found',
        payload,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should validate flow_issue payload successfully', async () => {
      const eventId = randomUUID()
      const payload = {
        issue_type: 'tool_failure',
        issue_description: 'Git push failed',
        recovery_action: 'retry',
        workflow_name: 'dev-implement-story',
        agent_role: 'dev-implementation-leader',
      }

      await insertWorkflowEvent({
        eventId,
        eventType: 'flow_issue',
        payload,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
    })

    it('should throw validation error for invalid item_state_changed payload', async () => {
      const eventId = randomUUID()
      const payload = {
        from_state: 'backlog',
        // Missing required to_state, item_id, item_type
      }

      await expect(
        insertWorkflowEvent({
          eventId,
          eventType: 'item_state_changed',
          payload,
        }),
      ).rejects.toThrow(/Invalid payload for event_type 'item_state_changed'/)
    })

    it('should throw validation error for invalid step_completed status enum', async () => {
      const eventId = randomUUID()
      const payload = {
        step_name: 'test-step',
        duration_ms: 1000,
        status: 'pending', // Invalid enum value
      }

      await expect(
        insertWorkflowEvent({
          eventId,
          eventType: 'step_completed',
          payload,
        }),
      ).rejects.toThrow(/Invalid payload for event_type 'step_completed'/)
    })

    it('should throw validation error for invalid story_changed change_type enum', async () => {
      const eventId = randomUUID()
      const payload = {
        change_type: 'modified', // Invalid enum value
        field_changed: 'status',
        item_id: 'INFR-0041',
      }

      await expect(
        insertWorkflowEvent({
          eventId,
          eventType: 'story_changed',
          payload,
        }),
      ).rejects.toThrow(/Invalid payload for event_type 'story_changed'/)
    })

    it('should throw validation error for invalid gap_found severity enum', async () => {
      const eventId = randomUUID()
      const payload = {
        gap_type: 'missing_ac',
        gap_description: 'Test',
        severity: 'critical', // Invalid enum value
        item_id: 'INFR-0041',
        workflow_name: 'test-workflow',
      }

      await expect(
        insertWorkflowEvent({
          eventId,
          eventType: 'gap_found',
          payload,
        }),
      ).rejects.toThrow(/Invalid payload for event_type 'gap_found'/)
    })

    it('should throw validation error for invalid flow_issue issue_type enum', async () => {
      const eventId = randomUUID()
      const payload = {
        issue_type: 'unknown', // Invalid enum value
        issue_description: 'Test',
        workflow_name: 'test-workflow',
      }

      await expect(
        insertWorkflowEvent({
          eventId,
          eventType: 'flow_issue',
          payload,
        }),
      ).rejects.toThrow(/Invalid payload for event_type 'flow_issue'/)
    })

    it('should allow NULL payload (backward compatibility)', async () => {
      const eventId = randomUUID()

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        payload: null,
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: null,
        }),
      )
    })

    it('should allow undefined payload (backward compatibility)', async () => {
      const eventId = randomUUID()

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
      })

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: null,
        }),
      )
    })
  })

  describe('INFR-0041: Metadata Columns (AC-6, AC-7, AC-8)', () => {
    it('should accept NULL for all metadata columns', async () => {
      const eventId = randomUUID()

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        correlationId: null,
        source: null,
        emittedBy: null,
      })

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: null,
          source: null,
          emittedBy: null,
        }),
      )
    })

    it('should accept valid UUID for correlation_id (AC-6)', async () => {
      const eventId = randomUUID()
      const correlationId = randomUUID()

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        correlationId,
      })

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId,
        }),
      )
    })

    it('should accept valid text for source (AC-7)', async () => {
      const eventId = randomUUID()

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        source: 'orchestrator',
      })

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'orchestrator',
        }),
      )
    })

    it('should accept valid text for emitted_by (AC-8)', async () => {
      const eventId = randomUUID()

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        emittedBy: 'dev-implementation-leader',
      })

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          emittedBy: 'dev-implementation-leader',
        }),
      )
    })

    it('should accept all metadata columns together', async () => {
      const eventId = randomUUID()
      const correlationId = randomUUID()

      await insertWorkflowEvent({
        eventId,
        eventType: 'step_completed',
        correlationId,
        source: 'langgraph-node',
        emittedBy: 'pm-story-seed-agent',
      })

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId,
          source: 'langgraph-node',
          emittedBy: 'pm-story-seed-agent',
        }),
      )
    })

    it('should throw validation error for invalid correlation_id UUID format', async () => {
      const eventId = randomUUID()

      await expect(
        insertWorkflowEvent({
          eventId,
          eventType: 'step_completed',
          correlationId: 'not-a-uuid',
        }),
      ).rejects.toThrow()
    })
  })
})

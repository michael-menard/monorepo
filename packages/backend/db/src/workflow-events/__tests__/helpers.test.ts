/**
 * AC-11: Unit tests for all 5 helper functions
 *
 * Coverage:
 * - Helper functions return valid event objects
 * - UUIDs are auto-generated
 * - Payloads are validated
 * - Metadata fields are correctly populated
 * - Optional fields work correctly
 */

import { describe, it, expect } from 'vitest'
import {
  createItemStateChangedEvent,
  createStepCompletedEvent,
  createStoryChangedEvent,
  createGapFoundEvent,
  createFlowIssueEvent,
} from '../helpers'

describe('createItemStateChangedEvent (AC-10)', () => {
  it('should create valid event with all fields', () => {
    const event = createItemStateChangedEvent({
      fromState: 'backlog',
      toState: 'in-progress',
      itemId: 'INFR-0040',
      itemType: 'story',
      reason: 'user action',
      runId: 'run-123',
      workflowName: 'dev-implement-story',
      agentRole: 'dev-implementation-leader',
      correlationId: '550e8400-e29b-41d4-a716-446655440000',
      source: 'orchestrator',
      emittedBy: 'dev-implementation-leader',
    })

    expect(event).toMatchObject({
      eventType: 'item_state_changed',
      itemId: 'INFR-0040',
      runId: 'run-123',
      workflowName: 'dev-implement-story',
      agentRole: 'dev-implementation-leader',
      correlationId: '550e8400-e29b-41d4-a716-446655440000',
      source: 'orchestrator',
      emittedBy: 'dev-implementation-leader',
      payload: {
        from_state: 'backlog',
        to_state: 'in-progress',
        item_id: 'INFR-0040',
        item_type: 'story',
        reason: 'user action',
      },
    })
    expect(event.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('should create valid event with minimal fields', () => {
    const event = createItemStateChangedEvent({
      fromState: 'backlog',
      toState: 'in-progress',
      itemId: 'INFR-0040',
      itemType: 'story',
    })

    expect(event).toMatchObject({
      eventType: 'item_state_changed',
      itemId: 'INFR-0040',
      runId: null,
      workflowName: null,
      agentRole: null,
      correlationId: null,
      source: null,
      emittedBy: null,
      payload: {
        from_state: 'backlog',
        to_state: 'in-progress',
        item_id: 'INFR-0040',
        item_type: 'story',
      },
    })
    expect(event.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('should auto-generate unique event IDs', () => {
    const event1 = createItemStateChangedEvent({
      fromState: 'backlog',
      toState: 'in-progress',
      itemId: 'INFR-0040',
      itemType: 'story',
    })

    const event2 = createItemStateChangedEvent({
      fromState: 'backlog',
      toState: 'in-progress',
      itemId: 'INFR-0040',
      itemType: 'story',
    })

    expect(event1.eventId).not.toEqual(event2.eventId)
  })

  it('should throw validation error for invalid payload', () => {
    expect(() =>
      createItemStateChangedEvent({
        // @ts-expect-error - testing validation
        fromState: '',
        toState: 123, // Invalid type
        itemId: 'INFR-0040',
        itemType: 'story',
      }),
    ).toThrow()
  })
})

describe('createStepCompletedEvent (AC-11)', () => {
  it('should create valid event with all fields', () => {
    const event = createStepCompletedEvent({
      stepName: 'elab-story',
      durationMs: 45000,
      tokensUsed: 12500,
      model: 'claude-sonnet-4.5',
      status: 'success',
      runId: 'run-123',
      workflowName: 'dev-implement-story',
      agentRole: 'pm-story-seed-agent',
      correlationId: '550e8400-e29b-41d4-a716-446655440000',
      source: 'orchestrator',
      emittedBy: 'pm-story-seed-agent',
    })

    expect(event).toMatchObject({
      eventType: 'step_completed',
      runId: 'run-123',
      workflowName: 'dev-implement-story',
      agentRole: 'pm-story-seed-agent',
      status: 'success',
      payload: {
        step_name: 'elab-story',
        duration_ms: 45000,
        tokens_used: 12500,
        model: 'claude-sonnet-4.5',
        status: 'success',
      },
    })
  })

  it('should create valid event with error status', () => {
    const event = createStepCompletedEvent({
      stepName: 'elab-story',
      durationMs: 5000,
      status: 'error',
      errorMessage: 'API timeout',
    })

    expect(event).toMatchObject({
      eventType: 'step_completed',
      status: 'error',
      payload: {
        step_name: 'elab-story',
        duration_ms: 5000,
        status: 'error',
        error_message: 'API timeout',
      },
    })
  })

  it('should throw validation error for invalid status enum', () => {
    expect(() =>
      createStepCompletedEvent({
        stepName: 'test-step',
        durationMs: 1000,
        // @ts-expect-error - testing validation
        status: 'pending',
      }),
    ).toThrow()
  })
})

describe('createStoryChangedEvent (AC-11)', () => {
  it('should create valid event with all fields', () => {
    const event = createStoryChangedEvent({
      changeType: 'updated',
      fieldChanged: 'status',
      oldValue: 'backlog',
      newValue: 'in-progress',
      itemId: 'INFR-0040',
      runId: 'run-123',
      workflowName: 'dev-implement-story',
    })

    expect(event).toMatchObject({
      eventType: 'story_changed',
      itemId: 'INFR-0040',
      runId: 'run-123',
      workflowName: 'dev-implement-story',
      payload: {
        change_type: 'updated',
        field_changed: 'status',
        old_value: 'backlog',
        new_value: 'in-progress',
        item_id: 'INFR-0040',
      },
    })
  })

  it('should create valid event for created change without old_value', () => {
    const event = createStoryChangedEvent({
      changeType: 'created',
      fieldChanged: 'title',
      newValue: 'New Story',
      itemId: 'INFR-0041',
    })

    expect(event).toMatchObject({
      eventType: 'story_changed',
      itemId: 'INFR-0041',
      payload: {
        change_type: 'created',
        field_changed: 'title',
        new_value: 'New Story',
        item_id: 'INFR-0041',
      },
    })
  })

  it('should handle complex values in old_value/new_value', () => {
    const oldValue = { priority: 'P2', tags: ['backend'] }
    const newValue = { priority: 'P1', tags: ['backend', 'urgent'] }

    const event = createStoryChangedEvent({
      changeType: 'updated',
      fieldChanged: 'metadata',
      oldValue,
      newValue,
      itemId: 'INFR-0041',
    })

    expect(event.payload).toMatchObject({
      old_value: oldValue,
      new_value: newValue,
    })
  })

  it('should throw validation error for invalid change_type enum', () => {
    expect(() =>
      createStoryChangedEvent({
        // @ts-expect-error - testing validation
        changeType: 'modified',
        fieldChanged: 'status',
        itemId: 'INFR-0040',
      }),
    ).toThrow()
  })
})

describe('createGapFoundEvent (AC-11)', () => {
  it('should create valid event with all fields', () => {
    const event = createGapFoundEvent({
      gapType: 'missing_ac',
      gapDescription: 'No AC for error handling',
      severity: 'high',
      itemId: 'INFR-0040',
      workflowName: 'elab-story',
      runId: 'run-123',
      agentRole: 'pm-story-seed-agent',
      correlationId: '550e8400-e29b-41d4-a716-446655440000',
      source: 'orchestrator',
      emittedBy: 'pm-story-seed-agent',
    })

    expect(event).toMatchObject({
      eventType: 'gap_found',
      itemId: 'INFR-0040',
      workflowName: 'elab-story',
      runId: 'run-123',
      agentRole: 'pm-story-seed-agent',
      payload: {
        gap_type: 'missing_ac',
        gap_description: 'No AC for error handling',
        severity: 'high',
        item_id: 'INFR-0040',
        workflow_name: 'elab-story',
      },
    })
  })

  it('should create valid event with minimal fields', () => {
    const event = createGapFoundEvent({
      gapType: 'scope_creep',
      gapDescription: 'Additional requirements found',
      severity: 'medium',
      itemId: 'INFR-0040',
      workflowName: 'elab-story',
    })

    expect(event).toMatchObject({
      eventType: 'gap_found',
      itemId: 'INFR-0040',
      workflowName: 'elab-story',
      payload: {
        gap_type: 'scope_creep',
        gap_description: 'Additional requirements found',
        severity: 'medium',
      },
    })
  })

  it('should throw validation error for invalid gap_type enum', () => {
    expect(() =>
      createGapFoundEvent({
        // @ts-expect-error - testing validation
        gapType: 'invalid_gap',
        gapDescription: 'Test',
        severity: 'medium',
        itemId: 'INFR-0040',
        workflowName: 'test-workflow',
      }),
    ).toThrow()
  })

  it('should throw validation error for invalid severity enum', () => {
    expect(() =>
      createGapFoundEvent({
        gapType: 'missing_ac',
        gapDescription: 'Test',
        // @ts-expect-error - testing validation
        severity: 'critical',
        itemId: 'INFR-0040',
        workflowName: 'test-workflow',
      }),
    ).toThrow()
  })
})

describe('createFlowIssueEvent (AC-11)', () => {
  it('should create valid event with all fields', () => {
    const event = createFlowIssueEvent({
      issueType: 'tool_failure',
      issueDescription: 'Git push failed: permission denied',
      recoveryAction: 'retry with --force-with-lease',
      workflowName: 'dev-implement-story',
      agentRole: 'dev-implementation-leader',
      runId: 'run-123',
      correlationId: '550e8400-e29b-41d4-a716-446655440000',
      source: 'orchestrator',
      emittedBy: 'dev-implementation-leader',
    })

    expect(event).toMatchObject({
      eventType: 'flow_issue',
      workflowName: 'dev-implement-story',
      agentRole: 'dev-implementation-leader',
      runId: 'run-123',
      payload: {
        issue_type: 'tool_failure',
        issue_description: 'Git push failed: permission denied',
        recovery_action: 'retry with --force-with-lease',
        workflow_name: 'dev-implement-story',
        agent_role: 'dev-implementation-leader',
      },
    })
  })

  it('should create valid event without optional fields', () => {
    const event = createFlowIssueEvent({
      issueType: 'timeout',
      issueDescription: 'API request timed out',
      workflowName: 'dev-implement-story',
    })

    expect(event).toMatchObject({
      eventType: 'flow_issue',
      workflowName: 'dev-implement-story',
      payload: {
        issue_type: 'timeout',
        issue_description: 'API request timed out',
        workflow_name: 'dev-implement-story',
      },
    })
  })

  it('should throw validation error for invalid issue_type enum', () => {
    expect(() =>
      createFlowIssueEvent({
        // @ts-expect-error - testing validation
        issueType: 'unknown_issue',
        issueDescription: 'Test',
        workflowName: 'test-workflow',
      }),
    ).toThrow()
  })
})

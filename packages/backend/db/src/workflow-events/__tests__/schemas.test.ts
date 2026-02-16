/**
 * AC-13: Unit tests for all 5 event type schemas
 *
 * Coverage:
 * - Valid payloads parse successfully
 * - Invalid payloads throw validation errors with clear messages
 * - Required vs optional fields enforced
 * - Enum values validated (reject invalid enum values)
 * - Test examples from AC-1 through AC-5
 */

import { describe, it, expect } from 'vitest'
import {
  ItemStateChangedPayloadSchema,
  StepCompletedPayloadSchema,
  StoryChangedPayloadSchema,
  GapFoundPayloadSchema,
  FlowIssuePayloadSchema,
  WorkflowEventSchemas,
} from '../schemas'

describe('ItemStateChangedPayloadSchema (AC-1)', () => {
  it('should parse valid payload from AC-1 example', () => {
    const payload = {
      from_state: 'backlog',
      to_state: 'in-progress',
      item_id: 'INFR-0040',
      item_type: 'story',
      reason: 'user action',
    }

    const result = ItemStateChangedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload without optional reason', () => {
    const payload = {
      from_state: 'backlog',
      to_state: 'in-progress',
      item_id: 'INFR-0040',
      item_type: 'story',
    }

    const result = ItemStateChangedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should reject payload with missing required field (from_state)', () => {
    const payload = {
      to_state: 'in-progress',
      item_id: 'INFR-0040',
      item_type: 'story',
    }

    expect(() => ItemStateChangedPayloadSchema.parse(payload)).toThrow()
  })

  it('should reject payload with missing required field (item_id)', () => {
    const payload = {
      from_state: 'backlog',
      to_state: 'in-progress',
      item_type: 'story',
    }

    expect(() => ItemStateChangedPayloadSchema.parse(payload)).toThrow()
  })
})

describe('StepCompletedPayloadSchema (AC-2)', () => {
  it('should parse valid payload from AC-2 example', () => {
    const payload = {
      step_name: 'elab-story',
      duration_ms: 45000,
      tokens_used: 12500,
      model: 'claude-sonnet-4.5',
      status: 'success' as const,
    }

    const result = StepCompletedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload with error status and error_message', () => {
    const payload = {
      step_name: 'elab-story',
      duration_ms: 5000,
      status: 'error' as const,
      error_message: 'API timeout',
    }

    const result = StepCompletedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload without optional fields', () => {
    const payload = {
      step_name: 'elab-story',
      duration_ms: 45000,
      status: 'success' as const,
    }

    const result = StepCompletedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should reject payload with invalid status enum value', () => {
    const payload = {
      step_name: 'elab-story',
      duration_ms: 45000,
      status: 'pending',
    }

    expect(() => StepCompletedPayloadSchema.parse(payload)).toThrow()
  })

  it('should reject payload with missing required field (step_name)', () => {
    const payload = {
      duration_ms: 45000,
      status: 'success',
    }

    expect(() => StepCompletedPayloadSchema.parse(payload)).toThrow()
  })

  it('should reject payload with invalid duration_ms type (string instead of number)', () => {
    const payload = {
      step_name: 'elab-story',
      duration_ms: '45000',
      status: 'success',
    }

    expect(() => StepCompletedPayloadSchema.parse(payload)).toThrow()
  })
})

describe('StoryChangedPayloadSchema (AC-3)', () => {
  it('should parse valid payload from AC-3 example', () => {
    const payload = {
      change_type: 'updated' as const,
      field_changed: 'status',
      old_value: 'backlog',
      new_value: 'in-progress',
      item_id: 'INFR-0040',
    }

    const result = StoryChangedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload with created change_type and no old_value', () => {
    const payload = {
      change_type: 'created' as const,
      field_changed: 'title',
      new_value: 'New Story Title',
      item_id: 'INFR-0041',
    }

    const result = StoryChangedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload with complex old_value/new_value', () => {
    const payload = {
      change_type: 'updated' as const,
      field_changed: 'metadata',
      old_value: { priority: 'P2', tags: ['backend'] },
      new_value: { priority: 'P1', tags: ['backend', 'urgent'] },
      item_id: 'INFR-0041',
    }

    const result = StoryChangedPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should reject payload with invalid change_type enum value', () => {
    const payload = {
      change_type: 'modified',
      field_changed: 'status',
      old_value: 'backlog',
      new_value: 'in-progress',
      item_id: 'INFR-0040',
    }

    expect(() => StoryChangedPayloadSchema.parse(payload)).toThrow()
  })

  it('should reject payload with missing required field (item_id)', () => {
    const payload = {
      change_type: 'updated',
      field_changed: 'status',
      old_value: 'backlog',
      new_value: 'in-progress',
    }

    expect(() => StoryChangedPayloadSchema.parse(payload)).toThrow()
  })
})

describe('GapFoundPayloadSchema (AC-4)', () => {
  it('should parse valid payload from AC-4 example', () => {
    const payload = {
      gap_type: 'missing_ac' as const,
      gap_description: 'No AC for error handling in insertWorkflowEvent',
      severity: 'high' as const,
      item_id: 'INFR-0040',
      workflow_name: 'elab-story',
    }

    const result = GapFoundPayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload with all gap_type enum values', () => {
    const gapTypes = ['missing_ac', 'scope_creep', 'dependency_missing', 'other'] as const

    for (const gapType of gapTypes) {
      const payload = {
        gap_type: gapType,
        gap_description: 'Test description',
        severity: 'medium' as const,
        item_id: 'INFR-0040',
        workflow_name: 'test-workflow',
      }

      expect(() => GapFoundPayloadSchema.parse(payload)).not.toThrow()
    }
  })

  it('should parse valid payload with all severity enum values', () => {
    const severities = ['low', 'medium', 'high'] as const

    for (const severity of severities) {
      const payload = {
        gap_type: 'missing_ac' as const,
        gap_description: 'Test description',
        severity,
        item_id: 'INFR-0040',
        workflow_name: 'test-workflow',
      }

      expect(() => GapFoundPayloadSchema.parse(payload)).not.toThrow()
    }
  })

  it('should reject payload with invalid gap_type enum value', () => {
    const payload = {
      gap_type: 'invalid_gap',
      gap_description: 'Test description',
      severity: 'medium',
      item_id: 'INFR-0040',
      workflow_name: 'test-workflow',
    }

    expect(() => GapFoundPayloadSchema.parse(payload)).toThrow()
  })

  it('should reject payload with invalid severity enum value', () => {
    const payload = {
      gap_type: 'missing_ac',
      gap_description: 'Test description',
      severity: 'critical',
      item_id: 'INFR-0040',
      workflow_name: 'test-workflow',
    }

    expect(() => GapFoundPayloadSchema.parse(payload)).toThrow()
  })

  it('should reject payload with missing required field (workflow_name)', () => {
    const payload = {
      gap_type: 'missing_ac',
      gap_description: 'Test description',
      severity: 'medium',
      item_id: 'INFR-0040',
    }

    expect(() => GapFoundPayloadSchema.parse(payload)).toThrow()
  })
})

describe('FlowIssuePayloadSchema (AC-5)', () => {
  it('should parse valid payload from AC-5 example', () => {
    const payload = {
      issue_type: 'tool_failure' as const,
      issue_description: 'Git push failed: permission denied',
      recovery_action: 'retry with --force-with-lease',
      workflow_name: 'dev-implement-story',
      agent_role: 'dev-implementation-leader',
    }

    const result = FlowIssuePayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload without optional fields', () => {
    const payload = {
      issue_type: 'timeout' as const,
      issue_description: 'API request timed out',
      workflow_name: 'dev-implement-story',
    }

    const result = FlowIssuePayloadSchema.parse(payload)
    expect(result).toEqual(payload)
  })

  it('should parse valid payload with all issue_type enum values', () => {
    const issueTypes = ['agent_blocked', 'tool_failure', 'timeout', 'other'] as const

    for (const issueType of issueTypes) {
      const payload = {
        issue_type: issueType,
        issue_description: 'Test description',
        workflow_name: 'test-workflow',
      }

      expect(() => FlowIssuePayloadSchema.parse(payload)).not.toThrow()
    }
  })

  it('should reject payload with invalid issue_type enum value', () => {
    const payload = {
      issue_type: 'unknown_issue',
      issue_description: 'Test description',
      workflow_name: 'test-workflow',
    }

    expect(() => FlowIssuePayloadSchema.parse(payload)).toThrow()
  })

  it('should reject payload with missing required field (issue_description)', () => {
    const payload = {
      issue_type: 'timeout',
      workflow_name: 'test-workflow',
    }

    expect(() => FlowIssuePayloadSchema.parse(payload)).toThrow()
  })
})

describe('WorkflowEventSchemas (AC-12)', () => {
  it('should export all 5 event type schemas', () => {
    expect(WorkflowEventSchemas).toHaveProperty('item_state_changed')
    expect(WorkflowEventSchemas).toHaveProperty('step_completed')
    expect(WorkflowEventSchemas).toHaveProperty('story_changed')
    expect(WorkflowEventSchemas).toHaveProperty('gap_found')
    expect(WorkflowEventSchemas).toHaveProperty('flow_issue')
  })

  it('should allow accessing schemas by event_type key', () => {
    const eventType: 'item_state_changed' = 'item_state_changed'
    const schema = WorkflowEventSchemas[eventType]

    const payload = {
      from_state: 'backlog',
      to_state: 'in-progress',
      item_id: 'INFR-0040',
      item_type: 'story',
    }

    expect(() => schema.parse(payload)).not.toThrow()
  })

  it('should validate correct payload for each event type', () => {
    const testCases = [
      {
        eventType: 'item_state_changed' as const,
        payload: {
          from_state: 'backlog',
          to_state: 'in-progress',
          item_id: 'INFR-0040',
          item_type: 'story',
        },
      },
      {
        eventType: 'step_completed' as const,
        payload: {
          step_name: 'test-step',
          duration_ms: 1000,
          status: 'success' as const,
        },
      },
      {
        eventType: 'story_changed' as const,
        payload: {
          change_type: 'updated' as const,
          field_changed: 'status',
          item_id: 'INFR-0040',
        },
      },
      {
        eventType: 'gap_found' as const,
        payload: {
          gap_type: 'missing_ac' as const,
          gap_description: 'Test gap',
          severity: 'medium' as const,
          item_id: 'INFR-0040',
          workflow_name: 'test-workflow',
        },
      },
      {
        eventType: 'flow_issue' as const,
        payload: {
          issue_type: 'timeout' as const,
          issue_description: 'Test issue',
          workflow_name: 'test-workflow',
        },
      },
    ]

    for (const testCase of testCases) {
      const schema = WorkflowEventSchemas[testCase.eventType]
      expect(() => schema.parse(testCase.payload)).not.toThrow()
    }
  })
})

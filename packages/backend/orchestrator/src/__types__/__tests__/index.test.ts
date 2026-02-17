/**
 * Shared Types Module Tests
 *
 * Validates that all exported schemas correctly accept valid inputs
 * and reject invalid inputs.
 */

import { describe, it, expect } from 'vitest'
import {
  // WINT Schema exports
  insertStorySchema,
  selectStorySchema,
  insertStoryTransitionSchema,
  selectStoryTransitionSchema,
  insertAgentInvocationSchema,
  selectAgentInvocationSchema,
  insertWorkflowExecutionSchema,
  selectWorkflowExecutionSchema,
  // Legacy repository schemas
  StoryRowSchema,
  StateTransitionSchema,
  ElaborationRecordSchema,
  PlanRecordSchema,
  VerificationRecordSchema,
  ProofRecordSchema,
  TokenUsageRecordSchema,
  TokenUsageInputSchema,
} from '../index.js'

// ============================================================================
// WINT Schema Tests
// ============================================================================

describe('WINT Schema - Story Schemas', () => {
  describe('insertStorySchema', () => {
    it('should reject story with invalid UUID', () => {
      const invalidStory = {
        id: 'not-a-uuid',
        storyId: 'WINT-1100',
        title: 'Test Story',
        storyType: 'feature',
        state: 'backlog',
      }

      expect(() => insertStorySchema.parse(invalidStory)).toThrow()
    })

    it('should reject story with missing required fields', () => {
      const invalidStory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        // Missing storyId, title, storyType, state
      }

      expect(() => insertStorySchema.parse(invalidStory)).toThrow()
    })

    it('should enforce storyType as required string', () => {
      const invalidStory = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        storyId: 'WINT-1100',
        title: 'Test Story',
        // Missing storyType
        state: 'backlog',
      }

      expect(() => insertStorySchema.parse(invalidStory)).toThrow()
    })
  })

  describe('selectStorySchema', () => {
    it('should include timestamp fields', () => {
      // Test that schema structure includes createdAt and updatedAt
      // This is a schema structure validation rather than data validation
      expect(selectStorySchema.shape).toHaveProperty('createdAt')
      expect(selectStorySchema.shape).toHaveProperty('updatedAt')
    })
  })
})

describe('WINT Schema - Transition Schemas', () => {
  describe('insertStoryTransitionSchema', () => {
    it('should validate UUID format for id field', () => {
      const invalidTransition = {
        id: 'not-a-uuid', // Invalid UUID
        storyId: '223e4567-e89b-12d3-a456-426614174000',
        fromState: 'backlog',
        toState: 'ready_to_work',
        triggeredBy: 'system',
        transitionedAt: new Date(),
      }

      expect(() => insertStoryTransitionSchema.parse(invalidTransition)).toThrow()
    })
  })
})

describe('WINT Schema - Telemetry Schemas', () => {
  describe('insertAgentInvocationSchema', () => {
    it('should validate UUID format for id and storyId', () => {
      const invalidInvocation = {
        id: 'not-a-uuid', // Invalid UUID
        storyId: '223e4567-e89b-12d3-a456-426614174000',
        invocationId: 'inv-123',
        agentName: 'dev-execute-leader',
        phase: 'execute',
        startedAt: new Date(),
      }

      expect(() => insertAgentInvocationSchema.parse(invalidInvocation)).toThrow()
    })
  })
})

describe('WINT Schema - Workflow Schemas', () => {
  describe('insertWorkflowExecutionSchema', () => {
    it('should validate UUID format for id', () => {
      const invalidExecution = {
        id: 'not-a-uuid', // Invalid UUID
        storyId: '223e4567-e89b-12d3-a456-426614174000',
        executionId: 'exec-123',
        workflowName: 'story-elaboration',
        workflowVersion: '1.0.0',
        triggeredBy: 'system',
        startedAt: new Date(),
        status: 'pending',
      }

      expect(() => insertWorkflowExecutionSchema.parse(invalidExecution)).toThrow()
    })
  })
})

// ============================================================================
// Legacy Repository Schema Tests
// ============================================================================

describe('Legacy Schema - StoryRowSchema', () => {
  it('should accept valid story row data', () => {
    const validStoryRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'WINT-1100',
      feature_id: '223e4567-e89b-12d3-a456-426614174000',
      type: 'feature',
      state: 'backlog',
      title: 'Test Story',
      goal: 'Test goal',
      points: 5,
      priority: 'P2',
      blocked_by: null,
      depends_on: ['WINT-1080'],
      follow_up_from: null,
      packages: ['orchestrator'],
      surfaces: ['backend'],
      non_goals: [],
      created_at: new Date(),
      updated_at: new Date(),
    }

    expect(() => StoryRowSchema.parse(validStoryRow)).not.toThrow()
  })

  it('should reject story with invalid state', () => {
    const invalidStory = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'WINT-1100',
      feature_id: null,
      type: 'feature',
      state: 'invalid-state',
      title: 'Test Story',
      goal: null,
      points: null,
      priority: null,
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: null,
      surfaces: null,
      non_goals: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    expect(() => StoryRowSchema.parse(invalidStory)).toThrow()
  })

  it('should accept story with nullable fields', () => {
    const minimalStory = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'WINT-1100',
      feature_id: null,
      type: 'feature',
      state: 'backlog',
      title: 'Test Story',
      goal: null,
      points: null,
      priority: null,
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: null,
      surfaces: null,
      non_goals: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    expect(() => StoryRowSchema.parse(minimalStory)).not.toThrow()
  })
})

describe('Legacy Schema - StateTransitionSchema', () => {
  it('should accept valid state transition data', () => {
    const validTransition = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'WINT-1100',
      from_state: 'backlog',
      to_state: 'ready-to-work',
      actor: 'dev-execute-leader',
      reason: 'Story ready for implementation',
      created_at: new Date(),
    }

    expect(() => StateTransitionSchema.parse(validTransition)).not.toThrow()
  })

  it('should accept transition with null from_state', () => {
    const newStoryTransition = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'WINT-1100',
      from_state: null,
      to_state: 'backlog',
      actor: 'system',
      reason: 'Story created',
      created_at: new Date(),
    }

    expect(() => StateTransitionSchema.parse(newStoryTransition)).not.toThrow()
  })
})

describe('Legacy Schema - ElaborationRecordSchema', () => {
  it('should accept valid elaboration record', () => {
    const validElaboration = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      date: new Date(),
      verdict: 'PASS',
      audit: { checks: [] },
      content: { elaboration: 'details' },
      readiness_score: 95,
      gaps_count: 0,
      created_at: new Date(),
      created_by: 'dev-elab-leader',
    }

    expect(() => ElaborationRecordSchema.parse(validElaboration)).not.toThrow()
  })

  it('should accept elaboration with nullable fields', () => {
    const minimalElaboration = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      content: null,
      readiness_score: null,
      gaps_count: null,
      created_at: new Date(),
      created_by: null,
    }

    expect(() => ElaborationRecordSchema.parse(minimalElaboration)).not.toThrow()
  })

  it('should reject elaboration with invalid readiness score', () => {
    const invalidElaboration = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      content: null,
      readiness_score: 150, // > 100
      gaps_count: null,
      created_at: new Date(),
      created_by: null,
    }

    expect(() => ElaborationRecordSchema.parse(invalidElaboration)).toThrow()
  })
})

describe('Legacy Schema - PlanRecordSchema', () => {
  it('should accept valid plan record', () => {
    const validPlan = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      version: 1,
      approved: true,
      estimated_files: 10,
      estimated_tokens: 5000,
      content: { steps: [] },
      steps_count: 5,
      files_count: 10,
      complexity: 'medium',
      created_at: new Date(),
      created_by: 'dev-plan-leader',
    }

    expect(() => PlanRecordSchema.parse(validPlan)).not.toThrow()
  })

  it('should reject plan with zero version', () => {
    const invalidPlan = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      version: 0, // Must be positive
      approved: true,
      estimated_files: null,
      estimated_tokens: null,
      content: null,
      steps_count: null,
      files_count: null,
      complexity: null,
      created_at: new Date(),
      created_by: null,
    }

    expect(() => PlanRecordSchema.parse(invalidPlan)).toThrow()
  })
})

describe('Legacy Schema - VerificationRecordSchema', () => {
  it('should accept valid verification record', () => {
    const validVerification = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      version: 1,
      type: 'qa-verify',
      content: { checks: [] },
      verdict: 'PASS',
      issues_count: 0,
      qa_verdict: 'PASS',
      created_at: new Date(),
      created_by: 'dev-qa-leader',
    }

    expect(() => VerificationRecordSchema.parse(validVerification)).not.toThrow()
  })
})

describe('Legacy Schema - ProofRecordSchema', () => {
  it('should accept valid proof record', () => {
    const validProof = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      version: 1,
      content: { evidence: [] },
      acs_passing: 10,
      acs_total: 10,
      files_touched: 15,
      all_acs_verified: true,
      created_at: new Date(),
      created_by: 'dev-execute-leader',
    }

    expect(() => ProofRecordSchema.parse(validProof)).not.toThrow()
  })

  it('should reject proof with negative acs_passing', () => {
    const invalidProof = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      version: 1,
      content: null,
      acs_passing: -1, // Must be >= 0
      acs_total: 10,
      files_touched: null,
      all_acs_verified: null,
      created_at: new Date(),
      created_by: null,
    }

    expect(() => ProofRecordSchema.parse(invalidProof)).toThrow()
  })
})

describe('Legacy Schema - TokenUsageRecordSchema', () => {
  it('should accept valid token usage record', () => {
    const validTokenUsage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      phase: 'execute',
      tokens_input: 5000,
      tokens_output: 3000,
      total_tokens: 8000,
      model: 'claude-sonnet-4.5',
      agent_name: 'dev-execute-leader',
      created_at: new Date(),
    }

    expect(() => TokenUsageRecordSchema.parse(validTokenUsage)).not.toThrow()
  })

  it('should reject token usage with negative tokens', () => {
    const invalidTokenUsage = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: '223e4567-e89b-12d3-a456-426614174000',
      phase: 'execute',
      tokens_input: -100, // Must be >= 0
      tokens_output: 3000,
      model: null,
      agent_name: null,
      created_at: new Date(),
    }

    expect(() => TokenUsageRecordSchema.parse(invalidTokenUsage)).toThrow()
  })
})

describe('Legacy Schema - TokenUsageInputSchema', () => {
  it('should accept valid token usage input', () => {
    const validInput = {
      inputTokens: 5000,
      outputTokens: 3000,
      model: 'claude-sonnet-4.5',
      agentName: 'dev-execute-leader',
    }

    expect(() => TokenUsageInputSchema.parse(validInput)).not.toThrow()
  })

  it('should accept input without optional fields', () => {
    const minimalInput = {
      inputTokens: 5000,
      outputTokens: 3000,
    }

    expect(() => TokenUsageInputSchema.parse(minimalInput)).not.toThrow()
  })

  it('should reject input with negative tokens', () => {
    const invalidInput = {
      inputTokens: -100,
      outputTokens: 3000,
    }

    expect(() => TokenUsageInputSchema.parse(invalidInput)).toThrow()
  })
})

// ============================================================================
// Type Inference Tests
// ============================================================================

describe('Type Inference', () => {
  it('should infer correct TypeScript types from schemas', () => {
    // This is a compile-time test - if TypeScript compiles, it passes
    const storyRow: import('../index.js').StoryRow = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      story_id: 'WINT-1100',
      feature_id: null,
      type: 'feature',
      state: 'backlog',
      title: 'Test',
      goal: null,
      points: null,
      priority: null,
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: null,
      surfaces: null,
      non_goals: null,
      created_at: new Date(),
      updated_at: new Date(),
    }

    expect(storyRow.story_id).toBe('WINT-1100')
  })
})

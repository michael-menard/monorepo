/**
 * Telemetry Tools Integration Tests (WINT-0120)
 *
 * Tests the 4 telemetry MCP tools at the handler level:
 * - workflow_log_invocation
 * - workflow_log_decision
 * - workflow_log_outcome
 * - workflow_get_story_telemetry
 *
 * Uses unit-style mocking (no DB connection required).
 */

import { describe, it, expect, vi } from 'vitest'
import { getToolDefinitions } from '../tool-schemas.js'
import {
  WorkflowLogInvocationInputSchema,
  WorkflowLogDecisionInputSchema,
  WorkflowLogOutcomeInputSchema,
  WorkflowGetStoryTelemetryInputSchema,
} from '../../crud-operations/telemetry-operations.js'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('../logger.js', () => ({
  createMcpLogger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}))

// Use vi.hoisted to avoid initialization order issues with vi.mock
const { mockWorkflowLogInvocation, mockWorkflowLogDecision, mockWorkflowLogOutcome, mockWorkflowGetStoryTelemetry } =
  vi.hoisted(() => ({
    mockWorkflowLogInvocation: vi.fn(),
    mockWorkflowLogDecision: vi.fn(),
    mockWorkflowLogOutcome: vi.fn(),
    mockWorkflowGetStoryTelemetry: vi.fn(),
  }))

vi.mock('../../crud-operations/telemetry-operations.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../crud-operations/telemetry-operations.js')>()
  return {
    ...actual,
    workflow_log_invocation: mockWorkflowLogInvocation,
    workflow_log_decision: mockWorkflowLogDecision,
    workflow_log_outcome: mockWorkflowLogOutcome,
    workflow_get_story_telemetry: mockWorkflowGetStoryTelemetry,
  }
})

// ============================================================================
// Test Helpers
// ============================================================================

function generateTestUuid() {
  return '00000000-0000-0000-0000-' + Math.floor(Math.random() * 1e12).toString().padStart(12, '0')
}

// ============================================================================
// Tests
// ============================================================================

describe('Telemetry Tool Schemas (WINT-0120)', () => {
  describe('Tool Discovery', () => {
    it('should include all 4 telemetry tools in getToolDefinitions()', () => {
      const tools = getToolDefinitions()
      const toolNames = tools.map(t => t.name)

      expect(toolNames).toContain('workflow_log_invocation')
      expect(toolNames).toContain('workflow_log_decision')
      expect(toolNames).toContain('workflow_log_outcome')
      expect(toolNames).toContain('workflow_get_story_telemetry')
    })

    it('should have descriptions longer than 50 chars for telemetry tools', () => {
      const tools = getToolDefinitions()
      const telemetryTools = tools.filter(t =>
        ['workflow_log_invocation', 'workflow_log_decision', 'workflow_log_outcome', 'workflow_get_story_telemetry'].includes(t.name)
      )

      expect(telemetryTools).toHaveLength(4)
      for (const tool of telemetryTools) {
        expect(tool.description.length).toBeGreaterThan(50)
      }
    })

    it('should have valid inputSchema for all 4 telemetry tools', () => {
      const tools = getToolDefinitions()
      const telemetryTools = tools.filter(t =>
        t.name.startsWith('workflow_')
      )

      expect(telemetryTools).toHaveLength(4)
      for (const tool of telemetryTools) {
        expect(tool.inputSchema).toBeTruthy()
        expect(typeof tool.inputSchema).toBe('object')
      }
    })
  })

  describe('WorkflowLogInvocationInputSchema', () => {
    it('should validate minimal required input', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'test-invocation-001',
        agent_name: 'dev-execute-leader',
        status: 'success',
      })

      expect(result.success).toBe(true)
    })

    it('should validate complete input', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'dev-execute-leader-1741449600000',
        agent_name: 'dev-execute-leader',
        story_id: 'WINT-0120',
        phase: 'execute',
        status: 'success',
        input_tokens: 12000,
        output_tokens: 3000,
        cached_tokens: 500,
        total_tokens: 15000,
        estimated_cost: '0.0450',
        model_name: 'claude-sonnet-4-6',
        duration_ms: 45000,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid status', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'test',
        agent_name: 'agent',
        status: 'invalid_status',
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty invocation_id', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: '',
        agent_name: 'agent',
        status: 'success',
      })

      expect(result.success).toBe(false)
    })

    it('should apply defaults for cached_tokens, total_tokens, estimated_cost', () => {
      const result = WorkflowLogInvocationInputSchema.safeParse({
        invocation_id: 'test',
        agent_name: 'agent',
        status: 'success',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.cached_tokens).toBe(0)
        expect(result.data.total_tokens).toBe(0)
        expect(result.data.estimated_cost).toBe('0.0000')
      }
    })
  })

  describe('WorkflowLogDecisionInputSchema', () => {
    it('should validate minimal required input', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        decision_type: 'approve',
        decision_text: 'Approved the implementation plan',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(true)
    })

    it('should validate with optional fields', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        invocation_id: generateTestUuid(),
        decision_type: 'reject',
        decision_text: 'Rejected due to missing tests',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
        context: { iteration: 2, phase: 'review' },
        embedding: new Array(1536).fill(0.1),
      })

      expect(result.success).toBe(true)
    })

    it('should reject invalid UUID for invocation_id', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        invocation_id: 'not-a-uuid',
        decision_type: 'approve',
        decision_text: 'Approved',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(false)
    })

    it('should reject empty required strings', () => {
      const result = WorkflowLogDecisionInputSchema.safeParse({
        decision_type: '',
        decision_text: 'Approved',
        operator_id: 'user-michael',
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(false)
    })
  })

  describe('WorkflowLogOutcomeInputSchema', () => {
    it('should validate minimal required input', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'pass',
      })

      expect(result.success).toBe(true)
    })

    it('should validate all verdict values', () => {
      const verdicts = ['pass', 'fail', 'blocked', 'cancelled']

      for (const verdict of verdicts) {
        const result = WorkflowLogOutcomeInputSchema.safeParse({
          story_id: 'WINT-0120',
          final_verdict: verdict,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid verdict', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'unknown',
      })

      expect(result.success).toBe(false)
    })

    it('should reject quality_score > 100', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'pass',
        quality_score: 101,
      })

      expect(result.success).toBe(false)
    })

    it('should apply defaults', () => {
      const result = WorkflowLogOutcomeInputSchema.safeParse({
        story_id: 'WINT-0120',
        final_verdict: 'pass',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.quality_score).toBe(0)
        expect(result.data.total_input_tokens).toBe(0)
        expect(result.data.total_output_tokens).toBe(0)
        expect(result.data.total_cached_tokens).toBe(0)
        expect(result.data.estimated_total_cost).toBe('0.0000')
        expect(result.data.review_iterations).toBe(0)
        expect(result.data.qa_iterations).toBe(0)
        expect(result.data.duration_ms).toBe(0)
      }
    })
  })

  describe('WorkflowGetStoryTelemetryInputSchema', () => {
    it('should validate story_id', () => {
      const result = WorkflowGetStoryTelemetryInputSchema.safeParse({
        story_id: 'WINT-0120',
      })

      expect(result.success).toBe(true)
    })

    it('should reject empty story_id', () => {
      const result = WorkflowGetStoryTelemetryInputSchema.safeParse({
        story_id: '',
      })

      expect(result.success).toBe(false)
    })
  })
})
